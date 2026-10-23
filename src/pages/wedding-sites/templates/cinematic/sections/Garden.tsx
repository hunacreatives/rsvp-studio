import type { CSSProperties, ReactNode } from "react";
import type { EventContent, ImageAsset } from "../../../content/types";
import { customValue } from "../../../content/custom";
import { parseEventDate } from "../../../content/parseEventDate";
import { CashGifts, hasCashGifts } from "../../shared/CashGifts";
import EntourageBlock, { entourageTitle } from "../../shared/Entourage";
import { photoFit } from "../../shared/photoFit";

// In Bloom's garden party, below the hero: the evening as place cards, what to wear (the
// motif as watercolor petals), a polaroid wall pinned with washi tape, gifts, good to know.
// Each section has a watercolor bloom tucked at its edge that opens as it scrolls into
// view (styles.ts .cn-bloom; only where CinematicTemplate turns the reveals on).

const BLOOMS = "/event-templates/cinematic/blooms";

/** A watercolor bloom at a section's edge (cut from the design's own background painting). */
export function Bloom({ name, side, top, size, turn = 0, delay = 0 }: { name: string; side: "l" | "r"; top: string; size: string; turn?: number; delay?: number }) {
  return (
    <img
      className={`cn-bloom cn-bloom--${side}`}
      src={`${BLOOMS}/${name}.webp`}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      style={{ top, width: size, ["--turn" as string]: `${turn}deg`, ["--bd" as string]: `${delay}s` } as CSSProperties}
    />
  );
}

function Section({ id, title, children, blooms, className = "" }: { id?: string; title: string; children: ReactNode; blooms?: ReactNode; className?: string }) {
  return (
    <section id={id} className={`cn-sec ${className}`} data-reveal>
      {blooms}
      <div className="cn-sec__in">
        <h2 className="cn-sec__title">{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** "7:00 pm" */
function timeOf(iso: string) {
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?([AP])M$/i, (_, m: string) => ` ${m.toLowerCase()}m`);
}

const TILTS = [-2.2, 1.6, -1.1, 2.4, -1.8, 1.2, -2.6, 1.9];

export default function Garden({ content, editorPreview, photos, vis }: { content: EventContent; editorPreview: boolean; photos: ImageAsset[]; vis: Record<string, boolean | undefined> }) {
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => s.label.trim());
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => f.question.trim());
  const gifts = content.registryLinks.length > 0 || hasCashGifts(content);
  // People only: the motif colours show under What to wear.
  const entourage = (content.entourage ?? []).some((g) => g.people.some((p) => p.trim()));

  return (
    <>
      {vis.schedule !== false && (schedule.length || editorPreview) ? (
        <Section title={customValue(content, "eveningTitle") || "The evening"} blooms={<Bloom name="peach-a" side="r" top="-1rem" size="clamp(110px, 17cqw, 190px)" turn={-14} />}>
          {schedule.length ? (
            <ol className="cn-cards">
              {schedule.map((s, i) => (
                <li key={s.id} className="cn-place" style={{ ["--tilt" as string]: `${TILTS[i % TILTS.length]}deg`, ["--i" as string]: i } as CSSProperties}>
                  <span className="cn-place__time">{timeOf(s.startTime)}</span>
                  <span className="cn-place__what">{s.label}</span>
                  {s.description ? <span className="cn-place__note">{s.description}</span> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="cn-body cn-hint">Add the evening’s plan under Schedule.</p>
          )}
        </Section>
      ) : null}

      {vis.dress !== false && (dress || swatches.length || editorPreview) ? (
        <Section title="What to wear" blooms={<Bloom name="cosmos" side="l" top="-2rem" size="clamp(140px, 22cqw, 250px)" turn={18} />}>
          {dress ? <p className="cn-hand cn-hand--note">{dress}</p> : <p className="cn-body cn-hint">Add a dress code in this template’s details. Your motif colours show as petals.</p>}
          {swatches.length ? (
            <div className="cn-petals" role="img" aria-label="Motif colours">
              {swatches.map((c, i) => (
                <span key={c + i} className="cn-petal" style={{ ["--c" as string]: c, ["--i" as string]: i } as CSSProperties} />
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      {vis.gallery !== false && photos.length ? (
        <Section title={content.galleries[0]?.title?.trim() || "A few favourites"} className="cn-sec--wide" blooms={<Bloom name="yellow" side="r" top="2rem" size="clamp(130px, 20cqw, 230px)" turn={-10} delay={0.2} />}>
          <div className="cn-wall">
            {photos.map((img, i) => (
              <figure key={img.id ?? i} className="cn-snap" style={{ ["--tilt" as string]: `${TILTS[(i + 3) % TILTS.length]}deg`, ["--i" as string]: i } as CSSProperties}>
                <span className={`cn-tape cn-tape--${i % 3}`} aria-hidden />
                <img src={img.masterUrl} alt={img.alt || ""} loading="lazy" decoding="async" style={{ ...photoFit(img, 0.5, 0.4) }} />
              </figure>
            ))}
          </div>
        </Section>
      ) : null}

      {vis.entourage !== false && entourage ? (
        <Section title={entourageTitle(content)} blooms={<Bloom name="forget" side="l" top="0" size="clamp(110px, 16cqw, 180px)" turn={8} />}>
          <div className="cn-body">
            <EntourageBlock content={{ ...content, motifColors: [] }} heading={false} ink="currentColor" muted="var(--cn-sage-strong)" displayFont="var(--cn-sans)" bodyFont="var(--cn-sans)" />
          </div>
        </Section>
      ) : null}

      {vis.registry !== false && gifts ? (
        <Section title="Gifts" blooms={<Bloom name="magenta" side="r" top="0" size="clamp(80px, 12cqw, 130px)" turn={-18} />}>
          <p className="cn-body">{content.cashGiftNote?.trim() || "Your presence is the best gift. If you’d like to give, here’s how."}</p>
          {content.registryLinks.length ? (
            <div className="cn-links">
              {content.registryLinks.map((r) => (
                <a key={r.id} className="cn-btn cn-btn--small" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                  {r.storeName}
                </a>
              ))}
            </div>
          ) : null}
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <CashGifts
              content={{ ...content, cashGiftNote: "" }}
              look={{ ink: "var(--cn-sage-strong)", muted: "var(--cn-sage-strong)", surface: "#fff", line: "color-mix(in srgb, var(--cn-sage) 30%, transparent)", bodyFont: "var(--cn-sans)", displayFont: "var(--cn-hand)", radius: 14 }}
            />
          </div>
        </Section>
      ) : null}

      {vis.faqs !== false && faqs.length ? (
        <Section title="Good to know" blooms={<Bloom name="peach-b" side="l" top="1rem" size="clamp(100px, 15cqw, 170px)" turn={12} />}>
          <div className="cn-faqs">
            {faqs.map((f) => (
              <div key={f.id} className="cn-faq">
                <p className="cn-faq__q">{f.question}</p>
                <p className="cn-body">{f.answer}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
