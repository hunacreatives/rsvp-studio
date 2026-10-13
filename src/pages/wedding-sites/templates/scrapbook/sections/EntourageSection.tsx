import type { EventContent } from "../../../content/types";
import { Section, type Tone } from "../components";
import EntourageBlock, { entourageTitle } from "../../shared/Entourage";

/** Scrapbook: the entourage band, with the design's own script heading and colours. */
export default function EntourageSection({ content, tone }: { content: EventContent; tone: Tone }) {
  return (
    <Section tone={tone}>
      <p className="sb-script sb-script--lg" style={{ textAlign: "center", marginBottom: "clamp(20px,3cqw,36px)" }}>
        {entourageTitle(content)}
      </p>
      <EntourageBlock content={content} heading={false} ink="currentColor" muted="currentColor" displayFont="var(--sb-display)" bodyFont="var(--sb-body)" />
    </Section>
  );
}
