import { useEffect, useState } from "react";
import type { EventContent } from "../../../content/types";
import { usePrefersReducedMotion } from "../../../engine/motion";
import { EditorHint, HeartDoodle, HeartSticker, PartyHatSticker, PhotoSlot } from "../Ornament";
import { formatDateTime, hasLocation, hostNames } from "../content";

interface HeroProps {
  content: EventContent;
  editorPreview?: boolean;
}

/**
 * The reference's defining device: a full-screen script-name intro card
 * that fades into the real hero, then the headline/photos/message/
 * details stagger in one after another. Reproduced here as ONE reveal
 * flag driving several `cn-reveal` elements with per-element transition
 * delays, rather than the reference's five separate timer-driven state
 * variables — same staged feel, simpler state.
 *
 * Skipped entirely under prefers-reduced-motion: everything renders
 * immediately, matching every other template's motion convention.
 */
export default function Hero({ content, editorPreview = false }: HeroProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [introDone, setIntroDone] = useState(prefersReducedMotion);
  const [revealed, setRevealed] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const t1 = setTimeout(() => setIntroDone(true), 1400);
    const t2 = setTimeout(() => setRevealed(true), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [prefersReducedMotion]);

  const namesRaw = hostNames(content);
  const names = namesRaw || (editorPreview ? "Your Name" : "");
  const photos = content.galleries.flatMap((g) => g.items).sort((a, b) => a.order - b.order);
  const photoLeft = photos[0]?.image;
  const photoRight = photos[1]?.image;
  const dateTime = formatDateTime(content.eventDate);
  const showLocation = hasLocation(content);
  const showPhotos = Boolean(photoLeft || photoRight) || editorPreview;
  const showStory = Boolean(content.story) || editorPreview;
  const showDetails = Boolean(dateTime || showLocation) || editorPreview;

  const nameLines = names ? [names] : [];

  return (
    <section className="cn-hero">
      {!introDone ? (
        <div className={`cn-intro${introDone ? " cn-intro--hidden" : ""}`}>
          <p className="cn-script cn-script--xl" style={{ textAlign: "center", padding: "0 24px" }}>
            {nameLines.map((line, i) => (
              <span key={i} style={{ display: "block" }}>
                {line}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      <div className="cn-hero__wrap">
        <p className={`cn-script cn-script--xl cn-reveal${revealed ? " cn-reveal--in" : ""}`}>{names}</p>

        {showPhotos ? (
          <div className={`cn-photos cn-reveal${revealed ? " cn-reveal--in" : ""}`} style={{ transitionDelay: revealed ? "300ms" : "0ms" }}>
            <div className="cn-photo cn-photo--left">
              <PartyHatSticker />
              {photoLeft ? (
                <img
                  className="cn-photo__img"
                  src={photoLeft.masterUrl}
                  alt={photoLeft.alt}
                  style={{ objectFit: "cover", objectPosition: `${photoLeft.focalPoint.x * 100}% ${photoLeft.focalPoint.y * 100}%` }}
                />
              ) : (
                <PhotoSlot />
              )}
            </div>
            <div className="cn-photo cn-photo--right">
              {photoRight ? (
                <img
                  className="cn-photo__img"
                  src={photoRight.masterUrl}
                  alt={photoRight.alt}
                  style={{ objectFit: "cover", objectPosition: `${photoRight.focalPoint.x * 100}% ${photoRight.focalPoint.y * 100}%` }}
                />
              ) : (
                <PhotoSlot />
              )}
              <HeartSticker />
            </div>
          </div>
        ) : null}

        <div className="cn-doodles">
          <span className="cn-doodle cn-doodle--a">
            <HeartDoodle size={16} color="#D4727A" filled />
          </span>
          <span className="cn-doodle cn-doodle--b">
            <HeartDoodle size={12} color="#F4A6A3" filled />
          </span>
        </div>

        {showStory ? (
          <div className={`cn-reveal${revealed ? " cn-reveal--in" : ""}`} style={{ marginTop: "clamp(28px,4cqw,44px)", transitionDelay: revealed ? "600ms" : "0ms" }}>
            {content.story ? (
              <p className="cn-hand cn-hand--lg" style={{ maxWidth: 480, marginInline: "auto" }}>
                {content.story}
              </p>
            ) : (
              <EditorHint>Add your invitation message — a line or two in your own voice.</EditorHint>
            )}
          </div>
        ) : null}

        {showDetails ? (
          <div className={`cn-reveal${revealed ? " cn-reveal--in" : ""}`} style={{ marginTop: "clamp(20px,3cqw,30px)", transitionDelay: revealed ? "800ms" : "0ms" }}>
            {dateTime ? (
              <p className="cn-hand cn-hand--md">{dateTime}</p>
            ) : editorPreview ? (
              <p className="cn-hand cn-hand--md">
                <EditorHint>Add the date &amp; time</EditorHint>
              </p>
            ) : null}
            {showLocation ? (
              <p className="cn-hand cn-hand--md">
                {content.primaryLocation.name}
                {content.primaryLocation.name && content.primaryLocation.addressLine ? ", " : ""}
                {content.primaryLocation.addressLine}
              </p>
            ) : editorPreview ? (
              <p className="cn-hand cn-hand--md">
                <EditorHint>Add the venue</EditorHint>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={`cn-divider cn-reveal${revealed ? " cn-reveal--in" : ""}`} style={{ transitionDelay: revealed ? "1000ms" : "0ms" }}>
          <span className="cn-divider__line" />
          <HeartDoodle size={15} color="#C9A0A0" filled />
          <span className="cn-divider__line" />
        </div>
      </div>
    </section>
  );
}
