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
import { climbOf, crestAt, heroX, useMountain, type Sky } from "./mountain";
import { markerSvg } from "./marker";
import RsvpCard from "./RsvpCard";
import { SUMMIT_CSS } from "./styles";

/**
 * Summit (for climbers and hikers): a Philippine mountain, all rainforest, seen with a level
 * camera that rises as the guest scrolls: past the camps on the way up (the sections), through
 * the cloud, to the reply at the top beside the summit marker, a climber on the peak.
 *  - The full height is the mountain's (a field; 3,000 m if not set); an altimeter counts it and
 *    each camp is labelled with the height the camera is at when it's in view.
 *  - The opening (published page and design preview): night at the foot of the mountain, then
 *    dawn, the light reaching the summit first, then the morning. Any scroll, tap or key skips
 *    it. Builder, gallery card, reduced motion: the morning, at the foot.
 */

const CLIMBER = "/event-templates/summit/climber.webp";
const MONO = "DM+Mono:wght@400;500";

const NUMBERS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const words = (n: number) => (n < 20 ? NUMBERS[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? `-${NUMBERS[n % 10]}` : "") : String(n));

function hostNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]}` : first[0] ?? "";
}
const ageOf = (c: EventContent) => {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 120 ? n : 0;
};
const heightOf = (c: EventContent) => {
  const n = Number(customValue(c, "summitHeight").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n >= 100 && n <= 9000 ? n : 3000;
};
const metres = (n: number) => n.toLocaleString("en-US");

export default function SummitTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("summit-mono", [MONO]);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mistRef = useRef<HTMLDivElement>(null);
  const postRef = useRef<HTMLDivElement>(null);
  const climberRef = useRef<HTMLImageElement>(null);
  const readRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLElement>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const moving = !reduced && !editorPreview && !gallery;
  const [intro] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [phase, setPhase] = useState<"intro" | "arrived" | "still">(intro ? "intro" : "still");
  const sky = useRef<Sky>({ dawn: intro ? 0 : 1, morning: intro ? 0 : 1 });
  useMountain(glRef, rootRef, sky, { animate: moving });

  const age = ageOf(content);
  const height = heightOf(content);
  const vis = settings.sectionVisibility;
  const ed = siteEdit(editorPreview);
  const E = editorPreview;
  const turningDefault = age ? `${content.hosts.filter((h) => h.name.trim()).length > 1 ? "are" : "is"} turning ${words(age)}` : "";
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

  // the camps on the way up
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

  // one swipe, one stop: the hero, each camp, the summit
  useFlowSnap(rootRef, moving && (live || demo), "[data-camp] > .sm-in", String(stops.length), stageRef);

  // each camp's height: where the altimeter reads when the camp is in the middle of the frame
  const [alts, setAlts] = useState<number[]>([]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    const measure = () => {
      const page = root.getBoundingClientRect();
      const view = stage.offsetHeight;
      const next = Array.from(root.querySelectorAll<HTMLElement>("[data-camp]")).map((el) => {
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (r.top - page.top + r.height / 2 - view / 2) / Math.max(1, page.height - view)));
        return Math.round((p * height) / 10) * 10;
      });
      setAlts((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [height, stops.length]);

  // the intro: night → dawn at the foot of the mountain, then the morning comes in
  useLayoutEffect(() => {
    if (phase !== "intro") return;
    const html = document.documentElement;
    const sk = sky.current;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const D = 4600, M = 3500;
    const start = performance.now();
    let raf = 0;
    let warm = 0;
    let done = false;
    const morning = () => {
      const m0 = performance.now();
      const step = (now: number) => {
        sk.morning = Math.min(1, (now - m0) / M);
        if (sk.morning < 1) warm = requestAnimationFrame(step);
      };
      warm = requestAnimationFrame(step);
    };
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      sk.dawn = 1;
      html.style.overflow = prev;
      setPhase("arrived");
      morning();
    };
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / D);
      sk.dawn = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      if (k > 0.72) setPhase((p) => (p === "intro" ? "arrived" : p));
      if (k < 1) raf = requestAnimationFrame(step);
      else finish();
    };
    raf = requestAnimationFrame(step);
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    evs.forEach((e) => window.addEventListener(e, finish, { passive: true }));
    return () => {
      cancelAnimationFrame(raf);
      evs.forEach((e) => window.removeEventListener(e, finish));
      html.style.overflow = prev;
      if (!done) {
        // cut short (the page closed mid-intro): leave the scene in the morning
        cancelAnimationFrame(warm);
        sk.dawn = 1;
        sk.morning = 1;
      }
    };
  }, [phase]);

  // the climb: the altimeter, the mist thinning (thick in the cloud), the marker and the
  // climber stood on the peak at the top
  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const f = stage.getBoundingClientRect();
      const p = climbOf(f, root.getBoundingClientRect());
      if (readRef.current) readRef.current.textContent = metres(Math.round(p * height));
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p.toFixed(3)})`;
      const through = Math.exp(-Math.pow((0.74 - p) / 0.06, 2));
      mistRef.current?.style.setProperty("--mist", (0.55 * (1 - p) + through * 0.6).toFixed(3));
      const W = f.width, H = f.height, cx = heroX(W) * W, small = W < 700;
      stage.classList.toggle("sm-top", p > 0.9);
      climberRef.current?.classList.toggle("is-on", p > 0.93);
      const fw = small ? 36 : 52, postX = cx + fw * 0.75;
      if (postRef.current) postRef.current.style.transform = `translate(${(postX - fw * 0.5).toFixed(1)}px, ${(crestAt(postX, W, H, p) - fw * 1.25 + (small ? 8 : 6)).toFixed(1)}px)`;
      const ch = small ? 30 : 44;
      if (climberRef.current) climberRef.current.style.transform = `translate(${(cx - ch * 0.36).toFixed(1)}px, ${(crestAt(cx, W, H, p) - ch + 3).toFixed(1)}px)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    const ro = new ResizeObserver(onScroll);
    ro.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [height]);
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: moving ? "smooth" : "auto", block: "center" });
  const vars = { ["--sm-display" as string]: theme.displayFont, ["--sm-sans" as string]: theme.bodyFont, ["--sm-mono" as string]: '"DM Mono", ui-monospace, monospace' } as CSSProperties;
  const cls = ["sm-root", moving ? "sm-motion" : "", phase === "intro" ? "sm-intro" : "", gallery ? "sm-gallery" : ""].filter(Boolean).join(" ");

  const camp = (key: string, i: number) => {
    const label = (
      <p className="sm-alt">
        <i />
        {alts[i] != null ? `${metres(alts[i])} m · ` : ""}
        {i === 0 ? "Base camp" : `Camp ${i}`}
      </p>
    );
    if (key === "day")
      return (
        <section key={key} className="sm-camp" data-camp>
          <div className="sm-in sm-shadow" {...ed.section("schedule")}>
            {label}
            <Field as="h2" className="sm-h2" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="The day" placeholder="" editor={E} />
            {E ? (
              <>
                <Field as="p" className="sm-addr" path="primaryLocation.name" value={venue} placeholder="Where the climb starts" editor={E} />
                <Field as="p" className="sm-addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
              </>
            ) : venue ? (
              <p className="sm-addr">{[venue, address].filter(Boolean).join(", ")}</p>
            ) : null}
            {venue ? (
              <div style={{ marginTop: 8 }}>
                <VenueLinks content={content} font="var(--sm-sans)" color="#fff" size={14} align="left" />
              </div>
            ) : null}
            {schedule.length ? (
              <div className="sm-legs" {...ed.list("schedule")}>
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
        </section>
      );
    if (key === "bring")
      return (
        <section key={key} className="sm-camp" data-camp>
          <div className="sm-in sm-shadow" {...ed.section("dress")}>
            {label}
            <Field as="h2" className="sm-h2" path="custom.bringTitle" value={customValue(content, "bringTitle")} fallback="What to bring" placeholder="" editor={E} />
            <Field as="p" className="sm-p" path="custom.dressCode" value={dress} placeholder="What to bring or wear, e.g. a jacket, a headlamp and good boots." editor={E} multiline />
          </div>
        </section>
      );
    if (key === "gifts")
      return (
        <section key={key} className="sm-camp" data-camp>
          <div className="sm-in sm-shadow" {...ed.section("registry")}>
            {label}
            <Field as="h2" className="sm-h2" path="custom.giftTitle" value={customValue(content, "giftTitle")} fallback="Gifts" placeholder="" editor={E} />
            <Field as="p" className="sm-p" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your company is the only gift needed."} placeholder="" editor={E} multiline />
            {content.registryLinks.length ? (
              <div className="sm-links">
                {content.registryLinks.map((r) => (
                  <a key={r.id} className="sm-btn" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                    {r.storeName}
                  </a>
                ))}
              </div>
            ) : null}
            {cash ? (
              giftsOpen ? (
                <div className="sm-gifts">
                  <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "#17222f", muted: "#55606c", surface: "#f6f7f9", line: "rgba(23,34,47,0.18)", bodyFont: "var(--sm-sans)", displayFont: "var(--sm-display)", radius: 10, align: "left" }} />
                </div>
              ) : (
                <div className="sm-links">
                  <button type="button" className="sm-btn" onClick={() => setGiftsOpen(true)}>
                    {customValue(content, "giftButton") || "View gift details"}
                  </button>
                </div>
              )
            ) : null}
          </div>
        </section>
      );
    return (
      <section key={key} className="sm-camp" data-camp>
        <div className="sm-in sm-shadow" {...ed.section("faqs")}>
          {label}
          <Field as="h2" className="sm-h2" path="custom.faqTitle" value={customValue(content, "faqTitle")} fallback="Good to know" placeholder="" editor={E} />
          <div {...ed.list("faqs")}>
            {faqs.map((f) => (
              <div key={f.id} className="sm-faq" {...ed.item(f.id)}>
                <Field as="b" path="question" value={f.question} placeholder="A question" editor={E} />
                <Field as="span" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
              </div>
            ))}
          </div>
          <AddItem list="faqs" label={faqs.length ? "Add a question" : "Add a question guests ask"} editor={E} />
        </div>
      </section>
    );
  };

  const maker = credit.show ? (
    <p className="sm-maker">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 600 }} />
    </p>
  ) : null;

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{SUMMIT_CSS}</style>
      <canvas ref={glRef} className="sm-gl" aria-hidden />
      <div ref={stageRef} className="sm-stage" aria-hidden>
        <div ref={mistRef} className="sm-mist">
          <i className="a" />
          <i className="b" />
        </div>
        <div ref={postRef} className="sm-post" dangerouslySetInnerHTML={{ __html: markerSvg(`${uid}w`, metres(height)) }} />
        <img ref={climberRef} className="sm-climber" src={CLIMBER} alt="" />
      </div>

      <div className="sm-world">
        <div className="sm-gaugelane" aria-hidden>
          <div className="sm-gauge">
            <div className="sm-read">
              <b>
                <span ref={readRef}>0</span> m
              </b>
              <span>Altitude</span>
            </div>
            <div className="sm-track">
              <i ref={fillRef} className="sm-fill" />
            </div>
          </div>
        </div>

        <section className="sm-hero">
          <div className="sm-words sm-shadow">
            <Field as="p" className="sm-k" path="custom.heroLine" value={customValue(content, "heroLine")} fallback="The climb begins at dawn" placeholder="" editor={E} />
            <Field as="h1" path="custom.names" value={customValue(content, "names")} fallback={hostNames(content) || undefined} placeholder="Your name" editor={E} />
            <Field as="p" className="sm-turns" path="custom.ageLine" value={customValue(content, "ageLine")} fallback={turningDefault || undefined} placeholder="is turning thirty (or set the age in Summit details)" editor={E} />
            <p className="sm-when">
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
              <button type="button" className="sm-reply" onClick={ed.on ? undefined : toRsvp}>
                <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Kindly reply" placeholder="" editor={E} />
              </button>
            ) : null}
          </div>
        </section>

        {gallery ? null : (
          <>
            {stops.map(camp)}
            {hidden.map((h) => (
              <HiddenSection key={h.k} k={h.k} label={h.label} editor={E} />
            ))}
            <div className="sm-cloud" />
            <section className="sm-summit">
              {over || vis.rsvp !== false ? (
                <div className="sm-card" id="rsvp" {...ed.section("rsvp")}>
                  {over ? (
                    <div>
                      <h2>Thank you for climbing with us</h2>
                      <p className="sm-small">{customValue(content, "afterParty") || "What a view it was."}</p>
                      {maker}
                    </div>
                  ) : (
                    <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} height={metres(height)} credit={maker} />
                  )}
                </div>
              ) : maker || E ? (
                <div className="sm-card" id="rsvp">
                  <HiddenSection k="rsvp" label="RSVP" editor={E} />
                  {maker}
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
