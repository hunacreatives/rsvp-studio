// Google Analytics (GA4) on our own pages, under legitimate interest (Data Privacy Act):
// explained in the privacy policy, privacy-friendly settings (no Google signals, no ad
// personalisation), and a one-click opt-out on /privacy. No cookie banner (Francis, Oct 13
// 2026). Off unless VITE_GA_ID is set. Never on guests' event websites (/invite,
// /internal, customers' own domains) or in the Studio.

const GA_ID = ((import.meta.env.VITE_GA_ID as string | undefined) ?? "").trim();
const OPT_OUT = "rs-analytics-off";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export const analyticsConfigured = () => /^G-[A-Z0-9]+$/.test(GA_ID);

/** Pages we never measure: guests' event sites and the staff console. */
export function untrackedPath(pathname: string) {
  return /^\/(invite|internal|studio)(\/|$)/.test(pathname);
}

export function optedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT) === "1";
  } catch {
    return false;
  }
}

/** The privacy page's switch. Takes effect on the next page load. */
export function setOptOut(off: boolean) {
  try {
    if (off) localStorage.setItem(OPT_OUT, "1");
    else localStorage.removeItem(OPT_OUT);
  } catch {
    /* storage blocked: nothing to remember */
  }
  // Google's own switch, for the rest of this visit.
  (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = off;
}

let loaded = false;
function load() {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag reads the arguments object itself.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

/** One page view (the app changes pages without reloading). */
export function trackPage(pathname: string) {
  if (!analyticsConfigured() || untrackedPath(pathname) || optedOut()) return;
  load();
  window.gtag?.("event", "page_view", { page_path: pathname, page_location: window.location.origin + pathname, page_title: document.title });
}
