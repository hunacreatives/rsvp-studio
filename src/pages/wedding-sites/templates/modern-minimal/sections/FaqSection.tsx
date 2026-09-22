import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface FaqSectionProps {
  content: EventContent;
  theme: EventTheme;
}

export default function FaqSection({ content, theme }: FaqSectionProps) {
  if (content.faqs.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "64px 32px" }}>
      <div style={{ width: "min(880px, 92vw)", margin: "0 auto" }}>
        <p
          style={{
            fontFamily: theme.bodyFont,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 11,
            fontWeight: 700,
            color: theme.muted,
            margin: "0 0 24px",
          }}
        >
          FAQ
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 1, background: `${theme.muted}33` }}>
          {[...content.faqs].sort((a, b) => a.order - b.order).map((faq) => (
            <div key={faq.id} style={{ background: theme.background, padding: 20 }}>
              <p style={{ fontFamily: theme.bodyFont, fontWeight: 700, color: theme.ink, margin: 0, fontSize: 14 }}>
                {faq.question}
              </p>
              <p style={{ fontFamily: theme.bodyFont, fontSize: 13, color: theme.muted, margin: "8px 0 0", lineHeight: 1.6 }}>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
