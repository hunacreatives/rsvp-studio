import { useState } from "react";
import type { EventContent } from "../../../content/types";
import { CollageItem, Envelope, Flourish, Flower, Polaroid, PolaroidSlot, Section, Stamp, StationeryCard, type Tone } from "../components";
import { hostNames, joinHosts, type PhotoSlots } from "../content";
import RsvpDialog from "./RsvpDialog";

interface Props {
  content: EventContent;
  tone: Tone;
  slots: PhotoSlots;
  editorPreview: boolean;
}

/**
 * Closing scrapbook composition from the reference: a burgundy RSVP
 * card, envelope, photo, a signature card and pressed flowers. The RSVP
 * card is the interaction point — RESPOND opens the stationery dialog
 * rather than parking a full web form inside the collage.
 *
 * Layer order matches the reference (back to front): envelope, photo,
 * stationery cards, then the botanicals on top — flowers in the source
 * physically overlap the cards/envelope beneath them, not the reverse.
 */
export default function FinalCollage({ content, tone, slots, editorPreview }: Props) {
  const [open, setOpen] = useState(false);
  const names = joinHosts(hostNames(content));
  const cardIsPaper = tone === "red";

  return (
    <Section tone={tone} id="sb-rsvp">
      {/*
        Positions below are measured directly off the reference SVG
        (rendered at 2x and cropped to just this section, then read as
        fractions of that section's own width/height) — not eyeballed.
        The reference cluster is compact and centered, roughly 54% of
        the section's width and 55% of its height, with real beige
        margin on every side; it does not spread to fill the section.
        --ar is tuned to the reference section's own aspect (1366:768)
        rather than an arbitrary wide/short box, since the tallest
        element (the envelope) needs proportionally more vertical room
        than the old ratio gave it.
      */}
      <div className="sb-collage" style={{ ["--ar" as string]: "1024/575" }}>
        <CollageItem x="25%" y="20%" w="19%" z={2} filler>
          <Envelope />
        </CollageItem>

        {slots.final ? (
          <CollageItem x="30%" y="8%" w="25%" z={3}>
            <Polaroid image={slots.final} preset="final" />
          </CollageItem>
        ) : editorPreview ? (
          <CollageItem x="30%" y="8%" w="25%" z={3}>
            <PolaroidSlot preset="final" />
          </CollageItem>
        ) : null}

        <CollageItem x="10%" y="15%" w="21%" z={4}>
          <StationeryCard rotate={-5} paper={cardIsPaper}>
            <Stamp width={28} style={{ position: "absolute", top: 10, left: 10 }} />
            <p className="sb-script sb-script--md">RSVP</p>
            <Flourish />
            <p className="sb-eyebrow">Kindly respond</p>
            <button type="button" className="sb-respond" onClick={() => setOpen(true)}>
              Respond
            </button>
          </StationeryCard>
        </CollageItem>

        {names ? (
          <CollageItem x="39%" y="28%" w="15%" z={5}>
            <StationeryCard rotate={4} paper={cardIsPaper}>
              <p className="sb-eyebrow">With love</p>
              <Flourish />
              <p className="sb-script sb-script--md">{names}</p>
            </StationeryCard>
          </CollageItem>
        ) : null}

        {/* Botanicals sit in front of the stationery, matching the
            reference — a real physical flower photographed on top of
            the paper it's arranged on, not tucked behind it. */}
        <CollageItem x="8%" y="50%" w="15%" z={6} decor>
          <Flower variant="sprig-green" width="100%" />
        </CollageItem>

        <CollageItem x="53%" y="17%" w="13%" z={7} decor>
          <Flower variant="sprig-yellow" width="100%" />
        </CollageItem>
      </div>

      {open ? <RsvpDialog slug={content.slug} onClose={() => setOpen(false)} /> : null}
    </Section>
  );
}
