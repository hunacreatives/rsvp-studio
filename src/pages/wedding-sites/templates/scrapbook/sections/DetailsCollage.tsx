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
import { parseEventDate } from "../../../content/parseEventDate";

interface Props {
  content: EventContent;
  tone: Tone;
  slots: PhotoSlots;
  editorPreview: boolean;
}

function dateParts(iso: string): { month: string; day: string; year: string } | null {
  if (!iso) return null;
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleDateString("en-US", { month: "long" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
    year: String(d.getFullYear()),
  };
}

/**
 * Stationery collage: venue Polaroid, a second detail/couple Polaroid,
 * open envelope, ONE combined date+venue card carrying real canonical
 * data, a monogram card, pressed flowers and a stamp — deliberately
 * asymmetric and overlapping, rebuilt 1:1 from the reference design's
 * single stationery card (not split into separate Date/Venue cards,
 * which drifted from the source and left the pressed flower overlapping
 * the monogram card).
 *
 * The card is still explicitly labelled per field internally, so a
 * value that looks wrong on the page (a person's name showing where the
 * venue belongs) points at the field that actually needs fixing instead
 * of looking like a random decorative string.
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

        {/* ONE combined card — the source design has a single stationery card
            carrying date, address and time together, not separate Date/Venue
            cards. Kept internally labelled per field so a wrong value still
            points at the field to fix, per the file-header comment. */}
        <CollageItem x="56%" y="6%" w="30%" z={4}>
          <StationeryCard rotate={1.2} paper={cardIsPaper}>
            {parts ? (
              <>
                <p className="sb-label" style={{ letterSpacing: "0.22em" }}>
                  {parts.month} {parts.day}, {parts.year}
                </p>
                <Flourish />
              </>
            ) : editorPreview ? (
              <>
                <p className="sb-eyebrow">The Date</p>
                <EditorHint>Add your date</EditorHint>
                <Flourish />
              </>
            ) : null}
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
            {timeLabel ? (
              <p className="sb-serif" style={{ marginTop: 10 }}>
                {timeLabel}
              </p>
            ) : null}
          </StationeryCard>
        </CollageItem>

        <CollageItem x="40%" y="38%" w="24%" z={2} filler>
          <Envelope />
        </CollageItem>

        {slots.venueSecondary ? (
          <CollageItem x="70%" y="44%" w="26%" z={3}>
            <Polaroid image={slots.venueSecondary} preset="venueSmall" />
          </CollageItem>
        ) : editorPreview ? (
          <CollageItem x="70%" y="44%" w="26%" z={2}>
            <PolaroidSlot preset="venueSmall" label="Detail photo" />
          </CollageItem>
        ) : null}

        {initials ? (
          <CollageItem x="6%" y="62%" w="23%" z={5}>
            <StationeryCard rotate={-2} paper={cardIsPaper}>
              <p className="sb-script sb-script--md">{initials}</p>
            </StationeryCard>
          </CollageItem>
        ) : null}

        <CollageItem x="40%" y="4%" w="10%" z={6} decor>
          <Flower variant="sprig-pink" width="100%" />
        </CollageItem>

        {/* Moved right, away from the monogram card — the source has the
            pressed flower sitting clear of the monogram, not overlapping it. */}
        <CollageItem x="34%" y="68%" w="10%" z={6} decor>
          <Flower variant="pressed" width="100%" />
        </CollageItem>

        <CollageItem x="60%" y="66%" w="8%" z={6} decor filler>
          <Stamp width="100%" />
        </CollageItem>
      </div>
    </Section>
  );
}
