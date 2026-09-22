import { useEffect, useState, type CSSProperties } from "react";

// The ENTIRE shared motion surface for wedding-site templates: a reduced-
// motion hook and a small transition-safety helper. Everything else
// (keyframes, choreography, sequencing, easing) is template-owned — see
// docs/template-builder-decisions.md. Do not add anything else here
// without a real, demonstrated need shared by 2+ templates.

/**
 * Tracks the user's `prefers-reduced-motion` preference. Every template
 * should call this once and use it to gate its own animation logic,
 * rather than each template re-implementing its own matchMedia listener.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReduced(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReduced;
}

/**
 * Wraps a template's own CSS `transition` value, collapsing it to "none"
 * when the user prefers reduced motion. Templates keep full control over
 * their own transition timing/easing — this only ever short-circuits it.
 */
export function safeTransition(
  transition: CSSProperties["transition"],
  prefersReducedMotion: boolean
): CSSProperties["transition"] {
  return prefersReducedMotion ? "none" : transition;
}
