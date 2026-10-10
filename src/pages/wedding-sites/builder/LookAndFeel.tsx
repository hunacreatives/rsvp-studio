import type { CSSProperties } from "react";
import { getCatalogEntry, getTemplateDefinition } from "../engine/registry";
import { defaultBaseTemplateSettings } from "../engine/render";
import { fontPairings } from "../presentation/fontPairings";
import { loadPairingFonts } from "../presentation/loadFonts";
import { palettes } from "../presentation/palettes";
import { defaultSectionVisibility, type BaseTemplateSettings, type PresentationState, type SectionVisibility } from "../presentation/types";
import { ImageUploadField } from "./components/ImageUploadField";

// "Look & feel" in the builder: cover photo, colours, fonts, and which sections
// show. Settings are saved per template (switching templates keeps each one's).
// Uploaded (spec) designs bring their own colours and fonts, so only the cover
// photo and sections apply to them.

const SECTIONS: { key: keyof SectionVisibility; label: string }[] = [
  { key: "hostIntro", label: "Your story" },
  { key: "schedule", label: "Schedule" },
  { key: "venue", label: "Venue" },
  { key: "gallery", label: "Photos" },
  { key: "accommodations", label: "Where to stay" },
  { key: "travelInformation", label: "Getting there" },
  { key: "registry", label: "Gifts" },
  { key: "faqs", label: "FAQs" },
  { key: "rsvp", label: "RSVP form" },
];

export default function LookAndFeel({
  presentation,
  onChange,
  eventId,
}: {
  presentation: PresentationState;
  onChange: (next: PresentationState) => void;
  eventId: string | undefined;
}) {
  const id = presentation.activeTemplateId;
  const def = getTemplateDefinition(id);
  if (!def) return <p style={{ fontSize: 13, color: "var(--slate)" }}>Pick a template first.</p>;
  const isSpec = getCatalogEntry(id)?.kind === "spec";
  const settings: BaseTemplateSettings = { ...defaultBaseTemplateSettings(), ...def.defaultSettings, ...presentation.byTemplate[id] };
  const visibility = { ...defaultSectionVisibility, ...settings.sectionVisibility };
  const set = (patch: Partial<BaseTemplateSettings>) => onChange({ ...presentation, byTemplate: { ...presentation.byTemplate, [id]: { ...settings, ...patch } } });

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div>
        <p style={label}>Cover photo</p>
        <ImageUploadField
          eventId={eventId}
          masterUrl={settings.heroImage?.masterUrl ?? ""}
          onUrlChange={(masterUrl) => set({ heroImage: masterUrl ? { ...(settings.heroImage ?? blankImage()), masterUrl } : undefined })}
          onUploaded={(u) => set({ heroImage: { ...(settings.heroImage ?? blankImage()), masterUrl: u.masterUrl, width: u.width, height: u.height } })}
        />
        {settings.heroImage?.masterUrl ? (
          <button type="button" onClick={() => set({ heroImage: undefined })} style={linkBtn}>
            Use the template’s own image
          </button>
        ) : (
          <p style={hint}>Shown at the top of your site. Leave empty to keep the template’s design.</p>
        )}
      </div>

      {!isSpec ? (
        <>
          <div>
            <p style={label}>Colours</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {palettes.map((p) => (
                <button key={p.id} type="button" onClick={() => set({ paletteId: p.id })} aria-pressed={settings.paletteId === p.id} style={choice(settings.paletteId === p.id)}>
                  <span style={{ display: "flex", gap: 3 }}>
                    {p.swatches.slice(0, 3).map((c) => (
                      <span key={c} style={{ width: 14, height: 14, borderRadius: 999, background: c, border: "1px solid rgba(0,0,0,.12)" }} />
                    ))}
                  </span>
                  <span style={{ fontSize: 12 }}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={label}>Fonts</p>
            <div style={{ display: "grid", gap: 8 }}>
              {fontPairings.map((f) => {
                loadPairingFonts(f.id);
                return (
                  <button key={f.id} type="button" onClick={() => set({ fontPairingId: f.id })} aria-pressed={settings.fontPairingId === f.id} style={{ ...choice(settings.fontPairingId === f.id), justifyContent: "space-between" }}>
                    <span style={{ fontFamily: f.displayFont, fontSize: 18 }}>Aa</span>
                    <span style={{ fontFamily: f.bodyFont, fontSize: 13 }}>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      <div>
        <p style={label}>Sections to show</p>
        <div style={{ display: "grid", gap: 6 }}>
          {SECTIONS.map((s) => (
            <label key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--ink)" }}>
              <input type="checkbox" checked={visibility[s.key]} onChange={(e) => set({ sectionVisibility: { ...visibility, [s.key]: e.target.checked } })} />
              {s.label}
              {s.key === "rsvp" && !visibility.rsvp ? <span style={{ fontSize: 12, color: "#8a5a00" }}>— guests won’t be able to reply</span> : null}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

const blankImage = () => ({ id: `cover-${Date.now()}`, masterUrl: "", width: 1600, height: 1000, alt: "", focalPoint: { x: 0.5, y: 0.5 }, createdAt: new Date().toISOString() });
const label: CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 8px" };
const hint: CSSProperties = { fontSize: 12, color: "var(--slate)", margin: "6px 0 0" };
const linkBtn: CSSProperties = { marginTop: 6, border: "none", background: "none", padding: 0, fontSize: 12, color: "var(--slate)", textDecoration: "underline", cursor: "pointer" };
const choice = (on: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  border: on ? "2px solid var(--ink)" : "1px solid var(--line)",
  background: "#fff",
  cursor: "pointer",
  textAlign: "left",
});
