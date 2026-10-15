import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import DebutTemplate from "./DebutTemplate";
import { debutDemo } from "../../content/fixtures/debut-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "wine-gold",
  fontPairingId: "pinyon-cormorant",
  sectionVisibility: { ...defaultSectionVisibility },
};

// Designed in code (no source file), in two pages: a lace-edged invitation in a
// wine envelope held by a gold "18" seal, and behind "RSVP here" the debut page
// (her note, the program, dress code, the 18 Roses / Candles / Treasures lists,
// gifts, FAQs, RSVP). Its own wording lives in the fields below.
export const debutTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "debut",
  label: "Debut",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/debut/thumbnail.jpg",
  component: DebutTemplate,
  defaultSettings,
  tier: "free",
  demoContent: debutDemo,
  uses: ["story", "dateVenue", "schedule", "registry", "faqs"],
  storyLabel: "Your note to guests",
  storyHint: "Shown under “A Note from …” on the debut page. Leave a blank line between paragraphs.",
  hideable: [
    { key: "hostIntro", label: "A Note (your message)" },
    { key: "schedule", label: "The Program (schedule)" },
    { key: "dress", label: "Dress Code" },
    { key: "entourage", label: "18 Roses, Candles & Treasures" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to Know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "kicker", label: "Script line at the top", placeholder: "You’re Invited", maxLength: 24 },
    { key: "leadIn", label: "Small line above the big words", placeholder: "Join us to celebrate the", maxLength: 40 },
    { key: "headline", label: "Big words", hint: "Set in spaced capitals.", placeholder: "18th Birthday", maxLength: 24 },
    { key: "sealText", label: "On the wax seal", hint: "Two or three characters look best, like 18 or your initials.", placeholder: "18", maxLength: 3 },
    { key: "closing", label: "Closing line", placeholder: "Let’s make it a night to remember.", maxLength: 80 },
    { key: "introButton", label: "Button under the seal", placeholder: "RSVP here", maxLength: 22 },
    { key: "insideKicker", label: "Line above your name on the debut page", placeholder: "You are cordially invited to the debut of", maxLength: 60 },
    {
      key: "dressCode",
      label: "Dress code",
      hint: "Your motif colours (Entourage & motif) show as swatches under it.",
      placeholder: "Formal. Ladies in long gowns, gentlemen in suits, in shades of wine and gold.",
      multiline: true,
      maxLength: 200,
      section: "dress",
    },
    { key: "rsvpTitle", label: "RSVP heading", placeholder: "Kindly Reply", maxLength: 30 },
    { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest accepts.", placeholder: "We can’t wait to celebrate with you.", maxLength: 80 },
    { key: "afterParty", label: "After the event", hint: "Replaces the RSVP the day after your debut.", placeholder: "Thank you for celebrating with me.", maxLength: 160 },
  ],
};
