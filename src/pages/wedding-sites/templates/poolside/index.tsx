import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { poolsideDemo } from "../../content/fixtures/poolside-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const PoolsideTemplate = lazyTemplate(() => import("./PoolsideTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "poolside",
  fontPairingId: "dmserif-jost",
  sectionVisibility: { ...defaultSectionVisibility },
};

// Birthdays and parties by the pool: a resort pool seen from above, the whole page long, its
// water drawn live; the words on the water, a tiled deck full of the day around it.
export const poolsideTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "poolside",
  label: "Poolside",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/cards/poolside.webp?v=1",
  cardImage: "/event-templates/cards/poolside.webp?v=1",
  component: PoolsideTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: poolsideDemo,
  uses: ["dateVenue", "schedule", "registry", "faqs"],
  hideable: [
    { key: "schedule", label: "The day (schedule and venue)" },
    { key: "dress", label: "What to wear" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "Name on the water", hint: "Leave empty to use the names on your event.", placeholder: "Bianca", maxLength: 40 },
    { key: "milestone", label: "The age", hint: "Shown as “is turning thirty”.", placeholder: "30", maxLength: 3 },
    { key: "ageLine", label: "Line under the name", hint: "Leave empty for “is turning thirty” (from the age).", placeholder: "is turning thirty", maxLength: 40 },
    { key: "heroLine", label: "Small line above the name", placeholder: "You’re invited to a pool party", maxLength: 50 },
    { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
    { key: "dayLabel", label: "Day label", section: "schedule", placeholder: "The day", maxLength: 30 },
    { key: "dayTitle", label: "Day heading", section: "schedule", hint: "Leave empty to use your venue’s name.", placeholder: "Casa Marea", maxLength: 50 },
    { key: "dressTitle", label: "What to wear: heading", section: "dress", placeholder: "What to wear", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", placeholder: "Swimwear and resort whites. Bring a change of clothes for the evening.", multiline: true, maxLength: 220 },
    { key: "giftTitle", label: "Gifts heading", section: "registry", placeholder: "Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your company is the only gift needed.", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "faqTitle", label: "Good to know: heading", section: "faqs", placeholder: "Good to know", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Will you make a splash?", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", placeholder: "See you by the water.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
