import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import BotanicalTemplate from "./BotanicalTemplate";

// Burgundy/cream + script display font by default, matching the
// reference invitation — but still just BaseTemplateSettings underneath,
// so a couple can swap to any curated palette/pairing like any template.
const defaultSettings: BaseTemplateSettings = {
  paletteId: "burgundy-cream",
  fontPairingId: "dancing-cormorant",
  sectionVisibility: { ...defaultSectionVisibility },
};

export const botanicalTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "botanical",
  label: "Botanical",
  archetype: "botanical",
  previewThumbnailUrl: "/event-templates/botanical/thumbnail.jpg",
  component: BotanicalTemplate,
  defaultSettings,
  tier: "premium",
};
