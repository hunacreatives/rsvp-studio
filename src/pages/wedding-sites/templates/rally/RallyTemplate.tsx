import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import type { EventContent } from "../../content/types";
import VenueLinks from "../shared/VenueLinks";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { eventIsOver, longDate, timeOf } from "../under-glass/content";
import { SHOT_NAME, shotPlan } from "./physics";
import { useRally, type RallyApi } from "./rally";
import RsvpCard from "./RsvpCard";
import { RALLY_CSS } from "./styles";

/**
 * Rally (pickleball birthdays, tournaments, open play, club socials): one point, played out
 * the whole page long on a real court under floodlights, golden hour going to blue hour.
 *  - The title holds the host's serve, the score called above it ("10-9-2", game point). Each
 *    section after it is one shot of the rally (simulated: gravity, drag, spin, the bounce).
 *  - The page is one frame, a card at a time (the published page and the design preview):
 *    "Next shot" (or a tap on the court, a swipe, the arrow keys, the scroll wheel) plays the
 *    shot at real speed, the broadcast camera following the ball, and the next card comes up in
 *    the same place when the next player meets it. The shot strip jumps to any card. In the
 *    builder the cards are stacked to scroll and edit.
 *  - The reply is "Make the call": In or Out. A guest's "In" is the winning smash (the signature
 *    moment): the host's overhead into the far court, the court's dust, the lamps flaring, the
 *    score going up.
 *  - The opening (published page and design preview): the floodlights switching on bank by
 *    bank over the court at sunset. Builder, gallery card, reduced motion: lit and still.
 */

function hostNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(" & ")} & ${first[first.length - 1]}` : first[0] ?? "";
}
const ageOf = (c: EventContent) => {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 150 ? n : 0;
};
/** The score call ("10-9-2"): the serving side's score, the other side's, the server. */
const callOf = (c: EventContent) => {
  const m = customValue(c, "scoreCall").match(/(\d{1,2})\D+(\d{1,2})(?:\D+([12]))?/);
  const a = m ? Number(m[1]) : 10, b = m ? Number(m[2]) : 9, s = m && m[3] ? Number(m[3]) : 2;
  return { a, b, s };
};
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

const KEYS = ["day", "wear", "bring", "gifts", "faqs"] as const;
type Key = (typeof KEYS)[number] | "rsvp";

export default function RallyTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef<HTMLElement>(null);
  const spinRef = useRef<HTMLElement>(null);
  const clearRef = useRef<HTMLElement>(null);
  const ticksRef = useRef<HTMLSpanElement>(null);
  const callRef = useRef<HTMLElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<RallyApi | null>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [won, setWon] = useState(false);
  const moving = !reduced && !editorPreview && !gallery;
  const [boot] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [lit, setLit] = useState(!boot);
  const introRef = useRef(boot ? 0 : 1);
  const pointRef = useRef<(() => void) | null>(null);
  pointRef.current = () => setWon(true);
  // one frame, a card at a time (everywhere but the builder and the gallery card)
  const deck = !editorPreview && !gallery;

  const age = ageOf(content);
  const vis = settings.sectionVisibility;
  const ed = siteEdit(editorPreview);
  const E = editorPreview;
  const name = customValue(content, "names") || hostNames(content);
  const ageLine = customValue(content, "ageLine") || (age ? `turns ${age}` : "");
  const when = longDate(content.eventDate);
  const at = content.eventDate.includes("T") ? timeOf(content.eventDate) : "";
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const town = address.split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "";
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => editorPreview || s.label.trim());
  const dress = customValue(content, "dressCode");
  const bring = lines(customValue(content, "bring"));
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => editorPreview || f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash || !!customValue(content, "giftNote");
  const over = !editorPreview && eventIsOver(content.eventDate);
  const call = callOf(content);
  const wins = call.a + 1 >= 11 && call.a + 1 - call.b >= 2;

  // the stops after the title, in order (the reply is always last)
  const stops = useMemo(() => {
    const list: Key[] = [];
    if (vis.schedule !== false && (schedule.length || venue || editorPreview)) list.push("day");
    if (vis.dress !== false && (dress || editorPreview)) list.push("wear");
    if (vis.bring !== false && (bring.length || editorPreview)) list.push("bring");
    if (vis.registry !== false && (gifts || editorPreview)) list.push("gifts");
    if (vis.faqs !== false && (faqs.length || editorPreview)) list.push("faqs");
    return list;
  }, [vis.schedule, vis.dress, vis.bring, vis.registry, vis.faqs, schedule.length, venue, editorPreview, dress, bring.length, gifts, faqs.length]);
  const hidden = [
    vis.schedule === false && { k: "schedule", label: "The day" },
    vis.dress === false && { k: "dress", label: "What to wear" },
    vis.bring === false && { k: "bring", label: "What to bring" },
    vis.registry === false && { k: "registry", label: "Gifts" },
    vis.faqs === false && { k: "faqs", label: "Good to know" },
  ].filter(Boolean) as { k: string; label: string }[];
  const all = useMemo<Key[]>(() => (gallery ? [] : [...stops, "rsvp"]), [gallery, stops]);
  // the shot (or two) that brings the ball to each stop
  const plan = useMemo(() => shotPlan(Math.max(1, all.length)), [all.length]);
  const shotLabel = (i: number) => {
    const g = plan[i] ?? [];
    const first = plan.slice(0, i).reduce((n, x) => n + x.length, 0) + 1;
    if (g.length > 1) return { n: `Shots ${first}–${first + g.length - 1}`, name: g.map((k) => SHOT_NAME[k].replace(/^The /, "")).join(" and ").replace(/^./, (c) => c.toUpperCase()) };
    return { n: `Shot ${first}`, name: g[0] ? SHOT_NAME[g[0]] : "" };
  };
  const shotsTotal = plan.reduce((n, g) => n + g.length, 0);

  // the deck: which stop is up (0 the title), and whether its card is showing (it hides while
  // the shot flies)
  const last = all.length;
  const [idx, setIdx] = useState(() => (deck && typeof window !== "undefined" && window.location.hash === "#rsvp" ? last : 0));
  const [shown, setShown] = useState(true);
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const arriveRef = useRef<((stop: number) => void) | null>(null);
  arriveRef.current = () => setShown(true);
  useRally(
    { root: rootRef, stage: stageRef, gl: glRef, intro: introRef, api: apiRef },
    { speed: speedRef, spin: spinRef, clear: clearRef, ticks: ticksRef, call: callRef, callTag: tagRef },
    { stops: gallery ? 1 : all.length + 1, animate: moving, onPoint: pointRef, deck, start: idx, onArrive: arriveRef },
  );
  const go = useCallback((n: number) => {
    if (n < 0 || n > last || n === idx) return;
    // the next shot plays at real speed; anything else cuts straight there
    const play = n === idx + 1 && moving;
    introRef.current = 1; setLit(true);
    setShown(!play && !apiRef.current);
    setIdx(n);
    apiRef.current?.go(n, play);
  }, [idx, last, moving]);
  const goRef = useRef(go);
  goRef.current = go;

  // the deck's other ways to the next shot: the keys, the scroll wheel, a swipe, a tap on the court
  useEffect(() => {
    const root = rootRef.current;
    if (!deck || !root) return;
    const step = (d: number) => goRef.current(idxRef.current + d);
    // a card that can still scroll its own words that way keeps the gesture
    const scrolls = (el: EventTarget | null, d: number) => {
      const c = (el as HTMLElement | null)?.closest?.(".ra-card") as HTMLElement | null;
      if (!c || c.scrollHeight <= c.clientHeight + 2) return false;
      return d > 0 ? c.scrollTop + c.clientHeight < c.scrollHeight - 2 : c.scrollTop > 2;
    };
    let lock = 0;
    const onWheel = (e: WheelEvent) => {
      const d = Math.sign(e.deltaY || e.deltaX);
      if (!d || scrolls(e.target, d)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < lock || Math.abs(e.deltaY || e.deltaX) < 8) return;
      lock = now + 900;
      step(d);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !(e.target as HTMLElement | null)?.closest?.("button, a"))) { e.preventDefault(); step(1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); step(-1); }
    };
    let sx = 0, sy = 0, st: EventTarget | null = null;
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = e.target; };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0], dx = sx - t.clientX, dy = sy - t.clientY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 48) return;
      const d = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : Math.sign(dx);
      if (Math.abs(dy) > Math.abs(dx) && (st as HTMLElement | null)?.closest?.(".ra-card")) return;
      step(d);
    };
    // a tap on the court itself (not on a card, a button or a link) is the next shot
    const onClick = (e: MouseEvent) => { const t = e.target as HTMLElement | null; if (t && !t.closest(".ra-card, button, a, input, textarea, label, .ra-ctrl")) step(1); };
    root.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchend", onEnd, { passive: true });
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("click", onClick);
    };
  }, [deck]);


  // the opening: the floodlights come on over the court, then the title rises
  useEffect(() => {
    if (!boot) return;
    let raf = 0;
    const t0 = performance.now(), D = 2600;
    const step = (now: number) => {
      // a scroll skips ahead
      introRef.current = Math.min(1, (now - t0) / D);
      if (introRef.current > 0.45) setLit(true);
      if (introRef.current < 1) raf = requestAnimationFrame(step);
    };
    const skip = () => { introRef.current = Math.max(introRef.current, 0.98); setLit(true); };
    // (in the deck, a step also skips it: go() lights the court)
    raf = requestAnimationFrame(step);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("wheel", skip); window.removeEventListener("touchmove", skip); };
  }, [boot]);
  useEffect(() => {
    if (live && !deck && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live, deck]);

  // scroll so a stop's card sits in its dock
  const goTo = useCallback((key: string) => {
    if (deck) { goRef.current(key === "rsvp" ? last : Math.max(1, all.indexOf(key as Key) + 1)); return; }
    const wrap = rootRef.current?.querySelector<HTMLElement>(`[data-ra-key="${key}"] .ra-dock`);
    const card = wrap?.querySelector<HTMLElement>("[data-ra-dock]");
    if (!wrap || !card) return;
    const top = wrap.getBoundingClientRect().top + window.scrollY - (parseFloat(card.style.top) || 0);
    window.scrollTo({ top: Math.max(0, top), behavior: moving ? "smooth" : "auto" });
  }, [moving, deck, last, all]);

  const longest = Math.max(4, ...name.split(/\s+/).map((w) => w.length));
  const vars = {
    ["--ra-disp" as string]: theme.displayFont,
    ["--ra-sans" as string]: theme.bodyFont,
    ["--name-size" as string]: `clamp(64px, ${Math.min(17, 70 / longest).toFixed(2)}cqw, 250px)`,
    ["--name-size-m" as string]: `clamp(52px, ${Math.min(27, 104 / longest).toFixed(2)}cqw, 150px)`,
  } as CSSProperties;
  const cls = ["ra-root", moving ? "ra-motion" : "", lit ? "ra-lit" : "", gallery ? "ra-gallery" : "", deck ? "ra-deck" : ""].filter(Boolean).join(" ");
  const maker = credit.show ? (
    <p className="ra-maker">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 700 }} />
    </p>
  ) : null;

  const card = (key: Key, i: number, sec: string, inner: ReactNode, extra?: string) => {
    const s = shotLabel(i);
    return (
      <section key={key} className={`ra-stop${extra ? ` ${extra}` : ""}${deck && idx === i + 1 && shown ? " is-on" : ""}`} data-ra-stop data-ra-key={key} id={key === "rsvp" ? "rsvp" : undefined} aria-hidden={deck && idx !== i + 1 ? true : undefined}>
        <div className="ra-dock">
          <div className="ra-card" data-ra-dock {...(sec ? ed.section(sec) : {})}>
            <p className="ra-shot">
              <b>{s.n}</b>
              <span>{s.name}</span>
            </p>
            {inner}
          </div>
          <div className="ra-hold" aria-hidden />
        </div>
      </section>
    );
  };
  const stopEl = (key: Key, i: number) => {
    if (key === "day")
      return card(
        key, i, "schedule",
        <>
          <Field as="h2" className="ra-h2" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="The day" placeholder="" editor={E} />
          <p className="ra-when">
            {when ? <span>{when}</span> : E ? <span>Your date</span> : null}
            {at ? <span>{` · ${at}`}</span> : null}
          </p>
          {E ? (
            <>
              <Field as="p" className="ra-line" path="primaryLocation.name" value={venue} placeholder="Where you’ll play" editor={E} />
              <Field as="p" className="ra-line" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
            </>
          ) : venue ? (
            <p className="ra-line">
              <b>{venue}</b>
              {address ? <span>{`, ${address}`}</span> : null}
            </p>
          ) : null}
          {venue ? (
            <div className="ra-links">
              <VenueLinks content={content} font="var(--ra-sans)" color="#e3ef5a" size={15} align="left" />
            </div>
          ) : null}
          {schedule.length ? (
            <div className="ra-sched" {...ed.list("schedule")}>
              {schedule.map((s) => (
                <div key={s.id} {...ed.item(s.id)}>
                  <b>{timeOf(s.startTime) || (E ? "Time" : "")}</b>
                  <span>
                    <Field path="label" value={s.label} placeholder="What’s happening" editor={E} />
                    {s.description || E ? <Field as="em" path="description" value={s.description} placeholder="A note (optional)" editor={E} multiline /> : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <AddItem list="schedule" label={schedule.length ? "Add to the day" : "Add the day’s plan"} editor={E} />
        </>,
      );
    if (key === "wear")
      return card(
        key, i, "dress",
        <>
          <Field as="h2" className="ra-h2" path="custom.wearTitle" value={customValue(content, "wearTitle")} fallback="What to wear" placeholder="" editor={E} />
          <Field as="p" className="ra-p" path="custom.dressCode" value={dress} placeholder="What to wear, e.g. court shoes and anything you can move in." editor={E} multiline />
        </>,
      );
    if (key === "bring")
      return card(
        key, i, "bring",
        <>
          <Field as="h2" className="ra-h2" path="custom.bringTitle" value={customValue(content, "bringTitle")} fallback="What to bring" placeholder="" editor={E} />
          {E ? (
            <Field as="p" className="ra-p ra-pre" path="custom.bring" value={customValue(content, "bring")} placeholder={"One thing a line, e.g.\nYour paddle\nA water bottle"} editor={E} multiline />
          ) : (
            <ul className="ra-bring">
              {bring.map((b, n) => (
                <li key={n}>{b}</li>
              ))}
            </ul>
          )}
        </>,
      );
    if (key === "gifts")
      return card(
        key, i, "registry",
        <>
          <Field as="h2" className="ra-h2" path="custom.giftTitle" value={customValue(content, "giftTitle")} fallback="Gifts" placeholder="" editor={E} />
          <Field as="p" className="ra-p" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your company is the only gift needed."} placeholder="" editor={E} multiline />
          {content.registryLinks.length ? (
            <div className="ra-btns">
              {content.registryLinks.map((r) => (
                <a key={r.id} className="ra-btn" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                  {r.storeName}
                </a>
              ))}
            </div>
          ) : null}
          {cash ? (
            giftsOpen ? (
              <div className="ra-gifts">
                <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "#0b1522", muted: "#4c5867", surface: "#f4f3ee", line: "rgba(11,21,34,0.16)", bodyFont: "var(--ra-sans)", displayFont: "var(--ra-disp)", radius: 4, align: "left" }} />
              </div>
            ) : (
              <div className="ra-btns">
                <button type="button" className="ra-btn" onClick={() => setGiftsOpen(true)}>
                  {customValue(content, "giftButton") || "View gift details"}
                </button>
              </div>
            )
          ) : null}
        </>,
      );
    return card(
      key, i, "faqs",
      <>
        <Field as="h2" className="ra-h2" path="custom.faqTitle" value={customValue(content, "faqTitle")} fallback="Good to know" placeholder="" editor={E} />
        <div {...ed.list("faqs")}>
          {faqs.map((f) => (
            <div key={f.id} className="ra-faq" {...ed.item(f.id)}>
              <Field as="b" path="question" value={f.question} placeholder="A question" editor={E} />
              <Field as="span" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
            </div>
          ))}
        </div>
        <AddItem list="faqs" label={faqs.length ? "Add a question" : "Add a question guests ask"} editor={E} />
      </>,
    );
  };

  const rsvpIndex = stops.length;
  // each stop's heading, for the shot strip
  const stopTitle = (k: Key) =>
    k === "day" ? customValue(content, "dayTitle") || "The day"
    : k === "wear" ? customValue(content, "wearTitle") || "What to wear"
    : k === "bring" ? customValue(content, "bringTitle") || "What to bring"
    : k === "gifts" ? customValue(content, "giftTitle") || "Gifts"
    : k === "faqs" ? customValue(content, "faqTitle") || "Good to know"
    : "Make the call";
  const scoreNow = won ? `${call.a + 1}–${call.b}` : `${call.a}–${call.b}–${call.s}`;
  const scoreLabel = won ? (wins ? "Game" : "Point") : call.a >= 10 && call.a > call.b ? "Game point" : "Serving";

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{RALLY_CSS}</style>
      <div ref={stageRef} className="ra-stage" aria-hidden>
        <canvas ref={glRef} className="ra-gl" />
        <div className="ra-grade" />
        <div className="ra-hud">
          <div className="ra-bug">
            <p className="ra-bug__top">
              <i className="ra-ball" />
              <b>{name || "Host"}</b>
              <span ref={callRef} className={won ? "is-won" : undefined}>{scoreNow}</span>
            </p>
            <p className="ra-bug__low">
              <span>{scoreLabel}</span>
              {gallery ? null : (
                <span className="ra-ticks" ref={ticksRef}>
                  {Array.from({ length: shotsTotal + 1 }, (_, n) => (
                    <i key={n} />
                  ))}
                </span>
              )}
            </p>
          </div>
          {gallery ? null : (
            <>
              <div className="ra-track">
                <p><span>Speed</span><b ref={speedRef}>0</b><em>km/h</em></p>
                <p><span>Spin</span><b ref={spinRef}>0</b><em>rpm</em></p>
                <p><span>Net</span><b ref={clearRef}>–</b><em>cm</em></p>
              </div>
              <div className="ra-tag" ref={tagRef}>
                <b>In</b>
                <i />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ra-world">
        <section className={`ra-title${deck && idx === 0 && shown ? " is-on" : ""}`} data-ra-stop aria-hidden={deck && idx !== 0 ? true : undefined}>
          <div className="ra-hero">
            <Field as="p" className="ra-kick" path="custom.heroLine" value={customValue(content, "heroLine")} fallback="A birthday rally" placeholder="" editor={E} />
            <Field as="h1" className="ra-name" path="custom.names" value={customValue(content, "names")} fallback={hostNames(content) || undefined} placeholder="Your name" editor={E} />
            {ageLine || E ? <Field as="p" className="ra-age" path="custom.ageLine" value={customValue(content, "ageLine")} fallback={ageLine || undefined} placeholder="turns 35 (or set the age in Rally details)" editor={E} /> : null}
            <p className="ra-meta">
              {when ? <span>{when}</span> : editorPreview ? <span>Your date</span> : null}
              {at ? <span>{` · ${at}`}</span> : null}
              {venue || town ? (
                <span className="ra-where">
                  <i aria-hidden>{" · "}</i>
                  {venue && town && venue !== town ? `${venue}, ${town}` : venue || town}
                </span>
              ) : null}
            </p>
          </div>
          {gallery || deck ? null : (
            <button type="button" className="ra-hint" onClick={E ? undefined : () => goTo(all[0] ?? "rsvp")} tabIndex={E ? -1 : undefined}>
              <Field path="custom.hint" value={customValue(content, "hint")} fallback="Scroll to serve" placeholder="" editor={E} />
              <i aria-hidden />
            </button>
          )}
        </section>

        {gallery ? null : (
          <>
            {stops.map((k, i) => stopEl(k, i))}
            {deck ? (
              <nav className="ra-ctrl" aria-label="Shots">
                <button type="button" className="ra-prev" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Back a shot">
                  ‹
                </button>
                <ol className="ra-pips">
                  {[name || "Serve", ...all.map((k) => stopTitle(k))].map((label, n) => (
                    <li key={n}>
                      <button type="button" className={n === idx ? "is-on" : n < idx ? "is-done" : undefined} onClick={() => go(n)} aria-label={n === 0 ? "The serve" : label} aria-current={n === idx ? "step" : undefined}>
                        {n === last ? "★" : n === 0 ? "S" : n}
                      </button>
                    </li>
                  ))}
                </ol>
                <button type="button" className="ra-next" onClick={() => go(idx + 1)} disabled={idx === last}>
                  {idx === 0 ? customValue(content, "hint") || "Serve" : idx === last ? "Make the call" : "Next shot"}
                  <i aria-hidden>›</i>
                </button>
              </nav>
            ) : null}
            {hidden.map((h) => (
              <HiddenSection key={h.k} k={h.k} label={h.label} editor={E} />
            ))}
            {over ? (
              card("rsvp", rsvpIndex, "", <>
                <h2 className="ra-h2">Good game</h2>
                <p className="ra-p">{customValue(content, "afterParty") || "Thank you for playing."}</p>
                {maker}
              </>, "ra-final")
            ) : vis.rsvp !== false ? (
              card("rsvp", rsvpIndex, "rsvp", <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} credit={maker} won={won} wins={wins} onIn={() => apiRef.current?.smash()} delay={moving ? 1700 : 0} />, "ra-final")
            ) : (
              <section className="ra-stop ra-final" data-ra-stop data-ra-key="rsvp">
                <div className="ra-dock">
                  <HiddenSection k="rsvp" label="RSVP" editor={E} />
                  {maker ? <div className="ra-card" data-ra-dock>{maker}</div> : null}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
