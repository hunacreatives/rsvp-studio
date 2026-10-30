import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { sprinklesDemo } from "../../content/fixtures/sprinkles-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const SprinklesTemplate = lazyTemplate(() => import("./SprinklesTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "sprinkles",
  fontPairingId: "bricolage-dmsans",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For birthdays, any age: a real cake, drawn in code. It opens on the top of the cake from above
// (buttercream, a piped border, the age as a lit number candle, an edible photo print) with the
// name poured on in sprinkles; blow the candle out and the page goes down the cut side, layer by
// layer, every heading poured in sprinkles, the photos pressed into the buttercream, the reply on
// the board. Strawberry, chocolate or vanilla: frosting, sponge, fillings and drip follow.
export const sprinklesTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "sprinkles",
  label: "Sprinkles",
  archetype: "modern-minimal",
  previewThumbnailUrl: "/event-templates/cards/sprinkles.webp?v=2",
  cardImage: "/event-templates/cards/sprinkles.webp?v=2",
  component: SprinklesTemplate,
  defaultSettings,
  tier: "premium",
  entourage: false,
  demoContent: sprinklesDemo,
  uses: ["dateVenue", "schedule", "gallery", "registry", "faqs"],
  // the first photo is the edible print on top of the cake; the next four are pressed into the
  // buttercream layer
  galleryLimit: 5,
  hideable: [
    { key: "schedule", label: "The party (date and plan)" },
    { key: "venue", label: "Where" },
    { key: "gallery", label: "Photos (in the buttercream layer)" },
    { key: "dress", label: "What to wear" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    {
      key: "frosting",
      label: "The cake",
      hint: "The frosting is the page; the sprinkles make the headings.",
      options: [
        { value: "", label: "From your palette (strawberry by default)" },
        { value: "strawberry", label: "Strawberry, rainbow sprinkles" },
        { value: "chocolate", label: "Chocolate, pastel sprinkles" },
        { value: "vanilla", label: "Vanilla, gold and white" },
      ],
    },
    { key: "names", label: "The name, in sprinkles", hint: "Leave empty to use the first name on your event.", placeholder: "Mia", maxLength: 24 },
    { key: "milestone", label: "The age", hint: "The number candle on the cake, and “turns 7” under the name.", placeholder: "7", maxLength: 3 },
    { key: "ageLine", label: "Line under the name", hint: "Leave empty for “turns 7” (from the age).", placeholder: "turns 7", maxLength: 24 },
    { key: "heroLine", label: "Small line above the name", placeholder: "You’re invited", maxLength: 40 },
    { key: "cueLabel", label: "Prompt at the foot of the first screen", hint: "Leave empty for “Blow out the candle” (or “The details” without an age).", maxLength: 24 },
    { key: "partyTitle", label: "The party: heading", section: "schedule", placeholder: "The party", maxLength: 24 },
    { key: "whereTitle", label: "Where: heading", section: "venue", placeholder: "Where", maxLength: 24 },
    { key: "whereNote", label: "A note about getting there", section: "venue", placeholder: "Parking is free in the lot behind the building.", multiline: true, maxLength: 160 },
    { key: "photosTitle", label: "Photos: heading", section: "gallery", hint: "Your first photo is the print on top of the cake; the next four are here.", placeholder: "Photos", maxLength: 24 },
    { key: "wearTitle", label: "What to wear: heading", section: "dress", placeholder: "What to wear", maxLength: 24 },
    { key: "dressCode", label: "What to wear", section: "dress", placeholder: "Party clothes you can play in. Something pink if you have it.", multiline: true, maxLength: 200 },
    { key: "giftsTitle", label: "Gifts: heading", section: "registry", placeholder: "Gifts", maxLength: 24 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your company is the only gift needed.", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "faqsTitle", label: "Good to know: heading", section: "faqs", placeholder: "Good to know", maxLength: 24 },
    { key: "rsvpTitle", label: "RSVP: heading", section: "rsvp", placeholder: "Reply", maxLength: 24 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", hint: "Shown after a guest says yes.", placeholder: "See you at the party.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", placeholder: "What a party it was.", maxLength: 160 },
  ],
};
