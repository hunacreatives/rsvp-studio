import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { methodLabel, sendInvoiceEmail } from "./_lib/billing-mail.js";
import { verifyPaymongoSignature } from "./_lib/paymongo.js";
import { esc } from "./_lib/email.js";
import { domainPaid, domainRenewalPaid } from "./_lib/domains.js";
import { FROM, layout, makeSendMail, STUDIO_INBOX } from "./_lib/support-mail.js";
import { captureError } from "./_lib/sentry.js";

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
  // The secret was saved in Vercel as PAYMONGO_WEBOOK_SECRET (missing "H"): accept either name.
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET || process.env.PAYMONGO_WEBOOK_SECRET || "";
  if (!secret) await captureError(new Error("PAYMONGO_WEBHOOK_SECRET is not set: payments can't be confirmed"), "paymongo-webhook");
  if (!verifyPaymongoSignature(raw, request.headers.get("paymongo-signature"), secret)) {
    await captureError(new Error("PayMongo webhook signature rejected"), "paymongo-webhook");
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
    // A custom domain: buy it and connect it now (it finishes on the customer's screen or the daily job).
    // Never fails the webhook — problems alert the studio instead of making PayMongo retry.
    if (payment.kind === "domain") await domainPaid(db, sendMail, payment).catch((e) => console.error("domain purchase failed", e));
    if (payment.kind === "domain_renewal") await domainRenewalPaid(db, sendMail, payment).catch((e) => console.error("domain renewal failed", e));
    // Paying to publish / going Premium: our confirmation, which is also the receipt.
    if (payment.kind === "site_publish") await sitePublishPaid(db, sendMail, payment, amount, method).catch((e) => console.error("site publish email failed", e));
    // A text pack: the texts go on the event straight away (and switch texting on), then the receipt.
    // Adding them is the one part that must work, so a failure here lets PayMongo retry.
    if (payment.kind === "sms_pack" && payment.sms_credits) {
      const { error: addErr } = await db.rpc("sms_add_credits", { p_event: payment.event_id, p_n: payment.sms_credits });
      if (addErr) throw new Error(`sms_add_credits: ${addErr.message}`);
      await smsPackPaid(db, sendMail, payment, amount, method).catch((e) => console.error("sms pack email failed", e));
    }
    // Heads-up for the studio, whatever was paid for.
    const { data: ev } = await db.from("events").select("name").eq("id", payment.event_id).maybeSingle();
    await sendMail({
      from: FROM,
      to: STUDIO_INBOX,
      subject: `💸 ${amount} paid${method ? ` by ${methodLabel(method)}` : ""} — ${ev?.name ?? "an event"}`,
      html: layout(
        `${amount} received`,
        `${esc(payment.description ?? "")}<br>${
          payment.kind === "site_publish"
            ? "A DIY website was paid for — the customer can publish it now."
            : payment.kind === "sms_pack"
              ? `${payment.sms_credits} texts were added to the event, and texting is on.`
              : payment.kind === "domain"
              ? "A custom domain was paid for — it’s being bought and connected automatically."
              : payment.kind === "domain_renewal"
                ? "A custom domain renewal was paid for — it’s being renewed automatically."
                : "The invoice is now marked paid and the client has their receipt."
        }`,
        { label: "Open the Studio", url: `${SITE}/studio${payment.kind === "invoice" ? "/invoices" : ""}` },
        "From the PayMongo payment system.",
        { ad: false },
      ),
    }).catch((e) => console.error("studio payment alert failed", e));
    return ok();
  } catch (e) {
    console.error("paymongo-webhook: fulfilment failed — releasing for retry", e);
    await captureError(e, "paymongo-webhook", { payment: payment.id });
    await db.from("payments").update({ fulfilled: false, status: "pending" }).eq("id", payment.id);
    return new Response("retry", { status: 500 });
  }
}

/**
 * "Premium is on" (or, for a paid publish that isn't Premium, "Payment received"): to whoever
 * paid and the event's owner. What's on straight away, what to switch on, and the amount, so
 * it doubles as the receipt (PayMongo's own receipts are off: api/_lib/paymongo.ts).
 */
async function sitePublishPaid(
  db: SupabaseClient,
  sendMail: ReturnType<typeof makeSendMail>,
  payment: Record<string, any>,
  amount: string,
  method: string | null,
) {
  const { data: ev } = await db.from("events").select("name, owner_id").eq("id", payment.event_id).maybeSingle();
  if (!ev) return;
  const ids = [payment.profile_id, ev.owner_id].filter(Boolean) as string[];
  const { data: people } = ids.length ? await db.from("profiles").select("id, email, full_name").in("id", ids) : { data: [] };
  const to = [...new Set((people ?? []).map((p) => p.email as string).filter(Boolean))];
  if (!to.length) return;
  const payer = (people ?? []).find((p) => p.id === payment.profile_id) ?? (people ?? [])[0];
  const first = esc(((payer?.full_name as string | null) ?? "").trim().split(/\s+/)[0] || "there");
  const { data: premium } = await db.rpc("event_is_premium", { p_event: payment.event_id });
  const html = sitePaidEmailHtml({ first, name: esc(ev.name as string), amount, method, premium: premium === true, builder: `${SITE}/account/events/${payment.event_id}/site-builder/edit` });
  await sendMail(
    { from: FROM, to, replyTo: STUDIO_INBOX, subject: premium === true ? `Premium is on for ${ev.name}` : `Payment received for ${ev.name}`, html },
    `site-publish-paid-${payment.id}`,
  );
}

/** The email itself (exported for previews). */
export function sitePaidEmailHtml(o: { first: string; name: string; amount: string; method: string | null; premium: boolean; builder: string }) {
  const paidLine = `<span style="color:#868697">Paid ${o.amount}${o.method ? ` by ${esc(methodLabel(o.method))}` : ""}. One time, for this event.</span>`;
  const li = (t: string) => `<li style="margin:0 0 6px">${t}</li>`;
  return o.premium
    ? layout(
        "Premium is on",
        `Thank you, ${o.first}. <strong>${o.name}</strong> is on Premium.<br><br><strong>Already on</strong><ul style="margin:8px 0 14px;padding-left:18px">${li("An email the moment someone says yes")}${li("Confirmations sent in your names")}${li("Every Premium design, no extra cost")}${li("Online for a year after your event")}</ul><strong>Switch on when you want them</strong> <span style="color:#868697">(Details → Settings)</span><ul style="margin:8px 0 14px;padding-left:18px">${li("A reminder to guests two days before")}${li("Everyone’s photos in one place")}${li("Invited guests only")}${li("Find your table")}</ul>${paidLine}`,
        { label: "Open your website", url: o.builder },
        "You’re receiving this because you paid for this event on The RSVP Studio.",
        { promo: false },
      )
    : layout(
        "Payment received",
        `Thank you, ${o.first}. You can publish your website for <strong>${o.name}</strong> now.<br><br>${paidLine}`,
        { label: "Publish your website", url: o.builder },
        "You’re receiving this because you paid for this event on The RSVP Studio.",
        { promo: false },
      );
}

/** "Your texts are ready": the receipt for a text pack, to whoever paid and the event's owner. */
async function smsPackPaid(db: SupabaseClient, sendMail: ReturnType<typeof makeSendMail>, payment: Record<string, any>, amount: string, method: string | null) {
  const { data: ev } = await db.from("events").select("name, owner_id").eq("id", payment.event_id).maybeSingle();
  if (!ev) return;
  const ids = [payment.profile_id, ev.owner_id].filter(Boolean) as string[];
  const { data: people } = ids.length ? await db.from("profiles").select("id, email, full_name").in("id", ids) : { data: [] };
  const to = [...new Set((people ?? []).map((p) => p.email as string).filter(Boolean))];
  if (!to.length) return;
  const payer = (people ?? []).find((p) => p.id === payment.profile_id) ?? (people ?? [])[0];
  const first = esc(((payer?.full_name as string | null) ?? "").trim().split(/\s+/)[0] || "there");
  const { data: acct } = await db.from("event_sms").select("credits, used").eq("event_id", payment.event_id).maybeSingle();
  const left = acct ? Number(acct.credits) - Number(acct.used) : Number(payment.sms_credits);
  await sendMail(
    {
      from: FROM,
      to,
      replyTo: STUDIO_INBOX,
      subject: `Your texts are ready for ${ev.name}`,
      html: smsPackEmailHtml({ first, name: esc(ev.name as string), texts: Number(payment.sms_credits), left, amount, method, settings: `${SITE}/account/events/${payment.event_id}/site-builder/edit?settings=1` }),
    },
    `sms-pack-paid-${payment.id}`,
  );
}

/** The email itself (exported for previews). */
export function smsPackEmailHtml(o: { first: string; name: string; texts: number; left: number; amount: string; method: string | null; settings: string }) {
  const li = (t: string) => `<li style="margin:0 0 6px">${t}</li>`;
  return layout(
    "Your texts are ready",
    `Thank you, ${o.first}. <strong>${o.texts} texts</strong> are on <strong>${o.name}</strong>, and texting is on. You have ${o.left} to use.<br><br><strong>Guests who give a mobile number get</strong><ul style="margin:8px 0 14px;padding-left:18px">${li("A text when they RSVP")}${li("A reminder two days before, on Premium")}${li("Your messages, when you send one from the Guests tab")}</ul>One text is up to 160 characters. Guests with an email still get emails, free.<br><br><span style="color:#868697">Paid ${o.amount}${o.method ? ` by ${esc(methodLabel(o.method))}` : ""}. One time, for this event.</span>`,
    { label: "Open your settings", url: o.settings },
    "You’re receiving this because you paid for this event on The RSVP Studio.",
    { promo: false },
  );
}
