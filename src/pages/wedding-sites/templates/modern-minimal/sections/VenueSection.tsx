import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface VenueSectionProps {
  content: EventContent;
  theme: EventTheme;
}

export default function VenueSection({ content, theme }: VenueSectionProps) {
  const hasAccommodations = content.accommodations.length > 0;
  const hasTravel = content.travelInformation.length > 0;
  if (!hasAccommodations && !hasTravel) return null;

  return (
    <section style={{ background: theme.background, padding: "64px 32px" }}>
      <div
        style={{
          width: "min(880px, 92vw)",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: hasAccommodations && hasTravel ? "1fr 1fr" : "1fr",
          gap: 48,
        }}
      >
        {hasAccommodations ? (
          <div>
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
              Where to Stay
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {content.accommodations.map((place) => (
                <div key={place.id} style={{ borderLeft: `2px solid ${theme.ink}`, paddingLeft: 14 }}>
                  <p style={{ fontFamily: theme.bodyFont, fontWeight: 600, color: theme.ink, margin: 0 }}>
                    {place.name}
                  </p>
                  <p style={{ fontFamily: theme.bodyFont, fontSize: 13, color: theme.muted, margin: "2px 0 0" }}>
                    {place.addressLine}
                  </p>
                  {place.bookingUrl ? (
                    <a
                      href={place.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: theme.bodyFont, fontSize: 12, fontWeight: 600, color: theme.ink }}
                    >
                      Book &rarr;
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {hasTravel ? (
          <div>
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
              Getting There
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {content.travelInformation.map((info) => (
                <div key={info.id} style={{ borderLeft: `2px solid ${theme.ink}`, paddingLeft: 14 }}>
                  <p style={{ fontFamily: theme.bodyFont, fontWeight: 600, color: theme.ink, margin: 0 }}>
                    {info.title}
                  </p>
                  <p style={{ fontFamily: theme.bodyFont, fontSize: 13, color: theme.muted, margin: "2px 0 0", lineHeight: 1.6 }}>
                    {info.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
