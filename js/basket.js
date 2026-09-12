// The booking in progress.
//
// Kept apart from store.js because it is a different kind of thing: the member
// record is what the spa knows about you, this is a half-finished sentence. It
// survives a reload and a tab switch — losing five steps of a booking because
// a phone call came in is the worst thing this app could do — but it is thrown
// away the moment the booking is confirmed.
//
// The slot hold is real in the only sense a preview can make it real: it
// expires. Sit on step five for eleven minutes and the time you chose is gone
// and you are told so, which is how the actual diary would behave.

import { BOOKING, STORAGE } from "./config.js";
import { lengthOf, pkg, service } from "./data.js";
import { readJSON, sum, writeJSON } from "./util.js";

const KEY = STORAGE + "draft";

const EMPTY = {
  items: [],            // [{id} | {pkg, option}]
  therapist: "any",
  day: null,            // "2026-09-18"
  slot: null,           // minutes from midnight
  heldAt: null,         // when the slot was chosen
  name: "", phone: "", email: "", first: false, notes: "", remind: true,
  health: null,         // {flags: [...], detail: "", consent: bool}
  rewardId: null,
  promo: null,
  step: 1,
};

let draft = load();
const listeners = new Set();

function load() {
  const raw = readJSON(KEY, null);
  if (!raw || typeof raw !== "object") return { ...EMPTY, items: [] };
  return { ...EMPTY, ...raw, items: Array.isArray(raw.items) ? raw.items : [] };
}
function save() {
  writeJSON(KEY, draft);
  listeners.forEach((fn) => { try { fn(draft); } catch (e) { console.error(e); } });
}

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const get = () => draft;
export const set = (patch) => { Object.assign(draft, patch); save(); };
export const reset = () => { draft = { ...EMPTY, items: [] }; save(); };

/* ------------------------------------------------------------------ items */
export const count = () => draft.items.length;
export const has = (id) => draft.items.some((i) => i.id === id);
export const hasPackage = (id) => draft.items.some((i) => i.pkg === id);

export function add(id) {
  if (has(id) || draft.items.length >= BOOKING.maxServices) return false;
  draft.items.push({ id });
  dropSlot();
  save();
  return true;
}
export function addPackage(pkgId, option = null) {
  if (hasPackage(pkgId) || draft.items.length >= BOOKING.maxServices) return false;
  draft.items.push({ pkg: pkgId, option });
  dropSlot();
  save();
  return true;
}
export function remove(id) {
  draft.items = draft.items.filter((i) => i.id !== id && i.pkg !== id);
  dropSlot();
  save();
}
export function toggle(id) {
  return has(id) ? (remove(id), false) : add(id);
}

/**
 * Anything that changes the length of the visit invalidates the slot — a
 * ninety-minute booking cannot keep a gap that only fits thirty.
 */
function dropSlot() {
  draft.slot = null;
  draft.heldAt = null;
}

/* ------------------------------------------------------------------ hold */
export function holdSlot(day, slot) {
  draft.day = day;
  draft.slot = slot;
  draft.heldAt = Date.now();
  save();
}
export const holdLeft = () => {
  if (!draft.heldAt || draft.slot == null) return 0;
  return Math.max(0, BOOKING.holdMinutes * 60000 - (Date.now() - draft.heldAt));
};
export const holdExpired = () => draft.slot != null && holdLeft() <= 0;
export function releaseSlot() {
  dropSlot();
  save();
}

/* ---------------------------------------------------------------- totals */
/** Which treatment families this visit touches — it decides who can take it. */
export const groups = () => [...new Set(draft.items
  .flatMap((i) => (i.pkg ? packageGroups(i.pkg) : [service(i.id)?.group]))
  .filter(Boolean))];

function packageGroups(pkgId) {
  const p = pkg(pkgId);
  // a package lands wherever its own treatments do; one built from options
  // rather than items (Natural Elegance) is hands and feet
  if (!p) return [];
  if (p.items) return p.items.map((x) => service(x.of)?.group).filter(Boolean);
  return ["nails"];
}

export const minutes = () => sum(draft.items, (i) => {
  if (i.pkg) return packageMinutes(i);
  return lengthOf(service(i.id));
});

export const total = () => sum(draft.items, (i) => {
  if (i.pkg) return packagePrice(i);
  return service(i.id)?.price || 0;
});

/** Any consultation-priced treatment means the visit has no total yet. */
export const quoted = () => draft.items.some((i) => !i.pkg && service(i.id)?.price == null);

function withPackage(i, f) {
  const p = pkg(i.pkg);
  return p ? f(p, p.options?.[i.option] ?? null) : 0;
}
const packagePrice = (i) => withPackage(i, (p, o) => o?.price ?? p.price ?? 0);
const packageMinutes = (i) => withPackage(i, (p, o) =>
  o?.est ?? p.dur ?? sum(p.items || [], (x) => lengthOf(service(x.of)) * (x.qty || 1)));

/**
 * The latest start the basket allows. Natural Elegance has a cheaper rate
 * "before 2 PM", and a rate with a condition on it has to be enforced or it is
 * not a rate — pick that option and the afternoon closes.
 */
export function latestStart() {
  let cap = null;
  for (const i of draft.items) {
    const before = i.pkg ? pkg(i.pkg)?.options?.[i.option]?.before : null;
    if (before) cap = cap == null ? before : Math.min(cap, before);
  }
  return cap;
}
