// Motion helpers. Everything here steps aside for reduced motion.

export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A tap you can feel, where the phone allows it (Android; iOS ignores it). */
export function haptic(pattern = 8) {
  try { navigator.vibrate?.(pattern); } catch {}
}

/** Restart a CSS animation that is keyed to a class. */
export function replay(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/**
 * Reveal elements as they arrive. Returns a stop() so a screen can let go of
 * the observer when it is replaced.
 */
export function revealOn(root) {
  const items = [...root.querySelectorAll(".reveal")];
  if (!items.length) return () => {};
  if (reduced() || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      // a row of cards lights up left to right rather than all at once
      const i = Number(e.target.dataset.revealDelay || 0);
      setTimeout(() => e.target.classList.add("in"), Math.min(i, 5) * 60);
      io.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
  items.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
