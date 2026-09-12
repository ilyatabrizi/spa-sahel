// Pictures.
//
// Spa Sahel's own photographs are small — their service grid ships at 416px
// across — so the one rule here is that nothing is ever drawn wider than the
// file really is. `img()` reads the intrinsic width out of the generated
// manifest and caps the element with it; a 416px picture in a 200px card is
// crisp on a 2x phone, and the same picture stretched across a hero would not
// be. Where a layout needs something big, ask for a key that has it.

import { SIZES } from "./photos-manifest.js";
import { esc } from "./util.js";

export const widthOf = (key) => SIZES[key]?.w || 0;
export const hasPhoto = (key) => Boolean(SIZES[key]);

/**
 * img("massage", "A massage in progress", { sizes: "200px", eager: true })
 * Emits the small variant in a srcset beside the full one, so a card never
 * downloads a hero-sized file.
 */
export function img(key, alt = "", { sizes = "100vw", eager = false, cls = "" } = {}) {
  const meta = SIZES[key];
  if (!meta) return "";
  const small = Math.min(420, meta.w);
  const set = small < meta.w
    ? `assets/photos/${key}-sm.webp ${small}w, assets/photos/${key}.webp ${meta.w}w`
    : `assets/photos/${key}-sm.webp ${small}w`;
  return `<img src="assets/photos/${key}-sm.webp" srcset="${set}" sizes="${sizes}"`
    + ` width="${meta.w}" height="${meta.h}" alt="${esc(alt)}"`
    + (cls ? ` class="${cls}"` : "")
    + ` loading="${eager ? "eager" : "lazy"}" decoding="async"`
    + (eager ? ' fetchpriority="high"' : "") + ">";
}

/**
 * The largest key from a list that can actually fill `want` CSS pixels at 2x.
 * Falls back to the biggest available rather than returning nothing.
 */
export function bestFor(keys, want) {
  const ok = keys.filter((k) => widthOf(k) >= want * 2);
  if (ok.length) return ok[0];
  return [...keys].sort((a, b) => widthOf(b) - widthOf(a))[0] || keys[0];
}
