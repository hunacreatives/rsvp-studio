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
import { useQuest } from "./quest";
import { VIEW_OF, type PlaceKey } from "./world";
import RsvpCard from "./RsvpCard";
import { LEVELUP_CSS } from "./styles";

/**
 * Level Up (gamer birthdays, any age): a low-poly island in real 3D with a game's HUD over it.
 * The page opens on a title screen (the name as the game's title, "Level 30", Press start);
 * then the camera swoops down and flies landmark to landmark as the guest scrolls, each section a
 * quest card, to the final quest at the castle: the reply ("Accept quest"; +100 XP).
 *  - The title screen's swoop plays on the published page and the design preview, when the
 *    guest presses start (a tap, a key, a scroll). Builder, gallery card, reduced motion: the
 *    world is still and the title stays up.
 */

// each section's landmark, and what the quest card calls it
const SPOT: Record<string, { place: PlaceKey; where: string }> = {
  day: { place: "village", where: "Campfire village" },
  gear: { place: "lighthouse", where: "The lighthouse" },
  loot: { place: "chest", where: "Treasure beach" },
  tips: { place: "windmill", where: "The windmill" },
  rsvp: { place: "castle", where: "The castle" },
};

function hostNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(" & ")} & ${first[first.length - 1]}` : first[0] ?? "";
}
const ageOf = (c: EventContent) => {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 150 ? n : 0;
};

export default function LevelUpTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const xpRef = useRef<HTMLElement>(null);
  const xpLabelRef = useRef<HTMLParagraphElement>(null);
  const whereRef = useRef<HTMLElement>(null);
  const burstRef = useRef<HTMLCanvasElement>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const moving = !reduced && !editorPreview && !gallery;
  const [boot] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [phase, setPhase] = useState<"title" | "flying" | "playing">(boot ? "title" : "playing");
  // the swoop: 0 above the clouds, 1 over the island (the gallery card stays above the clouds)
  const introRef = useRef(boot || gallery ? 0 : 1);

  const age = ageOf(content);
  const vis = settings.sectionVisibility;
  const ed = siteEdit(editorPreview);
  const E = editorPreview;
  const name = customValue(content, "names") || hostNames(content);
  const levelLine = customValue(content, "levelLine") || (age ? `Level ${age}` : "");
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

  // the quests, in order (the reply is always the last stop, at the castle)
  const stops = useMemo(() => {
    const list: string[] = [];
    if (vis.schedule !== false && (schedule.length || venue || editorPreview)) list.push("day");
    if (vis.dress !== false && (dress || editorPreview)) list.push("gear");
    if (vis.registry !== false && (gifts || editorPreview)) list.push("loot");
    if (vis.faqs !== false && (faqs.length || editorPreview)) list.push("tips");
    return list;
  }, [vis.schedule, vis.dress, vis.registry, vis.faqs, schedule.length, venue, editorPreview, dress, gifts, faqs.length]);
  const hidden = [
    vis.schedule === false && { k: "schedule", label: "The day" },
    vis.dress === false && { k: "dress", label: "Gear up" },
    vis.registry === false && { k: "registry", label: "Loot" },
    vis.faqs === false && { k: "faqs", label: "Tips" },
  ].filter(Boolean) as { k: string; label: string }[];
  const all = gallery ? [] : [...stops, "rsvp"];
  const route = [0, ...all.map((k) => VIEW_OF[SPOT[k].place])].join(",");
  const where = ["The island", ...all.map((k) => SPOT[k].where)];
  useQuest({ root: rootRef, stage: stageRef, gl: glRef, map: mapRef, xp: xpRef, xpLabel: xpLabelRef, where: whereRef, intro: introRef }, { routeKey: route, names: where, animate: moving });

  // PRESS START: a tap, a key or a scroll; the page can't scroll until then
  useEffect(() => {
    if (phase !== "title") return;
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    let raf = 0, done = false;
    const go = () => {
      if (done) return;
      done = true;
      html.style.overflow = prev;
      setPhase("flying");
      const t0 = performance.now(), D = 3200;
      const step = (now: number) => {
        introRef.current = Math.min(1, (now - t0) / D);
        if (introRef.current < 1) raf = requestAnimationFrame(step);
        else setPhase("playing");
      };
      raf = requestAnimationFrame(step);
    };
    const evs = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, go, { passive: true }));
    return () => {
      evs.forEach((e) => window.removeEventListener(e, go));
      if (!done) html.style.overflow = prev;
    };
    // the swoop's frames run on after the title's listeners are gone
  }, [phase]);
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  // the achievement's confetti, on the frame
  const celebrate = useCallback(() => {
    const cv = burstRef.current;
    if (!cv || reduced) return;
    const r = cv.getBoundingClientRect(), c = cv.getContext("2d");
    if (!c) return;
    cv.width = Math.round(r.width); cv.height = Math.round(r.height);
    const bits = Array.from({ length: 90 }, () => ({ x: r.width * 0.7, y: r.height * 0.3, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 12 - 3, s: 5 + Math.random() * 6, col: ["#7ff0ff", "#c6ff5e", "#ffd24a", "#ff7a6b"][Math.floor(Math.random() * 4)], a: Math.random() * 6 }));
    const t0 = performance.now();
    const fly = (now: number) => {
      const t = (now - t0) / 1000;
      c.clearRect(0, 0, cv.width, cv.height);
      for (const b of bits) { b.x += b.vx; b.y += b.vy; b.vy += 0.45; b.a += 0.2; c.save(); c.translate(b.x, b.y); c.rotate(b.a); c.fillStyle = b.col; c.globalAlpha = Math.max(0, 1 - t / 2.4); c.fillRect(-b.s / 2, -b.s / 2, b.s, b.s); c.restore(); }
      if (t < 2.5) requestAnimationFrame(fly);
      else c.clearRect(0, 0, cv.width, cv.height);
    };
    requestAnimationFrame(fly);
  }, [reduced]);

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: moving ? "smooth" : "auto", block: "start" });
  const longest = Math.max(4, ...name.split(/\s+/).map((w) => w.length));
  const vars = {
    ["--lu-hud" as string]: theme.displayFont,
    ["--lu-sans" as string]: theme.bodyFont,
    ["--name-size" as string]: `clamp(56px, ${Math.min(15, 62 / longest).toFixed(2)}cqw, 210px)`,
    ["--name-size-m" as string]: `clamp(44px, ${Math.min(22, 92 / longest).toFixed(2)}cqw, 120px)`,
  } as CSSProperties;
  const cls = ["lu-root", moving ? "lu-motion" : "", phase === "title" ? "lu-booting" : "", phase !== "title" && boot ? "lu-started" : "", gallery ? "lu-gallery" : ""].filter(Boolean).join(" ");
  const maker = credit.show ? (
    <p className="lu-maker">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 700 }} />
    </p>
  ) : null;

  const quest = (key: string, i: number) => {
    const card = (sec: string, inner: ReactNode) => (
      <section key={key} className="lu-stop" data-lu-stop>
        <div className="lu-quest lu-frame" {...ed.section(sec)}>
          <p className="lu-qhead">
            <span>◆ Quest {i + 1}</span>
            <span>{SPOT[key].where}</span>
          </p>
          {inner}
        </div>
      </section>
    );
    if (key === "day")
      return card(
        "schedule",
        <>
          <Field as="h2" className="lu-h2" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="The day" placeholder="" editor={E} />
          {E ? (
            <>
              <Field as="p" className="lu-qline" path="primaryLocation.name" value={venue} placeholder="Where the party is" editor={E} />
              <Field as="p" className="lu-qline" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
            </>
          ) : venue ? (
            <p className="lu-qline">{[venue, address].filter(Boolean).join(", ")}</p>
          ) : null}
          {venue ? (
            <div style={{ marginTop: 6 }}>
              <VenueLinks content={content} font="var(--lu-sans)" color="#7ff0ff" size={13} align="left" />
            </div>
          ) : null}
          {schedule.length ? (
            <div className="lu-obj" {...ed.list("schedule")}>
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
          <AddItem list="schedule" label={schedule.length ? "Add an objective" : "Add the day"} editor={E} />
        </>,
      );
    if (key === "gear")
      return card(
        "dress",
        <>
          <Field as="h2" className="lu-h2" path="custom.gearTitle" value={customValue(content, "gearTitle")} fallback="Gear up" placeholder="" editor={E} />
          <Field as="p" className="lu-p" path="custom.dressCode" value={dress} placeholder="What to wear or bring, e.g. come as your favourite character." editor={E} multiline />
        </>,
      );
    if (key === "loot")
      return card(
        "registry",
        <>
          <Field as="h2" className="lu-h2" path="custom.lootTitle" value={customValue(content, "lootTitle")} fallback="Loot" placeholder="" editor={E} />
          <Field as="p" className="lu-p" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your company is the only gift needed."} placeholder="" editor={E} multiline />
          {content.registryLinks.length ? (
            <div className="lu-links">
              {content.registryLinks.map((r) => (
                <a key={r.id} className="lu-btn2" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                  {r.storeName}
                </a>
              ))}
            </div>
          ) : null}
          {cash ? (
            giftsOpen ? (
              <div className="lu-gifts">
                <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "#0a1628", muted: "#4b5b70", surface: "#f2f8fc", line: "rgba(10,22,40,0.18)", bodyFont: "var(--lu-sans)", displayFont: "var(--lu-hud)", radius: 12, align: "left" }} />
              </div>
            ) : (
              <div className="lu-links">
                <button type="button" className="lu-btn2" onClick={() => setGiftsOpen(true)}>
                  {customValue(content, "giftButton") || "View gift details"}
                </button>
              </div>
            )
          ) : null}
        </>,
      );
    return card(
      "faqs",
      <>
        <Field as="h2" className="lu-h2" path="custom.tipsTitle" value={customValue(content, "tipsTitle")} fallback="Tips" placeholder="" editor={E} />
        <div {...ed.list("faqs")}>
          {faqs.map((f) => (
            <div key={f.id} className="lu-tip" {...ed.item(f.id)}>
              <Field as="b" path="question" value={f.question} placeholder="A question" editor={E} />
              <Field as="span" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
            </div>
          ))}
        </div>
        <AddItem list="faqs" label={faqs.length ? "Add a tip" : "Add a question guests ask"} editor={E} />
      </>,
    );
  };

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{LEVELUP_CSS}</style>
      <div ref={stageRef} className="lu-stage" aria-hidden>
        <canvas ref={glRef} className="lu-gl" />
        {gallery ? null : (
          <div className="lu-hud">
            <div className="lu-player lu-frame">
              <div className="lu-avatar">{(name.trim()[0] ?? "★").toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <p className="lu-pname">
                  {name || "Player one"}
                  {age ? <span className="lu-lv">LV {age}</span> : null}
                </p>
                <div className="lu-xp">
                  <i ref={xpRef} />
                </div>
                <p className="lu-xpl" ref={xpLabelRef}>
                  XP 0%
                </p>
              </div>
            </div>
            <div className="lu-mapbox lu-frame">
              <canvas ref={mapRef} width={320} height={320} />
              <b ref={whereRef}>The island</b>
            </div>
          </div>
        )}
        <canvas ref={burstRef} className="lu-burst" />
      </div>

      <div className="lu-world">
        <section className="lu-title" data-lu-stop>
          <div>
            <Field as="p" className="lu-kick" path="custom.heroLine" value={customValue(content, "heroLine")} fallback="A birthday quest" placeholder="" editor={E} />
            <Field as="h1" className="lu-logo" path="custom.names" value={customValue(content, "names")} fallback={hostNames(content) || undefined} placeholder="Your name" editor={E} />
            {levelLine || E ? (
              <p className="lu-level">
                <span aria-hidden>★</span>
                <Field path="custom.levelLine" value={customValue(content, "levelLine")} fallback={levelLine || undefined} placeholder="Level 30 (or set the age in Level Up details)" editor={E} />
                <span aria-hidden>★</span>
              </p>
            ) : null}
            {gallery ? null : (
              <button type="button" className="lu-start" onClick={ed.on || phase === "title" ? undefined : toRsvp}>
                <span className="lu-btn" aria-hidden>
                  A
                </span>
                <Field path="custom.startLabel" value={customValue(content, "startLabel")} fallback="Press start" placeholder="" editor={E} />
              </button>
            )}
          </div>
          <p className="lu-meta">
            {when ? <span>{when}</span> : editorPreview ? "Your date" : null}
            {at ? <span>{` · ${at}`}</span> : null}
            {venue || town ? <span>{` · ${venue && town && venue !== town ? `${venue}, ${town}` : venue || town}`}</span> : null}
          </p>
        </section>

        {gallery ? null : (
          <>
            {stops.map(quest)}
            {hidden.map((h) => (
              <HiddenSection key={h.k} k={h.k} label={h.label} editor={E} />
            ))}
            <section className="lu-stop lu-final" id="rsvp" data-lu-stop>
              {over ? (
                <div className="lu-quest lu-frame">
                  <p className="lu-qhead">
                    <span>◆ Quest complete</span>
                    <span>The castle</span>
                  </p>
                  <h2 className="lu-h2">Thanks for playing</h2>
                  <p className="lu-small">{customValue(content, "afterParty") || "What a party it was."}</p>
                  {maker}
                </div>
              ) : vis.rsvp !== false ? (
                <div className="lu-quest lu-frame" {...ed.section("rsvp")}>
                  <p className="lu-qhead">
                    <span>◆ Final quest</span>
                    <span>The castle</span>
                  </p>
                  <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} credit={maker} onAccepted={live ? celebrate : undefined} />
                </div>
              ) : (
                <>
                  <HiddenSection k="rsvp" label="RSVP" editor={E} />
                  {maker ? <div className="lu-quest lu-frame">{maker}</div> : null}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
