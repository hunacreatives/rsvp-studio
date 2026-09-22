import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import ScrapbookTemplate from "./ScrapbookTemplate";
import { scrapbookDemoWedding } from "../../content/fixtures/scrapbook-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "maroon-linen",
  fontPairingId: "dancing-inter",
  sectionVisibility: { ...defaultSectionVisibility },
};

export const scrapbookTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "scrapbook",
  label: "Scrapbook",
  archetype: "scrapbook",
  previewThumbnailUrl: "/event-templates/scrapbook/thumbnail.jpg",
  component: ScrapbookTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: scrapbookDemoWedding,
};
