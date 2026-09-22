import type { EventContent } from "../../../content/types";
import { Polaroid, StationeryCard, type Tone } from "../components";

interface Props {
  content: EventContent;
  tone: Tone;
}

// Deterministic alternating tilts — the scrapbook look depends on these
// being composed, not random (random values would also change on every
// re-render, which is visibly unstable while editing).
const TILTS = [-3, 2.5, -1.5, 3, -2.5, 1.5];

/**
 * A BLOCK, not its own full-width band: the reference has no key-people
 * section, so rather than inserting a ninth band — which would shift
 * every following section's burgundy/beige tone away from the
 * reference's rhythm — this rides inside the story band, matching how
 * the project's other templates also nest keyPeople under hostIntro.
 *
 * Portraits are Polaroids; people without a photo fall back to a small
 * name card instead of an empty frame.
 */
export default function KeyPeopleBlock({ content, tone }: Props) {
  if (content.keyPeople.length === 0) return null;

  return (
    <div style={{ marginTop: "clamp(48px,6cqw,84px)" }}>
      <div style={{ textAlign: "center", marginBottom: "clamp(26px,3.4cqw,42px)" }}>
        <p className="sb-script sb-script--md">The People We Love</p>
      </div>

      <div className="sb-people">
        {content.keyPeople.map((person, i) => {
          const tilt = TILTS[i % TILTS.length];
          return (
            <div key={person.id}>
              {person.photo ? (
                <Polaroid image={person.photo} preset="person" rotate={tilt} caption={person.name} />
              ) : (
                <StationeryCard rotate={tilt} paper={tone === "red"}>
                  <p className="sb-script sb-script--md">{person.name}</p>
                </StationeryCard>
              )}
              {person.role ? <p className="sb-people__role">{person.role}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
