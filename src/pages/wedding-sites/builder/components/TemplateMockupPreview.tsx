import { resolveEventTheme } from "../../engine/theme";
import type { TemplateDefinition } from "../../engine/registry";

interface TemplateMockupPreviewProps {
  template: TemplateDefinition;
}

const navLabels = ["Story", "Schedule", "Gallery", "RSVP"];

// A small, live-styled static preview built from the template's REAL
// default theme (colors + fonts) — not a screenshot (no asset pipeline
// exists yet for that) and not a broken-image placeholder either.
//
// Branches on `archetype` rather than rendering one identical layout for
// every template: with three structurally distinct archetypes now
// registered (centered/animated, left-grid/hairline, centered/ornamental)
// a single shared mockup made them all look the same in the gallery
// except for color, which misrepresented Modern Minimal and Botanical.
// Swappable for a real screenshot later via previewThumbnailUrl with
// zero data-model change.
// Card canvas is ~4:3; the real template is laid out at desktop width
// and scaled down into it, so the card shows the actual design.
const DEMO_WIDTH = 1100;

export default function TemplateMockupPreview({ template }: TemplateMockupPreviewProps) {
  const theme = resolveEventTheme(template.defaultSettings);

  // A template that ships demo content previews as its REAL self —
  // scaled, clipped to the top of the page, non-interactive. Templates
  // without demo content keep the schematic mockup below.
  if (template.demoContent) {
    const Component = template.component;
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", background: theme.background }}>
        <div
          aria-hidden
          style={{
            width: DEMO_WIDTH,
            transform: "scale(0.29)",
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        >
          <Component content={template.demoContent} settings={template.defaultSettings} />
        </div>
      </div>
    );
  }

  if (template.archetype === "modern-minimal") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: theme.background,
          display: "flex",
          flexDirection: "column",
          padding: "10% 8%",
          borderTop: `3px solid ${theme.ink}`,
        }}
      >
        <div style={{ display: "flex", gap: "6%", marginBottom: "auto", paddingTop: "6%", borderBottom: `1px solid ${theme.muted}55`, paddingBottom: "6%" }}>
          {navLabels.map((label) => (
            <span key={label} style={{ fontFamily: theme.bodyFont, fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted }}>
              {label}
            </span>
          ))}
        </div>
        <div style={{ marginTop: "auto", textAlign: "left" }}>
          <p style={{ fontFamily: theme.bodyFont, fontWeight: 700, fontSize: "clamp(16px, 11%, 28px)", color: theme.ink, margin: 0, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            Alex + Jordan
          </p>
          <p style={{ fontFamily: theme.bodyFont, fontSize: "9px", color: theme.muted, margin: "6% 0 0" }}>Saturday, June 4, 2027</p>
          <div style={{ display: "inline-block", marginTop: "8%", padding: "4% 10%", border: `1px solid ${theme.ink}`, fontFamily: theme.bodyFont, fontSize: "8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.ink }}>
            RSVP
          </div>
        </div>
      </div>
    );
  }

  if (template.archetype === "botanical") {
    // Mirrors the real Hero (see templates/botanical/sections/Hero.tsx):
    // the SAME single background asset (invitation-card.webp, produced by
    // scripts/design-import — real text removed via inpainting, not a
    // placeholder shape), not a separately-drawn CSS card.
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: theme.background,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", width: "82%", aspectRatio: "900 / 1863" }}>
          <img
            src="/event-templates/botanical/invitation-card.webp"
            alt=""
            aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: "34%",
              left: "9%",
              right: "9%",
              textAlign: "center",
            }}
          >
            <p style={{ fontFamily: theme.displayFont, fontWeight: 600, fontSize: "clamp(11px, 9%, 20px)", color: theme.background, margin: 0, lineHeight: 1.1 }}>
              Alex &amp; Jordan
            </p>
            <p style={{ fontFamily: theme.bodyFont, fontSize: "6px", color: theme.background, opacity: 0.85, margin: "4% 0 0" }}>
              Saturday, June 4, 2027
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (template.archetype === "scrapbook") {
    // Mirrors the real Hero: full-bleed maroon block with a script name
    // line, not a centered card — matches this archetype's genuinely
    // full-width structural identity (see templates/scrapbook/).
    return (
      <div style={{ width: "100%", height: "100%", background: theme.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "8% 8%", position: "relative" }}>
        <p style={{ fontFamily: theme.bodyFont, textTransform: "uppercase", letterSpacing: "0.16em", fontSize: "6px", color: theme.background, opacity: 0.85, margin: "0 0 4%" }}>
          A Special Note From
        </p>
        <p style={{ fontFamily: theme.displayFont, fontSize: "clamp(15px, 13%, 27px)", color: theme.background, margin: 0, lineHeight: 1.05 }}>
          Alex and Jordan
        </p>

        {/* the hero's defining device: a Polaroid overlapping the script */}
        <div
          style={{
            width: "34%",
            aspectRatio: "7/5",
            background: "#f4efe3",
            padding: "3%",
            paddingBottom: "9%",
            marginTop: "-3%",
            transform: "rotate(-2.5deg)",
            boxShadow: "0 6px 14px rgba(0,0,0,.28)",
          }}
        >
          <div style={{ width: "100%", height: "100%", background: "rgba(60,45,35,.22)" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "-14%", padding: "0 2%" }}>
          <span style={{ fontFamily: theme.bodyFont, fontSize: "5.5px", letterSpacing: "0.08em", textTransform: "uppercase", color: theme.background, borderBottom: `1px solid ${theme.background}` }}>Itinerary</span>
          <span style={{ fontFamily: theme.bodyFont, fontSize: "5.5px", letterSpacing: "0.08em", textTransform: "uppercase", color: theme.background, borderBottom: `1px solid ${theme.background}` }}>Details</span>
        </div>

        <p style={{ fontFamily: theme.bodyFont, fontSize: "6px", color: theme.background, opacity: 0.9, margin: "9% 0 0" }}>
          We&apos;re finally getting married &hellip;
        </p>
      </div>
    );
  }

  // editorial-formal / formal-stationery: centered, letter-spaced nav,
  // serif display name — this template's own real structural identity.
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: theme.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "10% 8%",
      }}
    >
      <div style={{ display: "flex", gap: "6%", marginBottom: "auto" }}>
        {navLabels.map((label) => (
          <span key={label} style={{ fontFamily: theme.bodyFont, fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: theme.muted }}>
            {label}
          </span>
        ))}
      </div>

      <div style={{ marginTop: "auto" }}>
        <p style={{ fontFamily: theme.displayFont, fontWeight: 700, fontSize: "clamp(18px, 13%, 32px)", color: theme.ink, margin: 0, lineHeight: 1.1 }}>
          Alex &amp; Jordan
        </p>
        <p style={{ fontFamily: theme.bodyFont, fontSize: "9px", color: theme.muted, margin: "6% 0 0" }}>
          Saturday, June 4, 2027
        </p>
        <div
          style={{
            display: "inline-block",
            marginTop: "8%",
            padding: "4% 10%",
            borderRadius: 999,
            border: `1px solid ${theme.ink}`,
            fontFamily: theme.bodyFont,
            fontSize: "8px",
            fontWeight: 600,
            color: theme.ink,
          }}
        >
          RSVP
        </div>
      </div>
    </div>
  );
}
