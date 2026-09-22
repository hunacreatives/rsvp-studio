import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface ScheduleSectionProps {
  content: EventContent;
  theme: EventTheme;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Modular bordered CARDS in a grid, not a narrative timeline — the
// archetype's defining structural choice (see the research doc's
// "modular event cards" descriptor for this archetype).
export default function ScheduleSection({ content, theme }: ScheduleSectionProps) {
  if (content.schedule.length === 0) return null;

  return (
    <section style={{ background: `${theme.muted}0a`, padding: "64px 32px" }}>
      <div style={{ width: "min(880px, 92vw)", margin: "0 auto" }}>
        <p
          style={{
            fontFamily: theme.bodyFont,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 11,
            fontWeight: 700,
            color: theme.muted,
            margin: "0 0 24px",
          }}
        >
          Schedule
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 1, background: `${theme.muted}33` }}>
          {content.schedule.map((item) => (
            <div key={item.id} style={{ background: theme.background, padding: 24 }}>
              <p style={{ fontFamily: theme.bodyFont, fontSize: 13, fontWeight: 600, color: theme.muted, margin: 0 }}>
                {formatTime(item.startTime)}
                {item.endTime ? ` – ${formatTime(item.endTime)}` : ""}
              </p>
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  fontWeight: 700,
                  fontSize: 18,
                  color: theme.ink,
                  margin: "8px 0 0",
                }}
              >
                {item.label}
              </p>
              {item.description ? (
                <p style={{ fontFamily: theme.bodyFont, fontSize: 13, color: theme.muted, margin: "6px 0 0" }}>
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
