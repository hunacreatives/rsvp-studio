import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { defaultPaletteId } from "../../presentation/palettes";
import { defaultFontPairingId } from "../../presentation/fontPairings";
import ModernMinimalTemplate from "./ModernMinimalTemplate";

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
  component: ModernMinimalTemplate,
  defaultSettings,
  tier: "free",
};
