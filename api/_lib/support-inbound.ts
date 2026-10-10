import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resend } from "resend";
import EmailReplyParser from "email-reply-parser";
import { esc } from "./email.js";
import { code, FROM, layout, makeSendMail, REPLY_DOMAIN, STUDIO_INBOX, topicOf } from "./support-mail.js";
import { customerMessageEmails, type SupportThreadRow } from "./support-notify.js";

// Email replies to support requests (Phase 3B). One received email → one outcome:
//   posted       the customer's reply, added to their request (reopens it, emails the studio)
//   new_request  a reply to a closed request, or a known customer writing in fresh
//   note         matched a request but we couldn't confirm the sender → staff-only note
//   unmatched    nothing to attach it to → the studio gets a heads-up email
//   ignored      out-of-office, bounce, our own mail, empty, or too many in a day
// Called by the webhook (api/support-inbound.ts) and the daily catch-up (api/support-cron.ts).
// support_inbound_emails.email_id is the primary key, so an email is never handled twice.

type Receiving = Resend["emails"]["receiving"];
export type InboundDeps = { db: SupabaseClient; receiving: Receiving; sendMail: ReturnType<typeof makeSendMail>; origin: string };
export type InboundResult = { outcome: string; reason?: string; threadId?: string };

const REPLY_ADDR = new RegExp(`^sup-(\\d+)\\.([a-f0-9]{12})@${REPLY_DOMAIN.replace(/\./g, "\\.")}$`, "i");
const KEY_REF = /<sup-(\d+)\.([a-f0-9]{12})@thersvpstudio\.com>/gi;
const SUBJECT_REF = /\[(?:SUP-|Request #)(\d+)\]/i;
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EMAILS_PER_DAY = 20;

export const addressOf = (s: string | null | undefined) => (s ?? "").match(/<([^>]+)>/)?.[1]?.trim().toLowerCase() ?? (s ?? "").trim().toLowerCase();

/** Out-of-office replies, bounces and mailing lists: never posted (and never answered — no loops). */
export function automatedReason(from: string, subject: string, h: Record<string, string>): string | null {
  if (/^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounces?)[@+]/i.test(from)) return "bounce or no-reply sender";
  if (from.endsWith("@thersvpstudio.com") || from.endsWith(`@${REPLY_DOMAIN}`)) return "sent by us";
  if (h["auto-submitted"] && h["auto-submitted"].toLowerCase() !== "no") return "automatic reply";
  if (/^(bulk|junk|list|auto_reply)$/i.test(h["precedence"] ?? "")) return "automatic reply";
  if (h["x-autoreply"] || h["x-autorespond"] || h["x-auto-response-suppress"]?.match(/oof|all/i)) return "automatic reply";
  if (h["list-id"] || h["list-unsubscribe"]) return "mailing list";
  if (/^(auto(matic)?[ -]?reply|out of (the )?office|autoreply|auto:|undeliverable|delivery status notification)/i.test(subject.trim())) return "automatic reply";
  return null;
}

export function htmlToText(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<div[^>]*class="[^"]*(gmail_quote|gmail_attr|yahoo_quoted|moz-cite-prefix)[^"]*"[\s\S]*$/i, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/** Just what they wrote: no quoted earlier emails, no "On … wrote:" line (any language), no signature. */
export function visibleText(text: string | null, html: string | null) {
  const raw = (text?.trim() ? text : html ? htmlToText(html) : "").replace(/\r\n/g, "\n");
  let out = new EmailReplyParser().read(raw).getVisibleText();
  // Reply headers the parser doesn't know (e.g. Tagalog Gmail: "… <hello@thersvpstudio.com> ay sumulat:").
  const lines = out.split("\n");
  const cut = lines.findIndex(
    (l) => /thersvpstudio\.com>?\s*.*:\s*$/i.test(l) || /^-{2,}\s*original message/i.test(l) || /^_{10,}$/.test(l.trim()) || /^from:\s.*thersvpstudio\.com/i.test(l),
  );
  if (cut >= 0) out = lines.slice(0, cut).join("\n");
  return out.replace(/\n{3,}/g, "\n\n").trim().slice(0, 10_000);
}

const dmarcOf = (email: { authentication?: { dmarc?: string } }, h: Record<string, string>) =>
  email.authentication?.dmarc ?? h["authentication-results"]?.match(/dmarc=(\w+)/i)?.[1] ?? "unknown";

export async function processInbound(emailId: string, deps: InboundDeps): Promise<InboundResult> {
  const { db } = deps;

  // Claim it (a retry of a failed one is allowed up to 3 tries).
  const ins = await db.from("support_inbound_emails").insert({ email_id: emailId }).select("email_id");
  if (ins.error) {
    if (ins.error.code !== "23505") throw new Error(ins.error.message);
    const { data: prev } = await db.from("support_inbound_emails").select("outcome, attempts").eq("email_id", emailId).single();
    if (prev?.outcome !== "error" || prev.attempts >= 3) return { outcome: "duplicate" };
    const { data: again } = await db
      .from("support_inbound_emails")
      .update({ outcome: "processing", attempts: prev.attempts + 1 })
      .eq("email_id", emailId)
      .eq("outcome", "error")
      .select("email_id");
    if (!again?.length) return { outcome: "duplicate" };
  }
  const finish = async (r: InboundResult & { matched_by?: string; message_id?: string; extra?: Record<string, unknown> }) => {
    await db
      .from("support_inbound_emails")
      .update({ outcome: r.outcome, reason: r.reason ?? null, thread_id: r.threadId ?? null, matched_by: r.matched_by ?? null, message_id: r.message_id ?? null, processed_at: new Date().toISOString(), ...r.extra })
      .eq("email_id", emailId);
    return { outcome: r.outcome, reason: r.reason, threadId: r.threadId };
  };

  try {
    return await handle(emailId, deps, finish);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    await db.from("support_inbound_emails").update({ outcome: "error", reason, processed_at: new Date().toISOString() }).eq("email_id", emailId);
    throw e;
  }
}

type Finish = (r: InboundResult & { matched_by?: string; message_id?: string; extra?: Record<string, unknown> }) => Promise<InboundResult>;
type Thread = SupportThreadRow & { profile_id: string; event_id: string | null; status: string; resolved_at: string | null };
const THREAD_COLS = "id, profile_id, event_id, ticket_number, category, urgent, auto_reply_at, reply_key, status, resolved_at";
type Person = { id: string; email: string | null; billing_email: string | null; full_name: string | null; is_staff: boolean };
const PERSON_COLS = "id, email, billing_email, full_name, is_staff";

async function handle(emailId: string, deps: InboundDeps, finish: Finish): Promise<InboundResult> {
  const { db, receiving, sendMail, origin } = deps;
  const { data: email, error } = await receiving.get(emailId);
  if (error || !email) throw new Error(`Resend: ${error?.message ?? "email not found"}`);
  const h = Object.fromEntries(Object.entries(email.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
  const from = addressOf(email.from);
  const subject = email.subject ?? "";
  const bodyFull = (email.text?.trim() ? email.text : email.html ? htmlToText(email.html) : "").slice(0, 20_000);
  const extra = { from_address: from, subject: subject.slice(0, 300), received_at: email.created_at, body_full: bodyFull };

  const auto = automatedReason(from, subject, h);
  if (auto) return finish({ outcome: "ignored", reason: auto, extra });

  // --- Which request? Strongest first.
  let thread: Thread | null = null;
  let matchedBy = "";
  const recipients = [...(email.to ?? []), ...(email.cc ?? []), ...((email as { received_for?: string[] }).received_for ?? [])].map(addressOf);
  for (const r of recipients) {
    const m = r.match(REPLY_ADDR);
    if (!m) continue;
    const { data } = await db.from("message_threads").select(THREAD_COLS).eq("kind", "support").eq("ticket_number", Number(m[1])).eq("reply_key", m[2].toLowerCase()).maybeSingle();
    if (data) {
      thread = data as Thread;
      matchedBy = "reply_address";
      break;
    }
  }
  if (!thread) {
    for (const m of `${h["in-reply-to"] ?? ""} ${h["references"] ?? ""}`.matchAll(KEY_REF)) {
      const { data } = await db.from("message_threads").select(THREAD_COLS).eq("kind", "support").eq("ticket_number", Number(m[1])).eq("reply_key", m[2].toLowerCase()).maybeSingle();
      if (data) {
        thread = data as Thread;
        matchedBy = "headers";
        break;
      }
    }
  }
  if (!thread) {
    const n = subject.match(SUBJECT_REF)?.[1];
    if (n) {
      const { data } = await db.from("message_threads").select(THREAD_COLS).eq("kind", "support").eq("ticket_number", Number(n)).maybeSingle();
      if (data) {
        thread = data as Thread;
        matchedBy = "subject";
      }
    }
  }

  const dmarc = dmarcOf(email as { authentication?: { dmarc?: string } }, h);
  const text = visibleText(email.text, email.html);
  const hasFiles = (email.attachments ?? []).some((a) => a.content_disposition !== "inline");
  if (!text && !hasFiles) return finish({ outcome: "ignored", reason: "empty message", threadId: thread?.id, matched_by: matchedBy || undefined, extra });

  let customer: Person | null = null;
  if (thread) {
    const { data } = await db.from("profiles").select(PERSON_COLS).eq("id", thread.profile_id).maybeSingle();
    customer = data as Person | null;
  }
  const fromCustomer = !!customer && [customer.email, customer.billing_email].some((e) => e && e.toLowerCase() === from);
  const verified = fromCustomer && dmarc.toLowerCase() === "pass";

  // A subject line alone is easy to fake: only trust it from the verified customer.
  if (thread && matchedBy === "subject" && !verified) thread = null;

  if (thread && customer && verified) {
    const { count } = await db.from("messages").select("id", { count: "exact", head: true }).eq("thread_id", thread.id).eq("via", "email").gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
    if ((count ?? 0) >= MAX_EMAILS_PER_DAY) return finish({ outcome: "ignored", reason: "too many emails on this request today", threadId: thread.id, matched_by: matchedBy, extra });

    // Closed (solved 7+ days ago): a reply starts a follow-up request instead.
    const closed = thread.status === "resolved" && !!thread.resolved_at && Date.now() - Date.parse(thread.resolved_at) > 7 * 86_400_000;
    let target = thread;
    if (closed) target = await newRequest(db, customer.id, thread.event_id, thread.category, `Follow-up to ${code(thread.ticket_number)}`);
    const msg = await post(deps, target, customer, text, emailId);
    if (closed) await staffNote(db, target.id, `Emailed in reply to ${code(thread.ticket_number)}, which was already closed — so it started this new request.`);
    await Promise.allSettled(customerMessageEmails(db, sendMail, { thread: target, customer, message: msg, origin, viaEmail: true }));
    return finish({ outcome: closed ? "new_request" : "posted", threadId: target.id, matched_by: matchedBy, message_id: msg.id, extra });
  }

  if (thread) {
    // Right request, but we can't be sure who sent it: staff see it, the customer's conversation doesn't change.
    const why = !fromCustomer
      ? `it came from ${from}, not the customer’s address on file`
      : `their email provider couldn’t confirm it really came from them (DMARC: ${dmarc})`;
    const files = (email.attachments ?? []).filter((a) => a.content_disposition !== "inline").length;
    await staffNote(
      db,
      thread.id,
      `Email from ${email.from} — not added to the conversation because ${why}. The customer can’t see this note; check before acting on it.${files ? ` (${files} attachment${files > 1 ? "s" : ""} not saved.)` : ""}\n\nSubject: ${subject}\n\n${text}`,
    );
    await sendMail({
      from: FROM,
      to: STUDIO_INBOX,
      subject: `[${code(thread.ticket_number)}] Email needs a look — from ${from}`,
      html: layout(
        "An email needs a look",
        `An email about <strong>${code(thread.ticket_number)}</strong> (${esc(topicOf(thread.category))}) wasn’t added to the conversation because ${esc(why)}. It’s saved as an internal note on the request.`,
        { label: "Open in Studio Console", url: `${origin}/studio/support?thread=${thread.id}` },
        "From the support email-reply system.",
      ),
    }).catch((e) => console.error("inbound alert failed", e));
    return finish({ outcome: "note", reason: why, threadId: thread.id, matched_by: matchedBy, extra });
  }

  // Not about a request we can find. A verified customer writing fresh → a new request.
  if (dmarc.toLowerCase() === "pass" && /^[^\s,()"\\]+@[^\s,()"\\]+$/.test(from)) {
    const like = from.replace(/[%_]/g, (c) => `\\${c}`); // exact, case-insensitive
    const { data: people } = await db.from("profiles").select(PERSON_COLS).or(`email.ilike.${like},billing_email.ilike.${like}`).eq("is_staff", false).limit(1);
    const person = (people?.[0] ?? null) as Person | null;
    if (person) {
      const target = await newRequest(db, person.id, null, "other", subject.replace(SUBJECT_REF, "").trim().slice(0, 120) || "Email to support");
      const msg = await post(deps, target, person, text, emailId);
      await Promise.allSettled(customerMessageEmails(db, sendMail, { thread: target, customer: person, message: msg, origin, viaEmail: true }));
      return finish({ outcome: "new_request", threadId: target.id, matched_by: "sender", message_id: msg.id, extra });
    }
  }
  await sendMail({
    from: FROM,
    to: STUDIO_INBOX,
    replyTo: from,
    subject: `Support email we couldn’t match — from ${from}`,
    html: layout(
      "An email we couldn’t match",
      `<strong>From:</strong> ${esc(email.from)}<br><strong>Subject:</strong> ${esc(subject)}<br><br>It wasn’t a reply to a request we could find, and the sender isn’t a customer we could verify, so nothing was added to the Studio.<br><br><span style="color:#868697">What they wrote:</span><br>${esc(text.slice(0, 2000)).replace(/\n/g, "<br>")}`,
      null,
      "From the support email-reply system.",
    ),
  }).catch((e) => console.error("unmatched alert failed", e));
  return finish({ outcome: "unmatched", reason: !thread && matchedBy === "subject" ? "subject mentions a request but the sender couldn’t be verified" : "no matching request", extra });
}

async function newRequest(db: SupabaseClient, profileId: string, eventId: string | null, category: string | null, subject: string) {
  const { data, error } = await db
    .from("message_threads")
    .insert({ kind: "support", profile_id: profileId, event_id: eventId, subject, category: category ?? "other" })
    .select(THREAD_COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Thread;
}

/** Save the email's files into the request (like files sent from the dashboard), then the message. */
async function post(deps: InboundDeps, thread: Thread, customer: Person, text: string, emailId: string) {
  const { db, receiving } = deps;
  const attachments: { name: string; path: string; size: number; type: string }[] = [];
  const skipped: string[] = [];
  const { data: list } = await receiving.attachments.list({ emailId });
  for (const a of (list?.data ?? []).filter((x) => x.content_disposition !== "inline")) {
    if (attachments.length >= MAX_FILES || a.size > MAX_FILE_BYTES) {
      skipped.push(a.filename ?? "file");
      continue;
    }
    const res = await fetch(a.download_url);
    if (!res.ok) {
      skipped.push(a.filename ?? "file");
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const name = a.filename || "attachment";
    const path = `${thread.id}/${crypto.randomUUID()}/${name.replace(/[^\w.\- ]+/g, "_")}`;
    const up = await db.storage.from("message-files").upload(path, buf, { contentType: a.content_type || "application/octet-stream" });
    if (up.error) {
      skipped.push(name);
      continue;
    }
    attachments.push({ name, path, size: buf.length, type: a.content_type || "application/octet-stream" });
  }
  const body = skipped.length ? `${text}\n\n(Not attached — too many or too large: ${skipped.join(", ")}. Please send them from your dashboard.)`.trim() : text;
  const { data, error } = await db
    .from("messages")
    .insert({ thread_id: thread.id, sender_id: customer.id, body, attachments, via: "email" })
    .select("id, body, attachments")
    .single();
  if (error) throw new Error(error.message);
  // Refresh: posting moved the status / auto-reply time.
  const { data: fresh } = await db.from("message_threads").select(THREAD_COLS).eq("id", thread.id).single();
  if (fresh) Object.assign(thread, fresh);
  return data as { id: string; body: string; attachments: { name: string }[] };
}

/** A staff-only note, written as the studio owner (notes need a team member as the author). */
async function staffNote(db: SupabaseClient, threadId: string, body: string) {
  const { data: owner } = await db.from("profiles").select("id").eq("is_staff", true).order("staff_role", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  if (!owner) return;
  await db.from("messages").insert({ thread_id: threadId, sender_id: owner.id, body, internal: true });
}
