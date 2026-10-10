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
  [/^\/services\/save-the-date$/, `Digital Save the Date — ${SITE}`, "Digital save-the-dates you can send in seconds — no printing, no postage."],
  [/^\/services\/stationery$/, `Stationery Design — ${SITE}`, "Printed invitation suites — Essential, Signature and Heirloom — designed for your celebration."],
  [/^\/services\/rsvp$/, `RSVP Management — ${SITE}`, "Every reply in one place: guest list, headcount and food needs, ready to download."],
  [/^\/collections/, `Collections — ${SITE}`, "Ready-made designs for weddings, birthdays and more — personalised with your details."],
  [/^\/portfolio$/, `Our Work — ${SITE}`, "Event websites, monograms and stationery we’ve made for real celebrations."],
  [/^\/portfolio\//, `Our Work — ${SITE}`],
  [/^\/faqs/, `FAQ — ${SITE}`, "Answers about pricing, payment (GCash, Maya, card), timelines, revisions and how RSVPs work."],
  [/^\/enquire\/partner/, `Partner with Us — ${SITE}`, "For planners, venues and suppliers who want to work with The RSVP Studio."],
  [/^\/enquire/, `Get a Quote — ${SITE}`, "Tell us about your celebration and we’ll reply within 1 business day."],
  [/^\/build/, `Make Your Own Event Website — ${SITE}`, "Pick a design, add your details and photos, and share one link with your guests."],
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
