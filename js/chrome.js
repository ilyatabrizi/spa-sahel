// The glass chrome: the bar at the top, the tab bar at the bottom, and the one
// scroll listener both of them answer to.
//
// THE TOP BAR behaves the way iOS large titles do. The page owns the big title;
// the bar owns a small one that is invisible until the big one has gone by, at
// which point it fades and rises into place and the hairline arrives with it.
// Over a hero photograph the bar has no material at all and its controls go
// white — the picture is the material.
//
// THE TAB BAR is a floating capsule. Scrolling down folds it to the tab you are
// on; scrolling up, tapping it, or going anywhere opens it again. The lens
// springs between tabs and follows a dragged finger.
//
// Three traps are load-bearing, and all three have bitten before:
//
//  1. backdrop-filter samples nothing if any ANCESTOR is transformed. The bars
//     are fixed children of <body>, and body is pinned to `transform: none` in
//     the stylesheet. Wrapping either in an animated container silently turns
//     the glass into flat paint, with no error.
//  2. A folding bar must not measure itself from the row it is shrinking. The
//     width it opens back to is measured once, while open, and cached.
//  3. Setting location.hash to the hash you already have fires no hashchange,
//     so the tab you are already on scrolls to the top instead — go() handles
//     the general case, but the bar has to stop the navigation itself or the
//     click does nothing at all.

import { BUSINESS } from "./config.js";
import { getLang, otherLang, setLang, t } from "./i18n.js";
import { icon } from "./icons.js";
import { haptic } from "./motion.js";
import { go } from "./router.js";
import { $, $$, clamp } from "./util.js";

const TAB_FOR = {
  "/": "home",
  "/services": "services", "/group": "services", "/service": "services", "/package": "services",
  "/book": "book",
  "/you": "you", "/rewards": "you", "/appointment": "you", "/gift": "you",
};

let bar, caps, lens, row, tabs, topbar, tbTitle;
let active = null, minimized = false, openWidth = 0;
// what THIS screen asked for. Without it the tone is re-derived from scroll on
// every frame and a detail screen that opens on a photograph loses its white
// controls the moment the first scroll event lands.
let baseTone = "light";

/* -------------------------------------------------------------- the lens */
function place() {
  if (!tabs?.length) return;
  const i = tabs.findIndex((tab) => tab.dataset.tab === active);
  if (i < 0) { bar.classList.add("no-lens"); return; }
  bar.classList.remove("no-lens");
  const el = tabs[i];
  const shift = minimized ? -el.offsetLeft : 0;
  bar.style.setProperty("--row-x", `${shift}px`);
  bar.style.setProperty("--lens-x", `${el.offsetLeft + shift}px`);
  bar.style.setProperty("--lens-w", `${el.offsetWidth}px`);
  bar.style.setProperty("--min-w", `${el.offsetWidth}px`);
}

/** Trap 2: the open width is measured while open, once, and remembered. */
function measure() {
  if (minimized) return;
  const w = row.scrollWidth;
  if (w > 0 && Math.abs(w - openWidth) > 1) {
    openWidth = w;
    bar.style.setProperty("--w", `${w}px`);
    bar.dataset.ready = "1";
  }
  place();
}

export function paintTabs(path) {
  const root = "/" + (String(path || "/").split("/")[1] || "");
  active = TAB_FOR[root] ?? null;
  tabs.forEach((tab) => tab.setAttribute("aria-current", tab.dataset.tab === active ? "page" : "false"));
  place();
}

/* -------------------------------------------------------- fold on scroll */
function setMin(on) {
  if (on === minimized) return;
  // never fold on a page too short to have scrolled there on purpose
  if (on && (!active || document.documentElement.scrollHeight - innerHeight < 620)) return;
  minimized = on;
  bar.classList.toggle("min", on);
  place();
}
export const expandBar = () => setMin(false);

/* ------------------------------------------------------- the single scroll */
let lastY = 0, run = 0, ticking = false;
let heroEnd = 0, titleEnd = 0;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = scrollY;
    const dy = y - lastY;
    lastY = y;

    // the top bar: material and compact title, once the page title has gone by
    const lifted = y > titleEnd;
    if ((topbar.dataset.lifted === "1") !== lifted) topbar.dataset.lifted = lifted ? "1" : "0";
    const overMedia = heroEnd > 0 && y < heroEnd - 70;
    const tone = baseTone === "dark" && overMedia ? "dark" : "light";
    if (topbar.dataset.tone !== tone) topbar.dataset.tone = tone;

    // the tab bar: fold on a run downwards, open on any run back up
    if (y < 120) { run = 0; setMin(false); return; }
    run = Math.sign(dy) === Math.sign(run) ? run + dy : dy;
    if (run > 52) setMin(true);
    else if (run < -30) setMin(false);
  });
}

/** Called after every render: where does this screen's own title end? */
export function measureScreen(screen, { title = "", tone = "light" } = {}) {
  const media = screen.querySelector(".hero, .detail-hero");
  heroEnd = media ? media.offsetTop + media.offsetHeight : 0;
  const h1 = screen.querySelector(".title-xl, .step-title, .hero-word");
  titleEnd = h1 ? Math.max(40, h1.offsetTop + h1.offsetHeight - 60) : 8;
  tbTitle.textContent = title;
  baseTone = tone === "dark" ? "dark" : "light";
  topbar.dataset.tone = baseTone;
  lastY = scrollY;
  run = 0;
  minimized = false;
  bar.classList.remove("min");
  onScroll();
  requestAnimationFrame(measure);
}

/* ------------------------------------------------------- drag the lens */
let drag = null, swallow = false;

function bindDrag() {
  // a mouse dragged across a link starts the browser's own drag, which cancels
  // the pointer on the first move. Ours is the only drag on this bar.
  caps.addEventListener("dragstart", (e) => e.preventDefault());

  caps.addEventListener("pointerdown", (e) => {
    if (minimized || e.button > 0) return;
    drag = { x0: e.clientX, id: e.pointerId, moved: false, idx: -1 };
  });

  caps.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) {
      if (Math.abs(dx) < 8) return;
      drag.moved = true;
      try { caps.setPointerCapture(e.pointerId); } catch {}
      bar.classList.add("dragging");
      bar.classList.remove("no-lens");
    }
    const w = tabs[0].offsetWidth;
    const r = row.getBoundingClientRect();
    const x = clamp(e.clientX - r.left - w / 2, 0, r.width - w);
    bar.style.setProperty("--lens-x", `${x}px`);
    bar.style.setProperty("--lens-w", `${w}px`);
    const idx = clamp(Math.round(x / w), 0, tabs.length - 1);
    if (idx !== drag.idx) {
      drag.idx = idx;
      haptic(4);
      tabs.forEach((tab, i) => tab.classList.toggle("under", i === idx));
    }
  });

  const end = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    bar.classList.remove("dragging");
    tabs.forEach((tab) => tab.classList.remove("under"));
    if (!d.moved) return;
    swallow = true;
    setTimeout(() => { swallow = false; }, 0);
    const tab = tabs[d.idx];
    if (tab) go(tab.getAttribute("href"));
    else place();
  };
  caps.addEventListener("pointerup", end);
  // a cancelled pointer — a system gesture taking over — puts the lens back
  caps.addEventListener("pointercancel", () => {
    drag = null;
    bar.classList.remove("dragging");
    tabs.forEach((tab) => tab.classList.remove("under"));
    place();
  });

  caps.addEventListener("click", (e) => {
    if (swallow) { e.preventDefault(); e.stopPropagation(); return; }
    const tab = e.target.closest(".tab");
    // A folded bar shows only the tab you are on, so a tap there is never a
    // navigation: it opens the bar and takes you back to the top together.
    if (minimized) {
      e.preventDefault();
      setMin(false);
      if (tab) scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!tab) return;
    // Trap 3: the tab you are on goes to the top, as on iOS
    if (tab.getAttribute("href") === (location.hash.split("?")[0] || "#/")) {
      e.preventDefault();
      scrollTo({ top: 0, behavior: "smooth" });
    }
  }, true);
}

/* ----------------------------------------------------------- language */
function paintLang() {
  const pill = $("#lang-pill");
  if (!pill) return;
  pill.innerHTML = `<b class="${getLang() === "en" ? "on" : ""}">EN</b><b class="${getLang() === "fr" ? "on" : ""}">FR</b>`;
  pill.setAttribute("aria-label", t("a11y.langTo"));
}

/* --------------------------------------------------------------- setup */
export function initChrome() {
  topbar = $("#topbar");
  tbTitle = $("#tb-title");
  bar = $("#tabbar");
  caps = $("#tabs");
  lens = $("#tabs-lens");
  row = $("#tabs-row");
  tabs = $$(".tab", row);

  tabs.forEach((tab) => {
    const key = tab.dataset.tab;
    tab.querySelector(".tab-ico").innerHTML = icon(key) + icon(key + "F");
  });
  paintLabels();
  paintLang();
  bindDrag();

  $("#lang-pill").addEventListener("click", () => {
    setLang(otherLang());
    haptic(6);
  });
  $("#call-btn").setAttribute("href", `tel:${BUSINESS.phoneHref}`);
  $("#call-btn").innerHTML = icon("phone");

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { openWidth = 0; measure(); });
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(row);
  document.fonts?.ready?.then(measure);
  document.addEventListener("lang:change", () => {
    paintLabels();
    paintLang();
    openWidth = 0;
    requestAnimationFrame(measure);
  });
  measure();
}

function paintLabels() {
  tabs.forEach((tab) => {
    const label = t(`tab.${tab.dataset.tab}`);
    tab.querySelector(".tab-label").textContent = label;
    tab.setAttribute("aria-label", label);
  });
}
