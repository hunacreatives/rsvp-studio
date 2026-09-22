import type { EventContent } from "../../../content/types";
import { EditorHint, Flower, Section, type Tone } from "../components";
import { deriveLocality } from "../content";

interface Props {
  content: EventContent;
  tone: Tone;
  editorPreview: boolean;
}

/**
 * Intentionally the quietest section in the reference: one pressed
 * flower, one large script statement, then restrained links. Registry
 * destinations render as understated underlined text links, not modern
 * rounded buttons — the reference has no button shapes anywhere.
 */
export default function RegistrySection({ content, tone, editorPreview }: Props) {
  if (content.registryLinks.length === 0 && !editorPreview) return null;
  const locality = deriveLocality(content.primaryLocation);

  return (
    <Section tone={tone} style={{ paddingBlock: "clamp(44px,5.4cqw,74px)" }}>
      <div style={{ textAlign: "center", maxWidth: 720, marginInline: "auto" }}>
        <Flower variant="sprig-pink" width="clamp(58px,6.5cqw,88px)" style={{ margin: "0 auto clamp(18px,2.4cqw,28px)" }} />

        <p className="sb-script sb-script--lg">
          Your presence{locality ? ` in ${locality}` : ""} is the greatest gift of all.
        </p>

        <div className="sb-links">
          {content.registryLinks.length === 0 && editorPreview ? <EditorHint>Add registry links</EditorHint> : null}
          {content.registryLinks.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
              {link.storeName}
            </a>
          ))}
        </div>
      </div>
    </Section>
  );
}
