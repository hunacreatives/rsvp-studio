import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Resend } from "resend";
import { esc, sendChecked } from "./email.js";

// Shared by the email-sending functions (notify, support-cron, support-rating):
// the branded email layout, support request wording, and signed rating links.

export const FROM = "The RSVP Studio <hello@thersvpstudio.com>";
export const STUDIO_INBOX = "hello@thersvpstudio.com";

// Email replies (Phase 3B). Off until launch: Resend receiving on REPLY_DOMAIN,
// the /api/support-inbound webhook, then SUPPORT_EMAIL_REPLIES=on in Vercel.
export const REPLY_DOMAIN = "reply.thersvpstudio.com";
export const emailRepliesOn = () => process.env.SUPPORT_EMAIL_REPLIES === "on";

export const SERVICE_FOOTER = "You’re receiving this because you contacted The RSVP Studio support. To reply, open your dashboard.";
/** Footer for emails about a request: says replying by email works once it does. */
export const serviceFooter = () =>
  emailRepliesOn()
    ? "You’re receiving this because you contacted The RSVP Studio support. Just reply to this email — it goes straight to your request — or reply in your dashboard."
    : SERVICE_FOOTER;
const SETTINGS_FOOTER = "You’re receiving this because of your notification settings. Change them anytime under Account → Notifications.";

/** Sends through Resend, or logs and skips when there's no key (local dev, preview builds). */
export function makeSendMail(resend: Resend | null) {
  return (payload: Parameters<typeof sendChecked>[1], idempotencyKey?: string) => {
    if (!resend) return Promise.resolve(console.warn(`RESEND_API_KEY not set — skipped email "${payload.subject}" to ${payload.to}`));
    if (!idempotencyKey) return sendChecked(resend, payload);
    // Resend drops a repeat send with the same key for 24h — a double cron run can't double-email.
    return resend.emails.send(payload, { idempotencyKey }).then(({ data, error }) => {
      if (error) throw new Error(`Resend: ${error.message}`);
      return data;
    });
  };
}

// Every service email (support, billing, website notices, domains, event updates, the RSVP
// summary) in the brand: logo, serif heading, navy button, and our footer links. Customer
// emails also carry a small "more from The RSVP Studio" card (an ad for what else we make):
// emails about a problem, a request or money pass { promo: false }; emails only the team
// receives pass { ad: false } (no card, no sign-off, the team footer).
const SITE_URL = "https://thersvpstudio.com";
/** Our sign-off on emails to hosts and clients (never on guests' emails: those are the couple's). */
export const TAGLINE = `<p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:15px;line-height:1.5;color:#4a4b63 !important;">Your celebration is our celebration, too.</p>`;
const STAFF_FOOTER = "Sent to The RSVP Studio team.";

/**
 * The <head> every branded email shares: light mode only (Gmail and Apple Mail would otherwise
 * invert the colours and guess wrong), plus the narrow-screen rules. The f* classes pin each
 * colour in dark mode; .pad/.lpad/.col/.lh are the phone layout.
 */
export function emailHead() {
  return `<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" />
<style>:root{color-scheme:light only;supported-color-schemes:light only}
@media (prefers-color-scheme: dark){.fi{color:#000727!important}.fb{color:#4a4b63!important}.fs{color:#868697!important}.fw{color:#ffffff!important}.fcard{background:#ffffff!important}.fpage{background:#f3f3f5!important}.fpaper{background:#fbfaf6!important}.fnavy{background:#000727!important}}
@media only screen and (max-width:520px){.pad,.lpad{padding-left:24px!important;padding-right:24px!important}.col{display:block!important;width:100%!important;padding:0 0 14px!important}.lh{font-size:22px!important}}</style>`;
}

/** The inbox preview line (hidden in the email itself). Padding stops the client pulling in the footer. */
export function preheaderHtml(text: string) {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${text}${"&#847;&zwnj;&nbsp;".repeat(30)}</div>`;
}
/** A preview line from the start of the body: its words, without the markup, at most ~120 characters. */
function previewOf(html: string) {
  const words = html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").split(/\s+/).filter(Boolean);
  let out = "";
  for (const w of words) {
    if ((out + " " + w).length > 120) return `${out}…`;
    out = out ? `${out} ${w}` : w;
  }
  return out;
}

/** One button style everywhere: a navy pill, sentence case. */
export function navyButton(label: string, url: string, align: "center" | "left" = "center") {
  return `<table role="presentation" align="${align}" cellpadding="0" cellspacing="0"><tr><td bgcolor="#000727" class="fnavy" style="background:#000727;border-radius:999px;"><a href="${url}" class="fw" style="display:inline-block;padding:13px 26px;color:#ffffff !important;font-size:15px;font-weight:600;text-decoration:none;">${label}</a></td></tr></table>`;
}

/** The footer every branded email shares: sign-off, social, site links, why they got it. */
export function brandFooter(footer: string, opts: { tagline?: boolean } = {}) {
  const muted = `class="fs" style="color:#868697 !important;text-decoration:none;"`;
  return `<tr><td align="center" style="padding:0 32px 34px;">
${opts.tagline === false ? "" : TAGLINE}
<table role="presentation" width="160" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #dcdce2;font-size:0;line-height:0;">&nbsp;</td></tr></table>
<p class="fs" style="margin:18px 0 12px;font-size:12px;color:#868697 !important;"><a href="https://www.instagram.com/rsvpstudioo/" ${muted}>Instagram</a>&nbsp;&middot;&nbsp;<a href="https://www.facebook.com/p/The-RSVP-Studio-61590604769707/" ${muted}>Facebook</a></p>
<p class="fs" style="margin:0 0 12px;font-size:12px;color:#868697 !important;"><a href="${SITE_URL}" ${muted}>The RSVP Studio</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${SITE_URL}/services" ${muted}>Services</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${SITE_URL}/portfolio" ${muted}>Our work</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${SITE_URL}/faqs" ${muted}>FAQs</a></p>
<p class="fs" style="margin:0;font-size:11px;line-height:1.6;color:#a0a0ad !important;">${footer}<br />The RSVP Studio, a Huna Creatives brand &middot; Philippines</p>
</td></tr>`;
}

function moreFromUs() {
  const link = (label: string, path: string) => `<a href="${SITE_URL}${path}" style="color:#2f61d5 !important;text-decoration:none;">${label}</a>`;
  return `<tr><td style="padding-top:30px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#eef3ff" style="background:#eef3ff;border-radius:18px;padding:22px 20px;text-align:center;">
<img src="${SITE_URL}/email/partner-characters.png" alt="" width="120" style="display:block;margin:0 auto 12px;width:120px;height:auto;border:0;" />
<p style="margin:0;color:#2f61d5 !important;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;">More from The RSVP Studio</p>
<p class="fi" style="margin:8px 0 6px;color:#000727 !important;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.3;">Make it extra special</p>
<p class="fb" style="margin:0 0 12px;color:#4a4b63 !important;font-size:14px;line-height:1.6;">Monograms, printed invitations and thank-you cards,<br>designed to match your&nbsp;event.</p>
<p style="margin:0;font-size:13px;line-height:1.8;">${link("Monograms", "/services/monogram")}&nbsp;&middot;&nbsp;${link("Invitations", "/services/stationery")}&nbsp;&middot;&nbsp;${link("Thank-you cards", "/enquire?service=stationery&amp;package=Thank-you%20cards#start")}&nbsp;&middot;&nbsp;${link("Partner program", "/partners")}</p>
</td></tr></table></td></tr>`;
}

// The heading and button are centred under the logo; the body copy stays left. Letters
// that open with "Hi <name>," pass { letter: true } and keep everything left.
// `preheader`: the inbox preview line; by default, the start of the body.
export function layout(
  heading: string,
  body: string,
  cta: { label: string; url: string } | null,
  footer?: string,
  opts: { ad?: boolean; promo?: boolean; letter?: boolean; preheader?: string } = {},
) {
  const team = opts.ad === false;
  const align = opts.letter ? "left" : "center";
  return `<!doctype html><html><head>${emailHead()}</head>
<body class="fpage" style="margin:0;padding:0;background:#f3f3f5;" bgcolor="#f3f3f5">
${preheaderHtml(opts.preheader ?? previewOf(body))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f3f5" class="fpage" style="background:#f3f3f5;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" class="fcard" style="max-width:560px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#000727 !important;">
<tr><td align="center" style="padding:34px 32px 6px;"><a href="${SITE_URL}"><img src="${SITE_URL}/brand/logotype-dark.png" alt="The RSVP Studio" width="118" style="display:block;height:auto;border:0;" /></a></td></tr>
<tr><td class="lpad" style="padding:22px 48px 34px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td class="lh fi" align="${align}" style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:#000727 !important;text-align:${align};">${heading}</td></tr>
<tr><td class="fb" style="padding-top:14px;font-size:15px;line-height:1.65;color:#3c3d57 !important;">${body}</td></tr>
${cta ? `<tr><td align="${align}" style="padding-top:26px;">${navyButton(cta.label, cta.url, align)}</td></tr>` : ""}
${team || opts.promo === false ? "" : moreFromUs()}
</table></td></tr>
${brandFooter(footer ?? (team ? STAFF_FOOTER : SETTINGS_FOOTER), { tagline: !team })}
</table></td></tr></table></body></html>`;
}


// The partner welcome has its own look (same brand, set apart from service emails):
// a soft blue page, the three characters on top, a "Partner program" label, navy button.
export function partnerLayout(site: string, heading: string, body: string, cta: { label: string; url: string }, footer: string) {
  return `<!doctype html><html><head>${emailHead()}</head>
<body style="margin:0;padding:0;background:#eef3ff;" bgcolor="#eef3ff">
${preheaderHtml(previewOf(body))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eef3ff" style="background:#eef3ff;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;"><tr><td align="center" style="padding:0 0 18px;">
<img src="${site}/email/partner-characters.png" width="220" alt="" style="display:block;width:220px;max-width:70%;height:auto;border:0;" />
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" class="fcard" style="max-width:560px;background:#ffffff;border-radius:24px;font-family:Inter,Arial,sans-serif;color:#000727 !important;">
<tr><td class="pad" style="padding:36px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#2f61d5 !important;text-align:center;">The RSVP Studio</td></tr>
<tr><td align="center" class="fi" style="padding-top:12px;font-family:Georgia,serif;font-size:28px;line-height:1.25;color:#000727 !important;text-align:center;">${heading}</td></tr>
<tr><td class="fb" style="padding-top:14px;font-size:15px;line-height:1.65;color:#25265e !important;">${body}</td></tr>
<tr><td align="center" style="padding:28px 0 30px;">${navyButton(cta.label, cta.url)}</td></tr>
</table></td></tr>
${brandFooter(footer)}
</table></td></tr></table></body></html>`;
}

// ---------------------------------------------------------------------------
// Support requests

export const SUPPORT_TOPIC: Record<string, string> = {
  website: "Website",
  invitations: "Invitations & RSVPs",
  stationery: "Printed stationery",
  billing: "Billing & payments",
  account: "Account & login",
  other: "Something else",
};
export const topicOf = (c: string | null | undefined) => SUPPORT_TOPIC[c ?? "other"] ?? "Support";
export const code = (n: number) => `SUP-${n}`;
/** How customers see the number: "Request #1042" (the Studio keeps SUP-1042). */
export const reqCode = (n: number) => `Request #${n}`;
export const firstName = (name: string | null | undefined) => esc((name || "").split(" ")[0] || "there");

/**
 * Thread every email about one request together in Gmail/Outlook. With email replies on,
 * the request's private key rides along too, so a reply can be matched by its headers
 * even if the Reply-To address was changed.
 */
export const threadHeaders = (n: number, auto = false, key?: string | null): Record<string, string> => {
  const ref = `<sup-${n}@thersvpstudio.com>`;
  const keyed = key && emailRepliesOn() ? ` <sup-${n}.${key}@thersvpstudio.com>` : "";
  return {
    References: ref + keyed,
    "In-Reply-To": ref,
    ...(auto ? { "Auto-Submitted": "auto-replied", "X-Auto-Response-Suppress": "All" } : {}),
  };
};

/** sup-1042.<key>@reply.thersvpstudio.com — where a customer's reply about this request goes. */
export const replyAddress = (n: number, key: string) => `sup-${n}.${key}@${REPLY_DOMAIN}`;

/** Reply-To for an email to the customer about a request (nothing while email replies are off). */
export const customerReplyTo = (t: { ticket_number: number | null; reply_key?: string | null }) =>
  emailRepliesOn() && t.ticket_number && t.reply_key ? replyAddress(t.ticket_number, t.reply_key) : undefined;

const MANILA = 8 * 3_600_000;
const manilaDay = (t: Date) => new Date(t.getTime() + MANILA).toISOString().slice(0, 10);

/** Outside Mon–Fri 9 AM–6 PM Manila (or on a holiday): when we're next in, in words. */
export function backAt(now = new Date(), holidays: Set<string> = new Set()): string | null {
  const m = new Date(now.getTime() + MANILA);
  const open = (d: Date) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5 && !holidays.has(d.toISOString().slice(0, 10));
  if (open(m) && m.getUTCHours() >= 9 && m.getUTCHours() < 18) return null;
  let add = open(m) && m.getUTCHours() < 9 ? 0 : 1;
  for (let guard = 0; guard < 14 && !open(new Date(m.getTime() + add * 86_400_000)); guard++) add++;
  if (add === 0) return "at 9 AM";
  if (add === 1) return "tomorrow at 9 AM";
  return `${new Date(m.getTime() + add * 86_400_000).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })} at 9 AM`;
}

/**
 * When a reply is due: 9 working hours (1 business day) after `since`,
 * counting Mon–Fri 9 AM–6 PM Manila and skipping holidays.
 * Keep in step with src/pages/account/portal/support.ts (replyDueAt).
 */
export function replyDueAt(since: string | Date, holidays: Set<string> = new Set()): Date {
  let left = 9 * 3_600_000;
  let t = new Date(new Date(since).getTime() + MANILA);
  for (let guard = 0; guard < 60 && left > 0; guard++) {
    const y = t.getUTCFullYear(), mo = t.getUTCMonth(), d = t.getUTCDate();
    const start = Date.UTC(y, mo, d, 9), end = Date.UTC(y, mo, d, 18);
    const closed = t.getUTCDay() === 0 || t.getUTCDay() === 6 || holidays.has(t.toISOString().slice(0, 10));
    if (closed || t.getTime() >= end) {
      t = new Date(Date.UTC(y, mo, d + 1, 9));
      continue;
    }
    const from = Math.max(t.getTime(), start);
    const take = Math.min(left, end - from);
    left -= take;
    t = new Date(from + take);
  }
  return new Date(t.getTime() - MANILA);
}

export const isManilaWeekday = (now = new Date(), holidays: Set<string> = new Set()) => {
  const m = new Date(now.getTime() + MANILA);
  return m.getUTCDay() >= 1 && m.getUTCDay() <= 5 && !holidays.has(manilaDay(now));
};

// ---------------------------------------------------------------------------
// Signed rating links ("How did we do?"): valid 14 days, can't be forged.

export const RATINGS = ["great", "okay", "not_good"] as const;
export type Rating = (typeof RATINGS)[number];
export const RATING_LABEL: Record<Rating, string> = { great: "Great", okay: "Okay", not_good: "Not good" };
const RATING_DAYS = 14;

const ratingKey = () => createHash("sha256").update(`rsvp-rating:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest();
const b64 = (b: Buffer) => b.toString("base64url");

export function ratingToken(threadId: string, issuedAt = new Date()) {
  const payload = b64(Buffer.from(`${threadId}.${Math.floor(issuedAt.getTime() / 1000)}`));
  const sig = b64(createHmac("sha256", ratingKey()).update(payload).digest().subarray(0, 18));
  return `${payload}.${sig}`;
}

/** The request a rating link is for, if the link is genuine and not expired. */
export function readRatingToken(token: string): { threadId: string; issuedAt: Date } | null {
  const [payload, sig] = (token || "").split(".");
  if (!payload || !sig) return null;
  const want = createHmac("sha256", ratingKey()).update(payload).digest().subarray(0, 18);
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  const [threadId, issued] = Buffer.from(payload, "base64url").toString().split(".");
  const issuedAt = new Date(Number(issued) * 1000);
  if (!threadId || Number.isNaN(issuedAt.getTime()) || Date.now() - issuedAt.getTime() > RATING_DAYS * 86_400_000) return null;
  return { threadId, issuedAt };
}

/** Three buttons for the resolved email. Each only opens the rating page — nothing is recorded until they press Submit there. */
export function ratingButtons(origin: string, threadId: string) {
  const t = ratingToken(threadId);
  const btn = (r: Rating, emoji: string) =>
    `<a href="${origin}/rate?t=${t}&amp;r=${r}" style="display:inline-block;margin:0 6px 8px 0;border:1px solid #d9d9e3;border-radius:999px;padding:10px 16px;font-size:14px;color:#000727 !important;text-decoration:none;">${emoji} ${RATING_LABEL[r]}</a>`;
  return `<br><br><strong>How did we do?</strong><br><div style="padding-top:10px;">${btn("great", "😊")}${btn("okay", "😐")}${btn("not_good", "🙁")}</div>`;
}

// ---------------------------------------------------------------------------
// Follow-up email unsubscribe links (api/notify.ts?op=unsubscribe). Signed per
// person, no expiry: an old email's link still works.

const tipsKey = () => createHash("sha256").update(`rsvp-tips:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest();

export function tipsToken(profileId: string) {
  const payload = b64(Buffer.from(profileId));
  const sig = b64(createHmac("sha256", tipsKey()).update(payload).digest().subarray(0, 18));
  return `${payload}.${sig}`;
}

/** Where after-event emails ask for a recommendation (the page's Reviews tab). */
export const FACEBOOK_REVIEWS_URL = "https://www.facebook.com/profile.php?id=61590604769707&sk=reviews";
/** The signed part of /go/review/<token>: which event's email the click came from. */
export const reviewToken = (eventId: string) => tipsToken(`review:${eventId}`);

/** The person an unsubscribe link is for, if the link is genuine. */
export function readTipsToken(token: string): string | null {
  const id = readSigned(token);
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/** The event a /go/review/<token> link is for, if the link is genuine (never an unsubscribe one). */
export function readReviewToken(token: string): string | null {
  const v = readSigned(token);
  const id = v?.startsWith("review:") ? v.slice(7) : null;
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/** What a signed token carries, if its signature checks out. */
function readSigned(token: string): string | null {
  const [payload, sig] = (token || "").split(".");
  if (!payload || !sig) return null;
  const want = createHmac("sha256", tipsKey()).update(payload).digest().subarray(0, 18);
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  return Buffer.from(payload, "base64url").toString();
}
