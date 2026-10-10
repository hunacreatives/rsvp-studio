import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createCheckoutSession, MIN_CENTAVOS, paymongoConfigured } from "./_lib/paymongo.js";

// Start a PayMongo checkout for the signed-in customer:
//   { invoiceId }  pay an open invoice on one of their events
//   { eventId }    pay to publish their DIY website (price from Studio → Templates)
// The amount is always worked out here, never taken from the browser. A pending
// payment row is saved first; api/paymongo-webhook.ts marks it paid.

const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function canAccess(eventId: string, userId: string) {
  const { data: ev } = await db.from("events").select("owner_id, name, managed_by_studio").eq("id", eventId).maybeSingle();
  if (!ev) return null;
  if (ev.owner_id === userId) return ev;
  const { data: m } = await db.from("event_members").select("profile_id").eq("event_id", eventId).eq("profile_id", userId).maybeSingle();
  return m ? ev : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(token);
  const user = auth?.user;
  if (!user) return res.status(401).json({ error: "Please sign in again to pay." });
  if (!paymongoConfigured()) return res.status(503).json({ error: "Online payment isn’t switched on yet. Message us and we’ll help you pay another way." });

  const origin = `https://${req.headers["x-forwarded-host"] ?? req.headers.host}`;
  const body = (req.body ?? {}) as { invoiceId?: string; eventId?: string };

  let kind: "invoice" | "site_publish";
  let eventId: string;
  let amountCentavos: number;
  let name: string;
  let description: string;
  let invoiceId: string | null = null;
  let tier: string | null = null;
  let back: string;

  if (body.invoiceId) {
    const { data: inv } = await db.from("invoices").select("id, number, event_id, description, amount, status").eq("id", body.invoiceId).maybeSingle();
    const ev = inv ? await canAccess(inv.event_id, user.id) : null;
    if (!inv || !ev) return res.status(404).json({ error: "We couldn’t find that invoice." });
    if (inv.status !== "open") return res.status(409).json({ error: inv.status === "paid" ? "This invoice is already paid." : "This invoice was cancelled." });
    kind = "invoice";
    invoiceId = inv.id;
    eventId = inv.event_id;
    amountCentavos = Math.round(Number(inv.amount) * 100);
    name = `${ev.name}: ${inv.description}`;
    description = `The RSVP Studio — invoice ${inv.number}`;
    back = `${origin}/account/billing/${inv.id}`;
  } else if (body.eventId) {
    const ev = await canAccess(body.eventId, user.id);
    if (!ev) return res.status(404).json({ error: "We couldn’t find that event." });
    const { data: site } = await db.from("wedding_sites").select("draft_presentation").eq("event_id", body.eventId).maybeSingle();
    const template = (site?.draft_presentation as { activeTemplateId?: string } | null)?.activeTemplateId ?? "";
    const { data: quote, error } = await db.rpc("site_publish_due", { p_event: body.eventId, p_template: template });
    if (error) throw error;
    const q = (Array.isArray(quote) ? quote[0] : quote) as { tier: string; due_centavos: number } | null;
    if (!q || q.due_centavos <= 0) return res.status(200).json({ free: true });
    kind = "site_publish";
    eventId = body.eventId;
    tier = q.tier;
    amountCentavos = q.due_centavos;
    name = `${ev.name}: event website (${q.tier === "premium" ? "Premium" : "Standard"} template)`;
    description = "The RSVP Studio — publish your event website";
    back = `${origin}/account/events/${body.eventId}/site-builder/edit`;
  } else {
    return res.status(400).json({ error: "Nothing to pay for." });
  }

  if (amountCentavos < MIN_CENTAVOS) return res.status(400).json({ error: "This amount is too small to pay online — message us and we’ll sort it out." });

  // Already started a checkout for the same thing and amount in the last day? Reuse it.
  let q = db
    .from("payments")
    .select("id, checkout_url, amount_centavos")
    .eq("kind", kind)
    .eq("status", "pending")
    .eq("profile_id", user.id)
    .gte("created_at", new Date(Date.now() - 20 * 3_600_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  q = invoiceId ? q.eq("invoice_id", invoiceId) : q.eq("event_id", eventId);
  const { data: open } = await q;
  if (open?.[0]?.checkout_url && open[0].amount_centavos === amountCentavos) return res.status(200).json({ checkout_url: open[0].checkout_url });

  const { data: payment, error: insErr } = await db
    .from("payments")
    .insert({ kind, invoice_id: invoiceId, event_id: eventId, profile_id: user.id, amount_centavos: amountCentavos, description: name, template_tier: tier })
    .select("id")
    .single();
  if (insErr || !payment) {
    console.error("payment insert failed", insErr);
    return res.status(500).json({ error: "Couldn’t start the payment — please try again." });
  }

  try {
    const session = await createCheckoutSession({
      amountCentavos,
      name,
      description,
      email: user.email,
      successUrl: `${back}?paid=${payment.id}`,
      cancelUrl: `${back}?cancelled=1`,
      metadata: { payment_id: payment.id, kind },
    });
    await db.from("payments").update({ checkout_session_id: session.id, checkout_url: session.checkoutUrl, updated_at: new Date().toISOString() }).eq("id", payment.id);
    return res.status(200).json({ checkout_url: session.checkoutUrl });
  } catch (e) {
    console.error("checkout session failed", e);
    await db.from("payments").update({ status: "failed", raw: { error: String(e) }, updated_at: new Date().toISOString() }).eq("id", payment.id);
    return res.status(502).json({ error: "Online payment isn’t available right now. Please try again in a few minutes, or message us." });
  }
}
