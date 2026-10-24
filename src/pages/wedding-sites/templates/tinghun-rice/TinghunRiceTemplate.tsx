import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CHINESE_SERIF, loadFontFamilies } from "../../presentation/loadFonts";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { Countdown } from "../shared/Countdown";
import { PhotoSlot } from "../shared/PhotoSlot";
import { photosOf, useReveal } from "../shared/reveal";
import { PAPER_GRAIN } from "../shared/stationery";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { dateWords, eventIsOver, lunarDate, monogram, receptionMap, timeOf, timeWords } from "../tinghun/content";
import { hasZh, sealChars, splitFamilies } from "./content";
import { FIBRES, PapercutXi, Seal, Zh } from "./art";
import { Thread } from "./Thread";
import RsvpCard from "./RsvpCard";
import { RICE_CSS } from "./styles";

/**
 * Rice Paper (Ting Hun, Premium): fine stationery from a quiet studio. Warm rice paper, ink,
 * one vermilion seal and one red thread.
 *  - The hero is set like a vertical card: the large characters (訂婚) down a narrow spine with
 *    the families' seal (their two surnames, carved 白文) beneath, the couple's names beside.
 *    On the published page and the design preview the seal presses down onto the paper, the
 *    ink spreading a little as it settles; then the red thread draws itself down the page as
 *    you scroll, out of the seal, down the margin and once around each section's Chinese
 *    label, ending at the papercut 囍 that hangs from it at the close.
 *  - Everything else is still: generous margins, Chinese large and quiet, Latin in Lora.
 * In the builder, on the gallery card and with reduced motion the seal is already stamped and
 * the thread is whole.
 */

const WENKAI = "LXGW+WenKai+TC:wght@400;700";
const CLOSING = "多謝 · Thank you";
const ZH_FONT = '"LXGW WenKai TC", "Noto Serif TC", "Songti TC", "PMingLiU", serif';

export default function TinghunRiceTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("tinghun-rice-zh", [WENKAI, ...CHINESE_SERIF]);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced && !editorPreview;
  const pageRef = useRef<HTMLDivElement>(null);

  // The seal presses on the published page and the design preview, unless the guest came
  // straight to the reply card (#rsvp) or asked for less motion.
  const [play] = useState(() => (live || demo) && motion && !(typeof window !== "undefined" && window.location.hash === "#rsvp"));
  const [stamp, setStamp] = useState(false);
  const [go, setGo] = useState(false);
  const [giftsOpen, setGiftsOpen] = useState(false);

  const seal = sealChars(content);
  const sealKey = seal.chars.join("");

  // Press once the seal's characters have their font (or after a moment regardless), so the
  // carving never changes shape mid-press. The thread starts when the ink has settled.
  useEffect(() => {
    if (!play) return;
    let t1 = 0;
    let t2 = 0;
    let done = false;
    const press = () => {
      if (done) return;
      done = true;
      setStamp(true);
      t2 = window.setTimeout(() => setGo(true), 2100);
    };
    t1 = window.setTimeout(press, 1400);
    const fonts = document.fonts;
    if (fonts?.load) {
      Promise.all([fonts.load(`700 40px "Noto Serif TC"`, sealKey), fonts.load(`400 40px "LXGW WenKai TC"`, "訂婚")])
        .then(() => window.setTimeout(press, 120))
        .catch(press);
    }
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // Only on the first load: later changes to the names don't press it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const photos = photosOf(content);
  useReveal(pageRef, motion, [content.entourage?.length, photos.length]);

  const ed = siteEdit(editorPreview);
  const vis = settings.sectionVisibility;
  const heroZhRaw = customValue(content, "heroZh");
  const heroZh = heroZhRaw === "none" ? "" : heroZhRaw || "訂婚";
  const hosts = content.hosts.filter((h) => editorPreview || h.name.trim());
  const zhNames = [customValue(content, "hostZh1"), customValue(content, "hostZh2")];
  const when = dateWords(content.eventDate);
  const words = timeWords(content.eventDate);
  const lunar = lunarDate(content);
  const over = !editorPreview && eventIsOver(content.eventDate);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const recName = customValue(content, "receptionName");
  const recAddress = customValue(content, "receptionAddress");
  const recTime = customValue(content, "receptionTime");
  const recMap = receptionMap(content);
  const familiesZh = customValue(content, "familiesZh");
  const { parents, others } = splitFamilies(content, editorPreview);
  const showParents = vis.parents !== false && parents.length > 0;
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => editorPreview || f.question.trim());
  const cash = hasCashGifts(content);
  const giftNote = content.cashGiftNote?.trim() ?? "";
  const itemOf = new Map(photos.map((p) => [p.image, p.id]));
  const shots = photos.slice(0, 6).map((p) => p.image);
  const slots = editorPreview && shots.length < 6 ? [...shots, ...Array<null>(Math.max(1, 3 - shots.length)).fill(null)] : shots;
  const mono = monogram(content);
  const closing = customValue(content, "closing");

  const showVenues = !!(venue || recName || editorPreview);
  const showStory = vis.hostIntro !== false && !!(paragraphs.length || editorPreview);
  const showDay = vis.schedule !== false && !!(schedule.length || editorPreview);
  const showElders = vis.entourage !== false && !!(others.length || editorPreview);
  const showDress = vis.dress !== false && !!(dress || swatches.length || editorPreview);
  const showPhotos = vis.gallery !== false && slots.length > 0;
  const showGifts = vis.registry !== false && !!(content.registryLinks.length || cash || giftNote || editorPreview);
  const showFaq = vis.faqs !== false && (faqs.length > 0 || editorPreview);
  const showRsvp = !over && vis.rsvp !== false;

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });

  const vars = {
    ["--rp-bg" as string]: theme.background,
    ["--rp-ink" as string]: theme.ink,
    ["--rp-muted" as string]: theme.muted,
    ["--rp-display" as string]: theme.displayFont,
    ["--rp-body" as string]: theme.bodyFont,
    ["--rp-zh" as string]: ZH_FONT,
    ["--rp-grain" as string]: `url("${PAPER_GRAIN}")`,
    ["--rp-fibres" as string]: `url("${FIBRES}")`,
  } as CSSProperties;

  const cls = ["rp-root", gallery ? "rp-gallery" : "", play ? "rp-play" : "", stamp ? "rp-stamp" : ""].filter(Boolean).join(" ");
  const d = (s: number) => ({ ["--d" as string]: `${s}s` }) as CSSProperties;

  /** A section: its Chinese label in the margin (the thread winds once around it), then the words. */
  const sec = (key: string | null, zh: string, className: string, body: ReactNode, attrs: Record<string, unknown> = {}) => (
    <section className={`rp-sec ${className}`} {...(key ? ed.section(key) : {})} {...attrs}>
      <div className="rp-gut" aria-hidden>
        <span className="rp-knot rp-zh" lang="zh-Hant">
          {zh}
        </span>
      </div>
      <div className="rp-body" data-reveal>
        {body}
      </div>
    </section>
  );

  const invitationFallback = showParents ? "request the pleasure of your company at the Ting Hun of their children" : "We request the pleasure of your company at our Ting Hun";

  return (
    <div className={cls} style={vars}>
      <style>{RICE_CSS}</style>
      <div ref={pageRef} className="rp-page">
        <Thread play={play} go={go} deps={[content, settings, editorPreview]} />

        {/* The cover: the characters and the seal down the spine, the names beside them */}
        <header className="rp-hero">
          <div className="rp-spine">
            {heroZh ? (
              <p className="rp-hero__zh rp-zh rp-rise" style={d(0.1)} lang="zh-Hant">
                {heroZh}
              </p>
            ) : null}
            <Seal key={sealKey} chars={seal.chars} zh={seal.zh} label={seal.chars.length ? `The families’ seal: ${seal.chars.join(" ")}` : "The families’ seal"} />
          </div>

          <div className="rp-hero__words">
            <Field as="p" className="rp-eyebrow rp-rise" style={d(1.5)} path="custom.heroLine" value={customValue(content, "heroLine")} fallback="The Ting Hun of" placeholder="" editor={editorPreview} />
            <div className="rp-couple rp-rise" style={d(1.65)}>
              <h1 className="rp-names" {...ed.list("hosts")}>
                {hosts.length ? (
                  hosts.map((h, i) => (
                    <span key={h.id} className={`rp-host rp-host--${i}`} {...ed.item(h.id)}>
                      {i > 0 ? (
                        <span className="rp-amp" aria-label="and">
                          &amp;
                        </span>
                      ) : null}
                      <Field className="rp-name" path="name" value={h.name} placeholder="Name" editor={editorPreview} />
                    </span>
                  ))
                ) : editorPreview ? (
                  <span className="rp-name rp-hint">Your names</span>
                ) : null}
              </h1>
              {hosts.slice(0, 2).map((h, i) => (
                <Field key={h.id} as="p" className={`rp-name-zh rp-name-zh--${i} rp-zh`} lang="zh-Hant" path={`custom.hostZh${i + 1}`} value={zhNames[i]} placeholder="中文名 (optional)" editor={editorPreview} />
              ))}
            </div>
          </div>

          <div className="rp-hero__more rp-rise" style={d(1.9)}>
            {when ? <p className="rp-date">{when}</p> : editorPreview ? <p className="rp-date rp-hint">Your date</p> : null}
            {vis.lunar !== false && lunar ? (
              <p className="rp-lunar">
                <span className="rp-lunar__tag rp-zh" lang="zh-Hant">
                  農曆
                </span>
                <span className="rp-zh" lang="zh-Hant">
                  {lunar}
                </span>
              </p>
            ) : null}
            {vis.countdown !== false && content.eventDate && !over ? <Countdown iso={content.eventDate} live={live || demo || editorPreview} prefix="rp" /> : null}
            {showRsvp ? (
              <button type="button" className="rp-btn rp-btn--line" onClick={ed.on ? undefined : toRsvp}>
                <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Kindly reply" placeholder="" editor={editorPreview} />
              </button>
            ) : null}
          </div>
        </header>

        <main className="rp-main">
          {/* The invitation, in the families' names */}
          {sec(
            null,
            "敬邀",
            "rp-invite",
            <>
              <Field as="p" className="rp-eyebrow" path="custom.familiesLine" value={customValue(content, "familiesLine")} placeholder="A line above the families (optional)" editor={editorPreview} />
              <Field as="p" className="rp-families" lang="zh-Hant" path="custom.familiesZh" value={familiesZh} placeholder="蔡府 · 林府" editor={editorPreview}>
                <Zh text={familiesZh} />
              </Field>
              {showParents ? (
                <div className="rp-parents" {...ed.list("entourage")}>
                  {parents.map((g, i) => (
                    <div key={g.id} className="rp-parents__g" {...ed.item(g.id)}>
                      {i > 0 ? <span className="rp-parents__and">and</span> : null}
                      {g.people.map((p, j) => (
                        <Field key={j} as="p" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                      ))}
                      <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={editorPreview} className="rp-add rp-add--sm" />
                    </div>
                  ))}
                </div>
              ) : null}
              <Field as="p" className="rp-invite__line" path="custom.invitation" value={customValue(content, "invitation")} fallback={invitationFallback} placeholder="" editor={editorPreview} multiline />
              {hosts.length ? <p className="rp-invite__names">{hosts.map((h) => h.name.trim()).filter(Boolean).join(" and ")}</p> : null}
              {when ? <p className="rp-invite__when">{words ? `${when}, at ${words.toLowerCase()}` : when}</p> : null}
            </>,
          )}

          {/* Where: the ceremony at home, then the lauriat */}
          {showVenues
            ? sec(
                null,
                "地點",
                "rp-venues",
                <>
                  <h2 className="rp-h">Where</h2>
                  <div className="rp-venues__grid">
                    <article className="rp-venue">
                      <p className="rp-label">The ceremony</p>
                      <Field as="h3" className="rp-venue__name" path="primaryLocation.name" value={venue} placeholder="The family home, or your venue" editor={editorPreview} />
                      <Field as="p" className="rp-venue__addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={editorPreview} />
                      {words ? <p className="rp-venue__time">{words}</p> : null}
                      <VenueLinks content={content} font="var(--rp-body)" color="var(--rp-ink)" size={15} align="left" />
                    </article>
                    {recName || editorPreview ? (
                      <article className="rp-venue rp-venue--second">
                        <Field as="p" className="rp-label" path="custom.lauriatLabel" value={customValue(content, "lauriatLabel")} fallback="The lauriat" placeholder="" editor={editorPreview} />
                        <Field as="h3" className="rp-venue__name" path="custom.receptionName" value={recName} placeholder="Lunch or dinner venue, if it’s elsewhere" editor={editorPreview} />
                        <Field as="p" className="rp-venue__addr" path="custom.receptionAddress" value={recAddress} placeholder="Address" editor={editorPreview} />
                        <Field as="p" className="rp-venue__time" path="custom.receptionTime" value={recTime} placeholder="Time, e.g. half past twelve" editor={editorPreview} />
                        {recMap ? (
                          <a className="rp-venue__map" href={ed.on ? undefined : recMap} target="_blank" rel="noopener noreferrer">
                            Open in Maps
                          </a>
                        ) : null}
                      </article>
                    ) : null}
                  </div>
                </>,
              )
            : null}

          {/* A note from the families */}
          {showStory ? (
            sec(
              "hostIntro",
              "家書",
              "rp-story",
              <>
                <Field as="h2" className="rp-h" path="custom.storyTitle" value={customValue(content, "storyTitle")} fallback="A note from our families" placeholder="" editor={editorPreview} />
                <div className="rp-story__text">
                  {paragraphs.length ? (
                    paragraphs.map((p, i) => <Field key={i} as="p" className={`rp-text${i === 0 ? " rp-text--lead" : ""}`} path={`story#${i}`} value={p} placeholder="" editor={editorPreview} multiline />)
                  ) : (
                    <Field as="p" className="rp-text rp-text--lead" path="story#0" value="" placeholder="A few words to your guests, from both families." editor={editorPreview} multiline />
                  )}
                </div>
              </>,
            )
          ) : vis.hostIntro === false ? (
            <HiddenSection k="hostIntro" label="A note from our families" editor={editorPreview} />
          ) : null}

          {/* The ceremony, hour by hour */}
          {showDay ? (
            sec(
              "schedule",
              "吉時",
              "rp-day",
              <>
                <Field as="h2" className="rp-h" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="The ceremony" placeholder="" editor={editorPreview} />
                {schedule.length ? (
                  <ol className="rp-day__list" {...ed.list("schedule")}>
                    {schedule.map((s) => (
                      <li key={s.id} {...ed.item(s.id)}>
                        <span className="rp-day__t">{timeOf(s.startTime) || (editorPreview ? "Time" : "")}</span>
                        <Field className="rp-day__w" path="label" value={s.label} placeholder="What’s happening" editor={editorPreview} />
                        {s.description || editorPreview ? (
                          hasZh(s.description) ? (
                            <Field className="rp-day__zh rp-zh" lang="zh-Hant" path="description" value={s.description} placeholder="" editor={editorPreview}>
                              <Zh text={s.description ?? ""} />
                            </Field>
                          ) : (
                            <Field className="rp-day__note" path="description" value={s.description} placeholder="中文 (optional)" editor={editorPreview} />
                          )
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
                <AddItem list="schedule" label={schedule.length ? "Add to the ceremony" : "Add the order of the day"} editor={editorPreview} className="rp-add" />
              </>,
            )
          ) : vis.schedule === false ? (
            <HiddenSection k="schedule" label="The ceremony" editor={editorPreview} />
          ) : null}

          {/* Elders and family */}
          {showElders ? (
            sec(
              "entourage",
              "長輩",
              "rp-elders",
              <>
                <Field as="h2" className="rp-h" path="custom.eldersTitle" value={customValue(content, "eldersTitle")} fallback="Elders and family" placeholder="" editor={editorPreview} />
                {others.length ? (
                  <div className="rp-elders__grid" {...ed.list("entourage")}>
                    {others.map((g) => (
                      <div key={g.id} className="rp-elder" {...ed.item(g.id)}>
                        <Field as="p" className="rp-label" path="title" value={g.title} placeholder="Group, e.g. Grandparents of the Bride" editor={editorPreview} />
                        <ul>
                          {g.people.map((p, j) => (
                            <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                          ))}
                        </ul>
                        <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={editorPreview} className="rp-add rp-add--sm" />
                      </div>
                    ))}
                  </div>
                ) : null}
                <AddItem list="entourage" label={others.length ? "Add a group" : "Add grandparents and elders"} editor={editorPreview} className="rp-add" />
              </>,
            )
          ) : vis.entourage === false ? (
            <HiddenSection k="entourage" label="Elders and family" editor={editorPreview} />
          ) : null}

          {/* What to wear */}
          {showDress ? (
            sec(
              "dress",
              "衣著",
              "rp-dress",
              <>
                <h2 className="rp-h">What to wear</h2>
                <Field as="p" className="rp-text" path="custom.dressCode" value={dress} placeholder="Your dress code. Your motif colours show beside it." editor={editorPreview} multiline />
                {swatches.length ? (
                  <div className="rp-swatches" role="img" aria-label="Motif colours">
                    {swatches.map((c, i) => (
                      <span key={c + i} style={{ ["--c" as string]: c }} />
                    ))}
                  </div>
                ) : null}
              </>,
            )
          ) : vis.dress === false ? (
            <HiddenSection k="dress" label="What to wear" editor={editorPreview} />
          ) : null}

          {/* Photos (only when there are some) */}
          {showPhotos ? (
            sec(
              "gallery",
              "留影",
              "rp-photos",
              <>
                <h2 className="rp-h">Photos</h2>
                <div className={`rp-photos__grid rp-photos__grid--${Math.min(slots.length, 6)}`} {...ed.list("gallery")}>
                  {slots.map((img, i) => (
                    <div key={img?.id ?? `add-${i}`} className="rp-photo" {...(img && itemOf.get(img) ? ed.item(itemOf.get(img)!) : {})}>
                      <PhotoSlot image={img} editorPreview={editorPreview} className="rp-photo__img" />
                    </div>
                  ))}
                </div>
              </>,
            )
          ) : vis.gallery === false ? (
            <HiddenSection k="gallery" label="Photos" editor={editorPreview} />
          ) : null}

          {/* Ang pao and gifts */}
          {showGifts ? (
            sec(
              "registry",
              "心意",
              "rp-gifts",
              <>
                <Field as="h2" className="rp-h" path="custom.giftTitle" value={customValue(content, "giftTitle")} fallback="Ang pao and gifts" placeholder="" editor={editorPreview} />
                <Field as="p" className="rp-text" path="cashGiftNote" value={giftNote} fallback={cash || content.registryLinks.length ? "Your presence is our blessing. Should you wish to give, the details are below." : undefined} placeholder="A note about gifts, e.g. no gifts are expected." editor={editorPreview} multiline />
                {content.registryLinks.length || ed.on ? (
                  <div className="rp-links" {...ed.list("registryLinks")}>
                    {content.registryLinks.map((r) => (
                      <a key={r.id} {...ed.item(r.id)} className="rp-link-out" href={ed.on ? undefined : r.url || undefined} target="_blank" rel="noopener noreferrer">
                        <Field path="storeName" value={r.storeName} placeholder="Store or fund name" editor={editorPreview} />
                      </a>
                    ))}
                    <AddItem list="registryLinks" label="Add a gift link" editor={editorPreview} className="rp-add rp-add--sm" />
                  </div>
                ) : null}
                {cash || (ed.on && (content.cashGifts ?? []).length) ? (
                  <div className={`rp-cash${giftsOpen || ed.on ? " is-open" : ""}`}>
                    {ed.on ? null : (
                      <button type="button" className="rp-btn rp-btn--line" aria-expanded={giftsOpen} onClick={() => setGiftsOpen((o) => !o)}>
                        {giftsOpen ? "Hide the details" : "View the details"}
                      </button>
                    )}
                    {giftsOpen || ed.on ? (
                      <div className="rp-cash__inside">
                        <CashGifts content={content} note={false} editor={editorPreview} look={{ ink: "var(--rp-ink)", muted: "var(--rp-soft)", surface: "var(--rp-card)", line: "var(--rp-line)", bodyFont: "var(--rp-body)", displayFont: "var(--rp-display)", radius: 2, align: "left" }} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <AddItem list="cashGifts" label="Add GCash, Maya or bank" editor={editorPreview} className="rp-add" />
                )}
              </>,
            )
          ) : vis.registry === false ? (
            <HiddenSection k="registry" label="Ang pao and gifts" editor={editorPreview} />
          ) : null}

          {/* Good to know */}
          {showFaq ? (
            sec(
              "faqs",
              "須知",
              "rp-know",
              <>
                <h2 className="rp-h">Good to know</h2>
                <div className="rp-know__list" {...ed.list("faqs")}>
                  {faqs.map((f) => (
                    <div key={f.id} className="rp-q" {...ed.item(f.id)}>
                      <Field as="p" className="rp-q__q" path="question" value={f.question} placeholder="A question guests ask" editor={editorPreview} />
                      <Field as="p" className="rp-text" path="answer" value={f.answer} placeholder="The answer" editor={editorPreview} multiline />
                    </div>
                  ))}
                </div>
                <AddItem list="faqs" label="Add a question" editor={editorPreview} className="rp-add" />
              </>,
            )
          ) : vis.faqs === false ? (
            <HiddenSection k="faqs" label="Good to know" editor={editorPreview} />
          ) : null}

          {/* The reply, or the families' thanks once the day has passed */}
          {over ? (
            sec(
              null,
              "致謝",
              "rp-after",
              <>
                <h2 className="rp-h">With thanks</h2>
                <p className="rp-text rp-text--lead">{customValue(content, "afterParty") || "Thank you for celebrating with our families."}</p>
              </>,
            )
          ) : showRsvp ? (
            sec(
              "rsvp",
              "回函",
              "rp-reply",
              <>
                <Field as="h2" className="rp-h" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Kindly reply" placeholder="" editor={editorPreview} />
                <div className="rp-cards">
                  <span className="rp-cards__under" aria-hidden />
                  <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} />
                </div>
              </>,
            )
          ) : vis.rsvp === false ? (
            <HiddenSection k="rsvp" label="RSVP" editor={editorPreview} />
          ) : null}
        </main>

        {/* The close: the 囍 hangs from the end of the thread */}
        <footer className="rp-close">
          <PapercutXi className="rp-xi" />
          {ed.on ? (
            <Field as="p" className="rp-close__line" path="custom.closing" value={closing} fallback={CLOSING} placeholder="" editor>
              <Zh text={closing} />
            </Field>
          ) : (
            <p className="rp-close__line">
              <Zh text={closing || CLOSING} />
            </p>
          )}
          <Field as="p" className="rp-mono" path="custom.monogram" value={customValue(content, "monogram")} fallback={mono || undefined} placeholder="Your initials" editor={editorPreview} />
          {credit.show ? (
            <p className="rp-credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
