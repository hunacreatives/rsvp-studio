import type { EventContent } from "../../../content/types";
import { EditorHint, Flower, Section, type FlowerVariant, type Tone } from "../components";
import { formatTime } from "../content";

interface Props {
  content: EventContent;
  tone: Tone;
  editorPreview: boolean;
}

// Deterministic, cycling — never randomised per render.
const FLOWERS: FlowerVariant[] = ["red", "yellow", "cream", "pressed"];

/**
 * The reference's three-column "About the Wedding" row (Ceremony /
 * Reception / Dress Code), driven by the canonical `schedule` items —
 * no new content fields invented. A schedule item's time is shown when
 * it has one and quietly omitted when it doesn't, so the same layout
 * serves both timed events and descriptive blocks.
 *
 * More than three items extend the grid (auto-fit) rather than being
 * silently dropped.
 */
export default function WeddingDetailsSection({ content, tone, editorPreview }: Props) {
  const items = content.schedule;
  if (items.length === 0 && !editorPreview) return null;

  return (
    <Section tone={tone}>
      <div style={{ textAlign: "center" }}>
        <p className="sb-script sb-script--lg">About the Wedding</p>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "clamp(24px,3cqw,36px)" }}>
          <EditorHint>Add schedule items</EditorHint>
        </div>
      ) : null}

      <div className="sb-cols" style={{ marginTop: "clamp(34px,4.4cqw,60px)" }}>
        {items.map((item, i) => {
          const time = formatTime(item.startTime);
          return (
            <div key={item.id}>
              <Flower variant={FLOWERS[i % FLOWERS.length]} width="clamp(46px,5cqw,64px)" style={{ margin: "0 auto clamp(12px,1.6cqw,20px)" }} />
              {time ? (
                <p className="sb-eyebrow" style={{ marginBottom: 6 }}>
                  {time}
                </p>
              ) : null}
              <p className="sb-script sb-script--md">{item.label}</p>
              {item.description ? (
                <p className="sb-body" style={{ marginTop: 10, maxWidth: "34ch", marginInline: "auto" }}>
                  {item.description}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
