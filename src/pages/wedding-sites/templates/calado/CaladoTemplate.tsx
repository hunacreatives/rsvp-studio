import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { photosOf, useReveal } from "../shared/reveal";
import { Cross, Hoop, Skein, StitchedName } from "./art";
import { babyEvent, eventIsOver, godparents, initials, longDate, nameLines, receptionMap, streamTimes, timeOf, timeWords, townOf, wordsFor } from "./content";
import RsvpCard from "./RsvpCard";
import { CALADO_CSS } from "./styles";

/**
 * Calado (baby: christening, first birthday, both, or a dedication; the host picks which).
 * Named for the drawn-thread embroidery on a binyag gown. The whole page is unbleached
 * cotton; the baby's name is embroidered in satin stitch inside a beech hoop.
 *  - The opening (published page and design preview): the hoop is set down on the cloth,
 *    the name stitches in left to right with a needle riding ahead, then a running stitch
 *    underneath, and the day fades up. Builder and gallery card: the finished hoop.
 *  - Then a note from the parents, the ceremony and the celebration joined by a running
 *    stitch, the godparents as a stitched sampler (Ninongs | Ninangs), the program, the
 *    first twelve months as a wall of small hoops, what to wear (the motif as floss),
 *    the livestream for family abroad (in their own time zone), gifts behind a tap, good
 *    to know, the reply card (adults and kids), and "Maraming salamat po".
 */

// The page's cloth is the gentle weave (text sits on it); the hoop's cotton keeps the full one.
const LINEN = "/event-templates/calado/linen.webp";
const LINEN_SOFT = "/event-templates/calado/linen-soft.webp";
const ACCENT: Record<string, string> = { "calado-cotton": "#6f8aa0", "calado-rose": "#b4867f" };
const HOOP_SIZES = ["l", "m", "s", "m", "s", "l", "s", "l", "m", "l", "m", "s"];

export default function CaladoTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced && !editorPreview;
  const play = (live || demo) && motion;
  const pageRef = useRef<HTMLDivElement>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);

  const kind = babyEvent(content);
  const w = wordsFor(kind);
  const lines = nameLines(content);
  const name = (content.hosts[0]?.name ?? "").trim();
  const photos = photosOf(content);
  const vis = settings.sectionVisibility;
  const when = longDate(content.eventDate);
  const town = townOf(content);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const time = timeWords(content.eventDate);
  const recName = customValue(content, "receptionName");
  const recAddress = customValue(content, "receptionAddress");
  const recTime = customValue(content, "receptionTime");
  const recMap = receptionMap(content);
  const parents = customValue(content, "parents");
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => s.label.trim());
  const { ninongs, ninangs, others } = godparents(content);
  const sponsors = ninongs.length + ninangs.length + others.length > 0;
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const stream = customValue(content, "livestreamUrl");
  const streamAt = streamTimes(content.eventDate);
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash;
  const over = !editorPreview && eventIsOver(content.eventDate);
  const accent = ACCENT[settings.paletteId] ?? ACCENT["calado-cotton"];

  useReveal(pageRef, motion && (live || demo), [photos.length, ninongs.length + ninangs.length]);
  useEffect(() => {
    if (zoom === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const vars = {
    ["--cl-bg" as string]: theme.background,
    ["--cl-ink" as string]: theme.ink,
    ["--cl-muted" as string]: theme.muted,
    ["--cl-thread" as string]: accent,
    ["--cl-script" as string]: theme.displayFont,
    ["--cl-serif" as string]: theme.bodyFont,
    ["--cl-linen" as string]: `url("${LINEN_SOFT}")`,
    ["--cl-linen-full" as string]: `url("${LINEN}")`,
  } as CSSProperties;
  const cls = ["cl-root", play ? "cl-play" : "", gallery ? "cl-gallery" : ""].filter(Boolean).join(" ");
  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });

  return (
    <div className={cls} style={vars}>
      <style>{CALADO_CSS}</style>
      <div ref={pageRef} className="cl-page">
        {/* The hoop */}
        {/* The day fades up as the running stitch starts (art.tsx: 0.9s, then 1.85s per line). */}
        <header className="cl-hero" style={{ ["--words-at" as string]: `${(0.9 + Math.max(1, lines.length) * 1.85).toFixed(2)}s` } as CSSProperties}>
          <Hoop className="cl-hero__hoop">
            <p className="cl-eyebrow">{customValue(content, "heroLine") || w.eyebrow}</p>
            {lines.length ? <StitchedName lines={lines} play={play} label={name} /> : <p className="cl-hint cl-name-hint">{editorPreview ? "Your baby’s name" : ""}</p>}
          </Hoop>
          <div className="cl-hero__words">
            <p className="cl-hero__date">
              <span className="cl-hero__kind">{w.label}</span>
              {when ? <span className="cl-hero__when">{when}</span> : null}
              {town ? <span className="cl-hero__town">{town}</span> : null}
            </p>
            {parents ? <p className="cl-hero__parents">{parents}</p> : null}
            {vis.rsvp !== false && !over ? (
              <button type="button" className="cl-btn cl-btn--line cl-hero__btn" onClick={toRsvp}>
                {customValue(content, "replyButton") || "Kindly reply"}
              </button>
            ) : null}
          </div>
        </header>

        <main>
          {/* A note from the parents */}
          {vis.hostIntro !== false && (paragraphs.length || editorPreview) ? (
            <section className="cl-sec cl-narrow" data-reveal>
              <Cross className="cl-sec__mark" />
              {paragraphs.length ? paragraphs.map((p, i) => <p key={i} className={`cl-text${i === 0 ? " cl-text--lead" : ""}`}>{p}</p>) : <p className="cl-text cl-hint">A note from the parents goes here.</p>}
            </section>
          ) : null}

          {/* The ceremony and the celebration, joined by a running stitch */}
          {venue || recName || editorPreview ? (
            <section className="cl-sec cl-places">
              <article className="cl-place" data-reveal>
                <p className="cl-kicker">{w.ceremony}</p>
                <h3 className={`cl-place__name${venue ? "" : " cl-hint"}`}>{venue || "Your church or venue"}</h3>
                {address ? <p className="cl-place__addr">{address}</p> : null}
                {time ? <p className="cl-place__time">{time}</p> : null}
                <VenueLinks content={content} font="var(--cl-serif)" color="var(--cl-ink)" size={15} />
              </article>
              {recName || (editorPreview && kind !== "birthday") ? (
                <>
                  <span className="cl-places__stitch" aria-hidden />
                  <article className="cl-place" data-reveal style={{ ["--i" as string]: 1 } as CSSProperties}>
                    <p className="cl-kicker">{w.party}</p>
                    <h3 className={`cl-place__name${recName ? "" : " cl-hint"}`}>{recName || "Add the celebration in the Calado details"}</h3>
                    {recAddress ? <p className="cl-place__addr">{recAddress}</p> : null}
                    {recTime ? <p className="cl-place__time">{recTime}</p> : null}
                    {recMap ? (
                      <a className="cl-place__map" href={recMap} target="_blank" rel="noopener noreferrer">
                        Open in Maps
                      </a>
                    ) : null}
                  </article>
                </>
              ) : null}
            </section>
          ) : null}

          {/* The godparents, as a stitched sampler */}
          {vis.entourage !== false && (sponsors || editorPreview) ? (
            <section className="cl-sec">
              <h2 className="cl-title" data-reveal>
                {customValue(content, "sponsorsTitle") || w.sponsors}
              </h2>
              {sponsors ? (
                <div className="cl-sampler" data-reveal>
                  {ninongs.length || ninangs.length ? (
                    <div className={`cl-sampler__pair${ninongs.length && ninangs.length ? "" : " is-one"}`}>
                      {ninongs.length ? (
                        <div className="cl-sampler__col">
                          <p className="cl-kicker">Ninong</p>
                          <ul>
                            {ninongs.map((n, i) => (
                              <li key={i} style={{ ["--i" as string]: Math.floor(i / 4) } as CSSProperties}>
                                {n}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {ninongs.length && ninangs.length ? <span className="cl-sampler__seam" aria-hidden /> : null}
                      {ninangs.length ? (
                        <div className="cl-sampler__col">
                          <p className="cl-kicker">Ninang</p>
                          <ul>
                            {ninangs.map((n, i) => (
                              <li key={i} style={{ ["--i" as string]: Math.floor(i / 4) } as CSSProperties}>
                                {n}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {others.map((g) => (
                    <div key={g.id} className="cl-sampler__group">
                      <p className="cl-kicker">{g.title}</p>
                      <ul className="cl-sampler__list">
                        {g.people.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {initials(content) ? <p className="cl-sampler__initials">{initials(content)}</p> : null}
                </div>
              ) : (
                <p className="cl-text cl-hint" style={{ textAlign: "center" }}>
                  Add the godparents under Entourage &amp; motif: a Ninongs group and a Ninangs group, one name per line.
                </p>
              )}
            </section>
          ) : null}

          {/* The program */}
          {vis.schedule !== false && (schedule.length || editorPreview) ? (
            <section className="cl-sec cl-narrow">
              <h2 className="cl-title" data-reveal>
                {customValue(content, "programTitle") || "The program"}
              </h2>
              {schedule.length ? (
                <ol className="cl-program">
                  {schedule.map((s, i) => (
                    <li key={s.id} data-reveal style={{ ["--i" as string]: i } as CSSProperties}>
                      <span className="cl-program__t">{timeOf(s.startTime)}</span>
                      <span className="cl-program__w">
                        {s.label}
                        {s.description ? <em>{s.description}</em> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="cl-text cl-hint">Add the day’s program under Schedule.</p>
              )}
            </section>
          ) : null}

          {/* The first twelve months, a wall of small hoops */}
          {vis.gallery !== false && (photos.length || editorPreview) ? (
            <section className="cl-sec cl-sec--wide">
              <h2 className="cl-title" data-reveal>
                {content.galleries[0]?.title?.trim() || "The first twelve months"}
              </h2>
              {photos.length ? (
                <ul className="cl-wall">
                  {photos.slice(0, 12).map((p, i) => (
                    <li key={p.id} className={`cl-wall__item cl-wall__item--${HOOP_SIZES[i % HOOP_SIZES.length]}`} data-reveal style={{ ["--i" as string]: i % 3 } as CSSProperties}>
                      <button type="button" className="cl-mini" onClick={() => !editorPreview && setZoom(i)} aria-label={p.caption ? `Open the ${p.caption} photo` : "Open the photo"}>
                        <span className="cl-mini__ring" aria-hidden />
                        <img src={p.image.masterUrl} alt={p.image.alt || p.caption || ""} loading="lazy" decoding="async" style={{ objectPosition: `${(p.image.focalPoint?.x ?? 0.5) * 100}% ${(p.image.focalPoint?.y ?? 0.4) * 100}%` }} />
                      </button>
                      {p.caption ? <span className="cl-wall__cap">{p.caption}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cl-text cl-hint" style={{ textAlign: "center" }}>
                  Add up to twelve photos under Photos. Give each a caption like “3 months” and it’s stitched under its hoop.
                </p>
              )}
            </section>
          ) : null}

          {/* What to wear: the motif as floss */}
          {vis.dress !== false && (dress || swatches.length || editorPreview) ? (
            <section className="cl-sec cl-narrow" data-reveal>
              <h2 className="cl-title">What to wear</h2>
              {dress ? <p className="cl-text">{dress}</p> : <p className="cl-text cl-hint">Add a dress code in the Calado details. Your motif colours show as embroidery floss.</p>}
              {swatches.length ? (
                <div className="cl-skeins" role="img" aria-label="Motif colours">
                  {swatches.map((c, i) => (
                    <Skein key={c + i} color={c} index={i} />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {/* The livestream, for family abroad */}
          {vis.livestream !== false && stream ? (
            <section className="cl-sec cl-narrow" data-reveal>
              <div className="cl-card cl-stream">
                <p className="cl-kicker">For family far away</p>
                <h2 className="cl-title cl-title--small">Watch it live</h2>
                {streamAt ? (
                  <p className="cl-text">
                    {streamAt.manila} in Manila
                    {streamAt.local ? <span className="cl-stream__local">{streamAt.local}</span> : null}
                  </p>
                ) : null}
                <a className="cl-btn" href={/^https?:\/\//i.test(stream) ? stream : undefined} target="_blank" rel="noopener noreferrer">
                  {customValue(content, "livestreamButton") || "Open the livestream"}
                </a>
              </div>
            </section>
          ) : null}

          {/* Gifts, behind a tap */}
          {vis.registry !== false && gifts ? (
            <section className="cl-sec cl-narrow" data-reveal>
              <h2 className="cl-title">Gifts</h2>
              <p className="cl-text">{content.cashGiftNote?.trim() || "Your presence is the best gift. Should you wish to give, a little something for baby’s future is welcome."}</p>
              {content.registryLinks.length ? (
                <div className="cl-links">
                  {content.registryLinks.map((r) => (
                    <a key={r.id} className="cl-btn cl-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                      {r.storeName}
                    </a>
                  ))}
                </div>
              ) : null}
              {cash ? (
                giftsOpen ? (
                  <div className="cl-gifts">
                    <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "var(--cl-ink)", muted: "var(--cl-muted)", surface: "#fdfbf7", line: "color-mix(in srgb, var(--cl-ink) 16%, transparent)", bodyFont: "var(--cl-serif)", displayFont: "var(--cl-serif)", radius: 4 }} />
                  </div>
                ) : (
                  <button type="button" className="cl-btn cl-btn--line" onClick={() => setGiftsOpen(true)}>
                    {customValue(content, "giftButton") || "View gift details"}
                  </button>
                )
              ) : null}
            </section>
          ) : null}

          {/* Good to know */}
          {vis.faqs !== false && faqs.length ? (
            <section className="cl-sec cl-narrow">
              <h2 className="cl-title" data-reveal>
                Good to know
              </h2>
              {faqs.map((f) => (
                <div key={f.id} className="cl-faq" data-reveal>
                  <p className="cl-faq__q">{f.question}</p>
                  <p className="cl-text">{f.answer}</p>
                </div>
              ))}
            </section>
          ) : null}

          {/* The reply card */}
          {over ? (
            <section className="cl-sec cl-narrow" data-reveal>
              <h2 className="cl-title">Maraming salamat po</h2>
              <p className="cl-text">{customValue(content, "afterParty") || `Thank you for celebrating ${lines[0] ?? "our little one"} with us.`}</p>
            </section>
          ) : vis.rsvp !== false ? (
            <section className="cl-sec cl-narrow">
              <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} />
            </section>
          ) : null}
        </main>

        <footer className="cl-foot">
          <p className="cl-foot__thanks">{customValue(content, "closing") || "Maraming salamat po"}</p>
          {initials(content) ? <p className="cl-foot__initials">{initials(content)}</p> : null}
          {credit.show ? (
            <p className="cl-credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
            </p>
          ) : null}
        </footer>
      </div>

      {zoom !== null && photos[zoom] ? (
        <div className="cl-zoom" role="dialog" aria-label={photos[zoom].caption || "Photo"} onClick={() => setZoom(null)}>
          <img src={photos[zoom].image.masterUrl} alt={photos[zoom].image.alt || ""} />
          {photos[zoom].caption ? <p>{photos[zoom].caption}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
