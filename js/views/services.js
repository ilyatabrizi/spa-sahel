// Services — the whole price list, searchable, and one screen per family.
//
// Their price list is nine tables and about ninety lines. Printed flat it is a
// wall; split into families it is nine short reads. The search runs across both
// languages at once, so a French speaker typing "sourcils" finds the threading
// and an English speaker typing "brow" finds the same row.

import { GROUPS, GROUP_NOTES, PACKAGES, SERVICES, inGroup } from "./../data.js";
import { money, t, tr } from "./../i18n.js";
import { icon } from "./../icons.js";
import { img } from "./../photos.js";
import { revealOn } from "./../motion.js";
import { refresh } from "./../router.js";
import { footer, groupTile, priceText, serviceRow } from "./../ui.js";
import { $, $$, esc } from "./../util.js";

/** Match across both languages, so either audience finds the same row. */
function matches(service, q) {
  if (!q) return true;
  const hay = [service.name.en, service.name.fr, service.blurb?.en, service.blurb?.fr,
    GROUPS.find((g) => g.id === service.group)?.name.en,
    GROUPS.find((g) => g.id === service.group)?.name.fr]
    .filter(Boolean).join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

function packageRow(p) {
  const from = p.options ? Math.min(...p.options.map((o) => o.price)) : p.price;
  return `<a class="row" href="#/package/${p.id}">
    <span class="row-ico">${icon("sparkle")}</span>
    <span class="row-body">
      <span class="row-title">${esc(tr(p.name))}</span>
      <span class="row-sub">${esc(tr(p.sub))}</span>
    </span>
    <span class="row-val">${p.options ? esc(t("svc.from", { p: money(from) })) : esc(money(p.price))}</span>
    <span class="row-chev">${icon("chevron")}</span>
  </a>`;
}

export function servicesIndex(_params, query) {
  const q = query.q || "";
  const hits = q ? SERVICES.filter((s) => !s.alias && matches(s, q)) : [];

  const html = `<div class="wrap">
    <h1 class="title-xl" style="padding-top:8px">${esc(t("svc.title"))}</h1>

    <div class="field" style="margin-top:18px">
      <div style="position:relative">
        <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ink-3);pointer-events:none">${icon("search")}</span>
        <input id="svc-q" type="search" inputmode="search" autocomplete="off"
          placeholder="${esc(t("svc.search"))}" value="${esc(q)}" style="padding-left:44px">
      </div>
    </div>

    <div id="svc-out">${q ? searchOut(hits) : browseOut()}</div>
    ${footer()}
  </div>`;

  return {
    html,
    title: t("svc.title"),
    mount(screen, onCleanup) {
      onCleanup(revealOn(screen));
      const input = $("#svc-q", screen);
      const out = $("#svc-out", screen);
      let timer = null;
      input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const term = input.value.trim();
          out.innerHTML = term ? searchOut(SERVICES.filter((s) => !s.alias && matches(s, term))) : browseOut();
          // keep the address bar honest without re-rendering the screen
          const base = "#/services";
          history.replaceState(history.state, "", term ? `${base}?q=${encodeURIComponent(term)}` : base);
          revealOn(out);
        }, 130);
      });
      onCleanup(() => clearTimeout(timer));
    },
  };
}

function browseOut() {
  return `
    <section style="margin-top:22px">
      <div class="grid-2">${GROUPS.map((g, i) => groupTile(g, inGroup(g.id).length, i)).join("")}</div>
    </section>
    <section>
      <div class="sec-head"><h2>${esc(t("svc.packages"))}</h2>
        <span class="sub">${esc(t("home.packages.sub"))}</span></div>
      <div class="list">${PACKAGES.map(packageRow).join("")}</div>
    </section>`;
}

function searchOut(hits) {
  if (!hits.length) {
    return `<div class="empty" style="margin-top:24px">${icon("search")}<div>${esc(t("svc.none"))}</div></div>`;
  }
  const byGroup = new Map();
  for (const s of hits) {
    if (!byGroup.has(s.group)) byGroup.set(s.group, []);
    byGroup.get(s.group).push(s);
  }
  return [...byGroup.entries()].map(([gid, list]) => {
    const g = GROUPS.find((x) => x.id === gid);
    return `<section>
      <div class="sec-head"><h2>${esc(tr(g.name))}</h2>
        <span class="sub">${esc(t("svc.count", { n: list.length }))}</span></div>
      <div class="list">${list.map((s) => `<a class="row" href="#/service/${s.id}">
        <span class="row-body">
          <span class="row-title">${esc(tr(s.name))}</span>
          <span class="row-sub">${esc(tr(g.short))}</span>
        </span>
        <span class="row-val">${esc(priceText(s))}</span>
        <span class="row-chev">${icon("chevron")}</span>
      </a>`).join("")}</div>
    </section>`;
  }).join("");
}

/* ------------------------------------------------------------ one family */
export function groupView({ id }) {
  const g = GROUPS.find((x) => x.id === id);
  if (!g) return { html: `<div class="wrap"><p class="empty">${esc(t("svc.none"))}</p></div>`, title: "" };
  const list = inGroup(g.id);
  const notes = GROUP_NOTES[g.id] || [];

  const html = `
  <div class="detail-hero" style="aspect-ratio:16/9;max-height:44dvh">
    ${img(g.photo, tr(g.name), { sizes: "100vw", eager: true })}
  </div>
  <div class="wrap" style="margin-top:-46px;position:relative">
    <div class="card card-pad">
      <h1 class="title-xl" style="font-size:clamp(26px,7.2vw,34px)">${esc(tr(g.name))}</h1>
      <p class="lede" style="margin-top:10px">${esc(tr(g.blurb))}</p>
      <div class="meta-row" style="margin-top:14px">
        <span class="meta">${icon("sparkle")}${esc(t("svc.count", { n: list.length }))}</span>
        ${list.some((s) => s.free) ? `<span class="meta sun">${icon("info")}${esc(t("svc.free"))}</span>` : ""}
      </div>
    </div>

    ${notes.map((n) => `<div class="note" style="margin-top:12px">${icon("info")}<div>${esc(tr(n))}</div></div>`).join("")}

    <section>
      <div class="list">${list.map((s) => `<a class="row" href="#/service/${s.id}">
        <span class="row-body">
          <span class="row-title">${esc(tr(s.name))}</span>
          <span class="row-sub">${esc(s.blurb ? tr(s.blurb) : "")}</span>
        </span>
        <span class="row-val">${esc(priceText(s))}${s.perSession ? `<br><small class="muted" style="font-size:11px">${esc(t("svc.perSession"))}</small>` : ""}</span>
        <span class="row-chev">${icon("chevron")}</span>
      </a>`).join("")}</div>
    </section>

    <section>
      <a class="btn btn-primary block" href="#/book?g=${g.id}">${icon("calendar")}<span>${esc(t("bk.title"))}</span></a>
    </section>
    ${footer()}
  </div>`;

  return { html, flush: true, title: tr(g.name), tone: "dark", mount: (s, c) => c(revealOn(s)) };
}
