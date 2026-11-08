import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { loadFontFamilies } from "../../presentation/loadFonts";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import type { EventContent } from "../../content/types";
import VenueLinks from "../shared/VenueLinks";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { createStopSnap } from "../shared/stopSnap";
import { eventIsOver, longDate, timeOf } from "../under-glass/content";
import { startCourt, type CourtApi } from "./court";
import { FL, asset } from "./meta";
import RsvpCard from "./RsvpCard";
import { FLATLAY_CSS } from "./styles";

/**
 * Flat Lay (pickleball birthdays and court parties): one terracotta court seen from straight
 * above in a low morning sun, the whole page long. Every word is ON the court: the name and the
 * headings in court-line paint, the schedule in marker on a coaching board, the reply in painted
 * IN / OUT boxes. Everything else is a Blender render under the same sun, at true scale: paddles,
 * a ball basket, a tray of drinks, a towel, shades, a bottle, palm shade, balloons at the reply,
 * and the long shadow of a player just out of frame, swinging.
 *  - Each stop is one screen: the first (name, date, place), the host's message, the game plan,
 *    what to wear, what to bring, the reply. The court grows with them; its lines are placed
 *    from where the stops fall (court.ts).
 *  - The opening (published page and design preview): a line-marking robot paints the court and
 *    the words. Any scroll, tap or key skips it. Builder, gallery card, reduced motion: painted.
 *  - Phones: the props sit in strips under each stop's words, so they follow the text.
 */

const FONTS = ["Fraunces:ital,opsz,wght,SOFT@0,9..144,400..700,0..100;1,9..144,400..700,0..100", "Jost:wght@400;500;600", "Caveat:wght@600;700"];

const NUMBERS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const words = (n: number) => (n < 20 ? NUMBERS[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? `-${NUMBERS[n % 10]}` : "") : String(n));
const ageOf = (c: EventContent) => {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 120 ? n : 0;
};
function hostNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]}` : first[0] ?? "";
}
function kickerDefault(c: EventContent): string {
  switch (c.occasion) {
    case "birthday":
    case "baby":
      return "A birthday on the court";
    case "anniversary":
      return "An anniversary on the court";
    case "engagement":
      return "An engagement on the court";
    default:
      return "A day on the court";
  }
}
const lines = (s: string) => s.split(/\n+/).map((l) => l.trim()).filter(Boolean);
/** "4:00" when the whole day is on one side of noon, else "4:00 PM". */
function shortTimes(iso: string[]): string[] {
  const full = iso.map((t) => timeOf(t));
  const sides = new Set(full.filter(Boolean).map((t) => t.slice(-2)));
  return sides.size <= 1 ? full.map((t) => t.replace(/\s?[AP]M$/i, "")) : full;
}

// ---- the props on each stop: computer (on the court beside the words) and phone (a strip under
// them). x in metres from the centre line (cl) or from the words' column (col); y in screen
// heights from the stop's top, or (after) from the end of the words.
type Desk = { src: string; x: number; from?: "cl" | "col"; y: number; after?: boolean; rot?: number; w?: number };
type Strip = { src: string; css: CSSProperties; rot?: number; w?: number };
type Stop = "hero" | "message" | "plan" | "wear" | "bring" | "rsvp";
const PROPS: Record<Stop, { desk: Desk[]; strip?: { h: number; items: Strip[] }; roller?: { x: number; y: number } }> = {
  hero: { desk: [{ src: "paddles", x: -0.47, y: 30, rot: -4 }], strip: { h: 0.62, items: [{ src: "paddles", css: { right: "-2cqw", top: 0 }, rot: -10 }] }, roller: { x: 1.15, y: -26 } },
  message: { desk: [{ src: "basket", x: -0.46, y: 12 }], strip: { h: 0.9, items: [{ src: "basket", css: { left: "4cqw", top: 0 } }] }, roller: { x: 1.2, y: 18 } },
  plan: { desk: [{ src: "tray", x: -0.5, y: 22 }], strip: { h: 0.55, items: [{ src: "tray", css: { right: 0, top: 0 } }] } },
  wear: {
    desk: [
      { src: "shades", x: -0.42, y: 42, rot: -8 },
      { src: "sweatband", x: -0.3, y: 64 },
      { src: "towel", x: 0.3, from: "col", y: 7.5, after: true, rot: 80 },
    ],
    strip: { h: 0.6, items: [{ src: "towel", css: { left: 0, top: 0 }, rot: 80 }, { src: "shades", css: { right: "6cqw", top: "8%" } }, { src: "sweatband", css: { right: "14cqw", top: "48%" } }] },
  },
  bring: {
    desk: [
      { src: "bottle", x: -0.44, y: 10 },
      { src: "paddle-carbon", x: -0.46, y: 42 },
      { src: "balls-3", x: 1.1, from: "col", y: 12, after: true },
    ],
    strip: { h: 0.62, items: [{ src: "paddle-carbon", css: { left: "2cqw", top: 0 } }, { src: "bottle", css: { right: "2cqw", top: "4%" } }] },
  },
  rsvp: { desk: [{ src: "confetti", x: -0.62, y: 62, w: 0.6 }] },
};
const widthOf = (src: string, w?: number) => `calc(var(--m) * ${FL[src]?.w ?? w ?? 0.5})`;

function DeskProps({ k, after, lazy }: { k: Stop; after: boolean; lazy: boolean }) {
  return (
    <>
      {PROPS[k].desk
        .filter((p) => !!p.after === after)
        .map((p) => (
          <div
            key={p.src}
            className="fl-prop fl-d"
            style={{
              left: `calc(var(--${p.from ?? "cl"}) + var(--m) * ${p.x})`,
              top: after ? `${p.y}svh` : `${p.y}svh`,
              width: widthOf(p.src, p.w),
              transform: p.rot ? `rotate(${p.rot}deg)` : undefined,
            }}
          >
            <img src={asset(p.src)} alt="" loading={lazy ? "lazy" : undefined} decoding="async" />
          </div>
        ))}
    </>
  );
}

export default function FlatLayTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("flatlay", FONTS);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const courtRef = useRef<HTMLDivElement>(null);
  const api = useRef<CourtApi | null>(null);
  const moving = !reduced && !editorPreview && !gallery;
  const [intro, setIntro] = useState(() => (live || demo) && moving && (typeof window === "undefined" || (window.location.hash !== "#rsvp" && window.scrollY < 10)));

  const vis = settings.sectionVisibility;
  const ed = siteEdit(editorPreview);
  const E = editorPreview;
  const age = ageOf(content);
  const many = content.hosts.filter((h) => h.name.trim()).length > 1;
  const turnsDefault = age ? `${many ? "turn" : "turns"} ${words(age)}` : "";
  const name = customValue(content, "names") || hostNames(content);
  const when = longDate(content.eventDate);
  const at = content.eventDate.includes("T") ? timeOf(content.eventDate) : "";
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const town = address.split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "";
  const place = venue && town && !venue.includes(town) ? `${venue}, ${town}` : venue || town;
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => editorPreview || s.label.trim());
  const times = shortTimes(schedule.map((s) => s.startTime));
  const dress = customValue(content, "dressCode");
  const bring = customValue(content, "bring");
  const over = !editorPreview && eventIsOver(content.eventDate);

  // the name as big as it fits: its longest word across the words' column
  const longest = Math.max(4, ...name.split(/\s+/).map((w) => w.length));
  const total = name.length;
  const fitD = Math.min(66 / (0.52 * longest), total > 12 ? (2 * 66) / (0.52 * total) : 99);
  const fitP = Math.min(82 / (0.52 * longest), total > 12 ? (2 * 82) / (0.52 * total) : 99);

  const stops = useMemo(() => {
    const list: Stop[] = ["hero"];
    if (gallery) return list;
    if (vis.hostIntro !== false && (paragraphs.length || E)) list.push("message");
    if (vis.schedule !== false && (schedule.length || E)) list.push("plan");
    if (vis.dress !== false && (dress || E)) list.push("wear");
    if (vis.bring !== false && (bring || E)) list.push("bring");
    if (over || vis.rsvp !== false) list.push("rsvp");
    return list;
  }, [gallery, vis.hostIntro, vis.schedule, vis.dress, vis.bring, vis.rsvp, paragraphs.length, schedule.length, dress, bring, over, E]);
  const hidden = gallery
    ? []
    : ([
        vis.hostIntro === false && { k: "hostIntro", label: "Message" },
        vis.schedule === false && { k: "schedule", label: "Game plan" },
        vis.dress === false && { k: "dress", label: "What to wear" },
        vis.bring === false && { k: "bring", label: "What to bring" },
        vis.rsvp === false && !over && { k: "rsvp", label: "RSVP" },
      ].filter(Boolean) as { k: string; label: string }[]);
  const stopsKey = stops.join(",");

  // the court's moving parts (court.ts): started once the stops are on the page
  useLayoutEffect(() => {
    const root = rootRef.current, court = courtRef.current;
    if (!root || !court) return;
    const c = startCourt(root, court, { motion: moving, intro, onIntroEnd: () => setIntro(false) });
    api.current = c;
    return () => {
      c.dispose();
      api.current = null;
    };
    // the intro flag is read once, when the court starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving, stopsKey]);
  useLayoutEffect(() => {
    api.current?.relayout();
  });

  // one swipe, one stop: each stop rests at its top (a stop taller than the screen can be read
  // through), then the end of the page
  useEffect(() => {
    const root = rootRef.current, court = courtRef.current;
    if (!root || !court || !moving || !(live || demo)) return;
    const snap = createStopSnap(root, true);
    let raf = 0;
    const measure = () => {
      raf = 0;
      const H = window.innerHeight;
      const els = Array.from(court.querySelectorAll<HTMLElement>(":scope > [data-stop]"));
      const spans = els.map((s) => (s.offsetHeight > H * 1.04 ? { from: s.offsetTop, to: s.offsetTop + s.offsetHeight - H } : { from: s.offsetTop }));
      snap.update([...spans, { from: Math.max(0, root.offsetHeight - H) }], H);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    const ro = new ResizeObserver(kick);
    ro.observe(root);
    window.addEventListener("resize", kick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", kick);
      snap.dispose();
    };
  }, [moving, live, demo, stopsKey]);

  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const vars = {
    ["--fl-display" as string]: theme.displayFont,
    ["--fl-sans" as string]: theme.bodyFont,
    ["--fit-d" as string]: `${fitD.toFixed(2)}cqw`,
    ["--fit-p" as string]: `${fitP.toFixed(2)}cqw`,
  } as CSSProperties;
  const cls = ["fl-root", moving ? "fl-motion" : "", intro ? "fl-intro" : "", gallery ? "fl-gallery" : ""].filter(Boolean).join(" ");

  const strip = (k: Stop) => {
    const s = PROPS[k].strip;
    if (!s) return null;
    return (
      <div className="fl-mprops" aria-hidden style={{ height: `calc(var(--m) * ${s.h})` }}>
        {s.items.map((p) => (
          <img key={p.src} src={asset(p.src)} alt="" loading="lazy" decoding="async" style={{ ...p.css, width: widthOf(p.src, p.w), transform: p.rot ? `rotate(${p.rot}deg)` : undefined }} />
        ))}
      </div>
    );
  };
  const stopShell = (k: Stop, body: ReactNode, sectionProps: Record<string, unknown> = {}, id?: string) => {
    const r = PROPS[k].roller;
    const lazy = k !== "hero";
    return (
      <section key={k} className="fl-stop" data-stop={k}>
        <div className="fl-words" id={id} {...sectionProps}>
          {body}
        </div>
        <div className="fl-d" style={{ position: "relative", height: 0, zIndex: 1 }} aria-hidden>
          <DeskProps k={k} after lazy={lazy} />
          {r ? <div className="fl-roller fl-d" style={{ left: `calc(var(--col) + var(--m) * ${r.x})`, top: `${r.y}svh` }} /> : null}
        </div>
        {strip(k)}
        <DeskProps k={k} after={false} lazy={lazy} />
        {k === "rsvp" && credit.show ? (
          <p className="fl-credit">
            <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 600 }} />
          </p>
        ) : null}
      </section>
    );
  };

  const render = (k: Stop) => {
    switch (k) {
      case "hero":
        return stopShell(
          k,
          <>
            <Field as="p" className="fl-kicker fl-paint" data-fl-paint path="custom.heroLine" value={customValue(content, "heroLine")} fallback={kickerDefault(content)} placeholder="" editor={E} />
            <Field as="h1" className="fl-name fl-stencil fl-paint" data-fl-paint data-fl="name" path="custom.names" value={customValue(content, "names")} fallback={hostNames(content) || undefined} placeholder="Your name" editor={E} />
            <Field as="p" className="fl-turns fl-paint" data-fl-paint path="custom.ageLine" value={customValue(content, "ageLine")} fallback={turnsDefault || undefined} placeholder="turns thirty-five (or set the age in Flat Lay details)" editor={E} />
            <p className="fl-facts fl-paint" data-fl-paint>
              {when || at ? (
                <>
                  {when ? <span>{when}</span> : null}
                  {when && at ? " · " : null}
                  {at ? <span>{at}</span> : null}
                </>
              ) : E ? (
                "Your date"
              ) : null}
              {place ? (
                <>
                  <br />
                  {place}
                </>
              ) : E ? (
                <>
                  <br />
                  Your venue
                </>
              ) : null}
            </p>
            {venue && !gallery ? (
              <div className="fl-links">
                <VenueLinks content={content} font="var(--fl-sans)" color="#f5eee2" size={14} align="left" />
              </div>
            ) : null}
          </>,
        );
      case "message":
        return stopShell(
          k,
          <>
            <Field as="h2" className="fl-h2 fl-stencil fl-paint" path="custom.messageTitle" value={customValue(content, "messageTitle")} fallback="Let’s rally" placeholder="" editor={E} />
            {paragraphs.length ? (
              paragraphs.map((p, i) => <Field key={i} as="p" className="fl-body fl-paint" path={`story#${i}`} value={p} placeholder="" editor={E} multiline />)
            ) : (
              <Field as="p" className="fl-body fl-paint" path="story#0" value="" placeholder="A few words to your guests: who should come, what to expect." editor={E} multiline />
            )}
          </>,
          ed.section("hostIntro"),
        );
      case "plan":
        return stopShell(
          k,
          <div className="fl-board">
            <Field as="h3" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="Game plan" placeholder="" editor={E} />
            <ol {...ed.list("schedule")}>
              {schedule.map((s, i) => (
                <li key={s.id} style={{ ["--mag" as string]: `url(${asset(`magnet-${i % 3}`)})` }} {...ed.item(s.id)}>
                  <b>{times[i] || (E ? "Time" : "")}</b>
                  <span>
                    <Field path="label" value={s.label} placeholder="What’s happening" editor={E} />
                    {s.description || E ? <Field as="em" path="description" value={s.description} placeholder="A note (optional)" editor={E} multiline /> : null}
                  </span>
                </li>
              ))}
            </ol>
            <AddItem list="schedule" label={schedule.length ? "Add to the game plan" : "Add the game plan"} editor={E} />
            <img className="fl-marker" src={asset("marker")} alt="" loading="lazy" decoding="async" />
          </div>,
          ed.section("schedule"),
        );
      case "wear":
        return stopShell(
          k,
          <>
            <Field as="h2" className="fl-h2 fl-stencil fl-paint" path="custom.wearTitle" value={customValue(content, "wearTitle")} fallback="What to wear" placeholder="" editor={E} />
            <Field as="p" className="fl-body fl-paint" path="custom.dressCode" value={dress} placeholder="Court shoes (non-marking soles) and something you can move in." editor={E} multiline />
          </>,
          ed.section("dress"),
        );
      case "bring":
        return stopShell(
          k,
          <>
            <Field as="h2" className="fl-h2 fl-stencil fl-paint" path="custom.bringTitle" value={customValue(content, "bringTitle")} fallback="What to bring" placeholder="" editor={E} />
            <Field as="p" className="fl-body fl-paint" path="custom.bring" value={bring} placeholder="A water bottle, a towel, and your own paddle if you have one." editor={E} multiline>
              {lines(bring).join("\n")}
            </Field>
          </>,
          ed.section("bring"),
        );
      case "rsvp":
        return over
          ? stopShell(
              k,
              <>
                <h2 className="fl-h2 fl-stencil fl-paint">Thanks for playing</h2>
                <p className="fl-body fl-paint">{customValue(content, "afterParty") || "What a day on the court."}</p>
              </>,
            )
          : stopShell(k, <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} name={name} onPick={(b) => api.current?.pick(b)} onLayout={() => api.current?.relayout()} />, ed.section("rsvp"), "rsvp");
    }
  };

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{FLATLAY_CSS}</style>
      <div ref={courtRef} className="fl-court">
        <div className="fl-surface" />
        <div className="fl-runoff" data-fl="run1" />
        <div className="fl-runoff" data-fl="run2" />
        <div className="fl-line fl-hline" data-fl="baseline1" data-fl-paint />
        <div className="fl-line fl-vline" data-fl="centre1" />
        <div className="fl-line fl-hline" data-fl="kitchen1" />
        <div className="fl-line fl-hline" data-fl="kitchen2" />
        <div className="fl-line fl-vline" data-fl="centre2" />
        <div className="fl-line fl-hline" data-fl="baseline2" />
        <div className="fl-netshadow" data-fl="netshadow" />
        <div className="fl-ground" data-fl="ground" />

        {stops.map(render)}
        {hidden.length ? (
          <div className="fl-hidden">
            {hidden.map((h) => (
              <HiddenSection key={h.k} k={h.k} label={h.label} editor={E} />
            ))}
          </div>
        ) : null}

        {/* the player just out of frame: only their long shadow, swinging */}
        <canvas className="fl-player" data-fl="player" width={921} height={1024} aria-hidden />
        <div className="fl-shade" data-fl="shade1" aria-hidden>
          <img src={asset("fronds2")} alt="" loading="lazy" decoding="async" />
        </div>
        <div className="fl-shade" data-fl="shade2" aria-hidden>
          <img src={asset("fronds2")} alt="" loading="lazy" decoding="async" />
        </div>
        <div className="fl-bshadow" data-fl="bshadow" aria-hidden>
          <img src={asset("ball-shadow")} alt="" />
        </div>
        <div className="fl-ball" data-fl="ball" aria-hidden />
        <div className="fl-tape" data-fl="tape" aria-hidden />
        <div className="fl-air" data-fl="air" aria-hidden />
      </div>
    </div>
  );
}
