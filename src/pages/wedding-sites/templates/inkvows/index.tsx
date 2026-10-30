import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { inkvowsDemo } from "../../content/fixtures/inkvows-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const InkvowsTemplate = lazyTemplate(() => import("./InkvowsTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "inkvows",
  fontPairingId: "pinyon-newsreader",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For weddings and engagements: editorial calligraphy on one long sheet of heavy cotton paper,
// close up. A pen writes the couple's names stroke by stroke, the ink wet, then drying into the
// fibres; then each section's heading as the guest reaches it: the story (with a gilded
// initial), the day, the venue, the entourage, attire painted in the motif colours, where to
// stay, gifts, questions, and the reply with a wax seal pressed on it.
export const inkvowsTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "inkvows",
  label: "Ink and vows",
  archetype: "editorial",
  previewThumbnailUrl: "/event-templates/cards/inkvows.webp?v=1",
  cardImage: "/event-templates/cards/inkvows.webp?v=1",
  component: InkvowsTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: inkvowsDemo,
  uses: ["story", "dateVenue", "schedule", "accommodations", "travel", "registry", "faqs"],
  storyLabel: "Our story",
  storyHint: "A few short paragraphs. Leave a blank line between them. The first letter is set in gold leaf.",
  hideable: [
    { key: "hostIntro", label: "Our story" },
    { key: "schedule", label: "The day (program)" },
    { key: "venue", label: "The venue" },
    { key: "entourage", label: "The entourage" },
    { key: "dress", label: "Attire" },
    { key: "accommodations", label: "Where to stay" },
    { key: "travelInformation", label: "Getting there" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "Your names, as written", hint: "Leave empty to use the names on your event. The pen writes them on the first screen.", placeholder: "Clara & Mateo", maxLength: 40 },
    { key: "sealText", label: "Initials on the wax seal", hint: "Leave empty to use your first initials.", placeholder: "C&M", maxLength: 5 },
    { key: "heroKicker", label: "Line under your names", placeholder: "together with their families", maxLength: 50 },
    { key: "inviteLine", label: "The invitation", placeholder: "request the pleasure of your company at the celebration of their marriage", multiline: true, maxLength: 110 },
    { key: "dateLine", label: "The date, as printed", hint: "Leave empty to write your date out in words, e.g. “Saturday, the eleventh of December”.", maxLength: 80 },
    { key: "receptionLine", label: "Last line of the invitation", placeholder: "Dinner and dancing to follow", maxLength: 60 },
    { key: "cueLabel", label: "Prompt at the foot of the first screen", placeholder: "The details", maxLength: 24 },
    { key: "storyKicker", label: "Our story: small line", section: "hostIntro", placeholder: "How it began", maxLength: 36 },
    { key: "storyTitle", label: "Our story: written heading", section: "hostIntro", placeholder: "Our story", maxLength: 30 },
    { key: "dayKicker", label: "The day: small line", section: "schedule", placeholder: "The order of the day", maxLength: 36 },
    { key: "dayTitle", label: "The day: written heading", section: "schedule", placeholder: "The day", maxLength: 30 },
    { key: "venueKicker", label: "The venue: small line", section: "venue", placeholder: "Ceremony and reception", maxLength: 40 },
    { key: "venueTitle", label: "The venue: written heading", section: "venue", placeholder: "The venue", maxLength: 30 },
    { key: "venueNote", label: "A note about the venue", section: "venue", placeholder: "The ceremony is in the garden; the reception follows in the old stone hall.", multiline: true, maxLength: 160 },
    { key: "entourageKicker", label: "Entourage: small line", section: "entourage", placeholder: "Those who stand with us", maxLength: 40 },
    { key: "entourageTitle", label: "Entourage: written heading", section: "entourage", hint: "The names come from Entourage & motif.", placeholder: "The entourage", maxLength: 30 },
    { key: "dressKicker", label: "Attire: small line", section: "dress", placeholder: "What to wear", maxLength: 36 },
    { key: "dressTitle", label: "Attire: written heading", section: "dress", placeholder: "Attire", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", hint: "Your motif colours (Entourage & motif) are painted under it.", placeholder: "Formal. Gentlemen in suits or barong, ladies in long gowns.", multiline: true, maxLength: 240 },
    { key: "swatchLabel", label: "Under the colours", section: "dress", placeholder: "Our colours", maxLength: 30 },
    { key: "stayKicker", label: "Where to stay: small line", section: "accommodations", placeholder: "For the weekend", maxLength: 36 },
    { key: "stayTitle", label: "Where to stay: written heading", section: "accommodations", placeholder: "Where to stay", maxLength: 30 },
    { key: "travelTitle", label: "Getting there: heading", section: "travelInformation", placeholder: "Getting there", maxLength: 30 },
    { key: "giftKicker", label: "Gifts: small line", section: "registry", placeholder: "If you wish", maxLength: 36 },
    { key: "giftTitle", label: "Gifts: written heading", section: "registry", placeholder: "Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your presence is the greatest gift. Should you wish to bless us, a contribution to our first home would mean the world.", multiline: true, maxLength: 240 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "giftSign", label: "Signed", section: "registry", placeholder: "With love, Clara and Mateo", maxLength: 50 },
    { key: "faqKicker", label: "Good to know: small line", section: "faqs", placeholder: "Before you come", maxLength: 36 },
    { key: "faqTitle", label: "Good to know: written heading", section: "faqs", placeholder: "Good to know", maxLength: 30 },
    { key: "rsvpKicker", label: "RSVP: small line", section: "rsvp", placeholder: "Your reply", maxLength: 36 },
    { key: "rsvpTitle", label: "RSVP: written heading", section: "rsvp", placeholder: "Kindly reply", maxLength: 30 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", hint: "Shown after a guest says yes.", placeholder: "We can’t wait to celebrate with you.", maxLength: 90 },
    { key: "afterParty", label: "After the wedding", hint: "Replaces the RSVP the day after.", placeholder: "Thank you for celebrating with us.", maxLength: 160 },
  ],
};
