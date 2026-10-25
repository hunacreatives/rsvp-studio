import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "./email.js";

// Texts (supabase/sms.sql), sent through Semaphore (semaphore.co, Philippine numbers only).
// A paid add-on per event: hosts buy a pack (100 / 300 / 600 texts), Premium sites get 50
// included, and texting is off until the host switches it on. Each text claims its credits
// first (claim_sms: all or nothing, never below zero), is written to message_log, and is
// refunded if Semaphore refuses it or reports it failed (smsDaily).
//
// Off until SEMAPHORE_API_KEY is in Vercel: until then every text is logged as "skipped"
// and no credits are taken. SEMAPHORE_SENDER is the approved sender name (RSVPSTUDIO);
// without it Semaphore sends as its default "SEMAPHORE".

const API = "https://api.semaphore.co/api/v4";
export const smsLive = () => !!process.env.SEMAPHORE_API_KEY;

export const SMS_PACKS = { 100: 19_900, 300: 54_900, 600: 109_900 } as const; // texts → centavos
export type SmsPack = keyof typeof SMS_PACKS;
export const isSmsPack = (n: unknown): n is SmsPack => n === 100 || n === 300 || n === 600;

export type SmsKind = "rsvp_confirm" | "reminder" | "broadcast" | "host_alert";

// GSM-7: what one plain text can carry (anything else makes it a Unicode text, ~70 a part).
const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€"; // these count as two

/** Our curly quotes and dashes in their plain forms, so a message doesn't become Unicode by accident. */
export function plainText(s: string) {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Credits one text takes: 160 characters is one (153 a part after that); Unicode is 70 (67). */
export function segmentsOf(text: string) {
  let len = 0;
  let unicode = false;
  for (const ch of text) {
    if (GSM.includes(ch)) len += 1;
    else if (GSM_EXT.includes(ch)) len += 2;
    else unicode = true;
  }
  if (unicode) {
    const n = [...text].length;
    return n <= 70 ? 1 : Math.ceil(n / 67);
  }
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

/** A Philippine mobile (any way it was typed) → 639XXXXXXXXX, what Semaphore takes. Other countries: null. */
export function phNumber(phone: string | null | undefined) {
  const n = normalizePhone(phone ?? "");
  return n && /^\+639\d{9}$/.test(n) ? n.slice(1) : null;
}

type Recipient = { to: string; rsvpId?: string | null };
export type SmsResult = { status: "off" | "no_credits" | "skipped" | "sent" | "failed" | "none"; texts: number; credits: number };

/**
 * Sends one message to up to 1,000 numbers. Guest texts (everything but host_alert) need texting
 * switched on. Confirmations and reminders go once per reply (message_log's unique index): a
 * repeat is dropped before anything is claimed.
 */
export async function sendTexts(
  db: SupabaseClient,
  o: { eventId: string; kind: SmsKind; message: string; recipients: Recipient[]; broadcastId?: string | null },
): Promise<SmsResult> {
  const message = plainText(o.message);
  const seen = new Set<string>();
  let list = o.recipients
    .map((r) => ({ ...r, to: phNumber(r.to) }))
    .filter((r): r is { to: string; rsvpId?: string | null } => !!r.to && !seen.has(r.to) && !!seen.add(r.to))
    .slice(0, 1000);
  if (!list.length || !message) return { status: "none", texts: 0, credits: 0 };
  const guest = o.kind !== "host_alert";
  const once = o.kind === "rsvp_confirm" || o.kind === "reminder";

  const { data: acct } = await db.from("event_sms").select("enabled, credits, used").eq("event_id", o.eventId).maybeSingle();
  if (guest && !acct?.enabled) return { status: "off", texts: 0, credits: 0 };
  const segs = segmentsOf(message);

  // Write the log rows first: for once-only texts the unique index drops repeats here.
  const rows = list.map((r) => ({
    event_id: o.eventId,
    channel: "sms",
    kind: o.kind,
    rsvp_id: once ? (r.rsvpId ?? null) : null,
    broadcast_id: o.broadcastId ?? null,
    to_address: `+${r.to}`,
    segments: segs,
    status: "queued",
  }));
  const { data: logged, error: logErr } = once
    ? await db.from("message_log").upsert(rows, { onConflict: "rsvp_id,kind,channel", ignoreDuplicates: true }).select("id, to_address")
    : await db.from("message_log").insert(rows).select("id, to_address");
  if (logErr) throw new Error(`message_log: ${logErr.message}`);
  const logIds = new Map((logged ?? []).map((l) => [String(l.to_address).slice(1), l.id as string]));
  list = list.filter((r) => logIds.has(r.to));
  if (!list.length) return { status: "none", texts: 0, credits: 0 };
  const ids = [...logIds.values()];
  const need = list.length * segs;

  if (!smsLive()) {
    await db.from("message_log").update({ status: "skipped", error: "SEMAPHORE_API_KEY not set" }).in("id", ids);
    console.warn(`SEMAPHORE_API_KEY not set — skipped ${list.length} ${o.kind} text(s) for ${o.eventId}`);
    return { status: "skipped", texts: list.length, credits: need };
  }

  const { data: claimed } = await db.rpc("claim_sms", { p_event: o.eventId, p_n: need, p_guest: guest });
  if (claimed !== true) {
    // Nothing went: free the once-only slots so a later run can try again after a top-up.
    await db.from("message_log").delete().in("id", ids);
    return { status: "no_credits", texts: 0, credits: 0 };
  }

  try {
    const res = await fetch(`${API}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: process.env.SEMAPHORE_API_KEY,
        number: list.map((r) => r.to).join(","),
        message,
        ...(process.env.SEMAPHORE_SENDER ? { sendername: process.env.SEMAPHORE_SENDER } : {}),
      }),
    });
    const out = (await res.json().catch(() => null)) as unknown;
    if (!res.ok || !Array.isArray(out)) throw new Error(`Semaphore ${res.status}: ${JSON.stringify(out).slice(0, 300)}`);
    // One entry per number: { message_id, recipient, status }.
    const byNumber = new Map((out as { message_id?: number; recipient?: string; status?: string }[]).map((m) => [String(m.recipient ?? "").replace(/^\+/, ""), m]));
    let refused = 0;
    await Promise.all(
      list.map((r) => {
        const m = byNumber.get(r.to);
        const failed = !m || /fail|refund/i.test(String(m.status));
        if (failed) refused++;
        return db
          .from("message_log")
          .update(failed ? { status: "refunded", error: m ? String(m.status) : "not in Semaphore's reply" } : { status: "sent", provider_id: String(m!.message_id ?? "") })
          .eq("id", logIds.get(r.to)!);
      }),
    );
    if (refused) await db.rpc("refund_sms", { p_event: o.eventId, p_n: refused * segs });
    return { status: refused === list.length ? "failed" : "sent", texts: list.length - refused, credits: (list.length - refused) * segs };
  } catch (e) {
    await db.rpc("refund_sms", { p_event: o.eventId, p_n: need });
    await db.from("message_log").update({ status: "refunded", error: (e instanceof Error ? e.message : String(e)).slice(0, 500) }).in("id", ids);
    console.error("SMS send failed", o.eventId, o.kind, e);
    return { status: "failed", texts: 0, credits: 0 };
  }
}

/** First name, the way the texts greet a guest. */
const firstOf = (name: string) => plainText(name).split(/\s+/)[0] || "there";

/** "Sat, Dec 12, 4:00 PM" in Manila, from YYYY-MM-DD[THH:MM]. */
export function shortWhen(iso: string | null | undefined) {
  const day = (iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  const hhmm = /T(\d{2}:\d{2})/.exec(iso ?? "")?.[1];
  const d = new Date(`${day}T${hhmm ?? "12:00"}:00+08:00`);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Manila" });
  return hhmm ? `${date}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}` : date;
}

/** Keeps a text inside `max` credits by dropping the optional parts, last first. */
function fit(parts: (string | false | null | undefined)[], optional: number[], max = 2) {
  const keep = parts.map((p) => (p ? p : ""));
  const join = () => keep.filter(Boolean).join(" ");
  for (const i of optional) {
    if (segmentsOf(plainText(join())) <= max) break;
    keep[i] = "";
  }
  return plainText(join());
}

const link = (slug: string) => `thersvpstudio.com/invite/${slug}`;

/** "You're on the list" by text, for a guest who replied with a mobile number only. */
export function confirmText(o: { guestName: string; eventName: string; hosts: string; slug: string; attending: boolean | null; when?: string }) {
  if (o.attending === false) return fit([`Hi ${firstOf(o.guestName)}, thank you for letting us know about ${o.eventName}. We'll miss you.`, `- ${o.hosts}`], [1]);
  return fit([`Hi ${firstOf(o.guestName)}, you're on the list for ${o.eventName}${o.when ? `, ${o.when}` : ""}.`, `Details: ${link(o.slug)}`, `- ${o.hosts}`], [2]);
}

/** The 2-day reminder by text. */
export function reminderText(o: { guestName: string; eventName: string; hosts: string; slug: string; weekday: string; time?: string; venue?: string }) {
  // The longest version that fits one text: the sign-off goes first, then the venue (the link
  // has the map). Nothing fits: with the venue, over two.
  const head = `Hi ${firstOf(o.guestName)}, see you on ${o.weekday} for ${o.eventName}${o.time ? ` at ${o.time}` : ""}`;
  const where = o.venue ? `${head}, ${o.venue}.` : `${head}.`;
  const tail = `Map and details: ${link(o.slug)}`;
  const tries = [`${where} ${tail} - ${o.hosts}`, `${where} ${tail}`, `${head}. ${tail}`].map(plainText);
  return tries.find((t) => segmentsOf(t) === 1) ?? tries[1];
}

/** A host's own alert for one reply (Premium). */
export function hostAlertText(o: { guestName: string; eventName: string; attending: boolean | null; guestCount: number | null; updated: boolean; eventId: string }) {
  const what = o.attending === false ? "can't make it" : o.attending ? `is coming${o.guestCount && o.guestCount > 1 ? ` (${o.guestCount})` : ""}` : "replied";
  return fit([`${o.updated ? "Updated RSVP" : "New RSVP"}: ${o.guestName} ${what} - ${o.eventName}.`, `thersvpstudio.com/account/projects/${o.eventId}?tab=guests`], [1], 1);
}

/** A host's broadcast by text: their message, signed, so guests know who it's from. */
export const broadcastText = (message: string, hosts: string) => plainText(`${message.trim()} - ${hosts}`);

/**
 * Daily (support-cron): refunds texts Semaphore later reported failed, tells each host once
 * when they're down to their last 10 texts, and tells us when our Semaphore balance is low.
 */
export async function smsDaily(
  db: SupabaseClient,
  sendMail: (payload: { from: string; to: string | string[]; subject: string; html: string }, key?: string) => Promise<unknown>,
  mail: { lowBalance: (eventName: string, left: number, eventId: string) => { subject: string; html: string }; studioLow: (balance: number) => { subject: string; html: string }; from: string; studioInbox: string; hostEmails: (eventId: string) => Promise<string[]> },
) {
  const report = { refunded: 0, lowNotices: 0, balance: null as number | null, errors: [] as string[] };
  if (!smsLive()) return report;
  const key = process.env.SEMAPHORE_API_KEY!;

  // 1. Late failures → refund (Semaphore refunds us; we refund the host).
  try {
    const since = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    for (const status of ["Failed", "Refunded"]) {
      const r = await fetch(`${API}/messages?apikey=${encodeURIComponent(key)}&limit=1000&status=${status}&startDate=${since}&endDate=${today}`);
      const list = r.ok ? ((await r.json().catch(() => [])) as { message_id?: number }[]) : [];
      const pids = (Array.isArray(list) ? list : []).map((m) => String(m.message_id ?? "")).filter(Boolean);
      for (let i = 0; i < pids.length; i += 200) {
        const { data: rows } = await db.from("message_log").select("id, event_id, segments").eq("status", "sent").in("provider_id", pids.slice(i, i + 200));
        for (const row of rows ?? []) {
          await db.from("message_log").update({ status: "refunded", error: `Semaphore: ${status}` }).eq("id", row.id);
          await db.rpc("refund_sms", { p_event: row.event_id, p_n: row.segments });
          report.refunded++;
        }
      }
    }
  } catch (e) {
    report.errors.push(`sms refunds: ${e instanceof Error ? e.message : e}`);
  }

  // 2. Hosts down to their last 10 texts, once per top-up (sms_add_credits clears low_notice_at).
  try {
    const { data: accts } = await db.from("event_sms").select("event_id, credits, used").eq("enabled", true).is("low_notice_at", null).limit(500);
    for (const a of (accts ?? []).filter((x) => x.credits - x.used <= 10)) {
      const { data: ev } = await db.from("events").select("name").eq("id", a.event_id).maybeSingle();
      const to = await mail.hostEmails(a.event_id);
      await db.from("event_sms").update({ low_notice_at: new Date().toISOString() }).eq("event_id", a.event_id);
      if (!to.length) continue;
      const m = mail.lowBalance(ev?.name ?? "your event", a.credits - a.used, a.event_id);
      await sendMail({ from: mail.from, to, subject: m.subject, html: m.html }, `sms-low-${a.event_id}-${a.credits}`);
      report.lowNotices++;
    }
  } catch (e) {
    report.errors.push(`sms low notices: ${e instanceof Error ? e.message : e}`);
  }

  // 3. Our Semaphore balance (every credit we sell is one we have to have).
  try {
    const r = await fetch(`${API}/account?apikey=${encodeURIComponent(key)}`);
    const acct = r.ok ? ((await r.json().catch(() => null)) as { credit_balance?: number | string } | null) : null;
    const balance = Number(acct?.credit_balance);
    if (Number.isFinite(balance)) {
      report.balance = balance;
      const floor = Number(process.env.SEMAPHORE_LOW_BALANCE) || 300;
      if (balance < floor) {
        const m = mail.studioLow(balance);
        await sendMail({ from: mail.from, to: mail.studioInbox, subject: m.subject, html: m.html }, `sms-studio-low-${new Date().toISOString().slice(0, 10)}`);
      }
    }
  } catch (e) {
    report.errors.push(`sms balance: ${e instanceof Error ? e.message : e}`);
  }
  return report;
}
