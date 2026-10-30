import { createElement, useEffect, useMemo, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { Seal } from "../letterpress/art";
import type { WaxLook } from "../letterpress/wax";
import { coupleNames, dateWords, eventIsOver, folio, initialsOf, nameParts, paragraphs, splitEntourage, timeOf, timeWords, townOf, type EntRow } from "./content";
import type { PenHandle } from "./ink";
import { useInkPage } from "./page";
import { Pen } from "./pen";
import RsvpCard from "./RsvpCard";
import { INKVOWS_CSS } from "./styles";

/**
 * Ink and vows (weddings, engagements): editorial calligraphy on one long sheet of heavy cotton
 * paper, seen close up in window light. A real pen writes: the couple's names first, then each
 * section's heading as the guest reaches it, stroke by stroke from the script face's own glyphs,
 * the nib travelling with the line, the ink wet and glossy where it has just been laid and drying
 * darker into the fibres (ink.ts, strokes.ts). Everything else is set like a fine magazine page.
 *  - Gold leaf is an accent: a few flecks in the paper by the names, and a gilded initial on the
 *    story. Wax is pressed on the reply.
 *  - One section a screen, each laid out the same from the top, one swipe a section (page.ts).
 *  - Builder: the words are plain type, edited in place. Gallery card, reduced motion: the ink
 *    is already dry.
 */

const OXBLOOD: WaxLook = { base: [0.42, 0.09, 0.1], metal: 0.12 };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Flakes of gold leaf caught in the paper: a few clusters, torn shapes, each catching the light. */
function Flecks({ seed, clusters, className }: { seed: number; clusters: [number, number, number][]; className: string }) {
  const items = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; y: number; s: number; k: number; rot: number; clip: string; light: number }[] = [];
    for (const [cx, cy, n] of clusters) {
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = Math.pow(r(), 1.6) * 9;
        const s = 2.5 + Math.pow(r(), 2.4) * 15;
        const pts = 5 + Math.floor(r() * 3);
        const poly = Array.from({ length: pts }, (_, j) => {
          const t = (j / pts) * Math.PI * 2 + r() * 0.5, rr = 0.55 + r() * 0.45;
          return `${(50 + Math.cos(t) * 50 * rr).toFixed(1)}% ${(50 + Math.sin(t) * 50 * rr).toFixed(1)}%`;
        });
        out.push({ x: cx + Math.cos(a) * d * 1.6, y: cy + Math.sin(a) * d, s, k: 0.45 + r() * 0.8, rot: r() * 360, clip: `polygon(${poly.join(",")})`, light: r() });
      }
    }
    return out;
  }, [seed, clusters]);
  return (
    <div className={`iv-flecks ${className}`} aria-hidden>
      {items.map((f, i) => (
        <i key={i} style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.s.toFixed(1)}px`, height: `${(f.s * f.k).toFixed(1)}px`, rotate: `${f.rot.toFixed(0)}deg`, clipPath: f.clip, backgroundPosition: `${(f.light * 300).toFixed(0)}px ${(f.light * 170).toFixed(0)}px`, filter: `brightness(${(0.85 + f.light * 0.4).toFixed(2)})` }} />
      ))}
    </div>
  );
}

/** A line the pen writes: the real text (for reading aloud and finding), shown as ink on a canvas
 *  laid over it. In the builder it's plain text, edited in place. */
function Ink({ as = "h2", className = "", path, value, fallback, editor, speed, max, label, children }: { as?: ElementType; className?: string; path: string; value: string; fallback?: string; editor: boolean; speed?: number; max?: number; label?: string; children?: ReactNode }) {
  const text = value.trim() || fallback || "";
  if (editor) return <Field as={as} className={`${className} iv-ink iv-ink--edit`} path={path} value={value} fallback={fallback} placeholder="Your words" editor />;
  if (!text) return null;
  return createElement(
    as,
    { className: `${className} iv-ink`, "data-iv-ink": "", "data-iv-speed": speed, "data-iv-max": max, "aria-label": label },
    <span className="iv-ink__t" data-iv-text>
      {children ?? text}
    </span>,
    <canvas className="iv-ink__c" aria-hidden />,
  );
}

const mixHex = (a: string, b: string, k: number) => {
  const p = (c: string) => { const m = /^#?([0-9a-f]{6})$/i.exec(c.trim()); const n = m ? parseInt(m[1], 16) : 0x1b2130; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const x = p(a), y = p(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
};

export default function InkvowsTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const moving = !reduced && !editorPreview && !gallery;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<PenHandle>(null);
  const [boot] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [opened, setOpened] = useState(!boot);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const ed = siteEdit(editorPreview);
  const E = editorPreview;

  const vis = settings.sectionVisibility;
  const couple = customValue(content, "names") || coupleNames(content);
  const parts = nameParts(couple);
  const letters = initialsOf(content, couple);
  const dw = dateWords(content.eventDate);
  const tw = timeWords(content.eventDate);
  const story = paragraphs(content.story);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const town = townOf(content);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => E || s.label.trim());
  const { parents, rows } = splitEntourage(content, E);
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const stay = content.accommodations.filter((a) => E || a.name.trim());
  const travel = content.travelInformation.filter((t) => E || t.title.trim() || t.body.trim());
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => E || f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash || !!customValue(content, "giftNote");
  const over = !E && eventIsOver(content.eventDate);

  const show = {
    story: vis.hostIntro !== false && (story.length > 0 || E),
    day: vis.schedule !== false && (schedule.length > 0 || E),
    venue: vis.venue !== false && (!!venue || !!address || E),
    entourage: vis.entourage !== false && (parents.length > 0 || rows.length > 0 || E),
    dress: vis.dress !== false && (!!dress || swatches.length > 0 || E),
    stay: (vis.accommodations !== false && (stay.length > 0 || E)) || (vis.travelInformation !== false && (travel.length > 0 || E)),
    gifts: vis.registry !== false && (gifts || E),
    faqs: vis.faqs !== false && (faqs.length > 0 || E),
    rsvp: over || vis.rsvp !== false,
  };
  const keys = (["story", "day", "venue", "entourage", "dress", "stay", "gifts", "faqs", "rsvp"] as const).filter((k) => !gallery && show[k]);
  const ink = theme.ink;
  const wet = mixHex(ink, "#324e7e", 0.3);
  useInkPage({ root: rootRef, stage: stageRef, pen: penRef }, { routeKey: ["invite", ...keys].join(","), animate: moving, boot, snap: (live || demo) && moving, ink, wet, editor: E, onOpened: () => setOpened(true) });
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const longest = Math.max(5, ...parts.map((p) => p.length));
  const vars = {
    ["--iv-ink" as string]: ink,
    ["--iv-script" as string]: theme.displayFont,
    ["--iv-text" as string]: theme.bodyFont,
    ["--iv-namek" as string]: `${Math.min(1, 7.5 / longest).toFixed(3)}`,
    ["--iv-namek2" as string]: `${Math.min(1, 5.4 / longest).toFixed(3)}`,
  } as CSSProperties;
  const cls = ["iv-root", boot && !opened ? "iv-opening" : "", gallery ? "iv-gallery" : "", E ? "iv-editor" : "", moving ? "iv-motion" : ""].filter(Boolean).join(" ");
  const maker = credit.show ? (
    <p className="iv-maker">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }} />
    </p>
  ) : null;

  const num = (k: string) => folio(keys.indexOf(k as (typeof keys)[number]) + 2);
  const kick = (k: string, key: string, fallback: string) => (
    <p className="iv-kick">
      <span className="iv-no" aria-hidden>
        {num(k)}
      </span>
      <Field path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} placeholder="" editor={E} />
    </p>
  );
  const heading = (key: string, fallback: string) => <Ink className="iv-h2" path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} editor={E} />;
  const sub = (key: string, fallback: string) => <Field as="h3" className="iv-h3" path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} placeholder="" editor={E} />;
  // a pen-made flourish under each written heading (a mark, not text)
  const flourish = E ? null : (
    <div className="iv-flourish" data-iv-ink="" data-iv-shape="flourish" data-iv-speed="6" data-iv-max="0.6" aria-hidden>
      <canvas className="iv-ink__c" />
    </div>
  );
  // the heading, written; its flourish; then the small printed line under it (nothing printed
  // sits above a heading, where the pen's holder would lie across it)
  const head = (k: string, titleKey: string, titleFallback: string, kickKey: string, kickFallback: string, extra?: ReactNode) => (
    <>
      {heading(titleKey, titleFallback)}
      {flourish}
      {kick(k, kickKey, kickFallback)}
      {extra}
    </>
  );
  const stop = (key: string, top: ReactNode, body: ReactNode, sec?: string, extra?: ReactNode) => (
    <section key={key} className={`iv-stop iv-stop--${key}`} data-iv-stop id={key === "rsvp" ? "rsvp" : undefined} {...(sec ? ed.section(sec) : {})}>
      <div className="iv-spread">
        <header className="iv-head">{top}</header>
        <div className="iv-body">{body}</div>
      </div>
      {extra}
    </section>
  );

  // ---- the first screen: the names, written
  const dateLine = customValue(content, "dateLine");
  const invite = (
    <section className="iv-stop iv-stop--invite" data-iv-stop>
      <div className="iv-invite">
        <div className="iv-names-wrap">
          <Flecks seed={7} clusters={[[4, 14, 9], [97, 94, 8], [76, 2, 4]]} className="iv-flecks--names" />
          {E ? (
            <Ink as="h1" className="iv-names" path="custom.names" value={customValue(content, "names")} fallback={coupleNames(content) || undefined} editor />
          ) : parts.length ? (
            <Ink as="h1" className="iv-names" path="custom.names" value={couple} editor={false} speed={9} max={parts.length > 1 ? 4.4 : 2.8} label={parts.join(" & ")}>
              {parts.map((p, i) => (
                <span key={i} className={`iv-name iv-name--${i}`}>
                  {i ? (
                    <span className="iv-amp" data-iv-skip aria-hidden>
                      &amp;
                    </span>
                  ) : null}
                  <span className="iv-name__w">{p}</span>
                </span>
              ))}
            </Ink>
          ) : null}
        </div>
        <Field as="p" className="iv-kick iv-kick--c" path="custom.heroKicker" value={customValue(content, "heroKicker")} fallback="together with their families" placeholder="" editor={E} />
        <Field as="p" className="iv-lede" path="custom.inviteLine" value={customValue(content, "inviteLine")} fallback="request the pleasure of your company at the celebration of their marriage" placeholder="" editor={E} />
        {E ? (
          <Field as="p" className="iv-date" path="custom.dateLine" value={dateLine} fallback={dw ? `${dw[0]}, ${dw[1]}` : undefined} placeholder="Your date (set it in Event details)" editor={E} />
        ) : dateLine ? (
          <p className="iv-date">{dateLine}</p>
        ) : dw ? (
          <p className="iv-date">
            <span>{dw[0]}</span> <span className="iv-date__y">{dw[1]}</span>
            {tw ? <span className="iv-date__t">{tw}</span> : null}
          </p>
        ) : null}
        {venue || address || E ? (
          <p className="iv-where">
            {E ? <Field path="primaryLocation.name" value={venue} placeholder="Venue" editor={E} /> : venue ? <span>{venue}</span> : null}
            {town ? <span className="iv-where__town">{town}</span> : null}
          </p>
        ) : null}
        <Field as="p" className="iv-lede iv-lede--small" path="custom.receptionLine" value={customValue(content, "receptionLine")} fallback="Dinner and dancing to follow" placeholder="" editor={E} />
      </div>
      {gallery ? null : (
        <p className="iv-cue" aria-hidden>
          <Field path="custom.cueLabel" value={customValue(content, "cueLabel")} fallback="The details" placeholder="" editor={E} />
          <i />
        </p>
      )}
    </section>
  );

  const pieces: Record<string, ReactNode> = {};
  if (show.story) {
    const [first, ...rest] = story;
    pieces.story = stop(
      "story",
      head("story", "storyTitle", "Our story", "storyKicker", "How it began"),
      story.length ? (
        <div className="iv-story">
          {E ? (
            story.map((p, i) => <Field key={i} as="p" className="iv-p" path={`story#${i}`} value={p} placeholder="" editor={E} multiline />)
          ) : (
            <>
              <p className="iv-p iv-p--first">
                <span className="iv-gilt" aria-hidden>
                  {first.slice(0, 1)}
                </span>
                <span className="iv-sr">{first.slice(0, 1)}</span>
                {first.slice(1)}
              </p>
              {rest.map((p, i) => (
                <p key={i} className="iv-p">
                  {p}
                </p>
              ))}
            </>
          )}
        </div>
      ) : (
        <p className="iv-hint">Tell your story in a few short paragraphs, under Our story.</p>
      ),
      "hostIntro",
    );
  }
  if (show.day)
    pieces.day = stop(
      "day",
      head("day", "dayTitle", "The day", "dayKicker", "The order of the day"),
      <>
        <ol className="iv-program" {...ed.list("schedule")}>
          {schedule.map((s) => (
            <li key={s.id} {...ed.item(s.id)}>
              <span className="iv-program__time">{timeOf(s.startTime) || (E ? "Time" : "")}</span>
              <span className="iv-program__what">
                <Field as="b" path="label" value={s.label} placeholder="What’s happening" editor={E} />
                {s.description || E ? <Field as="em" path="description" value={s.description} placeholder="A note (optional)" editor={E} multiline /> : null}
              </span>
            </li>
          ))}
        </ol>
        <AddItem list="schedule" label={schedule.length ? "Add to the day" : "Add the day’s plan"} editor={E} />
      </>,
      "schedule",
    );
  if (show.venue)
    pieces.venue = stop(
      "venue",
      head("venue", "venueTitle", "The venue", "venueKicker", "Ceremony and reception"),
      <div className="iv-venue">
        {E ? (
          <>
            <Field as="p" className="iv-venue__name" path="primaryLocation.name" value={venue} placeholder="Venue" editor={E} />
            <Field as="p" className="iv-p" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
          </>
        ) : (
          <>
            {venue ? <p className="iv-venue__name">{venue}</p> : null}
            {address ? <p className="iv-p">{address}</p> : null}
          </>
        )}
        {dw ? <p className="iv-kick iv-kick--soft">{[dw[0].replace(/, the .*/, ""), timeOf(content.eventDate)].filter(Boolean).join(" · ")}</p> : null}
        <Field as="p" className="iv-p iv-p--note" path="custom.venueNote" value={customValue(content, "venueNote")} placeholder="A note about the place (optional)" editor={E} multiline />
        {venue || address ? (
          <div className="iv-links">
            <VenueLinks content={content} font="var(--iv-text)" color="var(--iv-ink)" align="left" size={15} />
          </div>
        ) : null}
      </div>,
      "venue",
    );
  const group = (row: EntRow) =>
    row.cells.map((c) => (
      <div key={c.id} className="iv-group" {...ed.item(c.id)}>
        <Field as="p" className="iv-group__t" path="title" value={c.raw} placeholder="Group, e.g. Principal Sponsors" editor={E}>
          {c.title}
        </Field>
        <ul className="iv-people">
          {c.people.map((p, j) => (
            <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={E} />
          ))}
        </ul>
        <AddItem list={`entourage:${c.id}:people`} label="Add a name" editor={E} />
      </div>
    ));
  if (show.entourage)
    pieces.entourage = stop(
      "entourage",
      head("entourage", "entourageTitle", "The entourage", "entourageKicker", "Those who stand with us"),
      <>
        <div className="iv-ent" {...ed.list("entourage")}>
          {parents.map((g) => (
            <div key={g.id} className="iv-group iv-group--parents" {...ed.item(g.id)}>
              <Field as="p" className="iv-group__t" path="title" value={g.title} placeholder="Parents of the Bride" editor={E} />
              <ul className="iv-people">
                {g.people.map((p, j) => (
                  <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={E} />
                ))}
              </ul>
              <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={E} />
            </div>
          ))}
          {rows.map((r) => group(r))}
        </div>
        {!parents.length && !rows.length ? <p className="iv-hint">Add your parents, sponsors and the bridal party under Entourage &amp; motif.</p> : null}
        <AddItem list="entourage" label="Add a group" editor={E} />
      </>,
      "entourage",
    );
  if (show.dress)
    pieces.dress = stop(
      "dress",
      head("dress", "dressTitle", "Attire", "dressKicker", "What to wear"),
      <>
        <Field as="p" className="iv-p iv-p--lead" path="custom.dressCode" value={dress} placeholder="Formal. Gentlemen in suits or barong, ladies in long gowns." editor={E} multiline />
        {swatches.length ? (
          <div className="iv-wash">
            <div className="iv-wash__row" aria-hidden>
              {swatches.map((c, i) => (
                <i key={c + i} style={{ ["--c" as string]: c, ["--r" as string]: `${(i * 47) % 360}deg` }} />
              ))}
            </div>
            <Field as="p" className="iv-kick iv-kick--soft" path="custom.swatchLabel" value={customValue(content, "swatchLabel")} fallback="Our colours" placeholder="" editor={E} />
          </div>
        ) : E ? (
          <p className="iv-hint">Add your motif colours under Entourage &amp; motif to paint them here.</p>
        ) : null}
      </>,
      "dress",
    );
  if (show.stay)
    pieces.stay = stop(
      "stay",
      head("stay", "stayTitle", "Where to stay", "stayKicker", "For the weekend"),
      <>
        {vis.accommodations !== false && (stay.length || E) ? (
          <div className="iv-list" {...ed.section("accommodations")}>
            <div {...ed.list("accommodations")}>
              {stay.map((a) => (
                <div key={a.id} className="iv-item" {...ed.item(a.id)}>
                  <Field as="b" className="iv-item__name" path="name" value={a.name} placeholder="Hotel" editor={E} />
                  {a.addressLine || E ? <Field as="span" className="iv-kick iv-kick--soft" path="addressLine" value={a.addressLine} placeholder="Where it is" editor={E} /> : null}
                  {a.notes || E ? <Field as="p" className="iv-p" path="notes" value={a.notes} placeholder="A note (optional)" editor={E} multiline /> : null}
                  {a.bookingUrl ? (
                    <a className="iv-a" href={a.bookingUrl} target="_blank" rel="noopener noreferrer">
                      Book a room
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
            <AddItem list="accommodations" label="Add a place to stay" editor={E} />
          </div>
        ) : null}
        {vis.travelInformation !== false && (travel.length || E) ? (
          <div className="iv-list iv-list--travel" {...ed.section("travelInformation")}>
            {sub("travelTitle", "Getting there")}
            <div {...ed.list("travelInformation")}>
              {travel.map((t) => (
                <div key={t.id} className="iv-item" {...ed.item(t.id)}>
                  <Field as="b" className="iv-item__name" path="title" value={t.title} placeholder="From Manila" editor={E} />
                  <Field as="p" className="iv-p" path="body" value={t.body} placeholder="How to get there" editor={E} multiline />
                </div>
              ))}
            </div>
            <AddItem list="travelInformation" label="Add travel notes" editor={E} />
          </div>
        ) : null}
      </>,
    );
  if (show.gifts)
    pieces.gifts = stop(
      "gifts",
      head("gifts", "giftTitle", "Gifts", "giftKicker", "If you wish"),
      <>
        <Field as="p" className="iv-p iv-p--lead" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your presence is the greatest gift. Should you wish to bless us, a contribution to our first home would mean the world."} placeholder="" editor={E} multiline />
        {content.registryLinks.length ? (
          <div className="iv-btns">
            {content.registryLinks.map((r) => (
              <a key={r.id} className="iv-btn iv-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                {r.storeName}
              </a>
            ))}
          </div>
        ) : null}
        {cash || E ? (
          giftsOpen || E ? (
            <div className="iv-cash">
              <CashGifts content={{ ...content, cashGiftNote: "" }} editor={E} look={{ ink: "var(--iv-ink)", muted: "var(--iv-ink)", surface: "rgba(255,253,247,0.55)", line: "rgba(27,33,48,0.2)", bodyFont: "var(--iv-text)", displayFont: "var(--iv-text)", radius: 2, align: "left" }} />
            </div>
          ) : (
            <div className="iv-btns">
              <button type="button" className="iv-btn iv-btn--line" onClick={() => setGiftsOpen(true)}>
                {customValue(content, "giftButton") || "View gift details"}
              </button>
            </div>
          )
        ) : null}
        <Field as="p" className="iv-sign" path="custom.giftSign" value={customValue(content, "giftSign")} fallback={parts.length ? `With love, ${parts.join(" and ")}` : "With love"} placeholder="" editor={E} />
      </>,
      "registry",
    );
  if (show.faqs)
    pieces.faqs = stop(
      "faqs",
      head("faqs", "faqTitle", "Good to know", "faqKicker", "Before you come"),
      <>
        <div className="iv-faqs" {...ed.list("faqs")}>
          {faqs.map((f) => (
            <div key={f.id} className="iv-faq" {...ed.item(f.id)}>
              <Field as="b" path="question" value={f.question} placeholder="A question" editor={E} />
              <Field as="p" className="iv-p" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
            </div>
          ))}
        </div>
        <AddItem list="faqs" label="Add a question" editor={E} />
      </>,
      "faqs",
    );
  if (show.rsvp)
    pieces.rsvp = stop(
      "rsvp",
      over ? (
        <>
          <h2 className="iv-done">Thank you</h2>
          {kick("rsvp", "rsvpKicker", "With thanks")}
        </>
      ) : (
        head("rsvp", "rsvpTitle", "Kindly reply", "rsvpKicker", "Your reply")
      ),
      over ? (
        <>
          <p className="iv-p iv-p--lead">{customValue(content, "afterParty") || `Thank you for celebrating with ${couple || "us"}.`}</p>
          {maker}
        </>
      ) : (
        <>
          <RsvpCard content={content} editorPreview={E} credit={maker} heading={null} />
          <Seal letters={letters} font={theme.displayFont} look={OXBLOOD} seed={11} className="iv-seal" />
        </>
      ),
      over ? undefined : "rsvp",
    );

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{INKVOWS_CSS}</style>
      <div ref={stageRef} className="iv-stage" aria-hidden>
        <i className="iv-light" />
        {moving ? <Pen ref={penRef} /> : null}
      </div>
      <div className="iv-world">
        {invite}
        {gallery ? null : (
          <>
            {pieces.story}
            {vis.hostIntro === false ? <HiddenSection k="hostIntro" label="Our story" editor={E} /> : null}
            {pieces.day}
            {vis.schedule === false ? <HiddenSection k="schedule" label="The day" editor={E} /> : null}
            {pieces.venue}
            {vis.venue === false ? <HiddenSection k="venue" label="The venue" editor={E} /> : null}
            {pieces.entourage}
            {vis.entourage === false ? <HiddenSection k="entourage" label="The entourage" editor={E} /> : null}
            {pieces.dress}
            {vis.dress === false ? <HiddenSection k="dress" label="Attire" editor={E} /> : null}
            {pieces.stay}
            {vis.accommodations === false ? <HiddenSection k="accommodations" label="Where to stay" editor={E} /> : null}
            {vis.travelInformation === false ? <HiddenSection k="travelInformation" label="Getting there" editor={E} /> : null}
            {pieces.gifts}
            {vis.registry === false ? <HiddenSection k="registry" label="Gifts" editor={E} /> : null}
            {pieces.faqs}
            {vis.faqs === false ? <HiddenSection k="faqs" label="Good to know" editor={E} /> : null}
            {pieces.rsvp ?? (
              <>
                <HiddenSection k="rsvp" label="RSVP" editor={E} />
                {maker ? <div className="iv-endnote">{maker}</div> : null}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
