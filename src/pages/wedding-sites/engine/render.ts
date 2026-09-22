import type { BaseTemplateSettings, PresentationState } from "../presentation/types";
import { defaultSectionVisibility } from "../presentation/types";
import { defaultPaletteId } from "../presentation/palettes";
import { defaultFontPairingId } from "../presentation/fontPairings";
import { getTemplateDefinition, type TemplateDefinition } from "./registry";

export interface ResolvedTemplate {
  definition: TemplateDefinition;
  settings: BaseTemplateSettings;
}

/**
 * Resolves a PresentationState's active template into its definition and
 * the settings to actually render it with. If the active template has no
 * `byTemplate` entry yet (first time it's been selected), fall back to
 * its own `defaultSettings` rather than throwing — the caller is
 * responsible for persisting that default once the couple makes a change
 * (see Decision 2 / Decision 6 in the decision log: `byTemplate` entries
 * are created lazily, never eagerly).
 */
export function resolveTemplate(presentation: PresentationState): ResolvedTemplate | undefined {
  const definition = getTemplateDefinition(presentation.activeTemplateId);
  if (!definition) return undefined;

  const settings = presentation.byTemplate[definition.id] ?? definition.defaultSettings;
  return { definition, settings };
}

/** A safe, fully-defaulted BaseTemplateSettings for use before a couple
 *  has made any customization choices at all. */
export function defaultBaseTemplateSettings(): BaseTemplateSettings {
  return {
    paletteId: defaultPaletteId,
    fontPairingId: defaultFontPairingId,
    sectionVisibility: { ...defaultSectionVisibility },
  };
}
