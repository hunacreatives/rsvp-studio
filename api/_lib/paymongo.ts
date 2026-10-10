import { createHmac, timingSafeEqual } from "node:crypto";

// PayMongo hosted Checkout (GCash, Maya, card, QR Ph…). Ported from Asana Ormoc's
// edge functions. Keys live in Vercel: PAYMONGO_SECRET_KEY (sk_test_… / sk_live_…),
// PAYMONGO_WEBHOOK_SECRET (whsec_…), and optionally PAYMONGO_PAYMENT_METHODS —
// only list methods that are Active in the PayMongo dashboard, or checkout fails.

const API = "https://api.paymongo.com/v1";
export const MIN_CENTAVOS = 2000; // PayMongo's practical floor (₱20)

export const paymongoConfigured = () => !!process.env.PAYMONGO_SECRET_KEY;
const methods = () =>
  (process.env.PAYMONGO_PAYMENT_METHODS || "gcash,paymaya,qrph,card")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

export async function createCheckoutSession(opts: {
  amountCentavos: number;
  name: string;
  description: string;
  email?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<{ id: string; checkoutUrl: string }> {
  const res = await fetch(`${API}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [{ name: opts.name.slice(0, 255), amount: opts.amountCentavos, currency: "PHP", quantity: 1 }],
          payment_method_types: methods(),
          description: opts.description.slice(0, 255),
          send_email_receipt: true,
          show_line_items: true,
          ...(opts.email ? { customer_email: opts.email } : {}),
          success_url: opts.successUrl,
          cancel_url: opts.cancelUrl,
          metadata: opts.metadata,
        },
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { id: string; attributes: { checkout_url: string } }; errors?: { detail?: string }[] };
  if (!res.ok || !json.data) throw new Error(`PayMongo: ${json.errors?.map((e) => e.detail).join("; ") || res.status}`);
  return { id: json.data.id, checkoutUrl: json.data.attributes.checkout_url };
}

/** `Paymongo-Signature: t=…,te=…,li=…` — HMAC-SHA256 of `${t}.${raw body}`; te = test mode, li = live. */
export function verifyPaymongoSignature(raw: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=").map((s) => s.trim()) as [string, string]));
  if (!parts.t) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest();
  return [parts.te, parts.li].some((sig) => {
    if (!sig || !/^[0-9a-f]+$/i.test(sig)) return false;
    const got = Buffer.from(sig, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
