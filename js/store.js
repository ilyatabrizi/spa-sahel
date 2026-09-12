// The guest record: who they are, what they have booked, what they have spent,
// and what the club owes them. One object, in localStorage, on this device.
//
// A preview has no back end and should not pretend otherwise — nothing here
// reaches Spa Sahel. What it does do is behave exactly as the real thing would:
// points accrue on completed visits only, tiers are lifetime, a redeemed reward
// leaves the balance the moment it is claimed and lives in a wallet until it is
// used, and an appointment that has been and gone settles itself into history
// the next time the app opens. That last part is why `reconcile()` exists —
// without it a demo shows a visit from last Tuesday sitting under "upcoming"
// forever, which is the tell that nothing underneath is real.

import { CLUB, REWARDS, STORAGE, THERAPISTS } from "./config.js";
import { PACKAGES, SERVICES, lengthOf, service } from "./data.js";
import { addDays, dayKey, hash32, readJSON, rng, startOfDay, sum, uid, writeJSON } from "./util.js";

const KEY = STORAGE + "member";

const EMPTY = {
  v: 1,
  name: "",
  phone: "",
  email: "",
  birthday: "",          // "MM-DD" — we keep no year
  joined: null,
  points: 0,             // spendable
  lifetime: 0,           // never decreases; sets the tier
  bookings: [],          // {id, ref, when, items, therapist, status, paid, points, health, notes}
  wallet: [],            // {id, rewardId, claimed, usedOn}
  prefs: { therapist: "any", pressure: "medium", room: "quiet", notes: "", remind: true },
  health: null,          // the last declaration, re-offered at the next booking
  referral: "",
};

let state = load();
const listeners = new Set();

function load() {
  const raw = readJSON(KEY, null);
  if (!raw || typeof raw !== "object") return { ...EMPTY, prefs: { ...EMPTY.prefs } };
  return {
    ...EMPTY,
    ...raw,
    prefs: { ...EMPTY.prefs, ...(raw.prefs || {}) },
    bookings: Array.isArray(raw.bookings) ? raw.bookings : [],
    wallet: Array.isArray(raw.wallet) ? raw.wallet : [],
  };
}

function save() {
  writeJSON(KEY, state);
  listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
}

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const member = () => state;
export const isKnown = () => Boolean(state.name);

/* ------------------------------------------------------------------ tiers */
export function tierOf(lifetime = state.lifetime) {
  let hit = CLUB.tiers[0];
  for (const t of CLUB.tiers) if (lifetime >= t.at) hit = t;
  return hit;
}
export function nextTier(lifetime = state.lifetime) {
  return CLUB.tiers.find((t) => t.at > lifetime) || null;
}
/** 0..1 through the current tier. A member at the top reads as full. */
export function tierProgress(lifetime = state.lifetime) {
  const now = tierOf(lifetime), next = nextTier(lifetime);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (lifetime - now.at) / (next.at - now.at)));
}
/** What a dollar is worth to this member right now. */
export function earnRate(lifetime = state.lifetime) {
  const i = CLUB.tiers.indexOf(tierOf(lifetime));
  return [1, 1.15, 1.3, 1.5][i] ?? 1;
}
export const pointsFor = (total, lifetime = state.lifetime) =>
  Math.round((Number(total) || 0) * CLUB.perDollar * earnRate(lifetime));

/* --------------------------------------------------------------- identity */
export function join({ name, phone = "", email = "", birthday = "" }) {
  const fresh = !state.joined;
  state.name = String(name || "").trim();
  state.phone = phone;
  state.email = email;
  state.birthday = birthday;
  if (fresh) {
    state.joined = Date.now();
    state.points += CLUB.welcomeBonus;
    state.lifetime += CLUB.welcomeBonus;
    state.referral = referralCode(state.name);
  }
  save();
  return state;
}
export function setProfile(patch) {
  Object.assign(state, patch);
  save();
}
export function setPrefs(patch) {
  Object.assign(state.prefs, patch);
  save();
}
export function setHealth(health) {
  state.health = health;
  save();
}

function referralCode(name) {
  const base = String(name || "SAHEL").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4).padEnd(4, "X");
  return `${base}${(hash32(name + Date.now()) % 900 + 100)}`;
}

/* -------------------------------------------------------------- bookings */
/** SAH-4K7Q — short enough to read down a phone line. */
function reference() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `SAH-${s}`;
}

/**
 * `items` are {id, qty} over SERVICES, or {pkg, option} over PACKAGES.
 * `when` is a timestamp. Points are recorded but not credited — a booking that
 * has not happened yet has not earned anything.
 */
export function addBooking({ when, items, therapist = "any", notes = "", health = null,
                             total = 0, minutes = 0, rewardId = null, promo = null }) {
  const b = {
    id: uid(),
    ref: reference(),
    when,
    items,
    therapist,
    notes,
    health,
    total,
    minutes,
    rewardId,
    promo,
    points: pointsFor(total),
    status: "confirmed",
    made: Date.now(),
  };
  state.bookings.unshift(b);
  if (rewardId) useWallet(rewardId, b.id);
  if (health) state.health = health;
  save();
  return b;
}

export function cancelBooking(id) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b || b.status !== "confirmed") return null;
  b.status = "cancelled";
  // a reward spent on a cancelled visit comes back unused
  const w = state.wallet.find((x) => x.usedOn === id);
  if (w) w.usedOn = null;
  save();
  return b;
}

export function rescheduleBooking(id, when) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b || b.status !== "confirmed") return null;
  b.when = when;
  save();
  return b;
}

export const booking = (id) => state.bookings.find((b) => b.id === id) || null;
export const upcoming = () => state.bookings
  .filter((b) => b.status === "confirmed" && b.when >= Date.now())
  .sort((a, b) => a.when - b.when);
export const past = () => state.bookings
  .filter((b) => b.status !== "confirmed" || b.when < Date.now())
  .sort((a, b) => b.when - a.when);
export const nextVisit = () => upcoming()[0] || null;

/**
 * Settle anything whose time has passed: mark it completed and credit its
 * points. Called once at boot and whenever the app comes back to the front.
 */
export function reconcile(now = Date.now()) {
  let changed = false;
  for (const b of state.bookings) {
    if (b.status !== "confirmed" || b.when + (b.minutes || 60) * 60000 > now) continue;
    b.status = "completed";
    state.points += b.points || 0;
    state.lifetime += b.points || 0;
    changed = true;
  }
  if (changed) save();
  return changed;
}

/* --------------------------------------------------------------- rewards */
export const reward = (id) => REWARDS.find((r) => r.id === id) || null;
export const canRedeem = (id) => {
  const r = reward(id);
  return Boolean(r) && state.points >= r.cost;
};
/** Claim a reward: the points leave now, the voucher waits in the wallet. */
export function redeem(id) {
  const r = reward(id);
  if (!r || state.points < r.cost) return null;
  state.points -= r.cost;
  const w = { id: uid(), rewardId: id, claimed: Date.now(), usedOn: null };
  state.wallet.unshift(w);
  save();
  return w;
}
export const availableRewards = () => state.wallet.filter((w) => !w.usedOn);
function useWallet(walletId, bookingId) {
  const w = state.wallet.find((x) => x.id === walletId);
  if (w) w.usedOn = bookingId;
}

/* ------------------------------------------------------------------ demo */
/**
 * A year of plausible history, so the club, the tier ring and the visit list
 * have something to show a client in a preview. Seeded, so it is the same
 * every time, and every visit points at a real treatment at its real price.
 */
export function seedHistory() {
  const rand = rng(hash32("sahel-demo"));
  const pool = SERVICES.filter((s) => s.price > 0 && !s.addon && !s.alias);
  const today = startOfDay();
  const made = [];
  let lifetime = 0;
  for (let i = 11; i >= 1; i--) {
    if (rand() < 0.18) continue;
    const day = addDays(today, -Math.round(i * 30 + rand() * 14 - 7));
    const when = day.getTime() + (10 + Math.floor(rand() * 8)) * 3600000 + (rand() < 0.5 ? 0 : 1800000);
    const picks = [pool[Math.floor(rand() * pool.length)]];
    if (rand() < 0.3) picks.push(pool[Math.floor(rand() * pool.length)]);
    const items = picks.map((s) => ({ id: s.id, qty: 1 }));
    const total = sum(picks, (s) => s.price);
    const minutes = sum(picks, lengthOf);
    const pts = Math.round(total * CLUB.perDollar);
    lifetime += pts;
    made.push({
      id: uid(), ref: reference(), when, items,
      therapist: THERAPISTS[1 + Math.floor(rand() * (THERAPISTS.length - 1))].id,
      notes: "", health: null, total, minutes, rewardId: null, promo: null,
      points: pts, status: "completed", made: when - 86400000 * 3,
    });
  }
  state.bookings = [...made.sort((a, b) => b.when - a.when), ...state.bookings];
  state.points += lifetime;
  state.lifetime += lifetime;
  if (!state.joined) state.joined = made[made.length - 1]?.when || Date.now();
  save();
  return made.length;
}

export function forget() {
  try { localStorage.removeItem(KEY); } catch {}
  state = { ...EMPTY, prefs: { ...EMPTY.prefs } };
  save();
}

/* ------------------------------------------------------------- totalling */
/** Expand a booking's items into [{service|package, option, qty}]. */
export function expand(items) {
  return (items || []).map((it) => {
    if (it.pkg) {
      const p = PACKAGES.find((x) => x.id === it.pkg);
      return p ? { pkg: p, option: p.options?.[it.option] ?? null, qty: it.qty || 1 } : null;
    }
    const s = service(it.id);
    return s ? { service: s, qty: it.qty || 1 } : null;
  }).filter(Boolean);
}

export function totalOf(items) {
  return sum(expand(items), (e) => (e.pkg ? (e.option?.price ?? e.pkg.price ?? 0) : (e.service.price || 0)) * e.qty);
}
export function minutesOf(items) {
  return sum(expand(items), (e) => {
    if (e.pkg) return (e.option?.est ?? e.pkg.dur ?? sum(e.pkg.items || [], (i) => lengthOf(service(i.of)) * (i.qty || 1))) * e.qty;
    return lengthOf(e.service) * e.qty;
  });
}
/** Anything in the basket that has no published price blocks a total. */
export const hasQuoted = (items) =>
  expand(items).some((e) => !e.pkg && e.service.price == null);

export const visitCount = () => state.bookings.filter((b) => b.status === "completed").length;
export const spentTotal = () => sum(state.bookings.filter((b) => b.status === "completed"), (b) => b.total);

/** Today's date key, for anything that needs to know whether a day has turned. */
export const todayKey = () => dayKey(new Date());
