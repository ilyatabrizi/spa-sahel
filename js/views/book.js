// Booking — six steps and a confirmation.
//
// Each step is its own route, so the phone's back gesture walks the flow
// backwards the way a guest expects instead of throwing them out of it, and a
// half-finished booking survives a reload because the draft lives in
// basket.js rather than in this module's closure.
//
// The step order is the order the spa itself needs the answers in: what, with
// whom, when, who are you, what should the therapist know, and then — only
// then — the money. Health comes before the total on purpose. A guest who
// discovers on the last screen that she cannot have a treatment has been made
// to enter a card first, which is the thing every spa booking form gets wrong.
//
// The dock at the bottom is written into a node that lives OUTSIDE the screen.
// It has to: .screen animates with a transform, and a transformed ancestor
// both breaks position:fixed and silently switches backdrop-filter off.

import { BOOKING, CLUB, THERAPISTS } from "./../config.js";
import { GROUPS, SERVICES, inGroup, pkg, service } from "./../data.js";
import { clock, dateLong, dateShort, dayName, duration, money, monthName, t, tr } from "./../i18n.js";
import { icon } from "./../icons.js";
import { img } from "./../photos.js";
import { haptic, revealOn } from "./../motion.js";
import { go } from "./../router.js";
import { calendar, canTake, firstOpenDay, groupSlots, isOpen, slotsOn, therapistsFor } from "./../schedule.js";
import * as basket from "./../basket.js";
import * as store from "./../store.js";
import { confirmSheet, durationText, footer, priceText, sheet, toast } from "./../ui.js";
import {
  $, $$, addDays, atMinute, dayKey, esc, fromDayKey, prettyPhone, startOfDay,
  sum, validEmail, validPhone,
} from "./../util.js";

const STEPS = ["", "who", "when", "details", "health", "confirm"];
const PROMOS = { SAHEL10: { off: 10, kind: "amount" }, SUNRISE: { off: 0.15, kind: "percent" } };

/* --------------------------------------------------------------- chrome */
function stepHead(n, kicker, title, sub) {
  const dots = STEPS.map((_, i) =>
    `<span class="step-dot ${i + 1 < n ? "done" : i + 1 === n ? "on" : ""}"><i></i></span>`).join("");
  return `<div class="steps">${dots}</div>
    <div class="step-head">
      <div class="step-kicker">${esc(t("bk.step", { n, m: STEPS.length }))} · ${esc(kicker)}</div>
      <h1 class="step-title">${esc(title)}</h1>
      ${sub ? `<p class="step-sub">${esc(sub)}</p>` : ""}
    </div>`;
}

/** Fill the dock that lives outside the screen, and hand back a cleanup. */
function dock({ line, sub, cta, ctaHref, enabled = true, onGo }) {
  const el = $("#bookdock");
  if (!el) return () => {};
  el.hidden = false;
  el.classList.remove("away");
  el.innerHTML = `<div class="dock-sum"><b>${line}</b>${sub ? `<small>${sub}</small>` : ""}</div>
    <button class="btn btn-primary" ${enabled ? "" : "disabled"}>${esc(cta)}${icon("chevron")}</button>`;
  const btn = el.querySelector("button");
  const handler = () => { haptic(8); onGo ? onGo() : go(ctaHref); };
  btn.addEventListener("click", handler);
  return () => { el.hidden = true; el.innerHTML = ""; };
}
export function hideDock() {
  const el = $("#bookdock");
  if (el) { el.hidden = true; el.innerHTML = ""; }
}

/** The running summary line every step carries. */
function basketLine() {
  const n = basket.count();
  if (!n) return { line: esc(t("bk.empty")), sub: "" };
  const mins = basket.minutes();
  const value = basket.quoted() ? t("svc.quoted") : money(basket.total());
  return {
    line: esc(value),
    sub: esc(`${t("svc.count", { n })} · ${duration(mins)}`),
  };
}

/* =========================================================== 1 · what */
export function bookStep1(_p, query) {
  // a move that was walked away from is not a basket
  if (basket.get().reschedule) basket.reset();
  // arriving from a treatment or a package page drops it straight in
  if (query.s && service(query.s)) basket.add(query.s);
  if (query.p && pkg(query.p)) basket.addPackage(query.p, query.o != null ? Number(query.o) : null);
  const openGroup = query.g && GROUPS.some((g) => g.id === query.g) ? query.g : (GROUPS[0].id);

  const html = `
  ${stepHead(1, t("bk.s1"), t("bk.pick"), t("bk.pick.sub", { n: BOOKING.maxServices }))}
  <div class="wrap" style="margin-top:18px">
    <div id="chosen">${chosenBlock()}</div>

    <section style="margin-top:22px">
      <div class="chips" id="g-chips">
        ${GROUPS.map((g) => `<button class="chip ${g.id === openGroup ? "on" : ""}" data-g="${g.id}"
          aria-pressed="${g.id === openGroup}">${icon(g.icon)}<span>${esc(tr(g.short))}</span></button>`).join("")}
      </div>
      <div class="list" id="g-list" style="margin-top:12px">${groupList(openGroup)}</div>
    </section>
  </div>`;

  return {
    html,
    title: t("bk.title"),
    mount(screen, onCleanup) {
      const list = $("#g-list", screen);
      const chosen = $("#chosen", screen);
      let current = openGroup;

      const repaintDock = () => {
        cleanupDock();
        const { line, sub } = basketLine();
        cleanupDock = dock({
          line, sub,
          cta: t("nav.continue"),
          enabled: basket.count() > 0,
          onGo: () => go("#/book/who"),
        });
      };
      let cleanupDock = () => {};
      repaintDock();
      onCleanup(() => cleanupDock());

      $("#g-chips", screen).addEventListener("click", (e) => {
        const chip = e.target.closest("[data-g]");
        if (!chip || chip.dataset.g === current) return;
        current = chip.dataset.g;
        $$(".chip", screen).forEach((c) => {
          const on = c.dataset.g === current;
          c.classList.toggle("on", on);
          c.setAttribute("aria-pressed", String(on));
        });
        list.innerHTML = groupList(current);
      });

      // Keep what the finger is on under the finger. The visit summary sits above
      // the list and grows a row with every choice, so without this each tap slid
      // the list down and left a different treatment beneath the thumb.
      const holdStill = (anchor, change) => {
        const before = anchor.getBoundingClientRect().top;
        change();
        if (!anchor.isConnected) return;
        const moved = anchor.getBoundingClientRect().top - before;
        if (Math.abs(moved) > 1) scrollBy({ top: moved, behavior: "instant" });
      };

      list.addEventListener("click", (e) => {
        const row = e.target.closest("[data-id]");
        if (!row) return;
        const id = row.dataset.id;
        const s = service(id);
        if (s?.price == null) { go(`#/service/${id}`); return; }
        if (!basket.has(id) && basket.count() >= BOOKING.maxServices) {
          toast(t("bk.pick.sub", { n: BOOKING.maxServices }), "info");
          return;
        }
        holdStill(row, () => {
          basket.toggle(id);
          const on = String(basket.has(id));
          // in place, not a re-render: the row keeps focus and nothing reflows
          row.setAttribute("aria-pressed", on);
          row.querySelector(".check").setAttribute("aria-checked", on);
          chosen.innerHTML = chosenBlock();
        });
        haptic(6);
        repaintDock();
      });

      chosen.addEventListener("click", (e) => {
        const del = e.target.closest("[data-drop]");
        if (!del) return;
        holdStill($("#g-chips", screen), () => {
          basket.remove(del.dataset.drop);
          chosen.innerHTML = chosenBlock();
          list.innerHTML = groupList(current);
        });
        repaintDock();
      });
    },
  };
}

function groupList(gid) {
  return inGroup(gid).map((s) => {
    const on = basket.has(s.id);
    const quoted = s.price == null;
    return `<button class="row" data-id="${s.id}" aria-pressed="${on}">
      <span class="check" aria-checked="${on}">${icon("check")}</span>
      <span class="row-body">
        <span class="row-title">${esc(tr(s.name))}</span>
        <span class="row-sub">${esc(durationText(s))}${s.perSession ? ` · ${esc(t("svc.perSession"))}` : ""}</span>
      </span>
      <span class="row-val">${esc(priceText(s))}</span>
      ${quoted ? `<span class="row-chev">${icon("chevron")}</span>` : ""}
    </button>`;
  }).join("");
}

function chosenBlock() {
  const d = basket.get();
  if (!d.items.length) {
    return `<div class="note plain">${icon("info")}<div>${esc(t("bk.empty"))}</div></div>`;
  }
  const rows = d.items.map((i) => {
    if (i.pkg) {
      const p = pkg(i.pkg);
      const o = p?.options?.[i.option];
      return { id: p.id, name: tr(p.name) + (o ? ` · ${tr(o.name)}` : ""), price: o?.price ?? p.price, photo: p.photo };
    }
    const s = service(i.id);
    return { id: s.id, name: tr(s.name), price: s.price, photo: s.photo };
  });
  return `<div class="card">
    <div class="card-pad" style="padding-bottom:8px">
      <div class="sec-head" style="margin:0"><h2>${esc(t("bk.chosen"))}</h2>
        <span class="sub">${esc(duration(basket.minutes()))}</span></div>
    </div>
    ${rows.map((r) => `<div class="row">
      ${r.photo ? `<span class="row-ico" style="overflow:hidden;padding:0">${img(r.photo, "", { sizes: "34px" })}</span>`
                : `<span class="row-ico">${icon("sparkle")}</span>`}
      <span class="row-body"><span class="row-title">${esc(r.name)}</span></span>
      <span class="row-val">${esc(money(r.price))}</span>
      <button class="tb-btn" data-drop="${r.id}" aria-label="${esc(t("svc.remove"))}">${icon("close")}</button>
    </div>`).join("")}
  </div>`;
}

/* ========================================================== 2 · who */
export function bookStep2() {
  if (!basket.count()) return redirect("#/book");
  const groups = basket.groups();
  const able = therapistsFor(groups);

  // A facial and a massage are two different pairs of hands. When no one person
  // covers the whole basket, say that plainly rather than showing four greyed
  // names and letting the guest guess why.
  const split = able.length <= 1;

  const html = `
  ${stepHead(2, t("bk.s2"), t("bk.who"), split ? t("bk.who.split") : t("bk.who.sub"))}
  <div class="wrap" style="margin-top:18px">
    ${split ? `<div class="note" style="margin-bottom:14px">${icon("info")}<div>${esc(t("bk.who.splitNote"))}</div></div>` : ""}
    ${THERAPISTS.map((p) => {
      const ok = p.id === "any" || able.some((a) => a.id === p.id);
      const on = basket.get().therapist === p.id;
      return `<button class="person" data-t="${p.id}" aria-pressed="${on}" ${ok ? "" : "disabled"}>
        <span class="avatar ${p.id === "any" ? "sun" : ""}">${p.id === "any" ? icon("users") : esc(p.initials)}</span>
        <span class="grow">
          <span class="row-title" style="display:block">${esc(tr(p.name))}</span>
          <span class="row-sub">${esc(ok ? tr(p.role) : t("bk.who.busy"))}</span>
        </span>
        ${on ? `<span class="check" aria-checked="true">${icon("check")}</span>` : `<span class="row-chev">${icon("chevron")}</span>`}
      </button>`;
    }).join("")}
  </div>`;

  return {
    html,
    title: t("bk.title"),
    mount(screen, onCleanup) {
      const clean = dock({ ...basketLine(), cta: t("nav.continue"), onGo: () => go("#/book/when") });
      onCleanup(clean);
      screen.addEventListener("click", (e) => {
        const b = e.target.closest("[data-t]");
        if (!b) return;
        basket.set({ therapist: b.dataset.t });
        haptic(6);
        go("#/book/when");
      });
    },
  };
}

/* ========================================================= 3 · when */
/** The head for moving an appointment — no progress dots, because there are no steps. */
function moveHead(b) {
  const w = new Date(b.when);
  const now = `${dateLong(w)} · ${clock(w.getHours() * 60 + w.getMinutes())}`;
  return `<div class="step-head" style="padding-top:12px">
      <div class="step-kicker">${esc(t("ap.reschedule"))} · ${esc(b.ref)}</div>
      <h1 class="step-title">${esc(t("ap.resched.title"))}</h1>
      <p class="step-sub">${esc(t("ap.resched.now", { d: now }))}</p>
    </div>`;
}

export function bookStep3(_p, query = {}) {
  // Moving an appointment that already exists: the link carries it, and the
  // draft is loaded from it once. Arriving without that link while a move is
  // half-done means it was abandoned — start clean rather than resume it.
  if (query.r) {
    const b = store.booking(query.r);
    if (!b || b.status !== "confirmed" || b.when <= Date.now()) return redirect("#/you");
    if (basket.get().reschedule !== b.id) basket.startReschedule(b, store.member());
  } else if (basket.get().reschedule) {
    basket.reset();
    return redirect("#/book");
  }
  if (!basket.count()) return redirect("#/book");
  const d = basket.get();
  const moving = d.reschedule ? store.booking(d.reschedule) : null;
  const opts = { minutes: basket.minutes(), groups: basket.groups(), therapist: d.therapist };
  const cap = basket.latestStart();
  const today = startOfDay();
  const land = d.day ? fromDayKey(d.day)
    : moving ? startOfDay(new Date(moving.when))
    : (firstOpenDay(today, opts) || today);
  const days = calendar(today, BOOKING.horizonDays, opts);

  const html = `
  ${moving ? moveHead(moving) : stepHead(3, t("bk.s3"), t("bk.when"), t("bk.when.sub", { n: BOOKING.holdMinutes }))}
  <div class="wrap" style="margin-top:16px">
    <div class="cal-month" id="cal-month"></div>
    <div class="cal" id="cal">
      ${days.map((day) => `<button class="cal-day ${day.state}" data-day="${day.key}"
        aria-pressed="${day.key === dayKey(land)}" ${day.closed || day.state === "full" ? "disabled" : ""}>
        <small>${esc(dayName(day.date.getDay(), true))}</small>
        <b>${day.date.getDate()}</b>
        <i></i>
      </button>`).join("")}
    </div>
    ${cap ? `<div class="note" style="margin-top:8px">${icon("info")}<div>${esc(t("svc.beforeTwo"))} — ${esc(clock(cap))}</div></div>` : ""}
    <div id="slots" style="margin-top:6px"></div>
  </div>`;

  return {
    html,
    title: t("bk.title"),
    mount(screen, onCleanup) {
      const cal = $("#cal", screen);
      const out = $("#slots", screen);
      const monthLabel = $("#cal-month", screen);
      let day = dayKey(land);
      let cleanupDock = () => {};
      onCleanup(() => cleanupDock());

      const commitMove = () => {
        const at = basket.get().slot;
        if (at == null || !moving) return;
        const when = atMinute(day, at).getTime();
        store.rescheduleBooking(moving.id, when);
        basket.reset();
        haptic([10, 40, 16]);
        toast(t("ap.resched.done", { d: `${dateShort(when)} · ${clock(at)}` }), "calendar");
        go(`#/appointment/${moving.id}`);
      };

      const paintMonth = () => {
        const d0 = fromDayKey(day);
        monthLabel.textContent = `${monthName(d0.getMonth())} ${d0.getFullYear()}`;
      };
      const paintDock = () => {
        cleanupDock();
        const chosen = basket.get().slot != null && basket.get().day === day;
        const base = basketLine();
        cleanupDock = dock({
          line: chosen ? esc(`${dateShort(fromDayKey(day))} · ${clock(basket.get().slot)}`) : base.line,
          sub: chosen ? base.sub : esc(t("bk.err.slot")),
          cta: moving ? t("ap.resched.cta") : t("nav.continue"),
          enabled: chosen,
          onGo: () => (moving ? commitMove() : go("#/book/details")),
        });
      };
      const paintSlots = () => {
        const date = fromDayKey(day);
        if (!isOpen(date)) {
          out.innerHTML = `<div class="note" style="margin-top:18px">${icon("info")}<div>${esc(t("bk.closedDay"))}</div></div>`;
          return;
        }
        // A guest cannot be in two rooms at once: her other appointments close
        // the times they overlap. When moving one, its own time is shown as hers.
        const others = store.upcoming().filter((b) => b.id !== d.reschedule);
        const clashes = (at) => others.some((b) => {
          const w = new Date(b.when);
          if (dayKey(w) !== day) return false;
          const start = w.getHours() * 60 + w.getMinutes();
          return at < start + (b.minutes || 60) && start < at + opts.minutes;
        });
        const nowAt = moving && dayKey(new Date(moving.when)) === day
          ? new Date(moving.when).getHours() * 60 + new Date(moving.when).getMinutes() : null;
        const all = slotsOn(date, opts)
          .filter((s) => cap == null || s.at <= cap)
          .map((s) => (s.at === nowAt ? { ...s, free: false, current: true }
            : clashes(s.at) ? { ...s, free: false } : s));
        if (!all.length) {
          out.innerHTML = `<div class="empty">${icon("clock")}<div>${esc(t("bk.noslots"))}</div></div>`;
          return;
        }
        const g = groupSlots(all);
        const part = (key, label) => {
          const list = g[key];
          if (!list.length) return "";
          return `<div class="slot-group"><h3>${esc(label)}</h3><div class="slots">
            ${list.map((s) => `<button class="slot${s.current ? " current" : ""}" data-at="${s.at}" ${s.free ? "" : "disabled"}
              ${s.current ? `title="${esc(t("ap.resched.current"))}" aria-label="${esc(`${clock(s.at)}, ${t("ap.resched.current")}`)}"` : ""}
              aria-pressed="${basket.get().day === day && basket.get().slot === s.at}">${esc(clock(s.at))}</button>`).join("")}
          </div></div>`;
        };
        out.innerHTML = part("morning", t("bk.morning")) + part("afternoon", t("bk.afternoon")) + part("evening", t("bk.evening"));
      };

      cal.addEventListener("click", (e) => {
        const b = e.target.closest("[data-day]");
        if (!b || b.dataset.day === day) return;
        day = b.dataset.day;
        $$(".cal-day", cal).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.day === day)));
        basket.set({ day, slot: null, heldAt: null });
        paintMonth();
        paintSlots();
        paintDock();
        haptic(5);
      });

      out.addEventListener("click", (e) => {
        const b = e.target.closest("[data-at]");
        if (!b) return;
        basket.holdSlot(day, Number(b.dataset.at));
        $$(".slot", out).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        haptic(9);
        paintDock();
      });

      paintMonth();
      paintSlots();
      paintDock();
      // land the strip on the chosen day rather than at the far left
      const sel = cal.querySelector('[aria-pressed="true"]');
      if (sel) cal.scrollTo({ left: Math.max(0, sel.offsetLeft - (cal.clientWidth - sel.offsetWidth) / 2), behavior: "instant" });
      // the month label follows the strip as it is scrolled
      const onScroll = () => {
        const mid = cal.scrollLeft + cal.clientWidth / 2;
        const near = $$(".cal-day", cal).find((x) => x.offsetLeft + x.offsetWidth > mid);
        if (!near) return;
        const d0 = fromDayKey(near.dataset.day);
        monthLabel.textContent = `${monthName(d0.getMonth())} ${d0.getFullYear()}`;
      };
      cal.addEventListener("scroll", onScroll, { passive: true });
      onCleanup(() => cal.removeEventListener("scroll", onScroll));
    },
  };
}

/* ======================================================= 4 · details */
export function bookStep4() {
  if (!basket.count()) return redirect("#/book");
  const d = basket.get();
  const m = store.member();
  const name = d.name || m.name || "";
  const phone = d.phone || m.phone || "";
  const email = d.email || m.email || "";

  const html = `
  ${stepHead(4, t("bk.s4"), t("bk.you"), "")}
  <div class="wrap" style="margin-top:18px">
    <div class="card card-pad">
      <div class="field">
        <label for="f-name">${esc(t("bk.name"))}</label>
        <input id="f-name" name="name" autocomplete="name" value="${esc(name)}" placeholder="${esc(t("bk.name"))}">
      </div>
      <div class="field">
        <label for="f-phone">${esc(t("bk.phone"))}</label>
        <input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel"
          value="${esc(phone)}" placeholder="(514) 000-0000">
      </div>
      <div class="field">
        <label for="f-email">${esc(t("bk.email"))}</label>
        <input id="f-email" name="email" type="email" inputmode="email" autocomplete="email"
          value="${esc(email)}" placeholder="${esc(t("bk.email.ph"))}">
      </div>
    </div>

    <div class="list" style="margin-top:12px">
      <button class="row" data-toggle="first" aria-checked="${d.first}">
        <span class="row-ico">${icon("sparkle")}</span>
        <span class="row-body"><span class="row-title">${esc(t("bk.first"))}</span></span>
        <span class="switch" aria-checked="${d.first}"></span>
      </button>
      <button class="row" data-toggle="remind" aria-checked="${d.remind}">
        <span class="row-ico">${icon("bell")}</span>
        <span class="row-body"><span class="row-title">${esc(t("bk.remind"))}</span></span>
        <span class="switch" aria-checked="${d.remind}"></span>
      </button>
    </div>

    <div class="card card-pad" style="margin-top:12px">
      <div class="field">
        <label for="f-notes">${esc(t("bk.notes"))}</label>
        <textarea id="f-notes" name="notes" placeholder="${esc(t("bk.notes.ph"))}">${esc(d.notes)}</textarea>
      </div>
    </div>
  </div>`;

  return {
    html,
    title: t("bk.title"),
    mount(screen, onCleanup) {
      const fields = { name: $("#f-name", screen), phone: $("#f-phone", screen), email: $("#f-email", screen) };
      const notes = $("#f-notes", screen);

      const stash = () => basket.set({
        name: fields.name.value.trim(),
        phone: fields.phone.value.trim(),
        email: fields.email.value.trim(),
        notes: notes.value.trim(),
      });
      Object.values(fields).forEach((f) => f.addEventListener("input", stash));
      notes.addEventListener("input", stash);
      fields.phone.addEventListener("blur", () => {
        if (validPhone(fields.phone.value)) fields.phone.value = prettyPhone(fields.phone.value);
        stash();
      });

      screen.addEventListener("click", (e) => {
        const b = e.target.closest("[data-toggle]");
        if (!b) return;
        const key = b.dataset.toggle;
        const next = !basket.get()[key];
        basket.set({ [key]: next });
        b.setAttribute("aria-checked", String(next));
        b.querySelector(".switch").setAttribute("aria-checked", String(next));
        haptic(5);
      });

      const clean = dock({
        ...basketLine(), cta: t("nav.continue"),
        onGo() {
          stash();
          const errs = [];
          if (!fields.name.value.trim()) errs.push(["name", t("bk.err.name")]);
          if (!validPhone(fields.phone.value)) errs.push(["phone", t("bk.err.phone")]);
          if (fields.email.value && !validEmail(fields.email.value)) errs.push(["email", t("bk.err.email")]);
          $$(".field", screen).forEach((f) => { f.classList.remove("bad"); f.querySelector(".err")?.remove(); });
          if (errs.length) {
            for (const [key, msg] of errs) {
              const wrap = fields[key].closest(".field");
              wrap.classList.add("bad");
              wrap.insertAdjacentHTML("beforeend", `<div class="err">${esc(msg)}</div>`);
            }
            fields[errs[0][0]].focus();
            haptic([12, 60, 12]);
            return;
          }
          go("#/book/health");
        },
      });
      onCleanup(clean);
    },
  };
}

/* ======================================================== 5 · health */
const HEALTH_FLAGS = ["pregnant", "allergies", "meds", "skin", "recent", "circulatory"];

export function bookStep5() {
  if (!basket.count()) return redirect("#/book");
  const d = basket.get();
  const prior = d.health || store.member().health || { flags: [], detail: "", consent: false };
  const flags = new Set(prior.flags || []);

  const html = `
  ${stepHead(5, t("bk.s5"), t("bk.health"), t("bk.health.sub"))}
  <div class="wrap" style="margin-top:18px">
    <div class="list">
      ${HEALTH_FLAGS.map((f) => `<button class="row" data-flag="${f}" aria-checked="${flags.has(f)}">
        <span class="check square" aria-checked="${flags.has(f)}">${icon("check")}</span>
        <span class="row-body"><span class="row-title">${esc(t(`bk.h.${f}`))}</span></span>
      </button>`).join("")}
    </div>

    <div class="card card-pad" id="detail-wrap" style="margin-top:12px;${flags.size ? "" : "display:none"}">
      <div class="field">
        <label for="f-detail">${esc(t("bk.h.detail"))}</label>
        <textarea id="f-detail">${esc(prior.detail || "")}</textarea>
      </div>
    </div>

    <button class="row card" data-none style="margin-top:12px;width:100%">
      <span class="row-ico">${icon("check")}</span>
      <span class="row-body"><span class="row-title">${esc(t("bk.h.none"))}</span></span>
    </button>

    <button class="row card" data-consent aria-checked="${prior.consent}" style="margin-top:12px;width:100%;align-items:flex-start">
      <span class="check square" aria-checked="${prior.consent}" style="margin-top:2px">${icon("check")}</span>
      <span class="row-body">
        <span class="row-title" style="font-weight:400;font-size:14.5px;line-height:1.5">${esc(t("bk.consent"))}</span>
        <span class="row-sub" style="color:var(--tint)">${esc(t("bk.consent.link"))}</span>
      </span>
    </button>
    <div id="consent-err"></div>
  </div>`;

  return {
    html,
    title: t("bk.title"),
    mount(screen, onCleanup) {
      const detailWrap = $("#detail-wrap", screen);
      const detail = $("#f-detail", screen);
      let consent = Boolean(prior.consent);

      const stash = () => basket.set({
        health: { flags: [...flags], detail: detail.value.trim(), consent },
      });

      screen.addEventListener("click", (e) => {
        const flagBtn = e.target.closest("[data-flag]");
        if (flagBtn) {
          const key = flagBtn.dataset.flag;
          flags.has(key) ? flags.delete(key) : flags.add(key);
          const on = flags.has(key);
          flagBtn.setAttribute("aria-checked", String(on));
          flagBtn.querySelector(".check").setAttribute("aria-checked", String(on));
          detailWrap.style.display = flags.size ? "" : "none";
          haptic(5);
          stash();
          return;
        }
        if (e.target.closest("[data-none]")) {
          flags.clear();
          $$("[data-flag]", screen).forEach((b) => {
            b.setAttribute("aria-checked", "false");
            b.querySelector(".check").setAttribute("aria-checked", "false");
          });
          detailWrap.style.display = "none";
          detail.value = "";
          haptic(6);
          stash();
          return;
        }
        const consentBtn = e.target.closest("[data-consent]");
        if (consentBtn) {
          // the link inside opens the form rather than toggling the box
          if (e.target.closest(".row-sub")) {
            e.preventDefault();
            consentSheet();
            return;
          }
          consent = !consent;
          consentBtn.setAttribute("aria-checked", String(consent));
          consentBtn.querySelector(".check").setAttribute("aria-checked", String(consent));
          $("#consent-err", screen).innerHTML = "";
          haptic(5);
          stash();
        }
      });
      detail.addEventListener("input", stash);

      const clean = dock({
        ...basketLine(), cta: t("nav.continue"),
        onGo() {
          stash();
          if (!consent) {
            $("#consent-err", screen).innerHTML =
              `<div class="note" style="margin-top:10px;background:rgba(194,43,43,.1)">${icon("warn")}<div>${esc(t("bk.err.consent"))}</div></div>`;
            haptic([12, 60, 12]);
            return;
          }
          go("#/book/confirm");
        },
      });
      onCleanup(clean);
    },
  };
}

function consentSheet() {
  sheet({
    title: t("bk.consent.link"),
    body: `<p class="lede" style="padding:4px 0 10px">${esc(t("bk.health.sub"))}</p>
      <div class="note plain">${icon("info")}<div>${esc(t("preview.note"))}</div></div>
      <p class="lede" style="padding:14px 0 4px">
        <a href="https://spasahel.com/consent-form/" target="_blank" rel="noopener" style="color:var(--tint)">
          spasahel.com/consent-form</a></p>`,
  });
}

/* ======================================================= 6 · confirm */
export function bookStep6() {
  if (!basket.count()) return redirect("#/book");
  const d = basket.get();
  if (d.slot == null || !d.day) return redirect("#/book/when");

  const when = atMinute(d.day, d.slot);
  const therapist = THERAPISTS.find((x) => x.id === d.therapist) || THERAPISTS[0];
  const items = basket.items ? basket.items() : d.items;
  const subtotal = basket.total();
  const rewardWallet = store.availableRewards();
  const rewardUsed = d.rewardId ? rewardWallet.find((w) => w.id === d.rewardId) : null;
  const rewardValue = rewardUsed ? (store.reward(rewardUsed.rewardId)?.value || 0) : 0;
  const promo = d.promo && PROMOS[d.promo] ? PROMOS[d.promo] : null;
  const promoValue = promo ? (promo.kind === "amount" ? promo.off : Math.round(subtotal * promo.off)) : 0;
  const grand = Math.max(0, subtotal - rewardValue - promoValue);
  const points = store.pointsFor(grand);
  const expired = basket.holdExpired();

  const lines = d.items.map((i) => {
    if (i.pkg) {
      const p = pkg(i.pkg);
      const o = p?.options?.[i.option];
      return { name: tr(p.name) + (o ? ` · ${tr(o.name)}` : ""), price: o?.price ?? p.price };
    }
    const s = service(i.id);
    return { name: tr(s.name), price: s.price };
  });

  const html = `
  ${stepHead(6, t("bk.s6"), t("bk.review"), "")}
  <div class="wrap" style="margin-top:18px">
    ${expired ? `<div class="note" style="background:rgba(194,43,43,.1);margin-bottom:12px">${icon("warn")}
      <div>${esc(t("bk.heldGone"))}</div></div>` : ""}

    <div class="card card-pad">
      <div class="flex" style="gap:13px;align-items:flex-start">
        <span class="avatar sun">${icon("calendar")}</span>
        <div class="grow">
          <div class="row-title" style="font-size:17px">${esc(dateLong(when))}</div>
          <div class="row-sub" style="font-size:14px">${esc(clock(d.slot))} · ${esc(duration(basket.minutes()))}</div>
          <div class="row-sub">${esc(t("ap.with", { n: tr(therapist.name) }))}</div>
        </div>
        <a class="btn sm btn-ghost" href="#/book/when">${esc(t("ap.reschedule"))}</a>
      </div>
    </div>

    <div class="card card-pad" style="margin-top:12px">
      <div class="receipt">
        ${lines.map((l) => `<div class="receipt-row"><span class="k">${esc(l.name)}</span>
          <span class="v">${esc(money(l.price))}</span></div>`).join("")}
        ${rewardValue ? `<div class="receipt-row credit"><span class="k">${esc(tr(store.reward(rewardUsed.rewardId).name))}</span>
          <span class="v">−${esc(money(rewardValue))}</span></div>` : ""}
        ${promoValue ? `<div class="receipt-row credit"><span class="k">${esc(d.promo)}</span>
          <span class="v">−${esc(money(promoValue))}</span></div>` : ""}
        <div class="receipt-row total"><span class="k">${esc(t("bk.total"))}</span>
          <span class="v">${esc(money(grand))}</span></div>
      </div>
      <div class="row-sub" style="margin-top:4px">${esc(tr({ en: "Prices before taxes", fr: "Prix avant taxes" }))}</div>
    </div>

    <div class="list" style="margin-top:12px">
      ${rewardWallet.length ? `<button class="row" data-reward>
        <span class="row-ico">${icon("ticket")}</span>
        <span class="row-body">
          <span class="row-title">${esc(t("bk.redeem"))}</span>
          <span class="row-sub">${esc(rewardUsed ? tr(store.reward(rewardUsed.rewardId).name) : t("you.wallet"))}</span>
        </span>
        <span class="row-chev">${icon("chevron")}</span>
      </button>` : ""}
      <div class="row">
        <span class="row-ico">${icon("wallet")}</span>
        <span class="row-body" style="display:flex;gap:8px;align-items:center">
          <input id="f-promo" placeholder="${esc(t("bk.promo"))}" value="${esc(d.promo || "")}"
            style="min-height:38px;padding:8px 12px;border-radius:10px;background:var(--fill);box-shadow:none;font-size:15px"
            autocapitalize="characters" autocomplete="off">
          <button class="btn sm btn-tint" data-promo style="flex:none">${esc(t("bk.promo.apply"))}</button>
        </span>
      </div>
      <div class="row">
        <span class="row-ico">${icon("sun")}</span>
        <span class="row-body"><span class="row-title">${esc(t("bk.earnNote", { n: points }))}</span>
          <span class="row-sub">${esc(tr(CLUB.name))}</span></span>
      </div>
    </div>
    <div id="promo-err"></div>

    <div class="stack" style="margin-top:14px">
      ${grand >= BOOKING.depositFrom ? `<div class="note">${icon("info")}<div>${esc(t("bk.deposit", { p: money(BOOKING.depositFrom) }))}</div></div>` : ""}
      <div class="note plain">${icon("clock")}<div>${esc(t("bk.policy", { n: BOOKING.cancelHours }))}</div></div>
      <div class="note plain">${icon("pin")}<div>${esc(t("bk.arrive"))}</div></div>
    </div>
  </div>`;

  return {
    html,
    title: t("bk.title"),
    mount(screen, onCleanup) {
      let busy = false;
      const clean = dock({
        line: esc(money(grand)),
        sub: esc(`${dateShort(when)} · ${clock(d.slot)}`),
        cta: expired ? t("nav.continue") : t("bk.confirm"),
        onGo: async () => {
          if (busy) return;
          if (expired) { go("#/book/when"); return; }
          busy = true;
          const booking = store.addBooking({
            when: when.getTime(),
            items: d.items,
            therapist: d.therapist,
            notes: d.notes,
            health: d.health,
            total: grand,
            minutes: basket.minutes(),
            rewardId: d.rewardId,
            promo: d.promo,
          });
          // only what was actually typed — an email left blank on this booking
          // must not wipe the one the profile already has
          const given = Object.fromEntries(Object.entries({ name: d.name, phone: d.phone, email: d.email })
            .filter(([, v]) => String(v || "").trim()));
          if (!store.isKnown() && given.name) store.join(given);
          else if (Object.keys(given).length) store.setProfile(given);
          basket.reset();
          haptic([10, 40, 16]);
          go(`#/booked/${booking.id}`);
        },
      });
      onCleanup(clean);

      $("[data-reward]", screen)?.addEventListener("click", () => rewardSheet());
      $("[data-promo]", screen)?.addEventListener("click", () => {
        const code = $("#f-promo", screen).value.trim().toUpperCase();
        const err = $("#promo-err", screen);
        if (!code) return;
        if (!PROMOS[code]) {
          err.innerHTML = `<div class="note" style="margin-top:10px;background:rgba(194,43,43,.1)">${icon("warn")}<div>${esc(t("bk.promo.bad"))}</div></div>`;
          haptic([12, 60, 12]);
          return;
        }
        basket.set({ promo: code });
        toast(code, "ticket");
        go("#/book/confirm");
      });
    },
  };
}

function rewardSheet() {
  const wallet = store.availableRewards();
  sheet({
    title: t("bk.redeem"),
    body: wallet.length
      ? `<div class="list" style="margin:6px 0 10px">${wallet.map((w) => {
          const r = store.reward(w.rewardId);
          return `<button class="row" data-use="${w.id}">
            <span class="row-ico">${icon("ticket")}</span>
            <span class="row-body"><span class="row-title">${esc(tr(r.name))}</span>
              <span class="row-sub">${esc(tr(r.note))}</span></span>
            <span class="row-val">−${esc(money(r.value))}</span>
          </button>`;
        }).join("")}
        <button class="row" data-use=""><span class="row-ico">${icon("close")}</span>
          <span class="row-body"><span class="row-title">${esc(t("nav.cancel"))}</span></span></button>
      </div>`
      : `<div class="empty">${icon("ticket")}<div>${esc(t("bk.redeem.none"))}</div></div>`,
    onMount(el, close) {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-use]");
        if (!b) return;
        basket.set({ rewardId: b.dataset.use || null });
        close();
        go("#/book/confirm");
      });
    },
  });
}

/* ======================================================== the landing */
export function bookedView({ id }) {
  const b = store.booking(id);
  if (!b) return redirect("#/you");
  const when = new Date(b.when);
  const therapist = THERAPISTS.find((x) => x.id === b.therapist) || THERAPISTS[0];
  const lines = store.expand(b.items).map((e) => tr((e.pkg || e.service).name));

  const html = `<div class="wrap" style="padding-top:18px">
    <div class="done-mark">
      <span class="halo"></span>
      <span class="disc">${icon("check")}</span>
    </div>
    <h1 class="title-xl center">${esc(t("bk.done"))}</h1>
    ${b.email || store.member().email
      ? `<p class="lede center" style="margin-top:10px">${esc(t("bk.done.sub", { e: store.member().email || "—" }))}</p>` : ""}

    <div class="center" style="margin-top:18px">
      <div class="row-sub" style="letter-spacing:.1em;text-transform:uppercase;font-size:11.5px">${esc(t("bk.ref"))}</div>
      <div class="ref-chip" style="margin-top:7px">${esc(b.ref)}</div>
    </div>

    <div class="card card-pad" style="margin-top:22px">
      <div class="receipt">
        <div class="receipt-row"><span class="k">${esc(t("bk.s3"))}</span>
          <span class="v">${esc(dateLong(when))}, ${esc(clock(when.getHours() * 60 + when.getMinutes()))}</span></div>
        <div class="receipt-row"><span class="k">${esc(t("bk.s1"))}</span><span class="v">${esc(lines.join(" · "))}</span></div>
        <div class="receipt-row"><span class="k">${esc(t("bk.s2"))}</span><span class="v">${esc(tr(therapist.name))}</span></div>
        <div class="receipt-row total"><span class="k">${esc(t("bk.total"))}</span><span class="v">${esc(money(b.total))}</span></div>
      </div>
    </div>

    <div class="note" style="margin-top:12px">${icon("sun")}<div>${esc(t("bk.earnNote", { n: b.points }))}</div></div>
    <div class="note plain" style="margin-top:10px">${icon("pin")}<div>${esc(t("bk.arrive"))}</div></div>

    <div class="stack" style="margin-top:20px">
      <button class="btn btn-ghost block" data-ics>${icon("calendar")}<span>${esc(t("bk.addCal"))}</span></button>
      <a class="btn btn-primary block" href="#/you">${esc(t("bk.viewAll"))}</a>
    </div>
    ${footer()}
  </div>`;

  return {
    html,
    title: t("bk.done"),
    mount(screen, onCleanup) {
      hideDock();
      $("[data-ics]", screen).addEventListener("click", () => downloadICS(b));
    },
  };
}

/** A real .ics, so "add to calendar" adds it to the calendar. */
export function downloadICS(b) {
  const start = new Date(b.when);
  const end = new Date(b.when + (b.minutes || 60) * 60000);
  const z = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = store.expand(b.items).map((e) => tr((e.pkg || e.service).name)).join(", ");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Spa Sahel//Preview//EN",
    "BEGIN:VEVENT",
    `UID:${b.ref}@spasahel.com`,
    `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(start)}`,
    `DTEND:${z(end)}`,
    `SUMMARY:Spa Sahel — ${lines}`,
    "LOCATION:1117 Saint-Catherine St W Suite 401\\, Montreal\\, QC H3B 1H9",
    `DESCRIPTION:${b.ref} · 514.844.5509`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `spa-sahel-${b.ref}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(t("bk.addCal"), "calendar");
}

/* --------------------------------------------------------------- helper */
function redirect(hash) {
  setTimeout(() => go(hash), 0);
  return { html: "", title: t("bk.title") };
}
