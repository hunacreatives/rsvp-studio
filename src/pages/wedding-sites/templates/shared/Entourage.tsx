import type { CSSProperties } from "react";
import type { EventContent } from "../../content/types";

// The entourage (sponsors, 18 roses, godparents…) and motif colours (content.entourage,
// content.motifColors), in whichever design: each template passes its own fonts and colours.

export const hasEntourage = (c: EventContent) => (c.entourage ?? []).some((g) => g.people.length) || (c.motifColors ?? []).length > 0;

export function entourageTitle(c: EventContent) {
  return c.occasion === "wedding" || !c.occasion ? "The Entourage" : "Our Special Guests";
}

export default function EntourageBlock({
  content,
  ink,
  muted,
  displayFont,
  bodyFont,
  heading = true,
  headingStyle,
}: {
  content: EventContent;
  ink: string;
  muted: string;
  displayFont: string;
  bodyFont: string;
  heading?: boolean;
  headingStyle?: CSSProperties;
}) {
  const groups = (content.entourage ?? []).filter((g) => g.people.length);
  const colors = content.motifColors ?? [];
  if (!groups.length && !colors.length) return null;
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center", fontFamily: bodyFont, color: ink }}>
      {heading && groups.length ? (
        <h2 style={{ margin: "0 0 clamp(24px, 4vw, 40px)", fontFamily: displayFont, fontWeight: 400, fontSize: "clamp(28px, 4.5vw, 44px)", lineHeight: 1.15, ...headingStyle }}>{entourageTitle(content)}</h2>
      ) : null}
      {groups.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "clamp(22px, 3vw, 36px) clamp(16px, 3vw, 32px)" }}>
          {groups.map((g) => (
            <div key={g.id}>
              {g.title ? <p style={{ margin: "0 0 8px", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: muted }}>{g.title}</p> : null}
              {g.people.map((p, i) => (
                <p key={i} style={{ margin: "3px 0", fontSize: 16, lineHeight: 1.5 }}>
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {colors.length ? (
        <div style={{ marginTop: groups.length ? "clamp(32px, 5vw, 52px)" : 0 }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: muted }}>Motif</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {colors.map((c, i) => (
              <span key={i} aria-label={`Motif colour ${c}`} style={{ width: 38, height: 38, borderRadius: 19, background: c, boxShadow: "0 0 0 1px rgba(0,0,0,0.08), 0 4px 10px -6px rgba(0,0,0,0.3)" }} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
