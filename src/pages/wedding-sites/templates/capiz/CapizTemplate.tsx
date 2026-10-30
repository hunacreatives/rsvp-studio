import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
import { photosOf } from "../shared/reveal";
import { photoFit } from "../shared/photoFit";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { Bay, Sampaguita } from "./art";
import { Farol, LampPost } from "./props";
import { dateWords, eventIsOver, firstNames, monogram, receptionMap, splitEntourage, timeOf, timeWords, townOf } from "./content";
import { useHouse } from "./house";
import RsvpSill from "./RsvpSill";
import { CAPIZ_CSS } from "./styles";

/**
 * Capiz (wedding, Premium): the upper floor of an old Filipino bahay na bato at dusk, its
 * narra frames and rows of sliding capiz windows lit from inside, the ventanillas' turned
 * balusters under them, and the stone silong at the base. Every part of the day is a room
 * behind one window.
 *  - Each swipe goes on to the next window, and its two capiz sashes slide open onto the room
 *    (house.ts): the couple's photo and names, the invitation, the ceremony and reception, the
 *    story, the entourage, the day, what to wear, the photos, good to know, gifts and the reply.
 *    The page ends at the stone base, by the open street door.
 *  - The opening (published page and design preview): the first window closed, the lamp coming
 *    up behind the shell, then the sashes slide open onto the couple.
 *  - The shell, the narra, the balusters, the adobe and the roof tiles are drawn in code
 *    (materials.ts), in a worker; the couple's photos come from their content.
 *  - On a phone the house is one tall column of windows. Builder, gallery card, reduced motion:
 *    every window open and still.
 */

const isDark = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

/** Which photos (by index) span two cells so every row of the wall fills: landscapes first. */
function widePicks(imgs: { width?: number; height?: number }[], count: number): Set<number> {
  if (!count) return new Set();
  const all = imgs.map((m, i) => ({ i, land: (m.width ?? 0) > (m.height ?? 0) }));
  return new Set([...all.filter((w) => w.land), ...all.filter((w) => !w.land)].slice(0, count).map((w) => w.i));
}

export default function CapizTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const moving = !reduced && !editorPreview && !gallery;
  const rootRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [intro] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [giftsOpen, setGiftsOpen] = useState(false);
  const E = editorPreview;
  const ed = siteEdit(E);

  const photos = photosOf(content);
  const heroImg = settings.heroImage?.masterUrl ? settings.heroImage : photos[0]?.image;
  const rest = (settings.heroImage?.masterUrl ? photos : photos.slice(1)).map((p) => p.image);
  const storyImgs = rest.slice(0, 2);
  const wallImgs = rest.slice(2);
  const itemOf = new Map(photos.map((p) => [p.image, p.id]));
  const wallSlots = E && photos.length < 12 ? [...wallImgs, null] : wallImgs;
  const wideD = widePicks(wallImgs, (4 - (wallSlots.length % 4)) % 4);
  const wideM = widePicks(wallImgs, wallSlots.length % 2);

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
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => E || s.label.trim());
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  // The builder keeps empty items on the page (so one just added can be typed into) and every
  // window with its "+ Add …", in the house's fixed order: its rooms can be hidden, not moved.
  const { parents, rows } = splitEntourage(content, E);
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => E || f.question.trim());
  const travel = content.travelInformation.filter((t) => E || t.title.trim() || t.body.trim());
  const stay = content.accommodations.filter((a) => E || a.name.trim());
  const cash = hasCashGifts(content);
  const hosts = content.hosts.map((h) => ({ id: h.id, full: h.name, first: h.name.trim().split(/\s+/)[0] ?? "" })).filter((h) => E || h.first);
  const gifts = content.registryLinks.length > 0 || cash;
  const over = !E && eventIsOver(content.eventDate);
  const vis = settings.sectionVisibility;
  const dark = isDark(theme.background);
  const mono = monogram(content);

  const show = {
    venues: !!(venue || recName || E),
    story: vis.hostIntro !== false && !!(paragraphs.length || E),
    entourage: vis.entourage !== false && !!(rows.length || E),
    day: vis.schedule !== false && !!(schedule.length || E),
    dress: vis.dress !== false && !!(dress || swatches.length || E),
    wall: vis.gallery !== false && wallSlots.length > 0,
    faq: vis.faqs !== false && (faqs.length > 0 || E),
    travel: vis.travelInformation !== false && (travel.length > 0 || E),
    stay: vis.accommodations !== false && (stay.length > 0 || E),
    gifts: vis.registry !== false && (gifts || E),
    rsvp: !over && vis.rsvp !== false,
  };
  const showKnow = show.faq || show.travel || show.stay;
  const KNOW = ["faqs", "travelInformation", "accommodations"];
  const route = gallery
    ? ["hero"]
    : ["hero", "invite", show.venues && "venues", show.story && "story", show.entourage && "entourage", show.day && "day", show.dress && "dress", show.wall && "wall", showKnow && "know", show.gifts && "gifts", (over || show.rsvp) && "street"].filter(Boolean);
  useHouse(rootRef, { routeKey: `${route.join(",")}|${dark ? 1 : 0}`, animate: moving, intro, snap: (live || demo) && moving });

  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);
  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: moving ? "smooth" : "auto", block: "start" });

  const longest = Math.max(5, ...names.map((n) => n.length));
  const vars = {
    ["--cz-bg" as string]: theme.background,
    ["--cz-ink" as string]: theme.ink,
    ["--cz-muted" as string]: theme.muted,
    ["--cz-display" as string]: theme.displayFont,
    ["--cz-body" as string]: theme.bodyFont,
    ["--cz-name" as string]: `clamp(44px, ${Math.min(6.4, 40 / longest).toFixed(2)}cqw, 96px)`,
    ["--cz-name-m" as string]: `clamp(40px, ${Math.min(15, 74 / longest).toFixed(2)}cqw, 64px)`,
  } as CSSProperties;
  const cls = ["cz-root", gallery ? "cz-gallery" : "", dark ? "cz-dark" : "", moving ? "cz-motion" : "cz-still", intro ? "cz-intro" : "cz-named cz-lit", E ? "cz-editor" : ""].filter(Boolean).join(" ");

  // the house, top to bottom: wood (the first window, the ventanilla, a plastered pier, the plank
  // wall, the calado), then the stone silong (from the beam line down) and the street
  const STONE = ["day", "dress", "wall", "know", "gifts", "street"];
  const firstStone = route.find((k) => STONE.includes(k as string));
  const part = (k: string, children: ReactNode, opts: { id?: string; sec?: [string, string[]?]; className?: string } = {}) => (
    <section
      key={k}
      className={`cz-part cz-part--${k}${k === firstStone ? " cz-part--below" : ""} ${opts.className ?? ""}`}
      data-cz-bay
      data-cz-key={k}
      id={opts.id}
      {...(opts.sec ? (ed.section(opts.sec[0], opts.sec[1]) as Record<string, string>) : {})}
    >
      {k === firstStone ? (
        <div className="cz-beamline" aria-hidden>
          <span className="cz-beamline__beam" />
          <span className="cz-beamline__corbels" />
        </div>
      ) : null}
      {children}
    </section>
  );
  const title = (key: string, fallback: string, className = "") => <Field as="h2" className={`cz-title ${className}`} path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} placeholder="" editor={E} />;

  // ---- the first window: the couple
  const hero = (
    <Bay
      key="hero"
      k="hero"
      seed={3}
      top={
        <div className="cz-eave" aria-hidden>
          <span className="cz-eave__sky" />
          <span className="cz-eave__tiles" />
          <span className="cz-eave__soffit" />
        </div>
      }
    >
      <div className={`cz-hero${heroImg?.masterUrl || E ? "" : " cz-hero--words"}`}>
        {heroImg?.masterUrl ? (
          <div className="cz-hero__photo">
            <img data-cz-hero-img src={heroImg.masterUrl} alt={heroImg.alt || ""} loading="eager" decoding="async" style={{ ...photoFit(heroImg, 0.5, 0.3) }} />
          </div>
        ) : E ? (
          <PhotoSlot image={null} editorPreview className="cz-hero__photo" label="Add your photo" />
        ) : null}
        <div className="cz-hero__words">
          <Field as="p" className="cz-whisper cz-rise" path="custom.heroLine" value={customValue(content, "heroLine")} fallback="The wedding of" placeholder="" editor={E} />
          <h1 className={`cz-names cz-rise${hosts.length ? "" : " cz-hint"}`} {...ed.list("hosts")}>
            {hosts.length
              ? hosts.map((h, i) => (
                  <span key={h.id} className="cz-names__one" {...ed.item(h.id)}>
                    {i > 0 ? <span className="cz-amp">{i === hosts.length - 1 ? "&" : ","}</span> : null}
                    <Field className="cz-name" path="name" value={h.full} placeholder="Name" editor={E}>
                      {h.first}
                    </Field>
                  </span>
                ))
              : E
                ? "Your names"
                : null}
          </h1>
          {when ? <p className="cz-date cz-rise">{when}</p> : E ? <p className="cz-date cz-hint">Your date</p> : null}
          {town ? <p className="cz-town cz-rise">{town}</p> : null}
        </div>
      </div>
    </Bay>
  );

  // ---- under the window: the ventanilla's balusters, then the narra planks with the invitation
  const invite = part(
    "invite",
    <>
      <div className="cz-vent" aria-hidden>
        <span className="cz-vent__room" />
        <span className="cz-vent__panel" />
        <span className="cz-vent__bal" />
      </div>
      <div className="cz-face cz-planks">
        <div className="cz-copy cz-light cz-invite">
          {vis.parents !== false && parents.length ? (
            <>
              <Field as="p" className="cz-whisper" path="custom.parentsLine" value={customValue(content, "parentsLine")} fallback="Together with our parents" placeholder="" editor={E} />
              <div className="cz-parents" {...ed.list("entourage")}>
                {parents.map((g, i) => (
                  <div key={g.id} {...ed.item(g.id)}>
                    {i > 0 ? <span className="cz-parents__and">and</span> : null}
                    {g.people.map((p, j) => (
                      <Field key={j} as="p" path={`people.${j}`} value={p} placeholder="Name" editor={E} />
                    ))}
                    <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={E} />
                  </div>
                ))}
              </div>
            </>
          ) : vis.parents === false ? (
            <HiddenSection k="parents" label="Parents" editor={E} />
          ) : null}
          <Field as="p" className="cz-line" path="custom.invitation" value={customValue(content, "invitation")} fallback="we request the honour of your presence at our wedding" placeholder="" editor={E} multiline />
          {when ? <p className="cz-when">{when}</p> : E ? <p className="cz-when cz-hint">Your date</p> : null}
          {words || venue ? <p className="cz-at">{[words, venue].filter(Boolean).join(", at ")}</p> : null}
          {vis.countdown !== false && content.eventDate && !over ? <Countdown iso={content.eventDate} live={live || demo || E} prefix="cz" /> : vis.countdown === false ? <HiddenSection k="countdown" label="Countdown" editor={E} /> : null}
          {show.rsvp ? (
            <button type="button" className="cz-btn cz-btn--light" onClick={ed.on ? undefined : toRsvp}>
              <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Kindly reply" placeholder="" editor={E} />
            </button>
          ) : null}
        </div>
      </div>
    </>,
  );

  // ---- a lime-washed pier between the windows, a farol on its bracket: the ceremony and reception
  const venues = part(
    "venues",
    <div className="cz-face cz-plaster">
      <span className="cz-edgewin" aria-hidden>
        <span className="cz-glass" data-cz-glass style={{ ["--sx" as string]: 3, ["--sy" as string]: 1 } as CSSProperties} />
      </span>
      <div className="cz-lampspot cz-lampspot--venues" aria-hidden>
        <span className="cz-glow" />
        <Farol id={`${uid}-f1`} />
      </div>
      <div className={`cz-copy cz-venues${recName || E ? "" : " cz-venues--one"}`}>
        <article className="cz-venue">
          <p className="cz-whisper">The ceremony</p>
          <Field as="h3" className="cz-venue__name" path="primaryLocation.name" value={venue} placeholder="Your church or venue" editor={E} />
          <Field as="p" className="cz-venue__addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
          {words ? <p className="cz-venue__time">{words}</p> : null}
          <VenueLinks content={content} font="var(--cz-body)" color="var(--cz-ink)" size={15} />
        </article>
        {recName || E ? (
          <article className="cz-venue">
            <p className="cz-whisper">The reception</p>
            <Field as="h3" className="cz-venue__name" path="custom.receptionName" value={recName} placeholder="Reception venue, if it’s elsewhere" editor={E} />
            <Field as="p" className="cz-venue__addr" path="custom.receptionAddress" value={recAddress} placeholder="Address" editor={E} />
            <Field as="p" className="cz-venue__time" path="custom.receptionTime" value={recTime} placeholder="Time, e.g. half past four" editor={E} />
            {recMap && !E ? (
              <a className="cz-link" href={recMap} target="_blank" rel="noopener noreferrer">
                Open in Maps
              </a>
            ) : null}
          </article>
        ) : null}
      </div>
    </div>,
  );

  // ---- the narra plank wall, a farol hanging on its chain: the story, the photos framed on the wall
  const story = part(
    "story",
    <div className="cz-face cz-boards">
      <div className="cz-lampspot cz-lampspot--story" aria-hidden>
        <span className="cz-glow" />
        <Farol id={`${uid}-f2`} mount="chain" />
      </div>
      <div className={`cz-copy cz-story${storyImgs.length || E ? "" : " cz-story--text"}`}>
        {storyImgs.length || E ? (
          <div className={`cz-story__photos cz-story__photos--${Math.max(1, E ? 2 : storyImgs.length)}`}>
            <PhotoSlot image={storyImgs[0]} editorPreview={E} className="cz-frame cz-frame--a" />
            {storyImgs[1] || E ? <PhotoSlot image={storyImgs[1]} editorPreview={E} className="cz-frame cz-frame--b" /> : null}
          </div>
        ) : null}
        <div className="cz-story__text cz-light">
          {title("storyTitle", "Our story", "cz-title--left")}
          {paragraphs.length ? (
            paragraphs.map((p, i) => <Field key={i} as="p" className={`cz-text${i === 0 ? " cz-text--lead" : ""}`} path={`story#${i}`} value={p} placeholder="" editor={E} multiline />)
          ) : (
            <Field as="p" className="cz-text cz-text--lead" path="story#0" value="" placeholder="Your story, or a note to your guests, in your own words." editor={E} multiline />
          )}
        </div>
      </div>
    </div>,
    { sec: ["hostIntro"] },
  );

  // ---- a lit calado transom, and the plastered wall under it: the entourage
  const entourage = part(
    "entourage",
    <>
      <div className="cz-calado" aria-hidden>
        <span className="cz-calado__light" />
        <span className="cz-calado__wood">
          <span />
        </span>
      </div>
      <div className="cz-face cz-plaster cz-plaster--ent">
        <div className="cz-copy cz-ent">
          {title("entourageTitle", "The entourage")}
          {rows.length ? (
            <div className="cz-ent__rows" {...ed.list("entourage")}>
              {rows.map((row, r) => (
                <div key={r} className={`cz-ent__row cz-ent__row--${row.kind}`} style={{ ["--n" as string]: row.cells.length }}>
                  {row.cells.map((c) => (
                    <div key={c.id} {...ed.item(c.id)} className="cz-cell">
                      <Field as="p" className="cz-cell__t" path="title" value={c.raw} placeholder="Group, e.g. Principal Sponsors" editor={E}>
                        {c.title}
                      </Field>
                      <ul className={`cz-cell__names${row.kind === "principal" && c.people.length > 3 ? " cz-cell__names--cols" : ""}`}>
                        {c.people.map((p, j) => (
                          <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={E} />
                        ))}
                      </ul>
                      <AddItem list={`entourage:${c.id}:people`} label="Add a name" editor={E} className="cz-add" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          <AddItem list="entourage" label={rows.length ? "Add a group" : "Add your sponsors and entourage"} editor={E} className="cz-add" />
        </div>
      </div>
    </>,
    { sec: ["entourage"] },
  );

  // ---- the stone silong: a marble plaque set in it, the day cut into it
  const day = part(
    "day",
    <div className="cz-face cz-stone">
      <div className="cz-plaque">
        <div className="cz-copy cz-day">
          {title("dayTitle", "The day")}
          {schedule.length ? (
            <ol className="cz-dayline" {...ed.list("schedule")}>
              {schedule.map((s) => (
                <li key={s.id} {...ed.item(s.id)}>
                  <span className="cz-dayline__t">{timeOf(s.startTime) || (E ? "Time" : "")}</span>
                  <span className="cz-dayline__w">
                    <Field path="label" value={s.label} placeholder="What’s happening" editor={E} />
                    {s.description || E ? <Field as="em" path="description" value={s.description} placeholder="A note (optional)" editor={E} multiline /> : null}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
          <AddItem list="schedule" label={schedule.length ? "Add to the day" : "Add the order of the day"} editor={E} className="cz-add" />
        </div>
      </div>
    </div>,
    { sec: ["schedule"] },
  );

  // ---- bougainvillea spilling over the stone: what to wear, the motif in a little capiz window
  const dressPart = part(
    "dress",
    <div className="cz-face cz-stone cz-stone--flora">
      <span className="cz-flora" aria-hidden />
      <span className="cz-flora cz-flora--b" aria-hidden />
      <div className="cz-copy cz-light cz-attire">
        <h2 className="cz-title">What to wear</h2>
        <Field as="p" className="cz-text" path="custom.dressCode" value={dress} placeholder="Your dress code. Your motif colours show as tinted capiz panes." editor={E} multiline />
      </div>
      {swatches.length ? (
        <div className="cz-tint" role="img" aria-label="The colours of the day, in tinted capiz">
          <span className="cz-tint__light" style={{ background: `linear-gradient(90deg, ${swatches.map((c, i) => `${c} ${((i / swatches.length) * 100).toFixed(2)}% ${(((i + 1) / swatches.length) * 100).toFixed(2)}%`).join(", ")})` }} />
          <span className="cz-glass" data-cz-glass data-cz-cols={swatches.length} style={{ ["--sx" as string]: 2, ["--sy" as string]: 5 } as CSSProperties} />
        </div>
      ) : null}
    </div>,
    { sec: ["dress"] },
  );

  // ---- the photos, set deep in the stone in a row of niches
  const wall = part(
    "wall",
    <div className="cz-face cz-stone cz-stone--wall">
      <div className="cz-niches" aria-label={content.galleries[0]?.title?.trim() || "Photos"} {...ed.list("gallery")}>
        {wallSlots.map((img, i) => (
          <div key={img?.id ?? `add-${i}`} {...(img && itemOf.get(img) ? ed.item(itemOf.get(img)!) : {})} className={`cz-niche${wideD.has(i) ? " is-wide-d" : ""}${wideM.has(i) ? " is-wide-m" : ""}`}>
            <PhotoSlot image={img} editorPreview={E} className="cz-niche__photo" />
          </div>
        ))}
      </div>
    </div>,
    { sec: ["gallery"] },
  );

  // ---- by the great zaguan doors, shut: good to know
  const know = part(
    "know",
    <div className="cz-face cz-stone cz-stone--door">
      <div className="cz-lampspot cz-lampspot--door" aria-hidden>
        <span className="cz-glow" />
        <Farol id={`${uid}-f3`} />
      </div>
      <span className="cz-zaguan" aria-hidden>
        {(["l", "r"] as const).map((side) => (
          <span key={side} className={`cz-zaguan__leaf cz-zaguan__leaf--${side}`}>
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="cz-panel" />
            ))}
            <span className="cz-hinge cz-hinge--a" />
            <span className="cz-hinge cz-hinge--b" />
            {side === "r" ? <span className="cz-knocker" /> : null}
          </span>
        ))}
      </span>
      <div className="cz-copy cz-light cz-know">
        <h2 className="cz-title cz-title--left">Good to know</h2>
        <div className="cz-know__grid">
          {show.faq ? (
            <div {...ed.list("faqs")} style={{ display: "contents" }}>
              {faqs.map((f) => (
                <div key={f.id} {...ed.item(f.id)} className="cz-item">
                  <Field as="p" className="cz-item__q" path="question" value={f.question} placeholder="A question guests ask" editor={E} />
                  <Field as="p" className="cz-text" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
                </div>
              ))}
            </div>
          ) : null}
          {show.travel ? (
            <div {...ed.list("travelInformation")} style={{ display: "contents" }}>
              {travel.map((t) => (
                <div key={t.id} {...ed.item(t.id)} className="cz-item">
                  <Field as="p" className="cz-item__q" path="title" value={t.title} placeholder="By car, by plane…" editor={E} />
                  <Field as="p" className="cz-text" path="body" value={t.body} placeholder="How to get there" editor={E} multiline />
                </div>
              ))}
            </div>
          ) : null}
          {show.stay ? (
            <div {...ed.list("accommodations")} style={{ display: "contents" }}>
              {stay.map((a) => (
                <div key={a.id} {...ed.item(a.id)} className="cz-item">
                  <p className="cz-item__q">
                    {a.bookingUrl && !ed.on ? (
                      <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer">
                        {a.name}
                      </a>
                    ) : (
                      <Field path="name" value={a.name} placeholder="Where to stay" editor={E} />
                    )}
                  </p>
                  <Field as="p" className="cz-text" path="addressLine" value={a.addressLine} placeholder="Address" editor={E} />
                  {a.notes ? <Field as="p" className="cz-text cz-soft" path="notes" value={a.notes} placeholder="" editor={E} multiline /> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {ed.on ? (
          <div className="cz-adds">
            {show.faq ? <AddItem list="faqs" label="Add a question" editor className="cz-add" /> : null}
            {show.travel ? <AddItem list="travelInformation" label="Add how to get there" editor className="cz-add" /> : null}
            {show.stay ? <AddItem list="accommodations" label="Add a place to stay" editor className="cz-add" /> : null}
          </div>
        ) : null}
      </div>
    </div>,
    { sec: ["faqs", KNOW] },
  );

  // ---- the zaguan doors standing open, the hall lit behind: gifts
  const giftsPart = part(
    "gifts",
    <div className="cz-face cz-stone cz-stone--open">
      <div className="cz-arch">
        <span className="cz-arch__in" aria-hidden />
        <span className="cz-arch__leaf cz-arch__leaf--l" aria-hidden />
        <span className="cz-arch__leaf cz-arch__leaf--r" aria-hidden />
        <div className="cz-copy cz-gifts">
          <h2 className="cz-title">Gifts</h2>
          <Field as="p" className="cz-text" path="cashGiftNote" value={content.cashGiftNote?.trim()} fallback="Your presence is the greatest gift. Should you wish to give, here’s how." placeholder="" editor={E} multiline />
          {content.registryLinks.length || ed.on ? (
            <div className="cz-links" {...ed.list("registryLinks")}>
              {content.registryLinks.map((r) => (
                <a key={r.id} {...ed.item(r.id)} className="cz-btn cz-btn--line" href={ed.on ? undefined : r.url || undefined} target="_blank" rel="noopener noreferrer">
                  <Field path="storeName" value={r.storeName} placeholder="Store or fund name" editor={E} />
                </a>
              ))}
              <AddItem list="registryLinks" label="Add a gift link" editor={E} className="cz-add" />
            </div>
          ) : null}
          {cash || (ed.on && (content.cashGifts ?? []).length) ? (
            giftsOpen || ed.on ? (
              <div className="cz-gift">
                {ed.on ? (
                  <p className="cz-gift__btn">
                    <Field className="cz-btn cz-btn--line" path="custom.giftButton" value={customValue(content, "giftButton")} fallback="View gift details" placeholder="" editor />
                  </p>
                ) : null}
                <CashGifts content={content} note={false} editor={E} look={{ ink: "#2a180e", muted: "#6a4e38", surface: "rgba(255, 246, 228, 0.7)", line: "rgba(60, 30, 10, 0.2)", bodyFont: "var(--cz-body)", displayFont: "var(--cz-body)", radius: 2 }} />
              </div>
            ) : (
              <button type="button" className="cz-btn cz-btn--line" aria-expanded={false} onClick={() => setGiftsOpen(true)}>
                {customValue(content, "giftButton") || "View gift details"}
              </button>
            )
          ) : (
            <AddItem list="cashGifts" label="Add GCash, Maya or bank" editor={E} className="cz-add" />
          )}
        </div>
      </div>
    </div>,
    { sec: ["registry"] },
  );

  // ---- the street at the house's foot: the reply card on the step, the lamp post, the cobbles
  const street = part(
    "street",
    <>
      <div className="cz-face cz-stone cz-stone--plinth">
        <div className="cz-lamppost" aria-hidden>
          <span className="cz-glow cz-glow--post" />
          <LampPost id={`${uid}-lp`} />
        </div>
        {over ? (
          <div className="cz-card">
            <div className="cz-copy">
              <h2 className="cz-title">Maraming salamat po</h2>
              <p className="cz-text">{customValue(content, "afterParty") || `Thank you for celebrating with ${names.join(" & ") || "us"}.`}</p>
            </div>
          </div>
        ) : show.rsvp ? (
          <div className="cz-card" id="rsvp" {...(ed.section("rsvp") as Record<string, string>)}>
            <RsvpSill content={content} editorPreview={E} sample={!live && !E} />
          </div>
        ) : (
          <HiddenSection k="rsvp" label="RSVP" editor={E} />
        )}
      </div>
      <div className="cz-step" aria-hidden />
      <div className="cz-street">
        <span className="cz-street__ground" aria-hidden>
          <span className="cz-street__cobbles" />
        </span>
        <div className="cz-street__words">
          <Field as="p" className="cz-closing" path="custom.closing" value={customValue(content, "closing")} fallback="Hanggang sa muli" placeholder="" editor={E} />
          <Field as="p" className="cz-mono" path="custom.monogram" value={customValue(content, "monogram")} fallback={mono} placeholder="" editor={E} />
          <Sampaguita size={20} />
          {credit.show ? (
            <p className="cz-credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
            </p>
          ) : null}
        </div>
      </div>
    </>,
  );

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{CAPIZ_CSS}</style>
      {hero}
      {gallery ? null : (
        <>
          {invite}
          {show.venues ? venues : null}
          {show.story ? story : vis.hostIntro === false ? <HiddenSection k="hostIntro" label="Our story" editor={E} /> : null}
          {show.entourage ? entourage : vis.entourage === false ? <HiddenSection k="entourage" label="Entourage" editor={E} /> : null}
          {show.day ? day : vis.schedule === false ? <HiddenSection k="schedule" label="The day" editor={E} /> : null}
          {show.dress ? dressPart : vis.dress === false ? <HiddenSection k="dress" label="What to wear" editor={E} /> : null}
          {show.wall ? wall : vis.gallery === false ? <HiddenSection k="gallery" label="Photos" editor={E} /> : null}
          {showKnow ? know : <HiddenSection k="faqs" vis={KNOW} label="Good to know" editor={E} />}
          {show.gifts ? giftsPart : vis.registry === false ? <HiddenSection k="registry" label="Gifts" editor={E} /> : null}
          {street}
        </>
      )}
    </div>
  );
}
