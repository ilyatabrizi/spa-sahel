// Small shared helpers. No framework, no dependencies.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape anything a person typed before it goes near innerHTML. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const pad2 = (n) => String(n).padStart(2, "0");
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
export const sum = (xs, f = (x) => x) => xs.reduce((a, x) => a + (Number(f(x)) || 0), 0);

/** "Layla Mansouri" → "LM"; a single name → its first letter. */
export function initials(name) {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "";
  return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase();
}
export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";

/* ------------------------------------------------------------------ dates */
/** Local midnight, so a day is a day wherever the phone thinks it is. */
export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
/** "2026-09-18" — the key a day is stored and compared under. */
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
export const fromDayKey = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const sameDay = (a, b) => dayKey(a) === dayKey(b);
export const minutesOfDay = (d) => d.getHours() * 60 + d.getMinutes();
/** A day key plus minutes-from-midnight, as a real instant. */
export const atMinute = (key, mins) => {
  const d = fromDayKey(key);
  d.setMinutes(mins);
  return d;
};
export const daysBetween = (a, b) =>
  Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

/* ---------------------------------------------------------------- seeding */
/** Deterministic 32-bit FNV-1a, so the demo shows the same thing twice. */
export function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
/** Tiny seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------ validation */
export const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());
/** Ten digits somewhere in there is a North American mobile. */
export const validPhone = (s) => (String(s || "").match(/\d/g) || []).length >= 10;
/** 5148445509 → "(514) 844-5509" */
export function prettyPhone(s) {
  const d = (String(s || "").match(/\d/g) || []).join("").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(s || "");
}

/* ---------------------------------------------------------------- storage */
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
