import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { defaultPaletteId } from "../../presentation/palettes";
import { defaultFontPairingId } from "../../presentation/fontPairings";
import ModernMinimalTemplate from "./ModernMinimalTemplate";
import { isabellaAndMateo } from "../../content/fixtures/isabella-and-mateo";
import { MM_SECTIONS } from "./sections";

// No template-specific settings extension needed — Modern Minimal's
// entire identity is "no extra knobs," so BaseTemplateSettings alone is
// the honest contract here (unlike editorial-formal's heroTreatment).
const defaultSettings: BaseTemplateSettings = {
  paletteId: defaultPaletteId,
  fontPairingId: defaultFontPairingId,
  sectionVisibility: { ...defaultSectionVisibility },
};

export const modernMinimalTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "modern-minimal",
  label: "Modern Minimal",
  archetype: "modern-minimal",
  previewThumbnailUrl: "/event-templates/modern-minimal/thumbnail.jpg",
  cardImage: "/event-templates/cards/modern-minimal.webp",
  component: ModernMinimalTemplate,
  defaultSettings,
  // Sections that can be moved on the page.
  sections: MM_SECTIONS,
  // Sections that can be switched off, in page order.
  hideable: [
    { key: "hostIntro", label: "Your story" },
    { key: "schedule", label: "Schedule" },
    { key: "venue", label: "Venue" },
    { key: "accommodations", label: "Where to stay" },
    { key: "travelInformation", label: "Getting there" },
    { key: "entourage", label: "Entourage" },
    { key: "gallery", label: "Photos" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "FAQs" },
    { key: "rsvp", label: "RSVP form" },
  ],
  tier: "free",
  // Sample couple for the /build gallery and preview page.
  demoContent: isabellaAndMateo,
};
