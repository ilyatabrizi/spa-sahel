// Home.
//
// Their own room at the top — the treatment suite with the jetty mural, which
// is the one photograph in the set that could not be anybody else's — then the
// four things a guest actually opens the app to do, then the catalogue, then
// the words from their About page in their own wording.
//
// The door badge is computed, not written: it reads the opening hours in
// config and says what is true at this minute, in either language.

import { BUSINESS, CLUB, HOURS } from "./../config.js";
import { GROUPS, PACKAGES, featured, inGroup } from "./../data.js";
import { clock, dateLong, dayName, greeting, money, t, tr } from "./../i18n.js";
import { icon } from "./../icons.js";
import { img } from "./../photos.js";
import { logoSVG } from "./../brand.js";
import { canPrompt, isIOS, promptInstall, standalone } from "./../install.js";
import { doorState } from "./../schedule.js";
import { revealOn } from "./../motion.js";
import { go } from "./../router.js";
import * as store from "./../store.js";
import { clubDisclaimer, footer, groupTile, priceText, serviceTile, sheet, toast } from "./../ui.js";
import { $, $$, esc, firstName } from "./../util.js";

function doorLine() {
  const d = doorState();
  if (d.open) return { on: true, text: t("home.open.until", { t: clock(d.until) }) };
  if (d.soon) return { on: false, text: t("home.open.soon", { t: clock(d.from) }) };
  if (d.nextDay) {
    return { on: false, text: t("home.open.tomorrow", { d: dayName(d.nextDay.getDay()), t: clock(d.from) }) };
  }
  return { on: false, text: t("home.open.closed") };
}

function nextVisitCard() {
  const b = store.nextVisit();
  if (!b) return "";
  const when = new Date(b.when);
  const items = store.expand(b.items);
  const names = items.map((e) => tr((e.pkg || e.service).name)).join(" · ");
  return `<section class="reveal">
    <div class="sec-head"><h2>${esc(t("home.next.title"))}</h2></div>
    <a class="card card-glow" href="#/appointment/${b.id}" style="display:block">
      <div class="card-pad flex" style="gap:14px">
        <div class="avatar sun" aria-hidden="true">${icon("calendar")}</div>
        <div class="grow">
          <div class="row-title">${esc(dateLong(when))} · ${esc(clock(when.getHours() * 60 + when.getMinutes()))}</div>
          <div class="row-sub">${esc(names)}</div>
        </div>
        <span class="row-chev">${icon("chevron")}</span>
      </div>
    </a>
  </section>`;
}

function clubCard() {
  const m = store.member();
  const tier = store.tierOf();
  const next = store.nextTier();
  const pct = Math.round(store.tierProgress() * 100);
  if (!store.isKnown()) {
    return `<section class="reveal">
      <div class="club">
        <div class="club-top">
          <div>
            <div class="club-tier">${icon("sun")}<span>${esc(tr(CLUB.name))}</span></div>
            <div class="club-name" style="margin-top:12px">${esc(t("home.club"))}</div>
          </div>
        </div>
        <p style="margin-top:12px;font-size:14.5px;line-height:1.6;opacity:.88">${esc(t("home.club.pitch"))}</p>
        <button class="btn block" data-join style="margin-top:18px;background:#fff;color:#14161A">${esc(t("home.club.join"))}</button>
      </div>
      ${clubDisclaimer()}
    </section>`;
  }
  return `<section class="reveal">
    <a class="club" href="#/you" style="display:block">
      <div class="club-top">
        <div>
          <div class="club-tier">${icon("sun")}<span>${esc(tr(tier.name))}</span></div>
          <div class="club-name" style="margin-top:12px">${esc(m.name)}</div>
        </div>
        <span style="opacity:.7">${icon("chevron")}</span>
      </div>
      <div class="club-pts"><b class="tabular">${m.points.toLocaleString()}</b><span>${esc(t("you.points"))}</span></div>
      <div class="club-bar"><i style="width:${pct}%"></i></div>
      <div class="club-next">${esc(next
        ? t("you.toNext", { n: (next.at - m.lifetime).toLocaleString(), t: tr(next.name) })
        : t("you.topTier"))}</div>
    </a>
  </section>`;
}

function packageCard(p, delay) {
  const from = p.options ? Math.min(...p.options.map((o) => o.price)) : p.price;
  return `<a class="tile reveal" data-reveal-delay="${delay}" href="#/package/${p.id}" style="width:250px">
    <div class="tile-media" style="aspect-ratio:16/10">${img(p.photo, tr(p.name), { sizes: "250px" })}</div>
    <div class="tile-body">
      <div class="tile-name">${esc(tr(p.name))}</div>
      <div class="tile-meta">
        <span class="tile-price">${p.options ? esc(t("svc.from", { p: money(from) })) : esc(money(p.price))}</span>
        <span>${esc(tr(p.sub))}</span>
      </div>
    </div>
  </a>`;
}

export default function home() {
  const door = doorLine();
  const m = store.member();
  const hi = store.isKnown() ? `${greeting()}, ${esc(firstName(m.name))}` : greeting();

  const html = `
  <header class="hero">
    <div class="hero-media">${img("room", "A treatment room at Spa Sahel", { sizes: "100vw", eager: true })}</div>
    <div class="hero-scrim"></div>
    <div class="hero-glow"></div>
    <div class="hero-logo">${logoSVG("hero", "logo")}</div>
    <h1 class="hero-word">Spa Sahel</h1>
    <div class="hero-door"><i class="dot ${door.on ? "on" : ""}"></i><span>${esc(door.text)}</span></div>
    <div class="hero-line">${esc(t("home.hero.line"))}</div>
    <div class="hero-tag">${esc(tr(BUSINESS.tagline))}</div>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#/book">${icon("calendar")}<span>${esc(t("home.hero.cta"))}</span></a>
      <a class="btn btn-glass" href="#/services">${esc(t("svc.title"))}</a>
    </div>
  </header>

  <div class="wrap" style="padding-top:26px">
    <div style="font-size:15px;color:var(--ink-2)">${hi}</div>

    <section style="margin-top:14px" class="reveal">
      <nav class="quick">
        <a href="#/book"><span class="qi">${icon("calendar")}</span><span class="ql">${esc(t("home.quick.book"))}</span></a>
        <a href="tel:${BUSINESS.phoneHref}"><span class="qi">${icon("phone")}</span><span class="ql">${esc(t("home.quick.call"))}</span></a>
        <a href="${BUSINESS.maps}" target="_blank" rel="noopener"><span class="qi">${icon("pin")}</span><span class="ql">${esc(t("home.quick.map"))}</span></a>
        <a href="#/gift"><span class="qi">${icon("gift")}</span><span class="ql">${esc(t("home.quick.gift"))}</span></a>
      </nav>
    </section>

    ${nextVisitCard()}
    ${clubCard()}

    <section>
      <div class="sec-head">
        <h2>${esc(t("home.featured"))}</h2>
        <a class="more" href="#/services">${esc(t("svc.all"))}</a>
      </div>
      <div class="rail">${featured().slice(0, 10).map((s, i) => serviceTile(s, { delay: i })).join("")}</div>
    </section>

    <section>
      <div class="sec-head">
        <h2>${esc(t("home.groups"))}</h2>
        <span class="sub">${esc(t("home.groups.sub"))}</span>
      </div>
      <div class="grid-2">${GROUPS.map((g, i) => groupTile(g, inGroup(g.id).length, i)).join("")}</div>
    </section>

    <section>
      <div class="sec-head">
        <h2>${esc(t("home.packages"))}</h2>
        <span class="sub">${esc(t("home.packages.sub"))}</span>
      </div>
      <div class="rail">${PACKAGES.map((p, i) => packageCard(p, i)).join("")}</div>
    </section>

    <section class="reveal">
      <div class="sec-head"><h2>${esc(t("home.about"))}</h2></div>
      <div class="card card-pad stack">
        <p class="lede">${esc(t("home.about.body"))}</p>
        <hr class="hairline" style="margin:6px 0">
        <h3 class="title-lg" style="font-size:19px">${esc(t("home.staff"))}</h3>
        <p class="lede">${esc(t("home.staff.body"))}</p>
      </div>
    </section>

    <section class="reveal">
      <div class="sec-head"><h2>${esc(t("home.visit"))}</h2></div>
      <div class="card">
        <div class="tile-media" style="aspect-ratio:16/7">${img("beach", "", { sizes: "100vw" })}</div>
        <div class="card-pad stack">
          <div class="flex" style="align-items:flex-start;gap:12px">
            <span class="row-ico">${icon("pin")}</span>
            <div class="grow">
              <div class="row-title">${esc(BUSINESS.street)}</div>
              <div class="row-sub">${esc(BUSINESS.city)}</div>
            </div>
          </div>
          <a class="btn btn-ghost block" href="${BUSINESS.maps}" target="_blank" rel="noopener">
            ${icon("external")}<span>${esc(t("home.quick.map"))}</span></a>
          <hr class="hairline">
          <div class="sec-head" style="margin:0 0 6px"><h2>${esc(t("home.hours"))}</h2></div>
          <ul class="stack-sm" style="font-size:14.5px">
            ${[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const h = HOURS[d];
              const today = d === new Date().getDay();
              return `<li class="flex-between"${today ? ' style="font-weight:600"' : ""}>
                <span${today ? "" : ' class="muted"'}>${esc(dayName(d))}</span>
                <span class="tabular">${h ? `${esc(clock(h[0]))} – ${esc(clock(h[1]))}` : esc(t("home.closed"))}</span>
              </li>`;
            }).join("")}
          </ul>
        </div>
      </div>
    </section>

    ${standalone() ? "" : `<section class="reveal" id="install-sec">
      <button class="card card-pad flex" style="width:100%;text-align:left;gap:13px" data-install>
        <span class="row-ico">${icon("device")}</span>
        <span class="grow row-title">${esc(t("home.install"))}</span>
        <span class="btn sm btn-tint">${esc(t("home.install.do"))}</span>
      </button>
    </section>`}

    ${footer()}
  </div>`;

  return {
    html,
    flush: true,
    title: BUSINESS.name,
    tone: "dark",
    mount(screen, onCleanup) {
      onCleanup(revealOn(screen));
      screen.querySelector("[data-join]")?.addEventListener("click", () => go("#/you"));
      screen.querySelector("[data-install]")?.addEventListener("click", async () => {
        if (canPrompt()) {
          if (await promptInstall()) toast(t("home.install.do"));
          return;
        }
        sheet({
          title: t("home.install"),
          body: `<p class="lede" style="padding:4px 0 16px">${esc(isIOS()
            ? t("home.install.ios")
            : t("home.install.ios"))}</p>`,
        });
      });
    },
  };
}
