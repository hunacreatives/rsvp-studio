import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "The RSVP Studio <hello@thersvpstudio.com>";
const TO = "hello@thersvpstudio.com";

// Vercel Functions cap request bodies around 4.5 MB, so we only forward
// attachments (base64-encoded, ~33% larger than the original file) up to
// this combined budget. Anything over that is dropped from the email but
// still listed by filename so the sender knows to follow up directly.
const MAX_ATTACHMENT_BYTES = 3_000_000;

type Attachment = { filename: string; content: string; size: number };

type Body = {
  form: "project-inquiry" | "partner-inquiry";
  values: Record<string, string | string[]>;
  attachments?: Attachment[];
};

function labelize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderRows(values: Record<string, string | string[]>) {
  return Object.entries(values)
    .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v))
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px 6px 0;color:#8a8478;vertical-align:top;white-space:nowrap;">${labelize(k)}</td><td style="padding:6px 0;font-weight:600;">${Array.isArray(v) ? v.join(", ") : v}</td></tr>`,
    )
    .join("");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { form, values, attachments = [] } = req.body as Body;
  const email = (values?.email as string) || "";
  const name = (values?.your_name as string) || "";

  if (!email || !name) {
    res.status(400).json({ error: "Name and email required" });
    return;
  }

  let attachmentBudget = MAX_ATTACHMENT_BYTES;
  const included: { filename: string; content: string }[] = [];
  const omitted: string[] = [];
  for (const a of attachments) {
    if (a.size <= attachmentBudget) {
      included.push({ filename: a.filename, content: a.content });
      attachmentBudget -= a.size;
    } else {
      omitted.push(a.filename);
    }
  }

  const heading =
    form === "partner-inquiry" ? "New Partner Inquiry" : "New Project Inquiry";

  try {
    await Promise.all([
      resend.emails.send({
        from: FROM,
        to: TO,
        subject: `${form === "partner-inquiry" ? "🤝" : "🥂"} ${heading} from ${name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #3a3a3a;">${heading}</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
              ${renderRows(values)}
            </table>
            ${
              omitted.length
                ? `<p style="margin-top:16px;font-size:12px;color:#b9974a;">Attachment(s) too large to include: ${omitted.join(", ")}. Follow up with ${email} to request them directly.</p>`
                : ""
            }
            <p style="margin-top: 24px; color: #b9974a; font-size: 12px;">Sent from thersvpstudio.com</p>
          </div>
        `,
        attachments: included.length ? included : undefined,
        replyTo: email,
      }),
      resend.emails.send({
        from: FROM,
        to: email,
        subject:
          form === "partner-inquiry"
            ? "We've received your partnership inquiry — The RSVP Studio"
            : "We've received your inquiry — The RSVP Studio",
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #4a4a4a;">
            <p style="font-size: 40px; text-align: center; margin: 0 0 8px;">🥂</p>
            <h2 style="text-align: center; color: #333333; font-size: 22px; margin: 0 0 4px;">Thank you, ${name}!</h2>
            <p style="text-align: center; color: #8a8478; font-size: 14px; margin: 0 0 28px;">
              We've received your ${form === "partner-inquiry" ? "partnership " : ""}inquiry and will be in touch within two business days.
            </p>
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #9a9a9a; line-height: 1.7; margin: 0;">
                The RSVP Studio — bespoke digital invitations &amp; RSVP sites for weddings, milestones, and celebrations.
              </p>
            </div>
          </div>
        `,
      }),
    ]);

    res.status(200).json({ ok: true, omitted });
  } catch (err) {
    console.error("Resend error:", err);
    res.status(500).json({ error: "Failed to send inquiry" });
  }
}
