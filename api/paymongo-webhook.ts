import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { methodLabel, sendInvoiceEmail } from "./_lib/billing-mail.js";
import { verifyPaymongoSignature } from "./_lib/paymongo.js";
import { esc } from "./_lib/email.js";
import { FROM, layout, makeSendMail, STUDIO_INBOX } from "./_lib/support-mail.js";

// PayMongo → us, on checkout events. Register once in the PayMongo dashboard:
//   https://thersvpstudio.com/api/paymongo-webhook
//   events: checkout_session.payment.paid, payment.paid, payment.failed
// then put its signing secret in Vercel as PAYMONGO_WEBHOOK_SECRET.
// Web-standard handler: the signature check needs the raw body byte for byte.
//
// A paid invoice is marked paid (+ receipt email); a paid DIY website lets the
// builder publish it (the publish guard in supabase/payments.sql checks payments).
// PayMongo sends BOTH checkout_session.payment.paid and payment.paid, possibly at
// once — the `fulfilled` compare-and-swap makes sure only one does the work.

const SITE = "https://thersvpstudio.com";
const ok = () => Response.json({ ok: true });

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPaymongoSignature(raw, request.headers.get("paymongo-signature"), process.env.PAYMONGO_WEBHOOK_SECRET ?? "")) {
    return new Response("bad signature", { status: 401 });
  }
  let evt: { data?: { attributes?: { type?: string; data?: { id?: string; attributes?: Record<string, any> } } } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const sendMail = makeSendMail(process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

  const type = evt.data?.attributes?.type ?? "";
  const resource = evt.data?.attributes?.data ?? {};
  const attrs = resource.attributes ?? {};
  const paymentId: string | undefined = attrs.metadata?.payment_id;
  const sessionId = type.startsWith("checkout_session") ? resource.id : undefined;

  let payment: Record<string, any> | null = null;
  if (paymentId) payment = (await db.from("payments").select("*").eq("id", paymentId).maybeSingle()).data;
  if (!payment && sessionId) payment = (await db.from("payments").select("*").eq("checkout_session_id", sessionId).maybeSingle()).data;
  if (!payment) {
    console.warn("paymongo-webhook: no matching payment", { type, paymentId, sessionId });
    return ok(); // acknowledge so PayMongo stops retrying
  }

  if (type === "payment.failed") {
    if (payment.status === "pending") await db.from("payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", payment.id);
    return ok();
  }
  if (type !== "checkout_session.payment.paid" && type !== "payment.paid") return ok();

  const pm = attrs.payments?.[0] ?? (type === "payment.paid" ? resource : null);
  const method: string | null = attrs.payment_method_used ?? pm?.attributes?.source?.type ?? null;
  const pmId: string | null = pm?.id ?? null;
  const nowIso = new Date().toISOString();

  // Claim it (exactly once).
  const { data: claimed, error: claimErr } = await db
    .from("payments")
    .update({ status: "paid", fulfilled: true, paid_at: nowIso, method, paymongo_payment_id: pmId, raw: evt, updated_at: nowIso })
    .eq("id", payment.id)
    .eq("fulfilled", false)
    .select("id");
  if (claimErr) {
    console.error("paymongo-webhook: claim failed", claimErr);
    return new Response("retry", { status: 500 });
  }
  if (!claimed?.length) return ok(); // the other event already did it

  try {
    const amount = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(payment.amount_centavos / 100);
    if (payment.kind === "invoice" && payment.invoice_id) {
      const { data: inv } = await db
        .from("invoices")
        .update({ status: "paid", paid_at: nowIso, paid_method: method, paid_reference: pmId })
        .eq("id", payment.invoice_id)
        .eq("status", "open")
        .select("id")
        .maybeSingle();
      if (inv) await sendInvoiceEmail(db, sendMail, { invoiceId: payment.invoice_id, kind: "payment", origin: SITE }).catch((e) => console.error("receipt email failed", e));
      else console.warn("paymongo-webhook: invoice wasn't open", payment.invoice_id);
    }
    // Heads-up for the studio, whatever was paid for.
    const { data: ev } = await db.from("events").select("name").eq("id", payment.event_id).maybeSingle();
    await sendMail({
      from: FROM,
      to: STUDIO_INBOX,
      subject: `💸 ${amount} paid${method ? ` by ${methodLabel(method)}` : ""} — ${ev?.name ?? "an event"}`,
      html: layout(
        `${amount} received`,
        `${esc(payment.description ?? "")}<br>${payment.kind === "site_publish" ? "A DIY website was paid for — the customer can publish it now." : "The invoice is now marked paid and the client has their receipt."}`,
        { label: "Open the Studio", url: `${SITE}/studio${payment.kind === "invoice" ? "/invoices" : ""}` },
        "From the PayMongo payment system.",
      ),
    }).catch((e) => console.error("studio payment alert failed", e));
    return ok();
  } catch (e) {
    console.error("paymongo-webhook: fulfilment failed — releasing for retry", e);
    await db.from("payments").update({ fulfilled: false, status: "pending" }).eq("id", payment.id);
    return new Response("retry", { status: 500 });
  }
}
