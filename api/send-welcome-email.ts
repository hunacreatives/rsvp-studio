import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { esc, sendChecked } from "./_lib/email.js";
import { navyButton } from "./_lib/support-mail.js";
import { frame, h1, p, SITE } from "./_lib/enquiry-mail.js";

// No key (a local or preview build): skip the email instead of crashing on load.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const FROM = "The RSVP Studio <hello@thersvpstudio.com>";

/** The shared branded frame (enquiry-mail.ts), event-first: most people who sign up build
 *  their own site; studio clients get a line to their dashboard. */
export function renderEmail(firstName: string) {
  const link = `color:#000727!important;font-weight:600;`;
  return frame({
    preheader: "Make your event website, share one link, and watch the RSVPs come in.",
    spot: "followup-draft.png",
    spotAlt: "A friendly blue character waving",
    footer: "You received this email because you created an account at thersvpstudio.com.",
    content: `<tr><td class="pad" align="center" style="padding:24px 56px 8px;text-align:center;">
${h1(`Welcome, ${firstName}.`)}
${p("Make your event website, share one link,<br />and watch the RSVPs come&nbsp;in.", 8)}
${p(`<span style="font-size:14px;color:#868697;">Free to start. Premium only if you need&nbsp;it.</span>`, 26)}
<div style="margin:0 0 28px;">${navyButton("Start your event", `${SITE}/build`)}</div>
${p(`Working with our studio? <a href="${SITE}/account" style="${link}">Your dashboard is here</a>.<br />Questions? Reply to this email. A real person reads every&nbsp;one.`, 30)}
</td></tr>`,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Only ever email the signed-in caller's own address — never an address
  // from the request body — so this can't be used to send branded mail to
  // strangers.
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data } = await supabaseAdmin.auth.getUser(token);
  const user = data?.user;
  if (!user?.email) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  // Once per account, decided here (app_metadata only the server can write), not by the browser.
  if (user.app_metadata?.welcome_sent_at) {
    res.status(200).json({ ok: true, already: true });
    return;
  }
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipped the welcome email");
    res.status(200).json({ ok: false });
    return;
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";
  const firstName = esc(fullName.trim().split(" ")[0] || "there");

  try {
    await sendChecked(resend, {
      from: FROM,
      to: user.email,
      subject: "Your RSVP Studio account is ready",
      html: renderEmail(firstName),
    });
    await supabaseAdmin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, welcome_sent_at: new Date().toISOString() } });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    // Don't block the sign-up flow over a failed welcome email.
    res.status(200).json({ ok: false });
  }
}
