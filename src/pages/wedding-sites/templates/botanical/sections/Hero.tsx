import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface HeroProps {
  content: EventContent;
  theme: EventTheme;
}

interface FormattedDate {
  day: string;
  month: string; // 3-letter uppercase, e.g. "DEC"
  year: string;
  time: string | null;
}

function formatEventDate(iso: string): FormattedDate | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const hasTime = iso.includes("T") && !(date.getHours() === 0 && date.getMinutes() === 0);
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    year: String(date.getFullYear()),
    time: hasTime ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null,
  };
}

/**
 * Rebuilt from the design-import tool's output (scripts/design-import),
 * not the original hand-cropped/color-keyed assets (wreath-crown.webp +
 * corner-bloom.webp, which had a visible hard-edge seam between them —
 * see docs/template-builder-decisions.md). `invitation-card.webp` is a
 * SINGLE inpainted background (real text removed, zero flower-color
 * loss) cropped to just the arch card; the surrounding cream +
 * order-of-events column from the source design were cropped away since
 * that half is wedding-specific baked icons — ScheduleSection already
 * covers that generically for any event type.
 *
 * Text is positioned inside a safe-zone box measured directly from the
 * design-import tool's extraction-report.json bounding boxes (top ~25%,
 * bottom ~26.5%, left ~9%, right ~9% of the card), not eyeballed.
 */
export default function Hero({ content, theme }: HeroProps) {
  const hosts = content.hosts.map((h) => h.name).filter(Boolean);
  const formattedDate = formatEventDate(content.eventDate);
  const hasLocation = Boolean(content.primaryLocation.name || content.primaryLocation.addressLine);

  return (
    <section style={{ width: "100%", background: theme.background, padding: "56px 24px 64px" }}>
      <div
        style={{
          width: "min(600px, 92vw)",
          margin: "0 auto",
          position: "relative",
          aspectRatio: "900 / 1863",
        }}
      >
        <img
          src="/event-templates/botanical/invitation-card.webp"
          alt=""
          aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />

        <div
          style={{
            position: "absolute",
            top: "25%",
            bottom: "26.5%",
            left: "9%",
            right: "9%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: theme.bodyFont,
              fontSize: "clamp(13px, 2.6vw, 16px)",
              color: theme.background,
              margin: 0,
              opacity: 0.92,
            }}
          >
            Wedding Invitation
          </p>

          <div>
            {hosts.length >= 2 ? (
              <>
                <p style={{ fontFamily: theme.displayFont, fontSize: "clamp(1.8rem, 7.5vw, 2.8rem)", color: theme.background, margin: 0, lineHeight: 1.1 }}>
                  {hosts[0]}
                </p>
                <p style={{ fontFamily: theme.bodyFont, fontSize: "clamp(11px, 1.8vw, 13px)", color: theme.background, margin: "2px 0", opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.2em" }}>
                  and
                </p>
                <p style={{ fontFamily: theme.displayFont, fontSize: "clamp(1.8rem, 7.5vw, 2.8rem)", color: theme.background, margin: 0, lineHeight: 1.1 }}>
                  {hosts[1]}
                </p>
              </>
            ) : (
              <p style={{ fontFamily: theme.displayFont, fontSize: "clamp(1.8rem, 7.5vw, 2.8rem)", color: theme.background, margin: 0, lineHeight: 1.1 }}>
                {hosts.join(" & ")}
              </p>
            )}
          </div>

          {formattedDate || hasLocation ? (
            <div style={{ display: "flex", alignItems: "stretch", justifyContent: "center", gap: 16 }}>
              {formattedDate ? (
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontFamily: theme.bodyFont, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: theme.background, margin: 0, opacity: 0.85 }}>
                    {formattedDate.month}
                  </p>
                  <p style={{ fontFamily: theme.displayFont, fontSize: "clamp(1.6rem, 5vw, 2.2rem)", fontWeight: 700, color: theme.background, margin: 0, lineHeight: 1 }}>
                    {formattedDate.day}
                  </p>
                  <p style={{ fontFamily: theme.bodyFont, fontSize: 11, color: theme.background, margin: 0, opacity: 0.85 }}>
                    {formattedDate.year}
                  </p>
                </div>
              ) : null}

              {formattedDate && (formattedDate.time || hasLocation) ? (
                <span style={{ width: 1, background: theme.background, opacity: 0.35 }} />
              ) : null}

              {formattedDate?.time || hasLocation ? (
                <div style={{ textAlign: "left", fontFamily: theme.bodyFont, fontSize: "clamp(11px, 1.8vw, 13px)", color: theme.background }}>
                  {formattedDate?.time ? <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{formattedDate.time}</p> : null}
                  {hasLocation ? (
                    <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
                      {content.primaryLocation.name || content.primaryLocation.addressLine}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
