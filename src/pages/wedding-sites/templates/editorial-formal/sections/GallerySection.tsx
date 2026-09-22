import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface GallerySectionProps {
  content: EventContent;
  theme: EventTheme;
}

// Renders every gallery's items in an ordered grid. `layoutHint` (if
// present) widens or heightens a tile — templates are free to use or
// ignore it; this one uses it to vary the grid rhythm slightly, without
// depending on it being present at all.
export default function GallerySection({ content, theme }: GallerySectionProps) {
  const galleries = content.galleries.filter((g) => g.items.length > 0);
  if (galleries.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "64px 24px" }}>
      <div style={{ width: "min(880px, 94vw)", margin: "0 auto" }}>
        {galleries.map((gallery) => (
          <div key={gallery.id} style={{ marginBottom: 48 }}>
            {gallery.title ? (
              <h2
                style={{
                  fontFamily: theme.displayFont,
                  fontSize: "clamp(1.5rem, 4vw, 2rem)",
                  color: theme.ink,
                  textAlign: "center",
                  marginBottom: 32,
                }}
              >
                {gallery.title}
              </h2>
            ) : null}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridAutoRows: 200,
                gap: 12,
              }}
            >
              {[...gallery.items]
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <figure
                    key={item.id}
                    style={{
                      margin: 0,
                      position: "relative",
                      gridColumn: item.layoutHint === "wide" ? "span 2" : "span 1",
                      gridRow: item.layoutHint === "portrait" ? "span 2" : "span 1",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
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
                    {item.caption ? (
                      <figcaption
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: "8px 12px",
                          background: "rgba(0,0,0,0.45)",
                          color: "#fff",
                          fontFamily: theme.bodyFont,
                          fontSize: 12,
                        }}
                      >
                        {item.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
