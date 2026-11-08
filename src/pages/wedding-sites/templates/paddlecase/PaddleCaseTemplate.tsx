import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { loadFontFamilies } from "../../presentation/loadFonts";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import type { EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import VenueLinks from "../shared/VenueLinks";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { createStopSnap } from "../shared/stopSnap";
import { eventIsOver, timeOf } from "../under-glass/content";
import { ageWords, bbox, between, BODY, CARD, fitSurface, frameFor, IMG, INTRO_FRAMES, introFrame, quadMatrix, roman, initialsOf, SIZES, STILL, WHOLE, type Cam, type Rect, type SurfaceKey } from "./scene";
import RsvpCard from "./RsvpCard";
import { PADDLECASE_CSS } from "./styles";

/**
 * The Paddle Case (pickleball birthdays and club days): a premium paddle case open on a walnut
 * table, seen from straight above (a Blender still), and every word on an object in it: the name
 * in gold foil on the leather patch, the celebrant's initials stamped on the paddle face with the
 * age in Roman numerals, the host's note handwritten on the hang tag, the day printed on the
 * tournament card, the reply filled in on the scorecard, what to bring on the packing label, what
 * to wear embroidered on the towel.
 *  - Scrolling moves one camera (one transform on the scene) from object to object, one swipe a
 *    stop (shared stopSnap): the whole case (a phone: the case body), the patch, the paddle and the
 *    tag, the card, the towel, the label, the scorecard (a computer: beside the card).
 *  - The opening (published page and design preview): the case lies closed and zipped, the pull
 *    slides down and the lid swings open: 62 rendered frames drawn to one canvas, then the still
 *    and the words (already painted, faint) fade in. Any input skips it; reduced motion, the
 *    builder and the gallery card start open.
 *  - Each object's face is a fixed size, so the words shrink to fit it (a long note, six rows).
 */

const HANDS = ["Caveat:wght@500;600;700", "Special+Elite"];

function hostNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]}` : first[0] ?? "";
}
const ageOf = (c: EventContent) => {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 120 ? n : 0;
};
function kickerDefault(c: EventContent): string {
  return c.occasion === "birthday" ? "A birthday on the court" : "A day on the court";
}
/** "Saturday · 12 June 2027 · 4 PM" */
function whenLine(iso: string): string {
  if (!iso) return "";
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-GB", { weekday: "long" });
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const time = iso.includes("T") ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: d.getMinutes() ? "2-digit" : undefined }) : "";
  return [day, date, time].filter(Boolean).join(" · ");
}
const lines = (s: string) => s.split(/\n+/).map((l) => l.trim()).filter(Boolean);

const FIT_MIN: Record<SurfaceKey, number> = { title: 0.4, paddle: 0.45, message: 0.45, schedule: 0.45, rsvp: 0.5, bring: 0.5, wear: 0.45 };

export default function PaddleCaseTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("paddlecase-hands", HANDS);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLImageElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const moving = !reduced && !editorPreview && !gallery;
  const [phase, setPhase] = useState<"intro" | "open">(() => ((live || demo) && moving && (typeof window === "undefined" || (window.location.hash !== "#rsvp" && window.scrollY < 10)) ? "intro" : "open"));
  const intro = phase === "intro";

  const vis = settings.sectionVisibility;
  const ed = siteEdit(editorPreview);
  const E = editorPreview;
  const age = ageOf(content);
  const name = customValue(content, "names") || hostNames(content);
  const turns = age ? `turns ${ageWords(age)}` : "";
  const when = whenLine(content.eventDate);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const town = address.split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "";
  const initials = (customValue(content, "initials") || initialsOf(content.hosts.map((h) => h.name))).toUpperCase().slice(0, 4);
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => E || s.label.trim());
  const wear = lines(customValue(content, "dressCode"));
  const bring = lines(customValue(content, "bring"));
  const over = !E && eventIsOver(content.eventDate);

  const showNote = vis.hostIntro !== false && (paragraphs.length > 0 || E);
  const showDay = vis.schedule !== false && (schedule.length > 0 || !!venue || E);
  const showWear = vis.dress !== false && (wear.length > 0 || E);
  const showBring = vis.bring !== false && (bring.length > 0 || E);
  const showReply = over || vis.rsvp !== false;

  // ---- the camera's stops
  const [phone, setPhone] = useState(false);
  const stops = useMemo<Rect[]>(() => {
    if (gallery) return [CARD];
    // a phone frames each object closer (its width is the limit), so the words stay readable
    const list: Rect[] = [phone ? BODY : WHOLE, bbox(["title"], phone ? 0.008 : 0.03), bbox(["paddle", "message"], phone ? 0.015 : 0.03)];
    if (showDay) list.push(bbox(["schedule"], phone ? 0.01 : 0.03));
    if (showWear) list.push(bbox(["wear"], phone ? 0.02 : 0.04));
    if (showBring) list.push(bbox(["bring"], phone ? 0.008 : 0.05));
    if (showReply) list.push(phone ? bbox(["rsvp"], 0.012) : showDay ? bbox(["schedule", "rsvp"], 0.02) : bbox(["rsvp"], 0.03));
    return list;
  }, [gallery, phone, showDay, showWear, showBring, showReply]);
  const stopsKey = stops.map((r) => r.join(",")).join("|");

  // the camera follows the scroll: one transform, set only when it changes
  useLayoutEffect(() => {
    const root = rootRef.current, stage = stageRef.current, scene = sceneRef.current;
    if (!root || !stage || !scene) return;
    let cams: Cam[] = [], last = "", raf = 0, idle = 0, vw = 0, vh = 0;
    const measure = () => {
      vw = stage.clientWidth;
      vh = stage.clientHeight;
      if (!vw || !vh) return;
      const isPhone = vw / vh < 0.9;
      setPhone((p) => (p === isPhone ? p : isPhone));
      cams = stops.map((r) => frameFor(r, vw, vh));
      last = "";
    };
    const update = () => {
      raf = 0;
      if (!cams.length) measure();
      if (!cams.length) return;
      const rs = root.getBoundingClientRect(), ss = stage.getBoundingClientRect();
      const n = cams.length;
      const p = root.classList.contains("pc-intro") ? 0 : Math.max(0, Math.min(n - 1, (ss.top - rs.top) / Math.max(1, ss.height)));
      const i = Math.min(n - 1, Math.floor(p));
      const c = i >= n - 1 ? cams[n - 1] : between(cams[i], cams[i + 1], p - i);
      const key = `${c.s.toFixed(5)}|${c.x.toFixed(2)}|${c.y.toFixed(2)}`;
      if (key !== last) {
        // while it moves the scene is one layer (cheap to move); at rest it's drawn sharp again
        if (last) {
          root.classList.add("pc-moving");
          clearTimeout(idle);
          idle = window.setTimeout(() => root.classList.remove("pc-moving"), 220);
        }
        last = key;
        scene.style.transform = `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0) scale(${c.s.toFixed(5)})`;
      }
      root.classList.toggle("pc-moved", p > 0.05);
      root.classList.toggle("pc-end", p > n - 1.4);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const resize = () => {
      measure();
      kick();
    };
    measure();
    update();
    window.addEventListener("scroll", kick, { passive: true, capture: true });
    window.addEventListener("resize", resize);
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    const mo = new MutationObserver(kick);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", kick, { capture: true });
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey]);

  // one swipe, one stop
  const snapOn = moving && (live || demo);
  useEffect(() => {
    const root = rootRef.current, stage = stageRef.current;
    if (!root || !stage || !snapOn) return;
    const snap = createStopSnap(root, true);
    let raf = 0;
    const measure = () => {
      raf = 0;
      const H = stage.getBoundingClientRect().height || window.innerHeight;
      snap.update(stops.map((_, i) => ({ from: Math.round(i * H) })), H);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapOn, stopsKey]);

  // the words fit their faces: now, when the words change, and once the fonts are in
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let raf = 0;
    const fitAll = () => {
      raf = 0;
      for (const el of scene.querySelectorAll<HTMLElement>("[data-pc-surf]")) fitSurface(el, FIT_MIN[el.dataset.pcSurf as SurfaceKey] ?? 0.5);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(fitAll);
    };
    fitAll();
    const mo = new MutationObserver(kick);
    mo.observe(scene, { childList: true, subtree: true, characterData: true });
    let alive = true;
    document.fonts?.ready.then(() => alive && fitAll());
    document.fonts?.addEventListener?.("loadingdone", kick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      mo.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", kick);
    };
  }, []);

  // the opening: closed and zipped, the pull slides, the lid swings open; then the still and the words
  useLayoutEffect(() => {
    if (phase !== "intro") return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const cv = cvRef.current, still = stillRef.current;
    const ctx = cv?.getContext("2d");
    let over = false, raf = 0, wait = 0;
    // the page is let go a moment after the opening ends, so the key or swipe that skipped it is
    // spent (stopSnap sees the page still held) instead of also moving to the next stop
    let releasing = false;
    const release = () => {
      releasing = true;
      window.setTimeout(() => (html.style.overflow = prev), 60);
    };
    const finish = () => {
      if (over) return;
      over = true;
      cancelAnimationFrame(raf);
      clearTimeout(wait);
      evs.forEach((e) => window.removeEventListener(e, finish));
      release();
      setPhase("open");
    };
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    evs.forEach((e) => window.addEventListener(e, finish, { passive: true }));
    // frames that take too long (a slow connection): open at once rather than keep them waiting
    wait = window.setTimeout(finish, 9000);
    const load = (src: string) =>
      new Promise<HTMLImageElement | null>((ok) => {
        const im = new Image();
        im.src = src;
        im.decode().then(() => ok(im), () => ok(null));
      });
    (async () => {
      if (!cv || !ctx) return finish();
      // the closed case first, so the screen isn't empty while the rest arrive
      const first = await load(introFrame(0));
      if (over) return;
      if (first) {
        cv.width = first.naturalWidth;
        cv.height = first.naturalHeight;
        ctx.drawImage(first, 0, 0);
      }
      const rest = Promise.all(Array.from({ length: INTRO_FRAMES - 1 }, (_, i) => load(introFrame(i + 1))));
      const [frames] = await Promise.all([rest, still?.decode().catch(() => {})]);
      if (over) return;
      const imgs = [first, ...frames];
      if (!first || imgs.some((im) => !im)) return finish();
      clearTimeout(wait);
      const T = 2600, t0 = performance.now();
      let shown = 0;
      const step = (now: number) => {
        if (over) return;
        const k = Math.min(1, (now - t0) / T), f = Math.min(INTRO_FRAMES - 1, Math.round(k * (INTRO_FRAMES - 1)));
        if (f !== shown) {
          shown = f;
          ctx.drawImage(imgs[f]!, 0, 0); // one draw per new frame, nothing else
        }
        if (k < 1) raf = requestAnimationFrame(step);
        else wait = window.setTimeout(finish, 60);
      };
      raf = requestAnimationFrame(step);
    })();
    return () => {
      over = true;
      cancelAnimationFrame(raf);
      clearTimeout(wait);
      evs.forEach((e) => window.removeEventListener(e, finish));
      // torn down before it finished: let go of the page now, not after a delay. (A delayed release here let a re-run
      // read the page as already held, save "hidden" as its own `prev` and later restore it, so the
      // page never scrolled again; React runs this twice in development.)
      if (!releasing) html.style.overflow = prev;
    };
  }, [phase]);

  // a link straight to the reply (#rsvp): the last stop
  useEffect(() => {
    if (!live || window.location.hash !== "#rsvp") return;
    const t = setTimeout(() => {
      const root = rootRef.current, stage = stageRef.current;
      if (!root || !stage) return;
      window.scrollTo(0, window.scrollY + root.getBoundingClientRect().top + (stops.length - 1) * stage.getBoundingClientRect().height);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const surf = (key: SurfaceKey, extra?: Record<string, unknown>) => ({
    "data-pc-surf": key,
    className: `pc-surf pc-${key}`,
    style: { width: SIZES[key][0], height: SIZES[key][1], transform: quadMatrix(key) } as CSSProperties,
    ...extra,
  });

  const vars = { ["--pc-display" as string]: theme.displayFont, ["--pc-sans" as string]: theme.bodyFont } as CSSProperties;
  const cls = ["pc-root", intro ? "pc-intro" : "", gallery ? "pc-gallery" : ""].filter(Boolean).join(" ");
  const signature = hostNames(content);
  // the maker's mark, printed small at the foot of the scorecard
  const made = credit.show && !gallery ? (
    <p className="made">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 600 }} />
    </p>
  ) : null;

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{PADDLECASE_CSS}</style>
      <div ref={stageRef} className="pc-stage">
        <div ref={sceneRef} className="pc-scene" style={{ width: IMG[0], height: IMG[1] }}>
          <img ref={stillRef} className="pc-still" src={STILL} alt="" decoding="async" draggable={false} />
          {moving ? <canvas ref={cvRef} className="pc-cv" aria-hidden /> : null}

          {/* the leather patch: the name, in gold foil */}
          <header {...surf("title")}>
            <div className="pc-in">
              <Field as="p" className="k pc-foil" path="custom.heroLine" value={customValue(content, "heroLine")} fallback={kickerDefault(content)} placeholder="" editor={E} />
              <Field as="h1" className="n pc-foil" path="custom.names" value={customValue(content, "names")} fallback={hostNames(content) || undefined} placeholder="Your name" editor={E} />
              <Field as="p" className="t pc-foil" path="custom.ageLine" value={customValue(content, "ageLine")} fallback={turns || undefined} placeholder="turns thirty (set the age)" editor={E} />
              {when || venue || town || E ? (
                <p className="d">
                  {when || E ? <span className="pc-foil">{when || "Your date"}</span> : null}
                  {venue || town ? (
                    <span className="pc-foil">
                      {venue && town && venue !== town ? (
                        <>
                          {venue}, <span className="nw">{town}</span>
                        </>
                      ) : (
                        venue || town
                      )}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </header>

          {/* the paddle face: the initials, stamped, and the age in Roman numerals */}
          <div {...surf("paddle")} aria-hidden={E ? undefined : true}>
            <div className="pc-in">
              <Field as="span" className="mono pc-foil" path="custom.initials" value={customValue(content, "initials")} fallback={initials || undefined} placeholder="AB" editor={E} />
              <span className="rule" />
              {age ? <span className="yr pc-foil">{roman(age)}</span> : null}
            </div>
          </div>

          {/* the hang tag: the host's note */}
          <div {...surf("message", ed.section("hostIntro"))}>
            <span className="hole" aria-hidden />
            <div className="pc-in">
              {showNote ? (
                <>
                  {paragraphs.length ? (
                    paragraphs.map((p, i) => <Field key={i} as="p" path={`story#${i}`} value={p} placeholder="" editor={E} multiline />)
                  ) : (
                    <Field as="p" path="story#0" value="" placeholder="A few lines for your guests, written on the tag." editor={E} multiline />
                  )}
                  <Field as="span" className="sig" path="custom.signature" value={customValue(content, "signature")} fallback={signature ? `— ${signature}` : undefined} placeholder="— Your name" editor={E} />
                </>
              ) : vis.hostIntro === false ? (
                <HiddenSection k="hostIntro" label="The note on the tag" editor={E} />
              ) : null}
            </div>
          </div>

          {/* the tournament card: the day */}
          <div {...surf("schedule", ed.section("schedule"))}>
            <div className="pc-in">
              {showDay ? (
                <>
                  <Field as="p" className="h" path="custom.dayLabel" value={customValue(content, "dayLabel")} fallback="The day" placeholder="" editor={E} />
                  <Field as="h2" className="ht" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="Game plan" placeholder="" editor={E} />
                  {schedule.length ? (
                    <ol {...ed.list("schedule")}>
                      {schedule.map((s) => (
                        <li key={s.id} {...ed.item(s.id)}>
                          <b>{timeOf(s.startTime) || (E ? "Time" : "")}</b>
                          <span>
                            <Field path="label" value={s.label} placeholder="What’s happening" editor={E} />
                            {s.description || E ? <Field as="em" path="description" value={s.description} placeholder="A note (optional)" editor={E} multiline /> : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  <AddItem list="schedule" label={schedule.length ? "Add to the day" : "Add the day"} editor={E} />
                  {venue || address || E ? (
                    <div className="where">
                      <Field as="b" path="primaryLocation.name" value={venue} placeholder="The club" editor={E} />
                      {address || E ? (
                        <>
                          {" · "}
                          <Field path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
                        </>
                      ) : null}
                      {venue && !E ? (
                        <div className="links">
                          <VenueLinks content={content} font="var(--pc-sans)" color="#8a6a2f" size={26} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : vis.schedule === false ? (
                <HiddenSection k="schedule" label="The day" editor={E} />
              ) : null}
            </div>
          </div>

          {/* the scorecard: the reply */}
          <div {...surf("rsvp", { id: "rsvp", ...ed.section("rsvp") })}>
            {over ? (
              <div className="pc-in">
                <h2 className="h">{customValue(content, "rsvpTitle") || "Scorecard"}</h2>
                <p className="done">Thank you for playing</p>
                <p className="small">{customValue(content, "afterParty") || "What a game it was."}</p>
                {made}
              </div>
            ) : vis.rsvp !== false ? (
              <RsvpCard content={content} editorPreview={E} sample={!live && !E} host={hostNames(content)} credit={made} />
            ) : (
              <div className="pc-in">
                <HiddenSection k="rsvp" label="RSVP" editor={E} />
              </div>
            )}
          </div>

          {/* the packing label: what to bring */}
          <div {...surf("bring", ed.section("bring"))}>
            <div className="pc-in">
              {showBring ? (
                <>
                  <Field as="p" className="h" path="custom.bringTitle" value={customValue(content, "bringTitle")} fallback="Pack" placeholder="" editor={E} />
                  <Field as="p" className="l" path="custom.bring" value={customValue(content, "bring")} placeholder="A water bottle, a towel, your paddle" editor={E} multiline>
                    {bring.join(" · ")}
                  </Field>
                </>
              ) : vis.bring === false ? (
                <HiddenSection k="bring" label="What to bring" editor={E} />
              ) : null}
            </div>
          </div>

          {/* the towel: what to wear, embroidered */}
          <div {...surf("wear", ed.section("dress"))}>
            <div className="pc-in">
              {showWear ? (
                <>
                  <Field as="p" className="h" path="custom.wearTitle" value={customValue(content, "wearTitle")} fallback="Wear" placeholder="" editor={E} />
                  <Field as="div" path="custom.dressCode" value={customValue(content, "dressCode")} placeholder="Court shoes, something light" editor={E} multiline className={E && !wear.length ? "i" : undefined}>
                    {wear.map((l, i) => (
                      <span key={i} className="i">
                        {l}
                      </span>
                    ))}
                  </Field>
                </>
              ) : vis.dress === false ? (
                <HiddenSection k="dress" label="What to wear" editor={E} />
              ) : null}
            </div>
          </div>
        </div>

        {gallery ? null : <p className="pc-hint">Scroll</p>}
        {credit.show && !gallery && !showReply ? (
          <p className="pc-credit">
            <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 600 }} />
          </p>
        ) : null}
      </div>
      {gallery ? null : (
        <div className="pc-track" aria-hidden>
          {stops.map((_, i) => (
            <section key={i} data-pc-stop={i} />
          ))}
        </div>
      )}
    </div>
  );
}
