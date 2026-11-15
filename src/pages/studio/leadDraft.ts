// First messages to a lead, written to the rules in docs/lead-replies.md: who we are, one
// detail of theirs, the price in one line (Semi-Custom only), and one easy question to end on.
// Never a list of questions. Used by Studio → Leads (Message on Viber/SMS/Instagram, and the
// email Reply's starting text). Pure, so it's easy to check.

type Values = Record<string, string | string[] | undefined>;
export type DraftLead = { name: string | null; values: Values | null; created_at: string };

const str = (v: Values[string]) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? "")).toString().trim();
// "IAN" or "ian" → "Ian"; names typed with care keep their own capitals.
const tidy = (w: string) => (w === w.toUpperCase() || w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w);
const firstName = (name: string | null) => tidy((name ?? "").trim().split(/\s+/)[0] ?? "");
// Occasions we can name; anything else ("other") is just "event".
const OCCASIONS = ["birthday", "debut", "christening", "baptism", "anniversary", "reunion", "graduation", "engagement", "baby shower", "bridal shower", "gender reveal", "party"];
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const longDate = (iso: string) => new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "Asia/Manila" });

/** Days from today (Manila) to the event; null if there's no date. */
function daysUntil(iso: string, now = Date.now()) {
  const today = new Date(now + 8 * 3_600_000).toISOString().slice(0, 10);
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** What the lead's form tells us, in the words a message needs. */
export function readLead(lead: DraftLead) {
  const v = lead.values ?? {};
  const first = firstName(lead.name) || "there";
  const occasion = str(v.occasion).toLowerCase();
  const wedding = occasion.includes("wedding");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(v.event_date)) ? str(v.event_date) : null;
  const days = date ? daysUntil(date) : null;
  // Celebrating for themselves? The form's "Myself" isn't reliable (Earl chose it for Aslyn's 18th),
  // so compare the celebrant's name with theirs.
  const celebrant = firstName(str(v.celebrant_name));
  const self = !celebrant || celebrant.slice(0, 3).toLowerCase() === first.slice(0, 3).toLowerCase();
  const milestone = str(v.milestone_age);
  const age = Number(milestone.match(/\d{1,3}/)?.[0] ?? NaN);
  // A milestone line they wrote themselves ("chapter 18 and becoming") is worth quoting back.
  const headline = milestone.split(/\s+/).length >= 3 ? milestone.charAt(0).toUpperCase() + milestone.slice(1) : null;
  const collection = str(v.semi_collections) || (str(v.interested_in).match(/—\s*([\w ]+?) collection/i)?.[1] ?? "");
  const custom = /^custom|bespoke/i.test(str(v.design_type));
  const guests = Number(str(v.guest_count)) || null;
  const partner = firstName(str(v.partner_name));

  const what = wedding ? "wedding" : age > 0 ? ordinal(age) : OCCASIONS.find((o) => occasion.includes(o)) ?? "event";
  const whose = wedding ? (partner ? `your wedding with ${partner}` : "your wedding") : `${self ? "your" : `${celebrant}'s`} ${what}`;
  const event = `${whose}${date && days !== null && days >= 0 ? ` on ${longDate(date)}` : ""}`;
  const nameOn = self ? "your name" : `${celebrant}'s name`;
  return { first, wedding, date, days, self, celebrant, headline, collection, custom, guests, whose, event, nameOn };
}

/** The one-line price, Semi-Custom only. Rush (+30%) when the event is 10 days away or less. */
function priceLine(r: ReturnType<typeof readLead>) {
  if (r.wedding || r.custom) return "";
  const rush = r.days !== null && r.days >= 0 && r.days <= 10;
  const rsvps = r.guests ? `, with RSVPs for all ${r.guests} guests included` : ", with RSVPs included";
  return rush ? `It's ₱3,900 with rush delivery${rsvps}.` : `It's ₱3,000${rsvps}.`;
}

/** Under two weeks away: say we can still make it. */
function urgencyLine(r: ReturnType<typeof readLead>) {
  if (r.days === null || r.days > 14 || r.days < 4 || !r.date) return "";
  const day = ordinal(Number(r.date.slice(8)));
  return `With ${r.wedding ? "the wedding" : "the party"} on the ${day}, we can still have it ready in time.`;
}

/** The one easy question to end on. */
function askLine(r: ReturnType<typeof readLead>) {
  if (r.wedding || r.custom)
    return `I can send a first look of a design${r.date ? ` for ${longDate(r.date)}` : ""}, or we can do a quick call. Which is easier for you?`;
  // The headline line already named the design: don't name it twice.
  const design = r.headline ? "" : r.collection ? ` of the ${r.collection} design` : " of a design";
  return `Want me to send you a quick preview${design} with ${r.nameOn} on it?`;
}

const headlineLine = (r: ReturnType<typeof readLead>) =>
  r.headline ? `"${r.headline}" would look great on ${r.collection ? `the ${r.collection} design` : "the site"}.` : "";

/** A chat message (Viber, SMS, Instagram). `emailed`: we've already emailed them the details. */
export function chatDraft(lead: DraftLead, sender: string, emailed: boolean) {
  const r = readLead(lead);
  const hi = `Hi ${r.first}, this is ${sender} from The RSVP Studio.`;
  // The urgency line says the date, so the opener doesn't.
  const about = urgencyLine(r) ? r.whose : r.event;
  const opener = emailed ? `I emailed you about ${about}.` : `I got your inquiry about ${about}.`;
  return [hi, opener, emailed ? "" : headlineLine(r), urgencyLine(r), emailed ? "" : priceLine(r), askLine(r)].filter(Boolean).join(" ");
}

/** The starting text for a first email reply. Short, no lists; the email adds our sign-off. */
export function emailDraft(lead: DraftLead) {
  const r = readLead(lead);
  return [
    `Hi ${r.first},`,
    [`Thanks for your inquiry about ${urgencyLine(r) ? r.whose : r.event}.`, headlineLine(r)].filter(Boolean).join(" "),
    [urgencyLine(r), priceLine(r)].filter(Boolean).join(" "),
    askLine(r),
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ── Where to send it ─────────────────────────────────────────────────────────

/** A Philippine mobile number as +639XXXXXXXXX, or null if it's incomplete. */
export function phMobile(raw: string | null | undefined) {
  const d = (raw ?? "").replace(/\D/g, "");
  if (/^639\d{9}$/.test(d)) return `+${d}`;
  if (/^09\d{9}$/.test(d)) return `+63${d.slice(1)}`;
  if (/^9\d{9}$/.test(d)) return `+63${d}`;
  return null;
}
export function igHandle(values: Values | null) {
  const raw = str(values?.ig_handle) || str(values?.instagram);
  const h = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?].*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h : null;
}
/** Viber opens the chat with the message typed in (the `draft` parameter; it's also copied, in case). */
export const viberLink = (mobile: string, text: string) => `viber://chat?number=${encodeURIComponent(mobile)}&draft=${encodeURIComponent(text)}`;
export const smsLink = (mobile: string, text: string) => `sms:${mobile}&body=${encodeURIComponent(text)}`;
export const instagramLink = (handle: string) => `https://ig.me/m/${handle}`;
