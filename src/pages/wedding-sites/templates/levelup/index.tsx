import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { levelUpDemo } from "../../content/fixtures/levelup-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const LevelUpTemplate = lazyTemplate(() => import("./LevelUpTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "levelup",
  fontPairingId: "chakra-manrope",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For gamers, any age: a low-poly island in real 3D, opened like a game (the name as its title,
// "Level 30", Press start), flown over quest by quest to the reply at the castle.
export const levelUpTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "levelup",
  label: "Level Up",
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cards/levelup.webp?v=1",
  cardImage: "/event-templates/cards/levelup.webp?v=1",
  component: LevelUpTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: levelUpDemo,
  uses: ["dateVenue", "schedule", "registry", "faqs"],
  hideable: [
    { key: "schedule", label: "The day (schedule and venue)" },
    { key: "dress", label: "Gear up (what to wear)" },
    { key: "registry", label: "Loot (gifts)" },
    { key: "faqs", label: "Tips (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "The game’s title (the name)", hint: "Leave empty to use the names on your event.", placeholder: "Kai", maxLength: 24 },
    { key: "milestone", label: "The age", hint: "Shown as “Level 30”, and on the player card.", placeholder: "30", maxLength: 3 },
    { key: "levelLine", label: "Line under the title", hint: "Leave empty for “Level 30” (from the age).", maxLength: 30 },
    { key: "heroLine", label: "Small line above the title", placeholder: "A birthday quest", maxLength: 40 },
    { key: "startLabel", label: "Start prompt", placeholder: "Press start", maxLength: 20 },
    { key: "logTitle", label: "Quest log heading", hint: "Over the island, above the list of quests.", placeholder: "Your quests", maxLength: 30 },
    { key: "dayTitle", label: "Day heading", section: "schedule", placeholder: "The day", maxLength: 30 },
    { key: "gearTitle", label: "Gear up: heading", section: "dress", placeholder: "Gear up", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", placeholder: "Come as your favourite character, or in your comfiest gaming clothes.", multiline: true, maxLength: 220 },
    { key: "lootTitle", label: "Loot: heading", section: "registry", placeholder: "Loot", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your company is the only gift needed.", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "tipsTitle", label: "Tips: heading", section: "faqs", placeholder: "Tips", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Join the party?", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Achievement message", section: "rsvp", hint: "Shown with “+100 XP” after a guest accepts.", placeholder: "See you at the party.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
