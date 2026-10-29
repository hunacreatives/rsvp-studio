import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { useFlowSnap } from "../shared/stopSnap";
import { eventIsOver, longDate, timeOf } from "../under-glass/content";
import { boatSvg } from "./boat";
import RsvpCard from "./RsvpCard";
import { useOcean } from "./ocean";
import { FREEDIVE_CSS } from "./styles";

/**
 * The Blue (freediving birthdays and the like): a level camera at the waterline, a bangka on
 * the surface, then down the dive line as the guest scrolls, the diver held in view while the
 * ocean darkens past, to the bottom plate at full depth, which is the reply.
 *  - The full depth is the age (a 30th dives to 30 m); the sections sit at depths on the way
 *    down and a gauge counts the metres.
 *  - The opening (published page and design preview): the page opens deep in the blue, bubbles
 *    rising; the camera rises with them and breaks the surface; droplets on the lens slide off.
 *    Any scroll, tap or key skips it. Builder, gallery card, reduced motion: at the surface.
 */

const DIVER = "/event-templates/freedive/diver.webp";
const MONO = "DM+Mono:wght@400;500";

const NUMBERS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const words = (n: number) => (n < 20 ? NUMBERS[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? `-${NUMBERS[n % 10]}` : "") : String(n));

const nameOf = (c: EventContent) => customValue(c, "names") || hostNames(c);
function hostNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]}` : first[0] ?? "";
}
const ageOf = (c: EventContent) => {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 120 ? n : 0;
};

export default function FreediveTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("freedive-mono", [MONO]);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const diverRef = useRef<HTMLImageElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLElement>(null);
  const gaugeRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLElement>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const moving = !reduced && !editorPreview && !gallery;
  const [intro] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [phase, setPhase] = useState<"intro" | "arrived" | "still">(intro ? "intro" : "still");
  const [wet, setWet] = useState(false);
  useOcean(glRef, rootRef, { animate: moving });

  const age = ageOf(content);
  const max = age || 30;
  const vis = settings.sectionVisibility;
  const ed = siteEdit(editorPreview);
  const E = editorPreview;
  const name = nameOf(content);
  const turningDefault = (age ? `${content.hosts.filter((h) => h.name.trim()).length > 1 ? "are" : "is"} turning ${words(age)}` : "");
  const turning = customValue(content, "ageLine") || turningDefault;
  const when = longDate(content.eventDate);
  const at = content.eventDate.includes("T") ? timeOf(content.eventDate) : "";
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const town = address.split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "";
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => editorPreview || s.label.trim());
  const dress = customValue(content, "dressCode");
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => editorPreview || f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash || !!customValue(content, "giftNote");
  const over = !editorPreview && eventIsOver(content.eventDate);

  // the stops on the way down, at even depths short of the plate
  const stops = useMemo(() => {
    const list: string[] = [];
    if (vis.schedule !== false && (schedule.length || venue || editorPreview)) list.push("day");
    if (vis.dress !== false && (dress || editorPreview)) list.push("bring");
    if (vis.registry !== false && (gifts || editorPreview)) list.push("gifts");
    if (vis.faqs !== false && (faqs.length || editorPreview)) list.push("faqs");
    return list;
  }, [vis.schedule, vis.dress, vis.registry, vis.faqs, schedule.length, venue, editorPreview, dress, gifts, faqs.length]);
  // switched-off sections, shown in the builder as a slim "hidden · Show" where they'd be
  const hidden = [
    vis.schedule === false && { k: "schedule", label: "The day" },
    vis.dress === false && { k: "dress", label: "What to bring" },
    vis.registry === false && { k: "registry", label: "Gifts" },
    vis.faqs === false && { k: "faqs", label: "Good to know" },
  ].filter(Boolean) as { k: string; label: string }[];
  // one swipe, one stop: the surface, each depth, the plate at the bottom
  useFlowSnap(rootRef, moving && (live || demo), ".fd-stop, .fd-plate", String(stops.length));
  const depthAt = (i: number) => Math.max(1, Math.round((max * (i + 1)) / (stops.length + 1.2)));

  // the intro: the world starts below the surface and rises to it
  useLayoutEffect(() => {
    if (phase !== "intro") return;
    const world = worldRef.current;
    const html = document.documentElement;
    if (!world) return;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const D = 3400;
    const start = performance.now();
    const from = window.innerHeight * 1.35;
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    let raf = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      world.style.transform = "";
      html.style.overflow = prev;
      setWet(true);
      setPhase("arrived");
      window.dispatchEvent(new Event("scroll"));
    };
    world.style.transform = `translateY(${-from}px)`;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / D);
      world.style.transform = `translateY(${(-from * (1 - ease(t))).toFixed(1)}px)`;
      if (t > 0.86) setWet(true);
      if (t < 1) raf = requestAnimationFrame(step);
      else finish();
    };
    raf = requestAnimationFrame(step);
    const skip = () => finish();
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    evs.forEach((e) => window.addEventListener(e, skip, { passive: true }));
    return () => {
      cancelAnimationFrame(raf);
      evs.forEach((e) => window.removeEventListener(e, skip));
      world.style.transform = "";
      html.style.overflow = prev;
    };
  }, [phase]);
  useEffect(() => {
    if (!wet) return;
    const t = window.setTimeout(() => setWet(false), 2600);
    return () => window.clearTimeout(t);
  }, [wet]);

  // the dive: how deep (the gauge), the diver darkening with depth, the plate's stub to the line
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const page = root.getBoundingClientRect();
      const surf = root.querySelector("[data-surface]")?.getBoundingClientRect();
      const plate = plateRef.current?.getBoundingClientRect();
      if (!surf || !plate) return;
      const view = Math.min(window.innerHeight, page.height);
      const s = surf.top - page.top, e = plate.top - page.top;
      const at = -page.top;
      const top = s - view * 0.35, end = e - view * 0.35;
      const p = Math.min(1, Math.max(0, (at - top) / Math.max(1, end - top)));
      if (readRef.current) readRef.current.textContent = String(Math.round(p * max));
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p.toFixed(3)})`;
      gaugeRef.current?.classList.toggle("is-on", at > s - view * 0.3);
      if (diverRef.current) diverRef.current.style.filter = `brightness(${(1.05 - p * 0.55).toFixed(3)}) saturate(${(1 - p * 0.35).toFixed(3)})`;
      const ln = lineRef.current?.getBoundingClientRect();
      if (ln && plateRef.current) plateRef.current.style.setProperty("--stub", `${Math.max(0, plate.left - ln.left)}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [max]);
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  // the intro's bubbles and droplets: fixed patterns (seeded), so the page renders the same way
  const bubbles = useMemo(() => {
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 26 }, () => {
      const q = r();
      const size = 4 + q * q * 22;
      return { left: 8 + r() * 84, size, dur: 1.6 + r() * 1.6, delay: r() * 1.4, sway: r() * 40 - 20 };
    });
  }, []);
  const drops = useMemo(() => {
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 34 }, () => {
      const q = r();
      const w = 8 + q * q * 46;
      return { left: r() * 100, top: r() * 92, w, h: w * (1.05 + r() * 0.35), delay: r() * 0.5, dur: 1.2 + r() * 1.1, fall: 30 + r() * 160 };
    });
  }, []);

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: moving ? "smooth" : "auto", block: "start" });
  const vars = { ["--fd-display" as string]: theme.displayFont, ["--fd-sans" as string]: theme.bodyFont, ["--fd-mono" as string]: '"DM Mono", ui-monospace, monospace' } as CSSProperties;
  const cls = ["fd-root", moving ? "fd-motion" : "", phase === "intro" ? "fd-intro" : "", phase === "arrived" ? "fd-arrived" : "", wet ? "fd-wet" : "", gallery ? "fd-gallery" : ""].filter(Boolean).join(" ");

  const stop = (key: string, i: number) => {
    const d = <p className="fd-depth"><i />{depthAt(i)} m</p>;
    if (key === "day")
      return (
        <div key={key} className="fd-stop" {...ed.section("schedule")}>
          {d}
          <Field as="h2" className="fd-h2" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="The day" placeholder="" editor={E} />
          {E ? (
            <>
              <Field as="p" className="fd-addr" path="primaryLocation.name" value={venue} placeholder="Where the day starts" editor={E} />
              <Field as="p" className="fd-addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
            </>
          ) : venue ? (
            <p className="fd-addr">{[venue, address].filter(Boolean).join(", ")}</p>
          ) : null}
          {venue ? (
            <div style={{ marginTop: 8 }}>
              <VenueLinks content={content} font="var(--fd-sans)" color="#fff" size={14} align="left" />
            </div>
          ) : null}
          {schedule.length ? (
            <div className="fd-legs" {...ed.list("schedule")}>
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
          <AddItem list="schedule" label={schedule.length ? "Add to the day" : "Add the day"} editor={E} />
        </div>
      );
    if (key === "bring")
      return (
        <div key={key} className="fd-stop" {...ed.section("dress")}>
          {d}
          <Field as="h2" className="fd-h2" path="custom.bringTitle" value={customValue(content, "bringTitle")} fallback="What to bring" placeholder="" editor={E} />
          <Field as="p" className="fd-p" path="custom.dressCode" value={dress} placeholder="What to bring or wear, e.g. mask, fins and reef-safe sunscreen." editor={E} multiline />
        </div>
      );
    if (key === "gifts")
      return (
        <div key={key} className="fd-stop" {...ed.section("registry")}>
          {d}
          <Field as="h2" className="fd-h2" path="custom.giftTitle" value={customValue(content, "giftTitle")} fallback="Gifts" placeholder="" editor={E} />
          <Field as="p" className="fd-p" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your company is the only gift needed."} placeholder="" editor={E} multiline />
          {content.registryLinks.length ? (
            <div className="fd-links">
              {content.registryLinks.map((r) => (
                <a key={r.id} className="fd-btn" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                  {r.storeName}
                </a>
              ))}
            </div>
          ) : null}
          {cash ? (
            giftsOpen ? (
              <div className="fd-gifts">
                <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "#0b2a40", muted: "#4a6577", surface: "#f0f8fc", line: "rgba(11,42,64,0.18)", bodyFont: "var(--fd-sans)", displayFont: "var(--fd-display)", radius: 10, align: "left" }} />
              </div>
            ) : (
              <div className="fd-links">
                <button type="button" className="fd-btn" onClick={() => setGiftsOpen(true)}>
                  {customValue(content, "giftButton") || "View gift details"}
                </button>
              </div>
            )
          ) : null}
        </div>
      );
    return (
      <div key={key} className="fd-stop" {...ed.section("faqs")}>
        {d}
        <Field as="h2" className="fd-h2" path="custom.faqTitle" value={customValue(content, "faqTitle")} fallback="Good to know" placeholder="" editor={E} />
        <div {...ed.list("faqs")}>
          {faqs.map((f) => (
            <div key={f.id} className="fd-faq" {...ed.item(f.id)}>
              <Field as="b" path="question" value={f.question} placeholder="A question" editor={E} />
              <Field as="span" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
            </div>
          ))}
        </div>
        <AddItem list="faqs" label={faqs.length ? "Add a question" : "Add a question guests ask"} editor={E} />
      </div>
    );
  };

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{FREEDIVE_CSS}</style>
      <canvas ref={glRef} className="fd-gl" aria-hidden />
      {intro ? (
        <div className="fd-overlay" aria-hidden>
          {phase === "intro" ? (
            <div className="fd-bubbles">
              {bubbles.map((b, i) => (
                <i key={i} style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, ["--sway" as string]: `${b.sway}px` }} />
              ))}
            </div>
          ) : null}
          <div className="fd-lens">
            {drops.map((d, i) => (
              <i key={i} style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.w, height: d.h, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s`, ["--fall" as string]: `${d.fall}px` }} />
            ))}
          </div>
        </div>
      ) : null}

      <div ref={worldRef} className="fd-world">
        <div className="fd-gaugelane" aria-hidden>
          <div ref={gaugeRef} className="fd-gauge">
            <div className="fd-read">
              <b>
                <span ref={readRef}>0</span> m
              </b>
              <span>Depth</span>
            </div>
            <div className="fd-track">
              <i ref={fillRef} className="fd-fill" />
            </div>
          </div>
        </div>

        <section className="fd-surface">
          <div className="fd-sky">
            <Field as="p" className="fd-k" path="custom.heroLine" value={customValue(content, "heroLine")} fallback="Take a deep breath" placeholder="" editor={E} />
            <Field as="h1" path="custom.names" value={customValue(content, "names")} fallback={hostNames(content) || undefined} placeholder="Your name" editor={E} />
            <Field as="p" className="fd-turns" path="custom.ageLine" value={customValue(content, "ageLine")} fallback={turningDefault || undefined} placeholder="is turning thirty (or set the age in The Blue details)" editor={E} />
            <p className="fd-when">
              {when ? <span>{when}</span> : editorPreview ? "Your date" : null}
              {at ? (
                <>
                  {" · "}
                  <span>{at}</span>
                </>
              ) : null}
              {venue || town ? (
                <>
                  {" · "}
                  <span>{venue && town && venue !== town ? `${venue}, ${town}` : venue || town}</span>
                </>
              ) : null}
            </p>
            {vis.rsvp !== false && !over && !gallery ? (
              <button type="button" className="fd-reply" onClick={ed.on ? undefined : toRsvp}>
                <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Kindly reply" placeholder="" editor={E} />
              </button>
            ) : null}
          </div>
          <div className="fd-waterline" data-surface />
          <div className="fd-boat" aria-hidden>
            <i className="fd-contact" />
            <div className="fd-hull" dangerouslySetInnerHTML={{ __html: boatSvg(`${uid}b`) }} />
          </div>
          <i className="fd-buoy" aria-hidden />
        </section>

        <div className="fd-descent">
          <i ref={lineRef} className="fd-line" aria-hidden />
          <div className="fd-diverlane" aria-hidden>
            <img ref={diverRef} className="fd-diver" src={DIVER} alt="" />
          </div>
          <div className="fd-depths">
            {stops.map(stop)}
            {hidden.map((h) => (
              <HiddenSection key={h.k} k={h.k} label={h.label} editor={E} />
            ))}
          </div>

          <section className="fd-bottom">
            <div ref={plateRef} className="fd-plate" id="rsvp" {...ed.section("rsvp")}>
              {over ? (
                <div>
                  <h2>Thank you for diving in</h2>
                  <p className="fd-small">{customValue(content, "afterParty") || "What a day in the blue."}</p>
                </div>
              ) : vis.rsvp !== false ? (
                <RsvpCard
                  content={content}
                  editorPreview={editorPreview}
                  sample={!live && !editorPreview}
                  depth={max}
                  credit={
                    credit.show ? (
                      <p className="fd-maker">
                        <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 600 }} />
                      </p>
                    ) : null
                  }
                />
              ) : credit.show ? (
                <p className="fd-maker">
                  <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 600 }} />
                </p>
              ) : null}
            </div>
            <div className="fd-floor" data-floor />
          </section>
        </div>
      </div>
    </div>
  );
}
