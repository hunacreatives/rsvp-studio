import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import { CashGifts, hasCashGifts } from "../../shared/CashGifts";

interface RegistrySectionProps {
  content: EventContent;
  theme: EventTheme;
}

export default function RegistrySection({ content, theme }: RegistrySectionProps) {
  if (content.registryLinks.length === 0 && !hasCashGifts(content)) return null;

  return (
    <section style={{ background: `${theme.muted}0d`, padding: "56px 24px", textAlign: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: theme.displayFont,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            color: theme.ink,
            marginBottom: 24,
          }}
        >
          Registry
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
          {content.registryLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: theme.bodyFont,
                fontSize: 14,
                fontWeight: 600,
                color: theme.ink,
                border: `1px solid ${theme.muted}55`,
                borderRadius: 999,
                padding: "10px 24px",
                textDecoration: "none",
              }}
            >
              {link.storeName}
            </a>
          ))}
        </div>
        <CashGifts content={content} look={{ ink: theme.ink, muted: theme.ink, surface: theme.background, line: `${theme.muted}55`, bodyFont: theme.bodyFont, displayFont: theme.displayFont }} />
      </div>
    </section>
  );
}
