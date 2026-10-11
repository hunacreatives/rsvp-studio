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

// Built from the real "gel-at-30" site. Only what that design shows is
// editable: names, the invitation message, date & venue, two photos, plus
// its own headline, dress code and RSVP card wording.
export const cinematicTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "cinematic",
  label: "Cinematic",
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cinematic/thumbnail.jpg",
  component: CinematicTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: cinematicDemoBirthday,
  uses: ["story", "dateVenue", "gallery"],
  galleryLimit: 2,
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
      hint: "Shown above the RSVP button. Leave empty to hide it.",
      placeholder: "Think soft pastels, garden florals, or anything that feels like a warm spring afternoon ✿",
      multiline: true,
      maxLength: 200,
    },
    { key: "rsvpTitle", label: "RSVP card heading", placeholder: "Will You Join Us?", maxLength: 40 },
    { key: "rsvpNote", label: "RSVP card note", placeholder: "I would love to celebrate with you!", maxLength: 80 },
    { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest RSVPs.", placeholder: "See you on my special day!", maxLength: 80 },
  ],
};
