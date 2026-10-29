import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
import * as A from "./art";
import { useLevel, type LevelApi, type Piece } from "./level";
import { Pix } from "./Pix";
import RsvpCard from "./RsvpCard";
import { PIXELQUEST_CSS } from "./styles";

/**
 * Pixel Quest (birthdays, any age): a side-scrolling pixel level, the whole page long. It
 * opens on a title screen (a CRT switching on, the name dropping in letter by letter, Press
 * start); then the hero drops in and runs from stop to stop as the guest scrolls, picking up
 * coins, while the sky turns from afternoon to sunset to night. Each section is a stage with its
 * own set piece (the party hall, the power-up shop, the treasure, the sage, the cake), told in
 * a pixel dialog window; the reply is the final stage, and a "yes" sets off fireworks.
 *  - The boot plays on the published page and the design preview, when motion is allowed.
 *    Builder, gallery card, reduced motion: the title is already up, the hero standing by.
 */

type Stop = "day" | "gear" | "loot" | "tips" | "rsvp";
// what stands at each stop, its window's colour and its portrait
const SPOT: Record<Stop, { piece: Piece; place: string; tone: string; icon: string[] }> = {
  day: { piece: "day", place: "Party hall", tone: A.C.coral, icon: A.ICON_BALLOONS },
  gear: { piece: "gear", place: "Power-up shop", tone: A.C.teal, icon: A.SHOPKEEPER },
  loot: { piece: "loot", place: "Treasure room", tone: A.C.gold, icon: A.ICON_CHEST },
  tips: { piece: "tips", place: "The sage", tone: "#a48bff", icon: A.TARSIER },
  rsvp: { piece: "rsvp", place: "The cake", tone: A.C.pink, icon: A.ICON_CAKE },
};
const SEC: Record<Stop, string> = { day: "schedule", gear: "dress", loot: "registry", tips: "faqs", rsvp: "rsvp" };

function hostNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(" & ")} & ${first[first.length - 1]}` : first[0] ?? "";
}
const ageOf = (c: EventContent) => {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 150 ? n : 0;
};
const ordinal = (n: number) => {
  const t = n % 100;
  return `${n}${t >= 11 && t <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};
const daysTo = (iso: string) => {
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return -1;
  const now = new Date(), a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / 86400000);
};

/** The name as the game's logo: each letter its own block, dropping in one after another; words never break. */
function Letters({ name }: { name: string }) {
  let k = 0;
  return (
    <>
      {name.split(/\s+/).filter(Boolean).map((w, wi) => (
        <Fragment key={wi}>
          {wi ? " " : null}
          <span className="pq-word" aria-hidden>
            {[...w].map((ch) => {
              const i = k++;
              return (
                <span key={i} className="pq-l" style={{ ["--i" as string]: i }}>
                  {ch}
                </span>
              );
            })}
          </span>
        </Fragment>
      ))}
    </>
  );
}

// a little pixel arrow, for the "next" prompt and the stage list
const Arrow = ({ down }: { down?: boolean }) => (
  <svg className="pq-arrow" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
    <path fill="currentColor" d={down ? "M0 1h7v1H0zM1 2h5v1H1zM2 3h3v1H2zM3 4h1v1H3z" : "M1 0h1v7H1zM2 1h1v5H2zM3 2h1v3H3zM4 3h1v1H4z"} />
  </svg>
);

export default function PixelQuestTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const coinsRef = useRef<HTMLSpanElement>(null);
  const whereRef = useRef<HTMLSpanElement>(null);
  const apiRef = useRef<LevelApi | null>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const moving = !reduced && !editorPreview && !gallery;
  const [boot] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [phase, setPhase] = useState<"title" | "playing">(boot ? "title" : "playing");
  // the boot waits (on a dark screen) for the pixel fonts, so the name never drops in a stand-in face
  const [fontsIn, setFontsIn] = useState(!boot);
  useEffect(() => {
    if (fontsIn) return;
    let on = true;
    const go = () => { if (on) setFontsIn(true); };
    const t = window.setTimeout(go, 1600);
    void document.fonts?.ready.then(() => window.setTimeout(go, 120));
    return () => { on = false; window.clearTimeout(t); };
  }, [fontsIn]);
  // the hero: -1 not yet in (the title waits for Press start), then the time it dropped in
  const spawnRef = useRef(boot ? -1 : 0);

  const age = ageOf(content);
  const worldNo = age || 1;
  const vis = settings.sectionVisibility;
  const ed = siteEdit(editorPreview);
  const E = editorPreview;
  const name = customValue(content, "names") || hostNames(content);
  const ageDefault = age ? `${ordinal(age)} birthday` : "";
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
  const days = daysTo(content.eventDate);

  // the stages, in order (the reply is always the last, at the cake)
  const stops = useMemo(() => {
    const list: Stop[] = [];
    if (vis.schedule !== false && (schedule.length || venue || editorPreview)) list.push("day");
    if (vis.dress !== false && (dress || editorPreview)) list.push("gear");
    if (vis.registry !== false && (gifts || editorPreview)) list.push("loot");
    if (vis.faqs !== false && (faqs.length || editorPreview)) list.push("tips");
    return list;
  }, [vis.schedule, vis.dress, vis.registry, vis.faqs, schedule.length, venue, editorPreview, dress, gifts, faqs.length]);
  const hidden = [
    vis.schedule === false && { k: "schedule", label: "The day" },
    vis.dress === false && { k: "dress", label: "What to wear" },
    vis.registry === false && { k: "registry", label: "Gifts" },
    vis.faqs === false && { k: "faqs", label: "Good to know" },
  ].filter(Boolean) as { k: string; label: string }[];
  const all: Stop[] = gallery ? [] : [...stops, "rsvp"];
  // the title and the stage list share the start; then one place per stage
  const route = (gallery ? [0] : [0, 0, ...all.map((_, i) => i + 1)]).join(",");
  const pieces = ["start", ...all.map((k) => SPOT[k].piece)].join(",");
  const stageNo = (i: number, k: Stop) => (k === "rsvp" ? "Final" : `${worldNo}-${i + 1}`);
  const labels = ["Start", ...all.map((k, i) => stageNo(i, k))].join("|");
  useLevel(
    { root: rootRef, stage: stageRef, view: viewRef, score: scoreRef, coins: coinsRef, where: whereRef, spawn: spawnRef, api: apiRef },
    { route, pieces, labels, candles: age || 5, animate: moving },
  );

  // scroll so a stage's window sits in its dock (where every window pauses)
  const goTo = useCallback((key: string) => {
    const wrap = rootRef.current?.querySelector<HTMLElement>(`[data-pq-key="${key}"] .pq-dock`);
    const card = wrap?.querySelector<HTMLElement>("[data-pq-dock]");
    if (!wrap || !card) return;
    const top = wrap.getBoundingClientRect().top + window.scrollY - (parseFloat(card.style.top) || 0);
    window.scrollTo({ top: Math.max(0, top), behavior: moving ? "smooth" : "auto" });
  }, [moving]);

  // PRESS START: a tap, a key or a scroll; the page can't scroll until then
  useEffect(() => {
    if (phase !== "title") return;
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      html.style.overflow = prev;
      spawnRef.current = performance.now();
      setPhase("playing");
      // the hero has landed: the stage list rises into its place
      window.setTimeout(() => { if (window.scrollY < 40) goTo("map"); }, 1150);
    };
    const evs = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, go, { passive: true }));
    return () => {
      evs.forEach((e) => window.removeEventListener(e, go));
      if (!done) html.style.overflow = prev;
    };
  }, [phase, goTo]);
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const celebrate = useCallback(() => apiRef.current?.celebrate(), []);
  const longest = Math.max(4, ...name.split(/\s+/).map((w) => w.length));
  const vars = {
    ["--pq-pixel" as string]: theme.displayFont,
    ["--pq-sans" as string]: theme.bodyFont,
    // the logo keeps to two lines on a wide page (by its longest word and its whole length)
    ["--name-size" as string]: `clamp(36px, ${Math.min(12.5, 74 / longest, 140 / Math.max(1, name.length)).toFixed(2)}cqw, 150px)`,
    ["--name-size-m" as string]: `clamp(28px, ${Math.min(19, 86 / longest, 230 / Math.max(1, name.length)).toFixed(2)}cqw, 88px)`,
    ["--n" as string]: name.replace(/\s/g, "").length,
  } as CSSProperties;
  const cls = ["pq-root", moving ? "pq-motion" : "", boot ? (fontsIn ? "pq-boot" : "pq-preboot") : "", phase === "title" && boot ? "pq-waiting" : "", phase !== "title" && boot ? "pq-started" : "", gallery ? "pq-gallery" : ""].filter(Boolean).join(" ");
  const maker = credit.show ? (
    <p className="pq-maker">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 700 }} />
    </p>
  ) : null;

  const title = (k: Stop) =>
    k === "day" ? customValue(content, "dayTitle") || "The day"
    : k === "gear" ? customValue(content, "gearTitle") || "What to wear"
    : k === "loot" ? customValue(content, "lootTitle") || "Gifts"
    : k === "tips" ? customValue(content, "tipsTitle") || "Good to know"
    : customValue(content, "rsvpTitle") || "Join the party?";
  const place = (k: Stop) => customValue(content, `${k}Place`) || SPOT[k].place;

  // one stage: its window (a bar with the stage number and the place, the portrait and the
  // heading, then the content, a "next" prompt) docked over the level
  const windowFor = (k: Stop, i: number, heading: ReactNode, inner: ReactNode, extra?: { id?: string; final?: boolean }) => {
    const next = all[i + 1];
    return (
      <section key={k} className={`pq-stop${extra?.final ? " pq-final" : ""}`} id={extra?.id} data-pq-stop data-pq-key={k}>
        <div className="pq-dock">
          <div className="pq-card" data-pq-dock style={{ ["--tone" as string]: SPOT[k].tone }} {...ed.section(SEC[k])}>
            <p className="pq-bar">
              <span>{k === "rsvp" ? "Final stage" : `World ${stageNo(i, k)}`}</span>
              <Field as="span" path={`custom.${k}Place`} value={customValue(content, `${k}Place`)} fallback={SPOT[k].place} placeholder="" editor={E} />
            </p>
            <div className="pq-win">
              {heading ? (
                <div className="pq-head">
                  <Pix rows={SPOT[k].icon} className="pq-face" />
                  {heading}
                </div>
              ) : null}
              {inner}
            </div>
            {next && !E ? (
              <button type="button" className="pq-next" aria-label={`Next: ${title(next)}`} onClick={() => goTo(next)}>
                <Arrow down />
              </button>
            ) : null}
          </div>
          {extra?.final ? null : <div className="pq-hold" aria-hidden />}
        </div>
      </section>
    );
  };

  const stage = (k: Stop, i: number) => {
    if (k === "day")
      return windowFor(
        k, i,
        <Field as="h2" className="pq-h2" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="The day" placeholder="" editor={E} />,
        <>
          <div className="pq-venue">
            {E ? (
              <>
                <Field as="p" className="pq-vname" path="primaryLocation.name" value={venue} placeholder="Where the party is" editor={E} />
                <Field as="p" className="pq-line" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
              </>
            ) : venue ? (
              <>
                <p className="pq-vname">{venue}</p>
                {address ? <p className="pq-line">{address}</p> : null}
              </>
            ) : null}
            {venue ? (
              <div className="pq-links">
                <VenueLinks content={content} font="var(--pq-sans)" color="#ffd23f" size={16} align="left" />
              </div>
            ) : null}
          </div>
          {schedule.length ? (
            <div className={`pq-plan${schedule.length > 2 ? " is-cols" : ""}`} {...ed.list("schedule")}>
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
        </>,
      );
    if (k === "gear")
      return windowFor(
        k, i,
        <Field as="h2" className="pq-h2" path="custom.gearTitle" value={customValue(content, "gearTitle")} fallback="What to wear" placeholder="" editor={E} />,
        <Field as="p" className="pq-p" path="custom.dressCode" value={dress} placeholder="What to wear or bring, e.g. comfy play clothes in your favourite colour." editor={E} multiline />,
      );
    if (k === "loot")
      return windowFor(
        k, i,
        <Field as="h2" className="pq-h2" path="custom.lootTitle" value={customValue(content, "lootTitle")} fallback="Gifts" placeholder="" editor={E} />,
        <>
          <Field as="p" className="pq-p" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your company is the only gift needed."} placeholder="" editor={E} multiline />
          {content.registryLinks.length ? (
            <div className="pq-btns">
              {content.registryLinks.map((r) => (
                <a key={r.id} className="pq-btn" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                  {r.storeName}
                </a>
              ))}
            </div>
          ) : null}
          {cash ? (
            giftsOpen ? (
              <div className="pq-gifts">
                <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "#1b1030", muted: "#5b5276", surface: "#fff8e8", line: "rgba(27,16,48,0.2)", bodyFont: "var(--pq-sans)", displayFont: "var(--pq-sans)", radius: 0, align: "left" }} />
              </div>
            ) : (
              <div className="pq-btns">
                <button type="button" className="pq-btn" onClick={() => setGiftsOpen(true)}>
                  {customValue(content, "giftButton") || "View gift details"}
                </button>
              </div>
            )
          ) : null}
        </>,
      );
    return windowFor(
      k, i,
      <Field as="h2" className="pq-h2" path="custom.tipsTitle" value={customValue(content, "tipsTitle")} fallback="Good to know" placeholder="" editor={E} />,
      <>
        <div className={`pq-faqs${faqs.length > 2 ? " is-cols" : ""}`} {...ed.list("faqs")}>
          {faqs.map((f) => (
            <div key={f.id} className="pq-faq" {...ed.item(f.id)}>
              <Field as="b" path="question" value={f.question} placeholder="A question" editor={E} />
              <Field as="span" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
            </div>
          ))}
        </div>
        <AddItem list="faqs" label={faqs.length ? "Add a question" : "Add a question guests ask"} editor={E} />
      </>,
    );
  };

  const reply = () => {
    const i = all.length - 1;
    if (over)
      return windowFor(
        "rsvp", i,
        <h2 className="pq-h2">Thanks for playing</h2>,
        <>
          <p className="pq-p">{customValue(content, "afterParty") || "What a party it was."}</p>
          {maker}
        </>,
        { id: "rsvp", final: true },
      );
    if (vis.rsvp === false)
      return (
        <section key="rsvp" className="pq-stop pq-final" id="rsvp" data-pq-stop data-pq-key="rsvp">
          <HiddenSection k="rsvp" label="RSVP" editor={E} />
          {maker ? <div className="pq-dock"><div className="pq-card pq-card--slim" data-pq-dock><div className="pq-win">{maker}</div></div></div> : null}
        </section>
      );
    return windowFor(
      "rsvp", i,
      null,
      <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} credit={maker} onAccepted={live ? celebrate : undefined} />,
      { id: "rsvp", final: true },
    );
  };

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{PIXELQUEST_CSS}</style>
      <div ref={stageRef} className="pq-stage" aria-hidden>
        <canvas ref={viewRef} className="pq-view" />
        <div className="pq-scan" />
        <div className="pq-hud">
          <div className="pq-hudname">
            <b>{name || "Player 1"}</b>
            <span ref={scoreRef}>000000</span>
          </div>
          <div>
            <b>
              <Pix rows={A.COIN[0]} className="pq-coin" />
              Coins
            </b>
            <span ref={coinsRef}>×00</span>
          </div>
          <div>
            <b>World</b>
            <span ref={whereRef}>Start</span>
          </div>
          {days >= 0 && !over ? (
            <div>
              <b>Days</b>
              <span>{String(Math.min(999, days)).padStart(3, "0")}</span>
            </div>
          ) : null}
        </div>
        {boot ? <div className="pq-crt" /> : null}
      </div>

      <div className="pq-world">
        <section className="pq-title" data-pq-stop>
          <div className="pq-titlebox">
            <Field as="p" className="pq-kick" path="custom.heroLine" value={customValue(content, "heroLine")} fallback="You’re invited" placeholder="" editor={E} />
            <Field as="h1" className="pq-logo" path="custom.names" value={name} placeholder="Your name" editor={E} aria-label={name || undefined}>
              <Letters name={name} />
            </Field>
            {ageDefault || customValue(content, "ageLine") || E ? (
              <p className="pq-age">
                <Field path="custom.ageLine" value={customValue(content, "ageLine")} fallback={ageDefault || undefined} placeholder="8th birthday (or set the age in Pixel Quest details)" editor={E} />
              </p>
            ) : null}
            <button type="button" className="pq-start" onClick={ed.on || phase === "title" ? undefined : () => goTo("map")} tabIndex={gallery ? -1 : undefined}>
              <Arrow />
              <Field path="custom.startLabel" value={customValue(content, "startLabel")} fallback="Press start" placeholder="" editor={E} />
            </button>
            <p className="pq-meta">
              {when ? <span>{when}</span> : editorPreview ? "Your date" : null}
              {at ? <span>{` · ${at}`}</span> : null}
              {venue || town ? (
                <>
                  <br />
                  <span>{venue && town && venue !== town ? `${venue}, ${town}` : venue || town}</span>
                </>
              ) : null}
            </p>
          </div>
        </section>

        {gallery ? null : (
          <>
            <section className="pq-stop pq-mapstop" data-pq-stop data-pq-key="map">
              <div className="pq-dock">
                <div className="pq-card" data-pq-dock style={{ ["--tone" as string]: A.C.gold }}>
                  <p className="pq-bar">
                    <span>{`World ${worldNo}`}</span>
                    <span>{all.length} stages</span>
                  </p>
                  <div className="pq-win">
                    <div className="pq-head">
                      <Pix rows={A.HERO_FACE} className="pq-face" />
                      <Field as="h2" className="pq-h2" path="custom.mapTitle" value={customValue(content, "mapTitle")} fallback="Select stage" placeholder="" editor={E} />
                    </div>
                    <ol className="pq-stages">
                      {all.map((k, n) => (
                        <li key={k} style={{ ["--tone" as string]: SPOT[k].tone }}>
                          <button type="button" onClick={E ? undefined : () => goTo(k)} tabIndex={E ? -1 : undefined}>
                            <i aria-hidden>{k === "rsvp" ? "★" : stageNo(n, k)}</i>
                            <span>
                              <b>{title(k)}</b>
                              <em>{place(k)}</em>
                            </span>
                            <Arrow />
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                  {all[0] && !E ? (
                    <button type="button" className="pq-next" aria-label={`Next: ${title(all[0])}`} onClick={() => goTo(all[0])}>
                      <Arrow down />
                    </button>
                  ) : null}
                </div>
                <div className="pq-hold" aria-hidden />
              </div>
            </section>
            {stops.map(stage)}
            {hidden.map((h) => (
              <HiddenSection key={h.k} k={h.k} label={h.label} editor={E} />
            ))}
            {reply()}
          </>
        )}
      </div>
    </div>
  );
}
