import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import { LeafDivider } from "../Ornament";

interface HostIntroProps {
  content: EventContent;
  theme: EventTheme;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Centered prose with a decorative opening quote mark, plus key people
// shown as monogram medallions (a photo if one exists, an initials
// roundel otherwise) rather than Modern Minimal's plain name/role rows.
export default function HostIntro({ content, theme }: HostIntroProps) {
  const paragraphs = content.story ? content.story.split("\n\n").filter(Boolean) : [];
  if (paragraphs.length === 0 && content.keyPeople.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "min(600px, 92vw)", margin: "0 auto" }}>
        {paragraphs.length > 0 ? (
          <>
            <p
              style={{
                fontFamily: theme.displayFont,
                fontSize: 48,
                lineHeight: 1,
                color: theme.ink,
                opacity: 0.5,
                margin: 0,
              }}
            >
              &ldquo;
            </p>
            {paragraphs.map((p, i) => (
              <p
                key={i}
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: 19,
                  lineHeight: 1.8,
                  color: theme.ink,
                  marginBottom: 14,
                  fontStyle: "italic",
                }}
              >
                {p}
              </p>
            ))}
          </>
        ) : null}

        {content.keyPeople.length > 0 ? (
          <div style={{ marginTop: paragraphs.length > 0 ? 48 : 0 }}>
            <LeafDivider color={theme.ink} />
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 28 }}>
              {content.keyPeople.map((person) => (
                <div key={person.id} style={{ width: 120 }}>
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: "50%",
                      margin: "0 auto 10px",
                      overflow: "hidden",
                      border: `1px solid ${theme.ink}33`,
                      background: `${theme.ink}0d`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {person.photo ? (
                      <img
                        src={person.photo.masterUrl}
                        alt={person.photo.alt}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontFamily: theme.displayFont, fontSize: 24, color: theme.ink }}>
                        {initials(person.name)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: theme.bodyFont, fontWeight: 600, color: theme.ink, margin: 0, fontSize: 14 }}>
                    {person.name}
                  </p>
                  {person.role ? (
                    <p style={{ fontFamily: theme.bodyFont, fontSize: 12, color: theme.muted, margin: "2px 0 0" }}>
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
