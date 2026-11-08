import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { flatlayDemo } from "../../content/fixtures/flatlay-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const FlatLayTemplate = lazyTemplate(() => import("./FlatLayTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "flatlay",
  fontPairingId: "fraunces-jost",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For pickleball birthdays and court parties: one terracotta court from straight above in a low
// morning sun, the whole page long. The words are painted on it in court-line paint, the schedule
// is in marker on a coaching board, the reply is painted IN / OUT boxes, and a line-marking robot
// paints it all in at the start. Props are Blender renders under the same sun.
export const flatlayTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "flatlay",
  label: "Flat Lay",
  keywords: ["pickleball", "pickle", "paddle", "dink", "court", "sports", "birthday", "court party"],
  archetype: "cinematic",
  occasions: ["birthday", "other", "party"],
  previewThumbnailUrl: "/event-templates/cards/flatlay.webp?v=1",
  cardImage: "/event-templates/cards/flatlay.webp?v=1",
  component: FlatLayTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: flatlayDemo,
  uses: ["story", "dateVenue", "schedule"],
  storyLabel: "Message",
  storyHint: "A few lines to your guests, painted on the court. Leave a blank line between paragraphs.",
  hideable: [
    { key: "hostIntro", label: "Message" },
    { key: "schedule", label: "Game plan (schedule)" },
    { key: "dress", label: "What to wear" },
    { key: "bring", label: "What to bring" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "The name on the court", hint: "Leave empty to use the names on your event.", placeholder: "Nico", maxLength: 22 },
    { key: "milestone", label: "The age", hint: "Shown as “turns thirty-five” under the name.", placeholder: "35", maxLength: 3 },
    { key: "ageLine", label: "Line under the name", hint: "Leave empty for “turns thirty-five” (from the age).", placeholder: "turns thirty-five", maxLength: 36 },
    { key: "heroLine", label: "Small line above the name", hint: "Leave empty for “A birthday on the court”.", placeholder: "A birthday on the court", maxLength: 40 },
    { key: "messageTitle", label: "Message heading", section: "hostIntro", placeholder: "Let’s rally", maxLength: 30 },
    { key: "dayTitle", label: "Game plan heading", section: "schedule", placeholder: "Game plan", maxLength: 30 },
    { key: "wearTitle", label: "What to wear: heading", section: "dress", placeholder: "What to wear", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", placeholder: "Court shoes (non-marking soles) and something you can move in.", multiline: true, maxLength: 220 },
    { key: "bringTitle", label: "What to bring: heading", section: "bring", placeholder: "What to bring", maxLength: 30 },
    { key: "bring", label: "What to bring", section: "bring", placeholder: "A water bottle, a towel, and your own paddle if you have one.", multiline: true, maxLength: 260 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Are you in?", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", hint: "Shown after a guest says they’re in.", placeholder: "Your reply is in. See you on the court.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
