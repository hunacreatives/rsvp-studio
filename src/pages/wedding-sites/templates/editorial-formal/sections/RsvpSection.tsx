import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import RsvpForm from "../../shared/RsvpForm";

interface RsvpSectionProps {
  content: EventContent;
  theme: EventTheme;
  editorPreview?: boolean;
}

// The shared RSVP form (templates/shared/RsvpForm.tsx) in this template's
// classic look: soft rounded fields, solid ink button.
export default function RsvpSection({ content, theme, editorPreview }: RsvpSectionProps) {
  const field = {
    fontFamily: theme.bodyFont,
    padding: "12px 16px",
    borderRadius: 8,
    border: `1px solid ${theme.muted}55`,
    background: "#fff",
    color: theme.ink,
  };
  return (
    <section id="rsvp" style={{ background: `${theme.muted}0d`, padding: "64px 24px" }}>
      <div style={{ width: "min(440px, 92vw)", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: theme.displayFont,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            color: theme.ink,
            margin: "0 0 24px",
            textAlign: "center",
          }}
        >
          RSVP
        </h2>
        <RsvpForm
          content={content}
          editorPreview={editorPreview}
          skin={{
            font: theme.bodyFont,
            ink: theme.ink,
            muted: theme.muted,
            field: { style: field },
            button: { style: { fontFamily: theme.bodyFont, background: theme.ink, color: theme.background, borderRadius: 999, padding: "12px 24px", fontWeight: 600, border: "none" } },
            choice: (on) => ({ style: { ...field, background: on ? theme.ink : "#fff", color: on ? theme.background : theme.ink, borderColor: on ? theme.ink : `${theme.muted}55` } }),
            success: { style: { textAlign: "center" } },
          }}
        />
      </div>
    </section>
  );
}
