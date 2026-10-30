import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { scrapbookDemoWedding } from "../../content/fixtures/scrapbook-demo";
import { SB_SECTIONS } from "./sections";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const ScrapbookTemplate = lazyTemplate(() => import("./ScrapbookTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "maroon-linen",
  // Pinyon Script for the names and handwritten notes, Cormorant Garamond for the text.
  fontPairingId: "pinyon-cormorant",
  sectionVisibility: { ...defaultSectionVisibility },
};

export const scrapbookTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "scrapbook",
  label: "Scrapbook",
  archetype: "scrapbook",
  previewThumbnailUrl: "/event-templates/scrapbook/thumbnail.jpg",
  cardImage: "/event-templates/cards/scrapbook.webp",
  component: ScrapbookTemplate,
  defaultSettings,
  // Sections that can be moved on the page.
  sections: SB_SECTIONS,
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
  demoContent: scrapbookDemoWedding,
};
