import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { mutedText, resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CHINESE_SERIF, loadFontFamilies } from "../../presentation/loadFonts";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { Countdown } from "../shared/Countdown";
import { PhotoSlot, withAddSlots } from "../shared/PhotoSlot";
import { photosOf, useReveal } from "../shared/reveal";
import { PAPER_GRAIN } from "../shared/stationery";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { dateWords, eventIsOver, lunarDate, monogram, receptionMap, timeOf, timeWords, townOf } from "../tinghun/content";
import { Bowl, Cloud, Corner, Dish, Ducks, PeonyBranch, PeonySprig, Petals, Plate, TeaSet } from "./art";
import { brocade, cloudBand } from "./tiles";
import RsvpCard from "./RsvpCard";
import { PORCELAIN_CSS } from "./styles";

/**
 * Porcelain Garden (Tinghun, Premium): chinoiserie for a garden or hotel ting hun, drawn the
 * way blue-and-white porcelain is painted, in fine cobalt line with thin washes of peony,
 * celadon and gold.
 *  - The hero is a framed panel: a peony branch at two corners (on the published page and the
 *    design preview its strokes draw themselves in, then the washes bloom), and a porcelain
 *    plate whose white well holds the two names with a red 囍 between them.
 *  - The invitation names the two families and their parents, over a pair of mandarin ducks.
 *  - The signature: the day's programme is a horizontal handscroll (卷軸). When it comes into
 *    view the two wooden rollers part and the scroll unrolls sideways; each part of the day is
 *    a column with its Chinese name written vertically. In the builder, on the gallery card
 *    and under reduced motion it simply rests open.
 *  - Red is kept for 囍 and the reply buttons; everything else is cobalt, peony and gold.
 */

const CJK = /[㐀-鿿豈-﫿]/;
const ALL_CJK = /^[㐀-鿿豈-﫿\s·・、，。]+$/;

/** Wrap the Chinese runs of a mixed line ("多謝 · Thank you") so they get the Chinese face and lang. */
function zhRuns(text: string): ReactNode {
  if (!CJK.test(text)) return text;
  return text.split(/([㐀-鿿豈-﫿]+)/).map((part, i) =>
    CJK.test(part) ? (
      <span key={i} lang="zh-Hant" className="pg-zh">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** A Field whose text may mix Chinese and English: on the page, the Chinese parts are wrapped. */
function Mixed({ as = "p", path, value, fallback, placeholder, editor, className }: { as?: "p" | "h2" | "span"; path: string; value: string; fallback?: string; placeholder: string; editor: boolean; className?: string }) {
  if (editor) return <Field as={as} className={className} path={path} value={value} fallback={fallback} placeholder={placeholder} editor multiline={false} />;
  const text = value || fallback || "";
  if (!text) return null;
  const Tag = as;
  return <Tag className={className}>{zhRuns(text)}</Tag>;
}

/** Given names, as on a Chinese-Filipino invitation: everything but the family name ("Mei Ling Chua" → "Mei Ling"). */
function givenName(full: string): string {
  const w = full.trim().split(/\s+/).filter(Boolean);
  if (w.length < 3) return w[0] ?? "";
  const stop = w.findIndex((x, i) => i > 0 && /^(de|del|dela|delos|delas|san|sta\.?|y|van|von|da|dos)$/i.test(x));
  return (stop > 0 ? w.slice(0, stop) : w.slice(0, -1)).join(" ");
}

// Parents go in the invitation; grandparents ("Grandparents of the Bride") are elders.
const isParents = (t: string) => /parent|magulang|父母/i.test(t) && !/grand|lolo|lola|祖/i.test(t);
const sideOf = (t: string) => (/groom|lalaki|男/i.test(t) ? 1 : /bride|babae|女/i.test(t) ? 0 : 2);

/**
 * The handscroll: while it rests out of view its two rollers sit together in the middle; once
 * most of it is on screen they part and the paper unrolls between them. `--hw` is half the
 * paper's width, so the rollers know how far to travel.
 */
function useHandscroll(enabled: boolean, ref: RefObject<HTMLElement | null>, onOpen: () => void) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const paper = el.querySelector<HTMLElement>(".pg-hs__paper");
    const measure = () => el.style.setProperty("--hw", `${Math.round((paper?.clientWidth ?? 0) / 2)}px`);
    measure();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (e.intersectionRatio >= 0.4 || e.intersectionRect.height > window.innerHeight * 0.45) {
            measure();
            onOpen();
            io.disconnect();
          }
        }
      },
      { threshold: [0, 0.2, 0.4, 0.6] },
    );
    io.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      io.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [enabled, ref, onOpen]);
}

/** Section heading: a Chinese caption over the English title, a cloud under it. */
function Heading({ zh, children }: { zh: string; children: ReactNode }) {
  return (
    <header className="pg-head" data-reveal>
      <p className="pg-zh pg-kicker" lang="zh-Hant">
        {zh}
      </p>
      {children}
      <span className="pg-rule" aria-hidden />
    </header>
  );
}

export default function TinghunPorcelainTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("tinghun-porcelain-zh", ["Cactus+Classical+Serif", ...CHINESE_SERIF]);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced && !editorPreview;
  const pageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The opening (the branch drawing itself) and the handscroll play only on the published page
  // and the design preview, never in the builder, on the card, or with less motion.
  const [play] = useState(() => (live || demo) && motion && !gallery);
  const deepLink = typeof window !== "undefined" && window.location.hash === "#rsvp";
  const [unrolled, setUnrolled] = useState(false);
  const [openScroll] = useState(() => () => setUnrolled(true));
  useHandscroll(play, scrollRef, openScroll);

  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const ed = siteEdit(editorPreview);
  const vis = settings.sectionVisibility;
  const over = !editorPreview && eventIsOver(content.eventDate);

  const photos = photosOf(content).slice(0, 6);
  useReveal(pageRef, motion, [content.entourage?.length, photos.length, content.faqs.length]);

  // ---- words ----
  const heroZhRaw = customValue(content, "heroZh");
  const heroZh = heroZhRaw === "none" ? "" : heroZhRaw || "訂婚";
  const xiHero = heroZh === "囍";
  const hosts = content.hosts.map((h) => ({ id: h.id, full: h.name, given: givenName(h.name) })).filter((h) => editorPreview || h.given);
  const longest = Math.max(4, ...hosts.map((h) => h.given.length));
  const when = dateWords(content.eventDate);
  const words = timeWords(content.eventDate);
  const town = townOf(content);
  const lunar = lunarDate(content);
  const lunarOwn = customValue(content, "lunarDate");
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
  const groups = (content.entourage ?? []).map((g) => (editorPreview ? g : { ...g, people: g.people.map((p) => p.trim()).filter(Boolean) })).filter((g) => editorPreview || g.people.length);
  const parents = groups.filter((g) => isParents(g.title)).sort((a, b) => sideOf(a.title) - sideOf(b.title));
  const elders = groups.filter((g) => !isParents(g.title));
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => editorPreview || f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash || !!content.cashGiftNote?.trim();
  const itemOf = new Map(photos.map((p) => [p.image, p.id]));
  const slots = withAddSlots(photos.map((p) => p.image), editorPreview, 3).slice(0, 6);
  const mono = monogram(content);

  const showParents = vis.parents !== false && (parents.length > 0 || editorPreview);
  const showVenues = !!(venue || recName || editorPreview);
  const showStory = vis.hostIntro !== false && !!(paragraphs.length || editorPreview);
  const showDay = vis.schedule !== false && !!(schedule.length || editorPreview);
  const showElders = vis.entourage !== false && !!(elders.length || editorPreview);
  const showDress = vis.dress !== false && !!(dress || swatches.length || editorPreview);
  const showPhotos = vis.gallery !== false && slots.length > 0;
  const showGifts = vis.registry !== false && (gifts || editorPreview);
  const showFaq = vis.faqs !== false && (faqs.length > 0 || editorPreview);
  const showRsvp = !over && vis.rsvp !== false;

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });

  // The line colour: cobalt on blue-and-white, jade on celadon, the palette's ink otherwise.
  const celadon = settings.paletteId === "porcelain-celadon";
  const line = settings.paletteId === "porcelain-blue" ? "#233F7E" : celadon ? "#3B6157" : theme.ink;
  const vars = {
    ["--pg-bg" as string]: theme.background,
    ["--pg-ink" as string]: theme.ink,
    ["--pg-muted" as string]: mutedText(theme),
    ["--pg-display" as string]: theme.displayFont,
    ["--pg-body" as string]: theme.bodyFont,
    ["--pg-line" as string]: line,
    ["--pg-band" as string]: `url("${cloudBand(line)}")`,
    ["--pg-brocade" as string]: `url("${brocade("#C2A15E", celadon ? "#c9d6c6" : "#cfdccd")}")`,
    ["--pg-grain" as string]: `url("${PAPER_GRAIN}")`,
    ["--fit" as string]: String(Math.min(1, 9 / longest)),
  } as CSSProperties;

  // Always a little alive on the published page and the preview: the branches sway, petals
  // drift, the plate turns, the ducks bob. Never in the builder, on the card, or with less motion.
  const alive = motion && !gallery;
  const cls = ["pg-root", celadon ? "pg-celadon" : "", gallery ? "pg-gallery" : "", play ? "pg-play" : "", play && !deepLink ? "pg-draw" : "", alive ? "pg-alive" : ""].filter(Boolean).join(" ");

  return (
    <div className={cls} style={vars}>
      <style>{PORCELAIN_CSS}</style>
      <div ref={pageRef} className="pg-page">
        {/* ---- The hero: a framed panel, peony at two corners, the names in a porcelain plate ---- */}
        <header className="pg-hero">
          <div className="pg-hero__panel pg-frame">
            <Corner className="pg-corner--tl" />
            <Corner className="pg-corner--tr" />
            <Corner className="pg-corner--bl" />
            <Corner className="pg-corner--br" />
            <div className="pg-hero__garden" aria-hidden>
              <PeonyBranch className="pg-branch--tl" />
              <PeonyBranch className="pg-branch--br" />
              {alive ? <Petals /> : null}
            </div>
            <div className="pg-hero__words">
              {heroZh ? (
                <p className={`pg-zh pg-hero__zh${xiHero ? " pg-hero__zh--xi" : ""}`} lang="zh-Hant">
                  {heroZh}
                </p>
              ) : null}
              <Field as="p" className="pg-whisper pg-rise" style={{ ["--d" as string]: ".5s" }} path="custom.heroLine" value={customValue(content, "heroLine")} fallback="The Ting Hun of" placeholder="" editor={editorPreview} />
              <div className="pg-plate-wrap">
                <Plate />
                <h1 className="pg-names" {...ed.list("hosts")}>
                  {hosts.map((h, i) => (
                    <span key={h.id} className="pg-host">
                      {i > 0 ? (
                        xiHero ? (
                          <span className="pg-amp" aria-label="and">
                            &amp;
                          </span>
                        ) : (
                          <span className="pg-zh pg-xi" lang="zh-Hant" aria-label="and">
                            囍
                          </span>
                        )
                      ) : null}
                      <span className="pg-host__name" {...ed.item(h.id)}>
                        <Field className="pg-name" path="name" value={h.full} placeholder="Name" editor={editorPreview}>
                          {h.given}
                        </Field>
                      </span>
                      {i < 2 ? (
                        <Field as="span" className="pg-zh pg-name-zh" lang="zh-Hant" path={`custom.hostZh${i + 1}`} value={customValue(content, `hostZh${i + 1}`)} placeholder="中文名" editor={editorPreview} />
                      ) : null}
                    </span>
                  ))}
                  {!hosts.length ? <span className="pg-name pg-hint">Your names</span> : null}
                </h1>
              </div>
              {when ? <p className="pg-date">{when}</p> : editorPreview ? <p className="pg-date pg-hint">Your date</p> : null}
              {vis.lunar !== false && (lunar || editorPreview) ? (
                <p className="pg-lunar">
                  <span className="pg-zh" lang="zh-Hant">
                    農曆
                  </span>
                  <Field as="span" className="pg-zh" lang="zh-Hant" path="custom.lunarDate" value={lunarOwn} fallback={lunar || undefined} placeholder="丁未年二月初六" editor={editorPreview} />
                </p>
              ) : null}
              {words || town ? (
                <p className="pg-at">
                  {[words, town].filter(Boolean).map((w, i) => (
                    <span key={i}>
                      {i > 0 ? (
                        <span className="pg-at__dot" aria-hidden>
                          ·
                        </span>
                      ) : null}
                      {w}
                    </span>
                  ))}
                </p>
              ) : null}
              {vis.countdown !== false && content.eventDate && !over ? <Countdown iso={content.eventDate} live={live || demo || editorPreview} prefix="pg" /> : null}
              {showRsvp ? (
                <button type="button" className="pg-btn pg-btn--red" onClick={ed.on ? undefined : toRsvp}>
                  <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Kindly reply" placeholder="" editor={editorPreview} />
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <main>
          {/* ---- The invitation: the two families, their parents, the mandarin ducks ---- */}
          <section className="pg-sec pg-narrow pg-invite">
            <div data-reveal>
              <Field as="p" className="pg-zh pg-families" lang="zh-Hant" path="custom.familiesZh" value={customValue(content, "familiesZh")} placeholder="蔡府 · 林府" editor={editorPreview} />
              <Field as="p" className="pg-whisper" path="custom.familiesLine" value={customValue(content, "familiesLine")} fallback="Together with their families" placeholder="" editor={editorPreview} />
              {showParents ? (
                <div className="pg-parents" {...ed.list("entourage")}>
                  {parents.map((g, i) => (
                    <div key={g.id} className="pg-parents__side" {...ed.item(g.id)}>
                      {i > 0 ? <span className="pg-parents__and">and</span> : null}
                      {g.people.map((p, j) => (
                        <Field key={j} as="p" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                      ))}
                      <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={editorPreview} className="pg-add pg-add--small" />
                    </div>
                  ))}
                  {!parents.length ? <AddItem list="entourage" label="Add the parents (Parents of the Bride)" editor={editorPreview} className="pg-add pg-add--center" /> : null}
                </div>
              ) : vis.parents === false ? (
                <HiddenSection k="parents" label="The families" editor={editorPreview} />
              ) : null}
              <Field as="p" className="pg-invite__line" path="custom.invitation" value={customValue(content, "invitation")} fallback="request the pleasure of your company at the Ting Hun of their children" placeholder="" editor={editorPreview} multiline />
            </div>
            <Ducks />
          </section>

          {/* ---- Where: the ceremony at home, then the lauriat ---- */}
          {showVenues ? (
            <section className="pg-sec pg-venues">
              <article className="pg-venue pg-frame" data-reveal>
                <Corner className="pg-corner--tl" />
                <Corner className="pg-corner--tr" />
                <Corner className="pg-corner--bl" />
                <Corner className="pg-corner--br" />
                <TeaSet />
                <p className="pg-zh pg-kicker" lang="zh-Hant">
                  文定
                </p>
                <p className="pg-whisper">The ceremony</p>
                <Field as="h3" className="pg-venue__name" path="primaryLocation.name" value={venue} placeholder="The bride’s family home, or your venue" editor={editorPreview} />
                <Field as="p" className="pg-venue__addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={editorPreview} />
                {words ? <p className="pg-venue__time">{words}</p> : null}
                <VenueLinks content={content} font="var(--pg-body)" color="var(--pg-line)" size={16} />
              </article>
              {recName || editorPreview ? (
                <article className="pg-venue pg-frame" data-reveal style={{ ["--i" as string]: 1 }}>
                  <Corner className="pg-corner--tl" />
                  <Corner className="pg-corner--tr" />
                  <Corner className="pg-corner--bl" />
                  <Corner className="pg-corner--br" />
                  <Bowl />
                  <p className="pg-zh pg-kicker" lang="zh-Hant">
                    喜宴
                  </p>
                  <p className="pg-whisper">The lauriat</p>
                  <Field as="h3" className="pg-venue__name" path="custom.receptionName" value={recName} placeholder="The lunch or dinner, if it’s elsewhere" editor={editorPreview} />
                  <Field as="p" className="pg-venue__addr" path="custom.receptionAddress" value={recAddress} placeholder="Address" editor={editorPreview} />
                  <Field as="p" className="pg-venue__time" path="custom.receptionTime" value={recTime} placeholder="Time, e.g. half past twelve" editor={editorPreview} />
                  {recMap ? (
                    <a className="pg-venue__map" href={recMap} target="_blank" rel="noopener noreferrer">
                      Open in Maps
                    </a>
                  ) : null}
                </article>
              ) : null}
            </section>
          ) : null}

          {/* ---- A note from the families ---- */}
          {showStory ? (
            <section className="pg-sec pg-narrow pg-story" {...ed.section("hostIntro")}>
              <Heading zh="心意">
                <Field as="h2" className="pg-title" path="custom.storyTitle" value={customValue(content, "storyTitle")} fallback="A note from our families" placeholder="" editor={editorPreview} />
              </Heading>
              <div data-reveal>
                {paragraphs.length ? (
                  paragraphs.map((p, i) => <Field key={i} as="p" className={`pg-text${i === 0 ? " pg-text--lead" : ""}`} path={`story#${i}`} value={p} placeholder="" editor={editorPreview} multiline />)
                ) : (
                  <Field as="p" className="pg-text pg-text--lead" path="story#0" value="" placeholder="A few words to your guests, from both families." editor={editorPreview} multiline />
                )}
              </div>
              <PeonySprig size={132} className="pg-story__sprig" />
            </section>
          ) : vis.hostIntro === false ? (
            <HiddenSection k="hostIntro" label="A note from our families" editor={editorPreview} />
          ) : null}

          {/* ---- The programme, on a handscroll ---- */}
          {showDay ? (
            <section className="pg-sec pg-day" {...ed.section("schedule")}>
              <Heading zh="程序">
                <Field as="h2" className="pg-title" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="The programme" placeholder="" editor={editorPreview} />
              </Heading>
              <div ref={scrollRef} className={`pg-hs${play ? " pg-hs--play" : ""}${unrolled ? " is-open" : ""}`} style={{ ["--cols" as string]: Math.min(6, Math.max(1, schedule.length)) }}>
                <span className="pg-hs__roller pg-hs__roller--l" aria-hidden />
                <div className="pg-hs__paper">
                  <div className="pg-hs__sheet">
                    {schedule.length ? (
                      <ol className="pg-hs__list" {...ed.list("schedule")}>
                        {schedule.map((s, i) => {
                          const zh = (s.description ?? "").trim();
                          const vertical = !!zh && ALL_CJK.test(zh) && zh.replace(/\s/g, "").length <= 6;
                          return (
                            <li key={s.id} className="pg-hs__item" {...ed.item(s.id)} style={{ ["--i" as string]: i }}>
                              <span className="pg-hs__time">{timeOf(s.startTime) || (editorPreview ? "Time" : "")}</span>
                              {/* the label first: a new item's first field is what the builder types into; the grid places each */}
                              <Field as="span" className="pg-hs__label" path="label" value={s.label} placeholder="What’s happening" editor={editorPreview} />
                              {zh || editorPreview ? (
                                <Field as="span" className={`pg-zh pg-hs__zh${vertical ? " is-vertical" : ""}`} lang={zh && !CJK.test(zh) ? undefined : "zh-Hant"} path="description" value={zh} placeholder="中文" editor={editorPreview} />
                              ) : null}
                            </li>
                          );
                        })}
                      </ol>
                    ) : null}
                    <AddItem list="schedule" label={schedule.length ? "Add to the programme" : "Add the programme"} editor={editorPreview} className="pg-add pg-add--center" />
                  </div>
                </div>
                <span className="pg-hs__roller pg-hs__roller--r" aria-hidden />
                <span className="pg-hs__tie" aria-hidden />
              </div>
            </section>
          ) : vis.schedule === false ? (
            <HiddenSection k="schedule" label="The programme" editor={editorPreview} />
          ) : null}

          {/* ---- Elders & family ---- */}
          {showElders ? (
            <section className="pg-sec pg-elders" {...ed.section("entourage")}>
              <Heading zh="長輩">
                <Field as="h2" className="pg-title" path="custom.eldersTitle" value={customValue(content, "eldersTitle")} fallback="Elders & family" placeholder="" editor={editorPreview} />
              </Heading>
              {elders.length ? (
                <div className="pg-elders__grid" {...ed.list("entourage")}>
                  {elders.map((g, i) => (
                    <div key={g.id} className="pg-elder" data-reveal style={{ ["--i" as string]: i % 2 }} {...ed.item(g.id)}>
                      <Field as="p" className="pg-elder__t" path="title" value={g.title} placeholder="Group, e.g. Grandparents of the Bride" editor={editorPreview} />
                      <ul className="pg-elder__names">
                        {g.people.map((p, j) => (
                          <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                        ))}
                      </ul>
                      <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={editorPreview} className="pg-add pg-add--small" />
                    </div>
                  ))}
                </div>
              ) : null}
              <AddItem list="entourage" label={elders.length ? "Add a group" : "Add grandparents and elders"} editor={editorPreview} className="pg-add pg-add--center" />
            </section>
          ) : vis.entourage === false ? (
            <HiddenSection k="entourage" label="Elders & family" editor={editorPreview} />
          ) : null}

          {/* ---- What to wear: the motif colours as little dishes ---- */}
          {showDress ? (
            <section className="pg-sec pg-narrow pg-dress" {...ed.section("dress")}>
              <Heading zh="衣著">
                <h2 className="pg-title">What to wear</h2>
              </Heading>
              <div data-reveal>
                <Field as="p" className="pg-text" path="custom.dressCode" value={dress} placeholder="Your dress code. Your motif colours show beside it." editor={editorPreview} multiline />
                {swatches.length ? (
                  <div className="pg-dishes" role="img" aria-label="Motif colours">
                    {swatches.map((c, i) => (
                      <Dish key={c + i} color={c} />
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ) : vis.dress === false ? (
            <HiddenSection k="dress" label="What to wear" editor={editorPreview} />
          ) : null}

          {/* ---- Photos, in moon-gate frames ---- */}
          {showPhotos ? (
            <section className="pg-sec pg-photos" aria-label={content.galleries[0]?.title?.trim() || "Photos"} {...ed.section("gallery")}>
              <Heading zh="留影">
                <h2 className="pg-title">{content.galleries[0]?.title?.trim() && content.galleries[0].title.trim() !== "Photos" ? content.galleries[0].title.trim() : "Moments"}</h2>
              </Heading>
              <div className={`pg-photos__grid pg-photos__grid--${Math.min(slots.length, 6)}`} {...ed.list("gallery")}>
                {slots.map((img, i) => (
                  <div key={img?.id ?? `add-${i}`} className={`pg-gate pg-gate--${i % 3}`} data-reveal style={{ ["--i" as string]: i % 3 }} {...(img && itemOf.get(img) ? ed.item(itemOf.get(img)!) : {})}>
                    <PhotoSlot image={img} editorPreview={editorPreview} className="pg-gate__photo" />
                  </div>
                ))}
              </div>
            </section>
          ) : vis.gallery === false ? (
            <HiddenSection k="gallery" label="Photos" editor={editorPreview} />
          ) : null}

          {/* ---- Ang pao & gifts ---- */}
          {showGifts ? (
            <section className="pg-sec pg-narrow pg-gifts" {...ed.section("registry")}>
              <Heading zh="禮金">
                <Field as="h2" className="pg-title" path="custom.giftTitle" value={customValue(content, "giftTitle")} fallback="Ang pao & gifts" placeholder="" editor={editorPreview} />
              </Heading>
              <div data-reveal>
                <Field as="p" className="pg-text" path="cashGiftNote" value={content.cashGiftNote?.trim()} fallback="Your presence is our blessing. Should you wish to give, here is how." placeholder="" editor={editorPreview} multiline />
                {content.registryLinks.length || ed.on ? (
                  <div className="pg-links" {...ed.list("registryLinks")}>
                    {content.registryLinks.map((r) => (
                      <a key={r.id} {...ed.item(r.id)} className="pg-btn pg-btn--line" href={ed.on ? undefined : r.url || undefined} target="_blank" rel="noopener noreferrer">
                        <Field path="storeName" value={r.storeName} placeholder="Store or fund name" editor={editorPreview} />
                      </a>
                    ))}
                    <AddItem list="registryLinks" label="Add a gift link" editor={editorPreview} className="pg-add" />
                  </div>
                ) : null}
                <CashGifts content={content} note={false} editor={editorPreview} look={{ ink: "var(--pg-ink)", muted: "var(--pg-muted)", surface: "#fffdf8", line: "color-mix(in srgb, var(--pg-line) 30%, transparent)", bodyFont: "var(--pg-body)", displayFont: "var(--pg-display)", radius: 2 }} />
              </div>
            </section>
          ) : vis.registry === false ? (
            <HiddenSection k="registry" label="Ang pao & gifts" editor={editorPreview} />
          ) : null}

          {/* ---- Good to know ---- */}
          {showFaq ? (
            <section className="pg-sec pg-know" {...ed.section("faqs")}>
              <Heading zh="須知">
                <h2 className="pg-title">Good to know</h2>
              </Heading>
              <div className="pg-know__grid" {...ed.list("faqs")}>
                {faqs.map((f) => (
                  <div key={f.id} className="pg-item" data-reveal {...ed.item(f.id)}>
                    <Cloud className="pg-item__cloud" />
                    <Field as="p" className="pg-item__q" path="question" value={f.question} placeholder="A question guests ask" editor={editorPreview} />
                    <Field as="p" className="pg-text" path="answer" value={f.answer} placeholder="The answer" editor={editorPreview} multiline />
                  </div>
                ))}
              </div>
              <AddItem list="faqs" label="Add a question" editor={editorPreview} className="pg-add pg-add--center" />
            </section>
          ) : vis.faqs === false ? (
            <HiddenSection k="faqs" label="Good to know" editor={editorPreview} />
          ) : null}

          {/* ---- The reply, or the thanks once the day has passed ---- */}
          {over ? (
            <section className="pg-sec pg-narrow pg-after" data-reveal>
              <p className="pg-zh pg-kicker" lang="zh-Hant">
                多謝
              </p>
              <h2 className="pg-title">With thanks</h2>
              <p className="pg-text">{customValue(content, "afterParty") || "Thank you for celebrating with our families."}</p>
            </section>
          ) : showRsvp ? (
            <div className="pg-sec pg-rsvp-wrap">
              <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} />
            </div>
          ) : vis.rsvp === false ? (
            <HiddenSection k="rsvp" label="RSVP" editor={editorPreview} />
          ) : null}
        </main>

        {/* ---- Closing: the monogram on a small plate ---- */}
        <footer className="pg-foot">
          <span className="pg-rule" aria-hidden />
          <Mixed className="pg-foot__line" path="custom.closing" value={customValue(content, "closing")} fallback="多謝 · Thank you" placeholder="" editor={editorPreview} />
          <div className="pg-foot__plate">
            <Plate panels={12} />
            <Field as="p" className="pg-mono" path="custom.monogram" value={customValue(content, "monogram")} fallback={mono || undefined} placeholder="M & J" editor={editorPreview} />
          </div>
          <PeonySprig size={110} />
          {credit.show ? (
            <p className="pg-credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
