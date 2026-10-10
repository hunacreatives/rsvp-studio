import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import RsvpForm from "../../shared/RsvpForm";

interface RsvpSectionProps {
  content: EventContent;
  theme: EventTheme;
  editorPreview?: boolean;
}

// The shared RSVP form in Modern Minimal's look: square, hairline-bordered
// fields and an uppercase block button.
export default function RsvpSection({ content, theme, editorPreview }: RsvpSectionProps) {
  const field = {
    fontFamily: theme.bodyFont,
    padding: "12px 14px",
    border: `1px solid ${theme.muted}55`,
    background: theme.background,
    color: theme.ink,
    borderRadius: 0,
  };
  return (
    <section id="rsvp" style={{ background: `${theme.muted}0a`, padding: "64px 32px" }}>
      <div style={{ width: "min(440px, 92vw)", margin: "0 auto" }}>
        <p
          style={{
            fontFamily: theme.bodyFont,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 12,
            fontWeight: 700,
            color: theme.muted,
            margin: "0 0 20px",
          }}
        >
          RSVP
        </p>
        <RsvpForm
          content={content}
          editorPreview={editorPreview}
          skin={{
            font: theme.bodyFont,
            ink: theme.ink,
            muted: theme.muted,
            gap: 12,
            field: { style: field },
            button: { style: { fontFamily: theme.bodyFont, background: theme.ink, color: theme.background, padding: "12px 20px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", border: "none", borderRadius: 0 } },
            choice: (on) => ({ style: { ...field, background: on ? theme.ink : theme.background, color: on ? theme.background : theme.ink, borderColor: on ? theme.ink : `${theme.muted}55` } }),
          }}
        />
      </div>
    </section>
  );
}
