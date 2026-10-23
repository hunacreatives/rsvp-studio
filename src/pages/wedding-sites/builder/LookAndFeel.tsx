import type { CSSProperties } from "react";
import { getCatalogEntry, getTemplateDefinition } from "../engine/registry";
import { defaultBaseTemplateSettings } from "../engine/render";
import { fontPairings } from "../presentation/fontPairings";
import { loadPairingFonts } from "../presentation/loadFonts";
import { palettes } from "../presentation/palettes";
import type { BaseTemplateSettings, PresentationState } from "../presentation/types";
import { ImageUploadField } from "./components/ImageUploadField";
import Reposition from "./components/Reposition";
import "./builder.css";

// The Details panel's Style pages: cover photo, colours, fonts. Settings are saved per
// template (switching templates keeps each one's). Uploaded (spec) designs bring their own
// colours and fonts, so only the cover photo applies to them.

export type StylePart = "cover" | "colours" | "fonts";

/** What the Style tab's rows say: the current palette and fonts, and whether colours/fonts apply. */
export function styleSummary(presentation: PresentationState) {
  const id = presentation.activeTemplateId;
  const def = getTemplateDefinition(id);
  const settings = { ...defaultBaseTemplateSettings(), ...def?.defaultSettings, ...presentation.byTemplate[id] } as BaseTemplateSettings;
  return {
    own: getCatalogEntry(id)?.kind === "spec",
    cover: settings.heroImage?.masterUrl,
    palette: palettes.find((p) => p.id === settings.paletteId)?.label ?? "",
    fonts: fontPairings.find((f) => f.id === settings.fontPairingId)?.label ?? "",
  };
}

export default function LookAndFeel({
  part,
  presentation,
  onChange,
  eventId,
  loadFontPreviews = true,
}: {
  part: StylePart;
  presentation: PresentationState;
  onChange: (next: PresentationState) => void;
  eventId: string | undefined;
  /** False until the Fonts page opens: the "Aa" samples would download every pairing's fonts. */
  loadFontPreviews?: boolean;
}) {
  const id = presentation.activeTemplateId;
  const def = getTemplateDefinition(id);
  if (!def) return <p style={{ fontSize: 13, color: "var(--slate)" }}>Pick a template first.</p>;
  const settings: BaseTemplateSettings = { ...defaultBaseTemplateSettings(), ...def.defaultSettings, ...presentation.byTemplate[id] };
  const set = (patch: Partial<BaseTemplateSettings>) => onChange({ ...presentation, byTemplate: { ...presentation.byTemplate, [id]: { ...settings, ...patch } } });

  if (part === "cover")
    return (
      <div>
        {settings.heroImage?.masterUrl ? (
          <Reposition
            url={settings.heroImage.masterUrl}
            width={settings.heroImage.width}
            height={settings.heroImage.height}
            focus={settings.heroImage.focalPoint ?? { x: 0.5, y: 0.5 }}
            onChange={(focalPoint) => set({ heroImage: { ...settings.heroImage!, focalPoint } })}
            zoom={settings.heroImage.zoom ?? 1}
            onZoom={(zoom) => set({ heroImage: { ...settings.heroImage!, zoom } })}
            style={{ marginBottom: 12 }}
          />
        ) : (
          <p style={hint}>Shown at the top of your site. Leave it empty to keep the design’s own image, or drop a photo on the page.</p>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
          <ImageUploadField
            eventId={eventId}
            masterUrl=""
            replaceLabel={settings.heroImage?.masterUrl ? "Replace" : undefined}
            onUploaded={(u) => set({ heroImage: { ...(settings.heroImage ?? blankImage()), masterUrl: u.masterUrl, width: u.width, height: u.height, focalPoint: { x: 0.5, y: 0.5 }, zoom: 1 } })}
          />
          {settings.heroImage?.masterUrl ? (
            <button type="button" onClick={() => set({ heroImage: undefined })} style={linkBtn}>
              Use the design’s own image
            </button>
          ) : null}
        </div>
      </div>
    );

  if (part === "colours")
    return (
      <div>
        <p style={hint}>Pick a palette. Your fonts stay as they are.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "14px 8px", marginTop: 14 }}>
          {palettes.map((p) => {
            const on = settings.paletteId === p.id;
            return (
              <button key={p.id} type="button" onClick={() => set({ paletteId: p.id })} aria-pressed={on} style={{ display: "grid", gap: 6, padding: 0, border: 0, background: "none", cursor: "pointer", textAlign: "left", minWidth: 0 }}>
                <span style={{ display: "flex", height: 48, borderRadius: 8, overflow: "hidden", outline: on ? "2px solid var(--ink)" : "1px solid var(--line)", outlineOffset: on ? 2 : -1 }}>
                  {p.swatches.slice(0, 3).map((c, i) => (
                    <span key={`${c}${i}`} style={{ flex: 1, background: c }} />
                  ))}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)", lineHeight: 1.25 }}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );

  return (
    <div style={{ display: "grid", gap: 2 }}>
      {fontPairings.map((f) => {
        if (loadFontPreviews) loadPairingFonts(f.id);
        const on = settings.fontPairingId === f.id;
        return (
          <button
            key={f.id}
            type="button"
            className="dp-row"
            onClick={() => set({ fontPairingId: f.id })}
            aria-pressed={on}
            style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 52, padding: "0 10px", margin: "0 -10px", border: 0, borderRadius: 8, background: on ? "var(--paper)" : "transparent", cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ width: 36, fontFamily: f.displayFont, fontSize: 22, color: "var(--ink)" }}>Aa</span>
            <span style={{ flex: 1, fontFamily: f.bodyFont, fontSize: 14, color: "var(--ink)" }}>{f.label}</span>
            {on ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 12.5 4 4 8-9" />
              </svg>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const blankImage = () => ({ id: `cover-${Date.now()}`, masterUrl: "", width: 1600, height: 1000, alt: "", focalPoint: { x: 0.5, y: 0.5 }, createdAt: new Date().toISOString() });
const hint: CSSProperties = { fontSize: 13, lineHeight: 1.5, color: "var(--slate)", margin: 0 };
const linkBtn: CSSProperties = { border: "none", background: "none", padding: 0, fontSize: 13, color: "var(--slate)", textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" };
