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

export const cinematicTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "cinematic",
  label: "Cinematic",
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cinematic/thumbnail.jpg",
  component: CinematicTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: cinematicDemoBirthday,
};
