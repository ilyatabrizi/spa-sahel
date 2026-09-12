#!/usr/bin/env python3
"""Photographs and icons.

Every photograph here is Spa Sahel's own — twenty-six pulled from spasahel.com
plus the treatment-room shot the client sent. Most of theirs are small (their
service grid ships 416x315), so each one is emitted at its native width and
never above it: upscaling a 416px file to fill a phone hero only makes the
softness bigger. `PHOTOS` records the true width so the markup can size the
element to what the picture can actually carry, and `scripts/src/README` notes
which categories are waiting on a better original.

Icons are rasterised from the traced lockup through headless Chrome rather than
drawn again in Pillow, so the app icon is the same curve data as the mark on the
home screen. The maskable one keeps the fan inside the 80% safe circle.

    python3 scripts/build_assets.py

Pure stdlib + Pillow. Chrome only for the icons.
"""

import json
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / "src"
PHOTOS = ROOT / "assets" / "photos"
ICONS = ROOT / "assets" / "icons"
BRAND = ROOT / "assets" / "brand"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

SM = 420          # the small variant every card and the offline shell uses
QUALITY = 82
LOGO_BG = "#FFFFFF"

# key -> (source file, crop aspect or None, focal point 0..1 vertical)
# The focal point is where the crop keeps its centre: faces sit high in most of
# these, feet low.
SHOTS = {
    "room":        ("room.jpg", 3 / 4, 0.46),
    "beach":       ("Beach-2-scaled.jpg", 16 / 9, 0.52),
    "facial":      ("52.png", 4 / 3, 0.45),
    "facial-mask": ("51.png", 4 / 3, 0.45),
    "facial-glow": ("56.png", 4 / 3, 0.45),
    "microderm":   ("Microdermaabrasion.jpg", 4 / 3, 0.45),
    "microneedle": ("Microneedling.jpg", 4 / 3, 0.45),
    "peel":        ("hb.png", 4 / 3, 0.45),
    "body-scrub":  ("62.png", 4 / 3, 0.5),
    "body-oil":    ("bodytreatment.jpg", 4 / 3, 0.5),
    "spa-jet":     ("le-spa-jet-chromotherapie.png", 4 / 3, 0.5),
    "hydro":       ("54.png", 4 / 3, 0.5),
    "massage":     ("massage.webp", 4 / 3, 0.5),
    "massage-cal": ("massage1-1.jpg", 4 / 3, 0.5),
    "massage-face": ("59.png", 4 / 3, 0.45),
    "reflexology": ("61.png", 4 / 3, 0.5),
    "laser":       ("Laser.jpeg", 4 / 3, 0.5),
    "laser-face":  ("laser-treatment.jpg", 4 / 3, 0.5),
    "electrolysis": ("electrolysiss.jpeg", 4 / 3, 0.5),
    "waxing":      ("waxing_.jpg", 4 / 3, 0.5),
    "threading":   ("threading.jpg", 4 / 3, 0.42),
    "nails":       ("service-22-5.png", 4 / 3, 0.5),
    "nails-stone": ("pamper-1024x683-1.jpg", 4 / 3, 0.5),
    "pedicure":    ("55.png", 4 / 3, 0.5),
    "sauna":       ("sauna.jpg", 4 / 3, 0.45),
    "vein":        ("63.png", 4 / 3, 0.45),
}


def flatten(im):
    """Drop alpha onto white — several of theirs are RGBA PNGs with a white mat."""
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bg, im)
    return im.convert("RGB")


def crop_to(im, aspect, focal):
    w, h = im.size
    if aspect is None:
        return im
    if w / h > aspect:                      # too wide — trim the sides
        nw = round(h * aspect)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = round(w / aspect)                  # too tall — trim to the focal band
    y = round((h - nh) * focal)
    return im.crop((0, y, w, y + nh))


def emit(key, im, width, suffix=""):
    if im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    out = PHOTOS / f"{key}{suffix}.webp"
    im.save(out, "WEBP", quality=QUALITY, method=6)
    return out, im.size


def render_svg(svg_path, out_png, size, pad=0.0, bg=LOGO_BG, radius=0):
    """Rasterise an SVG square through headless Chrome at 2x, then downsample."""
    svg = svg_path.read_text(encoding="utf-8")
    inset = f"{pad * 100:.1f}%"
    style = (f"margin:0;width:{size}px;height:{size}px;background:{bg};"
             f"display:flex;align-items:center;justify-content:center;"
             + (f"border-radius:{radius}px;" if radius else ""))
    html = (f'<!doctype html><meta charset="utf-8">'
            f'<body style="{style}">'
            f'<div style="width:calc(100% - {inset} * 2);display:flex">{svg}</div></body>')
    with tempfile.TemporaryDirectory() as td:
        page = pathlib.Path(td) / "p.html"
        page.write_text(html, encoding="utf-8")
        shot = pathlib.Path(td) / "s.png"
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                        f"--screenshot={shot}", f"--window-size={size},{size}",
                        "--force-device-scale-factor=2",
                        "--default-background-color=00000000", page.as_uri()],
                       check=True, capture_output=True)
        im = Image.open(shot).convert("RGBA")
        bgim = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bgim, im).convert("RGB")
        im = im.resize((size, size), Image.LANCZOS)
        im.save(out_png, "PNG", optimize=True)
    return out_png


def main():
    if not SRC.exists():
        sys.exit(f"missing sources: {SRC}")
    PHOTOS.mkdir(parents=True, exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)

    manifest = {}
    missing = []
    for key, (name, aspect, focal) in SHOTS.items():
        path = SRC / name
        if not path.exists():
            missing.append(name)
            continue
        im = crop_to(flatten(Image.open(path)), aspect, focal)
        full, size = emit(key, im, im.width)
        small, _ = emit(key, im, min(SM, im.width), "-sm")
        manifest[key] = {"w": size[0], "h": size[1]}
        print(f"  {key:14s} {size[0]:5d}x{size[1]:<5d} {full.stat().st_size / 1024:6.1f}KB"
              f" + sm {small.stat().st_size / 1024:5.1f}KB")
    if missing:
        print("  missing:", ", ".join(missing))

    (ROOT / "js" / "photos-manifest.js").write_text(
        "// generated by scripts/build_assets.py — intrinsic pixel sizes, so the\n"
        "// layout can refuse to draw a picture bigger than it really is.\n"
        f"export const SIZES = {json.dumps(manifest, indent=2, sort_keys=True)};\n",
        encoding="utf-8")

    lockup = BRAND / "sahel.svg"
    if lockup.exists() and pathlib.Path(CHROME).exists():
        render_svg(lockup, ICONS / "icon-192.png", 192, pad=0.11)
        render_svg(lockup, ICONS / "icon-512.png", 512, pad=0.11)
        render_svg(lockup, ICONS / "maskable-512.png", 512, pad=0.20)
        render_svg(lockup, ICONS / "apple-touch-icon.png", 180, pad=0.11)
        render_svg(lockup, ICONS / "favicon-32.png", 32, pad=0.06)
        print("  icons          192, 512, maskable, apple-touch, favicon")
    else:
        print("  icons          SKIPPED (no Chrome or no lockup)")

    # Open Graph card: the room, with the mark set over it by the share sheet's
    # own crop. 1200x630 is what every scraper expects.
    room = PHOTOS / "room.webp"
    if room.exists():
        im = Image.open(room).convert("RGB")
        og = crop_to(im, 1200 / 630, 0.38).resize((1200, 630), Image.LANCZOS)
        og.save(ROOT / "assets" / "og.jpg", "JPEG", quality=86, optimize=True)
        print("  og.jpg         1200x630")
    print(f"{len(manifest)} photographs → assets/photos/")


if __name__ == "__main__":
    main()
