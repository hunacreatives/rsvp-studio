import { createElement, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import type { EventContent, ImageAsset } from "../../content/types";
import VenueLinks from "../shared/VenueLinks";
import { PhotoSlot } from "../shared/PhotoSlot";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { eventIsOver, longDate, timeOf } from "../under-glass/content";
import { flavourOf, type Flavour } from "./flavours";
import { drawBand, drawTop, tilesFor } from "./cake";
import { createCandle, type Candle } from "./candle";
import { rng } from "./sample";
import RsvpCard from "./RsvpCard";
import { useShaker, type ShakerApi } from "./shaker";
import { SPRINKLES_CSS } from "./styles";

/**
 * Sprinkles (birthdays, any age): a real cake, drawn in code. The page opens on its top, seen from
 * above: smooth buttercream with a piped border, the age as a lit number candle, an edible photo
 * print if there is one, and the name poured on in sprinkles (shaker.ts). A tap or swipe on the
 * candle blows it out, a wisp of smoke curls up and the page moves on. Then it goes down the cut
 * side of the cake, layer by layer (the top coat and its drip, sponge, jam, cream, ganache...),
 * one section a layer, each heading poured in sprinkles as it arrives; the photos are pressed into
 * the buttercream layer; the reply sits on the board at the bottom.
 *  - Strawberry, chocolate or vanilla: the frosting, the sponge, the fillings and the drip follow.
 *  - The pour, the flame and the smoke play on the published page and the design preview, when
 *    motion is allowed. Builder, gallery card, reduced motion: everything lies settled, the
 *    candle lit.
 */

type Key = "party" | "where" | "photos" | "wear" | "gifts" | "faqs";
const SEC: Record<Key | "rsvp", string> = { party: "schedule", where: "venue", photos: "gallery", wear: "dress", gifts: "registry", faqs: "faqs", rsvp: "rsvp" };
const TITLE: Record<Key | "rsvp", string> = { party: "The party", where: "Where", photos: "Photos", wear: "What to wear", gifts: "Gifts", faqs: "Good to know", rsvp: "Reply" };

function firstNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(" & ")} & ${first[first.length - 1]}` : first[0] ?? "";
}
const ageOf = (c: EventContent) => {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 150 ? n : 0;
};
const longestWord = (s: string) => Math.max(3, ...s.split(/\s+/).map((w) => w.length));
/** A heading's size: as big as it can be with its longest word on one line. */
const sizeVars = (text: string) => {
  const n = longestWord(text);
  return {
    ["--hs" as string]: `clamp(40px, ${Math.min(10.5, 80 / (0.6 * n)).toFixed(2)}cqw, 150px)`,
    ["--hs-m" as string]: `clamp(40px, ${Math.min(23, 84 / (0.62 * n)).toFixed(2)}cqw, 150px)`,
  } as CSSProperties;
};

/** A heading made of sprinkles: the real words (read aloud, found, edited in the builder),
 *  invisible, with the canvas the sprinkles are drawn on laid over them. */
function Heading({ as = "h2", className = "", style, path, value, fallback, editor, children }: { as?: ElementType; className?: string; style?: CSSProperties; path?: string; value?: string; fallback?: string; editor: boolean; children?: ReactNode }) {
  const text = value?.trim() || fallback || "";
  const inner =
    children ??
    (editor && path ? (
      <Field as={as} className="sp-h__t" path={path} value={value} fallback={fallback} placeholder="Your words" editor />
    ) : text ? (
      createElement(as, { className: "sp-h__t" }, text)
    ) : null);
  if (!inner) return null;
  return (
    <div className={`sp-h ${className}`} style={style} data-sp-h>
      {inner}
      <canvas className="sp-h__c" aria-hidden />
    </div>
  );
}

/** An edible photo print pressed into the frosting: round, a piped bead border, sprinkles
 *  scattered round it. */
function Print({ image, editor, f, seed, className = "", item }: { image: ImageAsset | null; editor: boolean; f: Flavour; seed: number; className?: string; item?: Record<string, unknown> }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const deco = useMemo(() => {
    const r = rng(seed * 97 + 13);
    const beads = Array.from({ length: 26 }, (_, i) => (i / 26) * Math.PI * 2);
    const bits = Array.from({ length: 22 }, () => {
      const a = r() * Math.PI * 2, d = 60 + r() * 22, ang = r() * Math.PI;
      const c = f.sprinkles[Math.floor(r() * f.sprinkles.length)].c;
      const x = 50 + Math.cos(a) * d, y = 50 + Math.sin(a) * d, l = r() < 0.2 ? 0 : 2.6 + r() * 1.2;
      return { x1: x - Math.cos(ang) * l, y1: y - Math.sin(ang) * l, x2: x + Math.cos(ang) * l + 0.01, y2: y + Math.sin(ang) * l, c };
    });
    return { beads, bits };
  }, [seed, f]);
  if (!image?.masterUrl && !editor) return null;
  return (
    <div className={`sp-print ${className}`} {...item}>
      <svg className="sp-print__deco" viewBox="-40 -40 180 180" aria-hidden>
        <defs>
          <radialGradient id={`b${id}`} cx="0.35" cy="0.3" r="0.75">
            <stop offset="0" stopColor={f.frostHi} />
            <stop offset="0.55" stopColor={f.frosting} />
            <stop offset="1" stopColor={f.frostLo} />
          </radialGradient>
        </defs>
        {deco.bits.map((b, i) => (
          <g key={i} strokeLinecap="round" strokeWidth="2.6">
            <line x1={b.x1 + 0.5} y1={b.y1 + 1} x2={b.x2 + 0.5} y2={b.y2 + 1} stroke="rgba(60,20,10,0.22)" />
            <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={b.c} />
          </g>
        ))}
        {deco.beads.map((a, i) => (
          <g key={`b${i}`}>
            <circle cx={50 + Math.cos(a) * 54 + 0.8} cy={50 + Math.sin(a) * 54 + 1.2} r="6.4" fill="rgba(60,20,10,0.2)" />
            <circle cx={50 + Math.cos(a) * 54} cy={50 + Math.sin(a) * 54} r="6.4" fill={`url(#b${id})`} />
          </g>
        ))}
      </svg>
      <PhotoSlot image={image} editorPreview={editor} className="sp-print__img" />
    </div>
  );
}

/** The number candle: its wax, wick and flame on a canvas reaching past it (candle.ts). */
function CandleArt({ text, f, font, size, animate, api, onBlow }: { text: string; f: Flavour; font: string; size: number; animate: boolean; api: React.MutableRefObject<Candle | null>; onBlow: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let c: Candle | null = null, alive = true;
    const make = () => { if (!alive) return; c?.dispose(); c = createCandle(cv, { text, font, size, f, animate }); api.current = c; };
    // the digits in the display font: wait for it
    const fam = font.split(",")[0];
    Promise.race([document.fonts?.load(`800 ${size}px ${fam}`), new Promise((r) => setTimeout(r, 2500))]).then(make, make);
    return () => { alive = false; c?.dispose(); api.current = null; };
  }, [text, f, font, size, animate, api]);
  return (
    <div className="sp-candle" onPointerDown={animate ? onBlow : undefined} role={animate ? "button" : undefined} aria-label={animate ? "Blow out the candle" : undefined}>
      <canvas ref={ref} aria-hidden />
    </div>
  );
}

export default function SprinklesTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  // (dev builds only: ?cake=chocolate shows another cake in the preview harness)
  const devCake = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("cake") : null;
  const flavour = flavourOf(content, devCake ? `sprinkles-${devCake}` : settings.paletteId);
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<ShakerApi | null>(null);
  const candleRef = useRef<Candle | null>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const moving = !reduced && !editorPreview && !gallery;
  const [boot] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [opened, setOpened] = useState(!boot);
  const onOpened = useCallback(() => setOpened(true), []);

  const E = editorPreview;
  const ed = siteEdit(E);
  const vis = settings.sectionVisibility;
  const age = ageOf(content);
  const name = customValue(content, "names") || firstNames(content);
  const ageLine = customValue(content, "ageLine") || (age ? `turns ${age}` : "");
  const when = longDate(content.eventDate);
  const at = content.eventDate.includes("T") ? timeOf(content.eventDate) : "";
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const town = address.split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "";
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => E || s.label.trim());
  const dress = customValue(content, "dressCode");
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => E || f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash || !!customValue(content, "giftNote");
  const over = !E && eventIsOver(content.eventDate);

  // the photos: the first is the print on top of the cake, the next four are pressed into the
  // buttercream layer
  const photos = useMemo(() => content.galleries.flatMap((g) => [...g.items].sort((a, b) => a.order - b.order)).filter((p) => p.image?.masterUrl), [content.galleries]);
  const ownHero = settings.heroImage?.masterUrl ? settings.heroImage : null;
  const hero = ownHero ?? photos[0]?.image ?? null;
  const layerPhotos = (ownHero ? photos : photos.slice(1)).slice(0, 4);
  const showPhotos = vis.gallery !== false && (layerPhotos.length > 0 || E);

  const keys = useMemo(() => {
    const list: Key[] = [];
    if (vis.schedule !== false && (schedule.length || when || E)) list.push("party");
    if (vis.venue !== false && (venue || address || E)) list.push("where");
    if (showPhotos) list.push("photos");
    if (vis.dress !== false && (dress || E)) list.push("wear");
    if (vis.registry !== false && (gifts || E)) list.push("gifts");
    if (vis.faqs !== false && (faqs.length || E)) list.push("faqs");
    return list;
  }, [vis.schedule, vis.venue, vis.dress, vis.registry, vis.faqs, schedule.length, when, venue, address, showPhotos, dress, gifts, faqs.length, E]);
  const hidden = [
    vis.schedule === false && { k: "schedule", label: "The party" },
    vis.venue === false && { k: "venue", label: "Where" },
    vis.gallery === false && { k: "gallery", label: "Photos" },
    vis.dress === false && { k: "dress", label: "What to wear" },
    vis.registry === false && { k: "registry", label: "Gifts" },
    vis.faqs === false && { k: "faqs", label: "Good to know" },
  ].filter(Boolean) as { k: string; label: string }[];
  const showReply = over || vis.rsvp !== false;
  const titleOf = (k: Key | "rsvp") => customValue(content, `${k}Title`) || TITLE[k];
  const headings = [name, ageLine, ...(gallery ? [] : keys.map(titleOf)), showReply ? (over ? "Thank you" : titleOf("rsvp")) : ""].join("|");
  const routeKey = `${gallery ? "g" : keys.join(",")}|${showReply ? 1 : 0}|${headings}|${flavour.id}|${hero ? 1 : 0}`;

  useShaker(
    { root: rootRef, stage: stageRef, view: viewRef, api: apiRef },
    { routeKey, animate: moving, boot, snap: (live || demo) && moving, flavour, editor: E, onOpened },
  );
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);
  const celebrate = useCallback(() => apiRef.current?.celebrate(), []);
  const next = useCallback(() => {
    const el = rootRef.current?.querySelectorAll<HTMLElement>("[data-sp-stop]")[1];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: moving ? "smooth" : "auto" });
  }, [moving]);

  // ---- the cake, drawn once a size: the top, and the bands between the layers
  const tiles = useMemo(() => (typeof document === "undefined" ? null : tilesFor(flavour)), [flavour]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let lastW = -1, raf = 0;
    const paint = () => {
      raf = 0;
      const w = root.clientWidth;
      const isPhone = w <= 700;
      setPhone(isPhone);
      const top = root.querySelector<HTMLCanvasElement>(".sp-top__c");
      if (top) drawTop(top, flavour, w, top.parentElement!.clientHeight, isPhone);
      root.querySelectorAll<HTMLCanvasElement>("[data-sp-band]").forEach((cv, i) => {
        const k = cv.dataset.spBand!, bw = cv.clientWidth || w;
        const kind = k === "cap" || k === "base" ? k : flavour.fillings[Number(k) % flavour.fillings.length];
        drawBand(cv, flavour, kind, bw, cv.clientHeight || 80, 101 + i * 17, cv.dataset.under === "b" ? "b" : "a");
      });
      lastW = w;
    };
    const kick = () => { if (root.clientWidth !== lastW && !raf) raf = requestAnimationFrame(paint); };
    paint();
    const ro = new ResizeObserver(kick);
    ro.observe(root);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [flavour, routeKey]);

  // ---- the candle: blown out by a tap or a swipe on it (then the page moves on), or by the
  // wind of the page leaving the top; lit again when the page comes back to it
  const blownAt = useRef(0);
  const blow = useCallback(() => {
    if (!candleRef.current?.blow()) return;
    blownAt.current = performance.now();
    const html = document.documentElement;
    const t0 = performance.now();
    const go = () => {
      const root = rootRef.current;
      if (!root) return;
      if (html.style.overflow === "hidden") { if (performance.now() - t0 < 8000) window.setTimeout(go, 200); return; }
      if (root.getBoundingClientRect().top > -12) next();
    };
    window.setTimeout(go, 1100);
  }, [next]);
  useEffect(() => {
    if (!moving) return;
    let lastY = window.scrollY, lastT = performance.now();
    const onScroll = () => {
      const root = rootRef.current, c = candleRef.current;
      if (!root || !c) return;
      const now = performance.now(), y = window.scrollY, v = (y - lastY) / Math.max(8, now - lastT);
      lastY = y; lastT = now;
      const off = -root.getBoundingClientRect().top, H = window.innerHeight;
      c.lean(-v * 0.9);
      if (c.lit() && off > H * 0.2) { c.blow(); blownAt.current = now; }
      if (!c.lit() && off < 6 && now - blownAt.current > 2600) c.light();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [moving]);

  const nameN = longestWord(name);
  const vars = {
    ["--sp-ink" as string]: flavour.ink,
    ["--sp-muted" as string]: flavour.muted,
    ["--sp-line" as string]: flavour.line,
    ["--sp-field" as string]: flavour.field,
    ["--sp-btn" as string]: flavour.btn,
    ["--sp-btn-ink" as string]: flavour.btnInk,
    ["--sp-frost" as string]: flavour.frosting,
    ["--sp-frost-hi" as string]: flavour.frostHi,
    ["--sp-frost-lo" as string]: flavour.frostLo,
    ["--sp-sponge-a" as string]: flavour.sponge[0],
    ["--sp-sponge-b" as string]: flavour.sponge[1],
    ["--sp-cream" as string]: flavour.cream,
    ["--sp-cream-ink" as string]: flavour.id === "chocolate" ? "#3a1f15" : flavour.ink,
    ["--sp-cream-muted" as string]: flavour.id === "chocolate" ? "#6e4a38" : flavour.muted,
    ["--sp-table" as string]: flavour.table,
    ["--sp-tile-a" as string]: tiles ? `url(${tiles.urls.a})` : "none",
    ["--sp-tile-b" as string]: tiles ? `url(${tiles.urls.b})` : "none",
    ["--sp-tile-cream" as string]: tiles ? `url(${tiles.urls.cream})` : "none",
    ["--sp-tile-table" as string]: tiles ? `url(${tiles.urls.table})` : "none",
    ["--sp-display" as string]: theme.displayFont,
    ["--sp-body" as string]: theme.bodyFont,
    ["--ns" as string]: `clamp(56px, ${Math.min(11.5, 64 / (0.6 * nameN)).toFixed(2)}cqw, 170px)`,
    ["--ns-m" as string]: `clamp(48px, ${Math.min(30, 80 / (0.62 * nameN)).toFixed(2)}cqw, 150px)`,
    background: flavour.table,
  } as CSSProperties;
  const cls = ["sp-root", moving ? "sp-motion" : "sp-still", boot ? "sp-boot" : "", opened ? "sp-opened" : "", E ? "sp-editor" : "", gallery ? "sp-gallery" : "", `sp-${flavour.id}`].filter(Boolean).join(" ");
  const maker = credit.show ? (
    <p className="sp-maker">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }} />
    </p>
  ) : null;

  // each section is a layer of the cut cake: its sponge (alternating), the band above it
  let layerNo = 0;
  const section = (k: Key | "rsvp", body: ReactNode, opts?: { id?: string; heading?: string; path?: string }) => {
    const i = layerNo++;
    const board = k === "rsvp";
    const face = k === "photos" ? "cream" : i % 2 ? "b" : "a";
    const band = board ? "base" : i === 0 ? "cap" : String(i - 1);
    return (
      <section key={k} className={`sp-sec sp-layer sp-sec--${k}${board ? " sp-board" : ""}${i === 0 ? " sp-first" : ""} sp-on-${face}`} id={opts?.id} data-sp-stop {...ed.section(SEC[k])}>
        {board ? null : <div className={`sp-face sp-face--${face}`} aria-hidden />}
        <canvas className={`sp-band sp-band--${band === "cap" || band === "base" ? band : "fill"}`} data-sp-band={band} data-under={band === "base" ? ((i - 1) % 2 ? "b" : "a") : face === "b" ? "b" : "a"} aria-hidden />
        <div className="sp-in">
          <Heading
            path={opts?.path ?? `custom.${k}Title`}
            value={opts?.heading !== undefined ? opts.heading : customValue(content, `${k}Title`)}
            fallback={TITLE[k]}
            editor={E}
            style={sizeVars(opts?.heading || titleOf(k))}
          />
          <div className="sp-body">{body}</div>
        </div>
      </section>
    );
  };

  const body = (k: Key) => {
    if (k === "party")
      return section(
        k,
        <>
          <p className="sp-lead">
            {when ? <span>{when}</span> : E ? <span className="sp-faint">Set the date in Date & venue</span> : null}
            {at ? <span className="sp-at">{at}</span> : null}
          </p>
          {schedule.length || E ? (
            <div className="sp-plan" {...ed.list("schedule")}>
              {schedule.map((s) => (
                <div key={s.id} className="sp-row" {...ed.item(s.id)}>
                  <b>{timeOf(s.startTime) || (E ? "Time" : "")}</b>
                  <span>
                    <Field path="label" value={s.label} placeholder="What’s happening" editor={E} />
                    {s.description || E ? <Field as="em" path="description" value={s.description} placeholder="A note (optional)" editor={E} multiline /> : null}
                  </span>
                </div>
              ))}
              <AddItem list="schedule" label={schedule.length ? "Add to the party" : "Add the party’s plan"} editor={E} />
            </div>
          ) : null}
        </>,
      );
    if (k === "where")
      return section(
        k,
        <div>
          <Field as="p" className="sp-lead" path="primaryLocation.name" value={venue} placeholder="Where the party is" editor={E} />
          {address || E ? <Field as="p" className="sp-sub" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} /> : null}
          {customValue(content, "whereNote") || E ? <Field as="p" className="sp-p" path="custom.whereNote" value={customValue(content, "whereNote")} placeholder="A note about getting there (optional)" editor={E} multiline /> : null}
          {venue ? (
            <div className="sp-links">
              <VenueLinks content={content} font="var(--sp-body)" color={flavour.ink} size={16} align="left" />
            </div>
          ) : null}
        </div>,
      );
    if (k === "photos") {
      const slots: (ImageAsset | null)[] = layerPhotos.map((p) => p.image);
      if (E && slots.length < 4) slots.push(null);
      const idOf = new Map(photos.map((p) => [p.image, p.id]));
      return section(
        k,
        <div className={`sp-prints n${slots.length}`} aria-label={content.galleries[0]?.title?.trim() || "Photos"} {...ed.list("gallery")}>
          {slots.map((img, i) => (
            <Print key={img?.id ?? `add-${i}`} image={img} editor={E} f={flavour} seed={i + 2} className={`sp-print--${i}`} item={img && idOf.get(img) ? ed.item(idOf.get(img)!) : undefined} />
          ))}
        </div>,
      );
    }
    if (k === "wear")
      return section(k, <Field as="p" className="sp-lead sp-lead--text" path="custom.dressCode" value={dress} placeholder="What to wear, e.g. party clothes you can play in." editor={E} multiline />);
    if (k === "gifts")
      return section(
        k,
        <div>
          <Field as="p" className="sp-p sp-p--big" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your company is the only gift needed."} placeholder="" editor={E} multiline />
          {content.registryLinks.length ? (
            <div className="sp-btns">
              {content.registryLinks.map((r) => (
                <a key={r.id} className="sp-btn sp-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                  {r.storeName}
                </a>
              ))}
            </div>
          ) : null}
          {cash ? (
            giftsOpen || E ? (
              <div className="sp-gifts">
                <CashGifts content={{ ...content, cashGiftNote: "" }} editor={E} look={{ ink: flavour.ink, muted: flavour.muted, surface: flavour.field, line: flavour.line, bodyFont: "var(--sp-body)", displayFont: "var(--sp-body)", radius: 14, align: "left" }} />
              </div>
            ) : (
              <div className="sp-btns">
                <button type="button" className="sp-btn sp-btn--line" onClick={() => setGiftsOpen(true)}>
                  {customValue(content, "giftButton") || "View gift details"}
                </button>
              </div>
            )
          ) : null}
        </div>,
      );
    return section(
      k,
      <div className="sp-faqs" {...ed.list("faqs")}>
        {faqs.map((f) => (
          <div key={f.id} className="sp-faq" {...ed.item(f.id)}>
            <Field as="b" path="question" value={f.question} placeholder="A question" editor={E} />
            <Field as="span" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
          </div>
        ))}
        <AddItem list="faqs" label={faqs.length ? "Add a question" : "Add a question guests ask"} editor={E} />
      </div>,
    );
  };

  const reply = () => {
    if (over)
      return section(
        "rsvp",
        <>
          <p className="sp-lead sp-lead--text">{customValue(content, "afterParty") || "What a party it was."}</p>
          {maker}
        </>,
        { id: "rsvp", heading: "Thank you", path: "" },
      );
    if (vis.rsvp === false)
      return (
        <div key="rsvp" className="sp-end" id="rsvp">
          <HiddenSection k="rsvp" label="RSVP" editor={E} />
          {maker}
        </div>
      );
    return section("rsvp", <RsvpCard content={content} editorPreview={E} sample={!live && !E} credit={maker} onAccepted={live ? celebrate : undefined} />, { id: "rsvp" });
  };

  const candleSize = phone ? 104 : 140;
  const topRow = age || hero || E;

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{SPRINKLES_CSS}</style>
      {moving ? (
        <div ref={stageRef} className="sp-stage" aria-hidden>
          <canvas ref={viewRef} className="sp-view" />
        </div>
      ) : null}

      <section className="sp-sec sp-open" data-sp-stop>
        <div className="sp-top" aria-hidden>
          <canvas className="sp-top__c" />
        </div>
        <div className="sp-in">
          {topRow ? (
            <div className={`sp-toprow${hero || E ? " has-print" : ""}`}>
              {hero || E ? <Print image={hero} editor={E} f={flavour} seed={1} className="sp-print--hero" item={photos[0] && !ownHero ? ed.item(photos[0].id) : undefined} /> : null}
              {age ? <CandleArt text={String(age)} f={flavour} font={theme.displayFont} size={candleSize} animate={moving} api={candleRef} onBlow={blow} /> : null}
            </div>
          ) : null}
          <Field as="p" className="sp-kick" path="custom.heroLine" value={customValue(content, "heroLine")} fallback="You’re invited" placeholder="" editor={E} />
          <Heading as="h1" className="sp-h--name" editor={E}>
            <h1 className="sp-h__t" aria-label={[name, ageLine].filter(Boolean).join(" ") || undefined}>
              <Field as="span" className="sp-name" path="custom.names" value={customValue(content, "names")} fallback={name || undefined} placeholder="Name" editor={E} />
              {ageLine || E ? <Field as="span" className="sp-age" path="custom.ageLine" value={customValue(content, "ageLine")} fallback={ageLine || undefined} placeholder="turns 7" editor={E} /> : null}
            </h1>
          </Heading>
          <p className="sp-meta">
            {when ? <span>{when}</span> : E ? <span>Your date</span> : null}
            {at ? <span>{at}</span> : null}
            {venue || town ? <span className="sp-meta__at">{venue && town && venue !== town ? `${venue}, ${town}` : venue || town}</span> : null}
          </p>
        </div>
        {gallery ? null : (
          <button type="button" className="sp-cue" onClick={E ? undefined : () => (candleRef.current?.lit() && moving ? blow() : next())} tabIndex={E ? -1 : undefined}>
            <Field path="custom.cueLabel" value={customValue(content, "cueLabel")} fallback={age && moving ? "Blow out the candle" : "The details"} placeholder="" editor={E} />
            <svg viewBox="0 0 12 12" aria-hidden>
              <path d="M6 1.5v8M2.5 6.5 6 10l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </section>

      {gallery ? null : (
        <>
          {keys.map(body)}
          {hidden.map((h) => (
            <HiddenSection key={h.k} k={h.k} label={h.label} editor={E} />
          ))}
          {reply()}
        </>
      )}
    </div>
  );
}
