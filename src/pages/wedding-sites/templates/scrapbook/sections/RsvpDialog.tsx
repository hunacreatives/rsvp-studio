import { useEffect } from "react";
import type { EventContent } from "../../../content/types";
import RsvpForm from "../../shared/RsvpForm";
import { Flourish } from "../components";

interface Props {
  content: EventContent;
  editorPreview?: boolean;
  onClose: () => void;
}

/**
 * The shared RSVP form on a stationery panel instead of a large permanent
 * form, so the published page keeps the collage composition intact.
 */
export default function RsvpDialog({ content, editorPreview, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sb-dialog" role="dialog" aria-modal="true" aria-label="RSVP" onClick={onClose}>
      <div className="sb-dialog__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sb-dialog__close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <p className="sb-script sb-script--md">Kindly Respond</p>
          <Flourish />
        </div>

        <RsvpForm
          content={content}
          editorPreview={editorPreview}
          skin={{
            font: "var(--sb-body)",
            ink: "var(--sb-ink)",
            muted: "rgba(0,0,0,.6)",
            gap: 12,
            field: { className: "sb-field", style: { marginTop: 0 } },
            button: { className: "sb-submit", style: { marginTop: 4, fontSize: 14 } },
            choice: (on) => ({
              className: "sb-field",
              style: { marginTop: 0, background: on ? "var(--sb-ink)" : undefined, color: on ? "var(--sb-cream, #f6f1e6)" : undefined },
            }),
            success: { style: { textAlign: "center" } },
          }}
        />
      </div>
    </div>
  );
}
