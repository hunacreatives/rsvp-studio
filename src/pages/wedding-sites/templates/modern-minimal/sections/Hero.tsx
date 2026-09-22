import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface HeroProps {
  content: EventContent;
  theme: EventTheme;
}

function formatEventDate(iso: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/**
 * Deliberately static — no FLIP intro, no keyframes, no fade-in. Modern
 * Minimal's identity IS the absence of motion and ornament: a strict
 * left-aligned grid, a hairline rule, plain typography doing all the
 * work. This is a genuinely different structural choice from
 * editorial-formal's centered/animated hero, not a reskin of it.
 */
export default function Hero({ content, theme }: HeroProps) {
  const hostNames = content.hosts.map((h) => h.name).filter(Boolean).join(" + ");
  const formattedDate = formatEventDate(content.eventDate);
  const hasLocation = Boolean(content.primaryLocation.name || content.primaryLocation.addressLine);

  return (
    <section
      style={{
        width: "100%",
        background: theme.background,
        padding: "96px 32px 64px",
        borderBottom: `1px solid ${theme.muted}33`,
      }}
    >
      <div style={{ width: "min(880px, 92vw)", margin: "0 auto" }}>
        <p
          style={{
            fontFamily: theme.bodyFont,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: 12,
            fontWeight: 600,
            color: theme.muted,
            margin: "0 0 24px",
          }}
        >
          You&apos;re Invited
        </p>
        <h1
          style={{
            fontFamily: theme.bodyFont,
            fontWeight: 700,
            color: theme.ink,
            fontSize: "clamp(2.2rem, 7vw, 4.2rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {hostNames}
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 24,
            marginTop: 48,
            paddingTop: 24,
            borderTop: `1px solid ${theme.muted}33`,
          }}
        >
          {formattedDate ? (
            <div>
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontSize: 11,
                  fontWeight: 700,
                  color: theme.muted,
                  margin: "0 0 6px",
                }}
              >
                Date
              </p>
              <p style={{ fontFamily: theme.bodyFont, fontSize: 15, color: theme.ink, margin: 0 }}>
                {formattedDate}
              </p>
            </div>
          ) : null}
          {hasLocation ? (
            <div>
              <p
                style={{
                  fontFamily: theme.bodyFont,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontSize: 11,
                  fontWeight: 700,
                  color: theme.muted,
                  margin: "0 0 6px",
                }}
              >
                Venue
              </p>
              <p style={{ fontFamily: theme.bodyFont, fontSize: 15, color: theme.ink, margin: 0 }}>
                {content.primaryLocation.name}
                {content.primaryLocation.name && content.primaryLocation.addressLine ? " — " : ""}
                {content.primaryLocation.addressLine}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
