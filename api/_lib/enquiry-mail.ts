import { esc } from "./email.js";
import { brandFooter, emailHead, partnerLayout, preheaderHtml } from "./support-mail.js";
import { inlineHtml, parseReply, plainReply } from "./reply-markup.js";

// The "we got it" email someone receives after sending a form (api/enquire.ts).
//   project-inquiry → "We got your RSVP": an RSVP-style reply card with what they asked
//                     about, what happens next, and things to browse while they wait.
//   faq-question    → the same frame, their question quoted back.
//   partner-inquiry → the partner look (blue, the characters): "Your application is in".
// Branded like the password-reset email (logo, illustration, footer); light-mode safe.

export const SITE = "https://thersvpstudio.com";
type Values = Record<string, string | string[]>;

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(", ") : (v ?? "")).trim();
const nice = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const day = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00+08:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
};

// Inline styles (email clients ignore most CSS); force-* classes keep dark mode from inverting.
export const INK = "#000727";
export const BODY = "#4a4b63";
export const SLATE = "#868697";
export const CORAL = "#ff7052";

/** The branded email: logo, an illustration, the content rows, links and a footer line.
 *  Also used by the follow-up emails (followup-mail.ts), which pass their own footer. */
export function frame({ preheader, spot, spotAlt, content, footer = "You received this email because you sent us a message on thersvpstudio.com.", cover, tagline = true }: { preheader: string; spot: string; spotAlt: string; content: string; footer?: string; cover?: string; /** Our sign-off; off for guests' emails (those are the couple's). */ tagline?: boolean }) {
  return `<!doctype html><html><head>${emailHead()}</head>
<body class="fpage" bgcolor="#f3f3f5" style="margin:0;padding:0;background:#f3f3f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
${preheaderHtml(preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f3f5" class="fpage" style="background:#f3f3f5;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" class="fcard" style="max-width:560px;width:100%;background:#ffffff;">
<tr><td align="center" style="padding:36px 32px 8px;"><img src="${SITE}/brand/logotype-dark.png" alt="The RSVP Studio" width="128" style="display:block;height:auto;border:0;" /></td></tr>
${cover
  ? `<tr><td align="center" style="padding:22px 32px 4px;"><table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ffffff" style="background:#ffffff;padding:8px 8px 22px;border:1px solid #ece8e1;border-radius:4px;box-shadow:0 8px 20px -12px rgba(0,7,39,0.35);"><img src="${cover}" alt="${spotAlt}" width="150" style="display:block;width:150px;max-width:100%;height:auto;border:0;" /></td></tr></table></td></tr>`
  : `<tr><td align="center" style="padding:22px 32px 4px;"><img src="${SITE}/email/${spot}" alt="${spotAlt}" width="200" style="display:block;width:200px;height:auto;border:0;" /></td></tr>`}
${content}
${brandFooter(footer, { tagline })}
</table></td></tr></table></body></html>`;
}

export const p = (html: string, mb = 18) => `<p class="fb" style="margin:0 0 ${mb}px;color:${BODY}!important;font-size:16px;line-height:1.7;">${html}</p>`;
export const h1 = (text: string) => `<h1 class="fi" style="margin:0 0 16px;text-align:center;color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:400;">${text}</h1>`;
export const label = (text: string) => `<p class="fs" style="margin:0 0 12px;text-align:center;color:${SLATE}!important;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;">${text}</p>`;

/** What happens next: three numbered steps. */
export function steps(items: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">${items
    .map(
      (t, i) => `<tr><td valign="top" width="34" style="padding:0 0 14px;"><div style="width:24px;height:24px;border-radius:12px;background:${CORAL};color:#ffffff;font-size:12px;font-weight:700;line-height:24px;text-align:center;" class="fw">${i + 1}</div></td>
<td valign="top" class="fb" style="padding:2px 0 14px;color:${BODY}!important;font-size:15px;line-height:1.6;">${t}</td></tr>`,
    )
    .join("")}</table>`;
}

/** "While you wait": three picture links. */
export function browse(cards: { img: string; title: string; text: string; url: string }[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cards
    .map(
      (c) => `<td class="col" width="33%" valign="top" style="padding:0 6px;">
<a href="${c.url}" style="text-decoration:none;display:block;">
<img src="${SITE}/email/${c.img}" alt="" width="148" style="display:block;width:100%;max-width:220px;height:auto;border:0;border-radius:12px;" />
<p class="fi" style="margin:10px 0 2px;color:${INK}!important;font-size:14px;font-weight:700;">${c.title} &rarr;</p>
<p class="fs" style="margin:0;color:${SLATE}!important;font-size:12px;line-height:1.5;">${c.text}</p></a></td>`,
    )
    .join("")}</tr></table>`;
}

function signoff() {
  return `<p class="fi" style="margin:26px 0 6px;color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;text-align:center;">Talk soon,</p>
<p class="fb" style="margin:0 0 30px;color:${BODY}!important;font-size:15px;text-align:center;">The RSVP Studio team</p>
<p class="fi" style="margin:0 0 30px;color:${INK}!important;font-size:12px;line-height:1.8;text-align:center;">Need to add something? Just reply to this&nbsp;email.<br />A real person on our team reads every&nbsp;message.</p>`;
}

/** The RSVP reply card: what they told us, written back like a printed response card. */
function replyCard(name: string, v: Values) {
  const rows = [
    ["Occasion", nice(str(v.occasion))],
    ["Date", str(v.event_date) ? day(str(v.event_date)) : ""],
    ["Where", str(v.event_location)],
    ["Guests", str(v.guest_count)],
    ["Asked about", str(v.interested_in) || str(v.services)],
  ].filter(([, val]) => val);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 26px;"><tr><td class="fpaper" bgcolor="#fbfaf6" style="background:#fbfaf6;border:1.5px dashed #d6c9b2;border-radius:14px;padding:22px 24px;">
<p class="fs" style="margin:0 0 4px;color:#a08a5f!important;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;text-align:center;">Répondez s’il vous plaît</p>
<p class="fi" style="margin:0 0 16px;color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-size:18px;text-align:center;">&#9745;&nbsp; ${esc(name)} would love to work with&nbsp;us</p>
${rows
  .map(
    ([k, val]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="110" valign="top" class="fs" style="padding:6px 0;border-top:1px solid #ece4d4;color:${SLATE}!important;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">${k}</td>
<td valign="top" class="fi" style="padding:6px 0;border-top:1px solid #ece4d4;color:${INK}!important;font-size:14px;">${esc(val)}</td></tr></table>`,
  )
  .join("")}
</td></tr></table>`;
}

export function enquiryReceipt(form: string, values: Values, name: string): { subject: string; html: string } {
  const first = esc(name.split(" ")[0] || "there");

  if (form === "partner-inquiry") {
    return {
      subject: "Your application is in — The RSVP Studio partners",
      html: partnerLayout(
        SITE,
        `Your application is in, ${first}.`,
        `Thanks for wanting to send people our way. Here’s what happens next.<br><br>
        <strong>1.</strong> We read every application and reply within 1 business day (Monday to Friday, Philippine time).<br>
        <strong>2.</strong> Once you’re approved, you get your own code and link. The people you send get <strong>10% off</strong>, and you earn <strong>10% to 20%</strong> of what they pay us.<br>
        <strong>3.</strong> Your partner dashboard shows every visit, sign-up and booking you bring in.<br><br>
        Anything to add in the meantime? Just reply to this email.`,
        { label: "How the partner program works", url: `${SITE}/partners${/creator|influencer/i.test(str(values.partner_type)) ? "?type=creator" : ""}` },
        "You’re receiving this because you applied to The RSVP Studio partner program.",
      ),
    };
  }

  if (form === "faq-question") {
    const q = str(values.message);
    return {
      subject: "We got your question — The RSVP Studio",
      html: frame({
        preheader: "We’ll reply within 1 business day.",
        spot: "confirm-spot.png",
        spotAlt: "An RSVP card in an envelope",
        content: `<tr><td class="pad" style="padding:26px 56px 6px;">
${h1(`We got your question, ${first}.`)}
${p("Thanks for asking. A real person on our team will reply within 1 business day (Monday to Friday, Philippine time).", q ? 16 : 26)}
${q ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;"><tr><td class="fpaper" bgcolor="#fbfaf6" style="background:#fbfaf6;border-left:3px solid ${CORAL};border-radius:4px;padding:14px 18px;"><p class="fb" style="margin:0;color:${BODY}!important;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:16px;line-height:1.6;">“${esc(q.slice(0, 600))}”</p></td></tr></table>` : ""}
${label("While you wait")}
${browse([
  { img: "wait-services.jpg", title: "FAQs", text: "Pricing, timelines and how RSVPs work.", url: `${SITE}/faqs` },
  { img: "wait-work.jpg", title: "Our work", text: "Websites and stationery for real celebrations.", url: `${SITE}/portfolio` },
  { img: "wait-monograms.jpg", title: "Services", text: "Websites, invitations, monograms and more.", url: `${SITE}/services` },
])}
${signoff()}
</td></tr>`,
      }),
    };
  }

  // project-inquiry
  return {
    subject: "We got your RSVP — The RSVP Studio",
    html: frame({
      preheader: "Your inquiry is in. We’ll reply within 1 business day.",
      spot: "confirm-envelope.png",
      spotAlt: "An RSVP card in an envelope with a heart seal",
      content: `<tr><td class="pad" style="padding:26px 56px 6px;">
${h1(`We got your RSVP, ${first}.`)}
${p("Thank you for thinking of us for your celebration. Your inquiry is safely with our team, and here’s the reply card for your records.", 10)}
${replyCard(name.split(" ")[0] || name, values)}
${label("What happens next")}
${steps([
  "We read every inquiry and reply within <strong>1 business day</strong> (Monday to Friday, Philippine time).",
  "We send ideas, pricing and a timeline that fit your date and guest list.",
  "You choose what you love, and we take it from there.",
])}
${process.env.BOOKING_URL ? p(`Rather talk it through? <a href="${process.env.BOOKING_URL}" style="color:#2f61d5!important;">Book a call</a> at a time that suits you.`, 8) : ""}
<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
${label("While you wait")}
${browse([
  { img: "wait-work.jpg", title: "Our work", text: "Websites and stationery for real celebrations.", url: `${SITE}/portfolio` },
  { img: "wait-services.jpg", title: "Services", text: "Websites, invitations, RSVPs and stationery.", url: `${SITE}/services` },
  { img: "wait-monograms.jpg", title: "Monograms", text: "Custom monograms and crests.", url: `${SITE}/services/monogram` },
])}
${signoff()}
</td></tr>`,
    }),
  };
}

/** A reply to a lead, written in Studio → Leads (api/notify.ts → lead_reply): their words in
 *  the branded frame, URLs linked, our sign-off with the sender's name. Plain text in. */
/** A reply's text as email rows: paragraphs, and lists in the house style (coral dots, numbers in coral circles, as in steps()). */
function replyBlocks(message: string) {
  const linked = (s: string) => inlineHtml(s, esc, (b) => `<strong style="color:${INK}!important;">${b}</strong>`).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" style="color:#2f61d5!important;">${u}</a>`);
  const cell = `class="fb" style="padding:0 0 10px;color:${BODY}!important;font-size:16px;line-height:1.7;"`;
  return parseReply(message.trim()).map((b) => {
    if (b.kind === "p") return p(b.lines.map(linked).join("<br />"));
    const rows = b.items.map((item, i) => {
      const mark = b.kind === "ol"
        ? `<div class="fw" style="width:24px;height:24px;border-radius:12px;background:${CORAL};color:#ffffff;font-size:12px;font-weight:700;line-height:24px;text-align:center;margin-top:2px;">${b.start + i}</div>`
        : `<div style="width:7px;height:7px;border-radius:4px;background:${CORAL};margin:11px 0 0 4px;font-size:0;line-height:0;">&nbsp;</div>`;
      return `<tr><td valign="top" width="${b.kind === "ol" ? 34 : 22}" style="padding:0 0 10px;">${mark}</td><td valign="top" ${cell}>${linked(item)}</td></tr>`;
    });
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">${rows.join("")}</table>`;
  }).join("\n");
}

/** A letter from one of us: the body, then "Talk soon," and who it's from. */
function letter(body: string, sender: string | null, preheader: string, footer?: string) {
  return frame({
    preheader,
    spot: "confirm-spot.png",
    spotAlt: "An RSVP card in an envelope",
    footer,
    content: `<tr><td class="pad" style="padding:26px 56px 6px;">
${body}
<p class="fi" style="margin:26px 0 6px;color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;">Talk soon,</p>
<p class="fb" style="margin:0 0 30px;color:${BODY}!important;font-size:15px;">${sender ? `${esc(sender)}<br />` : ""}The RSVP Studio${sender ? "" : " team"}</p>
</td></tr>`,
  });
}

export function leadReply(message: string, sender: string | null): string {
  return letter(replyBlocks(message), sender, plainReply(message).replace(/^hi\b[^,]*,?\s*/i, "").slice(0, 120));
}

// ---------------------------------------------------------------------------
// Follow-ups to a lead who hasn't answered our reply (api/_lib/lead-followups.ts; when, in
// lead-followup-plan.ts). Short, from the person who wrote to them, sent as replies in that thread.
//   1  a check-in, with our last email quoted
//   2  ideas to start from, and their timeline
//   3  the do-it-yourself way in (free designs, Mesa)
//   4  a last note: we'll stop following up

export type FollowupLead = { name: string | null; form: string; values: Values };
export type LastEmail = { body: string; sender: string | null; at: string };

/** What they're planning, in a few words: "your 30th birthday", "your wedding", "your celebration". */
function occasionOf(v: Values) {
  const occ = str(v.occasion).toLowerCase().replace(/[-_]/g, " ");
  const age = str(v.milestone_age);
  if (/birthday|bday/.test(occ) && age) return `your ${age} birthday`;
  if (/debut/.test(occ)) return "your debut";
  return occ && occ !== "other" ? `your ${occ}` : "your celebration";
}

export function leadFollowup(step: 1 | 2 | 3 | 4, lead: FollowupLead, last: LastEmail, unsubscribeUrl: string): string {
  const first = esc((lead.name ?? "").trim().split(/\s+/)[0] || "there");
  const sender = last.sender;
  // "I" from a person, "we" from the team login
  const [I, my, Ill] = sender ? ["I", "my", "I’ll"] : ["we", "our", "we’ll"];
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const what = occasionOf(lead.values);
  const date = str(lead.values.event_date);
  const when = /^\d{4}-\d{2}-\d{2}$/.test(date) ? day(date) : "";
  const footer = `You’re receiving this because you sent us an inquiry on thersvpstudio.com. <a href="${unsubscribeUrl}" class="fs" style="color:#a0a0ad !important;">Stop these emails</a>`;
  const hi = p(`Hi ${first},`);

  if (lead.form === "faq-question") {
    const body = `${hi}
${p(`${cap(I)} wanted to check that ${my} answer helped. If anything is still unclear, just reply and ${Ill} explain.`)}
${p(`When you’re ready to start, you can make your website at <a href="${SITE}/build" style="color:#2f61d5!important;">thersvpstudio.com/build</a>.`)}`;
    return letter(body, sender, "Did that answer your question?", footer);
  }

  // their timeline: invites out three weeks before, so guests have time to reply
  let timeline = "";
  if (when) {
    const inviteBy = new Date(`${date}T12:00:00+08:00`).getTime() - 21 * 86_400_000;
    timeline = inviteBy - Date.now() > 2 * 86_400_000
      ? `For ${what} on ${when}, invites should go out by ${new Date(inviteBy).toLocaleDateString("en-PH", { month: "long", day: "numeric", timeZone: "Asia/Manila" })}, so your guests have three weeks to RSVP.`
      : `${cap(what.replace(/^your/, "Your"))} is on ${when}, so starting soon gives your guests more time to RSVP.`;
  }

  if (step === 1) {
    const quoted = last.body.trim().replace(/\*\*(.+?)\*\*/g, "$1").slice(0, 900);
    const on = new Date(last.at).toLocaleDateString("en-PH", { month: "long", day: "numeric", timeZone: "Asia/Manila" });
    const body = `${hi}
${p(`Just checking that ${my} last email reached you. When you have a minute, a quick reply with your answers is all we need to start on ${what}.`)}
${p(`On ${on}, ${sender ? esc(sender) : "we"} wrote:`, 8)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr><td style="border-left:3px solid #e2dccf;padding:2px 0 2px 16px;"><p class="fs" style="margin:0;color:${SLATE}!important;font-size:14px;line-height:1.6;">${esc(quoted).replace(/\n/g, "<br />")}${last.body.trim().length > 900 ? "…" : ""}</p></td></tr></table>`;
    return letter(body, sender, `Just checking that ${my} last email reached you.`, footer);
  }
  if (step === 2) {
    const body = `${hi}
${p(`While you think it over, here are a few places to start. Any of our designs can be made yours, with your own photos, colours and details.`, 22)}
${browse([
  { img: "wait-services.jpg", title: "Designs", text: "Websites that open like a film, for every occasion.", url: `${SITE}/build?utm_source=email&amp;utm_campaign=lead_followup&amp;utm_content=2` },
  { img: "wait-work.jpg", title: "Our work", text: "Websites and stationery for real celebrations.", url: `${SITE}/portfolio?utm_source=email&amp;utm_campaign=lead_followup&amp;utm_content=2` },
  { img: "wait-monograms.jpg", title: "Services", text: "Websites, invitations, monograms and more.", url: `${SITE}/services?utm_source=email&amp;utm_campaign=lead_followup&amp;utm_content=2` },
])}
<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
${timeline ? p(timeline) : ""}
${p(`Reply whenever you’re ready and ${Ill} take it from there.`)}`;
    return letter(body, sender, "A few places to start, and your timeline.", footer);
  }
  if (step === 3) {
    const link = (path: string, label: string) => `<a href="${SITE}${path}${path.includes("?") ? "&amp;" : "?"}utm_source=email&amp;utm_campaign=lead_followup&amp;utm_content=3" style="color:#2f61d5!important;">${label}</a>`;
    const body = `${hi}
${p(`If a custom design isn’t the right fit for now, you can still make your own. Pick one of our designs, add your details, and collect RSVPs on your own website. It’s free to start: ${link("/build", "thersvpstudio.com/build")}.`)}
${p(`Planning seating too? Mesa, our free seating chart maker, seats your whole guest list in one tap: ${link("/tools/seating-chart-maker", "try Mesa")}.`)}
${p(`And if you’d still like us to make it for you, just reply.`)}`;
    return letter(body, sender, "You can also make your own, free to start.", footer);
  }
  const body = `${hi}
${p(`${cap(I)} haven’t heard back, so ${Ill} close your inquiry for now and stop following up.`)}
${p(`If you’d still like help with ${what}, just reply to this email and we’ll pick up where we left off.`)}`;
  return letter(body, sender, `${cap(Ill)} close your inquiry for now.`, footer);
}
