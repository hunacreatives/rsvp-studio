import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "The RSVP Studio <hello@thersvpstudio.com>";
const SITE = "https://thersvpstudio.com";

type Body = {
  email: string;
  fullName?: string;
};

function renderEmail(firstName: string) {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <style>
      /* Force this email to always render as light-mode-designed, even
         when the client (Gmail app, Apple Mail) is in dark mode — without
         this, clients auto-invert text and guess wrong on a colored hero. */
      :root { color-scheme: light only; supported-color-schemes: light only; }
      @media (prefers-color-scheme: dark) {
        .force-white { color: #ffffff !important; }
        .force-white-70 { color: rgba(255,255,255,0.75) !important; }
        .force-ink { color: #000727 !important; }
        .force-slate { color: #868697 !important; }
        .force-blue { color: #2f61d5 !important; }
        .force-blue-bg { background: #2f61d5 !important; }
        .force-card-bg { background: #ffffff !important; }
        .force-page-bg { background: #fffff9 !important; }
      }
    </style>
  </head>
  <body class="force-page-bg" bgcolor="#fffff9" style="margin:0;padding:0;background:#fffff9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fffff9" class="force-page-bg" style="background:#fffff9;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" class="force-card-bg" style="max-width:600px;width:100%;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 24px 60px -24px rgba(0,7,39,0.25);">

            <!-- Hero -->
            <tr>
              <td bgcolor="#1a2456" style="background:linear-gradient(135deg,#000727 0%,#25265e 55%,#2f61d5 130%);padding:44px 32px 0;text-align:center;">
                <img src="${SITE}/brand/logotype-white.png" alt="The RSVP Studio" width="180" style="display:block;margin:0 auto 28px;height:auto;" />
                <h1 class="force-white" style="margin:0;color:#ffffff !important;font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:34px;line-height:1.15;letter-spacing:-0.01em;">
                  You're Officially<br />Signed Up!
                </h1>
                <p class="force-white-70" style="margin:16px auto 0;max-width:380px;color:rgba(255,255,255,0.75) !important;font-size:15px;line-height:1.6;">
                  Welcome, ${firstName}. Your RSVP Studio account is ready to go.
                </p>
                <img src="${SITE}/services/stationery/hero-heart.png" alt="" width="220" style="display:block;margin:28px auto 0;height:auto;" />
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:40px 40px 8px;text-align:center;">
                <p class="force-ink" style="margin:0 0 20px;color:#000727 !important;font-size:16px;line-height:1.7;">
                  You now have your own dashboard to check in on your event, anytime —
                  no more waiting on a CSV or a passcode page. Your guest list and RSVPs
                  are right there whenever you want a look.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 0;">
                  <tr>
                    <td bgcolor="#2f61d5" class="force-blue-bg" style="border-radius:999px;box-shadow:0 12px 30px -12px rgba(47,97,213,0.6);">
                      <a href="${SITE}/account" class="force-white" style="display:inline-block;padding:16px 40px;color:#ffffff !important;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
                        View My Dashboard
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:32px 40px 40px;">
                <hr style="border:none;border-top:1px solid #e7e7e0;margin:0 0 24px;" />
                <p class="force-slate" style="margin:0 0 16px;text-align:center;font-size:13px;color:#868697 !important;line-height:1.7;">
                  Questions? Email us at
                  <a href="mailto:hello@thersvpstudio.com" class="force-blue" style="color:#2f61d5 !important;text-decoration:none;">hello@thersvpstudio.com</a>
                  or visit our <a href="${SITE}/faqs" class="force-blue" style="color:#2f61d5 !important;text-decoration:none;">FAQs</a>.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                  <tr>
                    <td style="padding:0 10px;">
                      <a href="https://www.instagram.com/rsvpstudioo/" class="force-ink" style="color:#25265e !important;text-decoration:none;font-size:20px;">&#9679;</a>
                    </td>
                    <td style="padding:0 10px;">
                      <a href="https://www.facebook.com/share/19fvSStpSZ/?mibextid=wwXIfr" class="force-ink" style="color:#25265e !important;text-decoration:none;font-size:20px;">&#9679;</a>
                    </td>
                  </tr>
                </table>
                <p class="force-slate" style="margin:0;text-align:center;font-size:11px;color:#868697 !important;">
                  The RSVP Studio, a Huna Creatives brand &mdash; ${SITE.replace("https://", "")}
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, fullName } = req.body as Body;
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }

  const firstName = (fullName || "").trim().split(" ")[0] || "there";

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "You're officially signed up 🎉",
      html: renderEmail(firstName),
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    // Don't block the sign-up flow over a failed welcome email.
    res.status(200).json({ ok: false });
  }
}
