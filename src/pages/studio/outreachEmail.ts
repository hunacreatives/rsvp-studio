import type { Contact } from "./outreach";

// Studio → Outreach → Email: the partner email, written for one business and sent by hand from Gmail.
// "Email" copies it (formatted, with the Starter / Silver / Gold picture) and opens Gmail in hello@ with
// their address and the subject filled in; you paste and send. Replies come straight to hello@.
// A Gmail link can only carry plain text, which is why the body is pasted instead.

export const SENDER = "hello@thersvpstudio.com";
const SITE = "https://thersvpstudio.com";
const TIERS_IMG = `${SITE}/email/partner-tiers.png`;
const TIERS_TEXT = "Starter 10% from your first client · Silver 15% after 5 paying clients · Gold 20% after 15 paying clients";

type Audience = "coordinator" | "venue" | "caterer" | "supplier";
const audienceOf = (kind: string): Audience => (kind === "coordinator" || kind === "venue" || kind === "caterer" ? kind : "supplier");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const greeting = (c: Contact) => {
  const person = c.contact_person?.trim().split(/\s+/)[0];
  return person ? `Hi ${person},` : `Hi ${c.name.trim()} team,`;
};
const linkFor = (c: Contact) => `${SITE}/partners?o=${c.code}`;
export const subjectFor = (c: Contact) => (audienceOf(c.kind) === "venue" ? `For the celebrations at ${c.name.trim()}` : `For your clients at ${c.name.trim()}`).slice(0, 140);

const SHARE = "Your clients get 10% off with your code, and you earn a share of every booking they make:";
/** The paragraphs before the tier picture, and the one after it. */
function middle(c: Contact): { before: string[]; after: string | null } {
  const a = audienceOf(c.kind);
  if (a === "venue") return { before: [`A lot of celebrations start at places like yours, so we’d love to partner with you. ${SHARE}`], after: "For you, it means guests reply online and the final headcount is settled well before the day." };
  if (a === "caterer") return { before: [`Good food is half the celebration, so we’d love to partner with you. ${SHARE}`], after: "For you, it means guests share their dietary notes when they RSVP, so you get a firm headcount and allergy list early." };
  if (a === "coordinator")
    return {
      before: [
        "You already keep every celebration running, so we’d love to make the guest list part easier. Our coordinator dashboard is free: set up each client’s site and guest list, and see who’s coming, plus-ones and dietary notes in one place.",
        SHARE,
      ],
      after: null,
    };
  const where = c.city?.trim() ? ` in ${c.city.trim()}` : "";
  return { before: [`We’re partnering with event suppliers${where}, and we’d love to have you. ${SHARE}`], after: "For you, it means one simple link to share, and a little extra from every celebration it brings in." };
}

const P = (html: string) => `<p style="margin:0 0 14px;">${html}</p>`;
const SIGN_HTML = `<p style="margin:18px 0 0;">Warmly,<br>Angela<br><span style="color:#5f6368;">The RSVP Studio · <a href="${SITE}" style="color:#1a5fb4;">thersvpstudio.com</a></span></p>`;
const SIGN_TEXT = "Warmly,\nAngela\nThe RSVP Studio · thersvpstudio.com";
const STOP_LINE = "If you’d rather not hear from us, just reply “stop” and we won’t email again.";
const wrap = (inner: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222222;">${inner}<p style="margin:22px 0 0;font-size:12px;color:#80868b;">${STOP_LINE}</p></div>`;

export type OutreachEmail = { subject: string; html: string; text: string };

/** The first email: a few short paragraphs, the tier picture, one easy ask. */
export function openerEmail(c: Contact): OutreachEmail {
  const { before, after } = middle(c);
  const link = linkFor(c);
  const intro = "I’m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.";
  const ask = "If that sounds good, just reply “yes” and I’ll set everything up. You can also have a look first:";
  const html = wrap(
    P(esc(greeting(c))) +
      P(esc(intro)) +
      before.map((b) => P(esc(b))).join("") +
      `<p style="margin:4px 0 18px;"><img src="${TIERS_IMG}" width="480" alt="${esc(TIERS_TEXT)}" style="display:block;width:480px;max-width:100%;height:auto;border:0;"></p>` +
      (after ? P(esc(after)) : "") +
      P(`${esc(ask)} <a href="${link}" style="color:#1a5fb4;">${esc(link.replace(/^https:\/\//, ""))}</a>`) +
      SIGN_HTML,
  );
  const text = [greeting(c), intro, ...before, TIERS_TEXT, ...(after ? [after] : []), `${ask} ${link}`, SIGN_TEXT, STOP_LINE].join("\n\n");
  return { subject: subjectFor(c), html, text };
}

/** Follow-up 1 (day 5) and the last one (a week later). Sent as a "Re:" of the first email. */
export function followupEmail(c: Contact, n: number): OutreachEmail {
  const lines =
    n <= 1
      ? [`${greeting(c)} just bringing this back to the top of your inbox. If partnering sounds good, reply “yes” and I’ll set it up for you. It only takes a minute.`, "If now isn’t the right time, no worries at all."]
      : [`${greeting(c)} one last note from me. If partnering ever makes sense for you, just reply “yes” and I’ll set it up.`, `Here’s the page again if it helps: ${linkFor(c)}`, "Either way, thank you for reading, and all the best with your celebrations."];
  const html = wrap(lines.map((l) => P(esc(l).replace(/(https:\/\/\S+)/, '<a href="$1" style="color:#1a5fb4;">$1</a>'))).join("") + SIGN_HTML);
  return { subject: `Re: ${subjectFor(c)}`, html, text: [...lines, SIGN_TEXT, STOP_LINE].join("\n\n") };
}

/** Gmail's compose window in hello@, with their address and the subject filled in. */
export const gmailCompose = (to: string, subject: string) =>
  `https://mail.google.com/mail/?authuser=${encodeURIComponent(SENDER)}&view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}`;

/** Puts the email on the clipboard, formatted (with the picture) and as plain text for anything else. */
export function copyEmail(m: OutreachEmail): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write)
    return navigator.clipboard.write([
      new ClipboardItem({ "text/html": new Blob([m.html], { type: "text/html" }), "text/plain": new Blob([m.text], { type: "text/plain" }) }),
    ]);
  return navigator.clipboard?.writeText(m.text) ?? Promise.reject(new Error("no clipboard"));
}
