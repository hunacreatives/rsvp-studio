import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import PickleballTemplate from "./PickleballTemplate";
import { pickleballDemoBirthday } from "../../content/fixtures/pickleball-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "court-pink",
  fontPairingId: "yellowtail-jost",
  sectionVisibility: { ...defaultSectionVisibility },
};

// Designed in code (no source file), in two pages: the invitation card
// (painted stripes, a wavy court-green frame, crossed paddles, a retro script
// headline, watercolour stickers) and, behind "RSVP here", the details page
// (the plan, what to wear, what to bring, gifts, FAQs, RSVP). Its own wording
// lives in the fields below.
export const pickleballTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "pickleball",
  label: "Pickleball",
  archetype: "editorial",
  previewThumbnailUrl: "/event-templates/pickleball/thumbnail.jpg",
  component: PickleballTemplate,
  defaultSettings,
  tier: "free",
  demoContent: pickleballDemoBirthday,
  // Wide enough that the whole invitation card (frame, paddles, button) fits the gallery card.
  galleryWidth: 1500,
  uses: ["story", "dateVenue", "schedule", "gallery", "registry", "faqs"],
  // Three snapshots on the details page.
  galleryLimit: 3,
  storyLabel: "Invitation message",
  storyHint: "Shown under “Let’s Rally”, e.g. “Grab your paddle and your best trash talk…”. Leave a blank line between paragraphs.",
  hideable: [
    { key: "gallery", label: "Photos" },
    { key: "hostIntro", label: "Let’s Rally (your message)" },
    { key: "schedule", label: "Game Plan (schedule)" },
    { key: "wear", label: "What to Wear" },
    { key: "bring", label: "What to Bring" },
    { key: "registry", label: "Gift Ideas" },
    { key: "faqs", label: "Good to Know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "kicker", label: "Small line above the headline", placeholder: "Join us for", maxLength: 24 },
    {
      key: "headline",
      label: "Headline",
      hint: "The big script line. Press Enter where it should break.",
      placeholder: "Dinks &\nDrinks",
      multiline: true,
      maxLength: 40,
    },
    { key: "introButton", label: "Button on the card", hint: "Opens the details and RSVP page.", placeholder: "RSVP here", maxLength: 22 },
    { key: "archText", label: "Curved line on the details page", placeholder: "Let’s hit the court", maxLength: 24 },
    { key: "occasionLine", label: "Line above your name", hint: "Leave empty to use your occasion.", placeholder: "to celebrate the 30th birthday of", maxLength: 60 },
    {
      key: "dressCode",
      label: "What to wear",
      hint: "Your motif colours (Entourage & motif) show as swatches under it.",
      section: "wear",
      placeholder: "Court whites, or anything pink and green.",
      multiline: true,
      maxLength: 200,
    },
    {
      key: "bring",
      label: "What to bring",
      hint: "One thing per line.",
      section: "bring",
      placeholder: "Your paddle (we have spares)\nCourt shoes\nA water bottle",
      multiline: true,
      maxLength: 400,
    },
    { key: "rsvpTitle", label: "RSVP heading", placeholder: "Are You In?", maxLength: 30 },
    { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest says yes.", placeholder: "Game on! See you on the court.", maxLength: 80 },
    { key: "afterParty", label: "After the event", hint: "Replaces the RSVP the day after your event.", placeholder: "Thank you for celebrating with me.", maxLength: 160 },
  ],
};
