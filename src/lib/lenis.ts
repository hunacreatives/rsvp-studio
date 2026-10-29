import type Lenis from "lenis";

/**
 * The site scrolls natively: the Lenis smooth scroll was taken out (Oct 29 2026) because its
 * easing made scrolling feel late. This stays null, so every caller takes its native-scroll
 * path; it's kept so a smooth scroll could be put back in one place.
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
