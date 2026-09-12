// The glass chrome: the bar at the top, the tab bar at the bottom, and the one
// scroll listener both of them answer to.
//
// THE TOP BAR does what iOS large titles do, and keeps apart two things the
// first version ran together: the MATERIAL (glass and a hairline) and the
// COMPACT TITLE. On a plain page the material arrives the moment anything
// scrolls beneath the bar, and the title only once the page's own title has
// gone by. On a page that opens on a photograph the bar has no material and
// white controls while the picture is under it, then glass, dark controls and
// the title together once it is not. Those two states never overlap now —
// the overlap was white type on white glass.
//
// THE TAB BAR is iOS 26's minimising tab bar: four tabs on a capsule of glass
// beside a round call button. Read down a long page and the capsule shrinks to
// the tab you are on and slides to the leading edge while the call button
// slides to the trailing one; scroll back up, or tap it, and both return. The
// lens springs between tabs and follows a dragged finger.
//
// Every position is computed here and handed to CSS as a custom property. The
// first version let two stylesheet rules of equal specificity fight over the
// capsule's width, and the later rule always won: the bar "folded" by hiding
// three tabs inside a capsule that never got any narrower.
//
// Traps that are load-bearing — all of them have bitten this codebase:
//
//  1. backdrop-filter samples nothing if any ANCESTOR is transformed. #tabbar
//     is a plain full-width row that never moves; only the capsule and the
//     button move, each by its own transform, which leaves its own glass alone.
//  2. The lens lives INSIDE the positioned row, so a tab's position and the
//     lens's translate share one coordinate space in every engine. Measured
//     from the capsule it sat six pixels left of every tab — the capsule's
//     padding — and engines disagree about whether a transformed row even
//     counts as an offsetParent.
//  3. Setting location.hash to the hash you already have fires no hashchange,
//     so the tab you are on scrolls to the top instead of navigating.
//  4. The first placement is instant. Animated, a deep link to a tab watched
//     the lens fly across from Home.

import { BUSINESS } from "./config.js";
import { getLang, otherLang, setLang, t } from "./i18n.js";
import { icon } from "./icons.js";
import { haptic, replay } from "./motion.js";
import { go } from "./router.js";
import * as basket from "./basket.js";
import { $, $$, clamp } from "./util.js";

const TAB_FOR = {
  "/": "home",
  "/services": "services", "/group": "services", "/service": "services", "/package": "services",
  "/book": "book", "/booked": "book",
  "/you": "you", "/appointment": "you", "/gift": "you",
};

const PAD = 6;        // capsule padding, each side
const GAP = 10;       // capsule to call button, when open
const EDGE = 16;      // a folded bar's inset from the edge of the screen
const STAGE = 560;    // on a wide screen, fold to the edges of this column, not the window

let bar, caps, row, tabs, call, topbar, tbTitle;
let active = null, minimized = false, ready = false;
let baseTone = "light";

/* ---------------------------------------------------------------- geometry */
/** Where a tab sits inside the row, in the row's own coordinates. */
function slot(tab) {
  const r = tab.getBoundingClientRect();
  return { left: r.left - row.getBoundingClientRect().left, width: r.width };
}

function layout({ instant = false } = {}) {
  if (!tabs?.length) return;
  const vw = document.documentElement.clientWidth;
  const cur = tabs.find((tab) => tab.dataset.tab === active) || null;
  const openW = tabs.reduce((sum, tab) => sum + tab.getBoundingClientRect().width, 0) + PAD * 2;
  const callW = call.offsetWidth;                // 0 when the narrowest screens hide it
  const here = cur ? slot(cur) : null;

  let capW, capX, callX, rowX = 0;
  if (minimized && here) {
    const stage = Math.min(vw, STAGE);
    const left = (vw - stage) / 2;
    capW = here.width + PAD * 2;
    capX = left + EDGE;
    callX = left + stage - EDGE - callW;
    rowX = -here.left;
  } else {
    const group = openW + (callW ? GAP + callW : 0);
    capW = openW;
    capX = (vw - group) / 2;
    callX = capX + openW + GAP;
  }

  if (instant || !ready) bar.classList.add("instant");
  const px = (n) => `${Math.round(n)}px`;
  const set = (name, value) => bar.style.setProperty(name, value);
  set("--cap-w", px(capW));
  set("--cap-x", px(capX));
  set("--call-x", px(callX));
  set("--row-x", px(rowX));
  if (here) {
    set("--lens-x", px(here.left));
    set("--lens-w", px(here.width));
    bar.classList.remove("no-lens");
  } else {
    bar.classList.add("no-lens");
  }

  if (!ready) {
    ready = true;
    bar.dataset.ready = "1";
  }
  if (bar.classList.contains("instant")) {
    // one frame to commit the values with transitions off, one to let them back
    requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.remove("instant")));
  }
}

export function paintTabs(path) {
  const root = "/" + (String(path || "/").split("/")[1] || "");
  active = TAB_FOR[root] ?? null;
  tabs.forEach((tab) => tab.setAttribute("aria-current", tab.dataset.tab === active ? "page" : "false"));
  // a lens that is only now appearing is placed, not flown in from wherever it
  // last was — true on a deep link however long the first render takes
  layout({ instant: bar.classList.contains("no-lens") });
}

/* ---------------------------------------------------------- fold on scroll */
function setMin(on) {
  if (on === minimized) return;
  // never fold a page too short to have been scrolled on purpose
  if (on && (!active || document.documentElement.scrollHeight - innerHeight < 620)) return;
  minimized = on;
  bar.classList.toggle("min", on);
  layout();
}
export const expandBar = () => setMin(false);

/* ----------------------------------------------------------------- top bar */
let mediaEnd = 0, titleEnd = 0;

function flag(name, on) {
  const v = on ? "1" : "0";
  if (topbar.dataset[name] !== v) topbar.dataset[name] = v;
}

function paintTop(y) {
  const barH = topbar.offsetHeight;
  if (mediaEnd > 0) {
    // a photograph under the bar: no glass and white controls, or glass, dark
    // controls and the title — one or the other, never both
    const over = y < mediaEnd - barH;
    if (topbar.dataset.tone !== (over ? "dark" : "light")) topbar.dataset.tone = over ? "dark" : "light";
    flag("lifted", !over);
    flag("titled", !over && y > titleEnd);
  } else {
    if (topbar.dataset.tone !== "light") topbar.dataset.tone = "light";
    flag("lifted", y > 4);
    flag("titled", y > titleEnd);
  }
}

/** Where this screen's photograph and its title end, in document coordinates. */
function remeasure(screen = document.querySelector("#view .screen")) {
  if (!screen) return;
  const y = scrollY;
  const media = baseTone === "dark" ? screen.querySelector(".hero, .detail-hero") : null;
  mediaEnd = media ? media.getBoundingClientRect().bottom + y : 0;
  const h1 = screen.querySelector("h1");
  titleEnd = h1 ? Math.max(8, h1.getBoundingClientRect().bottom + y - topbar.offsetHeight) : 8;
}

/** Called after every render. */
export function measureScreen(screen, { title = "", tone = "light" } = {}) {
  baseTone = tone === "dark" ? "dark" : "light";
  tbTitle.textContent = title;
  remeasure(screen);
  lastY = Math.max(0, scrollY);
  run = 0;
  if (minimized) {
    minimized = false;
    bar.classList.remove("min");
  }
  paintTop(lastY);
  layout();
}

/* ------------------------------------------------------ the single scroll */
let lastY = 0, run = 0, ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = Math.max(0, scrollY);
    const max = document.documentElement.scrollHeight - innerHeight;
    const dy = y - lastY;
    lastY = y;
    paintTop(y);

    if (y < 120) { run = 0; setMin(false); return; }
    // the rubber band at the foot of a page reads as a scroll back up — ignore it
    if (y >= max - 2 && dy < 0) return;
    run = Math.sign(dy) === Math.sign(run) ? run + dy : dy;
    if (run > 52) setMin(true);
    else if (run < -30) setMin(false);
  });
}

/* ------------------------------------------------------------ drag the lens */
let drag = null, swallow = false;

function nearestTab(x) {
  let best = 0, gap = Infinity;
  tabs.forEach((tab, i) => {
    const s = slot(tab);
    const d = Math.abs(s.left + s.width / 2 - x);
    if (d < gap) { gap = d; best = i; }
  });
  return best;
}

function bindDrag() {
  // a mouse dragged across a link starts the browser's own drag, which cancels
  // the pointer on its first move. Ours is the only drag on this bar.
  caps.addEventListener("dragstart", (e) => e.preventDefault());

  caps.addEventListener("pointerdown", (e) => {
    if (minimized || e.button > 0) return;
    drag = { x0: e.clientX, id: e.pointerId, moved: false, idx: -1 };
  });

  caps.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.x0) < 8) return;
      drag.moved = true;
      try { caps.setPointerCapture(e.pointerId); } catch {}
      bar.classList.add("dragging");
      bar.classList.remove("no-lens");
    }
    const box = row.getBoundingClientRect();
    const x = clamp(e.clientX - box.left, 0, box.width);
    const idx = nearestTab(x);
    const w = slot(tabs[idx]).width;
    bar.style.setProperty("--lens-w", `${Math.round(w)}px`);
    bar.style.setProperty("--lens-x", `${Math.round(clamp(x - w / 2, 0, box.width - w))}px`);
    if (idx !== drag.idx) {
      drag.idx = idx;
      haptic(4);
      tabs.forEach((tab, i) => tab.classList.toggle("under", i === idx));
    }
  });

  const finish = () => {
    const d = drag;
    drag = null;
    bar.classList.remove("dragging");
    tabs.forEach((tab) => tab.classList.remove("under"));
    return d;
  };

  caps.addEventListener("pointerup", () => {
    const d = finish();
    if (!d || !d.moved) return;
    swallow = true;
    setTimeout(() => { swallow = false; }, 0);
    const tab = tabs[d.idx];
    const href = tab?.getAttribute("href");
    if (href && href !== (location.hash.split("?")[0] || "#/")) go(href);
    else layout();
  });
  // a cancelled pointer — a system gesture taking over — puts the lens back
  caps.addEventListener("pointercancel", () => { finish(); layout(); });

  caps.addEventListener("click", (e) => {
    if (swallow) { e.preventDefault(); e.stopPropagation(); return; }
    const tab = e.target.closest(".tab");
    // A folded bar shows only the tab you are on, so a tap on it is never a
    // navigation: it opens the bar and goes back to the top together.
    if (minimized) {
      e.preventDefault();
      setMin(false);
      if (tab) scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!tab) return;
    // Trap 3: the tab you are on returns to the top, as on iOS
    if (tab.getAttribute("href") === (location.hash.split("?")[0] || "#/")) {
      e.preventDefault();
      scrollTo({ top: 0, behavior: "smooth" });
    }
  }, true);
}

/* ------------------------------------------------------------------ labels */
function paintLabels() {
  tabs.forEach((tab) => {
    const label = t(`tab.${tab.dataset.tab}`);
    tab.querySelector(".tab-label").textContent = label;
    tab.setAttribute("aria-label", label);
  });
  paintBadge();
}

/** The Book tab carries the number of treatments waiting in the basket. */
function paintBadge() {
  const tab = tabs.find((x) => x.dataset.tab === "book");
  const badge = tab?.querySelector(".tab-badge");
  if (!badge) return;
  // moving an existing appointment is not a basket, whatever the draft holds
  const n = basket.get().reschedule ? 0 : basket.count();
  const text = n ? String(n) : "";
  const changed = badge.textContent !== text;
  badge.textContent = text;
  badge.classList.toggle("on", n > 0);
  if (changed && n > 0) replay(badge, "bump");
  const label = t("tab.book");
  tab.setAttribute("aria-label", n ? `${label}, ${t("svc.count", { n })}` : label);
}

function paintLang() {
  const pill = $("#lang-pill");
  if (!pill) return;
  pill.innerHTML = `<b class="${getLang() === "en" ? "on" : ""}">EN</b><b class="${getLang() === "fr" ? "on" : ""}">FR</b>`;
  pill.setAttribute("aria-label", t("a11y.langTo"));
}

/* ------------------------------------------------------------------- setup */
export function initChrome() {
  topbar = $("#topbar");
  tbTitle = $("#tb-title");
  bar = $("#tabbar");
  caps = $("#tabs");
  row = $("#tabs-row");
  tabs = $$(".tab", row);
  call = $("#call-btn");

  tabs.forEach((tab) => {
    const key = tab.dataset.tab;
    tab.querySelector(".tab-ico").innerHTML = icon(key) + icon(key + "F")
      + (key === "book" ? '<span class="tab-badge" aria-hidden="true"></span>' : "");
  });
  call.setAttribute("href", `tel:${BUSINESS.phoneHref}`);
  call.innerHTML = icon("phone");

  paintLabels();
  paintLang();
  bindDrag();
  basket.subscribe(paintBadge);

  $("#lang-pill").addEventListener("click", () => {
    setLang(otherLang());
    haptic(6);
  });

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => {
    remeasure();
    paintTop(Math.max(0, scrollY));
    layout({ instant: true });
  });
  // a label that changes width (a language, a font arriving) moves the lens
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => layout());
    tabs.forEach((tab) => ro.observe(tab));
  }
  document.fonts?.ready?.then(() => layout());
  document.addEventListener("lang:change", () => {
    paintLabels();
    paintLang();
  });
  layout({ instant: true });
}
