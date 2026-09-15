import type Lenis from "lenis";

/**
 * Shared reference to the app's single Lenis instance (set by
 * useSmoothScroll). Lenis keeps its own animated scroll target and will
 * fight a raw `window.scrollTo()` call, re-asserting its last position on
 * the next frame — code that needs to force-scroll (e.g. the mobile nav)
 * must go through Lenis itself instead.
 */
export const lenisRef: { current: Lenis | null } = { current: null };
