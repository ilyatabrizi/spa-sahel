// Wiring. Routes in, chrome up, worker registered.

import { initChrome, measureScreen, paintTabs } from "./chrome.js";
import { initLang } from "./i18n.js";
import { runBoot } from "./boot.js";
import { render, route, startRouter } from "./router.js";
import * as store from "./store.js";
import { initTheme } from "./theme.js";
import { closeSheet } from "./ui.js";

import home from "./views/home.js";
import { groupView, servicesIndex } from "./views/services.js";
import { packageView, serviceView } from "./views/service.js";
import { bookStep1, bookStep2, bookStep3, bookStep4, bookStep5, bookStep6, bookedView, hideDock } from "./views/book.js";
import you, { appointmentView, giftView } from "./views/you.js";

route("/", home);
route("/services", servicesIndex);
route("/group/:id", groupView);
route("/service/:id", serviceView);
route("/package/:id", packageView);
route("/book", bookStep1);
route("/book/who", bookStep2);
route("/book/when", bookStep3);
route("/book/details", bookStep4);
route("/book/health", bookStep5);
route("/book/confirm", bookStep6);
route("/booked/:id", bookedView);
route("/you", you);
route("/appointment/:id", appointmentView);
route("/gift", giftView);

initLang();
initTheme();
store.reconcile();

// Every render tells the chrome where this screen's title ends and whether it
// opens on a photograph, so the bar knows when to take on material.
document.addEventListener("view:rendered", (e) => {
  const { path, screen, title, tone } = e.detail;
  paintTabs(path);
  measureScreen(screen, { title, tone });
  if (!path.startsWith("/book") || path === "/booked") hideDock();
  closeSheet();
});

// Switching language re-renders in place; the chrome repaints its own labels.
document.addEventListener("lang:change", () => render({ keepScroll: true }));

// A visit that has been and gone settles into history — and its points land —
// the next time the app comes back to the front, not only at a cold start.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && store.reconcile()) render({ keepScroll: true });
});

// iOS applies :active only once the document listens for touches. Without this
// every pressed state in the stylesheet is invisible on an iPhone.
document.addEventListener("touchstart", () => {}, { passive: true });

initChrome();
const first = startRouter();
runBoot(first);

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
