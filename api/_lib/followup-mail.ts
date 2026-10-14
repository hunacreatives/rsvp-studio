import { esc } from "./email.js";
import { BODY, browse, CORAL, frame, h1, INK, label, p, SITE, SLATE, steps } from "./enquiry-mail.js";

// The follow-up emails (sent by followups.ts from the daily job), in the same branded
// frame as the enquiry receipts, each with a character on top:
//   draft_1 / draft_4 / draft_10 — "your website is waiting" (blue character)
//   rsvp_10   — ten RSVPs on a free site, what Premium adds (RSVP envelope)
//   headcount — a week before, the count so far (orange character)
//   after     — thank you, thank-you cards, how did we do (pink heart)
// Every one ends with an unsubscribe link (turns off profiles.notify_tips).

export type FollowupKind = "draft_1" | "draft_4" | "draft_10" | "rsvp_10" | "headcount" | "after";

export type FollowupData = {
  first: string;
  eventId: string;
  eventName: string;
  /** "Isabella & Mateo", or the event name when the site has no names yet. */
  hosts: string;
  eventDate: string | null; // YYYY-MM-DD
  rsvps: number;
  guests: number;
  declined: number;
  /** What's filled in on a draft. */
  draft?: { names: boolean; date: boolean; venue: boolean; photos: boolean };
  /** Premium upgrade price for this site, in pesos (after any discount). */
  upgradePesos?: number | null;
  /** When the published site goes offline. */
  liveUntil?: string | null;
  /** Premium photo sharing is on: the guest photo page (and its QR code, /qr/<slug>.png). */
  photos?: { url: string; qr: string } | null;
  unsubscribeUrl: string;
  bookingUrl?: string | null;
};

const day = (iso: string, withWeekday = false) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00+08:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-PH", { ...(withWeekday ? { weekday: "long" } : {}), month: "long", day: "numeric", year: withWeekday ? undefined : "numeric", timeZone: "Asia/Manila" });
};
const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;

function button(text: string, url: string) {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:6px auto 26px;"><tr><td bgcolor="#2f61d5" style="background:#2f61d5;border-radius:999px;">
<a href="${url}" class="fw" style="display:inline-block;padding:14px 28px;color:#ffffff!important;font-size:15px;font-weight:600;text-decoration:none;">${text}</a></td></tr></table>`;
}

/** A small checklist: what's done (ticked) and what's left. */
function checklist(items: [string, boolean][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td class="fpaper" bgcolor="#fbfaf6" style="background:#fbfaf6;border-radius:14px;padding:16px 20px;">${items
    .map(
      ([text, done]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="30" valign="top" style="padding:5px 0;font-size:16px;line-height:1.4;color:${done ? "#3d7a12" : "#c9c9d3"}!important;">${done ? "&#10003;" : "&#9675;"}</td>
<td valign="top" class="${done ? "fs" : "fi"}" style="padding:5px 0;font-size:15px;line-height:1.4;color:${done ? SLATE : INK}!important;${done ? "text-decoration:line-through;" : ""}">${text}</td></tr></table>`,
    )
    .join("")}</td></tr></table>`;
}

/** The headcount, written like a tally card. */
function tally(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 24px;"><tr><td class="fpaper" bgcolor="#fbfaf6" style="background:#fbfaf6;border:1.5px dashed #d6c9b2;border-radius:14px;padding:20px 24px;">
${rows
  .map(
    ([k, v], i) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="middle" class="fs" style="padding:8px 0;${i ? "border-top:1px solid #ece4d4;" : ""}color:${SLATE}!important;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">${k}</td>
<td valign="middle" align="right" class="fi" style="padding:8px 0;${i ? "border-top:1px solid #ece4d4;" : ""}color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-size:20px;">${v}</td></tr></table>`,
  )
  .join("")}
</td></tr></table>`;
}

function signoff(note = "Questions? Just reply to this email. A real person on our team reads every message.") {
  return `<p class="fi" style="margin:8px 0 6px;color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:17px;text-align:center;">Talk soon,</p>
<p class="fb" style="margin:0 0 28px;color:${BODY}!important;font-size:15px;text-align:center;">The RSVP Studio team</p>
${note ? `<p class="fs" style="margin:0 0 30px;color:${SLATE}!important;font-size:12px;line-height:1.8;text-align:center;">${note}</p>` : ""}`;
}

const footer = (unsub: string) =>
  `You’re receiving this because you have a project on The RSVP Studio. <a href="${unsub}" class="fs" style="color:#a0a0ad!important;text-decoration:underline;">Unsubscribe from these emails</a>`;

const wrap = (rows: string) => `<tr><td class="pad" style="padding:26px 56px 6px;">\n${rows}\n</td></tr>`;

export function followupEmail(kind: FollowupKind, d: FollowupData): { subject: string; html: string } {
  const first = esc(d.first || "there");
  const name = esc(d.eventName);
  const hosts = esc(d.hosts);
  const project = `${SITE}/account/projects/${d.eventId}`;
  const finish = `${project}?tab=website`;
  const guestList = `${project}?tab=guests`;
  const booking = d.bookingUrl ? ` Or <a href="${d.bookingUrl}" style="color:#2f61d5!important;">book a quick call</a> and we’ll walk you through it.` : "";

  if (kind === "draft_1" || kind === "draft_4" || kind === "draft_10") {
    const c = d.draft ?? { names: false, date: false, venue: false, photos: false };
    const list = checklist([
      ["Pick a design", true],
      ["Add the names", c.names],
      ["Add the date", c.date],
      ["Add the venue", c.venue],
      ["Add a few photos", c.photos],
      ["Publish and share your link", false],
    ]);
    if (kind === "draft_1") {
      return {
        subject: `Your website for ${d.eventName} is waiting`,
        html: frame({
          preheader: "Your draft is saved. Here’s what’s left.",
          spot: "followup-draft.png",
          spotAlt: "A friendly blue character waving",
          footer: footer(d.unsubscribeUrl),
          content: wrap(`${h1(`Pick up where you left off, ${first}.`)}
${p(`Your website for <strong>${name}</strong> is saved as a draft. Most people finish theirs in about 20 minutes. Here’s what’s left:`, 14)}
${list}
${button("Finish your website", finish)}
${signoff()}`),
        }),
      };
    }
    if (kind === "draft_4") {
      return {
        subject: "Need a hand with your website?",
        html: frame({
          preheader: "Stuck on a photo, the wording or the design? We can help.",
          spot: "followup-draft.png",
          spotAlt: "A friendly blue character waving",
          footer: footer(d.unsubscribeUrl),
          content: wrap(`${h1(`Stuck on anything, ${first}?`)}
${p(`Your draft for <strong>${name}</strong> is still waiting. If something’s in the way, a photo you’re not sure about, the wording, or which design to use, reply to this email and we’ll help.${booking}`)}
${list}
${button("Finish your website", finish)}
${p(`Rather we make it for you? Our designers build custom event websites from ${peso(8000)}. <a href="${SITE}/enquire?service=website&amp;from=draft-followup#start" style="color:#2f61d5!important;">Tell us about your event</a>.`, 8)}
${signoff("Need to add something? Just reply to this email.")}`),
        }),
      };
    }
    return {
      subject: `Your draft for ${d.eventName} is still saved`,
      html: frame({
        preheader: "No rush. It’s there when you’re ready.",
        spot: "followup-draft.png",
        spotAlt: "A friendly blue character waving",
        footer: footer(d.unsubscribeUrl),
        content: wrap(`${h1(`Still planning ${name}?`)}
${p("No rush. Your draft stays saved, and you can keep editing after it’s live. Guests can RSVP the moment you share the link.")}
${list}
${button("Finish your website", finish)}
${p("This is the last reminder we’ll send about this draft.", 8)}
${signoff()}`),
      }),
    };
  }

  if (kind === "rsvp_10") {
    return {
      subject: `${d.rsvps} RSVPs for ${d.hosts} so far`,
      html: frame({
        preheader: "Your website is working. Here’s what Premium adds.",
        spot: "confirm-spot.png",
        spotAlt: "An RSVP card in an envelope",
        footer: footer(d.unsubscribeUrl),
        content: wrap(`${h1(`${d.rsvps} RSVPs, ${first}.`)}
${p(`Your guests are replying to <strong>${hosts}</strong>. So far ${d.guests} ${d.guests === 1 ? "person is" : "people are"} coming.`, 22)}
${label("What Premium adds")}
${steps([
  "An email the moment each RSVP comes in, instead of one summary a day.",
  "A confirmation email to each guest, sent in your names, and a reminder 2 days before.",
  "Guests share their photos on your website. Print the QR code for your tables.",
  "Your website stays online for a year after your event, not 30 days.",
])}
${button(d.upgradePesos ? `Upgrade for ${peso(d.upgradePesos)}` : "Upgrade to Premium", finish)}
${p("Paid once for this event. Your design, details and RSVPs stay exactly as they are.", 8)}
${signoff()}`),
      }),
    };
  }

  if (kind === "headcount") {
    const when = d.eventDate ? day(d.eventDate, true) : "next week";
    return {
      subject: `${d.eventName} is a week away: your headcount`,
      html: frame({
        preheader: `${d.guests} coming so far. Your guest list is ready to download.`,
        spot: "followup-headcount.png",
        spotAlt: "A cheerful orange character",
        footer: footer(d.unsubscribeUrl),
        content: wrap(`${h1(`One week to go, ${first}.`)}
${p(`<strong>${name}</strong> is on ${esc(when)}. Here’s where your RSVPs stand today:`, 10)}
${tally([
  ["Coming", `${d.guests} ${d.guests === 1 ? "guest" : "guests"}`],
  ["Can’t make it", String(d.declined)],
  ["Replies in all", String(d.rsvps)],
])}
${label("This week")}
${steps([
  "Send your caterer and venue the final count.",
  "Haven’t heard from someone? Your invite list (Guests tab) shows who hasn’t replied, with a reminder message to copy.",
  "Download your guest list for the welcome table.",
])}
${button("See your guest list", guestList)}
${d.photos ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;"><tr><td align="center" class="fpaper" bgcolor="#fbfaf6" style="background:#fbfaf6;border:1px solid #e6dfd2;border-radius:16px;padding:22px 20px;text-align:center;">
${label("For your tables")}
<img src="${d.photos.qr}" alt="QR code for your guest photo page" width="150" height="150" style="display:block;margin:0 auto 12px;width:150px;height:150px;border:0;" />
<p class="fb" style="margin:0 0 6px;color:${BODY}!important;font-size:15px;line-height:1.6;">Guests scan this to share the photos they take.<br />Print it, or <a href="${d.photos.qr}" style="color:#2f61d5!important;">download the QR code</a>.</p>
<p class="fs" style="margin:0;color:${SLATE}!important;font-size:12px;word-break:break-all;">${d.photos.url.replace("https://", "")}</p>
</td></tr></table>` : ""}
${signoff()}`),
      }),
    };
  }

  // after
  const until = d.liveUntil ? ` Your website stays online until <strong>${day(d.liveUntil)}</strong>, so guests can look back at it.` : "";
  return {
    subject: `How was ${d.eventName}?`,
    html: frame({
      preheader: "Thank you for celebrating with us.",
      spot: "followup-after.png",
      spotAlt: "A pink heart character with open arms",
      footer: footer(d.unsubscribeUrl),
      content: wrap(`${h1(`We hope it was wonderful, ${first}.`)}
${p(`Thank you for making <strong>${name}</strong> with us.${until}`)}
${d.photos ? p(`Guests can still add their photos. Share the <a href="${d.photos.url}" style="color:#2f61d5!important;">photo page</a> in your group chat, then see them all under your project’s Guests tab.`) : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 26px;"><tr><td class="fpaper" bgcolor="#fbfaf6" style="background:#fbfaf6;border-left:3px solid ${CORAL};border-radius:4px;padding:16px 20px;">
<p class="fi" style="margin:0 0 6px;color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-size:18px;">How did we do?</p>
<p class="fb" style="margin:0;color:${BODY}!important;font-size:15px;line-height:1.6;">Reply with one line. What you loved, or what we should fix. We read every reply.</p>
</td></tr></table>
${label("Saying thank you?")}
${p("We design thank-you cards and photo cards to match your event, printed or digital.", 14)}
${button("Get thank-you cards", `${SITE}/enquire?service=stationery&amp;package=${encodeURIComponent("Thank-you cards")}&amp;from=after-event#start`)}
${label("Planning the next one?")}
${browse([
  { img: "wait-work.jpg", title: "Our work", text: "Websites and stationery for real celebrations.", url: `${SITE}/portfolio` },
  { img: "wait-services.jpg", title: "Services", text: "Websites, invitations, RSVPs and stationery.", url: `${SITE}/services` },
  { img: "wait-monograms.jpg", title: "Monograms", text: "Custom monograms and crests.", url: `${SITE}/services/monogram` },
])}
<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
${signoff("")}`),
    }),
  };
}
