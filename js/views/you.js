// You — the member record, and everything the club owes them.
//
// Two states: a guest who has never given a name, and a member. The guest
// screen asks for one thing and explains what it buys; the member screen is
// the card, the ring, what is booked, what has been redeemed, and the
// settings. Nothing here pretends to be a server: it says so at the bottom,
// and "erase" really erases.

import { BUSINESS, CLUB, REWARDS, THERAPISTS } from "./../config.js";
import { clock, dateLong, dateShort, duration, greeting, money, t, tr } from "./../i18n.js";
import { icon } from "./../icons.js";
import { revealOn } from "./../motion.js";
import { canPrompt, isIOS, promptInstall, standalone } from "./../install.js";
import { go, refresh } from "./../router.js";
import { downloadICS } from "./book.js";
import { setTheme, themePref } from "./../theme.js";
import * as store from "./../store.js";
import {
  clubDisclaimer, confirmSheet, emptyState, footer, ringDefs, sheet, toast,
} from "./../ui.js";
import { $, $$, esc, firstName, initials, prettyPhone, validPhone } from "./../util.js";

/* ------------------------------------------------------------- the card */
function memberCard() {
  const m = store.member();
  const tier = store.tierOf();
  const next = store.nextTier();
  const pct = store.tierProgress();
  const C = 2 * Math.PI * 49;

  return `${ringDefs}
  <div class="card card-pad reveal">
    <div class="flex" style="gap:18px;align-items:center">
      <div class="ring" style="--dash:${C.toFixed(1)};--off:${(C * (1 - pct)).toFixed(1)}">
        <svg viewBox="0 0 116 116" aria-hidden="true">
          <circle class="track" cx="58" cy="58" r="49"></circle>
          <circle class="val" cx="58" cy="58" r="49"></circle>
        </svg>
        <div class="ring-mid">
          <b class="tabular">${m.points.toLocaleString()}</b>
          <small>${esc(t("you.points"))}</small>
        </div>
      </div>
      <div class="grow">
        <div class="title-lg" style="font-size:21px">${esc(m.name)}</div>
        <div class="row-sub" style="margin-top:3px">${esc(tr(tier.name))} · ${esc(t("you.member", {
          d: m.joined ? dateShort(m.joined) + " " + new Date(m.joined).getFullYear() : "—" }))}</div>
        <div class="meta-row" style="margin-top:10px">
          <span class="meta">${icon("check")}${esc(t("you.visits", { n: store.visitCount() }))}</span>
          <span class="meta">${esc(t("you.spent", { p: money(store.spentTotal()) }))}</span>
        </div>
      </div>
    </div>
    <div class="club-bar" style="background:var(--fill-2);margin-top:16px">
      <i style="width:${Math.round(pct * 100)}%;background:var(--sunrise)"></i></div>
    <div class="row-sub" style="margin-top:8px">${esc(next
      ? t("you.toNext", { n: (next.at - m.lifetime).toLocaleString(), t: tr(next.name) })
      : t("you.topTier"))}</div>
  </div>

  <div class="card card-pad reveal" style="margin-top:12px">
    <div class="sec-head" style="margin-bottom:10px"><h2>${esc(t("you.perks"))}</h2>
      <span class="sub">${esc(tr(tier.name))}</span></div>
    <ul class="stack-sm">
      ${tr(tier.perks).map((p) => `<li class="flex" style="gap:9px;font-size:14.5px">
        <span style="color:var(--tint);flex:none">${icon("check")}</span><span>${esc(p)}</span></li>`).join("")}
      <li class="flex" style="gap:9px;font-size:14.5px">
        <span style="color:var(--tint);flex:none">${icon("gift")}</span><span>${esc(tr(CLUB.birthdayReward))}</span></li>
    </ul>
  </div>`;
}

/* ------------------------------------------------------ appointment rows */
function apptRow(b, { past = false } = {}) {
  const when = new Date(b.when);
  const names = store.expand(b.items).map((e) => tr((e.pkg || e.service).name)).join(" · ");
  const state = b.status === "cancelled" ? t("ap.cancelled")
    : b.status === "completed" ? t("ap.completed") : t("ap.confirmed");
  return `<a class="row" href="#/appointment/${b.id}">
    <span class="row-ico" ${b.status === "cancelled" ? 'style="opacity:.5"' : ""}>${icon(past ? "check" : "calendar")}</span>
    <span class="row-body">
      <span class="row-title">${esc(dateLong(when))} · ${esc(clock(when.getHours() * 60 + when.getMinutes()))}</span>
      <span class="row-sub">${esc(names)}</span>
    </span>
    <span class="row-val" style="text-align:right">
      ${esc(money(b.total))}<br><small class="muted" style="font-size:11px">${esc(state)}</small>
    </span>
    <span class="row-chev">${icon("chevron")}</span>
  </a>`;
}

/* --------------------------------------------------------------- guest */
function guestScreen() {
  return `<div class="wrap">
    <h1 class="title-xl" style="padding-top:8px">${esc(t("you.title"))}</h1>

    <section class="reveal" style="margin-top:22px">
      <div class="club">
        <div class="club-tier">${icon("sun")}<span>${esc(tr(CLUB.name))}</span></div>
        <div class="club-name" style="margin-top:14px">${esc(t("you.signin"))}</div>
        <p style="margin-top:10px;font-size:14.5px;line-height:1.6;opacity:.88">${esc(t("you.signin.sub"))}</p>
        <div class="club-pts" style="margin-top:14px">
          <b class="tabular">+${CLUB.welcomeBonus}</b><span>${esc(t("you.points"))}</span>
        </div>
        <button class="btn block" data-start style="margin-top:16px;background:#fff;color:#14161A">
          ${esc(t("you.start"))}</button>
      </div>
      ${clubDisclaimer()}
    </section>

    <section class="reveal">
      <div class="sec-head"><h2>${esc(t("you.rewards"))}</h2>
        <span class="sub">${esc(t("you.rewards.sub"))}</span></div>
      <div class="list">${REWARDS.map((r) => `<div class="row">
        <span class="row-ico">${icon("ticket")}</span>
        <span class="row-body"><span class="row-title">${esc(tr(r.name))}</span>
          <span class="row-sub">${esc(tr(r.note))}</span></span>
        <span class="row-val">${r.cost}</span>
      </div>`).join("")}</div>
    </section>

    ${settingsSection()}
    ${footer()}
  </div>`;
}

/* -------------------------------------------------------------- member */
function memberScreen() {
  const m = store.member();
  const up = store.upcoming();
  const history = store.past().slice(0, 8);
  const wallet = store.availableRewards();

  return `<div class="wrap">
    <h1 class="title-xl" style="padding-top:8px">${esc(greeting())},<br>${esc(firstName(m.name))}</h1>

    <section style="margin-top:18px">${memberCard()}</section>

    <section class="reveal">
      <div class="sec-head"><h2>${esc(t("you.upcoming"))}</h2>
        <a class="more" href="#/book">${esc(t("home.quick.book"))}</a></div>
      <div class="list">${up.length ? up.map((b) => apptRow(b)).join("")
        : emptyState("calendar", t("you.noUpcoming"))}</div>
    </section>

    ${wallet.length ? `<section class="reveal">
      <div class="sec-head"><h2>${esc(t("you.wallet"))}</h2></div>
      <div class="list">${wallet.map((w) => {
        const r = store.reward(w.rewardId);
        return `<div class="row">
          <span class="row-ico" style="background:var(--sunrise);color:#2A1700">${icon("ticket")}</span>
          <span class="row-body"><span class="row-title">${esc(tr(r.name))}</span>
            <span class="row-sub">${esc(t("you.redeemed"))}</span></span>
          <span class="row-val">−${esc(money(r.value))}</span>
        </div>`;
      }).join("")}</div>
    </section>` : ""}

    <section class="reveal">
      <div class="sec-head"><h2>${esc(t("you.rewards"))}</h2>
        <span class="sub">${m.points.toLocaleString()} ${esc(t("you.points"))}</span></div>
      <div class="list">${REWARDS.map((r) => {
        const can = m.points >= r.cost;
        return `<button class="row" data-redeem="${r.id}" ${can ? "" : "disabled style=opacity:.55"}>
          <span class="row-ico">${icon("ticket")}</span>
          <span class="row-body"><span class="row-title">${esc(tr(r.name))}</span>
            <span class="row-sub">${esc(can ? tr(r.note) : t("you.needMore", { n: (r.cost - m.points).toLocaleString() }))}</span></span>
          <span class="row-val">${r.cost}</span>
          ${can ? `<span class="btn sm btn-tint" style="pointer-events:none">${esc(t("you.redeem"))}</span>` : ""}
        </button>`;
      }).join("")}</div>
      ${clubDisclaimer()}
    </section>

    <section class="reveal">
      <div class="sec-head"><h2>${esc(t("you.refer"))}</h2></div>
      <div class="card card-pad">
        <p class="lede" style="font-size:14.5px">${esc(t("you.refer.sub", { n: CLUB.referralBonus }))}</p>
        <div class="flex" style="margin-top:14px;gap:10px">
          <div class="ref-chip grow" style="justify-content:center">${esc(m.referral || "—")}</div>
          <button class="btn btn-ghost" data-copy="${esc(m.referral || "")}">${icon("copy")}<span>${esc(t("you.copy"))}</span></button>
        </div>
      </div>
    </section>

    <section class="reveal">
      <div class="sec-head"><h2>${esc(t("you.past"))}</h2></div>
      <div class="list">${history.length ? history.map((b) => apptRow(b, { past: true })).join("")
        : emptyState("clock", t("you.noPast"))}</div>
    </section>

    <section class="reveal">
      <div class="sec-head"><h2>${esc(t("you.prefs"))}</h2></div>
      <div class="list">
        <button class="row" data-pref="therapist">
          <span class="row-ico">${icon("users")}</span>
          <span class="row-body"><span class="row-title">${esc(t("you.pref.therapist"))}</span></span>
          <span class="row-val">${esc(tr((THERAPISTS.find((x) => x.id === m.prefs.therapist) || THERAPISTS[0]).name))}</span>
          <span class="row-chev">${icon("chevron")}</span>
        </button>
        <div class="row" style="display:block">
          <div class="row-title" style="margin-bottom:9px">${esc(t("you.pref.pressure"))}</div>
          <div class="seg" data-seg="pressure" style="--seg-n:3;--seg-i:${["light", "medium", "firm"].indexOf(m.prefs.pressure)}">
            ${["light", "medium", "firm"].map((k) => `<button data-v="${k}"
              aria-selected="${m.prefs.pressure === k}">${esc(t(`you.pref.pressure.${k}`))}</button>`).join("")}
          </div>
        </div>
        <div class="row" style="display:block">
          <div class="row-title" style="margin-bottom:9px">${esc(t("you.pref.room"))}</div>
          <div class="seg" data-seg="room" style="--seg-n:2;--seg-i:${["quiet", "music"].indexOf(m.prefs.room)}">
            ${["quiet", "music"].map((k) => `<button data-v="${k}"
              aria-selected="${m.prefs.room === k}">${esc(t(`you.pref.room.${k}`))}</button>`).join("")}
          </div>
        </div>
      </div>
    </section>

    ${settingsSection()}

    <section class="reveal">
      <button class="btn btn-danger block" data-forget>${icon("trash")}<span>${esc(t("you.forget"))}</span></button>
    </section>
    ${footer()}
  </div>`;
}

function settingsSection() {
  const pref = themePref();
  const idx = ["system", "light", "dark"].indexOf(pref);
  return `<section class="reveal">
    <div class="sec-head"><h2>${esc(t("you.settings"))}</h2></div>
    <div class="list">
      <div class="row" style="display:block">
        <div class="row-title" style="margin-bottom:9px">${esc(t("you.appearance"))}</div>
        <div class="seg" data-seg="theme" style="--seg-n:3;--seg-i:${idx < 0 ? 0 : idx}">
          ${["system", "light", "dark"].map((k) => `<button data-v="${k}"
            aria-selected="${pref === k}">${esc(t(`you.theme.${k}`))}</button>`).join("")}
        </div>
      </div>
      <a class="row" href="#/gift">
        <span class="row-ico">${icon("gift")}</span>
        <span class="row-body"><span class="row-title">${esc(t("you.gift"))}</span>
          <span class="row-sub">${esc(t("you.gift.sub"))}</span></span>
        <span class="row-chev">${icon("chevron")}</span>
      </a>
      <a class="row" href="tel:${BUSINESS.phoneHref}">
        <span class="row-ico">${icon("phone")}</span>
        <span class="row-body"><span class="row-title">${esc(t("you.contact"))}</span>
          <span class="row-sub">${esc(BUSINESS.phone)} · ${esc(BUSINESS.email)}</span></span>
        <span class="row-chev">${icon("external")}</span>
      </a>
      ${standalone() ? "" : `<button class="row" data-install>
        <span class="row-ico">${icon("device")}</span>
        <span class="row-body"><span class="row-title">${esc(t("home.install"))}</span></span>
        <span class="row-chev">${icon("chevron")}</span>
      </button>`}
      ${store.visitCount() ? "" : `<button class="row" data-demo>
        <span class="row-ico">${icon("refresh")}</span>
        <span class="row-body"><span class="row-title">${esc(t("you.demo"))}</span>
          <span class="row-sub">${esc(t("you.demo.sub"))}</span></span>
        <span class="row-chev">${icon("chevron")}</span>
      </button>`}
    </div>
  </section>`;
}

/* --------------------------------------------------------------- view */
export default function you() {
  const known = store.isKnown();
  return {
    html: known ? memberScreen() : guestScreen(),
    title: known ? store.member().name : t("you.title"),
    mount(screen, onCleanup) {
      onCleanup(revealOn(screen));
      onCleanup(store.subscribe(() => {}));

      $("[data-start]", screen)?.addEventListener("click", () => joinSheet());
      $("[data-demo]", screen)?.addEventListener("click", () => {
        const n = store.seedHistory();
        toast(t("you.visits", { n }), "refresh");
        refresh();
      });
      $("[data-forget]", screen)?.addEventListener("click", async () => {
        const yes = await confirmSheet({
          title: t("you.forget"),
          body: t("you.forget.ask"),
          confirm: t("you.forget.do"),
          danger: true,
        });
        if (yes) { store.forget(); toast(t("you.forget.do"), "trash"); refresh(); }
      });
      $("[data-install]", screen)?.addEventListener("click", async () => {
        if (canPrompt()) { if (await promptInstall()) toast(t("home.install.do")); return; }
        sheet({ title: t("home.install"), body: `<p class="lede" style="padding:4px 0 16px">${esc(t("home.install.ios"))}</p>` });
      });
      $("[data-copy]", screen)?.addEventListener("click", async (e) => {
        const code = e.currentTarget.dataset.copy;
        try { await navigator.clipboard.writeText(code); toast(t("you.copied"), "copy"); }
        catch { toast(code, "copy"); }
      });
      $("[data-pref='therapist']", screen)?.addEventListener("click", () => therapistSheet());

      screen.addEventListener("click", (e) => {
        const btn = e.target.closest(".seg [data-v]");
        if (btn) {
          const seg = btn.closest(".seg");
          const kind = seg.dataset.seg;
          const value = btn.dataset.v;
          const buttons = $$("[data-v]", seg);
          seg.style.setProperty("--seg-i", buttons.indexOf(btn));
          buttons.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
          if (kind === "theme") setTheme(value);
          else store.setPrefs({ [kind]: value });
          return;
        }
        const redeem = e.target.closest("[data-redeem]");
        if (redeem && !redeem.disabled) {
          const r = store.reward(redeem.dataset.redeem);
          confirmSheet({
            title: tr(r.name),
            body: `${tr(r.note)} — ${r.cost} ${t("you.points")}`,
            confirm: t("you.redeem"),
          }).then((yes) => {
            if (!yes) return;
            if (store.redeem(r.id)) { toast(t("you.redeemed"), "ticket"); refresh(); }
          });
        }
      });
    },
  };
}

/* -------------------------------------------------------------- sheets */
function joinSheet() {
  sheet({
    title: t("you.name.ask"),
    body: `<div class="field" style="margin-top:6px">
        <label for="j-name">${esc(t("bk.name"))}</label>
        <input id="j-name" autocomplete="name" placeholder="${esc(t("bk.name"))}">
      </div>
      <div class="field">
        <label for="j-phone">${esc(t("bk.phone"))}</label>
        <input id="j-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(514) 000-0000">
      </div>
      <div class="field">
        <label for="j-email">${esc(t("bk.email"))}</label>
        <input id="j-email" type="email" inputmode="email" autocomplete="email" placeholder="nom@exemple.com">
      </div>
      <div class="field">
        <label for="j-bday">${esc(t("you.birthday"))}</label>
        <input id="j-bday" type="date">
        <div class="hint">${esc(t("you.birthday.why"))}</div>
      </div>
      <div style="height:10px"></div>`,
    foot: `<button class="btn btn-primary block" data-go>${esc(t("you.start"))}</button>`,
    onMount(el, close) {
      const go2 = () => {
        const name = $("#j-name", el).value.trim();
        if (!name) { $("#j-name", el).focus(); return; }
        const bday = $("#j-bday", el).value;
        store.join({
          name,
          phone: $("#j-phone", el).value.trim(),
          email: $("#j-email", el).value.trim(),
          birthday: bday ? bday.slice(5) : "",
        });
        close();
        toast(`+${CLUB.welcomeBonus} ${t("you.points")}`, "sun");
        refresh();
      };
      el.querySelector("[data-go]").addEventListener("click", go2);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") go2(); });
    },
  });
}

function therapistSheet() {
  sheet({
    title: t("you.pref.therapist"),
    body: `<div class="list" style="margin:6px 0 10px">${THERAPISTS.map((p) => `<button class="row" data-t="${p.id}">
      <span class="avatar ${p.id === "any" ? "sun" : ""}" style="width:34px;height:34px;font-size:13px">
        ${p.id === "any" ? icon("users") : esc(p.initials)}</span>
      <span class="row-body"><span class="row-title">${esc(tr(p.name))}</span>
        <span class="row-sub">${esc(tr(p.role))}</span></span>
      ${store.member().prefs.therapist === p.id ? `<span class="check" aria-checked="true">${icon("check")}</span>` : ""}
    </button>`).join("")}</div>`,
    onMount(el, close) {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-t]");
        if (!b) return;
        store.setPrefs({ therapist: b.dataset.t });
        close();
        refresh();
      });
    },
  });
}

/* ------------------------------------------------------ one appointment */
export function appointmentView({ id }) {
  const b = store.booking(id);
  if (!b) return { html: `<div class="wrap">${emptyState("calendar", t("you.noUpcoming"))}</div>`, title: "" };
  const when = new Date(b.when);
  const therapist = THERAPISTS.find((x) => x.id === b.therapist) || THERAPISTS[0];
  const items = store.expand(b.items);
  const soon = b.when - Date.now();
  const canCancel = b.status === "confirmed" && soon > 0;
  const free = soon > 24 * 3600000;

  const html = `<div class="wrap" style="padding-top:8px">
    <div class="row-sub" style="letter-spacing:.1em;text-transform:uppercase;font-size:11.5px;color:var(--tint)">
      ${esc(b.status === "cancelled" ? t("ap.cancelled") : b.status === "completed" ? t("ap.completed") : t("ap.confirmed"))}</div>
    <h1 class="title-xl" style="margin-top:6px">${esc(dateLong(when))}</h1>
    <p class="lede" style="margin-top:8px">${esc(clock(when.getHours() * 60 + when.getMinutes()))}
      · ${esc(duration(b.minutes || 60))} · ${esc(t("ap.with", { n: tr(therapist.name) }))}</p>

    <div class="card card-pad" style="margin-top:20px">
      <div class="receipt">
        ${items.map((e) => {
          const s = e.pkg || e.service;
          const price = e.pkg ? (e.option?.price ?? e.pkg.price) : e.service.price;
          return `<div class="receipt-row"><span class="k">${esc(tr(s.name))}</span>
            <span class="v">${esc(money(price || 0))}</span></div>`;
        }).join("")}
        <div class="receipt-row total"><span class="k">${esc(t("bk.total"))}</span>
          <span class="v">${esc(money(b.total))}</span></div>
      </div>
    </div>

    <div class="list" style="margin-top:12px">
      <div class="row"><span class="row-ico">${icon("ticket")}</span>
        <span class="row-body"><span class="row-title">${esc(t("bk.ref"))}</span></span>
        <span class="row-val">${esc(b.ref)}</span></div>
      <div class="row"><span class="row-ico">${icon("sun")}</span>
        <span class="row-body"><span class="row-title">${esc(b.status === "completed"
          ? t("ap.earned", { n: b.points }) : t("bk.earnNote", { n: b.points }))}</span></span></div>
      ${b.notes ? `<div class="row"><span class="row-ico">${icon("edit")}</span>
        <span class="row-body"><span class="row-title" style="font-weight:400;font-size:14.5px">${esc(b.notes)}</span></span></div>` : ""}
      <a class="row" href="${BUSINESS.maps}" target="_blank" rel="noopener">
        <span class="row-ico">${icon("pin")}</span>
        <span class="row-body"><span class="row-title">${esc(BUSINESS.street)}</span>
          <span class="row-sub">${esc(BUSINESS.city)}</span></span>
        <span class="row-chev">${icon("external")}</span></a>
    </div>

    ${canCancel ? `<div class="stack" style="margin-top:18px">
      <button class="btn btn-ghost block" data-ics>${icon("calendar")}<span>${esc(t("bk.addCal"))}</span></button>
      <a class="btn btn-ghost block" href="#/book/when">${icon("clock")}<span>${esc(t("ap.reschedule"))}</span></a>
      <button class="btn btn-danger block" data-cancel>${esc(t("ap.cancel"))}</button>
      <p class="row-sub center">${esc(t("bk.policy", { n: 24 }))}</p>
    </div>` : ""}
    ${footer()}
  </div>`;

  return {
    html,
    title: dateShort(when),
    mount(screen) {
      $("[data-cancel]", screen)?.addEventListener("click", async () => {
        if (!free) {
          sheet({ title: t("ap.cancel"), body: `<p class="lede" style="padding:4px 0 14px">${esc(t("ap.cancel.late", { n: 24 }))}</p>`,
            foot: `<a class="btn btn-primary block" href="tel:${BUSINESS.phoneHref}">${esc(BUSINESS.phone)}</a>` });
          return;
        }
        const yes = await confirmSheet({
          title: t("ap.cancel"), body: t("ap.cancel.ask", { n: 24 }),
          confirm: t("ap.cancel"), cancel: t("ap.keep"), danger: true,
        });
        if (yes) { store.cancelBooking(b.id); toast(t("ap.cancelled"), "close"); go("#/you"); }
      });
      $("[data-ics]", screen)?.addEventListener("click", () => downloadICS(b));
    },
  };
}

/* ----------------------------------------------------------- gift cards */
export function giftView() {
  const html = `<div class="wrap" style="padding-top:8px">
    <h1 class="title-xl">${esc(t("gift.title"))}</h1>
    <div class="card card-pad" style="margin-top:20px">
      <div class="avatar sun" style="width:54px;height:54px">${icon("gift")}</div>
      <p class="lede" style="margin-top:14px">${esc(t("gift.body"))}</p>
      <a class="btn btn-primary block" style="margin-top:18px" href="tel:${BUSINESS.phoneHref}">
        ${icon("phone")}<span>${esc(t("gift.call"))}</span></a>
      <a class="btn btn-ghost block" style="margin-top:10px" href="https://spasahel.com/gift-card/" target="_blank" rel="noopener">
        ${icon("external")}<span>spasahel.com</span></a>
    </div>
    ${footer()}
  </div>`;
  return { html, title: t("gift.title") };
}
