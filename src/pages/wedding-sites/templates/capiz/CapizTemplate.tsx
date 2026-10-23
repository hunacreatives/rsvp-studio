import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { Countdown } from "../shared/Countdown";
import { PhotoSlot } from "../shared/PhotoSlot";
import { photosOf, useReveal } from "../shared/reveal";
import { PAPER_GRAIN } from "../shared/stationery";
import { CAPIZ, FLAKE, Motes, Niche, Panes, Sampaguita, STONE } from "./art";
import { dateWords, eventIsOver, firstNames, monogram, receptionMap, splitEntourage, timeOf, timeWords, townOf } from "./content";
import RsvpSill from "./RsvpSill";
import { CAPIZ_CSS } from "./styles";
import { photoFit } from "../shared/photoFit";

/**
 * Capiz (wedding, Premium): a walk through an old Filipino house.
 *  - The window: a shaded room, and a capiz window glowing with the afternoon behind it. On
 *    the published page and the design preview the sashes catch, then slide back into the
 *    wall and the couple's photo is there in daylight; scrolling dissolves the room around
 *    the photo (never enlarging it) and the invitation arrives beside or over it. In the
 *    builder and on the gallery card it rests still (window open, the invitation below).
 *  - Then the house, room by room. Day rooms are lime plaster: the ceremony and reception as
 *    two lit windows, the story in deep recesses, the day, what to wear (the motif as tinted
 *    capiz). Night rooms are narra: the entourage set in a great lit capiz screen, and the
 *    gifts and reply card. The photos run edge to edge in a narra lattice, each one clearing
 *    from capiz as it comes into view.
 *  - It ends on the house's stone base: "Hanggang sa muli" and the monogram.
 * Prefers-reduced-motion keeps everything still.
 */

const PLASTER_URL = "/event-templates/capiz/plaster.webp";
const NARRA_URL = "/event-templates/capiz/narra.webp";
const NARRA_WALL_URL = "/event-templates/capiz/narra-wall.webp";

const isDark = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

/** Which photos (by index) span two columns so every row of the lattice fills: landscapes first. */
function widePicks(imgs: { width?: number; height?: number }[], count: number): Set<number> {
  if (!count) return new Set();
  const all = imgs.map((m, i) => ({ i, land: (m.width ?? 0) > (m.height ?? 0) }));
  return new Set([...all.filter((w) => w.land), ...all.filter((w) => !w.land)].slice(0, count).map((w) => w.i));
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * From the window to the invitation, as you scroll. The scene is tall and its stage sticks:
 * the room, the casing and the capiz dissolve into the warm dark, the photo stays exactly its
 * size (a framed portrait, never enlarged), and the invitation arrives beside it (wide
 * screens) or over it (phones).
 */
function usePartingWall(enabled: boolean, scene: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = scene.current;
    if (!enabled || !el) return;
    const q = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel);
    const walls = [...el.querySelectorAll<HTMLElement>(".cz-wall")];
    const sashes = q(".cz-sashes");
    const photo = q(".cz-photo");
    const dim = q(".cz-photo__shade");
    const words = q(".cz-stage__words");
    let raf = 0;
    let shift = 0;
    // On a wide screen the portrait moves left to make room for the invitation beside it; on a
    // phone it stays where it is and the invitation comes up over it.
    const measure = () => {
      const w = q(".cz-stage")?.clientWidth ?? 0;
      shift = w >= 900 ? w * 0.22 : 0;
      el.toggleAttribute("data-split", shift > 0);
    };
    // The progress goes straight onto the few pieces that change (never a parent of the capiz
    // panes), as opacity and translate only: nothing is restyled or resized while you scroll.
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = clamp01(-r.top / Math.max(1, r.height - window.innerHeight));
      // In order: the capiz goes first, then the wall and the names; once the room has gone
      // the portrait glides aside (wide screens) and the invitation arrives.
      const e = smooth(clamp01((p - 0.38) / 0.3));
      const t = smooth(clamp01((p - 0.5) / 0.3));
      for (const w of walls) w.style.opacity = (1 - smooth(clamp01(p / 0.4))).toFixed(3);
      if (sashes) sashes.style.opacity = (1 - smooth(clamp01(p / 0.16))).toFixed(3);
      if (photo) photo.style.transform = shift ? `translateX(${(-e * shift).toFixed(1)}px)` : "";
      if (dim) dim.style.opacity = shift ? "0" : (t * 0.62).toFixed(3);
      words?.style.setProperty("--t", t.toFixed(3));
      el.toggleAttribute("data-words", t > 0.5);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, scene]);
}

export default function CapizTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced && !editorPreview;
  const pageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLElement>(null);

  // The window opens on the published page and the design preview, unless the guest arrived
  // on a deep link (#rsvp) or asked for less motion.
  const [play] = useState(() => (live || demo) && motion && !(typeof window !== "undefined" && window.location.hash === "#rsvp"));
  const [go, setGo] = useState(false);
  const [giftsOpen, setGiftsOpen] = useState(false);

  const photos = photosOf(content);
  const heroImg = settings.heroImage?.masterUrl ? settings.heroImage : photos[0]?.image;
  const rest = (settings.heroImage?.masterUrl ? photos : photos.slice(1)).map((p) => p.image);
  const storyImgs = rest.slice(0, 2);
  const bandImgs = rest.slice(2);
  const wideD = widePicks(bandImgs, (4 - (bandImgs.length % 4)) % 4);
  const wideM = widePicks(bandImgs, bandImgs.length % 2);

  // Start the sashes once the photo behind them has loaded (or after a moment regardless).
  const heroRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!play) return;
    const start = () => setGo(true);
    const img = heroRef.current;
    if (!img || img.complete) {
      const t = window.setTimeout(start, 350);
      return () => window.clearTimeout(t);
    }
    img.addEventListener("load", start, { once: true });
    const t = window.setTimeout(start, 1800);
    return () => {
      img.removeEventListener("load", start);
      window.clearTimeout(t);
    };
  }, [play]);

  usePartingWall(play, sceneRef);

  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  useReveal(pageRef, motion, [content.entourage?.length, bandImgs.length]);

  const names = firstNames(content);
  const when = dateWords(content.eventDate);
  const town = townOf(content);
  const words = timeWords(content.eventDate);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const recName = customValue(content, "receptionName");
  const recAddress = customValue(content, "receptionAddress");
  const recTime = customValue(content, "receptionTime");
  const recMap = receptionMap(content);
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const { parents, rows } = splitEntourage(content);
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => f.question.trim());
  const travel = content.travelInformation.filter((t) => t.title.trim() || t.body.trim());
  const stay = content.accommodations.filter((a) => a.name.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash;
  const over = !editorPreview && eventIsOver(content.eventDate);
  const vis = settings.sectionVisibility;
  const dark = isDark(theme.background);
  const mono = monogram(content);

  const showVenues = !!(venue || recName || editorPreview);
  const showStory = vis.hostIntro !== false && !!(paragraphs.length || editorPreview);
  const showEnt = vis.entourage !== false && !!(rows.length || editorPreview);
  const showDay = vis.schedule !== false && !!(schedule.length || editorPreview);
  const showDress = vis.dress !== false && !!(dress || swatches.length || editorPreview);
  const showBand = vis.gallery !== false && bandImgs.length > 0;
  const showFaq = vis.faqs !== false && faqs.length > 0;
  const showTravel = vis.travelInformation !== false && travel.length > 0;
  const showStay = vis.accommodations !== false && stay.length > 0;
  const showGifts = vis.registry !== false && gifts;
  const showRsvp = !over && vis.rsvp !== false;

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });

  const vars = {
    ["--cz-bg" as string]: theme.background,
    ["--cz-ink" as string]: theme.ink,
    ["--cz-muted" as string]: theme.muted,
    ["--cz-display" as string]: theme.displayFont,
    ["--cz-body" as string]: theme.bodyFont,
    ["--cz-plaster" as string]: `url("${PLASTER_URL}")`,
    ["--cz-grain" as string]: `url("${PAPER_GRAIN}")`,
    ["--cz-stone" as string]: `url("${STONE}")`,
    ["--cz-flake" as string]: `url("${FLAKE}")`,
    ["--cz-capiz" as string]: `url("${CAPIZ}")`,
    ["--cz-wood" as string]: `url("${NARRA_URL}")`,
    ["--cz-wood-wall" as string]: `url("${NARRA_WALL_URL}")`,
  } as CSSProperties;

  const cls = ["cz-root", gallery ? "cz-gallery" : "", dark ? "cz-dark" : "", motion ? "cz-motion" : "", play ? "cz-play" : "", go ? "cz-go" : ""].filter(Boolean).join(" ");

  const invitation = (
    <div className="cz-full__words">
      {vis.parents !== false && parents.length ? (
        <>
          <p className="cz-whisper">{customValue(content, "parentsLine") || "Together with our parents"}</p>
          <div className="cz-parents">
            {parents.map((g, i) => (
              <div key={g.id}>
                {i > 0 ? <span className="cz-parents__and">and</span> : null}
                {g.people.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
      <p className="cz-full__line">{customValue(content, "invitation") || "we request the honour of your presence at our wedding"}</p>
      {when ? <p className="cz-full__date">{when}</p> : editorPreview ? <p className="cz-full__date cz-hint">Your date</p> : null}
      {words || venue ? <p className="cz-full__at">{[words, venue].filter(Boolean).join(", at ")}</p> : null}
      {vis.countdown !== false && content.eventDate && !over ? <Countdown iso={content.eventDate} live={live || demo || editorPreview} prefix="cz" /> : null}
      {showRsvp ? (
        <button type="button" className="cz-btn cz-btn--light" onClick={toRsvp}>
          {customValue(content, "replyButton") || "Kindly reply"}
        </button>
      ) : null}
    </div>
  );

  return (
    <div className={cls} style={vars}>
      <style>{CAPIZ_CSS}</style>
      {/* Its own element for the scroll reveals: the root's classes change as the window opens. */}
      <div ref={pageRef} className="cz-page">
        {/* The window. With play on, the scene is tall and its stage sticks: as you scroll, the
            room dissolves around the photo and the invitation arrives (usePartingWall). */}
        <section ref={sceneRef} className={`cz-scene${play ? " is-scroll" : ""}`}>
          <div className="cz-stage">
            <div className="cz-photo">
              {heroImg?.masterUrl ? (
                <img
                  ref={heroRef}
                  className="cz-photo__img"
                  src={heroImg.masterUrl}
                  alt={heroImg.alt || ""}
                  loading="eager"
                  decoding="async"
                  style={{ ...photoFit(heroImg, 0.5, 0.45) }}
                />
              ) : editorPreview ? (
                <PhotoSlot image={null} editorPreview className="cz-photo__img cz-photo__img--empty" label="Add your photo" />
              ) : (
                <span className="cz-photo__garden" />
              )}
              <span className="cz-photo__day" aria-hidden />
              {play ? <span className="cz-photo__shade" aria-hidden /> : null}
            </div>

            <div className="cz-sashes" aria-hidden>
              <div className="cz-mover cz-mover--l">
                <div className="cz-sash cz-sash--l">
                  <Panes cols={5} rows={13} seed={1} />
                </div>
              </div>
              <div className="cz-mover cz-mover--r">
                <div className="cz-sash cz-sash--r">
                  <Panes cols={5} rows={13} seed={2} />
                </div>
              </div>
              <span className="cz-sashes__depth" />
            </div>

            {(["t", "l", "r", "b"] as const).map((side) => (
              <div key={side} className={`cz-wall cz-wall--${side}`}>
                <div className="cz-wall__bg" aria-hidden>
                  <span className="cz-wall__glow" />
                  {motion ? <Motes /> : null}
                </div>
                <span className={`cz-case cz-case--${side} cz-wood`} aria-hidden />
                {side === "b" ? (
                  <>
                    <span className="cz-sill cz-wood" aria-hidden />
                    <div className="cz-room__words">
                      {customValue(content, "heroLine") ? (
                        <p className="cz-whisper cz-rise" style={{ ["--d" as string]: "2.3s" }}>
                          {customValue(content, "heroLine")}
                        </p>
                      ) : null}
                      <h1 className={`cz-names cz-rise${names.length ? "" : " cz-hint"}`} style={{ ["--d" as string]: "2.4s" }}>
                        {names.length
                          ? names.map((n, i) => (
                              <span key={i}>
                                {i > 0 ? <span className="cz-amp">{i === names.length - 1 ? "&" : ","}</span> : null}
                                <span className="cz-name">{n}</span>
                              </span>
                            ))
                          : editorPreview
                            ? "Your names"
                            : null}
                      </h1>
                      {town ? (
                        <p className="cz-room__town cz-rise" style={{ ["--d" as string]: "2.8s" }}>
                          {town}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            ))}

            {play ? <div className="cz-stage__words">{invitation}</div> : null}
          </div>
        </section>

        {/* Without the scroll (builder, gallery card, less motion): the invitation on the photo, as its own section */}
        {!play ? (
          <section className="cz-full">
            {heroImg?.masterUrl ? <img className="cz-full__photo" src={heroImg.masterUrl} alt="" aria-hidden decoding="async" style={{ ...photoFit(heroImg, 0.5, 0.45) }} /> : null}
            <span className="cz-full__shade" aria-hidden />
            <div data-reveal>{invitation}</div>
          </section>
        ) : null}

        <main>
          {/* Day: ceremony and reception, the story */}
          {showVenues || showStory ? (
            <div className="cz-day-room">
              {showVenues ? (
                <section className="cz-sec cz-venues">
                  <article className="cz-venue" data-reveal>
                    <Niche arched seed={3} />
                    <p className="cz-whisper">The ceremony</p>
                    <h3 className={`cz-venue__name${venue ? "" : " cz-hint"}`}>{venue || "Your church or venue"}</h3>
                    {address ? <p className="cz-venue__addr">{address}</p> : null}
                    {words ? <p className="cz-venue__time">{words}</p> : null}
                    <VenueLinks content={content} font="var(--cz-body)" color="var(--cz-ink)" size={15} />
                  </article>
                  {recName || editorPreview ? (
                    <article className="cz-venue" data-reveal style={{ ["--i" as string]: 1 }}>
                      <Niche seed={4} />
                      <p className="cz-whisper">The reception</p>
                      <h3 className={`cz-venue__name${recName ? "" : " cz-hint"}`}>{recName || "Add your reception in the Capiz details"}</h3>
                      {recAddress ? <p className="cz-venue__addr">{recAddress}</p> : null}
                      {recTime ? <p className="cz-venue__time">{recTime}</p> : null}
                      {recMap ? (
                        <a className="cz-venue__map" href={recMap} target="_blank" rel="noopener noreferrer">
                          Open in Maps
                        </a>
                      ) : null}
                    </article>
                  ) : null}
                </section>
              ) : null}

              {showStory ? (
                <section className="cz-sec cz-story">
                  {storyImgs.length || editorPreview ? (
                    <div className="cz-story__photos" data-reveal>
                      <PhotoSlot image={storyImgs[0]} editorPreview={editorPreview} className="cz-recess cz-recess--arch" />
                      <PhotoSlot image={storyImgs[1]} editorPreview={editorPreview} className="cz-recess cz-recess--low" />
                    </div>
                  ) : null}
                  <div className="cz-story__text" data-reveal style={{ ["--i" as string]: 1 }}>
                    <h2 className="cz-title cz-title--left">{customValue(content, "storyTitle") || "Our story"}</h2>
                    {paragraphs.length ? (
                      paragraphs.map((p, i) => (
                        <p key={i} className={`cz-text${i === 0 ? " cz-text--lead" : ""}`}>
                          {p}
                        </p>
                      ))
                    ) : (
                      <p className="cz-text cz-hint">Your story, or a note to your guests, goes here.</p>
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {/* Night: the entourage in a great lit capiz screen */}
          {showEnt ? (
            <div className="cz-night-room">
              <section className="cz-sec cz-ent">
                <h2 className="cz-title" data-reveal>
                  {customValue(content, "entourageTitle") || "The entourage"}
                </h2>
                {rows.length ? (
                  <div className="cz-grid cz-wood" data-reveal>
                    <span className="cz-grid__flicker" aria-hidden />
                    {rows.map((row, r) => (
                      <div key={r} className={`cz-grid__row cz-grid__row--${row.kind}`} style={{ ["--n" as string]: row.cells.length }}>
                        {row.cells.map((c, i) => (
                          <div key={c.id} className="cz-cell" style={{ ["--i" as string]: r * 2 + i, ["--x" as string]: `${(r * 97 + i * 53) % 320}px`, ["--y" as string]: `${(r * 61 + i * 113) % 320}px` }}>
                            <p className="cz-cell__t">{c.title}</p>
                            <ul className={`cz-cell__names${row.kind === "principal" && c.people.length > 3 ? " cz-cell__names--cols" : ""}`}>
                              {c.people.map((p, j) => (
                                <li key={j}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="cz-text cz-hint" style={{ textAlign: "center" }}>
                    Add your sponsors and entourage under Entourage &amp; motif. Parents go in the invitation; everyone else is set here.
                  </p>
                )}
              </section>
            </div>
          ) : null}

          {/* Day: the day, what to wear */}
          {showDay || showDress ? (
            <div className="cz-day-room">
              {showDay ? (
                <section className="cz-sec cz-schedule">
                  <h2 className="cz-title" data-reveal>
                    {customValue(content, "dayTitle") || "The day"}
                  </h2>
                  {schedule.length ? (
                    <ol className="cz-dayline">
                      {schedule.map((s, i) => (
                        <li key={s.id} data-reveal style={{ ["--i" as string]: i }}>
                          <span className="cz-dayline__t">{timeOf(s.startTime)}</span>
                          <span className="cz-dayline__w">
                            {s.label}
                            {s.description ? <em>{s.description}</em> : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="cz-text cz-hint" style={{ textAlign: "center" }}>
                      Add the order of the day under Schedule.
                    </p>
                  )}
                </section>
              ) : null}

              {showDress ? (
                <section className="cz-sec cz-narrow cz-attire" data-reveal>
                  <h2 className="cz-title">What to wear</h2>
                  {dress ? <p className="cz-text">{dress}</p> : <p className="cz-text cz-hint">Add your dress code in the Capiz details. Your motif colours show as tinted panes.</p>}
                  {swatches.length ? (
                    <div className="cz-motif cz-wood" role="img" aria-label="Motif colours">
                      {swatches.map((c, i) => (
                        <span key={c + i} className="cz-motif__pane" style={{ ["--c" as string]: c }} />
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : null}

          {/* The photos, edge to edge in a narra lattice */}
          {showBand ? (
            <section className="cz-band cz-wood" aria-label={content.galleries[0]?.title?.trim() || "Photos"}>
              {bandImgs.map((img, i) => (
                <div key={img.id ?? i} className={`cz-band__pane${wideD.has(i) ? " is-wide-d" : ""}${wideM.has(i) ? " is-wide-m" : ""}`} data-reveal style={{ ["--i" as string]: i % 4, ["--x" as string]: `${(i * 89) % 320}px`, ["--y" as string]: `${(i * 137) % 320}px` }}>
                  <PhotoSlot image={img} className="cz-band__photo" />
                </div>
              ))}
            </section>
          ) : null}

          {/* Day: good to know */}
          {showFaq || showTravel || showStay ? (
            <div className="cz-day-room">
              <section className="cz-sec cz-know">
                <h2 className="cz-title" data-reveal>
                  Good to know
                </h2>
                <div className="cz-know__grid">
                  {showFaq
                    ? faqs.map((f) => (
                        <div key={f.id} className="cz-item" data-reveal>
                          <p className="cz-item__q">{f.question}</p>
                          <p className="cz-text">{f.answer}</p>
                        </div>
                      ))
                    : null}
                  {showTravel
                    ? travel.map((t) => (
                        <div key={t.id} className="cz-item" data-reveal>
                          {t.title ? <p className="cz-item__q">{t.title}</p> : null}
                          <p className="cz-text">{t.body}</p>
                        </div>
                      ))
                    : null}
                  {showStay
                    ? stay.map((a) => (
                        <div key={a.id} className="cz-item" data-reveal>
                          <p className="cz-item__q">
                            {a.bookingUrl ? (
                              <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer">
                                {a.name}
                              </a>
                            ) : (
                              a.name
                            )}
                          </p>
                          {a.addressLine ? <p className="cz-text">{a.addressLine}</p> : null}
                          {a.notes ? <p className="cz-text cz-soft">{a.notes}</p> : null}
                        </div>
                      ))
                    : null}
                </div>
              </section>
            </div>
          ) : null}

          {/* Night: gifts and the reply card on the sill */}
          {showGifts || showRsvp || over ? (
            <div className="cz-night-room">
              {showGifts ? (
                <section className="cz-sec cz-narrow cz-gifts" data-reveal>
                  <h2 className="cz-title">Gifts</h2>
                  <p className="cz-text">{content.cashGiftNote?.trim() || "Your presence is the greatest gift. Should you wish to give, here’s how."}</p>
                  {content.registryLinks.length ? (
                    <div className="cz-links">
                      {content.registryLinks.map((r) => (
                        <a key={r.id} className="cz-btn cz-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                          {r.storeName}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {cash ? (
                    <div className={`cz-gift${giftsOpen ? " is-open" : ""}`}>
                      <div className="cz-gift__frame">
                        <div className="cz-gift__inside" inert={!giftsOpen}>
                          <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "#2a211b", muted: "#6f6253", surface: "#fbf8f1", line: "rgba(42,33,27,.18)", bodyFont: "var(--cz-body)", displayFont: "var(--cz-body)", radius: 2 }} />
                        </div>
                        <div className="cz-gift__sash cz-wood" aria-hidden>
                          <Panes cols={5} rows={4} seed={7} />
                        </div>
                      </div>
                      <button type="button" className="cz-btn cz-btn--line cz-gift__btn" aria-expanded={giftsOpen} onClick={() => setGiftsOpen((o) => !o)}>
                        {giftsOpen ? "Close" : customValue(content, "giftButton") || "View gift details"}
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {over ? (
                <section className="cz-sec cz-narrow" data-reveal>
                  <h2 className="cz-title">Maraming salamat po</h2>
                  <p className="cz-text">{customValue(content, "afterParty") || `Thank you for celebrating with ${names.join(" & ") || "us"}.`}</p>
                </section>
              ) : showRsvp ? (
                <div className="cz-sec cz-rsvp-wrap">
                  <span className="cz-lamp" aria-hidden />
                  <RsvpSill content={content} editorPreview={editorPreview} sample={!live && !editorPreview} />
                </div>
              ) : null}
            </div>
          ) : null}
        </main>

        {/* The stone base */}
        <footer className="cz-base">
          <p className="cz-whisper">{customValue(content, "closing") || "Hanggang sa muli"}</p>
          {mono ? <p className="cz-mono">{mono}</p> : null}
          <Sampaguita size={22} />
          {credit.show ? (
            <p className="cz-credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
