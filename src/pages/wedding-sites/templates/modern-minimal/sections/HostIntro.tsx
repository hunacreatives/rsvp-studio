import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface HostIntroProps {
  content: EventContent;
  theme: EventTheme;
}

// Modern Minimal ignores decorative framing entirely for the wedding
// party — a plain bordered grid of name/role rows, no portrait circles,
// no ornament. Story text sits left-aligned in a narrow measure rather
// than centered, matching the archetype's left-aligned grid identity.
export default function HostIntro({ content, theme }: HostIntroProps) {
  const paragraphs = content.story ? content.story.split("\n\n").filter(Boolean) : [];
  if (paragraphs.length === 0 && content.keyPeople.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "64px 32px" }}>
      <div style={{ width: "min(880px, 92vw)", margin: "0 auto" }}>
        {paragraphs.length > 0 ? (
          <div style={{ maxWidth: 560 }}>
            <p
              style={{
                fontFamily: theme.bodyFont,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: 11,
                fontWeight: 700,
                color: theme.muted,
                margin: "0 0 16px",
              }}
            >
              Our Story
            </p>
            {paragraphs.map((p, i) => (
              <p
                key={i}
                style={{ fontFamily: theme.bodyFont, fontSize: 16, lineHeight: 1.7, color: theme.ink, marginBottom: 14 }}
              >
                {p}
              </p>
            ))}
          </div>
        ) : null}

        {content.keyPeople.length > 0 ? (
          <div style={{ marginTop: paragraphs.length > 0 ? 48 : 0 }}>
            <p
              style={{
                fontFamily: theme.bodyFont,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: 11,
                fontWeight: 700,
                color: theme.muted,
                margin: "0 0 16px",
              }}
            >
              Key People
            </p>
            <div style={{ borderTop: `1px solid ${theme.muted}33` }}>
              {content.keyPeople.map((person) => (
                <div
                  key={person.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: `1px solid ${theme.muted}33`,
                  }}
                >
                  <span style={{ fontFamily: theme.bodyFont, fontWeight: 600, color: theme.ink }}>
                    {person.name}
                  </span>
                  {person.role ? (
                    <span style={{ fontFamily: theme.bodyFont, fontSize: 13, color: theme.muted }}>
                      {person.role}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
