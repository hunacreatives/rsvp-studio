import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import { LeafDivider } from "../Ornament";

interface ScheduleSectionProps {
  content: EventContent;
  theme: EventTheme;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// A single center-line vertical timeline with dot markers — the defining
// structural choice lifted from the reference invitation's day-of order
// of events. Genuinely different from Modern Minimal's modular card grid:
// this is a narrative sequence, not interchangeable tiles.
export default function ScheduleSection({ content, theme }: ScheduleSectionProps) {
  if (content.schedule.length === 0) return null;

  return (
    <section style={{ background: `${theme.ink}06`, padding: "72px 24px" }}>
      <div style={{ width: "min(520px, 92vw)", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontFamily: theme.displayFont, fontSize: 30, color: theme.ink, margin: 0 }}>
          Order of Events
        </p>
        <LeafDivider color={theme.ink} />

        <div style={{ position: "relative", textAlign: "left", paddingLeft: 4 }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 5,
              top: 6,
              bottom: 6,
              width: 1,
              background: `${theme.ink}33`,
            }}
          />
          {content.schedule.map((item) => (
            <div key={item.id} style={{ position: "relative", paddingLeft: 32, paddingBottom: 32 }}>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 4,
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: theme.background,
                  border: `2px solid ${theme.ink}`,
                }}
              />
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.muted,
                  margin: "0 0 4px",
                }}
              >
                {formatTime(item.startTime)}
                {item.endTime ? ` – ${formatTime(item.endTime)}` : ""}
              </p>
              <p style={{ fontFamily: theme.displayFont, fontSize: 24, color: theme.ink, margin: 0 }}>
                {item.label}
              </p>
              {item.description ? (
                <p style={{ fontFamily: theme.bodyFont, fontSize: 14, color: theme.muted, margin: "6px 0 0", lineHeight: 1.6 }}>
                  {item.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
