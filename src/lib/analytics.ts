// Google Analytics (GA4), only with the visitor's consent (Philippine Data Privacy Act).
// Off unless VITE_GA_ID is set. Never on guests' event websites (/invite, /internal,
// customers' own domains) or in the Studio. The choice is kept in this browser
// (localStorage "rs-cookies": "yes" | "no"); nothing loads until they tap Accept.

const GA_ID = ((import.meta.env.VITE_GA_ID as string | undefined) ?? "").trim();
const KEY = "rs-cookies";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export const analyticsConfigured = () => /^G-[A-Z0-9]+$/.test(GA_ID);

/** Pages where we never track or ask: guests' event sites and the staff console. */
export function untrackedPath(pathname: string) {
  return /^\/(invite|internal|studio)(\/|$)/.test(pathname);
}

export function consent(): "yes" | "no" | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

let loaded = false;
function load() {
  if (loaded || !analyticsConfigured()) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag reads the arguments object itself.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

export function setConsent(choice: "yes" | "no") {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    /* storage blocked: we just won't remember */
  }
  if (choice === "yes") {
    load();
    trackPage(window.location.pathname);
  }
}

/** One page view (the app changes pages without reloading). */
export function trackPage(pathname: string) {
  if (!analyticsConfigured() || untrackedPath(pathname) || consent() !== "yes") return;
  load();
  window.gtag?.("event", "page_view", { page_path: pathname, page_location: window.location.origin + pathname, page_title: document.title });
}
