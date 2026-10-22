import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import ScrapbookTemplate from "./ScrapbookTemplate";
import { scrapbookDemoWedding } from "../../content/fixtures/scrapbook-demo";

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
  tier: "premium",
  demoContent: scrapbookDemoWedding,
};
