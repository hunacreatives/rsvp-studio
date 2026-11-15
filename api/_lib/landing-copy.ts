// The words on the occasion pages (/debut-invitation-website, /christening-invitation-website)
// and /pricing. The pages show them (src/pages/landing), and api/invite-page.ts (op=meta) puts
// the same words and their FAQ (as FAQPage data) in the HTML, for search and AI answers that
// don't run the app. Nov 15 2026 SEO batch 2: buyers search "... price philippines",
// "debut invitation website", "christening and 1st birthday invitation", and we had no page
// for any of them. Prices here must match the FAQ page and the service pages.

export type Faq = [q: string, a: string];
export type Landing = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  /** The direct answer under the heading (40–60 words). */
  answer: string;
  priceLine: string;
  features: [title: string, text: string][];
  /** Designs to show, by template id (cards at /event-templates/cards/<id>.webp). */
  designs: { id: string; label: string; note: string }[];
  /** The inquiry form's occasion and what the lead says it asked about. */
  occasion: string;
  faq: Faq[];
  cta: { heading: string; line: string };
};

const PAY = "GCash, Maya, card or QR Ph. For a Semi-Custom site, 60% to start and the rest when it goes live.";

export const DEBUT: Landing = {
  path: "/debut-invitation-website",
  title: "Debut Invitation Website with RSVP, From ₱3,000 — The RSVP Studio",
  description: "An 18th birthday invitation website with RSVPs, the program, the 18 roses and 18 candles, a map and the dress code. We make it from ₱3,000, or make it yourself for free.",
  eyebrow: "Debut websites",
  h1: "A debut invitation website, with RSVPs built in",
  answer:
    "Send one link instead of a printed invite. Her debut website holds the date, the venue and map, the dress code, the program, her 18 roses and 18 candles, and an RSVP form that keeps the guest list for you. We make it from ₱3,000 in 5–7 business days, or you can make it yourself for free.",
  priceLine: "From ₱3,000 · Ready in 5–7 business days · Or make it yourself, free",
  features: [
    ["The 18 roses and 18 candles", "Every name, in order, so each rose and candle knows when they’re up."],
    ["The program", "Entrance, the 18s and the last dance, in order, with times."],
    ["RSVPs in one list", "Guests reply on the site. You see who’s coming and download the list for the caterer."],
    ["Venue, map and dress code", "One tap opens the map. The motif colours sit right under the date."],
    ["Cash gifts", "Add a GCash or bank QR code that guests can scan from the site."],
    ["Her photos", "A cover photo and a gallery, so it looks like her and not a template."],
  ],
  designs: [
    { id: "debut-issue", label: "Debut Issue", note: "Her debut as a magazine cover" },
    { id: "debut", label: "Debut", note: "Classic and elegant, free to use" },
  ],
  occasion: "birthday",
  faq: [
    ["How much is a debut invitation website?", "₱3,000 for Semi-Custom: one of our debut designs, set up with her details and photos, ready in 5–7 business days. Custom sites designed from scratch start at ₱8,000. Making it yourself is free, and Premium is ₱499, paid once."],
    ["How early should we send it?", "Four to six weeks before the debut gives guests time to reply. If the party is sooner than that, rush delivery takes about half the time, for 30% more."],
    ["Can we list the 18 roses and 18 candles?", "Yes. Each list goes on the site with the names in order, and you can change it any time before the party."],
    ["Do guests need an app or an account?", "No. They open the link on their phone and reply in a minute."],
    ["Can we have printed invitations too?", "Yes. We also design printed invitations and seating boards to match the website."],
    ["How do we pay?", PAY],
  ],
  cta: { heading: "Her debut, on one link", line: "A debut website made for her, with RSVPs built in." },
};

export const CHRISTENING: Landing = {
  path: "/christening-invitation-website",
  title: "Christening & 1st Birthday Invitation Website with RSVP — The RSVP Studio",
  description: "One invitation website for the binyag, the 1st birthday or both on one day: the church and the reception with maps, your ninongs and ninangs, and RSVPs. From ₱3,000, or make it yourself for free.",
  eyebrow: "Christening & 1st birthday",
  h1: "A christening and 1st birthday website, with RSVPs built in",
  answer:
    "Many families hold the binyag and the 1st birthday on the same day. One website covers both: the church and the reception with a map for each, the list of ninongs and ninangs, the motif, and an RSVP form so you know how many to feed. We make it from ₱3,000, or you can make it yourself for free.",
  priceLine: "From ₱3,000 · Ready in 5–7 business days · Or make it yourself, free",
  features: [
    ["The church and the reception", "Both venues with their times and a map for each, so no one ends up at the wrong place."],
    ["Ninongs and ninangs", "Every godparent listed by name. A nice way to thank them, and a gentle reminder."],
    ["RSVPs in one list", "Guests reply on the site, so you know the headcount before you order the food."],
    ["Motif and dress code", "The colours and what to wear, right under the date."],
    ["Cash gifts", "Add a GCash or bank QR code that guests can scan from the site."],
    ["Baby’s photos", "A cover photo and a gallery from the first year."],
  ],
  designs: [
    { id: "calado", label: "Calado", note: "Embroidery, like a binyag gown. Free to use" },
    { id: "safari", label: "Safari", note: "Animated animals for a playful 1st birthday" },
  ],
  occasion: "other",
  faq: [
    ["How much is a christening invitation website?", "₱3,000 for Semi-Custom: one of our designs, set up with your details and photos, ready in 5–7 business days. Custom sites designed from scratch start at ₱8,000. Making it yourself is free, and Premium is ₱499, paid once."],
    ["Can one website cover the christening and the 1st birthday?", "Yes. Choose both when you set it up, and the site shows the church, the reception and one RSVP for the day."],
    ["Can we list the ninongs and ninangs?", "Yes, one name per line, as many as you have."],
    ["How early should we send it?", "Three to four weeks before gives guests time to reply. If it’s sooner, rush delivery takes about half the time, for 30% more."],
    ["Do guests need an app or an account?", "No. They open the link on their phone and reply in a minute."],
    ["How do we pay?", PAY],
  ],
  cta: { heading: "The binyag and the birthday, on one link", line: "One website for the whole day, with RSVPs built in." },
};

export const LANDINGS: Record<string, Landing> = { [DEBUT.path]: DEBUT, [CHRISTENING.path]: CHRISTENING };

// ── /pricing ────────────────────────────────────────────────────────────────

export type PriceRow = { name: string; price: string; detail: string; href: string };
export const PRICING = {
  path: "/pricing",
  title: "Prices: Event Websites & Digital Invitations in the Philippines — The RSVP Studio",
  description: "Event websites with RSVPs from ₱3,000, or make your own for free. Save the dates from ₱1,500, monograms from ₱2,500, printed suites from ₱8,500. Pay by GCash, Maya or card.",
  eyebrow: "Pricing",
  h1: "What our event websites and invitations cost",
  answer:
    "An event website with an RSVP form costs ₱3,000 when we set up one of our designs for you, or from ₱8,000 when we design it from scratch. You can also make your own for free, and add Premium for ₱499, paid once. All prices are in pesos. Pay by GCash, Maya, card or QR Ph.",
  groups: [
    {
      heading: "Event websites",
      rows: [
        { name: "Make it yourself", price: "Free", detail: "Any Standard design, an RSVP form and a guest list.", href: "/build" },
        { name: "Premium", price: "₱499, once", detail: "For a site you make yourself: Premium designs, an email for every reply, reminders to guests, and guest photos.", href: "/build" },
        { name: "Semi-Custom", price: "₱3,000", detail: "One of our designs, set up by us with your details and photos. 2 rounds of changes. Ready in 5–7 business days.", href: "/services/milestone" },
        { name: "Custom", price: "From ₱8,000", detail: "Designed from scratch. 3 rounds of changes, a free .com for a year, and we follow up with guests who haven’t replied. Ready in 3–4 weeks.", href: "/services/milestone" },
      ],
    },
    {
      heading: "Add-ons",
      rows: [
        { name: "Rush delivery", price: "+30%", detail: "About half the usual time, when we can fit it in.", href: "/enquire" },
        { name: "Your own web address", price: "From ₱1,499 a year", detail: "yournames.com instead of our link. Free for a year with Custom.", href: "/faqs" },
      ],
    },
    {
      heading: "Also from us",
      rows: [
        { name: "Digital save the date", price: "From ₱1,500", detail: "Still from ₱1,500, animated from ₱2,500. Ready in 3–5 business days.", href: "/services/save-the-date" },
        { name: "Monogram", price: "From ₱2,500", detail: "Signature ₱2,500, Duo ₱3,500, Crest ₱8,500.", href: "/services/monogram" },
        { name: "Printed invitation suite", price: "From ₱8,500", detail: "Essential ₱8,500, Signature ₱10,000, Heirloom ₱22,000. 4–6 weeks with printing.", href: "/services/stationery" },
        { name: "Mesa seating chart maker", price: "Free", detail: "Seat your guests table by table. No sign-up to start.", href: "/tools/seating-chart-maker" },
      ],
    },
  ] as { heading: string; rows: PriceRow[] }[],
  faq: [
    ["How much is a digital invitation in the Philippines?", "With us, an event website with an RSVP form is ₱3,000 for Semi-Custom or from ₱8,000 for Custom, and making your own is free. A digital save the date starts at ₱1,500."],
    ["Is there a free option?", "Yes. Make your own event website with any Standard design and publish it for free. Premium is ₱499, paid once, if you want Premium designs and an email for every reply."],
    ["What’s the difference between Semi-Custom and Custom?", "Semi-Custom is one of our ready designs, set up with your details and photos, in 5–7 business days. Custom is designed from scratch around your celebration, with 3 rounds of changes, in 3–4 weeks."],
    ["How do we pay?", PAY],
  ] as Faq[],
};
