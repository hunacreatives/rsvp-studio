import type { EventContent } from "../../../content/types";
import { EditorHint, Polaroid, PolaroidSlot, Section, type Tone } from "../components";
import type { PhotoSlots } from "../content";
import KeyPeopleBlock from "./KeyPeopleBlock";

interface Props {
  content: EventContent;
  tone: Tone;
  slots: PhotoSlots;
  editorPreview: boolean;
}

/**
 * Editorial split: script heading and the couple's story on the left,
 * two overlapping, oppositely-rotated Polaroids on the right. Paragraph
 * breaks in the canonical `story` field are preserved as real
 * paragraphs.
 */
export default function StorySection({ content, tone, slots, editorPreview }: Props) {
  const paragraphs = (content.story ?? "").split("\n\n").map((p) => p.trim()).filter(Boolean);
  const hasPhotos = Boolean(slots.storyA || slots.storyB);
  const showPhotoColumn = hasPhotos || editorPreview;

  return (
    <Section tone={tone}>
      <div className="sb-split" style={{ ["--cols" as string]: showPhotoColumn ? "1.02fr 0.98fr" : "1fr" }}>
        <div>
          <p className="sb-script sb-script--lg">Our Story</p>
          <div style={{ marginTop: "clamp(18px,2.4cqw,30px)", maxWidth: "48ch" }}>
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <p key={i} className="sb-body">
                  {p}
                </p>
              ))
            ) : editorPreview ? (
              <EditorHint>Add your story</EditorHint>
            ) : null}
          </div>
        </div>

        {showPhotoColumn ? (
          <div className="sb-story__photos">
            {slots.storyA ? (
              <Polaroid image={slots.storyA} preset="storyLeft" tapeRotate={-6} />
            ) : editorPreview ? (
              <PolaroidSlot preset="storyLeft" />
            ) : null}
            {slots.storyB ? (
              <Polaroid image={slots.storyB} preset="storyRight" tapeRotate={5} />
            ) : editorPreview ? (
              <PolaroidSlot preset="storyRight" />
            ) : null}
          </div>
        ) : null}
      </div>

      <KeyPeopleBlock content={content} tone={tone} />
    </Section>
  );
}
