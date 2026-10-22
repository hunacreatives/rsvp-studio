import type Lenis from "lenis";

/**
 * Shared reference to the app's single Lenis instance (set by
 * useSmoothScroll). Lenis keeps its own animated scroll target and will
 * fight a raw `window.scrollTo()` call, re-asserting its last position on
 * the next frame — code that needs to force-scroll (e.g. the mobile nav)
 * must go through Lenis itself instead.
 */
export const lenisRef: { current: Lenis | null } = { current: null };

/**
 * Jump to the top of the page now, for a new page. Goes through Lenis (stopping any glide
 * still in progress), or a link clicked mid-scroll would open the next page partway down.
 */
export function scrollToTopNow() {
  lenisRef.current?.scrollTo(0, { immediate: true, force: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}
