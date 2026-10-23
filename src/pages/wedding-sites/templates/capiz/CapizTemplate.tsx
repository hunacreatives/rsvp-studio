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
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";

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
  // The builder keeps empty items on the page (so one just added can be typed into) and every
  // section with its "+ Add …", in the house's fixed order: its rooms can be hidden, not moved.
  const ed = siteEdit(editorPreview);
  const { parents, rows } = splitEntourage(content, editorPreview);
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => editorPreview || f.question.trim());
  const travel = content.travelInformation.filter((t) => editorPreview || t.title.trim() || t.body.trim());
  const stay = content.accommodations.filter((a) => editorPreview || a.name.trim());
  const cash = hasCashGifts(content);
  const itemOf = new Map(photos.map((p) => [p.image, p.id]));
  const bandSlots = editorPreview && photos.length < 12 ? [...bandImgs, null] : bandImgs;
  const hosts = content.hosts.map((h) => ({ id: h.id, full: h.name, first: h.name.trim().split(/\s+/)[0] ?? "" })).filter((h) => editorPreview || h.first);
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
  const showBand = vis.gallery !== false && bandSlots.length > 0;
  const showFaq = vis.faqs !== false && (faqs.length > 0 || editorPreview);
  const showTravel = vis.travelInformation !== false && (travel.length > 0 || editorPreview);
  const showStay = vis.accommodations !== false && (stay.length > 0 || editorPreview);
  const showGifts = vis.registry !== false && (gifts || editorPreview);
  const KNOW = ["faqs", "travelInformation", "accommodations"];
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
          <Field as="p" className="cz-whisper" path="custom.parentsLine" value={customValue(content, "parentsLine")} fallback="Together with our parents" placeholder="" editor={editorPreview} />
          <div className="cz-parents" {...ed.list("entourage")}>
            {parents.map((g, i) => (
              <div key={g.id} {...ed.item(g.id)}>
                {i > 0 ? <span className="cz-parents__and">and</span> : null}
                {g.people.map((p, j) => (
                  <Field key={j} as="p" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                ))}
                <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={editorPreview} />
              </div>
            ))}
          </div>
        </>
      ) : null}
      <Field as="p" className="cz-full__line" path="custom.invitation" value={customValue(content, "invitation")} fallback="we request the honour of your presence at our wedding" placeholder="" editor={editorPreview} multiline />
      {when ? <p className="cz-full__date">{when}</p> : editorPreview ? <p className="cz-full__date cz-hint">Your date</p> : null}
      {words || venue ? <p className="cz-full__at">{[words, venue].filter(Boolean).join(", at ")}</p> : null}
      {vis.countdown !== false && content.eventDate && !over ? <Countdown iso={content.eventDate} live={live || demo || editorPreview} prefix="cz" /> : null}
      {showRsvp ? (
        <button type="button" className="cz-btn cz-btn--light" onClick={ed.on ? undefined : toRsvp}>
          <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Kindly reply" placeholder="" editor={editorPreview} />
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
                      <Field as="p" className="cz-whisper cz-rise" style={{ ["--d" as string]: "2.3s" }} path="custom.heroLine" value={customValue(content, "heroLine")} placeholder="A small line above your names" editor={editorPreview} />
                      <h1 className={`cz-names cz-rise${hosts.length ? "" : " cz-hint"}`} style={{ ["--d" as string]: "2.4s" }} {...ed.list("hosts")}>
                        {hosts.length
                          ? hosts.map((h, i) => (
                              <span key={h.id} {...ed.item(h.id)}>
                                {i > 0 ? <span className="cz-amp">{i === hosts.length - 1 ? "&" : ","}</span> : null}
                                <Field className="cz-name" path="name" value={h.full} placeholder="Name" editor={editorPreview}>
                                  {h.first}
                                </Field>
                              </span>
                            ))
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
                    <Field as="h3" className="cz-venue__name" path="primaryLocation.name" value={venue} placeholder="Your church or venue" editor={editorPreview} />
                    <Field as="p" className="cz-venue__addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={editorPreview} />
                    {words ? <p className="cz-venue__time">{words}</p> : null}
                    <VenueLinks content={content} font="var(--cz-body)" color="var(--cz-ink)" size={15} />
                  </article>
                  {recName || editorPreview ? (
                    <article className="cz-venue" data-reveal style={{ ["--i" as string]: 1 }}>
                      <Niche seed={4} />
                      <p className="cz-whisper">The reception</p>
                      <Field as="h3" className="cz-venue__name" path="custom.receptionName" value={recName} placeholder="Reception venue, if it’s elsewhere" editor={editorPreview} />
                      <Field as="p" className="cz-venue__addr" path="custom.receptionAddress" value={recAddress} placeholder="Address" editor={editorPreview} />
                      <Field as="p" className="cz-venue__time" path="custom.receptionTime" value={recTime} placeholder="Time, e.g. half past four" editor={editorPreview} />
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
                <section className="cz-sec cz-story" {...ed.section("hostIntro")}>
                  {storyImgs.length || editorPreview ? (
                    <div className="cz-story__photos" data-reveal>
                      <PhotoSlot image={storyImgs[0]} editorPreview={editorPreview} className="cz-recess cz-recess--arch" />
                      <PhotoSlot image={storyImgs[1]} editorPreview={editorPreview} className="cz-recess cz-recess--low" />
                    </div>
                  ) : null}
                  <div className="cz-story__text" data-reveal style={{ ["--i" as string]: 1 }}>
                    <Field as="h2" className="cz-title cz-title--left" path="custom.storyTitle" value={customValue(content, "storyTitle")} fallback="Our story" placeholder="" editor={editorPreview} />
                    {paragraphs.length ? (
                      paragraphs.map((p, i) => <Field key={i} as="p" className={`cz-text${i === 0 ? " cz-text--lead" : ""}`} path={`story#${i}`} value={p} placeholder="" editor={editorPreview} multiline />)
                    ) : (
                      <Field as="p" className="cz-text cz-text--lead" path="story#0" value="" placeholder="Your story, or a note to your guests, in your own words." editor={editorPreview} multiline />
                    )}
                  </div>
                </section>
              ) : vis.hostIntro === false ? (
                <HiddenSection k="hostIntro" label="Our story" editor={editorPreview} />
              ) : null}
            </div>
          ) : null}

          {/* Night: the entourage in a great lit capiz screen */}
          {showEnt ? (
            <div className="cz-night-room">
              <section className="cz-sec cz-ent" {...ed.section("entourage")}>
                <Field as="h2" className="cz-title" data-reveal path="custom.entourageTitle" value={customValue(content, "entourageTitle")} fallback="The entourage" placeholder="" editor={editorPreview} />
                {rows.length ? (
                  <div className="cz-grid cz-wood" data-reveal {...ed.list("entourage")}>
                    <span className="cz-grid__flicker" aria-hidden />
                    {rows.map((row, r) => (
                      <div key={r} className={`cz-grid__row cz-grid__row--${row.kind}`} style={{ ["--n" as string]: row.cells.length }}>
                        {row.cells.map((c, i) => (
                          <div key={c.id} {...ed.item(c.id)} className="cz-cell" style={{ ["--i" as string]: r * 2 + i, ["--x" as string]: `${(r * 97 + i * 53) % 320}px`, ["--y" as string]: `${(r * 61 + i * 113) % 320}px` }}>
                            <Field as="p" className="cz-cell__t" path="title" value={c.raw} placeholder="Group, e.g. Principal Sponsors" editor={editorPreview}>
                              {c.title}
                            </Field>
                            <ul className={`cz-cell__names${row.kind === "principal" && c.people.length > 3 ? " cz-cell__names--cols" : ""}`}>
                              {c.people.map((p, j) => (
                                <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                              ))}
                            </ul>
                            <AddItem list={`entourage:${c.id}:people`} label="Add a name" editor={editorPreview} className="cz-add" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
                <AddItem list="entourage" label={rows.length ? "Add a group" : "Add your sponsors and entourage"} editor={editorPreview} className="cz-add cz-add--center" />
              </section>
            </div>
          ) : vis.entourage === false ? (
            <HiddenSection k="entourage" label="Entourage" editor={editorPreview} />
          ) : null}

          {/* Day: the day, what to wear */}
          {showDay || showDress || ed.on ? (
            <div className="cz-day-room">
              {showDay ? (
                <section className="cz-sec cz-schedule" {...ed.section("schedule")}>
                  <Field as="h2" className="cz-title" data-reveal path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="The day" placeholder="" editor={editorPreview} />
                  {schedule.length ? (
                    <ol className="cz-dayline" {...ed.list("schedule")}>
                      {schedule.map((s, i) => (
                        <li key={s.id} {...ed.item(s.id)} data-reveal style={{ ["--i" as string]: i }}>
                          <span className="cz-dayline__t">{timeOf(s.startTime) || (editorPreview ? "Time" : "")}</span>
                          <span className="cz-dayline__w">
                            <Field path="label" value={s.label} placeholder="What’s happening" editor={editorPreview} />
                            {s.description ? <Field as="em" path="description" value={s.description} placeholder="" editor={editorPreview} multiline /> : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  <AddItem list="schedule" label={schedule.length ? "Add to the day" : "Add the order of the day"} editor={editorPreview} className="cz-add cz-add--center" />
                </section>
              ) : vis.schedule === false ? (
                <HiddenSection k="schedule" label="The day" editor={editorPreview} />
              ) : null}

              {showDress ? (
                <section className="cz-sec cz-narrow cz-attire" data-reveal {...ed.section("dress")}>
                  <h2 className="cz-title">What to wear</h2>
                  <Field as="p" className="cz-text" path="custom.dressCode" value={dress} placeholder="Your dress code. Your motif colours show as tinted panes." editor={editorPreview} multiline />
                  {swatches.length ? (
                    <div className="cz-motif cz-wood" role="img" aria-label="Motif colours">
                      {swatches.map((c, i) => (
                        <span key={c + i} className="cz-motif__pane" style={{ ["--c" as string]: c }} />
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : vis.dress === false ? (
                <HiddenSection k="dress" label="What to wear" editor={editorPreview} />
              ) : null}
            </div>
          ) : null}

          {/* The photos, edge to edge in a narra lattice */}
          {showBand ? (
            <section className="cz-band cz-wood" aria-label={content.galleries[0]?.title?.trim() || "Photos"} {...ed.section("gallery")} {...ed.list("gallery")}>
              {bandSlots.map((img, i) => (
                <div
                  key={img?.id ?? `add-${i}`}
                  {...(img && itemOf.get(img) ? ed.item(itemOf.get(img)!) : {})}
                  className={`cz-band__pane${wideD.has(i) ? " is-wide-d" : ""}${wideM.has(i) ? " is-wide-m" : ""}`}
                  data-reveal
                  style={{ ["--i" as string]: i % 4, ["--x" as string]: `${(i * 89) % 320}px`, ["--y" as string]: `${(i * 137) % 320}px` }}
                >
                  <PhotoSlot image={img} editorPreview={editorPreview} className="cz-band__photo" />
                </div>
              ))}
            </section>
          ) : vis.gallery === false ? (
            <HiddenSection k="gallery" label="Photos" editor={editorPreview} />
          ) : null}

          {/* Day: good to know */}
          {showFaq || showTravel || showStay ? (
            <div className="cz-day-room">
              <section className="cz-sec cz-know" {...ed.section("faqs", KNOW)}>
                <h2 className="cz-title" data-reveal>
                  Good to know
                </h2>
                <div className="cz-know__grid">
                  {showFaq ? (
                    <div {...ed.list("faqs")} style={{ display: "contents" }}>
                      {faqs.map((f) => (
                        <div key={f.id} {...ed.item(f.id)} className="cz-item" data-reveal>
                          <Field as="p" className="cz-item__q" path="question" value={f.question} placeholder="A question guests ask" editor={editorPreview} />
                          <Field as="p" className="cz-text" path="answer" value={f.answer} placeholder="The answer" editor={editorPreview} multiline />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {showTravel ? (
                    <div {...ed.list("travelInformation")} style={{ display: "contents" }}>
                      {travel.map((t) => (
                        <div key={t.id} {...ed.item(t.id)} className="cz-item" data-reveal>
                          <Field as="p" className="cz-item__q" path="title" value={t.title} placeholder="By car, by plane…" editor={editorPreview} />
                          <Field as="p" className="cz-text" path="body" value={t.body} placeholder="How to get there" editor={editorPreview} multiline />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {showStay ? (
                    <div {...ed.list("accommodations")} style={{ display: "contents" }}>
                      {stay.map((a) => (
                        <div key={a.id} {...ed.item(a.id)} className="cz-item" data-reveal>
                          <p className="cz-item__q">
                            {a.bookingUrl && !ed.on ? (
                              <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer">
                                {a.name}
                              </a>
                            ) : (
                              <Field path="name" value={a.name} placeholder="Where to stay" editor={editorPreview} />
                            )}
                          </p>
                          <Field as="p" className="cz-text" path="addressLine" value={a.addressLine} placeholder="Address" editor={editorPreview} />
                          {a.notes ? <Field as="p" className="cz-text cz-soft" path="notes" value={a.notes} placeholder="" editor={editorPreview} multiline /> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {ed.on ? (
                  <div className="cz-adds">
                    {showFaq ? <AddItem list="faqs" label="Add a question" editor className="cz-add" /> : null}
                    {showTravel ? <AddItem list="travelInformation" label="Add how to get there" editor className="cz-add" /> : null}
                    {showStay ? <AddItem list="accommodations" label="Add a place to stay" editor className="cz-add" /> : null}
                  </div>
                ) : null}
              </section>
            </div>
          ) : ed.on ? (
            <HiddenSection k="faqs" vis={KNOW} label="Good to know" editor />
          ) : null}

          {/* Night: gifts and the reply card on the sill */}
          {showGifts || showRsvp || over || ed.on ? (
            <div className="cz-night-room">
              {showGifts ? (
                <section className="cz-sec cz-narrow cz-gifts" data-reveal {...ed.section("registry")}>
                  <h2 className="cz-title">Gifts</h2>
                  <Field as="p" className="cz-text" path="cashGiftNote" value={content.cashGiftNote?.trim()} fallback="Your presence is the greatest gift. Should you wish to give, here’s how." placeholder="" editor={editorPreview} multiline />
                  {content.registryLinks.length || ed.on ? (
                    <div className="cz-links" {...ed.list("registryLinks")}>
                      {content.registryLinks.map((r) => (
                        <a key={r.id} {...ed.item(r.id)} className="cz-btn cz-btn--line" href={ed.on ? undefined : r.url || undefined} target="_blank" rel="noopener noreferrer">
                          <Field path="storeName" value={r.storeName} placeholder="Store or fund name" editor={editorPreview} />
                        </a>
                      ))}
                      <AddItem list="registryLinks" label="Add a gift link" editor={editorPreview} className="cz-add" />
                    </div>
                  ) : null}
                  {/* In the builder the window stays open, so the gifts inside can be edited. */}
                  {cash || (ed.on && (content.cashGifts ?? []).length) ? (
                    <div className={`cz-gift${giftsOpen || ed.on ? " is-open" : ""}`}>
                      <div className="cz-gift__frame">
                        <div className="cz-gift__inside" inert={!giftsOpen && !ed.on}>
                          <CashGifts content={content} note={false} editor={editorPreview} look={{ ink: "#2a211b", muted: "#6f6253", surface: "#fbf8f1", line: "rgba(42,33,27,.18)", bodyFont: "var(--cz-body)", displayFont: "var(--cz-body)", radius: 2 }} />
                        </div>
                        <div className="cz-gift__sash cz-wood" aria-hidden>
                          <Panes cols={5} rows={4} seed={7} />
                        </div>
                      </div>
                      {ed.on ? (
                        <p className="cz-gift__btn">
                          <Field className="cz-btn cz-btn--line" path="custom.giftButton" value={customValue(content, "giftButton")} fallback="View gift details" placeholder="" editor />
                        </p>
                      ) : (
                        <button type="button" className="cz-btn cz-btn--line cz-gift__btn" aria-expanded={giftsOpen} onClick={() => setGiftsOpen((o) => !o)}>
                          {giftsOpen ? "Close" : customValue(content, "giftButton") || "View gift details"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <AddItem list="cashGifts" label="Add GCash, Maya or bank" editor={editorPreview} className="cz-add" />
                  )}
                </section>
              ) : vis.registry === false ? (
                <HiddenSection k="registry" label="Gifts" editor={editorPreview} />
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
          <Field as="p" className="cz-whisper" path="custom.closing" value={customValue(content, "closing")} fallback="Hanggang sa muli" placeholder="" editor={editorPreview} />
          <Field as="p" className="cz-mono" path="custom.monogram" value={customValue(content, "monogram")} fallback={mono} placeholder="" editor={editorPreview} />
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
