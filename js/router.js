// Hash routing. Every render builds a fresh screen node and hands it to the
// view's mount(), so listeners die with the node — nothing stacks on a second
// visit. go() to the hash you already have fires no hashchange, so it delegates
// to refresh(), which re-renders in place and keeps the scroll position.

import { $ } from "./util.js";

const routes = [];
let current = null;

export const route = (pattern, view) => routes.push({ pattern, view });

const match = (hash) => {
  const path = (hash.replace(/^#/, "") || "/").split("?")[0];
  for (const r of routes) {
    if (r.pattern === path) return { view: r.view, params: {}, path };
    if (r.pattern.includes(":")) {
      const p = r.pattern.split("/"), q = path.split("/");
      if (p.length !== q.length) continue;
      const params = {};
      const ok = p.every((seg, i) =>
        seg.startsWith(":") ? (params[seg.slice(1)] = decodeURIComponent(q[i])) : seg === q[i]);
      if (ok) return { view: r.view, params, path };
    }
  }
  return null;
};

export const query = () =>
  Object.fromEntries(new URLSearchParams(location.hash.split("?")[1] || ""));

const scrollMemory = new Map();
const cleanups = [];
let rendering = false, again = false;

export async function render({ keepScroll = false } = {}) {
  // a navigation that lands mid-render is not dropped: it renders straight after
  if (rendering) { again = true; return; }
  rendering = true;
  try {
    const host = $("#view");
    const hit = match(location.hash) || match("#/");
    const y = keepScroll ? scrollY : 0;
    if (current && !keepScroll) {
      document.dispatchEvent(new CustomEvent("view:leaving", { detail: { path: current } }));
      scrollMemory.set(current, scrollY);
    }
    const prev = current;
    current = hit.path;
    const out = await hit.view(hit.params, query());
    const screen = document.createElement("div");
    screen.className = "screen" + (out.flush ? " flush" : " pad-top");
    screen.dataset.route = hit.path.split("/")[1] || "home";
    screen.innerHTML = typeof out === "string" ? out : out.html;
    if (keepScroll) screen.style.animation = "none";
    // the screen going away lets go of what it held outside itself — timers,
    // subscriptions, observers — before the next one takes hold
    cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    host.replaceChildren(screen);
    if (typeof out === "object" && out.mount) out.mount(screen, (fn) => cleanups.push(fn));
    const back = history.state?.restore && prev !== current ? scrollMemory.get(current) : null;
    scrollTo({ top: keepScroll ? y : (back || 0), behavior: "instant" });
    document.dispatchEvent(new CustomEvent("view:rendered", {
      detail: { path: current, screen, title: out.title || "", tone: out.tone || "light" },
    }));
  } finally {
    rendering = false;
    if (again) { again = false; render(); }
  }
}

/** Re-render the current screen in place, keeping the scroll position. */
export const refresh = () => render({ keepScroll: true });

export function startRouter() {
  addEventListener("hashchange", () => render());
  if (!location.hash) location.replace("#/");
  return render();
}

export function go(hash) {
  const target = hash.startsWith("#") ? hash : "#" + hash;
  if (location.hash === target) return refresh();
  location.hash = target;
}
export const back = () => (history.length > 1 ? history.back() : go("#/"));
export const path = () => current;
