// Google Analytics (GA4) on our own pages, under legitimate interest (Data Privacy Act):
// explained in the privacy policy, privacy-friendly settings (no Google signals, no ad
// personalisation), and a one-click opt-out on /privacy. No cookie banner (Francis, Oct 13
// 2026). Off unless VITE_GA_ID is set. Never on guests' event websites (/invite,
// /internal, customers' own domains) or in the Studio.
//
// The Meta pixel (Nov 11 2026, for Facebook/Instagram ads): the same pages, the same opt-out. Off unless
// VITE_META_PIXEL_ID is set. Sends page views and four actions (see META_EVENTS) so Meta can show the ads
// to people like those who sign up. No automatic matching (no emails/phones sent) and no automatic
// button-click events. Explained in the privacy policy.

const GA_ID = ((import.meta.env.VITE_GA_ID as string | undefined) ?? "").trim();
const META_ID = ((import.meta.env.VITE_META_PIXEL_ID as string | undefined) ?? "").trim();
const OPT_OUT = "rs-analytics-off";

type Gtag = (...args: unknown[]) => void;
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; push: Fbq; loaded: boolean; version: string };
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export const analyticsConfigured = () => /^G-[A-Z0-9]+$/.test(GA_ID);
export const metaConfigured = () => /^\d{10,20}$/.test(META_ID);
/** Either one is on (the privacy page's switch turns off both). */
export const trackingConfigured = () => analyticsConfigured() || metaConfigured();

// Our actions → Meta's standard events (the ones its ads can aim for). Anything else isn't sent to Meta.
const META_EVENTS: Record<string, { event: string; custom?: true }> = {
  sign_up: { event: "CompleteRegistration" },
  generate_lead: { event: "Lead" },
  contact: { event: "Contact" },
  start_building: { event: "StartBuilding", custom: true },
};

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
  if (loaded || !analyticsConfigured()) return;
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

let metaLoaded = false;
function loadMeta() {
  if (metaLoaded || !metaConfigured()) return;
  metaLoaded = true;
  // Meta's own loader, written out: calls queue until fbevents.js arrives.
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  // no automatic button-click / form events: only what we send below
  fbq("set", "autoConfig", false, META_ID);
  fbq("init", META_ID);
}

const tracking = (pathname: string) => trackingConfigured() && !optedOut() && !untrackedPath(pathname);

/** A key action, for Google Analytics conversions: generate_lead (inquiry sent),
 *  sign_up / begin_signup, contact (Messenger, Instagram, Book a call). */
export function trackEvent(name: string, params: Record<string, string | number> = {}) {
  if (!tracking(window.location.pathname)) return;
  load();
  window.gtag?.("event", name, params);
  const meta = META_EVENTS[name];
  if (meta && metaConfigured()) {
    loadMeta();
    window.fbq?.(meta.custom ? "trackCustom" : "track", meta.event, params);
  }
}

/** One page view (the app changes pages without reloading). */
export function trackPage(pathname: string) {
  if (!tracking(pathname)) return;
  load();
  window.gtag?.("event", "page_view", { page_path: pathname, page_location: window.location.origin + pathname, page_title: document.title });
  loadMeta();
  window.fbq?.("track", "PageView");
}
