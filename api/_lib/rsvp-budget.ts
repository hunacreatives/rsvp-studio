import type { SupabaseClient } from "@supabase/supabase-js";

// RSVP emails allowed in any 24 hours, across ALL sites (claim_rsvp_emails in
// supabase/free-premium.sql). Resend's free plan stops at 100 a day for
// everything, so the defaults leave ~25 for logins, invoices and support.
// On Resend Pro, raise both in the Vercel env.
export const DAILY_LIMIT = Number(process.env.RSVP_EMAIL_DAILY_LIMIT) || 75;
export const FREE_GUEST_LIMIT = Number(process.env.RSVP_FREE_GUEST_LIMIT) || 50;

/** Room in the 24-hour RSVP email budget? If the check itself fails, send anyway (as before the budget existed). */
export async function claimRsvpEmails(
  db: SupabaseClient,
  kind: "guest" | "host" | "digest",
  premium: boolean,
  eventId: string,
  recipients: number,
): Promise<boolean> {
  const { data, error } = await db.rpc("claim_rsvp_emails", {
    p_kind: kind,
    p_premium: premium,
    p_event: eventId,
    p_recipients: recipients,
    p_limit: DAILY_LIMIT,
    p_free_limit: FREE_GUEST_LIMIT,
  });
  if (error) {
    console.error("claim_rsvp_emails failed — sending anyway", error);
    return true;
  }
  if (data !== true) console.warn("RSVP email budget reached", { kind, premium, eventId });
  return data === true;
}

/** Premium sites and studio projects. If the check fails, behave as Premium (instant emails, as before plans existed). */
export async function isPremium(db: SupabaseClient, eventId: string): Promise<boolean> {
  const { data, error } = await db.rpc("event_is_premium", { p_event: eventId });
  if (error) console.error("event_is_premium failed", error);
  return error ? true : data === true;
}
