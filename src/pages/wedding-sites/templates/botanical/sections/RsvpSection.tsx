import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import RsvpForm from "../../shared/RsvpForm";
import { LeafDivider } from "../Ornament";

interface RsvpSectionProps {
  content: EventContent;
  theme: EventTheme;
  editorPreview?: boolean;
}

// The shared RSVP form in Botanical's look: pill-shaped fields and button,
// matching this archetype's soft, rounded ornamental feel.
export default function RsvpSection({ content, theme, editorPreview }: RsvpSectionProps) {
  const field = {
    fontFamily: theme.bodyFont,
    padding: "13px 20px",
    borderRadius: 999,
    border: `1px solid ${theme.ink}33`,
    background: theme.background,
    color: theme.ink,
  };
  return (
    <section id="rsvp" style={{ background: `${theme.ink}06`, padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "min(420px, 92vw)", margin: "0 auto" }}>
        <p style={{ fontFamily: theme.displayFont, fontSize: 30, color: theme.ink, margin: 0 }}>Kindly Respond</p>
        <LeafDivider color={theme.ink} />
        <RsvpForm
          content={content}
          editorPreview={editorPreview}
          skin={{
            font: theme.bodyFont,
            ink: theme.ink,
            muted: theme.muted,
            gap: 12,
            field: { style: field },
            textarea: { style: { ...field, borderRadius: 18 } },
            button: { style: { fontFamily: theme.bodyFont, background: theme.ink, color: theme.background, borderRadius: 999, padding: "13px 20px", fontWeight: 600, letterSpacing: "0.04em", border: "none" } },
            choice: (on) => ({ style: { ...field, background: on ? theme.ink : theme.background, color: on ? theme.background : theme.ink } }),
            success: { style: { textAlign: "center", fontStyle: "italic" } },
          }}
        />
      </div>
    </section>
  );
}
