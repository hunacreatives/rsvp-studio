import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import RallyTemplate from "./RallyTemplate";
import { rallyDemo } from "../../content/fixtures/rally-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "rally",
  fontPairingId: "archivo-inter",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For pickleball birthdays, tournaments, open play and club socials: one point played out the
// whole page long on a real 3D court under floodlights, golden hour to blue hour. Each section is
// a shot of the rally (simulated ball, the camera following it), and the reply is the line call:
// a guest's "In" is the host's winning smash.
export const rallyTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "rally",
  label: "Rally",
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cards/rally.webp?v=1",
  cardImage: "/event-templates/cards/rally.webp?v=1",
  component: RallyTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: rallyDemo,
  uses: ["dateVenue", "schedule", "registry", "faqs"],
  hideable: [
    { key: "schedule", label: "The day (schedule and venue)" },
    { key: "dress", label: "What to wear" },
    { key: "bring", label: "What to bring" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "The name on the court", hint: "Leave empty to use the names on your event.", placeholder: "Nico", maxLength: 22 },
    { key: "milestone", label: "The age", hint: "Shown as “turns 35” under the name.", placeholder: "35", maxLength: 3 },
    { key: "ageLine", label: "Line under the name", hint: "Leave empty for “turns 35” (from the age).", placeholder: "turns 35", maxLength: 36 },
    { key: "heroLine", label: "Small line above the name", placeholder: "A birthday rally", maxLength: 40 },
    { key: "scoreCall", label: "The score call", hint: "On the scoreboard, called the pickleball way: your score, theirs, the server. The point goes to you when a guest replies “In”.", placeholder: "10-9-2", maxLength: 8 },
    { key: "hint", label: "First button (starts the rally)", placeholder: "Serve", maxLength: 18 },
    { key: "dayTitle", label: "Day heading", section: "schedule", placeholder: "The day", maxLength: 30 },
    { key: "wearTitle", label: "What to wear: heading", section: "dress", placeholder: "What to wear", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", placeholder: "Court shoes and anything you can move in.", multiline: true, maxLength: 220 },
    { key: "bringTitle", label: "What to bring: heading", section: "bring", placeholder: "What to bring", maxLength: 30 },
    { key: "bring", label: "What to bring", section: "bring", hint: "One thing a line.", placeholder: "Your paddle\nA water bottle", multiline: true, maxLength: 260 },
    { key: "giftTitle", label: "Gifts: heading", section: "registry", placeholder: "Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your company is the only gift needed.", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "faqTitle", label: "Good to know: heading", section: "faqs", placeholder: "Good to know", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Make the call", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send my call", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", hint: "Shown after a guest says they’re in.", placeholder: "See you on court.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
