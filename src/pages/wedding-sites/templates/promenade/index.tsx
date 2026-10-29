import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import PromenadeTemplate from "./PromenadeTemplate";
import { promenadeDemo } from "../../content/fixtures/promenade-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "cream-gold",
  fontPairingId: "cormorant-manrope",
  sectionVisibility: { ...defaultSectionVisibility },
};

// A formal estate garden seen from above, drawn live: the names on the gravel of the forecourt,
// the couple's initials clipped in box inside the gate, then one stop at each part of the garden
// down the long promenade (the parterre, the topiary lawn, the fountain, the rose garden, the lime
// walk) to the reply at the white pavilion at the end.
export const promenadeTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "promenade",
  label: "Promenade",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/cards/promenade.webp?v=4",
  cardImage: "/event-templates/cards/promenade.webp?v=4",
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
    { key: "names", label: "Your names, as they appear", hint: "Leave empty to use the names on your event.", placeholder: "Andrea & Diego", maxLength: 40 },
    { key: "heroKicker", label: "Line above your names", placeholder: "We are getting married", maxLength: 40 },
    { key: "heroLine", label: "Line under your names", placeholder: "Join us in the garden", maxLength: 60 },
    { key: "walkOn", label: "Prompt at the bottom of the first screen", placeholder: "Walk with us", maxLength: 24 },
    { key: "monogram", label: "Initials in the hedge", hint: "Clipped in box inside the gate. Leave empty to use your first initials.", placeholder: "A&D", maxLength: 5 },
    { key: "storyTitle", label: "Our story: heading", section: "hostIntro", placeholder: "Our story", maxLength: 30 },
    { key: "placeStory", label: "Our story: place in the garden", section: "hostIntro", placeholder: "The parterre", maxLength: 28 },
    { key: "picturesTitle", label: "Pictures: heading", section: "gallery", placeholder: "A few moments", maxLength: 30 },
    { key: "placePictures", label: "Pictures: place in the garden", section: "gallery", placeholder: "The topiary lawn", maxLength: 28 },
    { key: "dayTitle", label: "The day: heading", section: "schedule", placeholder: "The day", maxLength: 30 },
    { key: "placeDay", label: "The day: place in the garden", placeholder: "The fountain", maxLength: 28 },
    { key: "dressTitle", label: "Dress code: heading", section: "dress", placeholder: "What to wear", maxLength: 30 },
    { key: "placeDress", label: "Dress code: place in the garden", section: "dress", placeholder: "The rose garden", maxLength: 28 },
    {
      key: "dressCode",
      label: "Dress code",
      hint: "Your motif colours (Entourage & motif) show as swatches under it.",
      placeholder: "Formal. Gentlemen in dark suits, ladies in floor-length gowns.",
      multiline: true,
      maxLength: 240,
      section: "dress",
    },
    { key: "detailsTitle", label: "Good to know: heading", placeholder: "Good to know", maxLength: 30 },
    { key: "placeDetails", label: "Good to know: place in the garden", placeholder: "The lime walk", maxLength: 28 },
    { key: "stayTitle", label: "Where to stay: heading", section: "accommodations", placeholder: "Where to stay", maxLength: 30 },
    { key: "giftsTitle", label: "Gifts: heading", section: "registry", placeholder: "Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your presence is the greatest gift. Should you wish to give, here’s how.", multiline: true, maxLength: 220 },
    { key: "faqTitle", label: "Questions: heading", section: "faqs", placeholder: "Questions", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Will you join us?", maxLength: 40 },
    { key: "placeRsvp", label: "RSVP: place in the garden", section: "rsvp", placeholder: "The pavilion", maxLength: 28 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest says yes.", placeholder: "We’re looking forward to seeing you.", maxLength: 90 },
    { key: "afterParty", label: "After the wedding", hint: "Replaces the RSVP the day after.", placeholder: "Thank you for celebrating with us.", maxLength: 160 },
  ],
};
