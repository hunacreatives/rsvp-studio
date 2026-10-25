import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createCheckoutSession, MIN_CENTAVOS, paymongoConfigured } from "./_lib/paymongo.js";
import { domainsReady, loadSettings, pesoPrice, quoteDomain, RateLimited } from "./_lib/domains.js";
import { domainSearchHandler, domainStatusHandler } from "./_lib/domain-handlers.js";
import { uploadUrlHandler } from "./_lib/media-handlers.js";
import { captureError } from "./_lib/sentry.js";
import { siteHealthHandler } from "./_lib/health-handler.js";
import { isSmsPack, SMS_PACKS, smsLive } from "./_lib/sms.js";

// Start a PayMongo checkout for the signed-in customer:
//   { invoiceId }  pay an open invoice on one of their events
//   { eventId }    pay to publish their DIY website (price from Studio → Templates)
//   { eventId, domain }          buy a custom domain for their site (api/_lib/domains.ts)
//   { eventId, renewDomain: true }  renew that domain for another year
//   { eventId, upgrade: true }  make a free-template site Premium (the Premium price,
//                  less anything already paid) — no credit on the site, an email per RSVP
//   { eventId, smsPack: 100 | 300 | 600 }  texts for this event's guests (api/_lib/sms.ts)
// The amount is always worked out here, never taken from the browser. A pending
// payment row is saved first; api/paymongo-webhook.ts marks it paid.

const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/** The event, if this person may pay for it: the couple or a cohost (coordinator-mode.sql).
 *  `edit` also lets coordinators through, for publishing when nothing is owed. */
async function canAccess(eventId: string, userId: string, need: "bill" | "edit" = "bill") {
  const { data: ev } = await db.from("events").select("owner_id, name, managed_by_studio").eq("id", eventId).maybeSingle();
  if (!ev) return null;
  if (ev.owner_id === userId) return { ...ev, role: "owner" };
  const { data: m } = await db.from("event_members").select("role").eq("event_id", eventId).eq("profile_id", userId).maybeSingle();
  if (!m) return null;
  const ok = need === "edit" ? ["cohost", "coordinator"].includes(m.role) : m.role === "cohost";
  return ok ? { ...ev, role: m.role as string } : NOT_COUPLE;
}
/** On the event, but not someone who pays (a coordinator or viewer). */
const NOT_COUPLE = { not_couple: true } as const;
const notCouple = (res: VercelResponse) => res.status(403).json({ error: "Only the event’s hosts can pay for this. Ask them to do it from their account." });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // /api/domain-search, /api/domain-status, /api/media-upload and /api/site-health are rewritten here
  // (vercel.json): the Hobby plan allows 12 functions per deploy, so they share this one.
  if (req.query.op === "upload-url") return uploadUrlHandler(req, res);
  if (req.query.op === "domain-search") return domainSearchHandler(req, res);
  if (req.query.op === "domain-status") return domainStatusHandler(req, res);
  if (req.query.op === "site-health") return siteHealthHandler(req, res);
  // Is texting switched on (SEMAPHORE_API_KEY in Vercel)? The builder hides the texts card until it is.
  if (req.query.op === "sms-status") return res.status(200).json({ enabled: smsLive() });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(token);
  const user = auth?.user;
  if (!user) return res.status(401).json({ error: "Please sign in again to pay." });
  if (!paymongoConfigured()) return res.status(503).json({ error: "Online payment isn’t switched on yet. Message us and we’ll help you pay another way." });

  const origin = `https://${req.headers["x-forwarded-host"] ?? req.headers.host}`;
  const body = (req.body ?? {}) as { invoiceId?: string; eventId?: string; upgrade?: boolean; domain?: string; renewDomain?: boolean; smsPack?: number };

  let kind: "invoice" | "site_publish" | "domain" | "domain_renewal" | "sms_pack";
  let smsCredits: number | null = null;
  let domain: { name: string; usd: number; renewalUsd: number | null } | null = null;
  let eventId: string;
  let amountCentavos: number;
  let name: string;
  let description: string;
  let invoiceId: string | null = null;
  let tier: string | null = null;
  let back: string;
  let returnParam = "paid";

  if (body.invoiceId) {
    const { data: inv } = await db.from("invoices").select("id, number, event_id, description, amount, status").eq("id", body.invoiceId).maybeSingle();
    const ev = inv ? await canAccess(inv.event_id, user.id) : null;
    if (!inv || !ev) return res.status(404).json({ error: "We couldn’t find that invoice." });
    if ("not_couple" in ev) return notCouple(res);
    if (inv.status !== "open") return res.status(409).json({ error: inv.status === "paid" ? "This invoice is already paid." : "This invoice was cancelled." });
    kind = "invoice";
    invoiceId = inv.id;
    eventId = inv.event_id;
    amountCentavos = Math.round(Number(inv.amount) * 100);
    name = `${ev.name}: ${inv.description}`;
    description = `The RSVP Studio — Invoice ${inv.number}`;
    back = `${origin}/account/billing/${inv.id}`;
  } else if (body.eventId && (body.domain || body.renewDomain === true)) {
    const ev = await canAccess(body.eventId, user.id);
    if (!ev) return res.status(404).json({ error: "We couldn’t find that event." });
    if ("not_couple" in ev) return notCouple(res);
    const settings = await loadSettings(db);
    if (!domainsReady(settings)) return res.status(503).json({ error: "Custom domains aren’t available yet." });
    const { data: current } = await db.from("site_domains").select("domain, status, price_usd, renewal_usd").eq("event_id", body.eventId).neq("status", "expired").order("created_at", { ascending: false }).limit(1).maybeSingle();
    eventId = body.eventId;
    if (body.renewDomain) {
      if (!current || current.status !== "active") return res.status(409).json({ error: "There’s no active web address to renew." });
      const usd = Number(current.renewal_usd ?? current.price_usd);
      kind = "domain_renewal";
      domain = { name: current.domain, usd, renewalUsd: usd };
      amountCentavos = pesoPrice(usd, settings) * 100;
      name = `${ev.name}: Renew ${current.domain} for 1 Year`;
      description = "The RSVP Studio — Web Address Renewal";
      back = `${origin}/account/projects/${body.eventId}`;
      returnParam = "renewed";
    } else {
      if (current && current.status !== "failed") return res.status(409).json({ error: `This website already has ${current.domain}.` });
      // Re-check: still free, same price — right now, not when they searched.
      let quote;
      try {
        quote = await quoteDomain(db, settings, String(body.domain));
      } catch (e) {
        if (e instanceof RateLimited) return res.status(429).json({ error: "Lots of people are buying right now — try again in a minute." });
        throw e;
      }
      if (!quote) return res.status(409).json({ error: `${body.domain} isn’t available anymore. Try another name.` });
      kind = "domain";
      domain = { name: quote.domain, usd: quote.usd, renewalUsd: quote.renewalUsd };
      amountCentavos = quote.php * 100;
      name = `${ev.name}: ${quote.domain} (1 Year)`;
      description = "The RSVP Studio — Your Own Web Address";
      back = `${origin}/account/events/${body.eventId}/site-builder/edit`;
      returnParam = "domain";
    }
  } else if (body.eventId && body.smsPack !== undefined) {
    if (!isSmsPack(body.smsPack)) return res.status(400).json({ error: "Pick a pack of 100, 300 or 600 texts." });
    // No selling texts that can't be sent yet (the team can still try the checkout).
    const { data: me } = await db.from("profiles").select("is_staff").eq("id", user.id).maybeSingle();
    if (!smsLive() && !me?.is_staff) return res.status(503).json({ error: "Texts aren’t available yet." });
    const ev = await canAccess(body.eventId, user.id);
    if (!ev) return res.status(404).json({ error: "We couldn’t find that event." });
    if ("not_couple" in ev) return notCouple(res);
    kind = "sms_pack";
    eventId = body.eventId;
    smsCredits = body.smsPack;
    amountCentavos = SMS_PACKS[body.smsPack];
    name = `${ev.name}: ${body.smsPack} Texts to Guests`;
    description = "The RSVP Studio — Texts to Guests";
    back = `${origin}/account/events/${body.eventId}/site-builder/edit`;
    returnParam = "texts";
  } else if (body.eventId && body.upgrade === true) {
    const ev = await canAccess(body.eventId, user.id);
    if (!ev) return res.status(404).json({ error: "We couldn’t find that event." });
    if ("not_couple" in ev) return notCouple(res);
    const { data: due, error } = await db.rpc("site_upgrade_due", { p_event: body.eventId });
    if (error) throw error;
    const u = (Array.isArray(due) ? due[0] : due) as { premium: boolean; due_centavos: number } | null;
    if (!u || u.premium) return res.status(409).json({ error: "This site is already Premium." });
    if (u.due_centavos <= 0) return res.status(409).json({ error: "Premium isn’t available to buy right now — message us and we’ll help." });
    kind = "site_publish";
    eventId = body.eventId;
    tier = "premium";
    amountCentavos = u.due_centavos;
    name = `${ev.name}: Premium for Your Event Website`;
    description = "The RSVP Studio — Premium Event Website";
    back = `${origin}/account/events/${body.eventId}/site-builder/edit`;
    returnParam = "upgraded";
  } else if (body.eventId) {
    // Publishing: coordinators can publish too, but only the couple pays.
    const ev = await canAccess(body.eventId, user.id, "edit");
    if (!ev) return res.status(404).json({ error: "We couldn’t find that event." });
    if ("not_couple" in ev) return res.status(403).json({ error: "You can see this event, but not publish it." });
    const { data: site } = await db.from("wedding_sites").select("draft_presentation").eq("event_id", body.eventId).maybeSingle();
    const template = (site?.draft_presentation as { activeTemplateId?: string } | null)?.activeTemplateId ?? "";
    const { data: quote, error } = await db.rpc("site_publish_due", { p_event: body.eventId, p_template: template });
    if (error) throw error;
    const q = (Array.isArray(quote) ? quote[0] : quote) as { tier: string; due_centavos: number } | null;
    if (!q || q.due_centavos <= 0) return res.status(200).json({ free: true });
    if (ev.role === "coordinator") return res.status(403).json({ error: "Publishing this design needs a payment. Ask your client to publish it from their account." });
    kind = "site_publish";
    eventId = body.eventId;
    tier = q.tier;
    amountCentavos = q.due_centavos;
    name = `${ev.name}: Event Website (${q.tier === "premium" ? "Premium" : "Standard"} Template)`;
    description = "The RSVP Studio — Publish Your Event Website";
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
    .eq("description", name) // a publish checkout is never reused for an upgrade, or the other way round
    .gte("created_at", new Date(Date.now() - 20 * 3_600_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  q = invoiceId ? q.eq("invoice_id", invoiceId) : q.eq("event_id", eventId);
  const { data: open } = await q;
  if (open?.[0]?.checkout_url && open[0].amount_centavos === amountCentavos) return res.status(200).json({ checkout_url: open[0].checkout_url });

  const { data: payment, error: insErr } = await db
    .from("payments")
    .insert({
      kind,
      invoice_id: invoiceId,
      event_id: eventId,
      profile_id: user.id,
      amount_centavos: amountCentavos,
      description: name,
      template_tier: tier,
      ...(smsCredits ? { sms_credits: smsCredits } : {}),
      ...(domain ? { domain: domain.name, domain_price_usd: domain.usd, domain_renewal_usd: domain.renewalUsd } : {}),
    })
    .select("id")
    .single();
  if (insErr || !payment) {
    console.error("payment insert failed", insErr);
    await captureError(new Error(insErr?.message ?? "payment insert failed"), "pay-checkout:insert");
    return res.status(500).json({ error: "Couldn’t start the payment — please try again." });
  }

  try {
    const session = await createCheckoutSession({
      amountCentavos,
      name,
      description,
      email: user.email,
      successUrl: `${back}?${returnParam}=${payment.id}`,
      cancelUrl: `${back}?${returnParam === "upgraded" ? "upgrade_cancelled" : returnParam === "texts" ? "texts_cancelled" : returnParam === "domain" || returnParam === "renewed" ? "domain_cancelled" : "cancelled"}=1`,
      metadata: { payment_id: payment.id, kind },
    });
    await db.from("payments").update({ checkout_session_id: session.id, checkout_url: session.checkoutUrl, updated_at: new Date().toISOString() }).eq("id", payment.id);
    return res.status(200).json({ checkout_url: session.checkoutUrl });
  } catch (e) {
    console.error("checkout session failed", e);
    await captureError(e, "pay-checkout:session", { payment: payment.id });
    await db.from("payments").update({ status: "failed", raw: { error: String(e) }, updated_at: new Date().toISOString() }).eq("id", payment.id);
    return res.status(502).json({ error: "Online payment isn’t available right now. Please try again in a few minutes, or message us." });
  }
}
