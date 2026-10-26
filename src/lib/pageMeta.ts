// Each page's title and description (browser tab + search results). Pages not
// listed keep the site default. Event invites get theirs from api/invite-page.ts.

const SITE = "The RSVP Studio";
const DEFAULT_DESC =
  "Event websites, digital invitations and stationery for weddings, birthdays and every celebration in the Philippines — with RSVPs built in.";

const META: [RegExp, string, string?][] = [
  [/^\/$/, `${SITE} — Event Websites, Invitations & Stationery`, DEFAULT_DESC],
  [/^\/services$/, `Services — ${SITE}`, "Event websites, save-the-dates, monograms, printed stationery and RSVP management — pick one or bundle them."],
  [/^\/services\/milestone$/, `Event Websites — ${SITE}`, "Semi-Custom and Custom event websites for weddings, birthdays and milestones. RSVPs built in. From ₱3,000."],
  [/^\/services\/monogram$/, `Monogram Design — ${SITE}`, "Custom monograms and crests for your celebration — Signature, Duo and Crest, from ₱2,500."],
  [/^\/services\/save-the-date$/, `Digital Save the Date — ${SITE}`, "Still or animated Save the Dates designed for your celebration and sent straight to your guests’ phones. From ₱1,500, ready in 3–5 business days."],
  [/^\/services\/stationery$/, `Stationery Design — ${SITE}`, "Printed invitation suites — Essential, Signature and Heirloom — designed for your celebration."],
  [/^\/services\/rsvp$/, `RSVP Management — ${SITE}`, "Free with every event website: an RSVP form, a guest list you can download, confirmation emails and an invite list that shows who hasn’t replied."],
  [/^\/collections/, `Collections — ${SITE}`, "Ready-made designs for weddings, birthdays and more — personalised with your details."],
  [/^\/portfolio$/, `Our Work — ${SITE}`, "Event websites, monograms and stationery we’ve made for real celebrations."],
  [/^\/portfolio\//, `Our Work — ${SITE}`],
  [/^\/contact/, `Contact Us — ${SITE}`, "Talk to a real person at The RSVP Studio: have us make your event website, finish the one you started, or sort out your account. We reply within 1 business day."],
  [/^\/account\/join/, `Join an event — ${SITE}`],
  [/^\/faqs/, `FAQ — ${SITE}`, "Answers about pricing, payment (GCash, Maya, card), timelines, revisions and how RSVPs work."],
  [/^\/enquire\/partner/, `Partner with Us — ${SITE}`, "For planners, venues and suppliers who want to work with The RSVP Studio."],
  [/^\/enquire/, `Get a Quote — ${SITE}`, "Tell us about your celebration and we’ll reply within 1 business day."],
  [/^\/build/, `Make Your Own Event Website — ${SITE}`, "Pick a design, add your details and photos, and share one link with your guests."],
  [/^\/tools\/seating-chart-maker/, `Mesa: Free Seating Chart Maker for Weddings, Debuts & Events — ${SITE}`, "Mesa is a free seating chart maker for weddings, debuts, birthdays and every kind of event. Paste your guest list and seat everyone, no sign-up needed; download and share with a free account."],
  [/^\/blog$/, `The Journal — ${SITE}`, "Ideas, guides and stories on invitations, events, and everything in between."],
  [/^\/partners$/, `For Coordinators — ${SITE}`, "Sign up free as a coordinator: every client’s event in one dashboard, hand-over, seating and check-in. Partners earn up to 20%."],
  [/^\/privacy/, `Privacy Policy — ${SITE}`],
  [/^\/terms/, `Terms of Service — ${SITE}`],
  [/^\/account/, `Your Dashboard — ${SITE}`],
  [/^\/studio/, `Studio Console — ${SITE}`],
  [/^\/rate/, `How did we do? — ${SITE}`],
];

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function applyPageMeta(pathname: string) {
  if (pathname.startsWith("/invite/")) return; // set by the server per event
  const hit = META.find(([re]) => re.test(pathname));
  const title = hit?.[1] ?? SITE;
  const desc = hit?.[2] ?? DEFAULT_DESC;
  document.title = title;
  setMeta('meta[name="description"]', "name", "description", desc);
  setMeta('meta[property="og:title"]', "property", "og:title", title);
  setMeta('meta[property="og:description"]', "property", "og:description", desc);
  setMeta('meta[property="og:url"]', "property", "og:url", `https://thersvpstudio.com${pathname}`);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `https://thersvpstudio.com${pathname === "/" ? "/" : pathname.replace(/\/$/, "")}`;
}
