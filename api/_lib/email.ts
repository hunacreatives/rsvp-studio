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
export async function sendChecked(resend: Resend, payload: Parameters<Resend["emails"]["send"]>[0]) {
  const { data, error } = await resend.emails.send(payload);
  if (error) throw new Error(`Resend: ${error.message}`);
  return data;
}

/** Trim and cap a free-text field from a request body. */
export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
