// System / Light / Dark. index.html applies the choice before the first paint;
// this keeps it in step afterwards — including when the phone itself switches
// at sunset while the app is open.

import { STORAGE } from "./config.js";

const KEY = STORAGE + "theme";
const mq = matchMedia("(prefers-color-scheme: dark)");
export const GROUND = { light: "#F2F3F6", dark: "#0B0C0E" };

export function themePref() {
  try { return localStorage.getItem(KEY) || "system"; } catch { return "system"; }
}
export const isDark = () => document.documentElement.dataset.mode === "dark";

function apply(pref) {
  const dark = pref === "dark" || (pref !== "light" && mq.matches);
  const root = document.documentElement;
  root.dataset.theme = pref;
  root.dataset.mode = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? GROUND.dark : GROUND.light);
  document.dispatchEvent(new CustomEvent("theme:change", { detail: { dark } }));
}

export function initTheme() {
  apply(themePref());
  const follow = () => { if (themePref() === "system") apply("system"); };
  mq.addEventListener ? mq.addEventListener("change", follow) : mq.addListener(follow);
}

export function setTheme(pref) {
  try { localStorage.setItem(KEY, pref); } catch {}
  const root = document.documentElement;
  root.classList.add("theming");
  apply(pref);
  setTimeout(() => root.classList.remove("theming"), 420);
}
