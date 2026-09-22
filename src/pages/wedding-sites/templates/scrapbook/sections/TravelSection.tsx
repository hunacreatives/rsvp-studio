import type { EventContent } from "../../../content/types";
import { EditorHint, Polaroid, PolaroidSlot, Section, type Tone } from "../components";
import type { PhotoSlots } from "../content";

interface Props {
  content: EventContent;
  tone: Tone;
  slots: PhotoSlots;
  editorPreview: boolean;
}

/**
 * Burgundy editorial spread: taped Polaroid + handwritten section title
 * on the left, stacked information blocks on the right — script heading
 * over restrained body copy, the way printed wedding stationery reads.
 * Deliberately not cards.
 */
export default function TravelSection({ content, tone, slots, editorPreview }: Props) {
  const hasTravel = content.travelInformation.length > 0;
  const hasStays = content.accommodations.length > 0;
  if (!hasTravel && !hasStays && !editorPreview) return null;

  return (
    <Section tone={tone} id="sb-itinerary">
      <div className="sb-split" style={{ ["--cols" as string]: slots.travel || editorPreview ? "0.82fr 1.18fr" : "1fr", ["--align" as string]: "start" }}>
        <div>
          <p className="sb-script sb-script--lg">Travel Details</p>
          {slots.travel ? (
            <div style={{ width: "min(100%,300px)", marginTop: "clamp(20px,2.8cqw,32px)" }}>
              <Polaroid image={slots.travel} preset="travel" tapeRotate={-5} />
            </div>
          ) : editorPreview ? (
            <div style={{ width: "min(100%,300px)", marginTop: "clamp(20px,2.8cqw,32px)" }}>
              <PolaroidSlot preset="travel" label="Travel photo" />
            </div>
          ) : null}
        </div>

        <div className="sb-stack">
          {!hasTravel && !hasStays && editorPreview ? (
            <EditorHint>Add travel information and accommodations</EditorHint>
          ) : null}
          {content.travelInformation.map((info) => (
            <div key={info.id}>
              <p className="sb-script sb-script--md">{info.title}</p>
              <p className="sb-body" style={{ marginTop: 8, maxWidth: "52ch" }}>
                {info.body}
              </p>
            </div>
          ))}

          {hasStays ? (
            <div>
              <p className="sb-script sb-script--md">Accommodations</p>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 14 }}>
                {content.accommodations.map((place) => (
                  <div key={place.id} style={{ maxWidth: "52ch" }}>
                    <p className="sb-label" style={{ letterSpacing: "0.12em" }}>
                      {place.name}
                    </p>
                    {place.addressLine ? (
                      <p className="sb-body" style={{ marginTop: 2, opacity: 0.9 }}>
                        {place.addressLine}
                      </p>
                    ) : null}
                    {place.notes ? (
                      <p className="sb-body" style={{ marginTop: 2, opacity: 0.85 }}>
                        {place.notes}
                      </p>
                    ) : null}
                    {place.bookingUrl ? (
                      <a
                        href={place.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sb-label"
                        style={{ color: "inherit", display: "inline-block", marginTop: 6, textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: 2 }}
                      >
                        Book
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
