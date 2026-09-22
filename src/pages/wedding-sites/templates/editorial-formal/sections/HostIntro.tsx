import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface HostIntroProps {
  content: EventContent;
  theme: EventTheme;
}

export default function HostIntro({ content, theme }: HostIntroProps) {
  const paragraphs = content.story ? content.story.split("\n\n").filter(Boolean) : [];

  if (paragraphs.length === 0 && content.keyPeople.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "64px 24px" }}>
      <div style={{ width: "min(640px, 92vw)", margin: "0 auto", textAlign: "center" }}>
        {paragraphs.length > 0 ? (
          <>
            <h2
              style={{
                fontFamily: theme.displayFont,
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                color: theme.ink,
                marginBottom: 24,
              }}
            >
              Our Story
            </h2>
            {paragraphs.map((paragraph, index) => (
              <p
                key={index}
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: 17,
                  lineHeight: 1.8,
                  color: theme.ink,
                  marginBottom: 16,
                }}
              >
                {paragraph}
              </p>
            ))}
          </>
        ) : null}

        {content.keyPeople.length > 0 ? (
          <div style={{ marginTop: 56 }}>
            <h3
              style={{
                fontFamily: theme.bodyFont,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: 13,
                fontWeight: 700,
                color: theme.muted,
                marginBottom: 24,
              }}
            >
              Special People
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 24,
              }}
            >
              {content.keyPeople.map((person) => (
                <div key={person.id}>
                  {person.photo ? (
                    <img
                      src={person.photo.masterUrl}
                      alt={person.photo.alt}
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: "50%",
                        objectFit: "cover",
                        objectPosition: `${person.photo.focalPoint.x * 100}% ${person.photo.focalPoint.y * 100}%`,
                        margin: "0 auto 12px",
                      }}
                    />
                  ) : null}
                  <p style={{ fontFamily: theme.bodyFont, fontWeight: 600, color: theme.ink, margin: 0 }}>
                    {person.name}
                  </p>
                  {person.role ? (
                    <p style={{ fontFamily: theme.bodyFont, fontSize: 13, color: theme.muted, margin: "2px 0 0" }}>
                      {person.role}
                    </p>
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
