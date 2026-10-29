import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import PixelQuestTemplate from "./PixelQuestTemplate";
import { pixelQuestDemo } from "../../content/fixtures/pixel-quest-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "pixel-quest",
  fontPairingId: "pressstart-pixelify",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For birthdays, any age: a side-scrolling pixel level, opened like an old console game (a CRT
// switching on, the name dropping in, Press start), run through stage by stage from afternoon
// to night, each part told in a pixel dialog window, to the reply at the cake.
export const pixelQuestTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "pixel-quest",
  label: "Pixel Quest",
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cards/pixel-quest.webp?v=1",
  cardImage: "/event-templates/cards/pixel-quest.webp?v=1",
  component: PixelQuestTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: pixelQuestDemo,
  uses: ["dateVenue", "schedule", "registry", "faqs"],
  hideable: [
    { key: "schedule", label: "The day (schedule and venue)" },
    { key: "dress", label: "What to wear (the power-up shop)" },
    { key: "registry", label: "Gifts (the treasure room)" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "The game’s title (the name)", hint: "Leave empty to use the names on your event.", placeholder: "Enzo", maxLength: 24 },
    { key: "milestone", label: "The age", hint: "Shown as “8th birthday”, as the world number (World 8-1) and as candles on the cake.", placeholder: "8", maxLength: 3 },
    { key: "ageLine", label: "Line under the title", hint: "Leave empty for “8th birthday” (from the age).", maxLength: 30 },
    { key: "heroLine", label: "Small line above the title", placeholder: "You’re invited", maxLength: 36 },
    { key: "startLabel", label: "Start prompt", placeholder: "Press start", maxLength: 20 },
    { key: "mapTitle", label: "Stage list heading", hint: "The window listing every stage, after the title.", placeholder: "Select stage", maxLength: 24 },
    { key: "dayPlace", label: "The day: place name", section: "schedule", hint: "On the window’s top bar.", placeholder: "Party hall", maxLength: 24 },
    { key: "dayTitle", label: "Day heading", section: "schedule", placeholder: "The day", maxLength: 30 },
    { key: "gearPlace", label: "What to wear: place name", section: "dress", placeholder: "Power-up shop", maxLength: 24 },
    { key: "gearTitle", label: "What to wear: heading", section: "dress", placeholder: "What to wear", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", placeholder: "Comfy play clothes. Bonus points for your favourite game colour.", multiline: true, maxLength: 220 },
    { key: "lootPlace", label: "Gifts: place name", section: "registry", placeholder: "Treasure room", maxLength: 24 },
    { key: "lootTitle", label: "Gifts heading", section: "registry", placeholder: "Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your company is the only gift needed.", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "tipsPlace", label: "Good to know: place name", section: "faqs", placeholder: "The sage", maxLength: 24 },
    { key: "tipsTitle", label: "Good to know: heading", section: "faqs", placeholder: "Good to know", maxLength: 30 },
    { key: "rsvpPlace", label: "RSVP: place name", section: "rsvp", placeholder: "The cake", maxLength: 24 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Join the party?", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Stage clear message", section: "rsvp", hint: "Shown under “New high score” after a guest says yes.", placeholder: "See you at the party.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
