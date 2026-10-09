import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { clean, esc } from "./_lib/email.js";
import { code, FROM, layout, makeSendMail, RATING_LABEL, RATINGS, readRatingToken, STUDIO_INBOX, topicOf, type Rating } from "./_lib/support-mail.js";

// "How did we do?" — the rating page (/rate) talks to this.
//   GET  ?t=<signed token>  → which request, and any rating already given (nothing is written)
//   POST { t, rating, comment } → saves it (the latest submission wins, for 14 days)
// Email security scanners open every link in an email, so opening a link never
// records anything: only the page's Submit button does. "Not good" alerts the studio.

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const sendMail = makeSendMail(process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String((req.method === "GET" ? req.query.t : (req.body as { t?: string })?.t) ?? "");
  const link = readRatingToken(token);
  if (!link) return res.status(410).json({ error: "This rating link has expired or isn’t valid." });
  const { data: thread } = await supabaseAdmin
    .from("message_threads")
    .select("id, ticket_number, category, profile_id, status, rating, rating_comment")
    .eq("id", link.threadId)
    .maybeSingle();
  if (!thread?.ticket_number) return res.status(404).json({ error: "We couldn’t find that request." });

  if (req.method === "GET") {
    return res.status(200).json({ ticket: code(thread.ticket_number), topic: topicOf(thread.category), rating: thread.rating, comment: thread.rating_comment });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body as { rating?: string; comment?: string };
  const rating = body.rating as Rating;
  if (!RATINGS.includes(rating)) return res.status(400).json({ error: "Pick a rating." });
  const comment = clean(body.comment, 2000) || null;
  const first = !thread.rating;
  const meta = {
    ua: String(req.headers["user-agent"] ?? "").slice(0, 300),
    ip: String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim(),
    secondsAfterEmail: Math.round((Date.now() - link.issuedAt.getTime()) / 1000),
  };
  const { error } = await supabaseAdmin
    .from("message_threads")
    .update({ rating, rating_comment: comment, rated_at: new Date().toISOString(), rating_meta: meta })
    .eq("id", thread.id);
  if (error) return res.status(500).json({ error: "Couldn’t save your rating — please try again." });

  // "Not good" (new, or changed to it): tell the studio straight away. Never reopens the request.
  if (rating === "not_good" && (first || thread.rating !== "not_good")) {
    const { data: customer } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", thread.profile_id).maybeSingle();
    const origin = `https://${req.headers["x-forwarded-host"] ?? req.headers.host}`;
    await sendMail({
      from: FROM,
      to: STUDIO_INBOX,
      subject: `🙁 Not good rating on ${code(thread.ticket_number)} — ${customer?.full_name || customer?.email || "a customer"}`,
      html: layout(
        `${code(thread.ticket_number)} was rated ${RATING_LABEL[rating]}`,
        `${esc(customer?.full_name || "The customer")} (${esc(customer?.email ?? "")}) rated their ${esc(topicOf(thread.category))} request <strong>Not good</strong>.${
          comment ? `<br><br><span style="color:#868697">Their comment:</span><br>${esc(comment).replace(/\n/g, "<br>")}` : ""
        }<br><br>Worth a personal follow-up.`,
        { label: "Open in Studio Console", url: `${origin}/studio/support?thread=${thread.id}` },
      ),
    }).catch((e) => console.error("rating alert failed", e));
  }
  return res.status(200).json({ ok: true, rating });
}
