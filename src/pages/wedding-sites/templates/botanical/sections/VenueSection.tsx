import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import { LeafDivider } from "../Ornament";

interface VenueSectionProps {
  content: EventContent;
  theme: EventTheme;
}

// Each place renders as a scalloped-edge card — the moody, framed-card
// motif borrowed from the secondary reference (a formal ceremony card
// with a scalloped border), reproduced here with a repeating radial
// gradient rather than an image asset so it stays theme-colored.
function scallopEdge(color: string) {
  return `radial-gradient(circle at 10px 10px, transparent 9px, ${color} 9.5px) -10px -10px / 20px 20px repeat-x`;
}

interface CardProps {
  theme: EventTheme;
  eyebrow: string;
  title: string;
  subtitle?: string;
  linkLabel?: string;
  linkHref?: string;
}

function ScallopCard({ theme, eyebrow, title, subtitle, linkLabel, linkHref }: CardProps) {
  return (
    <div style={{ position: "relative", paddingTop: 10 }}>
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: scallopEdge(theme.background) }} />
      <div style={{ background: `${theme.ink}08`, padding: "22px 22px 26px" }}>
        <p
          style={{
            fontFamily: theme.bodyFont,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontSize: 11,
            fontWeight: 600,
            color: theme.muted,
            margin: "0 0 8px",
          }}
        >
          {eyebrow}
        </p>
        <p style={{ fontFamily: theme.displayFont, fontSize: 22, color: theme.ink, margin: 0 }}>{title}</p>
        {subtitle ? (
          <p style={{ fontFamily: theme.bodyFont, fontSize: 13, color: theme.muted, margin: "6px 0 0", lineHeight: 1.6 }}>
            {subtitle}
          </p>
        ) : null}
        {linkHref ? (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: theme.bodyFont, fontSize: 12, fontWeight: 600, color: theme.ink, marginTop: 10, display: "inline-block" }}
          >
            {linkLabel ?? "View"} &rarr;
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function VenueSection({ content, theme }: VenueSectionProps) {
  const hasAccommodations = content.accommodations.length > 0;
  const hasTravel = content.travelInformation.length > 0;
  if (!hasAccommodations && !hasTravel) return null;

  return (
    <section style={{ background: theme.background, padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "min(880px, 92vw)", margin: "0 auto" }}>
        <p style={{ fontFamily: theme.displayFont, fontSize: 30, color: theme.ink, margin: 0 }}>
          Travel &amp; Accommodations
        </p>
        <LeafDivider color={theme.ink} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, textAlign: "left" }}>
          {hasAccommodations
            ? content.accommodations.map((place) => (
                <ScallopCard
                  key={place.id}
                  theme={theme}
                  eyebrow="Where to Stay"
                  title={place.name}
                  subtitle={place.addressLine}
                  linkLabel="Book"
                  linkHref={place.bookingUrl}
                />
              ))
            : null}
          {hasTravel
            ? content.travelInformation.map((info) => (
                <ScallopCard key={info.id} theme={theme} eyebrow="Getting There" title={info.title} subtitle={info.body} />
              ))
            : null}
        </div>
      </div>
    </section>
  );
}
