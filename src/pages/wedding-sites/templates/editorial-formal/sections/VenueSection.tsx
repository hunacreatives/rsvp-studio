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
    <section style={{ background: `${theme.muted}0d`, padding: "64px 24px" }}>
      <div style={{ width: "min(640px, 92vw)", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: theme.displayFont,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            color: theme.ink,
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          Travel &amp; Accommodations
        </h2>

        {hasAccommodations ? (
          <div style={{ marginBottom: hasTravel ? 40 : 0 }}>
            <h3
              style={{
                fontFamily: theme.bodyFont,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: 13,
                fontWeight: 700,
                color: theme.muted,
                marginBottom: 16,
              }}
            >
              Where to Stay
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {content.accommodations.map((place) => (
                <div key={place.id}>
                  <p style={{ fontFamily: theme.bodyFont, fontWeight: 600, color: theme.ink, margin: 0 }}>
                    {place.name}
                  </p>
                  <p style={{ fontFamily: theme.bodyFont, color: theme.muted, fontSize: 14, margin: "2px 0 0" }}>
                    {place.addressLine}
                  </p>
                  {place.notes ? (
                    <p style={{ fontFamily: theme.bodyFont, color: theme.muted, fontSize: 13, margin: "4px 0 0" }}>
                      {place.notes}
                    </p>
                  ) : null}
                  {place.bookingUrl ? (
                    <a
                      href={place.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: theme.bodyFont, fontSize: 13, color: theme.ink, fontWeight: 600 }}
                    >
                      Book a room &rarr;
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {hasTravel ? (
          <div>
            <h3
              style={{
                fontFamily: theme.bodyFont,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontSize: 13,
                fontWeight: 700,
                color: theme.muted,
                marginBottom: 16,
              }}
            >
              Getting There
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {content.travelInformation.map((info) => (
                <div key={info.id}>
                  <p style={{ fontFamily: theme.bodyFont, fontWeight: 600, color: theme.ink, margin: 0 }}>
                    {info.title}
                  </p>
                  <p style={{ fontFamily: theme.bodyFont, color: theme.muted, fontSize: 14, margin: "4px 0 0", lineHeight: 1.6 }}>
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
