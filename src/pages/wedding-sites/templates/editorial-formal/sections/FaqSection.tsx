import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface FaqSectionProps {
  content: EventContent;
  theme: EventTheme;
}

export default function FaqSection({ content, theme }: FaqSectionProps) {
  if (content.faqs.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "64px 24px" }}>
      <div style={{ width: "min(560px, 92vw)", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: theme.displayFont,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            color: theme.ink,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Frequently Asked Questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[...content.faqs]
            .sort((a, b) => a.order - b.order)
            .map((faq) => (
              <details
                key={faq.id}
                style={{
                  borderBottom: `1px solid ${theme.muted}33`,
                  padding: "16px 0",
                }}
              >
                <summary
                  style={{
                    fontFamily: theme.bodyFont,
                    fontWeight: 600,
                    color: theme.ink,
                    cursor: "pointer",
                  }}
                >
                  {faq.question}
                </summary>
                <p
                  style={{
                    fontFamily: theme.bodyFont,
                    color: theme.muted,
                    fontSize: 15,
                    lineHeight: 1.7,
                    marginTop: 10,
                  }}
                >
                  {faq.answer}
                </p>
              </details>
            ))}
        </div>
      </div>
    </section>
  );
}
