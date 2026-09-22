import type { EventContent } from "../../../content/types";
import {
  CollageItem,
  EditorHint,
  Envelope,
  Flourish,
  Flower,
  Polaroid,
  PolaroidSlot,
  Section,
  Stamp,
  StationeryCard,
  type Tone,
} from "../components";
import { formatTime, hostNames, monogram, splitAddress, type PhotoSlots } from "../content";

interface Props {
  content: EventContent;
  tone: Tone;
  slots: PhotoSlots;
  editorPreview: boolean;
}

function dateParts(iso: string): { month: string; day: string; year: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleDateString(undefined, { month: "long" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
    year: String(d.getFullYear()),
  };
}

/**
 * Stationery collage: venue Polaroid, open envelope, a DATE card and a
 * VENUE card carrying real canonical data, a monogram card, pressed
 * flowers and a stamp — deliberately asymmetric and overlapping.
 *
 * Every card is explicitly labelled with what it holds, so a value that
 * looks wrong on the page (a person's name showing under THE VENUE)
 * points at the field that actually needs fixing instead of looking
 * like a random decorative string.
 *
 * Positions are deterministic percentages on a fixed-ratio canvas (see
 * .sb-collage); below 860px the whole thing becomes a single column.
 */
export default function DetailsCollage({ content, tone, slots, editorPreview }: Props) {
  const parts = dateParts(content.eventDate);
  const timeLabel = formatTime(content.eventDate);
  const venueName = content.primaryLocation.name?.trim();
  const { street, locality } = splitAddress(content.primaryLocation);
  // Explicitly derived, not a truncated string: first initials joined
  // with an ampersand, and only when there are at least two hosts.
  const names = hostNames(content);
  const initials = names.length >= 2 ? monogram(names).split(" ").join(" & ") : "";
  const cardIsPaper = tone === "red";

  return (
    <Section tone={tone} id="sb-details">
      <div className="sb-collage" style={{ ["--ar" as string]: "1024/520" }}>
        {slots.venue ? (
          <CollageItem x="2%" y="4%" w="30%" z={3}>
            <Polaroid image={slots.venue} preset="venue" />
          </CollageItem>
        ) : editorPreview ? (
          <CollageItem x="1%" y="6%" w="30%" z={2}>
            <PolaroidSlot preset="venue" label="Venue photo" />
          </CollageItem>
        ) : null}

        <CollageItem x="66%" y="0%" w="25%" z={4}>
          <StationeryCard rotate={1.2} paper={cardIsPaper}>
            <p className="sb-eyebrow">The Date</p>
            <Flourish />
            {parts ? (
              <>
                <p className="sb-label" style={{ letterSpacing: "0.22em" }}>
                  {parts.month}
                </p>
                <p className="sb-script sb-script--lg" style={{ margin: "2px 0" }}>
                  {parts.day}
                </p>
                <p className="sb-label" style={{ letterSpacing: "0.22em" }}>
                  {parts.year}
                </p>
              </>
            ) : editorPreview ? (
              <EditorHint>Add your date</EditorHint>
            ) : null}
            {timeLabel ? (
              <p className="sb-serif" style={{ marginTop: 10 }}>
                {timeLabel}
              </p>
            ) : null}
          </StationeryCard>
        </CollageItem>

        <CollageItem x="29%" y="26%" w="26%" z={2} filler>
          <Envelope />
        </CollageItem>

        <CollageItem x="52%" y="50%" w="32%" z={4}>
          <StationeryCard rotate={-1.4} paper={cardIsPaper}>
            <p className="sb-eyebrow">The Venue</p>
            <Flourish />
            {venueName ? <p className="sb-script sb-script--md">{venueName}</p> : null}
            {locality ? (
              <p className="sb-label" style={{ marginTop: 8, letterSpacing: "0.2em" }}>
                {locality}
              </p>
            ) : null}
            {street ? (
              <p className="sb-serif" style={{ marginTop: 4, opacity: 0.85 }}>
                {street}
              </p>
            ) : null}
            {!venueName && !locality && !street && editorPreview ? <EditorHint>Add your venue</EditorHint> : null}
          </StationeryCard>
        </CollageItem>

        {initials ? (
          <CollageItem x="6%" y="62%" w="23%" z={5}>
            <StationeryCard rotate={-2} paper={cardIsPaper}>
              <p className="sb-script sb-script--md">{initials}</p>
            </StationeryCard>
          </CollageItem>
        ) : null}

        <CollageItem x="47%" y="2%" w="10%" z={6} decor>
          <Flower variant="sprig-pink" width="100%" />
        </CollageItem>

        <CollageItem x="27%" y="72%" w="9%" z={6} decor>
          <Flower variant="pressed" width="100%" />
        </CollageItem>

        <CollageItem x="50%" y="22%" w="5%" z={6} decor filler>
          <Stamp width="100%" />
        </CollageItem>
      </div>
    </Section>
  );
}
