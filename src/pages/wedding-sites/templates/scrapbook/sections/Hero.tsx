import type { EventContent } from "../../../content/types";
import { EditorHint, Polaroid, PolaroidSlot, Section, type Tone } from "../components";
import { deriveLocality, hostNames, joinHosts, type PhotoSlots } from "../content";

interface Props {
  content: EventContent;
  tone: Tone;
  slots: PhotoSlots;
  editorPreview: boolean;
}

/**
 * Reference composition: small caps label → very large script names →
 * a Polaroid that OVERLAPS the script's descenders → nav links pushed
 * out to the far left/right edges → a quiet closing line.
 *
 * The photo's negative top margin (and z-index above the names) is the
 * whole point: it's what makes the hero read as layered paper rather
 * than a stack of centred web blocks.
 *
 * Photo priority is settings.heroImage → first gallery photo → (in the
 * builder only) an empty frame, so the composition never silently
 * loses its defining element.
 */
export default function Hero({ content, tone, slots, editorPreview }: Props) {
  const names = joinHosts(hostNames(content));
  const locality = deriveLocality(content.primaryLocation);

  return (
    <Section tone={tone} id="sb-top" style={{ paddingBlock: "clamp(66px,9.2cqw,136px)" }}>
      <div className={`sb-hero__inner${slots.hero || editorPreview ? "" : " sb-hero--nophoto"}`}>
        <p className="sb-eyebrow">A Special Note From</p>

        {names ? (
          <p className="sb-script sb-script--xl sb-hero__names">{names}</p>
        ) : editorPreview ? (
          <p className="sb-hero__names" style={{ marginTop: 14 }}>
            <EditorHint>Add host names</EditorHint>
          </p>
        ) : null}

        {slots.hero ? (
          <div className="sb-hero__photo">
            <Polaroid image={slots.hero} preset="hero" />
          </div>
        ) : editorPreview ? (
          <div className="sb-hero__photo">
            <PolaroidSlot preset="hero" />
          </div>
        ) : null}

        <nav className="sb-hero__nav">
          <a href="#sb-itinerary">Itinerary</a>
          <a href="#sb-details">Details</a>
        </nav>

        <p className="sb-serif sb-hero__tagline">
          We&apos;re finally getting married
          {locality ? (
            <>
              {" "}
              &hellip; in <em>{locality}</em>!
            </>
          ) : (
            "!"
          )}
        </p>
      </div>
    </Section>
  );
}
