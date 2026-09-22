import type { EventContent } from "../../../content/types";
import { EditorHint } from "../Ornament";

interface Props {
  content: EventContent;
  editorPreview?: boolean;
}

/**
 * The reference has no schedule/travel/registry/faq sections at all —
 * it's a single-event birthday page. These are generic glass-card
 * sections in the same visual language, only rendered when a host has
 * actually filled that content in (or in the builder, so the section's
 * presence — and an EditorHint on what it's for — is visible while
 * editing an otherwise-empty draft).
 */
export function ScheduleSection({ content, editorPreview = false }: Props) {
  const items = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (items.length === 0 && !editorPreview) return null;

  return (
    <section className="cn-sec">
      <div className="cn-sec__inner" style={{ textAlign: "center" }}>
        <p className="cn-script cn-script--lg">Schedule</p>
        {items.length === 0 ? (
          <div className="cn-hint-block"><EditorHint>Add schedule items so guests know the flow of the day.</EditorHint></div>
        ) : (
          <div style={{ marginTop: 24, textAlign: "left" }}>
            {items.map((item) => (
              <div key={item.id} className="cn-card">
                <p className="cn-card__title">{item.label}</p>
                {item.description ? <p className="cn-card__body">{item.description}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function TravelSection({ content, editorPreview = false }: Props) {
  const travel = content.travelInformation;
  const stays = content.accommodations;
  if (travel.length === 0 && stays.length === 0 && !editorPreview) return null;

  return (
    <section className="cn-sec">
      <div className="cn-sec__inner" style={{ textAlign: "center" }}>
        <p className="cn-script cn-script--lg">Getting There &amp; Staying</p>
        {travel.length === 0 && stays.length === 0 ? (
          <div className="cn-hint-block"><EditorHint>Add travel or accommodation info for out-of-town guests.</EditorHint></div>
        ) : (
          <div className="cn-grid cn-grid--cols3" style={{ marginTop: 24, textAlign: "left" }}>
            {travel.map((item) => (
              <div key={item.id} className="cn-card">
                <p className="cn-card__title">{item.title}</p>
                <p className="cn-card__body">{item.body}</p>
              </div>
            ))}
            {stays.map((item) => (
              <div key={item.id} className="cn-card">
                <p className="cn-card__title">{item.name}</p>
                <p className="cn-card__body">{item.notes ?? item.addressLine}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function RegistrySection({ content, editorPreview = false }: Props) {
  if (content.registryLinks.length === 0 && !editorPreview) return null;

  return (
    <section className="cn-sec">
      <div className="cn-sec__inner" style={{ textAlign: "center" }}>
        <p className="cn-script cn-script--lg">Registry</p>
        {content.registryLinks.length === 0 ? (
          <div className="cn-hint-block"><EditorHint>Add registry links, if you have any to share.</EditorHint></div>
        ) : (
          <div className="cn-grid" style={{ marginTop: 24 }}>
            {content.registryLinks.map((link) => (
              <a key={link.id} className="cn-card" href={link.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <p className="cn-card__title">{link.storeName}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function FaqSection({ content, editorPreview = false }: Props) {
  if (content.faqs.length === 0 && !editorPreview) return null;
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order);

  return (
    <section className="cn-sec">
      <div className="cn-sec__inner" style={{ textAlign: "center" }}>
        <p className="cn-script cn-script--lg">Questions</p>
        {faqs.length === 0 ? (
          <div className="cn-hint-block"><EditorHint>Add answers to questions guests are likely to ask.</EditorHint></div>
        ) : (
          <div style={{ marginTop: 24, textAlign: "left" }}>
            {faqs.map((faq) => (
              <div key={faq.id} className="cn-card">
                <p className="cn-card__title">{faq.question}</p>
                <p className="cn-card__body">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
