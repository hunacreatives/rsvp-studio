import { fontPairings } from "../presentation/fontPairings";
import { palettes } from "../presentation/palettes";
import type { BaseTemplateSettings } from "../presentation/types";

// Shared across templates on purpose — this is data resolution, not
// visual/JSX code, so it doesn't conflict with "templates own their own
// visuals" (see docs/template-builder-decisions.md). It started as a
// template-local helper duplicated in editorial-formal; once two more
// templates needed the exact same lookup, that duplication was the
// signal the research called out to actually extract it (AHA
// programming: wait for a second/third real case, then share).
//
// Convention: palette swatches[0] = background, swatches[1] = ink/primary
// accent, swatches[2] = muted/secondary text.

export interface EventTheme {
  background: string;
  ink: string;
  muted: string;
  displayFont: string;
  bodyFont: string;
}

export function resolveEventTheme(settings: BaseTemplateSettings): EventTheme {
  const palette = palettes.find((p) => p.id === settings.paletteId) ?? palettes[0];
  const pairing = fontPairings.find((f) => f.id === settings.fontPairingId) ?? fontPairings[0];

  return {
    background: palette.swatches[0] ?? "#fffff9",
    ink: palette.swatches[1] ?? "#000727",
    muted: palette.swatches[2] ?? "#868697",
    displayFont: pairing.displayFont,
    bodyFont: pairing.bodyFont,
  };
}
