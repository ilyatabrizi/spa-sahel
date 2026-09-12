// One treatment, and one package.
//
// The two honest cases live here. A treatment whose length Spa Sahel never
// published says so under an estimate rather than printing a number as fact,
// and a treatment they price at a consultation offers the free fifteen minutes
// instead of a Book button that would be a lie.

import { BOOKING, CLUB } from "./../config.js";
import { GROUPS, PACKAGES, SERVICES, group as groupOf, lengthIsOurs, lengthOf, pkg, service } from "./../data.js";
import { duration, money, t, tr } from "./../i18n.js";
import { icon } from "./../icons.js";
import { img } from "./../photos.js";
import { revealOn } from "./../motion.js";
import { go } from "./../router.js";
import * as basket from "./../basket.js";
import { durationText, footer, priceText, serviceTile, toast } from "./../ui.js";
import { $, esc, sum } from "./../util.js";

export function serviceView({ id }) {
  const s = service(id);
  if (!s) return { html: `<div class="wrap"><p class="empty">${esc(t("svc.none"))}</p></div>`, title: "" };
  const g = groupOf(s.group);
  const quoted = s.price == null;
  const siblings = SERVICES.filter((x) => x.group === s.group && x.id !== s.id && !x.alias).slice(0, 8);
  const points = s.price ? Math.round(s.price * CLUB.perDollar) : 0;

  const html = `
  ${s.photo ? `<div class="detail-hero" style="aspect-ratio:4/3;max-height:42dvh">
    ${img(s.photo, tr(s.name), { sizes: "100vw", eager: true })}</div>` : ""}

  <div class="wrap" ${s.photo ? 'style="margin-top:-46px;position:relative"' : 'style="padding-top:8px"'}>
    <div class="card card-pad">
      <a class="row-sub" href="#/group/${g.id}" style="color:var(--tint);font-weight:500">${esc(tr(g.name))}</a>
      <h1 class="title-xl" style="font-size:clamp(25px,7vw,33px);margin-top:6px">${esc(tr(s.name))}</h1>

      <div class="flex-between" style="margin-top:16px">
        <div class="price-badge">
          ${quoted ? `<span style="font-size:19px">${esc(t("svc.quoted"))}</span>`
                   : `<span>${esc(priceText(s))}</span>`}
          ${s.perSession ? `<small>${esc(t("svc.perSession"))}</small>` : ""}
        </div>
        <span class="meta">${icon("clock")}${esc(durationText(s))}</span>
      </div>

      ${s.blurb ? `<p class="lede" style="margin-top:14px">${esc(tr(s.blurb))}</p>` : ""}

      <div class="meta-row" style="margin-top:16px">
        ${lengthIsOurs(s) ? `<span class="meta">${icon("info")}${esc(t("svc.durNote"))}</span>` : ""}
        ${points ? `<span class="meta sun">${icon("sun")}${esc(t("svc.earn", { n: points }))}</span>` : ""}
        ${s.multi ? `<span class="meta">${icon("ticket")}${s.multi} ×</span>` : ""}
      </div>
    </div>

    ${quoted ? `<div class="note" style="margin-top:12px">${icon("info")}<div>${esc(t("svc.consultNote"))}</div></div>` : ""}

    <section>
      ${quoted
        ? `<a class="btn btn-primary block" href="#/book?s=${s.group === "electro" ? "e-consult" : "l-consult"}">
             ${icon("calendar")}<span>${esc(t("svc.consultFirst"))}</span></a>`
        : `<div class="flex" style="gap:10px">
             <button class="btn btn-ghost" data-add style="flex:none">${icon("plus")}<span>${esc(t("svc.add"))}</span></button>
             <a class="btn btn-primary grow" href="#/book?s=${s.id}">${icon("calendar")}<span>${esc(t("svc.book"))}</span></a>
           </div>`}
    </section>

    ${siblings.length ? `<section>
      <div class="sec-head"><h2>${esc(t("svc.alsoIn"))} ${esc(tr(g.short))}</h2></div>
      <div class="rail">${siblings.map((x, i) => serviceTile(x, { delay: i })).join("")}</div>
    </section>` : ""}

    ${footer()}
  </div>`;

  return {
    html,
    flush: Boolean(s.photo),
    title: tr(s.name),
    tone: s.photo ? "dark" : "light",
    mount(screen, onCleanup) {
      onCleanup(revealOn(screen));
      // Add is a toggle, and it says what actually happened. It used to answer an
      // already-added treatment with "stack up to 4", which was not the reason.
      const add = $("[data-add]", screen);
      const paintAdd = () => {
        const on = basket.has(s.id);
        add.setAttribute("aria-pressed", String(on));
        add.innerHTML = icon(on ? "check" : "plus") + `<span>${esc(t(on ? "svc.added" : "svc.add"))}</span>`;
      };
      if (add) {
        paintAdd();
        add.addEventListener("click", () => {
          if (basket.has(s.id)) {
            basket.remove(s.id);
            toast(`${tr(s.name)} · ${t("svc.removed")}`, "close");
          } else if (basket.count() >= BOOKING.maxServices) {
            toast(t("bk.pick.sub", { n: BOOKING.maxServices }), "info");
          } else {
            basket.add(s.id);
            toast(`${tr(s.name)} · ${t("svc.added")}`);
          }
          paintAdd();
        });
      }
    },
  };
}

/* ------------------------------------------------------------- a package */
export function packageView({ id }) {
  const p = pkg(id);
  if (!p) return { html: `<div class="wrap"><p class="empty">${esc(t("svc.none"))}</p></div>`, title: "" };

  // What the same treatments would cost booked one at a time.
  const listed = p.items
    ? sum(p.items, (i) => (service(i.of)?.price || 0) * (i.qty || 1))
    : 0;
  const saving = p.price && listed > p.price ? listed - p.price : 0;
  const minutes = p.dur ?? (p.items ? sum(p.items, (i) => lengthOf(service(i.of)) * (i.qty || 1)) : 0);

  const html = `
  <div class="detail-hero" style="aspect-ratio:16/10;max-height:42dvh">
    ${img(p.photo, tr(p.name), { sizes: "100vw", eager: true })}
  </div>
  <div class="wrap" style="margin-top:-46px;position:relative">
    <div class="card card-pad">
      <div class="row-sub" style="color:var(--tint);font-weight:500;letter-spacing:.1em;text-transform:uppercase;font-size:11.5px">
        ${esc(t("svc.packages"))}</div>
      <h1 class="title-xl" style="font-size:clamp(25px,7vw,33px);margin-top:7px">${esc(tr(p.name))}</h1>
      <p class="row-sub" style="font-size:14.5px;margin-top:4px">${esc(tr(p.sub))}</p>

      ${p.price ? `<div class="flex-between" style="margin-top:16px">
        <div class="price-badge"><span>${esc(money(p.price))}</span></div>
        ${minutes ? `<span class="meta">${icon("clock")}${esc(duration(minutes))}</span>` : ""}
      </div>` : ""}

      ${p.blurb ? `<p class="lede" style="margin-top:14px">${esc(tr(p.blurb))}</p>` : ""}

      ${saving ? `<div class="meta-row" style="margin-top:14px">
        <span class="meta">${esc(t("svc.package.value", { p: money(listed) }))}</span>
        <span class="meta sun">${icon("sun")}${esc(t("svc.package.save", { p: money(saving) }))}</span>
      </div>` : ""}
    </div>

    ${p.items ? `<section>
      <div class="sec-head"><h2>${esc(t("svc.includes"))}</h2></div>
      <div class="list">${p.items.map((i) => {
        const s = service(i.of);
        if (!s) return "";
        return `<a class="row" href="#/service/${s.id}">
          <span class="row-ico">${icon("check")}</span>
          <span class="row-body">
            <span class="row-title">${esc(tr(s.name))}</span>
            <span class="row-sub">${esc(durationText(s))}${i.qty > 1 ? ` · ${i.qty} ×` : ""}</span>
          </span>
          <span class="row-val">${esc(priceText(s))}</span>
          <span class="row-chev">${icon("chevron")}</span>
        </a>`;
      }).join("")}</div>
    </section>` : ""}

    ${p.options ? `<section>
      <div class="sec-head"><h2>${esc(t("svc.package.choose"))}</h2></div>
      <div class="list">${p.options.map((o, i) => `<button class="row" data-opt="${i}">
        <span class="row-ico">${icon("nails")}</span>
        <span class="row-body">
          <span class="row-title">${esc(tr(o.name))}</span>
          <span class="row-sub">${esc(t("svc.approx", { n: o.est }))}${o.before ? ` · ${esc(t("svc.beforeTwo"))}` : ""}</span>
        </span>
        <span class="row-val">${esc(money(o.price))}</span>
        <span class="row-chev">${icon("chevron")}</span>
      </button>`).join("")}</div>
    </section>` : `<section>
      <a class="btn btn-primary block" href="#/book?p=${p.id}">${icon("calendar")}<span>${esc(t("svc.package.book"))}</span></a>
    </section>`}

    ${footer()}
  </div>`;

  return {
    html,
    flush: true,
    title: tr(p.name),
    tone: "dark",
    mount(screen, onCleanup) {
      onCleanup(revealOn(screen));
      screen.querySelectorAll("[data-opt]").forEach((btn) => {
        btn.addEventListener("click", () => go(`#/book?p=${p.id}&o=${btn.dataset.opt}`));
      });
    },
  };
}
