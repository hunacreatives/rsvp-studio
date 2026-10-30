import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { letterpressDemo } from "../../content/fixtures/letterpress-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const LetterpressTemplate = lazyTemplate(() => import("./LetterpressTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "letterpress",
  fontPairingId: "caslon",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For weddings and engagements: a fine-art invitation suite on a linen table, seen from above in
// window light. The ink-blue envelope opens (seal, flap, the card sliding out), then each section
// is one piece of the suite: the day, attire with fabric swatches, the venue on vellum, where to
// stay, a gifts note, questions on a folded card, and the reply card with its stamped envelope.
export const letterpressTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "letterpress",
  label: "Letterpress",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/cards/letterpress.webp?v=1",
  cardImage: "/event-templates/cards/letterpress.webp?v=1",
  component: LetterpressTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: letterpressDemo,
  uses: ["dateVenue", "schedule", "accommodations", "travel", "registry", "faqs"],
  hideable: [
    { key: "schedule", label: "The day (program)" },
    { key: "dress", label: "Attire" },
    { key: "venue", label: "The venue" },
    { key: "accommodations", label: "Where to stay" },
    { key: "travelInformation", label: "Getting there" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "Your names, as printed", hint: "Leave empty to use the names on your event.", placeholder: "Clarisse & Miguel", maxLength: 40 },
    { key: "sealText", label: "Initials on the wax seal", hint: "Leave empty to use your first initials.", placeholder: "C&M", maxLength: 5 },
    { key: "openLabel", label: "Prompt under the sealed envelope", placeholder: "Open the invitation", maxLength: 30 },
    { key: "heroKicker", label: "Line above your names", placeholder: "Together with their families", maxLength: 50 },
    { key: "inviteLine", label: "Line under your names", placeholder: "request the pleasure of your company at the celebration of their marriage", multiline: true, maxLength: 110 },
    { key: "dateLine", label: "The date, as printed", hint: "Leave empty to write your date out in words, e.g. “Saturday, the eleventh of December”.", maxLength: 80 },
    { key: "receptionLine", label: "Last line of the invitation", placeholder: "Dinner and dancing to follow", maxLength: 60 },
    { key: "cueLabel", label: "Prompt at the foot of the invitation", placeholder: "The details", maxLength: 24 },
    { key: "dayKicker", label: "The day: small line", section: "schedule", placeholder: "The order of the day", maxLength: 36 },
    { key: "dayTitle", label: "The day: heading", section: "schedule", placeholder: "The Day", maxLength: 30 },
    { key: "dressKicker", label: "Attire: small line", section: "dress", placeholder: "What to wear", maxLength: 36 },
    { key: "dressTitle", label: "Attire: heading", section: "dress", placeholder: "Attire", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", hint: "Your motif colours (Entourage & motif) show under it as fabric swatches.", placeholder: "Formal. Gentlemen in suits or barong, ladies in long gowns.", multiline: true, maxLength: 240 },
    { key: "swatchLabel", label: "Under the swatches", section: "dress", placeholder: "Our colours", maxLength: 30 },
    { key: "venueKicker", label: "The venue: small line", section: "venue", placeholder: "Ceremony and reception", maxLength: 40 },
    { key: "venueTitle", label: "The venue: heading", section: "venue", placeholder: "The Venue", maxLength: 30 },
    { key: "stayKicker", label: "Where to stay: small line", section: "accommodations", placeholder: "For the weekend", maxLength: 36 },
    { key: "stayTitle", label: "Where to stay: heading", section: "accommodations", placeholder: "Where to Stay", maxLength: 30 },
    { key: "travelTitle", label: "Getting there: heading", section: "travelInformation", placeholder: "Getting There", maxLength: 30 },
    { key: "giftTitle", label: "Gifts: heading", section: "registry", placeholder: "A Note on Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your presence is the greatest gift. Should you wish to bless us, a contribution to our first home would mean the world.", multiline: true, maxLength: 240 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "giftSign", label: "Signed", section: "registry", hint: "Written in script under the note.", placeholder: "With love, Clarisse & Miguel", maxLength: 50 },
    { key: "faqKicker", label: "Good to know: small line", section: "faqs", placeholder: "Before you come", maxLength: 36 },
    { key: "faqTitle", label: "Good to know: heading", section: "faqs", placeholder: "Good to Know", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Kindly Reply", maxLength: 30 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", hint: "Shown after a guest says yes.", placeholder: "We can’t wait to celebrate with you.", maxLength: 90 },
    { key: "afterParty", label: "After the wedding", hint: "Replaces the RSVP the day after.", placeholder: "Thank you for celebrating with us.", maxLength: 160 },
  ],
};
