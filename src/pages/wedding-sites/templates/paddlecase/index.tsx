import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { paddlecaseDemo } from "../../content/fixtures/paddlecase-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const PaddleCaseTemplate = lazyTemplate(() => import("./PaddleCaseTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "paddlecase",
  fontPairingId: "cormorant-jost",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For pickleball birthdays and club days: a premium paddle case open on a walnut table, seen from
// above, every word on an object in it (gold foil on the leather patch, the initials on the
// paddle, the note on the hang tag, the day on the tournament card, the reply on the scorecard).
// The camera moves from object to object as the guest scrolls.
export const paddlecaseTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "paddlecase",
  label: "The Paddle Case",
  keywords: ["pickleball", "pickle", "paddle", "dink", "court", "sports", "tournament", "birthday", "racket", "luxury"],
  occasions: ["birthday", "other", "party"],
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cards/paddlecase.webp?v=1",
  cardImage: "/event-templates/cards/paddlecase.webp?v=1",
  component: PaddleCaseTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: paddlecaseDemo,
  uses: ["story", "dateVenue", "schedule"],
  storyLabel: "Note on the hang tag",
  storyHint: "A few lines, handwritten on the tag tied to the case. Long notes get smaller to fit the tag.",
  hideable: [
    { key: "hostIntro", label: "Note on the hang tag" },
    { key: "schedule", label: "The day (tournament card)" },
    { key: "dress", label: "What to wear (towel)" },
    { key: "bring", label: "What to bring (packing label)" },
    { key: "rsvp", label: "RSVP (scorecard)" },
  ],
  customFields: [
    { key: "names", label: "Name on the leather patch", hint: "Leave empty to use the names on your event.", placeholder: "Nico", maxLength: 24 },
    { key: "milestone", label: "The age", hint: "Shown as “turns thirty-five” and in Roman numerals on the paddle.", placeholder: "35", maxLength: 3 },
    { key: "ageLine", label: "Line under the name", hint: "Leave empty for “turns thirty-five” (from the age).", placeholder: "turns thirty-five", maxLength: 36 },
    { key: "heroLine", label: "Small line above the name", hint: "Leave empty for “A birthday on the court”.", placeholder: "A birthday on the court", maxLength: 40 },
    { key: "initials", label: "Initials on the paddle", hint: "Leave empty for the initials of the name on your event (Nico Santos → NS).", placeholder: "NS", maxLength: 4 },
    { key: "signature", label: "Signed", section: "hostIntro", hint: "Under the note. Leave empty for “— ” and your first name.", placeholder: "— Nico", maxLength: 30 },
    { key: "dayLabel", label: "Card: small line", section: "schedule", placeholder: "The day", maxLength: 24 },
    { key: "dayTitle", label: "Card: heading", section: "schedule", placeholder: "Game plan", maxLength: 30 },
    { key: "wearTitle", label: "Towel: heading", section: "dress", placeholder: "Wear", maxLength: 20 },
    { key: "dressCode", label: "What to wear", section: "dress", hint: "One thing a line.", placeholder: "Court shoes\nsomething light\na cap for the sun", multiline: true, maxLength: 160 },
    { key: "bringTitle", label: "Label: heading", section: "bring", placeholder: "Pack", maxLength: 16 },
    { key: "bring", label: "What to bring", section: "bring", hint: "One thing a line.", placeholder: "A water bottle\nA towel\nYour paddle, if you have one", multiline: true, maxLength: 200 },
    { key: "rsvpTitle", label: "Scorecard heading", section: "rsvp", placeholder: "Scorecard", maxLength: 24 },
    { key: "rsvpButton", label: "Send stamp", section: "rsvp", placeholder: "Send", maxLength: 12 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", hint: "Shown after a guest says they’re in.", placeholder: "Your spot on the court is saved.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the reply on the scorecard the day after.", maxLength: 160 },
  ],
};
