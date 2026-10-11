import { useSyncExternalStore } from "react";

// Phone-width check for the builder (matches the 767px breakpoint in builder.css
// and index.css). Below it the builder switches to its Edit | Preview tab layout.
export const PHONE_QUERY = "(max-width: 767px)";

export function isPhoneNow(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches;
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, isPhoneNow, () => false);
}
