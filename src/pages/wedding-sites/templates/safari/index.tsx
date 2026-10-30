import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { safariDemo } from "../../content/fixtures/safari-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const SafariTemplate = lazyTemplate(() => import("./SafariTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "safari",
  fontPairingId: "fraunces-nunito",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For children's birthdays: a paper-cut storybook savanna driven through in a jeep, the child's
// name in coloured paper letters, the animals telling each part in speech bubbles, a safari pass.
export const safariTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "safari",
  label: "Safari",
  archetype: "scrapbook",
  previewThumbnailUrl: "/event-templates/cards/safari.webp?v=1",
  cardImage: "/event-templates/cards/safari.webp?v=1",
  component: SafariTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: safariDemo,
  uses: ["dateVenue", "schedule", "registry", "faqs"],
  hideable: [
    { key: "schedule", label: "The day (schedule and venue)" },
    { key: "dress", label: "What to wear" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "The birthday child’s name", hint: "Cut from coloured paper at the top. Leave empty to use the names on your event.", placeholder: "Maya", maxLength: 30 },
    { key: "milestone", label: "The age", hint: "Shown as “is turning five”, and on the jeep’s flag.", placeholder: "5", maxLength: 3 },
    { key: "ageLine", label: "Line on the ribbon", hint: "Leave empty for “is turning five” (from the age).", maxLength: 40 },
    { key: "heroLine", label: "Small line above the name", placeholder: "You’re invited on a safari", maxLength: 40 },
    { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
    { key: "dayTitle", label: "Day heading", section: "schedule", placeholder: "The day", maxLength: 30 },
    { key: "wearTitle", label: "What to wear: heading", section: "dress", placeholder: "What to wear", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", placeholder: "Safari khaki and comfy shoes. Hats and binoculars welcome.", multiline: true, maxLength: 200 },
    { key: "giftTitle", label: "Gifts heading", section: "registry", placeholder: "Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your company is the only gift needed.", multiline: true, maxLength: 200 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "faqTitle", label: "Good to know: heading", section: "faqs", placeholder: "Good to know", maxLength: 30 },
    { key: "passTitle", label: "Pass heading", section: "rsvp", placeholder: "Safari pass", maxLength: 24 },
    { key: "passLine", label: "Line under the pass heading", section: "rsvp", placeholder: "Admits your little explorer", maxLength: 40 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Will you join the safari?", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", placeholder: "Your seat in the jeep is saved.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
