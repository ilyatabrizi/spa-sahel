// The opening: their mark, still, on the app's own ground until the first
// screen is ready, then a plain fade. Nothing about the logo moves — a client
// asked for exactly that once and was right: a logo that performs on every
// launch stops being a logo and starts being a loading screen.
//
// index.html carries the markup inline, so the mark is on screen with the
// first paint rather than after four module round trips.

import { STORAGE } from "./config.js";

const SEEN = STORAGE + "booted";
const root = document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const loaded = (img) => (!img || (img.complete && img.naturalWidth))
  ? Promise.resolve()
  : new Promise((r) => {
      img.addEventListener("load", r, { once: true });
      img.addEventListener("error", r, { once: true });
    });

export async function runBoot(firstRender) {
  const boot = document.getElementById("boot");
  if (!boot) { root.classList.remove("booting"); return; }
  const warm = root.classList.contains("boot-warm");
  try { sessionStorage.setItem(SEEN, "1"); } catch {}

  const ready = (async () => {
    await Promise.resolve(firstRender).catch(() => {});
    await Promise.all([
      loaded(document.querySelector(".hero-media img")),
      document.fonts?.ready?.catch?.(() => {}),
    ]);
  })();
  // long enough to read the mark on a first visit, barely there on a reload
  await Promise.race([Promise.all([ready, wait(warm ? 180 : 680)]), wait(3000)]);

  boot.classList.add("gone");
  await wait(470);
  boot.remove();
  root.classList.remove("booting", "boot-warm");
  document.dispatchEvent(new CustomEvent("boot:done"));
}
