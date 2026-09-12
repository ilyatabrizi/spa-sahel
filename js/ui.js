// Shared pieces: the sheet, the toast, and the handful of fragments that more
// than one screen draws — a price, a duration, a service card, the footer.
//
// Every fragment returns a string and every mount takes a node, so a screen is
// one template literal and one listener rather than a component tree.

import { BUSINESS, CLUB } from "./config.js";
import { lengthIsOurs, lengthOf } from "./data.js";
import { duration, getLang, money, t, tr } from "./i18n.js";
import { icon } from "./icons.js";
import { img } from "./photos.js";
import { logoSVG } from "./brand.js";
import { $, esc } from "./util.js";

/* ---------------------------------------------------------------- toast */
let toastTimer = null;
export function toast(message, iconName = "check") {
  const el = $("#toast");
  if (!el) return;
  el.innerHTML = icon(iconName) + `<span>${esc(message)}</span>`;
  el.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("on"), 2600);
}

/* ---------------------------------------------------------------- sheet */
let openSheet = null;

/**
 * sheet({ title, body, foot, onMount }) — a bottom sheet on a phone, a centred
 * card from 700px up. Returns a close() and resolves nothing; callers wire
 * their own buttons through onMount.
 */
export function sheet({ title = "", body = "", foot = "", onMount, onClose } = {}) {
  closeSheet();
  const scrim = $("#scrim");
  const el = document.createElement("div");
  el.className = "sheet";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", title);
  el.innerHTML = `
    <div class="sheet-grab"></div>
    <div class="sheet-head">
      <h2>${esc(title)}</h2>
      <button class="tb-btn" data-close aria-label="${esc(t("nav.close"))}">${icon("close")}</button>
    </div>
    <div class="sheet-body">${body}</div>
    ${foot ? `<div class="sheet-foot">${foot}</div>` : ""}`;
  document.body.append(el);
  // hold the page still behind the sheet, so scrolling the sheet scrolls the sheet
  document.documentElement.classList.add("sheet-open");
  requestAnimationFrame(() => {
    el.classList.add("on");
    scrim.classList.add("on");
  });
  const close = () => {
    if (openSheet !== api) return;
    openSheet = null;
    el.classList.remove("on");
    scrim.classList.remove("on");
    document.documentElement.classList.remove("sheet-open");
    setTimeout(() => el.remove(), 480);
    onClose?.();
  };
  const api = { el, close };
  openSheet = api;
  el.querySelector("[data-close]").addEventListener("click", close);
  scrim.onclick = close;
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  onMount?.(el, close);
  // focus the first thing worth focusing, the way a dialog should
  setTimeout(() => (el.querySelector("input, button:not([data-close]), [tabindex]") || el).focus?.(), 90);
  return api;
}
export function closeSheet() {
  openSheet?.close();
}
addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

/** A yes/no, as a sheet. Resolves true only on the affirmative. */
export function confirmSheet({ title, body, confirm, danger = false, cancel }) {
  return new Promise((resolve) => {
    let answered = false;
    sheet({
      title,
      body: `<p class="lede" style="padding:2px 0 14px">${esc(body)}</p>`,
      foot: `<button class="btn btn-ghost grow" data-no>${esc(cancel || t("nav.cancel"))}</button>
             <button class="btn ${danger ? "btn-danger" : "btn-primary"} grow" data-yes>${esc(confirm)}</button>`,
      onMount(el, close) {
        el.querySelector("[data-no]").addEventListener("click", close);
        el.querySelector("[data-yes]").addEventListener("click", () => { answered = true; close(); resolve(true); });
      },
      onClose() { if (!answered) resolve(false); },
    });
  });
}

/* ------------------------------------------------------------ fragments */
/** A published price, a free one, or an honest "at consultation". */
export function priceText(service) {
  if (service.free) return t("svc.free");
  if (service.price == null) return t("svc.quoted");
  return money(service.price);
}

/** The length, marked as an estimate when the estimate is ours. */
export function durationText(service) {
  const mins = lengthOf(service);
  return lengthIsOurs(service) ? t("svc.approx", { n: mins }) : duration(mins);
}

export function pointsText(service) {
  if (!service.price) return "";
  return t("svc.earn", { n: Math.round(service.price * CLUB.perDollar) });
}

/** The horizontal card used on Home's rails. */
export function serviceTile(service, { delay = 0 } = {}) {
  const photo = service.photo ? img(service.photo, tr(service.name), { sizes: "208px" }) : "";
  return `<a class="tile reveal" data-reveal-delay="${delay}" href="#/service/${service.id}">
    ${photo ? `<div class="tile-media">${photo}</div>` : ""}
    <div class="tile-body">
      <div class="tile-name">${esc(tr(service.name))}</div>
      <div class="tile-meta">
        <span class="tile-price">${esc(priceText(service))}</span>
        <span>${esc(durationText(service))}</span>
      </div>
    </div>
  </a>`;
}

/** The row used on Services and in the booking picker. */
export function serviceRow(service, { action = "chev", pressed = false } = {}) {
  const tail = action === "chev"
    ? `<span class="row-chev">${icon("chevron")}</span>`
    : `<span class="check${pressed ? "" : ""}" aria-checked="${pressed}">${icon("check")}</span>`;
  const price = service.free ? t("svc.free") : service.price == null ? t("svc.quoted") : money(service.price);
  const per = service.perSession ? ` <small class="muted">${esc(t("svc.perSession"))}</small>` : "";
  return `<button class="row" data-id="${service.id}" ${action === "check" ? `aria-pressed="${pressed}"` : ""}>
    <span class="row-body">
      <span class="row-title">${esc(tr(service.name))}</span>
      <span class="row-sub">${esc(durationText(service))}${service.blurb ? " · " + esc(tr(service.blurb).slice(0, 52)) + "…" : ""}</span>
    </span>
    <span class="row-val">${esc(price)}${per}</span>
    ${tail}
  </button>`;
}

/** The square tile for a treatment family. */
export function groupTile(group, count, delay = 0) {
  return `<a class="gtile reveal" data-reveal-delay="${delay}" href="#/group/${group.id}">
    <div class="gtile-media">${img(group.photo, tr(group.name), { sizes: "(min-width:640px) 240px, 46vw" })}</div>
    <div class="gtile-cap">
      <b>${esc(tr(group.name))}</b>
      <small>${esc(t("svc.count", { n: count }))}</small>
    </div>
    <i class="gtile-ray"></i>
  </a>`;
}

/** One line of the opening hours, with today picked out. */
export function hoursRows(hours, today = new Date().getDay()) {
  return hours.map((row, day) => ({ row, day }))
    .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
}

export function footer() {
  const b = BUSINESS;
  return `<footer class="foot">
    <div class="foot-logo">${logoSVG("foot", "logo")}</div>
    <div class="foot-lines">
      <div>${esc(b.street)}</div>
      <div>${esc(b.city)}</div>
      <div><a href="tel:${b.phoneHref}">${esc(b.phone)}</a> · <a href="mailto:${b.email}">${esc(b.email)}</a></div>
      <div><a href="https://instagram.com/${b.instagram}" target="_blank" rel="noopener">@${esc(b.instagram)}</a>
       · <a href="https://${b.site}" target="_blank" rel="noopener">${esc(b.site)}</a></div>
    </div>
    <a class="foot-alpha" href="https://alphaagency.ae" target="_blank" rel="noopener">
      <span>${esc(t("foot.by"))}</span><b>Alpha Agency</b>
    </a>
    <div class="foot-note">${esc(t("preview.note"))}</div>
    <div class="foot-note">© ${new Date().getFullYear()} ${esc(b.name)}. ${esc(t("foot.rights"))}</div>
  </footer>`;
}

/** The gradient the tier ring is stroked with — one def, shared. */
export const ringDefs = `<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <defs><linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FDC10D"/><stop offset="1" stop-color="#FD8B01"/>
  </linearGradient></defs></svg>`;

/** An empty state with an icon and a line. */
export const emptyState = (iconName, line) =>
  `<div class="empty">${icon(iconName)}<div>${esc(line)}</div></div>`;

/** The club's provenance, stated wherever the club is shown. */
export const clubDisclaimer = () =>
  `<div class="note plain" style="margin-top:12px">${icon("info")}<div>${esc(t("club.proposal"))}</div></div>`;

export const langAttr = () => getLang();
