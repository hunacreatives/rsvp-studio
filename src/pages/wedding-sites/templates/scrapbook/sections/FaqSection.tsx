import type { EventContent } from "../../../content/types";
import { EditorHint, Flower, Section, type Tone } from "../components";

interface Props {
  content: EventContent;
  tone: Tone;
  editorPreview: boolean;
}

/**
 * Reference layout: oversized script heading plus a botanical on the
 * left, questions stacked on the right as small uppercase labels with
 * body answers beneath. No accordions, no white cards — it stays part
 * of the stationery.
 */
export default function FaqSection({ content, tone, editorPreview }: Props) {
  if (content.faqs.length === 0 && !editorPreview) return null;
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order);

  return (
    <Section tone={tone}>
      <div className="sb-split" style={{ ["--cols" as string]: "0.72fr 1.28fr", ["--align" as string]: "start" }}>
        <div>
          <p className="sb-script sb-script--lg">Frequently Asked Qs</p>
          <Flower variant="sprig-green" width="clamp(90px,11cqw,150px)" style={{ marginTop: "clamp(18px,2.6cqw,30px)" }} />
        </div>

        <div>
          {faqs.length === 0 && editorPreview ? <EditorHint>Add frequently asked questions</EditorHint> : null}
          {faqs.map((faq) => (
            <div key={faq.id} className="sb-faq__item">
              <p className="sb-label sb-faq__q">{faq.question}</p>
              <p className="sb-body" style={{ maxWidth: "56ch" }}>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
