import { mutedText } from "../../../engine/theme";
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
    <section style={{ background: `${theme.muted}0a`, padding: "56px 32px" }}>
      <div style={{ width: "100%", maxWidth: 880, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: theme.bodyFont,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 12,
            fontWeight: 700,
            color: mutedText(theme),
            margin: "0 0 20px",
          }}
        >
          Registry
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
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
                padding: "10px 18px",
                textDecoration: "none",
              }}
            >
              {link.storeName}
            </a>
          ))}
        </div>
        <CashGifts content={content} look={{ ink: theme.ink, muted: mutedText(theme), surface: theme.background, line: `${theme.muted}55`, bodyFont: theme.bodyFont, radius: 0, align: "left" }} />
      </div>
    </section>
  );
}
