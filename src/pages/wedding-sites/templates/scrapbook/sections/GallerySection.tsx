import { Polaroid, Section, type Tone } from "../components";
import type { PhotoSlots } from "../content";

interface Props {
  tone: Tone;
  slots: PhotoSlots;
}

const TILTS = [-3, 2, -1.5, 3, -2, 1.5, -2.5, 2.8];

/**
 * Optional overflow board: only the photos the collages didn't already
 * place (see resolvePhotoSlots). Renders nothing when every photo is
 * already used, so it never leaves an empty band.
 */
export default function GallerySection({ tone, slots }: Props) {
  if (slots.overflow.length === 0) return null;

  return (
    <Section tone={tone}>
      <div className="sb-gallery">
        {slots.overflow.map((item, i) => (
          <Polaroid
            key={item.id}
            image={item.image}
            rotate={TILTS[i % TILTS.length]}
            aspect={item.layoutHint === "wide" ? "5/4" : item.layoutHint === "portrait" ? "3/4" : "1/1"}
            caption={item.caption}
          />
        ))}
      </div>
    </Section>
  );
}
