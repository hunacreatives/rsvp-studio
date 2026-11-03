import type { Resend } from "resend";

// Shared helpers for the email-sending functions. (Files under api/_lib are
// not deployed as endpoints — Vercel skips underscore-prefixed paths.)

/** Escape user-supplied text before it goes into email HTML. */
export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const isEmail = (s: string) => /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(s) && s.length <= 254;

/** Only allow http(s) links into emails (blocks javascript: etc.). */
export const safeUrl = (s: string | undefined | null) => (s && /^https?:\/\//i.test(s) ? s : null);

/**
 * Resend v6 reports failures in the return value instead of throwing, so a
 * plain try/catch never sees them. This throws so callers can react.
 */
// Resend allows a few requests a second: a batch (reminders, a broadcast, invites) that goes past it is told to
// wait. Each send waits and tries again, up to three times, instead of being lost.
const isRateLimited = (e: { name?: string; message?: string; statusCode?: number | null } | null | undefined) =>
  !!e && (e.statusCode === 429 || /rate.?limit|too many requests/i.test(`${e.name ?? ""} ${e.message ?? ""}`));
export async function withRateRetry<T>(send: () => Promise<{ data: T; error: { name?: string; message?: string; statusCode?: number | null } | null }>) {
  for (let attempt = 0; ; attempt++) {
    const { data, error } = await send();
    if (!error) return data;
    if (!isRateLimited(error) || attempt >= 3) throw new Error(`Resend: ${error.message}`);
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1) + Math.random() * 300));
  }
}

// Test accounts (example.com, *.test …) can't receive mail, and Resend rejects the whole send
// for them. They're dropped; a send left with nobody is skipped, not an error.
const UNDELIVERABLE = /@(?:[^@]+\.)?(?:example\.(?:com|net|org)|[^@]+\.(?:test|example|invalid|localhost))$/i;
export const deliverable = (addr: string) => !UNDELIVERABLE.test(addr.trim());
type Payload = Parameters<Resend["emails"]["send"]>[0];
/** The payload with test addresses removed, or null when nobody real is left. */
export function realRecipients<P extends Payload>(payload: P): P | null {
  const to = (Array.isArray(payload.to) ? payload.to : [payload.to]).filter(deliverable);
  if (!to.length) {
    console.warn(`skipped email "${payload.subject}": only test addresses`);
    return null;
  }
  return { ...payload, to: Array.isArray(payload.to) ? to : to[0] };
}

export async function sendChecked(resend: Resend, payload: Payload) {
  const real = realRecipients(payload);
  if (!real) return null;
  return withRateRetry(() => resend.emails.send(real) as Promise<{ data: unknown; error: { name?: string; message?: string; statusCode?: number | null } | null }>);
}

/** Trim and cap a free-text field from a request body. */
export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * A guest's mobile number, normalised: PH numbers (09…, 9…, 639…, +639…) → +639XXXXXXXXX;
 * other countries kept as +<8–15 digits>. Anything else → null.
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!/^\+?[\d\s().-]{7,24}$/.test(s)) return null;
  const digits = s.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^9\d{9}$/.test(digits)) return `+63${digits}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (s.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

const MAP_HOSTS = /^(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl|waze\.com|ul\.waze\.com|maps\.apple\.com)$/i;
/** A map link we're willing to put in an email: https, and only from the big map services. */
export function safeMapUrl(s: string | undefined | null): string | null {
  const url = safeUrl(s);
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!MAP_HOSTS.test(u.hostname)) return null;
    if (/^goo\.gl$/i.test(u.hostname) && !u.pathname.startsWith("/maps")) return null;
    if (/google\./i.test(u.hostname) && !/^maps\./i.test(u.hostname) && !u.pathname.startsWith("/maps")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
