import { buildGoogleFontsHref } from "@/pages/wedding-sites/spec/runtime/theme";
import type { AiResult } from "./assemble";

// AI import, step 2b: measure each piece of text in the font the AI chose.
// Knowing exactly how wide "Isabella" is at 100px in Dancing Script turns
// the measured width on the design into an exact font size — far more
// precise than estimating from the text's height.

/** Ink size of each line at a 100px font size; null when the font didn't load. */
export type LineMetrics = { w: number; h: number }[] | null;

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

async function loadFonts(ai: AiResult) {
  const weights = (k: "display" | "body") => [...new Set([400, ...ai.layers.filter((l) => l.font === k).map((l) => l.weight)])];
  const href = buildGoogleFontsHref(
    (["display", "body"] as const).map((k) => ({
      family: ai.fonts[k].family,
      weights: weights(k),
      italic: ai.fonts[k].italic || ai.layers.some((l) => l.font === k && l.italic),
    })),
  );
  if (href && !document.querySelector(`link[data-spec-fonts="${CSS.escape(href)}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.specFonts = href;
    const loaded = new Promise<void>((r) => ((link.onload = () => r()), (link.onerror = () => r())));
    document.head.appendChild(link);
    await withTimeout(loaded, 6000);
  }
  await withTimeout(
    Promise.all(
      ai.layers.map((l) => document.fonts.load(`${l.italic ? "italic " : ""}${l.weight} 100px "${ai.fonts[l.font].family}"`, l.lines.join(" ") || "Ag")),
    ),
    6000,
  );
}

export async function measureLayers(ai: AiResult): Promise<LineMetrics[]> {
  await loadFonts(ai).catch(() => undefined);
  const ctx = document.createElement("canvas").getContext("2d")!;
  return ai.layers.map((l) => {
    const css = `${l.italic ? "italic " : ""}${l.weight} 100px "${ai.fonts[l.font].family}"`;
    if (!document.fonts.check(css)) return null;
    ctx.font = css;
    return l.lines.map((line) => {
      const text = l.uppercase ? line.toUpperCase() : line;
      const m = ctx.measureText(text);
      const spacing = (l.letterSpacing || 0) * 100 * Math.max(0, [...text].length - 1);
      return { w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight + spacing, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
    });
  });
}
