import { esc, safeMapUrl } from "./email.js";
import { formatHostNames } from "./hosts.js";
import { BODY, CORAL, frame, h1, INK, p } from "./enquiry-mail.js";

// The emails GUESTS get, in one look: our branded frame (enquiry-mail.ts) with the
// event's own cover photo as a small print, written in the hosts' voice and signed by
// them, with the details as a navy-and-gold admission ticket.
//   guestConfirmation — "You're on the list" right after they RSVP (api/wedding-rsvp.ts)
//   guestReminder     — "See you on Saturday" 2 days before (guest-reminders.ts, Premium)

const SITE = "https://thersvpstudio.com";
const GOLD = "#d9b45a";
const MUTED = "#8a8478";

export type GuestContent = {
  hosts?: { name?: string }[];
  eventDate?: string;
  primaryLocation?: { name?: string; addressLine?: string; mapUrl?: string };
  custom?: Record<string, unknown>;
  galleries?: { items?: { image?: { masterUrl?: string } }[] }[];
};
export type GuestPresentation = { activeTemplateId?: string; byTemplate?: Record<string, { heroImage?: { masterUrl?: string } }> };

/** Premium guest emails come from the hosts: "Carlo & Trixia via The RSVP Studio". */
export function hostSender(content: GuestContent): string {
  const names = (content.hosts ?? []).map((h) => h.name).filter(Boolean).join(" & ");
  const safe = names.replace(/["<>\\\r\n,;:]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return safe ? `"${safe} via The RSVP Studio" <hello@thersvpstudio.com>` : "The RSVP Studio <hello@thersvpstudio.com>";
}

/** The site's hero photo, or its first gallery photo (https only). */
export function coverOf(content: GuestContent, pres: GuestPresentation | null | undefined) {
  const url = pres?.byTemplate?.[pres.activeTemplateId ?? ""]?.heroImage?.masterUrl || content.galleries?.[0]?.items?.[0]?.image?.masterUrl || "";
  return /^https:\/\//.test(url) ? esc(url) : undefined;
}

/** The event's date in Manila, in the pieces the ticket shows. */
export function eventWhen(iso: string | null | undefined) {
  const day = (iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T12:00:00+08:00`);
  const hhmm = /T(\d{2}:\d{2})/.exec(iso ?? "")?.[1] ?? "";
  const time = hhmm ? new Date(`${day}T${hhmm}:00+08:00`).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }) : "";
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  return {
    day,
    hhmm,
    weekday: d.toLocaleDateString("en-PH", { weekday: "long", timeZone: "Asia/Manila" }),
    dayNum: d.toLocaleDateString("en-PH", { day: "numeric", timeZone: "Asia/Manila" }),
    monthYear: d.toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" }),
    long: d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }),
    time,
    daysLeft: Math.round((Date.parse(day) - Date.parse(today)) / 86_400_000),
  };
}

/** Google Calendar "add event" link (4 hours if there's a start time, else all day). */
function calendarLink(title: string, when: NonNullable<ReturnType<typeof eventWhen>>, where: string, link: string) {
  const fmt = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  let dates: string;
  if (when.hhmm) {
    const start = Date.parse(`${when.day}T${when.hhmm}:00+08:00`);
    dates = `${fmt(start)}/${fmt(start + 4 * 3_600_000)}`;
  } else {
    const next = new Date(Date.parse(`${when.day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    dates = `${when.day.replace(/-/g, "")}/${next.replace(/-/g, "")}`;
  }
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates, details: `The invitation: ${link}`, location: where });
  return `https://calendar.google.com/calendar/render?${q}`;
}

const label = (k: string) =>
  `<p style="margin:14px 0 0;color:${MUTED}!important;font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;">${k}</p>`;
const value = (v: string) => `<p class="fi" style="margin:3px 0 0;color:${INK}!important;font-size:15px;line-height:1.5;">${v}</p>`;
const detail = (k: string, v: string) => (v ? label(k) + value(v) : "");

/** The navy-and-gold ticket: event name and date on top, a dashed tear line, then the stub. */
function ticket(o: { kicker: string; eventName: string; when: ReturnType<typeof eventWhen>; stub: string }) {
  const w = o.when;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;"><tr><td bgcolor="#fbfaf6" style="background:#fbfaf6;border:1px solid #e6dfd2;border-radius:18px;overflow:hidden;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#000727" style="background:#000727;padding:26px 24px 24px;text-align:center;border-radius:16px 16px 0 0;">
    <p style="margin:0;color:${GOLD}!important;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:15px;">${o.kicker}</p>
    <p class="fw" style="margin:4px 0 ${w ? 16 : 0}px;color:#ffffff!important;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;">${esc(o.eventName)}</p>
    ${w ? `<p style="margin:0;color:#b9bdd0!important;font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;">${esc(w.weekday)}</p>
    <p class="fw" style="margin:2px 0 0;color:#ffffff!important;font-family:Georgia,'Times New Roman',serif;font-size:56px;line-height:1;">${esc(w.dayNum)}</p>
    <p style="margin:6px 0 0;color:#b9bdd0!important;font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;">${esc(w.monthYear)}${w.time ? `&nbsp;&middot;&nbsp;${esc(w.time).replace(" ", "&nbsp;")}` : ""}</p>` : ""}
  </td></tr>
  <tr><td style="padding:0 18px;"><div style="border-top:1.5px dashed #d9c9a8;height:0;line-height:0;font-size:0;">&nbsp;</div></td></tr>
  <tr><td align="center" style="padding:16px 24px 22px;text-align:center;">${o.stub}</td></tr></table>
</td></tr></table>`;
}

/** Up to two centred pill buttons (they stack on phones). */
function buttons(list: { label: string; url: string; solid?: boolean }[]) {
  const cell = (b: { label: string; url: string; solid?: boolean }) =>
    `<td class="col" align="center" style="padding:0 4px 8px;"><table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr>${
      b.solid
        ? `<td bgcolor="#000727" style="background:#000727;border-radius:999px;"><a href="${esc(b.url)}" class="fw" style="display:inline-block;white-space:nowrap;padding:13px 24px;color:#ffffff!important;font-size:15px;font-weight:600;text-decoration:none;">${b.label}</a></td>`
        : `<td style="border:1.5px solid ${INK};border-radius:999px;"><a href="${esc(b.url)}" class="fi" style="display:inline-block;white-space:nowrap;padding:11.5px 22px;color:${INK}!important;font-size:15px;font-weight:600;text-decoration:none;">${b.label}</a></td>`
    }</tr></table></td>`;
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 22px;"><tr>${list.map(cell).join("")}</tr></table>`;
}

const pill = (text: string, bg: string, ink: string) =>
  `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr><td bgcolor="${bg}" style="background:${bg};border-radius:999px;padding:6px 14px;color:${ink};font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;">${text}</td></tr></table>`;

const signed = (hosts: string) => `<p class="fi" style="margin:0 0 4px;color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:18px;">With love,</p>
<p class="fb" style="margin:0 0 34px;color:${BODY}!important;font-size:15px;">${hosts}</p>`;

const footer = (eventName: string, hosts: string) =>
  `You’re receiving this because you RSVP’d to ${esc(eventName)}.<br />Sent by The RSVP Studio for ${hosts}.`;

/** The point of these emails for us: every guest sees The RSVP Studio. Free sites get the
 *  full card (our characters, "make yours", the done-for-you option, our services); Premium
 *  hosts paid us, so their guests get one quiet credit line, like the one on every site.
 *  Links carry the site's slug (?ref=…&via=email) so Studio → Sources credits this event. */
function promo(slug: string, premium: boolean) {
  const ref = `ref=${encodeURIComponent(slug)}&amp;via=email`;
  if (premium)
    return `<p style="margin:0 0 30px;padding-top:20px;border-top:1px solid #ece8e1;color:#8a8478;font-size:13px;line-height:1.7;">Made with love by <a href="${SITE}/?${ref}" style="color:${INK}!important;font-weight:600;text-decoration:none;">The RSVP Studio</a>&nbsp;&middot;&nbsp;<a href="${SITE}/build?${ref}" style="color:#2f61d5!important;text-decoration:none;">Make your own</a></p>`;
  const svc = (label: string, path: string) => `<a href="${SITE}${path}?${ref}" style="color:#2f61d5!important;text-decoration:none;">${label}</a>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 30px;"><tr><td align="center" bgcolor="#eef3ff" style="background:#eef3ff;border-radius:20px;padding:26px 22px 24px;text-align:center;">
<img src="${SITE}/email/partner-characters.png" alt="" width="168" style="display:block;margin:0 auto 14px;width:168px;max-width:70%;height:auto;border:0;" />
<p style="margin:0;color:#2f61d5!important;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;">The RSVP Studio</p>
<p class="fi" style="margin:8px 0 6px;color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;">Planning a celebration of&nbsp;your&nbsp;own?</p>
<p class="fb" style="margin:0 0 18px;color:${BODY}!important;font-size:15px;line-height:1.6;">Make an event website like this one, with RSVPs built&nbsp;in.<br />Free to start, ready in an&nbsp;evening.</p>
<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 12px;"><tr><td bgcolor="#2f61d5" style="background:#2f61d5;border-radius:999px;"><a href="${SITE}/build?${ref}" class="fw" style="display:inline-block;white-space:nowrap;padding:13px 26px;color:#ffffff!important;font-size:15px;font-weight:600;text-decoration:none;">Make yours free</a></td></tr></table>
<p class="fb" style="margin:0 0 16px;color:${BODY}!important;font-size:14px;">Rather we design it for you? <a href="${SITE}/enquire?from=guest-email&amp;${ref}#start" style="color:${INK}!important;font-weight:600;">Tell us about your&nbsp;event</a></p>
<p style="margin:0;font-size:12px;line-height:1.8;color:#6b6b7c;">${svc("Event websites", "/services/milestone")}&nbsp;&middot;&nbsp;${svc("Invitations", "/services/save-the-date")}&nbsp;&middot;&nbsp;${svc("Monograms", "/services/monogram")}&nbsp;&middot;&nbsp;${svc("Stationery", "/services/stationery")}</p>
</td></tr></table>`;
}

type Common = {
  content: GuestContent;
  presentation?: GuestPresentation | null;
  eventName: string;
  eventDate?: string | null; // events.event_date (YYYY-MM-DD), when the content has none
  slug: string;
  guestName: string;
};

function basics(o: Common) {
  const hostsRaw = formatHostNames(o.content);
  const hosts = esc(hostsRaw === "the host" ? "The hosts" : hostsRaw);
  const venue = o.content.primaryLocation?.name?.trim() ?? "";
  const address = o.content.primaryLocation?.addressLine?.trim() ?? "";
  const where = [venue, address].filter(Boolean).join(", ");
  const map = safeMapUrl(o.content.primaryLocation?.mapUrl) || (where ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}` : "");
  const dress = typeof o.content.custom?.dressCode === "string" ? o.content.custom.dressCode.trim() : "";
  const when = eventWhen(o.content.eventDate || o.eventDate);
  const first = esc(o.guestName.trim().split(/\s+/)[0] || "there");
  const link = `${SITE}/invite/${o.slug}`;
  const hostsPlain = hostsRaw === "the host" ? "The hosts" : hostsRaw;
  return { hosts, hostsPlain, venue, where, map, dress, when, first, link, cover: coverOf(o.content, o.presentation) };
}

const admitStub = (guestName: string, count: number | null | undefined) => {
  const n = count && count > 1 ? count : 1;
  return `<p style="margin:0;color:${MUTED}!important;font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;">Admit</p>
<p style="margin:2px 0 0;color:${CORAL}!important;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.1;">${n}</p>
<p class="fi" style="margin:2px 0 0;color:${INK}!important;font-size:15px;">${esc(guestName.trim())}${n > 2 ? " &amp; party" : n === 2 ? " + 1" : ""}</p>`;
};

/** "You're on the list" (or "Thank you for letting us know"), sent right after an RSVP. */
export function guestConfirmation(
  o: Common & { attending: boolean | null; guestCount: number | null; dietary?: string; message?: string; premium: boolean; remindsLater: boolean },
): { subject: string; html: string } {
  const b = basics(o);
  const declined = o.attending === false;
  const note = o.message?.trim()
    ? `${label("Your note to the hosts")}<p class="fi" style="margin:4px 0 0;color:${INK}!important;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:16px;line-height:1.55;">“${esc(o.message.trim().slice(0, 400))}”</p>`
    : "";
  // Every guest email advertises us: the full card on free sites, one quiet line on Premium.
  const makeYourOwn = promo(o.slug, o.premium);

  if (declined) {
    return {
      subject: `Thank you for letting us know — ${b.hostsPlain}`,
      html: frame({
      tagline: false,
        preheader: `Your reply has been sent to ${esc(b.hostsPlain)}.`,
        spot: "confirm-spot.png",
        spotAlt: b.cover ? esc(o.eventName) : "An RSVP card in an envelope",
        cover: b.cover,
        footer: footer(o.eventName, b.hosts),
        content: `<tr><td class="pad" align="center" style="padding:24px 56px 6px;text-align:center;">
${pill("Reply received", "#f1f0ec", "#6b6658")}
${h1(`Thank you for letting us know,&nbsp;${b.first}.`)}
${p(`${b.hosts} will miss you.<br />Your reply has been sent to&nbsp;them.`, 26)}
${p("Plans changed? You can update your reply from the invitation.", 16)}
${buttons([{ label: "Open the invitation", url: b.link }])}
${signed(b.hosts)}
${makeYourOwn}
</td></tr>`,
      }),
    };
  }

  const cal = b.when ? calendarLink(o.eventName, b.when, b.where, b.link) : "";
  const reminder = o.remindsLater && b.when && b.when.daysLeft > 2 ? `<br />We’ll send you a reminder two days&nbsp;before.` : "";
  return {
    subject: `You’re on the list — ${b.hostsPlain}`,
    html: frame({
      tagline: false,
      preheader: b.when ? `${b.when.long}${b.venue ? ` · ${esc(b.venue)}` : ""}. Save the date.` : "Your RSVP is in.",
      spot: "confirm-spot.png",
      spotAlt: b.cover ? esc(o.eventName) : "An RSVP card in an envelope",
      cover: b.cover,
      footer: footer(o.eventName, b.hosts),
      content: `<tr><td class="pad" align="center" style="padding:24px 56px 6px;text-align:center;">
${pill("RSVP confirmed", "#f7f0dc", "#8a6a1c")}
${h1(`You’re on the list,&nbsp;${b.first}.`)}
${p(`Thank you for replying.<br />${b.hosts} can’t wait to celebrate with&nbsp;you.`, 18)}
${ticket({
  kicker: "Save the date",
  eventName: o.eventName,
  when: b.when,
  stub: `${admitStub(o.guestName, o.guestCount)}${detail("Where", esc(b.where))}${detail("Dress code", esc(b.dress))}${detail("Dietary needs", esc(o.dietary?.trim() ?? ""))}${note}`,
})}
${buttons([...(cal ? [{ label: "Add to calendar", url: cal, solid: true }] : []), ...(b.map ? [{ label: "Get directions", url: b.map }] : [])])}
${p(`Need to change your answer? Send the form again on the <a href="${esc(b.link)}" style="color:${INK}!important;">invitation</a> with the same email or mobile&nbsp;number.${reminder}`, 26)}
${signed(b.hosts)}
${makeYourOwn}
</td></tr>`,
    }),
  };
}

/** "See you on Saturday", 2 days before (Premium). */
export function guestReminder(o: Common & { guestCount: number | null; photos?: boolean }): { subject: string; html: string } {
  const b = basics(o);
  const days = b.when?.daysLeft ?? 0;
  const countdown = days === 1 ? "Tomorrow" : days > 1 ? `${days} days to go` : "";
  const weekday = b.when?.weekday ?? "the day";
  return {
    subject: `See you on ${weekday}, ${o.guestName.trim().split(/\s+/)[0] || "friend"}`,
    html: frame({
      tagline: false,
      preheader: `${b.when ? `${b.when.long}${b.when.time ? ` · ${b.when.time}` : ""}` : ""}${b.venue ? ` · ${esc(b.venue)}` : ""}. Directions and details inside.`,
      spot: "confirm-spot.png",
      spotAlt: b.cover ? esc(o.eventName) : "An RSVP card in an envelope",
      cover: b.cover,
      footer: footer(o.eventName, b.hosts),
      content: `<tr><td class="pad" align="center" style="padding:24px 56px 6px;text-align:center;">
${countdown ? pill(countdown, "#fff1ec", CORAL) : ""}
${h1(`See you on ${esc(weekday)},&nbsp;${b.first}.`)}
${p(`${b.hosts} can’t wait to celebrate with&nbsp;you.<br />Here’s everything you need for the&nbsp;day.`, 18)}
${ticket({
  kicker: "You’re on the list",
  eventName: o.eventName,
  when: b.when,
  stub: `${admitStub(o.guestName, o.guestCount)}${detail("Where", esc(b.where))}${detail("Dress code", esc(b.dress))}`,
})}
${buttons([...(b.map ? [{ label: "Get directions", url: b.map, solid: true }] : []), { label: "Open the invitation", url: b.link }])}
${o.photos ? p(`Taking photos on the day? <a href="${b.link}/photos" style="color:${INK}!important;font-weight:600;">Share them with ${b.hosts}&nbsp;here</a>.`, 14) : ""}
${p("Plans changed? You can update your reply from the invitation.", 26)}
${signed(b.hosts)}
${promo(o.slug, true)}
</td></tr>`,
    }),
  };
}
