import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface RegistrySectionProps {
  content: EventContent;
  theme: EventTheme;
}

export default function RegistrySection({ content, theme }: RegistrySectionProps) {
  if (content.registryLinks.length === 0) return null;

  return (
    <section style={{ background: `${theme.muted}0a`, padding: "56px 32px" }}>
      <div style={{ width: "min(880px, 92vw)", margin: "0 auto" }}>
        <p
          style={{
            fontFamily: theme.bodyFont,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 11,
            fontWeight: 700,
            color: theme.muted,
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
      </div>
    </section>
  );
}
