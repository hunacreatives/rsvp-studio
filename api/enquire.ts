import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { clean, esc, isEmail, sendChecked } from "./_lib/email.js";

// The site's contact forms: the project inquiry, the partner inquiry, and the FAQ
// page's "Ask a question". Every submission is saved (`enquiries`, see
// supabase/hardening.sql) and emailed to the studio; the sender gets a receipt.
//
// Abuse guards (public endpoint that sends branded email):
// - hidden honeypot field (`website`) quietly drops naive bots;
// - fields are length-capped and HTML-escaped;
// - at most 5 submissions an hour per sender (by email, and by hashed IP);
// - attachments: up to 5 files, pdf/images only, measured by their real decoded size.

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const send = (payload: Parameters<typeof sendChecked>[1]) =>
  resend ? sendChecked(resend, payload) : Promise.resolve(console.warn(`RESEND_API_KEY not set — skipped email "${payload.subject}"`));

const FROM = "The RSVP Studio <hello@thersvpstudio.com>";
const TO = "hello@thersvpstudio.com";

// Vercel caps request bodies around 4.5 MB (base64 adds ~33%), so attachments
// share this budget; anything over is listed by name for a follow-up.
const MAX_ATTACHMENT_BYTES = 3_000_000;
const MAX_FILES = 5;
const ALLOWED_FILE = /\.(pdf|jpe?g|png|webp|heic|heif)$/i;
const PER_HOUR = 5;

const FORMS = {
  "project-inquiry": { heading: "New Project Inquiry", icon: "🥂", receipt: "inquiry" },
  "partner-inquiry": { heading: "New Partner Inquiry", icon: "🤝", receipt: "partnership inquiry" },
  "faq-question": { heading: "New Question from the FAQ page", icon: "💬", receipt: "question" },
} as const;
type Form = keyof typeof FORMS;

type Attachment = { filename: string; content: string; size?: number };

function labelize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Only plain strings / short string lists, with sane limits. */
function tidy(values: unknown): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (!values || typeof values !== "object") return out;
  for (const [k, v] of Object.entries(values as Record<string, unknown>).slice(0, 40)) {
    const key = k.replace(/[^\w]/g, "").slice(0, 40);
    if (!key || key === "website") continue;
    if (Array.isArray(v)) out[key] = v.slice(0, 20).map((x) => clean(x, 200)).filter(Boolean);
    else if (typeof v === "string") out[key] = clean(v, 2000);
  }
  return out;
}

function renderRows(values: Record<string, string | string[]>) {
  return Object.entries(values)
    .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v))
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px 6px 0;color:#8a8478;vertical-align:top;white-space:nowrap;">${esc(labelize(k))}</td><td style="padding:6px 0;font-weight:600;white-space:pre-line;">${esc(Array.isArray(v) ? v.join(", ") : String(v))}</td></tr>`,
    )
    .join("");
}

const ipHash = (req: VercelRequest) => {
  const ip = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || req.socket?.remoteAddress || "";
  return ip ? createHash("sha256").update(`enquiry:${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex").slice(0, 32) : null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = (req.body ?? {}) as { form?: string; values?: Record<string, unknown>; attachments?: Attachment[]; website?: string };
  // Honeypot: real people never see or fill this field.
  if (clean(body.website, 200) || clean(body.values?.website, 200)) return res.status(200).json({ ok: true, omitted: [] });

  const form = (Object.keys(FORMS).includes(String(body.form)) ? body.form : "project-inquiry") as Form;
  const values = tidy(body.values);
  const email = String(values.email ?? "").toLowerCase();
  const name = String(values.your_name || values.full_name || "");
  if (!name || !isEmail(email)) return res.status(400).json({ error: "Please enter your name and a valid email." });

  // Slow down repeat senders (same email or same network) — 5 an hour.
  const hash = ipHash(req);
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const [byEmail, byIp] = await Promise.all([
    supabaseAdmin.from("enquiries").select("id", { count: "exact", head: true }).ilike("email", email.replace(/[%_\\]/g, "\\$&")).gte("created_at", hourAgo),
    hash ? supabaseAdmin.from("enquiries").select("id", { count: "exact", head: true }).eq("ip_hash", hash).gte("created_at", hourAgo) : Promise.resolve({ count: 0 }),
  ]);
  if ((byEmail.count ?? 0) >= PER_HOUR || (byIp.count ?? 0) >= PER_HOUR) {
    return res.status(429).json({ error: "You’ve sent a few messages in the last hour — we have them and will reply soon. For anything urgent, email hello@thersvpstudio.com." });
  }

  // Attachments: real decoded size, allowed types only.
  let budget = MAX_ATTACHMENT_BYTES;
  const included: { filename: string; content: string }[] = [];
  const omitted: string[] = [];
  for (const a of (Array.isArray(body.attachments) ? body.attachments : []).slice(0, 20)) {
    const filename = clean(a?.filename, 120).replace(/[^\w.\- ()]+/g, "_") || "file";
    const content = typeof a?.content === "string" ? a.content : "";
    const bytes = content ? Buffer.from(content, "base64").length : 0;
    if (included.length >= MAX_FILES || !ALLOWED_FILE.test(filename) || !bytes || bytes > budget) {
      omitted.push(filename);
      continue;
    }
    included.push({ filename, content });
    budget -= bytes;
  }

  const { heading, icon, receipt } = FORMS[form];
  const { error: saveError } = await supabaseAdmin.from("enquiries").insert({
    form,
    name,
    email,
    phone: String(values.phone ?? values.mobile ?? "") || null,
    values,
    attachments: included.map((a) => a.filename),
    ip_hash: hash,
  });
  if (saveError) console.error("enquiry save failed", saveError);

  try {
    const [studioCopy, receiptCopy] = await Promise.allSettled([
      send({
        from: FROM,
        to: TO,
        subject: `${icon} ${heading} from ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #3a3a3a;">${heading}</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
              ${renderRows(values)}
            </table>
            ${
              omitted.length
                ? `<p style="margin-top:16px;font-size:12px;color:#b9974a;">Not attached (too large, too many, or not a PDF/image): ${esc(omitted.join(", "))}. Ask ${esc(email)} to send them another way.</p>`
                : ""
            }
            <p style="margin-top: 24px; color: #b9974a; font-size: 12px;">Sent from thersvpstudio.com</p>
          </div>
        `,
        attachments: included.length ? included : undefined,
        replyTo: email,
      }),
      send({
        from: FROM,
        to: email,
        subject: `We’ve received your ${receipt} — The RSVP Studio`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #4a4a4a;">
            <p style="font-size: 40px; text-align: center; margin: 0 0 8px;">${icon}</p>
            <h2 style="text-align: center; color: #333333; font-size: 22px; margin: 0 0 4px;">Thank you, ${esc(name.split(" ")[0])}.</h2>
            <p style="text-align: center; color: #8a8478; font-size: 14px; margin: 0 0 28px;">
              We’ve received your ${receipt} and will reply within 1 business day (Monday to Friday, Philippine time).
            </p>
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #9a9a9a; line-height: 1.7; margin: 0;">
                The RSVP Studio — digital invitations, event websites and stationery for weddings, birthdays and every celebration.
              </p>
            </div>
          </div>
        `,
      }),
    ]);

    if (receiptCopy.status === "rejected") console.error("Inquiry receipt email failed:", receiptCopy.reason);
    if (studioCopy.status === "rejected") throw studioCopy.reason;
    return res.status(200).json({ ok: true, omitted });
  } catch (err) {
    console.error("Resend error:", err);
    return res.status(500).json({ error: "Failed to send inquiry" });
  }
}
