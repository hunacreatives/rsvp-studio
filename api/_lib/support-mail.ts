import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Resend } from "resend";
import { esc, sendChecked } from "./email.js";

// Shared by the email-sending functions (notify, support-cron, support-rating):
// the branded email layout, support request wording, and signed rating links.

export const FROM = "The RSVP Studio <hello@thersvpstudio.com>";
export const STUDIO_INBOX = "hello@thersvpstudio.com";
export const SERVICE_FOOTER = "You’re receiving this because you contacted The RSVP Studio support. Reply in your dashboard or to this email.";
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

export function layout(heading: string, body: string, cta: { label: string; url: string } | null, footer = SETTINGS_FOOTER) {
  return `<!doctype html><html><head><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;background:#f5f5f2;" bgcolor="#f5f5f2">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f5f2" style="background:#f5f5f2;padding:32px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:540px;background:#ffffff;border-radius:20px;padding:36px 32px;font-family:Inter,Arial,sans-serif;color:#000727 !important;">
<tr><td style="font-family:Georgia,serif;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#868697 !important;">The RSVP Studio</td></tr>
<tr><td style="padding-top:14px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#000727 !important;">${heading}</td></tr>
<tr><td style="padding-top:14px;font-size:15px;line-height:1.6;color:#25265e !important;">${body}</td></tr>
${cta ? `<tr><td style="padding-top:26px;"><a href="${cta.url}" style="display:inline-block;background:#2f61d5;color:#ffffff !important;text-decoration:none;border-radius:999px;padding:13px 26px;font-size:14px;">${cta.label}</a></td></tr>` : ""}
<tr><td style="padding-top:30px;font-size:12px;color:#868697 !important;">${footer}</td></tr>
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
export const firstName = (name: string | null | undefined) => esc((name || "").split(" ")[0] || "there");

/** Thread every email about one request together in Gmail/Outlook. */
export const threadHeaders = (n: number, auto = false): Record<string, string> => ({
  References: `<sup-${n}@thersvpstudio.com>`,
  "In-Reply-To": `<sup-${n}@thersvpstudio.com>`,
  ...(auto ? { "Auto-Submitted": "auto-replied", "X-Auto-Response-Suppress": "All" } : {}),
});

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
