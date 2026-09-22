import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import { LeafDivider } from "../Ornament";

interface GallerySectionProps {
  content: EventContent;
  theme: EventTheme;
}

// Unlike Modern Minimal, this archetype actually USES `layoutHint`: a
// "wide" item spans two grid columns, "portrait" spans two rows, and
// "standard" is a single cell — a loose masonry rather than a uniform
// grid, matching the varied photo sizing in the reference collage.
function spanFor(hint: string | undefined): { gridColumn: string; gridRow: string } {
  if (hint === "wide") return { gridColumn: "span 2", gridRow: "span 1" };
  if (hint === "portrait") return { gridColumn: "span 1", gridRow: "span 2" };
  return { gridColumn: "span 1", gridRow: "span 1" };
}

export default function GallerySection({ content, theme }: GallerySectionProps) {
  const items = content.galleries.flatMap((g) => g.items).sort((a, b) => a.order - b.order);
  if (items.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "min(920px, 92vw)", margin: "0 auto" }}>
        <p style={{ fontFamily: theme.displayFont, fontSize: 30, color: theme.ink, margin: 0 }}>Gallery</p>
        <LeafDivider color={theme.ink} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridAutoRows: 140,
            gap: 10,
          }}
        >
          {items.map((item) => (
            <div key={item.id} style={{ ...spanFor(item.layoutHint), overflow: "hidden", borderRadius: 4 }}>
              <img
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
