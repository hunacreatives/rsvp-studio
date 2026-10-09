import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { emailRepliesOn, makeSendMail } from "./_lib/support-mail.js";
import { processInbound } from "./_lib/support-inbound.js";

// Resend webhook: "email.received" for replies to sup-<n>.<key>@reply.thersvpstudio.com.
// Web-standard handler so the raw body is available — the signature check needs it byte for byte.
// Does nothing until SUPPORT_EMAIL_REPLIES=on (Report tab → "Email replies" has the switch-on steps).
// A failure returns 500 so Resend retries; the daily job also catches anything missed.

const SITE = "https://thersvpstudio.com";

export async function POST(request: Request) {
  if (!emailRepliesOn()) return Response.json({ ignored: "email replies are switched off" });
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const key = process.env.RESEND_API_KEY;
  if (!secret || !key) return Response.json({ error: "RESEND_WEBHOOK_SECRET / RESEND_API_KEY not set" }, { status: 500 });

  const resend = new Resend(key);
  const payload = await request.text();
  let event: { type: string; data?: { email_id?: string } };
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    }) as typeof event;
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (event.type !== "email.received" || !event.data?.email_id) return Response.json({ ignored: event.type });

  const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const result = await processInbound(event.data.email_id, { db, receiving: resend.emails.receiving, sendMail: makeSendMail(resend), origin: SITE });
    return Response.json(result);
  } catch (e) {
    console.error("support-inbound failed", event.data.email_id, e);
    return Response.json({ error: "Processing failed — will retry" }, { status: 500 });
  }
}
