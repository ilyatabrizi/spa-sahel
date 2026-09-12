#!/usr/bin/env python3
"""Stamp the build. Run before every deploy.

1. Inline the opening screen into index.html — their mark, still, with its own
   gradients — so it paints with the first byte instead of waiting for four
   levels of ES modules to resolve.
2. Announce every module with a modulepreload link. ES imports are otherwise
   discovered one level at a time, one round trip per level, which over a
   GitHub Pages edge is most of the wait. The links carry no ?v=, so they match
   the URLs the imports actually request.
3. Write the service worker's shell and asset lists from what is on disk, so a
   new module or photograph can never be missing from the offline copy.
4. Content-hash all of it into the worker's VERSION and the ?v= query strings,
   so a returning visitor never runs a stale mix of old and new.

    python3 build.py
"""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
idx = ROOT / "index.html"
sw = ROOT / "sw.js"


def block(html, name, inner):
    pat = re.compile(rf"<!-- {name}:start -->.*?<!-- {name}:end -->", re.S)
    return pat.sub(lambda _: f"<!-- {name}:start -->\n{inner}\n<!-- {name}:end -->", html)


def boot_block():
    """The mark, inlined. Read straight out of the generated brand module so it
    can never drift from what the app draws."""
    brand = (ROOT / "js/brand.js").read_text(encoding="utf-8")
    vb = re.search(r'VIEWBOX = "([^"]+)"', brand).group(1)
    sun = re.search(r'SUN_D = "([^"]+)"', brand).group(1)
    sea = re.search(r'SEA_D = "([^"]+)"', brand).group(1)
    sun_g = re.search(r"SUN_GRAD = \{ cx: ([\d.]+), cy: ([\d.]+), r: ([\d.]+), stops: (\[.*?\]) \}", brand)
    sea_g = re.search(r"SEA_GRAD = \{ y1: ([\d.]+), y2: ([\d.]+), stops: (\[.*?\]) \}", brand)

    def stops(literal):
        return "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in json.loads(literal))

    defs = (f'<defs><radialGradient id="sun-boot" gradientUnits="userSpaceOnUse" '
            f'cx="{sun_g.group(1)}" cy="{sun_g.group(2)}" r="{sun_g.group(3)}">{stops(sun_g.group(4))}</radialGradient>'
            f'<linearGradient id="sea-boot" gradientUnits="userSpaceOnUse" x1="0" '
            f'y1="{sea_g.group(1)}" x2="0" y2="{sea_g.group(2)}">{stops(sea_g.group(3))}</linearGradient></defs>')
    return ('<div id="boot" aria-hidden="true"><div class="boot-logo">'
            f'<svg class="logo" viewBox="{vb}" focusable="false">{defs}'
            f'<path fill="url(#sun-boot)" d="{sun}"/><path fill="url(#sea-boot)" d="{sea}"/>'
            '</svg></div></div>')


mods = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob("js/**/*.js"))
html = idx.read_text(encoding="utf-8")
html = block(html, "boot", boot_block())
html = block(html, "preload",
             "\n".join(f'<link rel="modulepreload" href="{m}">' for m in mods if m != "js/app.js"))
idx.write_text(html, encoding="utf-8")

shell = ["./", "./index.html", "./manifest.webmanifest", "./css/app.css"] + [f"./{m}" for m in mods]
assets = sorted(f"./{p.relative_to(ROOT).as_posix()}" for pat in
                ("assets/fonts/*.woff2", "assets/brand/*.svg", "assets/icons/*.png", "assets/photos/*-sm.webp")
                for p in ROOT.glob(pat))
src = sw.read_text(encoding="utf-8")
fmt = lambda items: "\n".join(f'  "{u}",' for u in items)
src = re.sub(r"/\* shell:start \*/.*?/\* shell:end \*/",
             lambda _: f"/* shell:start */\n{fmt(shell)}\n  /* shell:end */", src, flags=re.S)
src = re.sub(r"/\* assets:start \*/.*?/\* assets:end \*/",
             lambda _: f"/* assets:start */\n{fmt(assets)}\n  /* assets:end */", src, flags=re.S)
sw.write_text(src, encoding="utf-8")

files = sorted([*ROOT.glob("js/**/*.js"), ROOT / "css/app.css", idx, ROOT / "manifest.webmanifest", sw])
h = hashlib.sha1()
for f in files:
    h.update(re.sub(rb'\?v=[0-9a-f]+|const VERSION = "sahel-[^"]+";', b"", f.read_bytes()))
stamp = h.hexdigest()[:10]

sw.write_text(re.sub(r'const VERSION = "sahel-[^"]+";', f'const VERSION = "sahel-{stamp}";',
                     sw.read_text(encoding="utf-8")), encoding="utf-8")
html = idx.read_text(encoding="utf-8")
html = re.sub(r'css/app\.css(\?v=[0-9a-f]+)?', f"css/app.css?v={stamp}", html)
html = re.sub(r'js/app\.js(\?v=[0-9a-f]+)?"', f'js/app.js?v={stamp}"', html)
idx.write_text(html, encoding="utf-8")

print(f"build {stamp}: mark inlined, {len(mods) - 1} modules preloaded, "
      f"worker lists {len(shell)} shell + {len(assets)} assets")
