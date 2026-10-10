import type { NavigateFunction } from "react-router-dom";
import { lenisRef } from "./lenis";

/**
 * Navigate to a link that may carry a ?query and #hash, keeping both: pages read
 * the hash (e.g. /collections#wedding pre-selects a filter) and the query
 * (/enquire?service=monogram pre-fills the form). If the hash names an element on
 * the new page (/faqs#rsvp), scroll to it once the page has rendered.
 */
export function goTo(navigate: NavigateFunction, to: string) {
  navigate(to);
  const hash = to.split("#")[1];
  if (!hash) return;
  setTimeout(() => {
    const el = document.getElementById(hash);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: -90 });
    else el.scrollIntoView({ behavior: "smooth" });
  }, 350);
}
