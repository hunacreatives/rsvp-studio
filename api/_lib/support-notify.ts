import type { SupabaseClient } from "@supabase/supabase-js";
import { esc } from "./email.js";
import { backAt, code, customerReplyTo, emailRepliesOn, FROM, layout, makeSendMail, serviceFooter, STUDIO_INBOX, SUPPORT_TOPIC, threadHeaders } from "./support-mail.js";

// A customer wrote on a support request — from the dashboard (api/notify.ts) or by
// email (api/_lib/support-inbound.ts). Emails the studio, and sends the customer an
// instant auto-response (at most one per 10 minutes per request).

export type SupportThreadRow = {
  id: string;
  ticket_number: number;
  category: string | null;
  urgent: boolean;
  auto_reply_at: string | null;
  reply_key?: string | null;
};

export function customerMessageEmails(
  db: SupabaseClient,
  sendMail: ReturnType<typeof makeSendMail>,
  opts: {
    thread: SupportThreadRow;
    customer: { email: string | null; full_name: string | null };
    message: { body: string; attachments: { name: string }[] };
    origin: string;
    viaEmail?: boolean;
  },
): Promise<unknown>[] {
  const { thread, customer, message, origin } = opts;
  const n = thread.ticket_number;
  const topic = SUPPORT_TOPIC[thread.category ?? "other"] ?? "Support";
  const files = message.attachments.map((a) => a.name);
  const snippet = `${esc(message.body).replace(/\n/g, "<br>")}${files.length ? `<br><br><em>Attached: ${esc(files.join(", "))}</em>` : ""}`;
  const link = `${origin}/account/messages?thread=${thread.id}`;
  const sends: Promise<unknown>[] = [];

  // To the studio inbox. With email replies on, replying from Gmail would skip the
  // request entirely, so there's no Reply-To to the customer — answer in the Studio.
  sends.push(
    sendMail({
      from: FROM,
      to: STUDIO_INBOX,
      replyTo: emailRepliesOn() ? undefined : (customer.email ?? undefined),
      subject: `[${code(n)}] ${thread.urgent ? "URGENT · " : ""}${topic} — ${customer.full_name || customer.email}`,
      headers: threadHeaders(n),
      html: layout(
        `${code(n)} · ${esc(topic)}${opts.viaEmail ? " (by email)" : ""}`,
        snippet,
        { label: "Open in Studio Console", url: `${origin}/studio/support?thread=${thread.id}` },
        emailRepliesOn() ? "Reply from the Studio Console so it’s saved to the request — replies from this inbox don’t reach it." : undefined,
      ),
    }),
  );

  // …and the auto-response.
  sends.push(
    (async () => {
      if (!customer.email) return;
      const { count } = await db.from("messages").select("id", { count: "exact", head: true }).eq("thread_id", thread.id).eq("internal", false);
      const first = (count ?? 0) <= 1;
      const recent = thread.auto_reply_at && Date.now() - new Date(thread.auto_reply_at).getTime() < 10 * 60_000;
      if (!first && recent) return;
      const { data: hol } = await db.from("support_holidays").select("day").gte("day", new Date().toISOString().slice(0, 10)).limit(60);
      const away = backAt(new Date(), new Set((hol ?? []).map((h) => h.day as string)));
      const when = away ? `We’re away right now and will be back ${away} (Philippine time).` : "We reply within 1 business day — Monday to Friday, 9 AM–6 PM Philippine time.";
      const hi = `Hi ${esc((customer.full_name || "").split(" ")[0] || "there")},`;
      await db.from("message_threads").update({ auto_reply_at: new Date().toISOString() }).eq("id", thread.id);
      return sendMail({
        from: FROM,
        to: customer.email,
        replyTo: customerReplyTo(thread),
        subject: first ? `We’ve received your request [${code(n)}]` : `We got your message [${code(n)}]`,
        headers: threadHeaders(n, true, thread.reply_key),
        html: first
          ? layout(
              "We’ve received your request",
              `${hi}<br><br>Thanks for getting in touch. Your request number is <strong>${code(n)}</strong> (${esc(topic)}). ${when}<br><br><span style="color:#868697">Your message:</span><br>${snippet}<br><br>Is your event in the next 7 days? Message us on Instagram <strong>@rsvpstudioo</strong> as well and we’ll prioritise it.`,
              { label: "View your request", url: link },
              serviceFooter(),
            )
          : layout("We got your message", `${hi}<br><br>It’s been added to request <strong>${code(n)}</strong>. ${when}`, { label: "View your request", url: link }, serviceFooter()),
      });
    })(),
  );
  return sends;
}
