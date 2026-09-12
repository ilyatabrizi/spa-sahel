// Availability.
//
// A preview has no diary to read, so this invents one — but it invents it the
// way a real diary behaves, and it invents it deterministically. The same
// Thursday shows the same gaps on every device and after every reload, because
// every "already taken" block is drawn from a seed made of the date and the
// therapist. A slot grid that reshuffles on refresh is the fastest way to tell
// a client that nothing underneath is real.
//
// The rules it enforces are Spa Sahel's own:
//   · Monday to Friday 10:00–19:00, Saturday 09:00–17:00, closed Sunday
//   · a booking must finish by closing, not merely start before it
//   · two hours of notice, so nobody books a facial for ten minutes from now
//   · fifteen minutes between guests to turn the room over
//   · a therapist only appears for treatments she actually does
//
// Everything is in minutes from local midnight; `atMinute()` turns a pair back
// into a real instant at the end.

import { BOOKING, HOURS, THERAPISTS } from "./config.js";
import { atMinute, addDays, dayKey, hash32, minutesOfDay, rng, startOfDay } from "./util.js";

export const isOpen = (date) => Boolean(HOURS[new Date(date).getDay()]);
export const hoursFor = (date) => HOURS[new Date(date).getDay()];

/** Which of the team can take every treatment in this basket. */
export function therapistsFor(groups) {
  const want = [...new Set(groups)].filter(Boolean);
  return THERAPISTS.filter((t) => t.skills === "*" || want.every((g) => t.skills.includes(g)));
}
export const canTake = (therapist, groups) =>
  therapist?.skills === "*" || [...new Set(groups)].every((g) => therapist?.skills?.includes(g));

/**
 * The blocks a therapist already has on a given day. Seeded by her id and the
 * date: busier through the middle of the day, busier on Saturdays, quieter first
 * thing. Returns [start, end] pairs in minutes.
 */
function busyFor(key, therapistId) {
  const open = HOURS[new Date(key.replace(/-/g, "/")).getDay()];
  if (!open) return [];
  const rand = rng(hash32(`${key}|${therapistId}`));
  const [from, to] = open;
  const saturday = new Date(key.replace(/-/g, "/")).getDay() === 6;
  const load = saturday ? 0.62 : 0.42;
  const blocks = [];
  let cursor = from;
  while (cursor < to - 30) {
    // how far into the day we are, 0..1 — the middle fills first
    const through = (cursor - from) / (to - from);
    const pressure = load * (0.55 + 0.9 * Math.sin(Math.PI * Math.min(1, Math.max(0, through))));
    if (rand() < pressure) {
      const len = [30, 45, 60, 60, 75, 90][Math.floor(rand() * 6)];
      const end = Math.min(to, cursor + len);
      blocks.push([cursor, end + BOOKING.turnaround]);
      cursor = end + BOOKING.turnaround;
    } else {
      cursor += 30;
    }
  }
  return blocks;
}

const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;

/**
 * Every start time on a given day that fits `minutes` of treatment.
 * Returns [{ at, free, who }] — `who` is the set of therapist ids able to take
 * it, so "first available" can be offered when one specific person cannot.
 */
export function slotsOn(date, { minutes = 60, groups = [], therapist = "any", notBefore = null } = {}) {
  const open = hoursFor(date);
  if (!open) return [];
  const key = dayKey(date);
  const [from, to] = open;
  const team = (therapist === "any" ? therapistsFor(groups) : THERAPISTS.filter((t) => t.id === therapist))
    .filter((t) => t.id !== "any");
  // "First available" with nobody qualified still offers the room: the spa
  // assigns from the whole floor. Fall back to everyone rather than showing
  // an empty day for a basket no single person covers.
  const roster = team.length ? team : THERAPISTS.filter((t) => t.id !== "any");
  const diaries = new Map(roster.map((t) => [t.id, busyFor(key, t.id)]));

  const now = Date.now();
  const earliest = now + BOOKING.leadMinutes * 60000;
  const out = [];
  const span = minutes + BOOKING.turnaround;
  for (let at = from; at + minutes <= to; at += BOOKING.slotStep) {
    if (notBefore != null && at < notBefore) continue;
    if (atMinute(key, at).getTime() < earliest) continue;
    const who = roster
      .filter((t) => !diaries.get(t.id).some(([b0, b1]) => overlaps(at, at + span, b0, b1)))
      .map((t) => t.id);
    out.push({ at, free: who.length > 0, who });
  }
  return out;
}

/** Morning / afternoon / evening, for the three groups the picker shows. */
export function groupSlots(slots) {
  return {
    morning: slots.filter((s) => s.at < 720),
    afternoon: slots.filter((s) => s.at >= 720 && s.at < 1020),
    evening: slots.filter((s) => s.at >= 1020),
  };
}

/**
 * A month of days for the calendar strip, each with enough to draw its state
 * without generating every slot twice.
 */
export function calendar(fromDate, days, opts) {
  const today = startOfDay();
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(fromDate, i);
    const closed = !isOpen(d);
    const slots = closed ? [] : slotsOn(d, opts);
    const free = slots.filter((s) => s.free).length;
    out.push({
      date: d,
      key: dayKey(d),
      closed,
      past: d < today,
      free,
      total: slots.length,
      // three states the strip can colour: open, nearly full, nothing left
      state: closed ? "closed" : free === 0 ? "full" : free <= 3 ? "tight" : "open",
    });
  }
  return out;
}

/** The first day from `fromDate` with anything free — where the picker lands. */
export function firstOpenDay(fromDate, opts, limit = BOOKING.horizonDays) {
  for (let i = 0; i < limit; i++) {
    const d = addDays(fromDate, i);
    if (!isOpen(d)) continue;
    if (slotsOn(d, opts).some((s) => s.free)) return d;
  }
  return null;
}

/* --------------------------------------------------------------- the door */
/**
 * Are they open right now, and what should the badge say? Returns a shape the
 * view turns into one line, in either language.
 */
export function doorState(now = new Date()) {
  const today = hoursFor(now);
  const mins = minutesOfDay(now);
  if (today && mins >= today[0] && mins < today[1]) {
    return { open: true, until: today[1] };
  }
  if (today && mins < today[0]) {
    return { open: false, soon: true, from: today[0] };
  }
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now, i);
    const h = hoursFor(d);
    if (h) return { open: false, soon: false, nextDay: d, from: h[0] };
  }
  return { open: false, soon: false };
}
