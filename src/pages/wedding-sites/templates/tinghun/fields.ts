import type { TemplateDefinition } from "../../engine/registry";

// The fields every Tinghun design shares (same keys, so a host's answers carry over when they
// switch between Rice Paper, Lacquer Door and Porcelain Garden). A design may append its own.
// Keys shared with Capiz/Calado (heroLine, invitation, reception*, dressCode, replyButton…) on
// purpose, for the same reason.

export const TINGHUN_FIELDS: NonNullable<TemplateDefinition["customFields"]> = [
  {
    key: "heroZh",
    label: "Chinese heading",
    hint: "The large characters at the top.",
    options: [
      { value: "訂婚", label: "訂婚 (engagement)" },
      { value: "文定之喜", label: "文定之喜 (formal)" },
      { value: "囍", label: "囍 (double happiness)" },
      { value: "none", label: "None" },
    ],
  },
  { key: "heroLine", label: "Small line above your names", hint: "Optional.", placeholder: "The Ting Hun of", maxLength: 40 },
  { key: "hostZh1", label: "First name in Chinese", hint: "Optional. Shown under the first name.", placeholder: "陳美玲", maxLength: 12 },
  { key: "hostZh2", label: "Second name in Chinese", hint: "Optional. Shown under the second name.", placeholder: "林志明", maxLength: 12 },
  { key: "familiesZh", label: "The families in Chinese", hint: "Optional, e.g. the two family names.", placeholder: "陳府 · 林府", maxLength: 20 },
  { key: "familiesLine", label: "Line above the families", hint: "The parents come from Entourage & motif (Parents of the Bride / of the Groom).", placeholder: "Together with their families", maxLength: 50 },
  {
    key: "invitation",
    label: "Invitation wording",
    multiline: true,
    placeholder: "request the pleasure of your company at the Ting Hun of their children",
    maxLength: 160,
  },
  { key: "lunarDate", label: "Lunar date", hint: "Leave empty to work it out from your date. Type your own to match the family’s almanac.", placeholder: "丁未年二月初六", maxLength: 24, section: "lunar" },
  { key: "receptionName", label: "The lunch or dinner: venue", hint: "Leave empty if it’s the same place as the ceremony.", placeholder: "Golden Lotus Restaurant", maxLength: 60 },
  { key: "receptionAddress", label: "The lunch or dinner: address", placeholder: "Ongpin Street, Binondo, Manila", maxLength: 100 },
  { key: "receptionTime", label: "The lunch or dinner: time", placeholder: "Twelve noon", maxLength: 50 },
  { key: "receptionMap", label: "The lunch or dinner: map link (optional)", hint: "A Google Maps link. Leave empty to search for the venue.", placeholder: "https://maps.app.goo.gl/…", maxLength: 300 },
  {
    key: "dressCode",
    label: "What to wear",
    hint: "Your motif colours show beside it.",
    placeholder: "Festive. Red, pink and gold are welcome; kindly avoid all-black and all-white.",
    multiline: true,
    maxLength: 240,
    section: "dress",
  },
  { key: "giftTitle", label: "Gifts heading", section: "registry", placeholder: "Ang pao and gifts", maxLength: 30 },
  { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
  { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Kindly reply", maxLength: 30 },
  { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send my reply", maxLength: 24 },
  { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest accepts.", section: "rsvp", placeholder: "Thank you. We look forward to celebrating with you.", maxLength: 90 },
  { key: "closing", label: "Closing line", placeholder: "多謝 · Thank you", maxLength: 40 },
  { key: "afterParty", label: "After the ting hun", hint: "Replaces the RSVP the day after.", placeholder: "Thank you for celebrating with our families.", maxLength: 160 },
];

/** Sections every Tinghun design can switch off (each may add its own). */
export const TINGHUN_HIDEABLE: NonNullable<TemplateDefinition["hideable"]> = [
  { key: "parents", label: "The families (in the invitation)" },
  { key: "lunar", label: "Lunar date" },
  { key: "countdown", label: "Countdown" },
  { key: "hostIntro", label: "A note from our families" },
  { key: "entourage", label: "Elders & family" },
  { key: "schedule", label: "The ceremony (schedule)" },
  { key: "dress", label: "What to wear" },
  { key: "gallery", label: "Photos" },
  { key: "registry", label: "Ang pao & gifts" },
  { key: "faqs", label: "Good to know (FAQs)" },
  { key: "rsvp", label: "RSVP" },
];
