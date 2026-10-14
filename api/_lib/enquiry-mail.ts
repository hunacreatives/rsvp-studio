import { esc } from "./email.js";
import { partnerLayout } from "./support-mail.js";

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
export function frame({ preheader, spot, spotAlt, content, footer = "You received this email because you sent us a message on thersvpstudio.com.", cover }: { preheader: string; spot: string; spotAlt: string; content: string; footer?: string; cover?: string }) {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" /><meta name="supported-color-schemes" content="light" />
<style>:root{color-scheme:light only;supported-color-schemes:light only}
@media (prefers-color-scheme: dark){.fi{color:${INK}!important}.fb{color:${BODY}!important}.fs{color:${SLATE}!important}.fw{color:#ffffff!important}.fcard{background:#ffffff!important}.fpage{background:#f3f3f5!important}.fpaper{background:#fbfaf6!important}}
@media only screen and (max-width:520px){.pad{padding-left:28px!important;padding-right:28px!important}.col{display:block!important;width:100%!important;padding:0 0 14px!important}}</style></head>
<body class="fpage" bgcolor="#f3f3f5" style="margin:0;padding:0;background:#f3f3f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f3f5" class="fpage" style="background:#f3f3f5;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" class="fcard" style="max-width:560px;width:100%;background:#ffffff;">
<tr><td align="center" style="padding:36px 32px 8px;"><img src="${SITE}/brand/logotype-dark.png" alt="The RSVP Studio" width="128" style="display:block;height:auto;border:0;" /></td></tr>
${cover
  ? `<tr><td align="center" style="padding:22px 32px 4px;"><table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ffffff" style="background:#ffffff;padding:8px 8px 22px;border:1px solid #ece8e1;border-radius:4px;box-shadow:0 8px 20px -12px rgba(0,7,39,0.35);"><img src="${cover}" alt="${spotAlt}" width="150" style="display:block;width:150px;max-width:100%;height:auto;border:0;" /></td></tr></table></td></tr>`
  : `<tr><td align="center" style="padding:22px 32px 4px;"><img src="${SITE}/email/${spot}" alt="${spotAlt}" width="200" style="display:block;width:200px;height:auto;border:0;" /></td></tr>`}
${content}
<tr><td align="center" style="padding:0 32px 36px;">
<table role="presentation" width="160" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #dcdce2;font-size:0;line-height:0;">&nbsp;</td></tr></table>
<p class="fs" style="margin:20px 0 14px;font-size:12px;color:${SLATE}!important;"><a href="https://www.instagram.com/rsvpstudioo/" class="fs" style="color:${SLATE}!important;text-decoration:none;">Instagram</a>&nbsp;&middot;&nbsp;<a href="https://www.facebook.com/p/The-RSVP-Studio-61590604769707/" class="fs" style="color:${SLATE}!important;text-decoration:none;">Facebook</a></p>
<p class="fs" style="margin:0 0 14px;font-size:12px;color:${SLATE}!important;"><a href="${SITE}" class="fs" style="color:${SLATE}!important;text-decoration:none;">The RSVP Studio</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${SITE}/services" class="fs" style="color:${SLATE}!important;text-decoration:none;">Services</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${SITE}/portfolio" class="fs" style="color:${SLATE}!important;text-decoration:none;">Our work</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="${SITE}/faqs" class="fs" style="color:${SLATE}!important;text-decoration:none;">FAQs</a></p>
<p class="fs" style="margin:0;font-size:10px;line-height:1.6;color:#a0a0ad!important;">${footer}<br />The RSVP Studio, a Huna Creatives brand &middot; Philippines</p>
</td></tr>
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
