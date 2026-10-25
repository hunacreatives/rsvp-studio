import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { loadFontFamilies } from "../../presentation/loadFonts";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { Countdown } from "../shared/Countdown";
import { PhotoSlot } from "../shared/PhotoSlot";
import { photoFit } from "../shared/photoFit";
import { photosOf, useReveal } from "../shared/reveal";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { bigDate, eventIsOver, firstLine, firstNames, issueLine, issueNumber, listsLine, listsOf, mastheadOf, replyBy, spotOf, timeLine, timeOf, townOf } from "./content";
import { Barcode, Sticker } from "./art";
import RsvpCard from "./RsvpCard";
import { DEBUT_ISSUE_CSS } from "./styles";

/**
 * The Debut Issue (debuts, Premium): her site is a fashion magazine, made from her pre-debut
 * pictorial.
 *  - The cover: her photo full bleed, her name as the masthead, the issue line, cover lines
 *    written from the site itself (the lists, the night, what to wear), a reply-by sticker and
 *    a barcode of her own.
 *  - Signature moment (published page and design preview only): the magazine opens. The cover
 *    turns on its spine; on a computer it lands as a spread, her letter on the left and the
 *    contents on the right; on a phone it turns away to the contents. A tap, a scroll or a
 *    few seconds opens it; "Back to the cover" closes it again.
 *  - Inside, one feature per page, each with its folio: the night (the date set huge), the
 *    program, the 18 Roses / Candles / Treasures as numbered lists, the pictorial, what to
 *    wear, the gift guide, Q&A, and the reply card (a tear-out subscription card). The back
 *    cover closes it.
 * Printed in ink and one spot colour: her first motif colour. In the builder, on the gallery
 * card and with reduced motion, the cover and the pages simply sit one after the other.
 */

const ARCHIVO = "Archivo:wdth,wght@62..125,400..800";
const AUTO_OPEN_MS = 5200;
const TURN_MS = 1300;

type Toc = { key: string; anchor: string; title: string; deck?: string };

export default function DebutIssueTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("debut-issue-sans", [ARCHIVO]);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced && !editorPreview;
  const pageRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // The magazine opens only where the signature moment plays, and not for a guest who came
  // straight to the reply card.
  const [stacked] = useState(() => (live || demo) && motion && !gallery && !(typeof window !== "undefined" && window.location.hash === "#rsvp"));
  const [open, setOpen] = useState(false);
  const [turned, setTurned] = useState(false); // the turn has finished: the cover is put away
  const [giftsOpen, setGiftsOpen] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;

  // Open on a tap, the first scroll, a key, or after a few seconds.
  useEffect(() => {
    if (!stacked) return;
    const go = () => !openRef.current && setOpen(true);
    const t = window.setTimeout(go, AUTO_OPEN_MS);
    const onKey = (e: KeyboardEvent) => (["ArrowDown", "PageDown", " ", "Enter"].includes(e.key) ? go() : undefined);
    window.addEventListener("wheel", go, { passive: true });
    window.addEventListener("touchmove", go, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("wheel", go);
      window.removeEventListener("touchmove", go);
      window.removeEventListener("keydown", onKey);
    };
  }, [stacked]);
  useEffect(() => {
    if (!stacked) return;
    if (!open) return setTurned(false);
    const t = window.setTimeout(() => setTurned(true), TURN_MS + 60);
    return () => window.clearTimeout(t);
  }, [open, stacked]);
  const closeIssue = () => {
    setOpen(false);
    stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const photos = photosOf(content);
  useReveal(pageRef, motion, [content.entourage?.length, photos.length, turned]);

  const ed = siteEdit(editorPreview);
  const vis = settings.sectionVisibility;
  const first = firstNames(content);
  const mast = mastheadOf(content);
  const issue = issueLine(content);
  const num = issueNumber(content);
  const date = bigDate(content.eventDate);
  const time = timeLine(content);
  const over = !editorPreview && eventIsOver(content.eventDate);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const town = townOf(content);
  const by = replyBy(content);

  // The cover photo: the host's chosen cover, else the first photo. The rest are the pictorial.
  const coverImg = settings.heroImage?.masterUrl ? settings.heroImage : photos[0]?.image;
  const inside = settings.heroImage?.masterUrl ? photos : photos.slice(1);
  const letterImg = inside[0]?.image;
  const nightImg = inside[1]?.image;
  const itemOf = new Map(photos.map((p) => [p.image, p.id]));
  const pictorial = inside.slice(2, 14);
  const slots = editorPreview && pictorial.length < 6 ? [...pictorial, ...Array<null>(Math.max(1, 3 - pictorial.length)).fill(null)] : pictorial;

  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => editorPreview || s.label.trim());
  const lists = listsOf(content, editorPreview);
  const longLists = lists.filter((l) => l.numbered || (editorPreview && !l.people.length));
  const shortLists = lists.filter((l) => !longLists.includes(l));
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => editorPreview || f.question.trim());
  const cash = hasCashGifts(content);
  const giftNote = content.cashGiftNote?.trim() ?? "";
  const closing = customValue(content, "closing");

  const showLetter = vis.hostIntro !== false && !!(paragraphs.length || editorPreview);
  const showNight = !!(date || venue || editorPreview);
  const showProgram = vis.schedule !== false && !!(schedule.length || editorPreview);
  const showLists = vis.entourage !== false && !!(lists.length || editorPreview);
  const showPictorial = vis.gallery !== false && slots.length > 0;
  const showDress = vis.dress !== false && !!(dress || swatches.length || editorPreview);
  const showGifts = vis.registry !== false && !!(content.registryLinks.length || cash || giftNote || editorPreview);
  const showFaq = vis.faqs !== false && (faqs.length > 0 || editorPreview);
  const showRsvp = !over && vis.rsvp !== false;

  const letterTitle = customValue(content, "letterTitle") || (first ? `A letter from ${first}` : "A letter from the celebrant");
  const titles = {
    night: customValue(content, "nightTitle") || "The Night",
    program: customValue(content, "programTitle") || "The Program",
    pictorial: customValue(content, "pictorialTitle") || "The Pictorial",
    dress: customValue(content, "dressTitle") || "What to Wear",
    gifts: customValue(content, "giftTitle") || "Gift Guide",
    faq: customValue(content, "faqTitle") || "Q&A",
    rsvp: customValue(content, "rsvpTitle") || "Kindly reply",
  };

  // The contents, and so every page's folio: the letter is page 2, then a spread per feature.
  const toc: Toc[] = [];
  // (Her letter is page 2, on the facing page, so it isn't listed.)
  if (showNight) toc.push({ key: "night", anchor: "di-night", title: titles.night, deck: [date ? `${date.weekday}, ${date.month} ${date.day}` : "", venue].filter(Boolean).join(" · ") || undefined });
  if (showProgram) toc.push({ key: "program", anchor: "di-program", title: titles.program, deck: schedule.length ? "The night, hour by hour" : undefined });
  // The lists are one line in the contents (their pages follow one another).
  if (showLists && lists.length) toc.push({ key: "lists", anchor: `di-list-${(longLists[0] ?? lists[0]).id}`, title: listsLine(longLists.length ? longLists : lists) || "The lists", deck: shortLists.length ? `And her ${shortLists.map((l) => l.word.toLowerCase()).join(" and ")}` : "The people closest to her" });
  if (showPictorial && pictorial.length) toc.push({ key: "pictorial", anchor: "di-pictorial", title: titles.pictorial, deck: `${pictorial.length} ${pictorial.length === 1 ? "photograph" : "photographs"}` });
  if (showDress) toc.push({ key: "dress", anchor: "di-dress", title: titles.dress, deck: dress ? firstLine(dress, 46) : undefined });
  if (showGifts) toc.push({ key: "gifts", anchor: "di-gifts", title: titles.gifts });
  if (showFaq && faqs.length) toc.push({ key: "faq", anchor: "di-faq", title: titles.faq });
  if (showRsvp) toc.push({ key: "rsvp", anchor: "rsvp", title: titles.rsvp, deck: by ? `By ${by}` : undefined });
  const pageOf = new Map<string, number>();
  {
    let n = 4;
    pageOf.set("letter", 2);
    for (const t of toc) {
      pageOf.set(t.key, n);
      n += t.key === "lists" ? 2 * Math.max(1, longLists.length + (shortLists.length ? 1 : 0)) : 2;
    }
  }
  // The lists' own pages count on from the contents' "lists" page.
  const listPage = (i: number) => (pageOf.get("lists") ?? 0) + i * 2;
  const pg = (key: string) => {
    const m = /^list-(\d+)$/.exec(key);
    return String(m ? listPage(Number(m[1])) : (pageOf.get(key) ?? "")).padStart(2, "0");
  };
  const folio = (key: string) => (
    <p className="di-folio" aria-hidden>
      <span>{pg(key)}</span>
      <span>{mast ? `${mast} · ` : ""}The Debut Issue</span>
    </p>
  );

  // Cover lines, from what's inside.
  const coverLines: { kicker: string; text: string }[] = [];
  if (showLists && lists.length) coverLines.push({ kicker: "Inside", text: listsLine(lists) });
  if (date || town || venue) coverLines.push({ kicker: "Save the date", text: [date ? `${date.month} ${date.day}` : "", town || venue].filter(Boolean).join(", ") });
  if (showDress && dress) coverLines.push({ kicker: titles.dress, text: firstLine(dress, 30) });
  const cover3 = coverLines.slice(0, 3);
  const dark = customValue(content, "coverInk") === "dark";

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });
  const jump = (anchor: string) => (e: MouseEvent) => {
    if (ed.on) return e.preventDefault();
    e.preventDefault();
    document.getElementById(anchor)?.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });
  };

  const vars = {
    ["--di-bg" as string]: theme.background,
    ["--di-ink" as string]: theme.ink,
    ["--di-muted" as string]: theme.muted,
    ["--di-display" as string]: theme.displayFont,
    ["--di-body" as string]: theme.bodyFont,
    ["--di-spot" as string]: spotOf(content, theme.background, theme.ink),
    ["--di-sans" as string]: '"Archivo", "Helvetica Neue", Arial, sans-serif',
    ["--len" as string]: Math.max(4, [...mast].length),
  } as CSSProperties;
  const cls = ["di-root", stacked ? "di-stacked" : "di-flow", open ? "di-open" : "", turned ? "di-turned" : "", gallery ? "di-gallery" : ""].filter(Boolean).join(" ");

  /** A feature: its kicker and title, the words, its folio. */
  const feature = (key: string, anchor: string, sectionKey: string | null, className: string, body: ReactNode) => (
    <section id={anchor} className={`di-feat ${className}`} {...(sectionKey ? ed.section(sectionKey) : {})}>
      <div className="di-feat__in" data-reveal>
        {body}
      </div>
      {folio(key)}
    </section>
  );

  const cover = (
    <article className={`di-cover${dark ? " di-cover--dark" : ""}`} aria-label={`${mast || "Her"} cover`} onClick={stacked && !open ? () => setOpen(true) : undefined}>
      <div className="di-cover__front">
        {coverImg?.masterUrl ? (
          <img className="di-cover__photo" src={coverImg.masterUrl} alt={coverImg.alt || ""} decoding="async" style={{ ...photoFit(coverImg, 0.5, 0.3) }} />
        ) : (
          <PhotoSlot image={null} editorPreview={editorPreview} className="di-cover__photo di-cover__empty" label="Add your cover photo" />
        )}
        <span className="di-cover__scrim" aria-hidden />
        <div className="di-cover__top">
          <Field as="p" className="di-issue" path="custom.issueLine" value={customValue(content, "issueLine")} fallback={issue} placeholder="" editor={editorPreview} />
          <Field as="h1" className="di-mast" path="custom.masthead" value={customValue(content, "masthead")} fallback={mast || undefined} placeholder="Her name" editor={editorPreview} />
        </div>
        <div className="di-cover__lines">
          <Field as="p" className="di-headline" path="custom.coverHeadline" value={customValue(content, "coverHeadline")} fallback="The Debut Issue" placeholder="" editor={editorPreview} />
          {cover3.map((l, i) => (
            <p key={i} className="di-line" style={{ ["--i" as string]: i } as CSSProperties}>
              <span className="di-line__k">{l.kicker}</span>
              <span className="di-line__t">{l.text}</span>
            </p>
          ))}
          {!cover3.length && editorPreview ? <p className="di-line di-hint">The cover lines come from your lists, date and dress code.</p> : null}
        </div>
        {by && showRsvp ? <Sticker top="Reply by" big={by.split(" ")[1] ?? by} bottom={by.split(" ")[0] ?? ""} /> : null}
        <div className="di-cover__code">
          <Barcode seed={`${mast}${content.eventDate}`} digits={`${num.padStart(2, "0")} ${(content.eventDate || "0000-00-00").slice(0, 10).replace(/-/g, "")}`} className="di-barcode" />
        </div>
        {stacked ? (
          <button type="button" className="di-cover__open" onClick={(e) => (e.stopPropagation(), setOpen(true))}>
            Open the issue
          </button>
        ) : null}
      </div>
      {stacked ? <div className="di-cover__back" aria-hidden /> : null}
    </article>
  );

  const letter = showLetter ? (
    <article id="di-letter" className="di-pg di-letter" {...ed.section("hostIntro")}>
      <p className="di-kicker">From the celebrant</p>
      <Field as="h2" className="di-pg__h" path="custom.letterTitle" value={customValue(content, "letterTitle")} fallback={letterTitle} placeholder="" editor={editorPreview} />
      <div className="di-letter__body">
      {letterImg?.masterUrl ? (
        <figure className="di-letter__pic" {...(itemOf.get(letterImg) ? ed.item(itemOf.get(letterImg)!) : {})}>
          <img src={letterImg.masterUrl} alt={letterImg.alt || ""} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", ...photoFit(letterImg, 0.5, 0.25) }} />
        </figure>
      ) : null}
      <div className="di-letter__text">
        {paragraphs.length ? (
          paragraphs.map((p, i) => <Field key={i} as="p" className="di-text" path={`story#${i}`} value={p} placeholder="" editor={editorPreview} multiline />)
        ) : (
          <Field as="p" className="di-text" path="story#0" value="" placeholder="A few words to your guests, in your own voice." editor={editorPreview} multiline />
        )}
      </div>
      </div>
      <Field as="p" className="di-sign" path="custom.letterSign" value={customValue(content, "letterSign")} fallback={first || undefined} placeholder="Your name" editor={editorPreview} />
      {folio("letter")}
    </article>
  ) : vis.hostIntro === false ? (
    <HiddenSection k="hostIntro" label="Her letter" editor={editorPreview} />
  ) : null;

  const contents = (
    <article className="di-pg di-contents">
      <div className="di-contents__head">
        <h2 className="di-contents__h">Contents</h2>
        <p className="di-contents__issue">{issue}</p>
      </div>
      <ol className="di-toc">
        {toc.map((t) => (
          <li key={t.key}>
            <a href={`#${t.anchor}`} onClick={jump(t.anchor)}>
              <span className="di-toc__n">{pg(t.key)}</span>
              <span className="di-toc__w">
                <span className="di-toc__t">{t.title}</span>
                {t.deck ? <span className="di-toc__d">{t.deck}</span> : null}
              </span>
            </a>
          </li>
        ))}
      </ol>
      {stacked ? (
        <button type="button" className="di-link di-contents__back" onClick={closeIssue}>
          ← Back to the cover
        </button>
      ) : null}
    </article>
  );

  return (
    <div className={cls} style={vars}>
      <style>{DEBUT_ISSUE_CSS}</style>
      <div ref={pageRef} className="di-page">
        {/* The opening: the cover, then her letter and the contents as a spread */}
        <div ref={stageRef} className="di-opening">
          {stacked ? null : cover}
          <div className={`di-spread${showLetter ? "" : " di-spread--solo"}`}>
            {letter}
            <div className="di-spread__right">
              {contents}
              {stacked ? cover : null}
            </div>
          </div>
        </div>

        <main className="di-main">
          {/* The night: when and where, the date set huge */}
          {showNight
            ? feature(
                "night",
                "di-night",
                null,
                "di-night",
                <>
                  <div className="di-night__words">
                    <Field as="p" className="di-kicker" path="custom.nightTitle" value={customValue(content, "nightTitle")} fallback="The Night" placeholder="" editor={editorPreview} />
                    {date ? (
                      <p className="di-date" aria-label={`${date.weekday}, ${date.month} ${date.day}, ${date.year}`}>
                        <span className="di-date__day">{date.day}</span>
                        <span className="di-date__rest">
                          <span>{date.month}</span>
                          <span>{date.year}</span>
                          <span className="di-date__wd">{date.weekday}</span>
                        </span>
                      </p>
                    ) : editorPreview ? (
                      <p className="di-date di-hint">Your date</p>
                    ) : null}
                    {time ? <p className="di-night__time">{time}</p> : null}
                    <Field as="h3" className="di-night__venue" path="primaryLocation.name" value={venue} placeholder="Your venue" editor={editorPreview} />
                    <Field as="p" className="di-text di-night__addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={editorPreview} />
                    <VenueLinks content={content} font="var(--di-sans)" color="var(--di-ink)" size={14} align="left" />
                    {vis.countdown !== false && content.eventDate && !over ? <Countdown iso={content.eventDate} live={live || demo || editorPreview} prefix="di" /> : null}
                  </div>
                  {nightImg?.masterUrl ? (
                    <figure className="di-night__pic" {...(itemOf.get(nightImg) ? ed.item(itemOf.get(nightImg)!) : {})}>
                      <img src={nightImg.masterUrl} alt={nightImg.alt || ""} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", ...photoFit(nightImg, 0.5, 0.4) }} />
                      {town ? <figcaption>{town}</figcaption> : null}
                    </figure>
                  ) : null}
                </>,
              )
            : null}

          {/* The program, as a run of show */}
          {showProgram ? (
            feature(
              "program",
              "di-program",
              "schedule",
              "di-program",
              <>
                <Field as="h2" className="di-h" path="custom.programTitle" value={customValue(content, "programTitle")} fallback="The Program" placeholder="" editor={editorPreview} />
                {schedule.length ? (
                  <ol className="di-run" {...ed.list("schedule")}>
                    {schedule.map((s) => {
                      const t = timeOf(s.startTime);
                      const [hm, ap] = t.split(" ");
                      return (
                        <li key={s.id} {...ed.item(s.id)}>
                          <span className="di-run__t">
                            {hm || (editorPreview ? "Time" : "")}
                            {ap ? <small>{ap}</small> : null}
                          </span>
                          <span className="di-run__w">
                            <Field className="di-run__l" path="label" value={s.label} placeholder="What’s happening" editor={editorPreview} />
                            {s.description || editorPreview ? <Field className="di-run__d" path="description" value={s.description} placeholder="A line about it (optional)" editor={editorPreview} /> : null}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
                <AddItem list="schedule" label={schedule.length ? "Add to the program" : "Add your program"} editor={editorPreview} className="di-add" />
              </>,
            )
          ) : vis.schedule === false ? (
            <HiddenSection k="schedule" label="The Program" editor={editorPreview} />
          ) : null}

          {/* The lists: 18 Roses, Candles, Treasures… */}
          {showLists ? (
            <div className="di-lists" {...ed.section("entourage")} {...ed.list("entourage")}>
              {longLists.map((l, li) => (
                <section key={l.id} id={`di-list-${l.id}`} className="di-feat di-list" {...ed.item(l.id)}>
                  <div className="di-feat__in" data-reveal>
                    <header className="di-list__head">
                      <Field as="h2" className="di-list__title" path="title" value={l.title} placeholder="List name, e.g. 18 Roses" editor={editorPreview}>
                        {l.num ? (
                          <>
                            <span className="di-list__num">{l.num}</span>
                            <span className="di-list__word">{l.word}</span>
                          </>
                        ) : (
                          l.title
                        )}
                      </Field>
                      {l.deck ? <p className="di-list__deck">{l.deck}</p> : null}
                    </header>
                    <ol className="di-names">
                      {l.people.map((p, j) => (
                        <li key={j}>
                          <span className="di-names__n">{String(j + 1).padStart(2, "0")}</span>
                          <Field className="di-names__p" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                        </li>
                      ))}
                    </ol>
                    <AddItem list={`entourage:${l.id}:people`} label="Add a name" editor={editorPreview} className="di-add di-add--sm" />
                  </div>
                  {folio(`list-${li}`)}
                </section>
              ))}
              {shortLists.length ? (
                <section id={`di-list-${shortLists[0].id}`} className="di-feat di-list di-list--short">
                  <div className="di-feat__in di-short" data-reveal>
                    {shortLists.map((l) => (
                      <div key={l.id} className="di-short__g" {...ed.item(l.id)}>
                        <Field as="p" className="di-kicker" path="title" value={l.title} placeholder="List name, e.g. Escort" editor={editorPreview} />
                        <ul className="di-short__names">
                          {l.people.map((p, j) => (
                            <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                          ))}
                        </ul>
                        <AddItem list={`entourage:${l.id}:people`} label="Add a name" editor={editorPreview} className="di-add di-add--sm" />
                      </div>
                    ))}
                  </div>
                  {folio(`list-${longLists.length}`)}
                </section>
              ) : null}
              <AddItem list="entourage" label={lists.length ? "Add a list" : "Add your 18 Roses, Candles and Treasures"} editor={editorPreview} className="di-add di-add--wide" />
            </div>
          ) : vis.entourage === false ? (
            <HiddenSection k="entourage" label="The lists" editor={editorPreview} />
          ) : null}

          {/* The pictorial */}
          {showPictorial ? (
            feature(
              "pictorial",
              "di-pictorial",
              "gallery",
              "di-pictorial",
              <>
                <Field as="h2" className="di-h" path="custom.pictorialTitle" value={customValue(content, "pictorialTitle")} fallback="The Pictorial" placeholder="" editor={editorPreview} />
                <div className={`di-pics${slots.length < 3 ? " di-pics--few" : ""}`} {...ed.list("gallery")}>
                  {slots.map((item, i) => (
                    <figure key={item?.id ?? `add-${i}`} className="di-pic" {...(item ? ed.item(item.id) : {})}>
                      <PhotoSlot image={item?.image ?? null} editorPreview={editorPreview} className="di-pic__img" style={{ aspectRatio: item?.image.width && item.image.height ? `${item.image.width} / ${item.image.height}` : "3 / 4" }} />
                      {item?.caption?.trim() ? <figcaption>{item.caption}</figcaption> : null}
                    </figure>
                  ))}
                </div>
              </>,
            )
          ) : vis.gallery === false ? (
            <HiddenSection k="gallery" label="The Pictorial" editor={editorPreview} />
          ) : null}

          {/* What to wear */}
          {showDress ? (
            feature(
              "dress",
              "di-dress",
              "dress",
              "di-dress",
              <>
                <Field as="h2" className="di-h" path="custom.dressTitle" value={customValue(content, "dressTitle")} fallback="What to Wear" placeholder="" editor={editorPreview} />
                <Field as="p" className="di-dress__text" path="custom.dressCode" value={dress} placeholder="Your dress code. Your motif colours show as the colour story." editor={editorPreview} multiline />
                {swatches.length ? (
                  <ul className="di-colours" aria-label="Motif colours">
                    {swatches.map((c, i) => (
                      <li key={c + i} style={{ ["--c" as string]: c } as CSSProperties}>
                        <span className="di-colours__chip" />
                        <span className="di-colours__n">No. {i + 1}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>,
            )
          ) : vis.dress === false ? (
            <HiddenSection k="dress" label="What to Wear" editor={editorPreview} />
          ) : null}

          {/* Gift guide */}
          {showGifts ? (
            feature(
              "gifts",
              "di-gifts",
              "registry",
              "di-gifts",
              <>
                <Field as="h2" className="di-h" path="custom.giftTitle" value={customValue(content, "giftTitle")} fallback="Gift Guide" placeholder="" editor={editorPreview} />
                <Field as="p" className="di-text" path="cashGiftNote" value={giftNote} fallback={cash || content.registryLinks.length ? "Your presence is the best gift. If you’d like to give something, here’s how." : undefined} placeholder="A note about gifts, e.g. no gifts needed." editor={editorPreview} multiline />
                {content.registryLinks.length || ed.on ? (
                  <div className="di-links" {...ed.list("registryLinks")}>
                    {content.registryLinks.map((r) => (
                      <a key={r.id} {...ed.item(r.id)} className="di-btn di-btn--line" href={ed.on ? undefined : r.url || undefined} target="_blank" rel="noopener noreferrer">
                        <Field path="storeName" value={r.storeName} placeholder="Store or fund name" editor={editorPreview} />
                      </a>
                    ))}
                    <AddItem list="registryLinks" label="Add a gift link" editor={editorPreview} className="di-add di-add--sm" />
                  </div>
                ) : null}
                {cash || (ed.on && (content.cashGifts ?? []).length) ? (
                  <div className="di-cash">
                    {ed.on ? null : (
                      <button type="button" className="di-btn di-btn--line" aria-expanded={giftsOpen} onClick={() => setGiftsOpen((o) => !o)}>
                        {giftsOpen ? "Hide the details" : "View the details"}
                      </button>
                    )}
                    {giftsOpen || ed.on ? (
                      <div className="di-cash__in">
                        <CashGifts content={content} note={false} editor={editorPreview} look={{ ink: "var(--di-ink)", muted: "var(--di-soft)", surface: "var(--di-card)", line: "var(--di-line)", bodyFont: "var(--di-body)", displayFont: "var(--di-display)", radius: 2, align: "left" }} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <AddItem list="cashGifts" label="Add GCash, Maya or bank" editor={editorPreview} className="di-add" />
                )}
              </>,
            )
          ) : vis.registry === false ? (
            <HiddenSection k="registry" label="Gift Guide" editor={editorPreview} />
          ) : null}

          {/* Q&A */}
          {showFaq ? (
            feature(
              "faq",
              "di-faq",
              "faqs",
              "di-faq",
              <>
                <Field as="h2" className="di-h" path="custom.faqTitle" value={customValue(content, "faqTitle")} fallback="Q&A" placeholder="" editor={editorPreview} />
                <div className="di-qa" {...ed.list("faqs")}>
                  {faqs.map((f) => (
                    <div key={f.id} className="di-qa__item" {...ed.item(f.id)}>
                      <p className="di-qa__q">
                        <span aria-hidden>Q.</span>
                        <Field path="question" value={f.question} placeholder="A question guests ask" editor={editorPreview} />
                      </p>
                      <p className="di-qa__a">
                        <span aria-hidden>A.</span>
                        <Field path="answer" value={f.answer} placeholder="The answer" editor={editorPreview} multiline />
                      </p>
                    </div>
                  ))}
                </div>
                <AddItem list="faqs" label="Add a question" editor={editorPreview} className="di-add" />
              </>,
            )
          ) : vis.faqs === false ? (
            <HiddenSection k="faqs" label="Q&A" editor={editorPreview} />
          ) : null}

          {/* The reply card, or her thanks once the night has passed */}
          {over ? (
            <section className="di-feat di-after">
              <div className="di-feat__in" data-reveal>
                <p className="di-kicker">After the night</p>
                <p className="di-after__text">{customValue(content, "afterParty") || "Thank you for celebrating with me."}</p>
              </div>
            </section>
          ) : showRsvp ? (
            <section id="rsvp" className="di-feat di-reply" {...ed.section("rsvp")}>
              <div className="di-feat__in" data-reveal>
                <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} celebrant={first} />
              </div>
              {folio("rsvp")}
            </section>
          ) : vis.rsvp === false ? (
            <HiddenSection k="rsvp" label="RSVP" editor={editorPreview} />
          ) : null}
        </main>

        {/* The back cover */}
        <footer className="di-back">
          <Field as="p" className="di-back__line" path="custom.closing" value={closing} fallback="See you on the dance floor" placeholder="" editor={editorPreview} />
          {mast ? <p className="di-back__mast">{mast}</p> : null}
          {showRsvp && !ed.on ? (
            <button type="button" className="di-btn" onClick={toRsvp}>
              <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Reply now" placeholder="" editor={editorPreview} />
            </button>
          ) : null}
          <Barcode seed={`${mast}${content.eventDate}back`} digits={`${num.padStart(2, "0")} ${(content.eventDate || "0000-00-00").slice(0, 10).replace(/-/g, "")}`} className="di-barcode di-barcode--back" />
          {credit.show ? (
            <p className="di-credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
