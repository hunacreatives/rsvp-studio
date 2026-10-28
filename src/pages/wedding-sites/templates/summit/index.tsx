import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import SummitTemplate from "./SummitTemplate";
import { summitDemo } from "../../content/fixtures/summit-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "summit",
  fontPairingId: "cormorant-manrope",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For climbers and hikers: a Philippine mountain, all rainforest, the camera rising up it as the
// guest scrolls, past the camps (the sections) and through the cloud, to the reply at the top.
export const summitTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "summit",
  label: "Summit",
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cards/summit.webp?v=1",
  cardImage: "/event-templates/cards/summit.webp?v=1",
  component: SummitTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: summitDemo,
  uses: ["dateVenue", "schedule", "registry", "faqs"],
  hideable: [
    { key: "schedule", label: "The day (schedule and venue)" },
    { key: "dress", label: "What to bring" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "Name in the sky", hint: "Leave empty to use the names on your event.", placeholder: "Kai", maxLength: 40 },
    { key: "milestone", label: "The age", hint: "Shown as “is turning thirty”.", placeholder: "30", maxLength: 3 },
    { key: "ageLine", label: "Line under the name", hint: "Leave empty for “is turning thirty” (from the age).", maxLength: 40 },
    { key: "summitHeight", label: "The mountain’s height (metres)", hint: "The altimeter climbs to it and the summit marker shows it. Leave empty for 3,000.", placeholder: "2922", maxLength: 5 },
    { key: "heroLine", label: "Small line above the name", placeholder: "The climb begins at dawn", maxLength: 40 },
    { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
    { key: "dayTitle", label: "Day heading", section: "schedule", placeholder: "The day", maxLength: 40 },
    { key: "bringTitle", label: "What to bring: heading", section: "dress", placeholder: "What to bring", maxLength: 40 },
    { key: "dressCode", label: "What to bring", section: "dress", placeholder: "A jacket and layers: it gets cold before sunrise. Rain gear, a headlamp and good boots.", multiline: true, maxLength: 220 },
    { key: "giftTitle", label: "Gifts heading", section: "registry", placeholder: "Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your company is the only gift needed.", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "faqTitle", label: "Good to know: heading", section: "faqs", placeholder: "Good to know", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Will you climb with us?", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", placeholder: "Your spot on the trail is saved.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
