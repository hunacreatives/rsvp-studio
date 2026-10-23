import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { defaultPaletteId } from "../../presentation/palettes";
import EditorialFormalTemplate from "./EditorialFormalTemplate";
import { isabellaAndMateo } from "../../content/fixtures/isabella-and-mateo";
import { EF_SECTIONS } from "./sections";

// This template's own settings extension. Curated and closed on purpose —
// see docs/template-builder-decisions.md and the customization-boundary
// research: `heroTreatment` is a small, finite set of designer-approved
// variants, never an open-ended layout prop.
export interface EditorialFormalSettings extends BaseTemplateSettings {
  heroTreatment: "centered-numeral" | "left-aligned-eyebrow";
}

const defaultSettings: EditorialFormalSettings = {
  paletteId: defaultPaletteId,
  // Cormorant Garamond for the names and headings: the formal-stationery look.
  fontPairingId: "cormorant-work-sans",
  sectionVisibility: { ...defaultSectionVisibility },
  // The words beside the arched photo on wider screens (stacked on phones).
  heroTreatment: "left-aligned-eyebrow",
};

export const editorialFormalTemplateDefinition: TemplateDefinition<EditorialFormalSettings> = {
  id: "editorial-formal",
  label: "Editorial Formal",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/editorial-formal/thumbnail.jpg",
  cardImage: "/event-templates/cards/editorial-formal.webp",
  component: EditorialFormalTemplate,
  defaultSettings,
  // Sections that can be moved on the page.
  sections: EF_SECTIONS,
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
