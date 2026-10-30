import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { clean, esc, isEmail, sendChecked } from "./_lib/email.js";
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

/** The thank-you for joining the launch list (the launch page's "Notify me"). */
export function renderLaunchEmail() {
  return frame({
    preheader: "We'll write the day the doors open. Until then, it stays a surprise.",
    spot: "followup-draft.png",
    spotAlt: "A friendly blue character waving",
    footer: "You received this email because you joined the launch list at thersvpstudio.com.",
    content: `<tr><td class="pad" align="center" style="padding:24px 56px 8px;text-align:center;">
${h1("You’re on the list.")}
${p("Thank you for signing up. We open the doors<br />on Monday, November&nbsp;2, and you’ll hear&nbsp;first.", 8)}
${p("Event websites and invitations that open like a film. RSVPs, guests and seating, all in one&nbsp;link. That’s all we’ll say for&nbsp;now.", 26)}
${p(`<span style="font-size:14px;color:#868697;">One email on launch day, then the occasional&nbsp;update.<br />Questions? Reply to this email. A real person reads every&nbsp;one.</span>`, 30)}
</td></tr>`,
  });
}

/** "Notify me" on the launch page: the email goes on the list, and gets one thank-you, ever. */
async function launchSignup(req: VercelRequest, res: VercelResponse) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
  const email = clean(body.email, 254).toLowerCase();
  if (!isEmail(email)) {
    res.status(400).json({ error: "That doesn't look like an email" });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("launch_signups")
    .upsert({ email, source: clean(body.source, 80) || null }, { onConflict: "email", ignoreDuplicates: true })
    .select("id");
  if (error) {
    console.error(error);
    res.status(500).json({ error: "Couldn't save that" });
    return;
  }
  // already on the list: no second email
  if (!data?.length || !resend) {
    res.status(200).json({ ok: true });
    return;
  }
  try {
    await sendChecked(resend, { from: FROM, to: email, subject: "You’re on the list", html: renderLaunchEmail() });
  } catch (err) {
    console.error(err); // they're on the list either way
  }
  res.status(200).json({ ok: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (req.query.op === "launch") return launchSignup(req, res);

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
