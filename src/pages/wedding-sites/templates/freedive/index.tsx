import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import FreediveTemplate from "./FreediveTemplate";
import { freediveDemo } from "../../content/fixtures/freedive-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "freedive",
  fontPairingId: "instrument-manrope",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For divers, swimmers and anyone who loves the sea: a level camera at the waterline, then down
// the dive line as the guest scrolls, to the reply at full depth (the age, in metres).
export const freediveTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "freedive",
  label: "The Blue",
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cards/freedive.webp?v=1",
  cardImage: "/event-templates/cards/freedive.webp?v=1",
  component: FreediveTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: freediveDemo,
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
    { key: "milestone", label: "The age", hint: "Shown as “is turning thirty”, and the dive goes that many metres deep.", placeholder: "30", maxLength: 3 },
    { key: "ageLine", label: "Line under the name", hint: "Leave empty for “is turning thirty” (from the age).", maxLength: 40 },
    { key: "heroLine", label: "Small line above the name", placeholder: "Take a deep breath", maxLength: 40 },
    { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
    { key: "dayTitle", label: "Day heading", section: "schedule", placeholder: "The day", maxLength: 40 },
    { key: "bringTitle", label: "What to bring: heading", section: "dress", placeholder: "What to bring", maxLength: 40 },
    { key: "dressCode", label: "What to bring", section: "dress", placeholder: "Mask, fins and reef-safe sunscreen. A wetsuit if you run cold.", multiline: true, maxLength: 220 },
    { key: "giftTitle", label: "Gifts heading", section: "registry", placeholder: "Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your company is the only gift needed.", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "faqTitle", label: "Good to know: heading", section: "faqs", placeholder: "Good to know", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Will you dive in with us?", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", placeholder: "Your spot on the boat is saved.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
