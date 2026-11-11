import type { SupabaseClient } from "@supabase/supabase-js";
import { esc } from "./email.js";
import { REPLY_DOMAIN } from "./support-mail.js";

// Studio → Outreach, the email half (supabase/outreach-email.sql). Every morning the daily job sends
// the next businesses that have an email address a short note from Angela, then a follow-up in the
// same thread 5 days later if they haven't answered. Everyone without an email is the team's turn
// (Messenger / Instagram / Viber / a call) in the Studio.
//   • Off until someone presses "Start" in the Studio (outreach_settings.auto_email).
//   • Each business is claimed in the database BEFORE its email goes out, and Resend drops a repeat
//     send with the same key, so a double run can't email anyone twice.
//   • Replies come back through out-<code>@reply.thersvpstudio.com (support-inbound): a "stop" closes
//     them, anything else marks them Replied and is passed on to hello@.

type SendMail = (payload: Parameters<typeof import("./email.js").sendChecked>[1], idempotencyKey?: string) => Promise<unknown>;
export type OutreachContact = { id: string; code: string; name: string; contact_person: string | null; kind: string; city: string | null; email: string | null };

export const OUTREACH_FROM = "Angela, The RSVP Studio <hello@thersvpstudio.com>";
export const outreachReplyAddress = (code: string) => `out-${code}@${REPLY_DOMAIN}`;
export const OUT_ADDR = new RegExp(`^out-([a-f0-9]{8})@${REPLY_DOMAIN.replace(/\./g, "\\.")}$`, "i");
const SITE = "https://thersvpstudio.com";
const TIERS_IMG = `${SITE}/email/partner-tiers.png`;
const FOLLOW_UP_DAYS = 5;
const COLS = "id, code, name, contact_person, kind, city, email";
// Who goes first each morning: the people closest to the hosts, venues last (there are thousands).
const ORDER = ["coordinator", "caterer", "stylist", "photo_video", "beauty", "cakes", "attire", "entertainment", "party", "rentals", "stationery", "other", "venue"];

/** A reply that's a no: just "stop" / "unsubscribe", or a short note saying "remove me", "not interested",
 *  "no thanks", "stop emailing"… ("Can we stop by your office?" is not a no.) */
export function isStop(text: string, subject = "") {
  if (/^\s*(re:\s*)*(stop|unsubscribe)\W*$/i.test(subject)) return true;
  const t = text.trim();
  if (/^(please\s+)?(stop|unsubscribe)(\s+please)?[\s.!]*$/i.test(t)) return true;
  return (
    t.length <= 160 &&
    /\b(unsubscribe|remove (me|us)|take (me|us) off|not interested|no thanks?|no,? thank you|don'?t (email|contact|message) (me|us)|stop (emailing|messaging|contacting|sending))\b/i.test(t)
  );
}

type Audience = "coordinator" | "venue" | "caterer" | "supplier";
const audienceOf = (kind: string): Audience => (kind === "coordinator" || kind === "venue" || kind === "caterer" ? kind : "supplier");

const greeting = (c: OutreachContact) => {
  const person = c.contact_person?.trim().split(/\s+/)[0];
  return person ? `Hi ${person},` : `Hi ${c.name.trim()} team,`;
};
export const linkFor = (c: Pick<OutreachContact, "code">) => `${SITE}/partners?o=${c.code}`;
export const outreachSubject = (c: OutreachContact) => (audienceOf(c.kind) === "venue" ? `For the celebrations at ${c.name.trim()}` : `For your clients at ${c.name.trim()}`).slice(0, 140);

const SHARE = "Your clients get 10% off with your code, and you earn a share of every booking they make:";
/** The paragraphs before the tier picture, and the one after it. */
function middle(c: OutreachContact): { before: string[]; after: string | null } {
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
const STOP_LINE = "If you’d rather not hear from us, reply “stop” and we won’t email again.";
const wrap = (inner: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222222;max-width:560px;">${inner}<p style="margin:22px 0 0;font-size:12px;color:#80868b;">${STOP_LINE}</p></div>`;

/** The first email: a few short paragraphs, the Starter / Silver / Gold picture, one easy ask. */
export function outreachOpener(c: OutreachContact) {
  const { before, after } = middle(c);
  const link = linkFor(c);
  const intro = "I’m Angela from The RSVP Studio. We make event websites for weddings, debuts and birthdays, so guests can see the details and RSVP from one link.";
  const ask = `If that sounds good, just reply “yes” and I’ll set everything up. You can also have a look first:`;
  const html = wrap(
    P(esc(greeting(c))) +
      P(esc(intro)) +
      before.map((b) => P(esc(b))).join("") +
      `<img src="${TIERS_IMG}" width="480" alt="Starter 10% from your first client · Silver 15% after 5 paying clients · Gold 20% after 15 paying clients" style="display:block;width:100%;max-width:480px;height:auto;border:0;margin:4px 0 18px;">` +
      (after ? P(esc(after)) : "") +
      P(`${esc(ask)} <a href="${link}" style="color:#1a5fb4;">${esc(link.replace(/^https:\/\//, ""))}</a>`) +
      SIGN_HTML,
  );
  const text = [
    greeting(c),
    intro,
    ...before,
    "Starter 10% from your first client · Silver 15% after 5 paying clients · Gold 20% after 15 paying clients",
    ...(after ? [after] : []),
    `${ask} ${link}`,
    SIGN_TEXT,
    STOP_LINE,
  ].join("\n\n");
  return { subject: outreachSubject(c), html, text };
}

/** Five days later, in the same thread, only if they haven't answered. */
export function outreachFollowup(c: OutreachContact) {
  const line = `${greeting(c)} just bringing this back to the top of your inbox. If partnering sounds good, reply “yes” and I’ll set it up for you. It only takes a minute.`;
  const html = wrap(P(esc(line)) + P("If now isn’t the right time, no worries at all.") + SIGN_HTML);
  const text = [line, "If now isn’t the right time, no worries at all.", SIGN_TEXT, STOP_LINE].join("\n\n");
  return { subject: `Re: ${outreachSubject(c)}`, html, text };
}

const threadId = (c: Pick<OutreachContact, "code">) => `<out-${c.code}@thersvpstudio.com>`;
/** One email, to them, replies to their own address (so we know who answered), unsubscribe by reply. */
export function outreachPayload(c: OutreachContact, step: "opener" | "followup", to = c.email!) {
  const m = step === "opener" ? outreachOpener(c) : outreachFollowup(c);
  const reply = outreachReplyAddress(c.code);
  return {
    from: OUTREACH_FROM,
    to,
    replyTo: reply,
    subject: m.subject,
    html: m.html,
    text: m.text,
    headers: {
      "List-Unsubscribe": `<mailto:${reply}?subject=stop>`,
      ...(step === "opener" ? { "Message-ID": threadId(c) } : { "In-Reply-To": threadId(c), References: threadId(c) }),
    },
  };
}

const manilaDayStart = () => {
  const d = new Date(Date.now() + 8 * 3600_000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 8 * 3600_000).toISOString();
};

/** The morning batch: follow-ups that are due, then up to the daily limit of first emails. */
export async function sendOutreachEmails(db: SupabaseClient, sendMail: SendMail, opts: { deadline: number }) {
  const report = { on: false, sent: 0, followups: 0, errors: [] as string[] };
  const { data: settings, error } = await db.from("outreach_settings").select("auto_email, daily_limit").eq("id", 1).maybeSingle();
  if (error) {
    if (!/outreach_settings/.test(error.message)) report.errors.push(`outreach: ${error.message}`);
    return report; // outreach-email.sql not run yet
  }
  if (!settings?.auto_email) return report;
  report.on = true;
  const now = () => new Date().toISOString();

  // 1. Follow-ups (don't count toward the daily limit): emailed 5+ days ago, no answer, not bounced.
  const due = new Date(Date.now() - FOLLOW_UP_DAYS * 86_400_000).toISOString();
  const { data: dueRows, error: dueErr } = await db
    .from("outreach_contacts")
    .select(COLS)
    .eq("status", "messaged")
    .eq("channel", "email_auto")
    .is("followed_up_at", null)
    .is("bounced_at", null)
    .not("email", "is", null)
    .lt("messaged_at", due)
    .order("messaged_at", { ascending: true })
    .limit(60);
  if (dueErr) report.errors.push(`outreach follow-ups: ${dueErr.message}`);
  for (const c of (dueRows ?? []) as OutreachContact[]) {
    if (Date.now() > opts.deadline) break;
    const { data: claimed } = await db.from("outreach_contacts").update({ followed_up_at: now() }).eq("id", c.id).eq("status", "messaged").is("followed_up_at", null).select("id");
    if (!claimed?.length) continue;
    try {
      await sendMail(outreachPayload(c, "followup"), `outreach-${c.id}-followup`);
      report.followups++;
    } catch (e) {
      await db.from("outreach_contacts").update({ followed_up_at: null }).eq("id", c.id);
      report.errors.push(`outreach follow-up ${c.id}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 2. First emails, up to the daily limit (counting any already sent today, so a rerun tops up).
  const { count: sentToday } = await db.from("outreach_contacts").select("id", { count: "exact", head: true }).eq("channel", "email_auto").gte("messaged_at", manilaDayStart());
  let left = Math.max(0, Math.min(200, settings.daily_limit ?? 30) - (sentToday ?? 0));
  if (!left) return report;
  const pool: OutreachContact[] = [];
  for (const kind of ORDER) {
    if (pool.length >= left * 4) break;
    const { data, error: e } = await db
      .from("outreach_contacts")
      .select(COLS)
      .eq("status", "to_message")
      .eq("kind", kind)
      .not("email", "is", null)
      .is("bounced_at", null)
      .order("created_at", { ascending: true })
      .limit(left * 4);
    if (e) {
      report.errors.push(`outreach pick: ${e.message}`);
      break;
    }
    pool.push(...((data ?? []) as OutreachContact[]));
  }
  // Spread the day across towns: one per town first, then fill up in order.
  const towns = new Set<string>();
  const first = pool.filter((c) => {
    const t = (c.city ?? "").trim().toLowerCase();
    if (!t || towns.has(t)) return false;
    towns.add(t);
    return true;
  });
  const picks = [...first, ...pool.filter((c) => !first.includes(c))];
  for (const c of picks) {
    if (!left || Date.now() > opts.deadline) break;
    const { data: claimed } = await db
      .from("outreach_contacts")
      .update({ status: "messaged", channel: "email_auto", messaged_at: now() })
      .eq("id", c.id)
      .eq("status", "to_message")
      .select("id");
    if (!claimed?.length) continue;
    try {
      await sendMail(outreachPayload(c, "opener"), `outreach-${c.id}-opener`);
      report.sent++;
      left--;
    } catch (e) {
      await db.from("outreach_contacts").update({ status: "to_message", channel: null, messaged_at: null }).eq("id", c.id);
      report.errors.push(`outreach email ${c.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return report;
}

/** Resend says an outreach email bounced or was marked as spam: never email them again. With a page or
 *  a mobile they go back to the team's list; otherwise they're closed. */
export async function outreachBounced(db: SupabaseClient, addresses: string[], complaint: boolean) {
  const emails = addresses.map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return 0;
  const { data } = await db.from("outreach_contacts").select("id, fb_key, ig_key, phone, website, status").in("email", emails).eq("channel", "email_auto");
  let n = 0;
  for (const c of (data ?? []) as { id: string; fb_key: string | null; ig_key: string | null; phone: string | null; website: string | null; status: string }[]) {
    const other = !!(c.fb_key || c.ig_key || (c.phone ?? "").replace(/\D/g, "").length >= 7);
    const patch = complaint
      ? { status: "not_interested", stop_reason: "marked our email as spam", bounced_at: new Date().toISOString() }
      : other && c.status === "messaged"
        ? { status: "to_message", channel: null, messaged_at: null, followed_up_at: null, bounced_at: new Date().toISOString(), stop_reason: "email bounced" }
        : { status: c.status === "messaged" ? "skipped" : c.status, bounced_at: new Date().toISOString(), stop_reason: "email bounced" };
    await db.from("outreach_contacts").update(patch).eq("id", c.id);
    n++;
  }
  return n;
}
