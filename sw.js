// Offline shell.
//
// Everything the app is made of — the HTML, the CSS, every module, the manifest
// — goes to the network first, with `cache: "reload"` so the request reaches the
// origin rather than the browser's own HTTP cache. That flag is the whole point:
// GitHub Pages sends max-age=600, and a worker's plain fetch() honours it, so
// "network first" without it quietly serves a ten-minute-old file. A redeploy
// changes the shell and the code together, and half a build is worse than an
// old one.
//
// Fonts, the mark, the photographs and the icons change name when they change
// at all, so they are cache-first and precached on install.
//
// clients.claim() runs only when this worker REPLACES an older one. On a cold
// install the page keeps the network it started with — claiming mid-flight
// hands the new worker every in-flight image request, and they fail.
//
// build.py writes VERSION and both lists; do not edit them by hand.

const VERSION = "sahel-91ec5a56f8";
const DEV = ["localhost", "127.0.0.1"].includes(location.hostname);
const MARKER = "./__installed__";

const SHELL = [
  /* shell:start */
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js",
  "./js/basket.js",
  "./js/boot.js",
  "./js/brand.js",
  "./js/chrome.js",
  "./js/config.js",
  "./js/data.js",
  "./js/i18n.js",
  "./js/icons.js",
  "./js/install.js",
  "./js/motion.js",
  "./js/photos-manifest.js",
  "./js/photos.js",
  "./js/router.js",
  "./js/schedule.js",
  "./js/store.js",
  "./js/theme.js",
  "./js/ui.js",
  "./js/util.js",
  "./js/views/book.js",
  "./js/views/home.js",
  "./js/views/service.js",
  "./js/views/services.js",
  "./js/views/you.js",
  /* shell:end */
];
const ASSETS = [
  /* assets:start */
  "./assets/brand/sahel-flat.svg",
  "./assets/brand/sahel.svg",
  "./assets/fonts/jost.woff2",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-512.png",
  "./assets/photos/beach-sm.webp",
  "./assets/photos/body-oil-sm.webp",
  "./assets/photos/body-scrub-sm.webp",
  "./assets/photos/electrolysis-sm.webp",
  "./assets/photos/facial-glow-sm.webp",
  "./assets/photos/facial-mask-sm.webp",
  "./assets/photos/facial-sm.webp",
  "./assets/photos/hydro-sm.webp",
  "./assets/photos/laser-face-sm.webp",
  "./assets/photos/laser-sm.webp",
  "./assets/photos/massage-cal-sm.webp",
  "./assets/photos/massage-face-sm.webp",
  "./assets/photos/massage-sm.webp",
  "./assets/photos/microderm-sm.webp",
  "./assets/photos/microneedle-sm.webp",
  "./assets/photos/nails-sm.webp",
  "./assets/photos/nails-stone-sm.webp",
  "./assets/photos/pedicure-sm.webp",
  "./assets/photos/peel-sm.webp",
  "./assets/photos/reflexology-sm.webp",
  "./assets/photos/room-sm.webp",
  "./assets/photos/sauna-sm.webp",
  "./assets/photos/spa-jet-sm.webp",
  "./assets/photos/threading-sm.webp",
  "./assets/photos/vein-sm.webp",
  "./assets/photos/waxing-sm.webp",
  /* assets:end */
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const had = (await caches.keys()).some((k) => k.startsWith("sahel-") && k !== VERSION);
    const cache = await caches.open(VERSION);
    await Promise.allSettled([...SHELL, ...ASSETS].map((url) => cache.add(url)));
    // whether this is an update or a first install is recorded in the cache
    // itself — install and activate need not share a worker instance
    await cache.put(MARKER, new Response(had ? "update" : "cold"));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    const marker = await (await caches.open(VERSION)).match(MARKER);
    if ((marker ? await marker.text() : "cold") === "update") await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith("/__installed__")) return;
  if (request.headers.has("range")) return;

  const networkFirst = async () => {
    try {
      const res = await fetch(new Request(request, { cache: "reload" }));
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch {
      const hit = (await caches.match(request, { ignoreSearch: true }))
        || (request.mode === "navigate" ? await caches.match("./index.html") : null);
      return hit || Response.error();
    }
  };

  if (request.mode === "navigate" || DEV || /\.(?:html|css|js|webmanifest)$/.test(url.pathname)) {
    e.respondWith(networkFirst());
    return;
  }

  e.respondWith((async () => {
    const hit = await caches.match(request);
    if (hit) return hit;
    try {
      const res = await fetch(request);
      if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
      return res;
    } catch { return Response.error(); }
  })());
});
