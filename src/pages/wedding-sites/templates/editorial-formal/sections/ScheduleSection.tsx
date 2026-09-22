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

export default function ScheduleSection({ content, theme }: ScheduleSectionProps) {
  if (content.schedule.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "64px 24px" }}>
      <div style={{ width: "min(560px, 92vw)", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: theme.displayFont,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            color: theme.ink,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          Schedule
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {content.schedule.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "96px 1fr",
                gap: 20,
                borderTop: `1px solid ${theme.muted}33`,
                paddingTop: 20,
              }}
            >
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  fontWeight: 600,
                  color: theme.ink,
                  fontSize: 14,
                  margin: 0,
                }}
              >
                {formatTime(item.startTime)}
                {item.endTime ? ` – ${formatTime(item.endTime)}` : ""}
              </p>
              <div>
                <p
                  style={{
                    fontFamily: theme.displayFont,
                    fontWeight: 700,
                    color: theme.ink,
                    fontSize: 18,
                    margin: 0,
                  }}
                >
                  {item.label}
                </p>
                {item.description ? (
                  <p
                    style={{
                      fontFamily: theme.bodyFont,
                      color: theme.muted,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  >
                    {item.description}
                  </p>
                ) : null}
                {item.location ? (
                  <p style={{ fontFamily: theme.bodyFont, color: theme.muted, fontSize: 14, marginTop: 4 }}>
                    {item.location.name}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
