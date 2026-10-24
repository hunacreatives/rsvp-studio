import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
import { PhotoSlot } from "../shared/PhotoSlot";
import { photosOf, useReveal } from "../shared/reveal";
import { PAPER_GRAIN } from "../shared/stationery";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { AngPao, BoxBase, BoxLid, Corners, DoorsMark, Knot, LATTICE, LATTICE_SQ, Ring, Skirt, TableMark } from "./art";
import { dateWords, eventIsOver, familyGroups, givenName, hasHan, lunarDate, monogram, receptionMap, timeOf, timeWords } from "./content";
import RsvpCard from "./RsvpCard";
import { LACQUER_CSS } from "./styles";

/**
 * Lacquer Door (Ting Hun, Premium): the most traditional of the three. The guest arrives at
 * the bride's family home, as the groom's family does.
 *  - The door: a pair of carved lattice doors in cinnabar lacquer with leaf-gold edges and
 *    brass rings, a single 囍 in the round window of the transom. On the published page and
 *    the design preview the doors swing open from the centre (hinged at the outer edges),
 *    light spilling out through the gap and onto the step, and the couple's names are there
 *    inside. In the builder, on the gallery card and with reduced motion the doors rest open.
 *  - Inside, the page is symmetrical and bilingual: each section headed in Chinese (large)
 *    over English. The order of the day is a tiered betrothal box, one tier for each part of
 *    the ceremony; the elders sit on the front panels of a lacquer gift box.
 *  - It ends on a lacquer base with the closing line and the monogram.
 */

const ZH = '"Chiron Sung HK", "Noto Serif TC", "Songti TC", "PMingLiU", serif';

const isDark = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

/** A section's heading: the Chinese large, the English under it. */
function Head({ zh, children }: { zh: string; children: ReactNode }) {
  return (
    <header className="lq-head" data-reveal>
      <span className="lq-zh lq-head__zh" lang="zh-Hant">
        {zh}
      </span>
      <Knot className="lq-head__knot" />
      {children}
    </header>
  );
}

/** One door leaf: the lattice, the waist panel with its ring, the carved skirt. */
function Leaf({ side }: { side: "l" | "r" }) {
  return (
    <div className={`lq-leaf lq-leaf--${side}`} aria-hidden>
      <span className="lq-leaf__lattice" />
      <span className="lq-leaf__waist">
        <span className="lq-leaf__cartouche" />
        <Ring />
      </span>
      <span className="lq-leaf__skirt">
        <Skirt />
      </span>
      <span className="lq-leaf__foot" />
      <span className="lq-leaf__shade" />
    </div>
  );
}

export default function TinghunLacquerTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("tinghun-lacquer-zh", ["Chiron+Sung+HK:wght@400;600;700", ...CHINESE_SERIF]);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced && !editorPreview;
  const pageRef = useRef<HTMLDivElement>(null);

  // The doors open on the published page and the design preview, unless the guest arrived on
  // a deep link (#rsvp) or asked for less motion.
  const [play] = useState(() => (live || demo) && !gallery && motion && !(typeof window !== "undefined" && window.location.hash === "#rsvp"));
  const [go, setGo] = useState(false);

  // Open once the Chinese face is in (the names are behind the doors), or after a moment regardless.
  useEffect(() => {
    if (!play) return;
    let done = false;
    const start = () => {
      if (done) return;
      done = true;
      setGo(true);
    };
    const min = new Promise((r) => window.setTimeout(r, 450));
    void Promise.all([min, document.fonts?.ready ?? Promise.resolve()]).then(start);
    const cap = window.setTimeout(start, 1600);
    return () => {
      done = true;
      window.clearTimeout(cap);
    };
  }, [play]);

  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const ed = siteEdit(editorPreview);
  const photos = photosOf(content).slice(0, 6);
  useReveal(pageRef, motion, [content.entourage?.length, photos.length, content.schedule.length]);

  const hosts = content.hosts.map((h) => ({ id: h.id, full: h.name, first: givenName(h.name) })).filter((h) => editorPreview || h.first);
  const zhNames = [customValue(content, "hostZh1"), customValue(content, "hostZh2")];
  const heroZhRaw = customValue(content, "heroZh") || "訂婚";
  // The transom already holds the 囍, so it isn't written a second time inside.
  const heroZh = heroZhRaw === "none" || heroZhRaw === "囍" ? "" : heroZhRaw;
  const when = dateWords(content.eventDate);
  const lunarOwn = customValue(content, "lunarDate");
  const lunar = lunarDate(content);
  const words = timeWords(content.eventDate);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const recName = customValue(content, "receptionName");
  const recAddress = customValue(content, "receptionAddress");
  const recTime = customValue(content, "receptionTime");
  const recMap = receptionMap(content);
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => editorPreview || s.label.trim() || s.description?.trim());
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const { parents, others } = familyGroups(content, editorPreview);
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => editorPreview || f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash;
  const over = !editorPreview && eventIsOver(content.eventDate);
  const vis = settings.sectionVisibility;
  const dark = isDark(theme.background);
  const mono = monogram(content);
  const itemOf = new Map(photos.map((p) => [p.image, p.id]));
  const slots = editorPreview && photos.length < 6 ? [...photos.map((p) => p.image), null] : photos.map((p) => p.image);

  const showParents = vis.parents !== false && (parents.length > 0 || editorPreview);
  const showVenues = !!(venue || recName || editorPreview);
  const showStory = vis.hostIntro !== false && !!(paragraphs.length || editorPreview);
  const showDay = vis.schedule !== false && !!(schedule.length || editorPreview);
  const showElders = vis.entourage !== false && !!(others.length || editorPreview);
  const showDress = vis.dress !== false && !!(dress || swatches.length || editorPreview);
  const showPhotos = vis.gallery !== false && slots.length > 0;
  const showGifts = vis.registry !== false && (gifts || !!content.cashGiftNote?.trim() || editorPreview);
  const showFaq = vis.faqs !== false && (faqs.length > 0 || editorPreview);
  const showRsvp = !over && vis.rsvp !== false;

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });

  const vars = {
    ["--lq-bg" as string]: theme.background,
    ["--lq-ink" as string]: theme.ink,
    // mutedText darkens the swatch for small text on paper; on the night scheme it would sink.
    ["--lq-muted" as string]: dark ? theme.muted : mutedText(theme),
    ["--lq-display" as string]: theme.displayFont,
    ["--lq-body" as string]: theme.bodyFont,
    ["--lq-zh" as string]: ZH,
    ["--lq-grain" as string]: `url("${PAPER_GRAIN}")`,
    ["--lq-lattice" as string]: `url("${LATTICE}")`,
    ["--lq-lattice-sq" as string]: `url("${LATTICE_SQ}")`,
  } as CSSProperties;

  const cls = ["lq-root", gallery ? "lq-gallery" : "", dark ? "lq-dark" : "", play ? "lq-play" : "", go ? "lq-go" : ""].filter(Boolean).join(" ");
  const rise = (i: number) => ({ ["--d" as string]: `${(1.55 + i * 0.16).toFixed(2)}s` }) as CSSProperties;

  return (
    <div className={cls} style={vars}>
      <style>{LACQUER_CSS}</style>
      <div ref={pageRef} className="lq-page">
        {/* ---- The door ---- */}
        <section className="lq-hero" aria-label="Invitation">
          <div className="lq-portal">
            <div className="lq-lintel" aria-hidden>
              <span className="lq-pin" />
              <span className="lq-pin" />
            </div>
            <div className="lq-frame">
              <div className="lq-transom" aria-hidden>
                <span className="lq-transom__lattice" />
                <span className="lq-moon">
                  <span className="lq-zh lq-moon__xi" lang="zh-Hant">
                    囍
                  </span>
                </span>
                <span className="lq-transom__lattice" />
              </div>
              <div className="lq-opening">
                <div className="lq-inside">
                  {heroZh ? (
                    <p className="lq-zh lq-hz lq-rise" lang="zh-Hant" style={rise(0)}>
                      {heroZh}
                    </p>
                  ) : null}
                  <Field as="p" className="lq-hline lq-rise" style={rise(1)} path="custom.heroLine" value={customValue(content, "heroLine")} placeholder="A small line above your names" editor={editorPreview} />
                  <h1 className={`lq-names lq-rise${hosts.length ? "" : " lq-hint"}`} style={rise(2)} {...ed.list("hosts")}>
                    {hosts.length ? (
                      hosts.map((h, i) => (
                        <span key={h.id} className="lq-name">
                          {i > 0 ? (
                            <span className="lq-amp">
                              {i === hosts.length - 1 ? "&" : "·"}
                            </span>
                          ) : null}
                          <span className="lq-name__col">
                            <span className="lq-name__en" {...ed.item(h.id)}>
                              <Field path="name" value={h.full} placeholder="Name" editor={editorPreview}>
                                {h.first}
                              </Field>
                            </span>
                            {i < 2 ? (
                              <Field as="span" className="lq-zh lq-name__zh" lang="zh-Hant" path={`custom.hostZh${i + 1}`} value={zhNames[i]} placeholder="中文名" editor={editorPreview} />
                            ) : null}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="lq-name__en">Your names</span>
                    )}
                  </h1>
                  <Knot className="lq-inside__knot lq-rise" style={rise(2.6)} />
                  {when ? (
                    <p className="lq-date lq-rise" style={rise(3)}>
                      {when}
                    </p>
                  ) : editorPreview ? (
                    <p className="lq-date lq-hint">Your date</p>
                  ) : null}
                  {vis.lunar !== false && (lunar || editorPreview) ? (
                    <p className="lq-lunar lq-rise" style={rise(3.5)}>
                      <span className="lq-zh lq-lunar__k" lang="zh-Hant">
                        農曆
                      </span>
                      <Field as="span" className="lq-zh lq-lunar__v" lang="zh-Hant" path="custom.lunarDate" value={lunarOwn} fallback={lunar || undefined} placeholder="丁未年二月初六" editor={editorPreview} />
                    </p>
                  ) : null}
                  {vis.countdown !== false && content.eventDate && !over ? (
                    <div className="lq-rise" style={rise(4.5)}>
                      <Countdown iso={content.eventDate} live={live || demo || editorPreview} prefix="lq" />
                    </div>
                  ) : null}
                  {showRsvp ? (
                    <button type="button" className="lq-btn lq-rise" style={rise(5.2)} onClick={ed.on ? undefined : toRsvp}>
                      <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Kindly reply" placeholder="" editor={editorPreview} />
                    </button>
                  ) : null}
                </div>
                <span className="lq-inside__depth" aria-hidden />
                <Leaf side="l" />
                <Leaf side="r" />
                {play ? <span className="lq-seam" aria-hidden /> : null}
              </div>
            </div>
            <div className="lq-sill" aria-hidden />
          </div>
          <span className="lq-floor" aria-hidden>
            <span className="lq-spill" />
          </span>
          {play ? <span className="lq-dusk" aria-hidden /> : null}
        </section>

        <main className="lq-main">
          {/* ---- The invitation: the two families ---- */}
          <section className="lq-sec lq-invite">
            <div className="lq-invite__card" data-reveal>
              <Corners />
              <Field as="p" className="lq-zh lq-invite__zh" lang="zh-Hant" path="custom.familiesZh" value={customValue(content, "familiesZh")} placeholder="陳府 · 林府" editor={editorPreview} />
              <Field as="p" className="lq-eyebrow" path="custom.familiesLine" value={customValue(content, "familiesLine")} fallback="Together with their families" placeholder="" editor={editorPreview} />
              {showParents ? (
                parents.length ? (
                  <div className={`lq-parents${parents.length === 1 ? " lq-parents--one" : ""}`} {...ed.list("entourage")}>
                    {parents.map((g) => (
                      <div key={g.id} className="lq-parents__side" {...ed.item(g.id)}>
                        <Field as="p" className="lq-parents__t" path="title" value={g.title} placeholder="Parents of the Bride" editor={editorPreview} />
                        {g.people.map((p, j) => (
                          <Field key={j} as="p" className="lq-parents__n" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                        ))}
                        <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={editorPreview} className="lq-add lq-add--small" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="lq-small lq-hint">Add Parents of the Bride and Parents of the Groom in Entourage &amp; motif, and they show here.</p>
                )
              ) : null}
              <Field
                as="p"
                className="lq-invite__line"
                path="custom.invitation"
                value={customValue(content, "invitation")}
                fallback={"request the pleasure of your company at the Ting\u00a0Hun of their children"}
                placeholder=""
                editor={editorPreview}
                multiline
              />
            </div>
          </section>

          {/* ---- Where: the ceremony at home, then the lauriat ---- */}
          {showVenues ? (
            <section className="lq-sec lq-venues">
              <article className="lq-venue" data-reveal>
                <DoorsMark />
                <p className="lq-plaque">
                  <span className="lq-zh" lang="zh-Hant">
                    文定
                  </span>
                </p>
                <p className="lq-eyebrow">The ceremony</p>
                <Field as="h3" className="lq-venue__name" path="primaryLocation.name" value={venue} placeholder="The family home, or the venue" editor={editorPreview} />
                <Field as="p" className="lq-venue__addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={editorPreview} />
                {words ? <p className="lq-venue__time">{words}</p> : null}
                <VenueLinks content={content} font="var(--lq-body)" color="var(--lq-ink)" size={16} />
              </article>
              {recName || editorPreview ? (
                <article className="lq-venue" data-reveal style={{ ["--i" as string]: 1 }}>
                  <TableMark />
                  <p className="lq-plaque">
                    <span className="lq-zh" lang="zh-Hant">
                      喜宴
                    </span>
                  </p>
                  <p className="lq-eyebrow">The lauriat</p>
                  <Field as="h3" className="lq-venue__name" path="custom.receptionName" value={recName} placeholder="The restaurant, if it’s elsewhere" editor={editorPreview} />
                  <Field as="p" className="lq-venue__addr" path="custom.receptionAddress" value={recAddress} placeholder="Address" editor={editorPreview} />
                  <Field as="p" className="lq-venue__time" path="custom.receptionTime" value={recTime} placeholder="Time, e.g. half past twelve" editor={editorPreview} />
                  {recMap ? (
                    <a className="lq-venue__map" href={ed.on ? undefined : recMap} target="_blank" rel="noopener noreferrer">
                      Open in Maps
                    </a>
                  ) : null}
                </article>
              ) : null}
            </section>
          ) : null}

          {/* ---- A note from the families ---- */}
          {showStory ? (
            <section className="lq-sec lq-narrow lq-story" {...ed.section("hostIntro")}>
              <Head zh="家書">
                <h2 className="lq-head__en">A note from our families</h2>
              </Head>
              <div data-reveal>
                {paragraphs.length ? (
                  paragraphs.map((p, i) => <Field key={i} as="p" className={`lq-text${i === 0 ? " lq-text--lead" : ""}`} path={`story#${i}`} value={p} placeholder="" editor={editorPreview} multiline />)
                ) : (
                  <Field as="p" className="lq-text lq-text--lead" path="story#0" value="" placeholder="A few words from your families to your guests." editor={editorPreview} multiline />
                )}
              </div>
            </section>
          ) : vis.hostIntro === false ? (
            <HiddenSection k="hostIntro" label="A note from our families" editor={editorPreview} />
          ) : null}

          {/* ---- The order of the day: a tiered betrothal box ---- */}
          {showDay ? (
            <section className="lq-sec lq-day" {...ed.section("schedule")}>
              <Head zh="流程">
                <h2 className="lq-head__en">Order of the day</h2>
              </Head>
              <div className="lq-box" data-reveal>
                <BoxLid />
                {schedule.length ? (
                  <ol className="lq-tiers" {...ed.list("schedule")}>
                    {schedule.map((s, i) => {
                      const zh = hasHan(s.description);
                      return (
                        <li key={s.id} className="lq-tier" {...ed.item(s.id)} style={{ ["--i" as string]: i }}>
                          <span className="lq-tier__face">
                            <span className="lq-tier__t">{timeOf(s.startTime) || (editorPreview ? "Time" : "")}</span>
                            {s.description?.trim() || editorPreview ? (
                              <Field as="span" className={zh ? "lq-zh lq-tier__zh" : "lq-tier__desc"} lang={zh ? "zh-Hant" : undefined} path="description" value={s.description} placeholder="In Chinese, e.g. 敬茶" editor={editorPreview} />
                            ) : null}
                            <Field as="span" className="lq-tier__en" path="label" value={s.label} placeholder="What happens" editor={editorPreview} />
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="lq-tiers">
                    <div className="lq-tier">
                      <span className="lq-tier__face lq-hint">
                        <span className="lq-tier__en">The order of the day goes here</span>
                      </span>
                    </div>
                  </div>
                )}
                <BoxBase />
              </div>
              <AddItem list="schedule" label={schedule.length ? "Add to the day" : "Add the order of the day"} editor={editorPreview} className="lq-add lq-add--center" />
            </section>
          ) : vis.schedule === false ? (
            <HiddenSection k="schedule" label="Order of the day" editor={editorPreview} />
          ) : null}

          {/* ---- Elders & family: the front panels of a lacquer gift box ---- */}
          {showElders ? (
            <section className="lq-sec lq-elders" {...ed.section("entourage")}>
              <Head zh="長輩">
                <h2 className="lq-head__en">Elders &amp; family</h2>
              </Head>
              {others.length ? (
                <div className={`lq-chest${others.length === 1 ? " lq-chest--one" : ""}`} data-reveal {...ed.list("entourage")}>
                  <span className="lq-chest__brass" aria-hidden>
                    <Corners />
                  </span>
                  {others.map((g, i) => (
                    <div key={g.id} className="lq-panel" {...ed.item(g.id)} style={{ ["--i" as string]: i }}>
                      <Field as="p" className="lq-panel__t" path="title" value={g.title} placeholder="Group, e.g. Grandparents of the Bride" editor={editorPreview} />
                      <ul className="lq-panel__names">
                        {g.people.map((p, j) => (
                          <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={editorPreview} />
                        ))}
                      </ul>
                      <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={editorPreview} className="lq-add lq-add--small" />
                    </div>
                  ))}
                </div>
              ) : null}
              <AddItem list="entourage" label={others.length ? "Add a group" : "Add grandparents and elders"} editor={editorPreview} className="lq-add lq-add--center" />
            </section>
          ) : vis.entourage === false ? (
            <HiddenSection k="entourage" label="Elders & family" editor={editorPreview} />
          ) : null}

          {/* ---- What to wear ---- */}
          {showDress ? (
            <section className="lq-sec lq-narrow lq-attire" {...ed.section("dress")}>
              <Head zh="衣著">
                <h2 className="lq-head__en">What to wear</h2>
              </Head>
              <div data-reveal>
                <Field as="p" className="lq-text" path="custom.dressCode" value={dress} placeholder="Your dress code. Your motif colours show beside it." editor={editorPreview} multiline />
                {swatches.length ? (
                  <div className="lq-tray" role="img" aria-label="Motif colours">
                    {swatches.map((c, i) => (
                      <span key={c + i} className="lq-silk" style={{ ["--c" as string]: c }} />
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ) : vis.dress === false ? (
            <HiddenSection k="dress" label="What to wear" editor={editorPreview} />
          ) : null}

          {/* ---- Photos, in lattice frames ---- */}
          {showPhotos ? (
            <section className="lq-sec lq-photos" aria-label={content.galleries[0]?.title?.trim() || "Photos"} {...ed.section("gallery")}>
              <Head zh="留影">
                <h2 className="lq-head__en">{content.galleries[0]?.title?.trim() || "Photos"}</h2>
              </Head>
              <div className={`lq-frames lq-frames--${Math.min(slots.length, 6)}`} {...ed.list("gallery")}>
                {slots.map((img, i) => (
                  <div key={img?.id ?? `add-${i}`} className="lq-frame-photo" data-reveal style={{ ["--i" as string]: i % 3 }} {...(img && itemOf.get(img) ? ed.item(itemOf.get(img)!) : {})}>
                    <PhotoSlot image={img} editorPreview={editorPreview} className="lq-frame-photo__img" />
                  </div>
                ))}
              </div>
            </section>
          ) : vis.gallery === false ? (
            <HiddenSection k="gallery" label="Photos" editor={editorPreview} />
          ) : null}

          {/* ---- Ang pao & gifts ---- */}
          {showGifts ? (
            <section className="lq-sec lq-narrow lq-gifts" {...ed.section("registry")}>
              <Head zh="紅包">
                <Field as="h2" className="lq-head__en" path="custom.giftTitle" value={customValue(content, "giftTitle")} fallback="Ang pao & gifts" placeholder="" editor={editorPreview} />
              </Head>
              <div data-reveal>
                <AngPao />
                <Field as="p" className="lq-text" path="cashGiftNote" value={content.cashGiftNote?.trim()} fallback="Your presence is our blessing. Should you wish to give, here is how." placeholder="" editor={editorPreview} multiline />
                {content.registryLinks.length || ed.on ? (
                  <div className="lq-links" {...ed.list("registryLinks")}>
                    {content.registryLinks.map((r) => (
                      <a key={r.id} {...ed.item(r.id)} className="lq-btn lq-btn--line" href={ed.on ? undefined : r.url || undefined} target="_blank" rel="noopener noreferrer">
                        <Field path="storeName" value={r.storeName} placeholder="Store or fund name" editor={editorPreview} />
                      </a>
                    ))}
                    <AddItem list="registryLinks" label="Add a gift link" editor={editorPreview} className="lq-add" />
                  </div>
                ) : null}
                {cash || ed.on ? (
                  <CashGifts
                    content={content}
                    note={false}
                    editor={editorPreview}
                    look={{ ink: "#221a16", muted: "#6b5a4c", surface: "#fbf6ec", line: "rgba(176,141,74,.55)", bodyFont: "var(--lq-body)", displayFont: "var(--lq-display)", radius: 2 }}
                  />
                ) : null}
              </div>
            </section>
          ) : vis.registry === false ? (
            <HiddenSection k="registry" label="Ang pao & gifts" editor={editorPreview} />
          ) : null}

          {/* ---- Good to know ---- */}
          {showFaq ? (
            <section className="lq-sec lq-know" {...ed.section("faqs")}>
              <Head zh="須知">
                <h2 className="lq-head__en">Good to know</h2>
              </Head>
              <div className="lq-know__grid" {...ed.list("faqs")}>
                {faqs.map((f, i) => (
                  <div key={f.id} {...ed.item(f.id)} className="lq-item" data-reveal style={{ ["--i" as string]: i % 2 }}>
                    <Field as="p" className="lq-item__q" path="question" value={f.question} placeholder="A question guests ask" editor={editorPreview} />
                    <Field as="p" className="lq-text" path="answer" value={f.answer} placeholder="The answer" editor={editorPreview} multiline />
                  </div>
                ))}
              </div>
              <AddItem list="faqs" label="Add a question" editor={editorPreview} className="lq-add lq-add--center" />
            </section>
          ) : vis.faqs === false ? (
            <HiddenSection k="faqs" label="Good to know" editor={editorPreview} />
          ) : null}

          {/* ---- The reply ---- */}
          {over ? (
            <section className="lq-sec lq-narrow" data-reveal>
              <Head zh="多謝">
                <h2 className="lq-head__en">With thanks</h2>
              </Head>
              <p className="lq-text">{customValue(content, "afterParty") || "Thank you for celebrating with our families."}</p>
            </section>
          ) : showRsvp ? (
            <div className="lq-sec lq-rsvp-wrap" {...ed.section("rsvp")}>
              <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} />
            </div>
          ) : vis.rsvp === false ? (
            <HiddenSection k="rsvp" label="RSVP" editor={editorPreview} />
          ) : null}
        </main>

        {/* ---- The lacquer base ---- */}
        <footer className="lq-foot">
          <span className="lq-foot__lattice" aria-hidden />
          <Field
            as="p"
            className={`lq-foot__line${hasHan(customValue(content, "closing") || "多謝") ? " lq-mixed" : ""}`}
            path="custom.closing"
            value={customValue(content, "closing")}
            fallback="多謝 · Thank you"
            placeholder=""
            editor={editorPreview}
          />
          <Field as="p" className="lq-mono" path="custom.monogram" value={customValue(content, "monogram")} fallback={mono} placeholder="" editor={editorPreview} />
          <Knot className="lq-foot__knot" />
          {credit.show ? (
            <p className="lq-credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
