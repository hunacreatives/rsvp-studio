import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { EventContent } from "@/pages/wedding-sites/content/types";
import { defaultSectionVisibility } from "@/pages/wedding-sites/presentation/types";
import SpecTemplate from "@/pages/wedding-sites/spec/runtime/SpecTemplate";
import type { TemplateSpec } from "@/pages/wedding-sites/spec/schema";
import type { Detection } from "./detect";
import { renderSvg, type SvgAnalysis } from "./svg";
import type { SvgBuild } from "./svgImport";

// DEV ONLY. Lets the fidelity harness (scripts/fidelity/run.mjs) drive the
// Import page: render the imported template at the design's exact width,
// render the original for comparison, and read out what the importer made.
// Never runs in production builds (import.meta.env.DEV guard).

interface HookInput {
  spec: TemplateSpec | null;
  content: EventContent | null;
  det: Detection | null;
  svgA: SvgAnalysis | null;
  build: SvgBuild | null;
  sources: Record<string, { canvas: string; x: number; y: number; w: number; h: number }>;
  score: unknown;
  notes: string[];
  /** Two-version designs: the phone version's analysis, build and text positions. */
  phone?: { a: SvgAnalysis; build: SvgBuild; sources: Record<string, { canvas: string; x: number; y: number; w: number; h: number }> } | null;
}

declare global {
  interface Window {
    __fidelity?: {
      ready: boolean;
      info: () => unknown;
      reference: (width: number, which?: "phone") => Promise<string>;
      mount: (width: number, opts?: { full?: boolean; content?: EventContent; which?: "phone" }) => Promise<number>;
      unmount: () => void;
    };
  }
}

export function useFidelityHook(input: HookInput) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const { spec, content, det, svgA, build } = input;
    if (!spec || !content || !det) {
      delete window.__fidelity;
      return;
    }
    const drawn = spec.sections.filter((s) => s.kind === "canvas" || s.kind === "layout");
    const canvases = drawn.filter((s) => s.screen !== "phone");
    const phoneCanvases = drawn.filter((s) => s.screen === "phone");
    const { phone } = input;
    const first = canvases[0];
    const designWidth = !first ? 600 : first.kind === "layout" ? first.designWidth : first.kind === "canvas" ? first.maxWidth : 600;
    let root: Root | null = null;
    let host: HTMLDivElement | null = null;

    window.__fidelity = {
      ready: true,
      info: () => ({
        designWidth,
        mode: svgA ? "svg" : "images",
        sections: canvases.map((s, i) => ({
          id: s.id,
          visibilityKey: s.visibilityKey ?? null,
          y0: build?.bands[i]?.y0 ?? 0,
          y1: build?.bands[i]?.y1 ?? 1,
        })),
        sources: input.sources,
        photos: build?.photos.map((p) => ({ slot: p.slot, cx: p.cx, cy: p.cy, rw: p.rw, rh: p.rh, rotate: p.rotate })) ?? [],
        score: input.score,
        notes: input.notes,
        textLayers: canvases.reduce((n, s) => n + (s.kind === "canvas" ? s.layers.filter((l) => l.type === "text").length : 0), 0),
        phone:
          phone && phoneCanvases.length
            ? {
                designWidth: phone.a.width,
                sections: phoneCanvases.map((s, i) => ({ id: s.id, visibilityKey: s.visibilityKey ?? null, y0: phone.build.bands[i]?.y0 ?? 0, y1: phone.build.bands[i]?.y1 ?? 1 })),
                sources: phone.sources,
                photos: phone.build.photos.map((p) => ({ slot: p.slot, cx: p.cx, cy: p.cy, rw: p.rw, rh: p.rh, rotate: p.rotate })),
              }
            : null,
      }),
      // The original, rendered by the same browser engine as the template.
      reference: async (width: number, which?: "phone") => {
        if (which === "phone" && phone) return (await renderSvg(phone.a.tagged, width)).toDataURL("image/png");
        if (svgA) return (await renderSvg(svgA.tagged, width)).toDataURL("image/png");
        return det.designUrl;
      },
      // The template at an exact width, edge to edge (canvas sections only
      // unless `full`), in a fresh overlay at the top of the page.
      mount: async (width: number, opts = {}) => {
        root?.unmount();
        host?.remove();
        host = document.createElement("div");
        host.id = "fidelity-root";
        host.style.cssText = `position:absolute;left:0;top:0;width:${width}px;z-index:99999;background:#fff`;
        document.body.appendChild(host);
        const only = opts.which === "phone" ? phoneCanvases : canvases;
        const shown: TemplateSpec = opts.full
          ? spec
          : { ...spec, sections: only.map((s) => (s.kind === "canvas" ? { ...s, padding: "none" as const, maxWidth: Math.max(s.maxWidth, width) } : s)) };
        root = createRoot(host);
        root.render(
          <SpecTemplate
            spec={shown}
            content={opts.content ?? content}
            settings={{ paletteId: spec.tokens.defaultPaletteId, fontPairingId: "", sectionVisibility: { ...defaultSectionVisibility } }}
          />,
        );
        await new Promise((r) => setTimeout(r, 300));
        await document.fonts.ready;
        // Lazy images below the fold never load off-screen: don't wait forever.
        for (const img of Array.from(host.querySelectorAll("img"))) img.loading = "eager";
        await Promise.race([
          Promise.all(Array.from(host.querySelectorAll("img")).map((img) => (img.complete ? null : img.decode().catch(() => null)))),
          new Promise((r) => setTimeout(r, 4000)),
        ]);
        await new Promise((r) => setTimeout(r, 800));
        return host.getBoundingClientRect().height;
      },
      unmount: () => {
        root?.unmount();
        host?.remove();
        root = null;
        host = null;
      },
    };
    return () => {
      root?.unmount();
      host?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.spec, input.content, input.det, input.svgA, input.build, input.sources, input.score, input.phone]);
}
