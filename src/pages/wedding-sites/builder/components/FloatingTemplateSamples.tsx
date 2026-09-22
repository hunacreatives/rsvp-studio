import { listTemplateDefinitions } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { palettes } from "../../presentation/palettes";
import { fontPairings } from "../../presentation/fontPairings";
import type { BaseTemplateSettings } from "../../presentation/types";
import TemplateMockupPreview from "./TemplateMockupPreview";

interface FloatingCardSpec {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotate: number;
  width: number;
  delay: string;
}

// Purely decorative, in its own dedicated strip BELOW the hero text on
// the "Build Your Website" landing page (not overlapping it) — real
// template previews (same TemplateMockupPreview used in the actual
// gallery, so it's honest, not fake marketing art), just cycled through
// different curated palette/font combos so it doesn't look like the same
// card four times even while only one template archetype is registered
// yet. Hidden on small screens.
const CARD_SPECS: FloatingCardSpec[] = [
  { top: "8%", left: "6%", rotate: -7, width: 190, delay: "0s" },
  { top: "28%", left: "30%", rotate: 5, width: 170, delay: "0.4s" },
  { top: "14%", right: "28%", rotate: -5, width: 180, delay: "0.8s" },
  { top: "32%", right: "6%", rotate: 7, width: 160, delay: "1.2s" },
];

export default function FloatingTemplateSamples() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const templates = listTemplateDefinitions();
  if (templates.length === 0) return null;

  const looks: BaseTemplateSettings[] = CARD_SPECS.map((_, index) => {
    const base = templates[index % templates.length].defaultSettings;
    return {
      ...base,
      paletteId: palettes[index % palettes.length].id,
      fontPairingId: fontPairings[index % fontPairings.length].id,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden="true" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes floating-sample-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      {CARD_SPECS.map((spec, index) => {
        const template = templates[index % templates.length];
        return (
          // Outer div: absolute position only (no rotation, no
          // animation) — a stable anchor point. Middle div: static
          // rotation. Inner div: the bob animation, translateY only.
          // Splitting these avoids fighting over one element's single
          // `transform` between rotate and translate.
          <div key={index} style={{ position: "absolute", top: spec.top, bottom: spec.bottom, left: spec.left, right: spec.right }}>
            <div style={{ transform: `rotate(${spec.rotate}deg)` }}>
              <div
                style={{
                  width: spec.width,
                  aspectRatio: "4 / 3",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 20px 40px -12px rgba(0,7,39,0.25)",
                  border: "1px solid var(--line)",
                  animation: prefersReducedMotion
                    ? undefined
                    : `floating-sample-bob 6s ease-in-out ${spec.delay} infinite`,
                }}
              >
                <TemplateMockupPreview template={{ ...template, defaultSettings: looks[index] }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
