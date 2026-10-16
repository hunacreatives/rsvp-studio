import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import PromenadeTemplate from "./PromenadeTemplate";
import { promenadeDemo } from "../../content/fixtures/promenade-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "cream-gold",
  fontPairingId: "vibes-montserrat",
  sectionVisibility: { ...defaultSectionVisibility },
};

// A sealed white envelope opening onto a full-screen hero, then countdown, story
// timeline, pictures, program, dress code, venue, stay, gifts, FAQs and RSVP.
// Watercolours come from the studio's designers (see art.tsx; ?brief=1 is their brief).
export const promenadeTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "promenade",
  label: "Promenade",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/promenade/thumbnail.jpg",
  component: PromenadeTemplate,
  defaultSettings,
  tier: "free",
  demoContent: promenadeDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "accommodations", "registry", "faqs"],
  galleryLimit: 8,
  storyLabel: "Our story",
  storyHint: "One paragraph per moment. Start a paragraph with a line like “2021 · How We Met” to show it on the timeline with its year.",
  hideable: [
    { key: "countdown", label: "Countdown" },
    { key: "hostIntro", label: "Our Story" },
    { key: "gallery", label: "Pictures" },
    { key: "schedule", label: "Program" },
    { key: "dress", label: "Dress Code" },
    { key: "venue", label: "Venue" },
    { key: "accommodations", label: "Accommodations" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "FAQs" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "sealText", label: "On the wax seal", hint: "Leave empty to use your initials, like A & D.", placeholder: "A & D", maxLength: 7 },
    { key: "skipText", label: "Button on the envelope", placeholder: "Skip intro", maxLength: 20 },
    { key: "heroKicker", label: "Line above your names", placeholder: "We are getting married", maxLength: 40 },
    { key: "heroLine", label: "Line under your names", placeholder: "Join us to celebrate our special day", maxLength: 60 },
    { key: "countdownLine", label: "Countdown line", hint: "Leave empty to say “We are excited to celebrate our wedding on (date).”", maxLength: 90 },
    { key: "picturesLine", label: "Line above your photos", placeholder: "A few moments from our journey together", maxLength: 60 },
    {
      key: "dressCode",
      label: "Dress code",
      hint: "Your motif colours (Entourage & motif) show as swatches under it.",
      placeholder: "Formal. Gentlemen in dark suits, ladies in floor-length gowns.",
      multiline: true,
      maxLength: 240,
      section: "dress",
    },
    { key: "stayLine", label: "Line above the hotels", placeholder: "We’ve gathered a few places nearby for our guests.", maxLength: 90 },
    { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest says yes.", placeholder: "We’re looking forward to seeing you.", maxLength: 90 },
    { key: "afterParty", label: "After the wedding", hint: "Replaces the RSVP the day after.", placeholder: "Thank you for celebrating with us.", maxLength: 160 },
  ],
};
