import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import { LeafDivider } from "../Ornament";

interface FaqSectionProps {
  content: EventContent;
  theme: EventTheme;
}

export default function FaqSection({ content, theme }: FaqSectionProps) {
  if (content.faqs.length === 0) return null;

  return (
    <section style={{ background: theme.background, padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "min(600px, 92vw)", margin: "0 auto" }}>
        <p style={{ fontFamily: theme.displayFont, fontSize: 28, color: theme.ink, margin: 0 }}>Questions</p>
        <LeafDivider color={theme.ink} />
        <div style={{ textAlign: "left" }}>
          {[...content.faqs].sort((a, b) => a.order - b.order).map((faq, i, arr) => (
            <div
              key={faq.id}
              style={{ padding: "18px 0", borderBottom: i < arr.length - 1 ? `1px solid ${theme.ink}22` : "none" }}
            >
              <p style={{ fontFamily: theme.displayFont, fontSize: 19, color: theme.ink, margin: 0 }}>{faq.question}</p>
              <p style={{ fontFamily: theme.bodyFont, fontSize: 14, color: theme.muted, margin: "6px 0 0", lineHeight: 1.6 }}>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
