import { createContext, useContext, useEffect } from "react";
import { palettes as globalPalettes } from "../../presentation/palettes";
import type { BaseTemplateSettings } from "../../presentation/types";
import type { ColorToken, PaletteSpec, TemplateSpec } from "../schema";

// Resolved look of one spec template for one event: colours from the
// template's own palettes (or a platform palette when the template allows
// it), its fonts, and its corner style. Blocks and layers read this from
// context instead of each re-deriving it.

export interface SpecTheme {
  colors: Record<ColorToken, string>;
  displayFont: string;
  bodyFont: string;
  /** Corner radius for cards, inputs and buttons (px; 999 = pill). */
  radius: { card: number; control: number };
}

/** Map a 3-swatch platform palette onto the six spec colour tokens. */
function fromGlobal(swatches: string[]): PaletteSpec["colors"] {
  const [bg = "#fffff9", ink = "#000727", muted = "#868697"] = swatches;
  return { bg, surface: `${ink}0d`, ink, muted, accent: ink, onAccent: bg };
}

export function resolveSpecTheme(spec: TemplateSpec, settings?: Pick<BaseTemplateSettings, "paletteId">): SpecTheme {
  const own = spec.tokens.palettes.find((p) => p.id === settings?.paletteId);
  const global = spec.tokens.allowGlobalPalettes ? globalPalettes.find((p) => p.id === settings?.paletteId) : undefined;
  const colors =
    own?.colors ??
    (global ? fromGlobal(global.swatches) : undefined) ??
    spec.tokens.palettes.find((p) => p.id === spec.tokens.defaultPaletteId)!.colors;
  const { display, body } = spec.tokens.fonts;
  const radius =
    spec.tokens.radius === "none" ? { card: 0, control: 0 } : spec.tokens.radius === "round" ? { card: 22, control: 999 } : { card: 12, control: 10 };
  return {
    colors,
    displayFont: `"${display.family}", ${display.fallback}`,
    bodyFont: `"${body.family}", ${body.fallback}`,
    radius,
  };
}

export const SpecThemeContext = createContext<SpecTheme | null>(null);

export function useSpecTheme(): SpecTheme {
  const theme = useContext(SpecThemeContext);
  if (!theme) throw new Error("useSpecTheme must be used inside <SpecTemplate>");
  return theme;
}

/** Resolve a colour reference (token name or hex) against the theme. */
export function colorOf(theme: SpecTheme, ref: string): string {
  return ref in theme.colors ? theme.colors[ref as ColorToken] : ref;
}

/**
 * Load the template's Google Fonts once per family set. Templates bring
 * their own fonts, so nothing has to be added to index.html per design.
 */
export function useSpecFonts(spec: TemplateSpec) {
  const { display, body } = spec.tokens.fonts;
  const href = buildGoogleFontsHref([display, body]);
  useEffect(() => {
    if (!href || document.querySelector(`link[data-spec-fonts="${CSS.escape(href)}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.specFonts = href;
    document.head.appendChild(link);
  }, [href]);
}

export function buildGoogleFontsHref(fonts: { family: string; weights: number[]; italic: boolean }[]): string {
  const seen = new Set<string>();
  const families = fonts
    .filter((f) => (seen.has(f.family) ? false : (seen.add(f.family), true)))
    .map((f) => {
      const weights = [...new Set(f.weights)].sort((a, b) => a - b);
      const name = f.family.trim().replace(/\s+/g, "+");
      if (!weights.length) return `family=${name}`;
      return f.italic
        ? `family=${name}:ital,wght@${[...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)].join(";")}`
        : `family=${name}:wght@${weights.join(";")}`;
    });
  return families.length ? `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap` : "";
}
