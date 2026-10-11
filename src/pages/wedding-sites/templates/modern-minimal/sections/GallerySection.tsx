import { mutedText } from "../../../engine/theme";
import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface GallerySectionProps {
  content: EventContent;
  theme: EventTheme;
}

// Deliberately ignores `layoutHint` — a strict, uniform square grid is
// the whole point of this archetype. Editorial/Botanical use layoutHint
// to vary composition; Modern Minimal treats every photo identically on
// purpose. This is exactly the archetype-stress-test finding this schema
// was designed to survive: a field a template is free to ignore entirely.
export default function GallerySection({ content, theme }: GallerySectionProps) {
  const items = content.galleries.flatMap((g) => g.items).sort((a, b) => a.order - b.order);
  if (items.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "64px 32px" }}>
      <div style={{ width: "100%", maxWidth: 880, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: theme.bodyFont,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 12,
            fontWeight: 700,
            color: mutedText(theme),
            margin: "0 0 24px",
          }}
        >
          Gallery
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(180px, 30%), 1fr))", gap: 2 }}>
          {items.map((item) => (
            <div key={item.id} style={{ aspectRatio: "1 / 1", overflow: "hidden" }}>
              <img
                loading="lazy"
                decoding="async"
                src={item.image.masterUrl}
                alt={item.image.alt}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: `${item.image.focalPoint.x * 100}% ${item.image.focalPoint.y * 100}%`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
