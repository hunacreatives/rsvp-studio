import type { EventContent } from "../../../content/types";
import RsvpForm from "../../shared/RsvpForm";
import { HeartDoodle } from "../Ornament";
import { hostNames } from "../content";

interface Props {
  content: EventContent;
  editorPreview?: boolean;
}

/**
 * The shared RSVP form in Cinematic's always-visible glass card. Fields and
 * labels use the plain body font (not the script face) so every guest can read them.
 */
export default function RsvpSection({ content, editorPreview = false }: Props) {
  const names = hostNames(content);

  return (
    <section className="cn-rsvp" id="rsvp">
      <div className="cn-rsvp__fade" />
      <div className="cn-rsvp__inner">
        <div className="cn-rsvp__card">
          <p className="cn-script cn-script--lg">Kindly RSVP</p>

          <div style={{ marginTop: 18 }}>
            <RsvpForm
              content={content}
              editorPreview={editorPreview}
              skin={{
                font: "var(--cn-body-plain)",
                ink: "var(--cn-ink)",
                muted: "var(--cn-muted)",
                gap: 12,
                field: { className: "cn-field", style: { marginTop: 0, fontFamily: "var(--cn-body-plain)" } },
                button: { className: "cn-submit", style: { marginTop: 4, fontFamily: "var(--cn-body-plain)" } },
                choice: (on) => ({
                  className: "cn-field",
                  style: {
                    marginTop: 0,
                    fontFamily: "var(--cn-body-plain)",
                    background: on ? "var(--cn-ink)" : undefined,
                    color: on ? "#fff" : undefined,
                    borderColor: on ? "var(--cn-ink)" : undefined,
                  },
                }),
                success: { style: { textAlign: "center" } },
              }}
            />
          </div>
        </div>

        {names ? (
          <div className="cn-signature">
            <HeartDoodle size={18} color="#C9A0A0" filled />
            <p className="cn-script cn-script--lg" style={{ marginTop: 8 }}>
              With love,
              <br />
              {names}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
