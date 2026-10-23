import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import CinematicTemplate from "./CinematicTemplate";
import { cinematicDemoBirthday } from "../../content/fixtures/cinematic-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "blush-sage",
  fontPairingId: "homemade-caveat",
  sectionVisibility: { ...defaultSectionVisibility },
};

// In Bloom (id "cinematic", kept so existing sites stay on it). The hero is built from the
// real "gel-at-30" site; below it, a garden party on cream paper (the evening, what to wear,
// a polaroid wall, gifts, good to know, the RSVP) with watercolor blooms opening at the edges.
export const cinematicTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "cinematic",
  label: "In Bloom",
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cinematic/thumbnail.jpg",
  cardImage: "/event-templates/cards/cinematic.webp",
  component: CinematicTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: cinematicDemoBirthday,
  uses: ["story", "dateVenue", "schedule", "gallery", "registry", "faqs"],
  // Two polaroids in the hero, then up to six on the wall.
  galleryLimit: 8,
  hideable: [
    { key: "schedule", label: "The evening (schedule)" },
    { key: "dress", label: "What to wear" },
    { key: "gallery", label: "Photos" },
    { key: "entourage", label: "Entourage" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  storyLabel: "Invitation message",
  storyHint: "Shown under the photos, e.g. “Join me for an intimate dinner as we celebrate this milestone together!” Press Enter for a new line.",
  customFields: [
    {
      key: "headline",
      label: "Headline",
      hint: "The big opening line. Press Enter where it should break. Leave empty to use your name.",
      placeholder: "Gel is\nturning thirty!",
      multiline: true,
      maxLength: 60,
    },
    {
      key: "dressCode",
      label: "Dress code",
      hint: "Shown under What to wear, with your motif colours (Entourage & motif) as petals.",
      section: "dress",
      placeholder: "Think soft pastels, garden florals, or anything that feels like a warm spring afternoon ✿",
      multiline: true,
      maxLength: 200,
    },
    { key: "eveningTitle", label: "Schedule heading", section: "schedule", placeholder: "The evening", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP card heading", placeholder: "Will You Join Us?", maxLength: 40 },
    { key: "rsvpNote", label: "RSVP card note", placeholder: "I would love to celebrate with you!", maxLength: 80 },
    { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest RSVPs.", placeholder: "See you on my special day!", maxLength: 80 },
  ],
};
