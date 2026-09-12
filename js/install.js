// Add to Home Screen. Chrome and Android hand over an event to prompt with;
// Safari never does, so on an iPhone the button explains Share → Add to Home
// Screen instead.

let deferred = null;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e;
  document.dispatchEvent(new CustomEvent("install:ready"));
});
addEventListener("appinstalled", () => { deferred = null; });

export const standalone = () =>
  matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const canPrompt = () => Boolean(deferred);

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const choice = await deferred.userChoice.catch(() => null);
  deferred = null;
  return choice?.outcome === "accepted";
}
