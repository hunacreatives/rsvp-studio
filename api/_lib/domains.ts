import type { SupabaseClient } from "@supabase/supabase-js";
import { esc } from "./email.js";
import { FROM, layout, STUDIO_INBOX } from "./support-mail.js";

// Custom domains, bought through Vercel's registrar API and connected to this
// Vercel project (supabase/custom-domains.sql). Every domain is registered to
// Huna (Studio → Templates → Custom domains holds the registrant details).
//
// A domain moves  paid → buying → connecting → active  and advanceDomain()
// takes it one step further each time it's called — by the PayMongo webhook,
// by the customer's screen while they wait (api/domain-status), and by the
// daily job — so nothing is lost if one call dies halfway.
//
// Env: VERCEL_API_TOKEN (Huna team token, set in Vercel). VERCEL_TEAM_ID and
// VERCEL_PROJECT_ID default to this project's (.vercel/project.json).

const API = "https://api.vercel.com";
const TEAM = process.env.VERCEL_TEAM_ID || "team_C5Wl3r1ic3TPnb4TmYdVzLnX";
const PROJECT = process.env.VERCEL_PROJECT_ID || "prj_6ejN3axTnzhCVwWzbkqAnCqGfxXO";
const SITE = "https://thersvpstudio.com";

export const vercelConfigured = () => !!process.env.VERCEL_API_TOKEN;

type SendMail = (payload: Parameters<typeof import("./email.js").sendChecked>[1], idempotencyKey?: string) => Promise<unknown>;

export type DomainSettings = {
  enabled: boolean;
  fx_rate: number;
  multiplier: number;
  min_price: number;
  contact: Record<string, string> | null;
};

export async function loadSettings(db: SupabaseClient): Promise<DomainSettings | null> {
  const { data } = await db.from("domain_settings").select("enabled, fx_rate, multiplier, min_price, contact").eq("id", 1).maybeSingle();
  return data ? { ...data, fx_rate: Number(data.fx_rate), multiplier: Number(data.multiplier), min_price: Number(data.min_price) } : null;
}

/** On when Studio switched it on, the registrant details are filled in, and Vercel is connected. */
export const domainsReady = (s: DomainSettings | null): s is DomainSettings =>
  !!s && s.enabled && vercelConfigured() && !!s.contact?.email && !!s.contact?.phone && !!s.contact?.address1;

/** Vercel's price × exchange rate × markup, rounded UP to ₱__99, never below the minimum. */
export function pesoPrice(usd: number, s: Pick<DomainSettings, "fx_rate" | "multiplier" | "min_price">) {
  const raw = usd * s.fx_rate * s.multiplier;
  return Math.max(s.min_price, Math.ceil((raw + 1) / 100) * 100 - 1);
}

/** Vercel's public registrar endpoints allow ~10 calls a minute without a token, so the token is always sent when set. */
export class RateLimited extends Error {}
async function vercel(path: string, init: RequestInit = {}, requireAuth = true) {
  const auth = requireAuth || vercelConfigured();
  const url = auth ? `${API}${path}${path.includes("?") ? "&" : "?"}teamId=${TEAM}` : `${API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` } : {}), ...(init.headers ?? {}) },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (res.status === 429 && !requireAuth) throw new RateLimited("rate limited");
  return { ok: res.ok, status: res.status, json };
}

// ---------------------------------------------------------------- search

// The only endings offered (Francis, Oct 11 2026), in this order. All six were checked:
// no extra registrant details needed, and each renews at about its first-year price
// (.events/.family/.life were left out — their renewals cost 3–4× the first year).
// .ph isn't sold by Vercel. To add one, check it the same way first.
export const ENDINGS = ["com", "co", "net", "wedding", "love", "party"];

/** "Gel at 30!" or "gelat30.net" → "gelat30" (+ the ending they typed, if any). */
export function parseQuery(q: string): { label: string; tld: string | null } | null {
  const s = q.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const [first, ...rest] = s.split(".");
  const label = first.replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").slice(0, 63);
  if (label.length < 2) return null;
  return { label, tld: rest.length ? rest.join(".") : null };
}

export type DomainOption = { domain: string; usd: number; renewalUsd: number; php: number };

const searchCache = new Map<string, { at: number; value: { results: DomainOption[]; taken: string[] } }>();

/** This name in each of the six endings: one call to Vercel, cached for 10 minutes. */
export async function searchDomains(_db: SupabaseClient, s: DomainSettings, query: string): Promise<{ results: DomainOption[]; taken: string[] }> {
  const parsed = parseQuery(query);
  if (!parsed) return { results: [], taken: [] };
  const key = `${parsed.label}|${parsed.tld ?? ""}|${s.fx_rate}|${s.multiplier}|${s.min_price}`;
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;

  const order = [...new Set([...(parsed.tld && ENDINGS.includes(parsed.tld) ? [parsed.tld] : []), ...ENDINGS])];
  const r = await vercel("/v1/registrar/domains/search", { method: "POST", body: JSON.stringify({ domains: order.map((t) => `${parsed.label}.${t}`) }) }, false);
  const results: DomainOption[] = [];
  const taken: string[] = [];
  for (const d of (r.json.results ?? []) as { domain: string; available: boolean; price?: number; renewalPrice?: number; premium?: boolean }[]) {
    if (d.available && !d.premium && d.price && d.price > 0) results.push({ domain: d.domain, usd: d.price, renewalUsd: d.renewalPrice ?? d.price, php: pesoPrice(d.price, s) });
    else taken.push(d.domain);
  }
  const value = { results, taken };
  searchCache.set(key, { at: Date.now(), value });
  return value;
}

/** Re-check one exact domain right before checkout. */
export async function quoteDomain(_db: SupabaseClient, s: DomainSettings, domain: string): Promise<DomainOption | null> {
  const d = domain.toLowerCase().trim();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) return null;
  const tld = d.slice(d.indexOf(".") + 1);
  if (!ENDINGS.includes(tld)) return null;
  const r = await vercel("/v1/registrar/domains/search", { method: "POST", body: JSON.stringify({ domains: [d] }) }, false);
  const hit = (r.json.results ?? [])[0] as { available: boolean; price?: number; renewalPrice?: number; premium?: boolean } | undefined;
  if (!hit?.available || hit.premium || !hit.price) return null;
  return { domain: d, usd: hit.price, renewalUsd: hit.renewalPrice ?? hit.price, php: pesoPrice(hit.price, s) };
}

// ---------------------------------------------------------------- buying

type Row = {
  id: string;
  event_id: string | null;
  domain: string;
  status: string;
  price_usd: number;
  renewal_usd: number | null;
  price_php: number;
  vercel_order_id: string | null;
  expires_at: string | null;
};

const contactInfo = (c: Record<string, string>) => {
  const out: Record<string, string> = {};
  for (const k of ["firstName", "lastName", "email", "phone", "address1", "address2", "city", "state", "zip", "country", "companyName"]) if (c[k]?.trim()) out[k] = c[k].trim();
  return out;
};

async function alertStudio(sendMail: SendMail, subject: string, body: string) {
  await sendMail({ from: FROM, to: STUDIO_INBOX, subject, html: layout(subject, body, { label: "Open Studio", url: `${SITE}/studio/templates` }, "From the custom domain system.", { ad: false }) }).catch(
    (e) => console.error("domain alert failed", e),
  );
}

/** What the customer paid for this address (our emails are the receipt; PayMongo's are off). */
async function paidFor(db: SupabaseClient, kind: "domain" | "domain_renewal", domain: string): Promise<string> {
  const { data } = await db.from("payments").select("amount_centavos").eq("kind", kind).eq("domain", domain).eq("status", "paid").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.amount_centavos ? `₱${(Number(data.amount_centavos) / 100).toLocaleString("en-PH")}` : "";
}
const longDay = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

async function ownerEmail(db: SupabaseClient, eventId: string | null) {
  if (!eventId) return null;
  const { data: ev } = await db.from("events").select("name, owner_id").eq("id", eventId).maybeSingle();
  if (!ev?.owner_id) return null;
  const { data: p } = await db.from("profiles").select("email, full_name").eq("id", ev.owner_id).maybeSingle();
  return p?.email ? { email: p.email as string, name: ev.name as string } : null;
}

async function fail(db: SupabaseClient, sendMail: SendMail, row: Row, why: string) {
  await db.from("site_domains").update({ status: "failed", last_error: why.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", row.id);
  await alertStudio(
    sendMail,
    `Custom domain failed: ${row.domain}`,
    `Setting up <strong>${esc(row.domain)}</strong> (paid ₱${row.price_php}) didn’t work: ${esc(why)}<br><br>Retry it from Studio → Templates → Custom domains, or offer the customer another name or a refund.`,
  );
  const owner = await ownerEmail(db, row.event_id);
  if (owner)
    await sendMail(
      {
        from: FROM,
        to: owner.email,
        subject: `We’re sorting out ${row.domain}`,
        html: layout(
          "Your web address needs a moment",
          `We couldn’t finish setting up <strong>${esc(row.domain)}</strong>.<br>We’ll sort it out with you: a new address or a full refund.<br><br>Your website stays live on its free link in the meantime.`,
          { label: "Open your dashboard", url: `${SITE}/account/projects/${row.event_id}?tab=website` },
          "You’re receiving this because you bought a web address on The RSVP Studio.",
          { promo: false },
        ),
      },
      `domain-failed-${row.id}`,
    ).catch(() => {});
}

/** After a domain payment is confirmed: record it and start buying. */
export async function domainPaid(db: SupabaseClient, sendMail: SendMail, payment: Record<string, any>) {
  const { data: row, error } = await db
    .from("site_domains")
    .insert({
      event_id: payment.event_id,
      domain: payment.domain,
      status: "paid",
      price_usd: payment.domain_price_usd,
      renewal_usd: payment.domain_renewal_usd,
      price_php: payment.amount_centavos / 100,
      payment_id: payment.id,
    })
    .select("*")
    .single();
  if (error || !row) {
    await alertStudio(
      sendMail,
      `Custom domain paid but not recorded: ${payment.domain}`,
      `Payment ${esc(payment.id)} (₱${payment.amount_centavos / 100}) for <strong>${esc(payment.domain)}</strong> couldn’t be recorded: ${esc(error?.message ?? "unknown")}. Most likely that domain is already taken by another site. Offer the customer another name or a refund.`,
    );
    return;
  }
  await advanceDomain(db, sendMail, row as Row);
}

/** One step further: paid → buying (order placed) → connecting (bought) → active (live). */
export async function advanceDomain(db: SupabaseClient, sendMail: SendMail, row: Row): Promise<string> {
  if (!vercelConfigured()) return row.status;
  const now = () => new Date().toISOString();

  if (row.status === "paid") {
    // Claim it, so two callers never place two orders.
    const { data: claimed } = await db.from("site_domains").update({ status: "buying", updated_at: now() }).eq("id", row.id).eq("status", "paid").select("id");
    if (!claimed?.length) return "buying";
    const s = await loadSettings(db);
    if (!s?.contact) {
      await fail(db, sendMail, row, "Registrant details are missing in Studio → Templates → Custom domains.");
      return "failed";
    }
    const r = await vercel(`/v1/registrar/domains/${row.domain}/buy`, {
      method: "POST",
      body: JSON.stringify({ autoRenew: false, years: 1, expectedPrice: Number(row.price_usd), contactInformation: contactInfo(s.contact) }),
    });
    if (!r.ok || !r.json.orderId) {
      await fail(db, sendMail, row, `${r.json.code ?? r.status}: ${r.json.message ?? "Vercel refused the order"}`);
      return "failed";
    }
    await db.from("site_domains").update({ vercel_order_id: r.json.orderId, updated_at: now() }).eq("id", row.id);
    row = { ...row, status: "buying", vercel_order_id: r.json.orderId };
  }

  if (row.status === "buying" && row.vercel_order_id) {
    const r = await vercel(`/v1/registrar/orders/${row.vercel_order_id}`);
    const status = r.json.status as string | undefined;
    if (status === "failed") {
      await fail(db, sendMail, row, `Vercel order failed: ${JSON.stringify(r.json.error ?? r.json.domains?.[0]?.error ?? "")}`);
      return "failed";
    }
    if (status !== "completed") return "buying";
    await db
      .from("site_domains")
      .update({ status: "connecting", purchased_at: now(), expires_at: new Date(Date.now() + 365 * 86_400_000).toISOString(), updated_at: now() })
      .eq("id", row.id)
      .eq("status", "buying");
    row = { ...row, status: "connecting" };
  }

  if (row.status === "connecting") {
    const add = async (body: Record<string, unknown>) => {
      const r = await vercel(`/v10/projects/${PROJECT}/domains`, { method: "POST", body: JSON.stringify(body) });
      // 409 / "already exists" = already connected on an earlier try.
      return r.ok || r.status === 409 || /already/i.test(String(r.json.error?.message ?? r.json.message ?? "")) ? null : `${r.status}: ${r.json.error?.message ?? r.json.message ?? "couldn’t connect"}`;
    };
    const err = (await add({ name: row.domain })) ?? (await add({ name: `www.${row.domain}`, redirect: row.domain, redirectStatusCode: 308 }));
    if (err) {
      await db.from("site_domains").update({ last_error: err.slice(0, 500), updated_at: now() }).eq("id", row.id);
      return "connecting"; // tried again on the next call; the daily job alerts if it's stuck
    }
    const { data: done } = await db.from("site_domains").update({ status: "active", last_error: null, updated_at: now() }).eq("id", row.id).eq("status", "connecting").select("id");
    if (done?.length) {
      const owner = await ownerEmail(db, row.event_id);
      const paid = await paidFor(db, "domain", row.domain);
      if (owner)
        await sendMail(
          {
            from: FROM,
            to: owner.email,
            subject: `Your website is live at ${row.domain}`,
            html: layout(
              `You’re live at ${esc(row.domain)}`,
              `Your website for <strong>${esc(owner.name)}</strong> now has its own address: <a href="https://${esc(row.domain)}">${esc(row.domain)}</a>.<br>Share it with your guests. Your free link keeps working too.<br><br>It’s yours for a year, and your website stays online for as long as it is.${paid ? `<br><br><span style="color:#868697">Paid ${paid} for ${esc(row.domain)}, one year.</span>` : ""}`,
              { label: `Open ${row.domain}`, url: `https://${row.domain}` },
              "You’re receiving this because you bought a web address on The RSVP Studio.",
            ),
          },
          `domain-live-${row.id}`,
        ).catch(() => {});
    }
    return "active";
  }
  return row.status;
}

/** A paid renewal: renew for a year at the quoted price. */
export async function domainRenewalPaid(db: SupabaseClient, sendMail: SendMail, payment: Record<string, any>) {
  const { data: row } = await db.from("site_domains").select("*").eq("domain", payment.domain).maybeSingle();
  if (!row) return alertStudio(sendMail, `Renewal paid for unknown domain ${payment.domain}`, `Payment ${esc(payment.id)} — check Studio.`);
  const s = await loadSettings(db);
  const r = await vercel(`/v1/registrar/domains/${row.domain}/renew`, {
    method: "POST",
    body: JSON.stringify({ years: 1, expectedPrice: Number(payment.domain_price_usd), ...(s?.contact ? { contactInformation: contactInfo(s.contact) } : {}) }),
  });
  if (!r.ok) {
    await db.from("site_domains").update({ last_error: `renewal: ${r.json.code ?? r.status} ${r.json.message ?? ""}`.slice(0, 500) }).eq("id", row.id);
    return alertStudio(sendMail, `Domain renewal failed: ${row.domain}`, `The customer paid ₱${payment.amount_centavos / 100} to renew <strong>${esc(row.domain)}</strong>, but Vercel said: ${esc(r.json.message ?? String(r.status))}. Renew it by hand in Vercel or refund.`);
  }
  const base = row.expires_at && Date.parse(row.expires_at) > Date.now() ? Date.parse(row.expires_at) : Date.now();
  const until = new Date(base + 365 * 86_400_000).toISOString();
  await db
    .from("site_domains")
    .update({ status: "active", expires_at: until, renew_notice_sent_at: null, last_error: null, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  // The renewal's confirmation (and receipt): paid, and until when.
  // Next year gets its 7-day warning too (a separate update: the column comes with email-additions.sql).
  await db.from("site_domains").update({ final_notice_sent_at: null }).eq("id", row.id);
  const owner = await ownerEmail(db, row.event_id);
  if (owner)
    await sendMail(
      {
        from: FROM,
        to: owner.email,
        subject: `${row.domain} is renewed until ${longDay(until)}`,
        html: layout(
          "Renewed for another year",
          `<strong>${esc(row.domain)}</strong> is yours until <strong>${longDay(until)}</strong>.<br>Your website for <strong>${esc(owner.name)}</strong> stays on this address.<br><br><span style="color:#868697">Paid ₱${(Number(payment.amount_centavos) / 100).toLocaleString("en-PH")} for one more year.</span>`,
          { label: "Open your dashboard", url: `${SITE}/account/projects/${row.event_id}?tab=website` },
          "You’re receiving this because you own this web address through The RSVP Studio.",
          { promo: false },
        ),
      },
      `domain-renewed-${row.id}-${until.slice(0, 10)}`,
    ).catch(() => {});
}

/** Daily: finish anything stuck, tell owners 30 days before expiry, mark expired ones. */
export async function domainsDaily(db: SupabaseClient, sendMail: SendMail) {
  const report = { advanced: 0, renewNotices: 0, expired: 0, errors: [] as string[] };
  const { data: open } = await db.from("site_domains").select("*").in("status", ["paid", "buying", "connecting"]).lt("updated_at", new Date(Date.now() - 10 * 60_000).toISOString());
  for (const row of (open ?? []) as Row[]) {
    try {
      await advanceDomain(db, sendMail, row);
      report.advanced++;
      if (Date.now() - Date.parse((row as Row & { updated_at: string }).updated_at) > 86_400_000)
        await alertStudio(sendMail, `Custom domain stuck: ${row.domain}`, `<strong>${esc(row.domain)}</strong> has been “${row.status}” for over a day. Check it in Studio → Templates → Custom domains.`);
    } catch (e) {
      report.errors.push(`domain ${row.domain}: ${e instanceof Error ? e.message : e}`);
    }
  }
  const s = await loadSettings(db);
  const { data: soon } = await db
    .from("site_domains")
    .select("*")
    .eq("status", "active")
    .is("renew_notice_sent_at", null)
    .lt("expires_at", new Date(Date.now() + 30 * 86_400_000).toISOString());
  for (const row of (soon ?? []) as Row[]) {
    const owner = await ownerEmail(db, row.event_id);
    if (owner && s) {
      const php = pesoPrice(Number(row.renewal_usd ?? row.price_usd), s);
      await sendMail(
        {
          from: FROM,
          to: owner.email,
          subject: `${row.domain} expires on ${new Date(row.expires_at!).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}`,
          html: layout(
            `Keep ${esc(row.domain)}?`,
            `Your web address <strong>${esc(row.domain)}</strong> expires on ${new Date(row.expires_at!).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}. Renew it for a year for ₱${php.toLocaleString("en-PH")}.<br>If you don’t, the address stops working after that date.`,
            { label: "Renew it", url: `${SITE}/account/projects/${row.event_id}?tab=website` },
            "You’re receiving this because you own this web address through The RSVP Studio.",
          ),
        },
        `domain-renew-${row.id}-${row.expires_at}`,
      ).catch((e) => report.errors.push(`renew notice ${row.domain}: ${e}`));
    }
    await db.from("site_domains").update({ renew_notice_sent_at: new Date().toISOString() }).eq("id", row.id);
    report.renewNotices++;
  }
  // A week left: the last warning (email-additions.sql adds final_notice_sent_at; until then this read fails and is skipped).
  const { data: last, error: lastErr } = await db
    .from("site_domains")
    .select("*")
    .eq("status", "active")
    .is("final_notice_sent_at", null)
    .gt("expires_at", new Date().toISOString())
    .lt("expires_at", new Date(Date.now() + 7 * 86_400_000).toISOString());
  for (const row of lastErr ? [] : ((last ?? []) as Row[])) {
    const owner = await ownerEmail(db, row.event_id);
    if (owner && s) {
      const php = pesoPrice(Number(row.renewal_usd ?? row.price_usd), s);
      const { data: ws } = await db.from("wedding_sites").select("slug").eq("event_id", row.event_id).maybeSingle();
      await sendMail(
        {
          from: FROM,
          to: owner.email,
          subject: `${row.domain} stops working on ${longDay(row.expires_at!)}`,
          html: layout(
            `${esc(row.domain)} stops working in a week`,
            `Your web address <strong>${esc(row.domain)}</strong> expires on <strong>${longDay(row.expires_at!)}</strong>.<br>Renew it for ₱${php.toLocaleString("en-PH")} to keep it.${
              ws?.slug ? `<br><br>If you don’t, your website stays online at its free link:<br>thersvpstudio.com/invite/${esc(ws.slug)}` : ""
            }`,
            { label: "Renew it", url: `${SITE}/account/projects/${row.event_id}?tab=website` },
            "You’re receiving this because you own this web address through The RSVP Studio.",
            { promo: false },
          ),
        },
        `domain-final-${row.id}-${row.expires_at}`,
      ).catch((e) => report.errors.push(`final notice ${row.domain}: ${e}`));
    }
    await db.from("site_domains").update({ final_notice_sent_at: new Date().toISOString() }).eq("id", row.id);
    report.renewNotices++;
  }
  const { data: gone } = await db.from("site_domains").update({ status: "expired", updated_at: new Date().toISOString() }).eq("status", "active").lt("expires_at", new Date().toISOString()).select("id, domain, event_id");
  report.expired = gone?.length ?? 0;
  // Gone: say so, and where the website is now.
  for (const row of (gone ?? []) as { id: string; domain: string; event_id: string }[]) {
    const owner = await ownerEmail(db, row.event_id);
    if (!owner) continue;
    const { data: ws } = await db.from("wedding_sites").select("slug").eq("event_id", row.event_id).maybeSingle();
    await sendMail(
      {
        from: FROM,
        to: owner.email,
        subject: `${row.domain} has expired`,
        html: layout(
          `${esc(row.domain)} has expired`,
          `The address <strong>${esc(row.domain)}</strong> no longer opens your website.${
            ws?.slug ? `<br>Your website for <strong>${esc(owner.name)}</strong> is still online at its free link:<br><a href="${SITE}/invite/${esc(ws.slug)}">thersvpstudio.com/invite/${esc(ws.slug)}</a>` : ""
          }`,
          { label: "Open your dashboard", url: `${SITE}/account/projects/${row.event_id}?tab=website` },
          "You’re receiving this because you owned this web address through The RSVP Studio.",
          { promo: false },
        ),
      },
      `domain-expired-${row.id}`,
    ).catch((e) => report.errors.push(`expired notice ${row.domain}: ${e}`));
  }
  return report;
}
