#!/usr/bin/env python3
"""Trace the Spa Sahel sunrise into one scalable, recolourable SVG.

The master is a 1536x1024 RGBA export: fifteen rounded rays fanning out of a
point on the horizon, and three lens-shaped bands of sea beneath them. Both are
filled with gradients, not flats — the rays run gold at the centre, through an
orange band at about four tenths of the radius, back to gold at the tips; the
sea runs one continuous cyan-to-blue from the top of the first band to the
bottom of the third. Those were measured off the raster, not guessed.

Everything in this mark is a curve, so a straight polygon trace shows facets the
moment it is scaled up. The walk therefore runs on a mask lifted to 2x with a
smooth resample, is rounded three times with Chaikin, and only then simplified — the
corners that survive are the ones the artwork actually has (none), and the file
stays small enough to inline three times over.

Out:
  assets/brand/sahel.svg     the full lockup, gradients as <defs>
  assets/brand/sahel-flat.svg   one-colour silhouette, for a mask or a stamp
  js/brand.js                the same markup as a module, so the boot screen
                             paints it with the first byte instead of a fetch

    python3 scripts/trace_logo.py

Pure stdlib + Pillow + numpy. No potrace on this machine.
"""

import json
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "logo-src.png"
OUT = ROOT / "assets" / "brand"

WORK = 3072        # trace width — 2x the master, so Chaikin has room to round
CHAIKIN = 3        # corner-cutting passes before simplification
EPSILON = 1.9      # Douglas-Peucker tolerance, in working pixels (~0.36 at 1000)
MIN_AREA = 400     # drop speckle along the colour boundary
MIN_SEP = 1.5      # collapse points this close together (working pixels)

# Measured off the master: the fan's gradient is radial about the point the rays
# leave from, the sea's is a single vertical run across all three bands.
SUN_STOPS = [(0.00, "#FDBE12"), (0.20, "#FDA606"), (0.42, "#FD8901"), (0.62, "#FD9506"),
             (0.79, "#FDAC01"), (0.90, "#FDBE01"), (1.00, "#FDC901")]
SEA_STOPS = [(0.00, "#06C2FC"), (1.00, "#005BE3")]

sys.setrecursionlimit(200000)


# ---------------------------------------------------------------- masks
def load(path, width):
    im = Image.open(path).convert("RGBA")
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    # The master is drawn on transparency with a soft glow halo around the ink.
    # Flatten it onto the white it is meant to sit on and threshold there — the
    # halo composites away, and what is left is the artwork's own edge.
    flat = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im)
    rgb = np.asarray(flat.convert("RGB")).astype(int)
    sat = rgb.max(2) - rgb.min(2)
    ink = (765 - rgb.sum(2) > 120) & (sat > 60)
    warm = ink & (rgb[..., 0] > rgb[..., 2] + 50)
    cool = ink & (rgb[..., 2] > rgb[..., 0] + 50)
    return warm, cool, width, h


def components(mask):
    """4-connected blobs, iterative flood fill (one per ray, one per sea band)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    blobs = []
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if seen[sy][sx]:
            continue
        stack = [(int(sx), int(sy))]
        seen[sy][sx] = True
        cells = []
        while stack:
            x, y = stack.pop()
            cells.append((x, y))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and mask[ny][nx]:
                    seen[ny][nx] = True
                    stack.append((nx, ny))
        if len(cells) >= MIN_AREA:
            blobs.append(cells)
    return blobs


# ------------------------------------------------------------- outlines
def trace_outline(cells):
    """Every closed ring bounding a blob — outer edge plus its counters.

    Walks the unit cracks between ink and space, directed so the interior stays
    on one side, then chains them head to tail. Exact where a Moore walk guesses.
    """
    cellset = set(cells)
    edges = {}
    for x, y in cells:
        if (x, y - 1) not in cellset:
            edges.setdefault((x, y), []).append((x + 1, y))
        if (x + 1, y) not in cellset:
            edges.setdefault((x + 1, y), []).append((x + 1, y + 1))
        if (x, y + 1) not in cellset:
            edges.setdefault((x + 1, y + 1), []).append((x, y + 1))
        if (x - 1, y) not in cellset:
            edges.setdefault((x, y + 1), []).append((x, y))
    rings = []
    while edges:
        start = next(iter(edges))
        ring, node = [start], start
        while True:
            outs = edges.get(node)
            if not outs:
                break
            nxt = outs.pop()
            if not outs:
                del edges[node]
            if nxt == start:
                break
            ring.append(nxt)
            node = nxt
        if len(ring) >= 24:
            rings.append(ring)
    return rings


def chaikin(ring, passes=CHAIKIN):
    """Corner-cutting on a closed ring. A staircase of unit cracks becomes the
    curve it was standing in for; three passes is enough and keeps the point count
    from exploding before Douglas-Peucker runs."""
    pts = [(float(x), float(y)) for x, y in ring]
    for _ in range(passes):
        out = []
        n = len(pts)
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            out.append((x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25))
            out.append((x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75))
        pts = out
    return pts


def _rdp_open(pts, eps):
    if len(pts) < 3:
        return pts
    x1, y1 = pts[0]
    x2, y2 = pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5
    worst, idx = -1.0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        dist = (((px - x1) ** 2 + (py - y1) ** 2) ** 0.5 if norm < 1e-9
                else abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm)
        if dist > worst:
            worst, idx = dist, i
    if worst > eps:
        return _rdp_open(pts[:idx + 1], eps)[:-1] + _rdp_open(pts[idx:], eps)
    return [pts[0], pts[-1]]


def rdp(ring, eps):
    """Douglas-Peucker on a closed ring: split at the two farthest points first,
    or every distance is measured against a zero-length line."""
    if len(ring) < 6:
        return ring
    far = max(range(len(ring)),
              key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
    return _rdp_open(ring[:far + 1], eps)[:-1] + _rdp_open(ring[far:] + [ring[0]], eps)[:-1]


def dedupe(ring, minsep):
    """Drop points that sit on top of their neighbour. Douglas-Peucker can leave
    a pair a fraction of a pixel apart at a ray's sharp inner tip, and a tangent
    drawn through that pair is what throws a hair off the outline."""
    out = []
    for p in ring:
        if not out or (p[0] - out[-1][0]) ** 2 + (p[1] - out[-1][1]) ** 2 >= minsep ** 2:
            out.append(p)
    while len(out) > 3 and (out[0][0] - out[-1][0]) ** 2 + (out[0][1] - out[-1][1]) ** 2 < minsep ** 2:
        out.pop()
    return out


def smooth_path(ring, scale, ox, oy, prec=1):
    """Emit a closed ring as cubic Béziers through its points.

    Centripetal Catmull-Rom (alpha = 1/2), not the uniform kind: uniform tangents
    are proportional to the span between the neighbours, so where the outline turns
    hard — every ray's inner tip — the handle overshoots its own segment and the
    curve loops out past the point as a visible hair. Centripetal spacing provably
    cannot cusp or self-intersect, and on the long straight flanks the two agree.
    """
    p = [((x - ox) * scale, (y - oy) * scale) for x, y in ring]
    n = len(p)
    if n < 3:
        return ""
    f = lambda v: f"{v:.{prec}f}".rstrip("0").rstrip(".") or "0"
    dist = lambda a, b: max(((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.25, 1e-6)
    d = [f"M{f(p[0][0])} {f(p[0][1])}"]
    for i in range(n):
        p0, p1 = p[(i - 1) % n], p[i]
        p2, p3 = p[(i + 1) % n], p[(i + 2) % n]
        d1, d2, d3 = dist(p1, p0), dist(p2, p1), dist(p3, p2)
        c1 = tuple((d1 * d1 * p2[k] - d2 * d2 * p0[k]
                    + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2))
                   for k in (0, 1))
        c2 = tuple((d3 * d3 * p1[k] - d2 * d2 * p3[k]
                    + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2))
                   for k in (0, 1))
        d.append(f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}")
    return "".join(d) + "Z"


def layer_path(blobs, scale, ox, oy):
    out = []
    for blob in blobs:
        for ring in trace_outline(blob):
            ring = dedupe(rdp(chaikin(ring), EPSILON), MIN_SEP)
            out.append(smooth_path(ring, scale, ox, oy))
    return "".join(out)


def bbox(cells):
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def stops(items):
    return "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in items)


# ------------------------------------------------------------------ main
def main():
    if not SRC.exists():
        sys.exit(f"missing source: {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)

    warm_m, cool_m, w, h = load(SRC, WORK)
    sun = components(warm_m)
    sea = components(cool_m)
    if not sun:
        sys.exit("no rays found — check the colour thresholds")

    cells = [c for b in sun + sea for c in b]
    x0, y0, x1, y1 = bbox(cells)
    bw, bh = x1 - x0, y1 - y0
    scale = 1000.0 / bw
    vh = round(bh * scale, 1)

    # The fan's gradient centre is where the rays leave from: the middle of the
    # mark, on the horizon — the top of the first sea band.
    sx0, sy0, sx1, _ = bbox([c for b in sea for c in b])
    cx = (x0 + x1) / 2
    cy = sy0
    gx, gy = (cx - x0) * scale, (cy - y0) * scale
    gr = max((x1 - cx), (cx - x0), (cy - y0)) * scale

    sun_d = layer_path(sun, scale, x0, y0)
    sea_d = layer_path(sea, scale, x0, y0)

    defs = (f'<defs>'
            f'<radialGradient id="ss-sun" gradientUnits="userSpaceOnUse" '
            f'cx="{gx:.1f}" cy="{gy:.1f}" r="{gr:.1f}">{stops(SUN_STOPS)}</radialGradient>'
            f'<linearGradient id="ss-sea" gradientUnits="userSpaceOnUse" '
            f'x1="0" y1="{(sy0 - y0) * scale:.1f}" x2="0" y2="{vh}">{stops(SEA_STOPS)}</linearGradient>'
            f'</defs>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 {vh}" '
           f'role="img" aria-label="Spa Sahel">{defs}'
           f'<path class="ss-sun" fill="url(#ss-sun)" d="{sun_d}"/>'
           f'<path class="ss-sea" fill="url(#ss-sea)" d="{sea_d}"/>'
           f'</svg>')
    (OUT / "sahel.svg").write_text(svg, encoding="utf-8")

    flat = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 {vh}" '
            f'role="img" aria-label="Spa Sahel">'
            f'<path fill="currentColor" d="{sun_d}{sea_d}"/></svg>')
    (OUT / "sahel-flat.svg").write_text(flat, encoding="utf-8")

    js = ("// generated by scripts/trace_logo.py — do not edit by hand\n"
          f'export const VIEWBOX = "0 0 1000 {vh}";\n'
          f'export const SUN_D = "{sun_d}";\n'
          f'export const SEA_D = "{sea_d}";\n'
          f'export const SUN_GRAD = {{ cx: {gx:.1f}, cy: {gy:.1f}, r: {gr:.1f}, '
          f'stops: {json.dumps(SUN_STOPS)} }};\n'
          f'export const SEA_GRAD = {{ y1: {(sy0 - y0) * scale:.1f}, y2: {vh}, '
          f'stops: {json.dumps(SEA_STOPS)} }};\n'
          "\n"
          "/** The mark, as markup. `id` keeps the two gradients unique per copy. */\n"
          "export function logoSVG(id = 'l', cls = 'logo') {\n"
          "  const st = (s) => s.map(([o, c]) => `<stop offset=\"${o}\" stop-color=\"${c}\"/>`).join('');\n"
          "  return `<svg class=\"${cls}\" viewBox=\"${VIEWBOX}\" role=\"img\" aria-label=\"Spa Sahel\" focusable=\"false\">`\n"
          "    + `<defs><radialGradient id=\"sun-${id}\" gradientUnits=\"userSpaceOnUse\" cx=\"${SUN_GRAD.cx}\" cy=\"${SUN_GRAD.cy}\" r=\"${SUN_GRAD.r}\">${st(SUN_GRAD.stops)}</radialGradient>`\n"
          "    + `<linearGradient id=\"sea-${id}\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"${SEA_GRAD.y1}\" x2=\"0\" y2=\"${SEA_GRAD.y2}\">${st(SEA_GRAD.stops)}</linearGradient></defs>`\n"
          "    + `<path class=\"ss-sun\" fill=\"url(#sun-${id})\" d=\"${SUN_D}\"/>`\n"
          "    + `<path class=\"ss-sea\" fill=\"url(#sea-${id})\" d=\"${SEA_D}\"/></svg>`;\n"
          "}\n")
    (ROOT / "js" / "brand.js").write_text(js, encoding="utf-8")

    print(f"source   {SRC.name}  {w}x{h} working")
    print(f"blobs    rays {len(sun)}   sea bands {len(sea)}")
    print(f"lockup   assets/brand/sahel.svg   viewBox 0 0 1000 {vh}   {len(svg)/1024:.1f}KB")
    print(f"flat     assets/brand/sahel-flat.svg   {len(flat)/1024:.1f}KB")
    print(f"module   js/brand.js   {len(js)/1024:.1f}KB")


if __name__ == "__main__":
    main()
