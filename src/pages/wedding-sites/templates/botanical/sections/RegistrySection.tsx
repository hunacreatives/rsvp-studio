import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import { LeafDivider } from "../Ornament";

interface RegistrySectionProps {
  content: EventContent;
  theme: EventTheme;
}

export default function RegistrySection({ content, theme }: RegistrySectionProps) {
  if (content.registryLinks.length === 0) return null;

  return (
    <section style={{ background: `${theme.ink}06`, padding: "64px 24px", textAlign: "center" }}>
      <div style={{ width: "min(600px, 92vw)", margin: "0 auto" }}>
        <p style={{ fontFamily: theme.displayFont, fontSize: 28, color: theme.ink, margin: 0 }}>Registry</p>
        <LeafDivider color={theme.ink} />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
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
                color: theme.background,
                background: theme.ink,
                borderRadius: 999,
                padding: "12px 24px",
                textDecoration: "none",
              }}
            >
              {link.storeName}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
