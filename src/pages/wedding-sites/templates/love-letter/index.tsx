import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import LoveLetterTemplate from "./LoveLetterTemplate";
import { loveLetterDemo } from "../../content/fixtures/love-letter-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "olive-cream",
  fontPairingId: "pinyon-cormorant",
  sectionVisibility: { ...defaultSectionVisibility },
};

// Designed in code (no source file), in two pages: an olive felt envelope with a
// lace ribbon and an ivory monogram seal ("A love letter from…"), and behind it
// the invitation on cream (the open envelope with a photo, name card and date
// card, where and when, a countdown, the details and a reply card).
export const loveLetterTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "love-letter",
  label: "Love Letter",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/love-letter/thumbnail.jpg",
  component: LoveLetterTemplate,
  defaultSettings,
  tier: "free",
  demoContent: loveLetterDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "accommodations", "travel", "registry", "faqs"],
  galleryLimit: 2,
  storyLabel: "Your story",
  storyHint: "Shown under “Our Story”. Leave a blank line between paragraphs.",
  hideable: [
    { key: "countdown", label: "Countdown" },
    { key: "hostIntro", label: "Our Story" },
    { key: "schedule", label: "The Day (schedule)" },
    { key: "dress", label: "What to Wear" },
    { key: "entourage", label: "Entourage" },
    { key: "travelInformation", label: "Getting There" },
    { key: "accommodations", label: "Where to Stay" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to Know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "introLine", label: "Line on the envelope", placeholder: "A love letter from", maxLength: 40 },
    { key: "sealText", label: "On the wax seal", hint: "Leave empty to use your initials, like L & M.", placeholder: "L & M", maxLength: 7 },
    { key: "openText", label: "Under the seal", placeholder: "Open the invitation", maxLength: 30 },
    { key: "meetLine", label: "Line above the place", placeholder: "Meet us in", maxLength: 30 },
    { key: "placeLine", label: "The place, in script", hint: "Leave empty to use your venue’s address.", placeholder: "Tagaytay, Cavite", maxLength: 40 },
    { key: "note", label: "Small note under the time", placeholder: "Formal invitation to follow", maxLength: 60 },
    { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
    {
      key: "dressCode",
      label: "What to wear",
      hint: "Your motif colours (Entourage & motif) show as swatches under it.",
      placeholder: "Garden formal, in soft neutrals and greens.",
      multiline: true,
      maxLength: 200,
      section: "dress",
    },
    { key: "closing", label: "Closing line", placeholder: "We look forward to celebrating together", maxLength: 60 },
    { key: "rsvpTitle", label: "RSVP heading", placeholder: "Kindly Reply", maxLength: 30 },
    { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest accepts.", placeholder: "Thank you. We can’t wait to celebrate with you.", maxLength: 90 },
    { key: "afterParty", label: "After the wedding", hint: "Replaces the RSVP the day after.", placeholder: "Thank you for celebrating with us.", maxLength: 160 },
  ],
};
