import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { loadFontFamilies } from "../../presentation/loadFonts";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import type { EventContent } from "../../content/types";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { eventIsOver, longDate, timeOf } from "../under-glass/content";
import { propSvg, type PropKind } from "./props";
import RsvpCard from "./RsvpCard";
import { usePoolWater } from "./water";
import { POOLSIDE_CSS } from "./styles";

/**
 * Poolside (birthdays and parties by the pool): a resort pool seen from above, the whole page
 * long, its water drawn live on the GPU.
 *  - The words are on the water in deep navy, their shadow on the tiles below; rings, beach
 *    balls and an air mattress drift in the gaps between them. On the published page, a ripple
 *    spreads out from the name.
 *  - Around it, a peach tiled deck: palm fronds reaching in over the edge, loungers with striped
 *    towels, umbrellas, side tables, plants, flip-flops, a ladder into the pool. The deck repeats
 *    down the page however long the host's sections make it.
 *  - The reply is on a beach towel spread on the deck at the far end.
 */

const WAVES = "/event-templates/riviera/waves.jpg";
const ROW = 1150;

/** Things on the deck, one row's worth (repeats every ROW px). `off`: from the pool's edge to the centre. */
const DECK: { k: PropKind; side: "l" | "r"; off: number; top: number; w: number; c?: string; rot?: number }[] = [
  { k: "lounger", side: "l", off: 170, top: 120, w: 84, c: "coral", rot: -4 },
  { k: "table", side: "l", off: 80, top: 250, w: 70 },
  { k: "umbrella", side: "r", off: 150, top: 40, w: 220, c: "coral" },
  { k: "lounger", side: "r", off: 210, top: 300, w: 84, c: "sun", rot: 3 },
  { k: "flops", side: "r", off: 80, top: 560, w: 64, c: "mint", rot: 20 },
  { k: "plant", side: "l", off: 110, top: 640, w: 110 },
  { k: "lounger", side: "r", off: 150, top: 860, w: 84, c: "sky", rot: -3 },
  { k: "umbrella", side: "l", off: 170, top: 960, w: 210, c: "sun" },
  { k: "table", side: "r", off: 70, top: 1100, w: 70 },
];
const LOUNGER_COLOURS = ["coral", "sun", "sky", "pink", "mint"];

const NUMBERS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const words = (n: number) => (n < 20 ? NUMBERS[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? `-${NUMBERS[n % 10]}` : "") : String(n));

function nameOf(c: EventContent): string {
  const own = customValue(c, "names");
  if (own) return own;
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]}` : first[0] ?? "";
}

function turningOf(c: EventContent, many: boolean): string {
  const own = customValue(c, "ageLine");
  if (own) return own;
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  if (!Number.isFinite(n) || n <= 0 || n >= 120) return "";
  return `${many ? "are" : "is"} turning ${words(n)}`;
}

export default function PoolsideTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("poolside", ["DM+Serif+Display:ital@0;1", "Jost:wght@400;500;600"]);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const [rows, setRows] = useState(2);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const moving = !reduced && !editorPreview && !gallery;
  const [ripple] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  usePoolWater(waterRef, rootRef, { animate: moving, ripple, waves: WAVES });

  // The deck repeats down the page (one row of things per ROW px), and the pool ends where the
  // far deck (the towel) begins, however tall the reply grows.
  const endRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    const end = endRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setRows(Math.max(1, Math.ceil(el.offsetHeight / ROW)));
      if (end) el.style.setProperty("--ps-end", `${end.offsetHeight}px`);
    });
    ro.observe(el);
    if (end) ro.observe(end);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const vis = settings.sectionVisibility;
  const name = nameOf(content);
  const turning = turningOf(content, content.hosts.filter((h) => h.name.trim()).length > 1);
  const when = longDate(content.eventDate);
  const at = content.eventDate.includes("T") ? timeOf(content.eventDate) : "";
  const town = (content.primaryLocation.addressLine ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "";
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => s.label.trim());
  const dress = customValue(content, "dressCode");
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash || !!customValue(content, "giftNote");
  const over = !editorPreview && eventIsOver(content.eventDate);
  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: moving ? "smooth" : "auto", block: "start" });

  const prop = (kind: PropKind, key: string, cls: string, style: CSSProperties, c?: string, float?: boolean) => (
    <i key={key} className={`ps-p ${cls}`} style={style} data-float={float ? "" : undefined} aria-hidden dangerouslySetInnerHTML={{ __html: propSvg(kind, `${uid}${key}`, c) }} />
  );
  // the sections after the first, each with one float beside it, in turn
  const FLOATS: [PropKind, string, string?][] = [
    ["mattress", "ps-fm", "pink"],
    ["ring", "ps-fr", "sun"],
    ["ball", "ps-fb"],
  ];
  let nf = 0;
  const float = () => {
    const [k, cls, c] = FLOATS[nf % FLOATS.length];
    nf++;
    return gallery ? null : prop(k, `f${nf}`, `ps-p--in ${cls}`, {}, c, true);
  };

  const deck = Array.from({ length: rows }, (_, row) =>
    DECK.map((d, i) => {
      const centre = d.side === "l" ? `calc(50% - var(--pool) / 2 - ${d.off}px)` : `calc(50% + var(--pool) / 2 + ${d.off}px)`;
      const c = d.k === "lounger" ? LOUNGER_COLOURS[(row * 3 + i) % LOUNGER_COLOURS.length] : d.c;
      return prop(d.k, `d${row}-${i}`, "ps-wide", { width: d.w, left: `calc(${centre} - ${d.w / 2}px)`, top: row * ROW + d.top, rotate: d.rot ? `${d.rot}deg` : undefined }, c);
    }),
  );
  const fronds = Array.from({ length: rows }, (_, row) =>
    row === 0
      ? [
          prop("frond", "fr0", "ps-p--leaf", { width: "min(560px, 70cqw)", left: -120, top: -60, ["--r" as string]: "28deg" }),
          prop("frond", "fr1", "ps-p--leaf", { width: "min(520px, 64cqw)", right: -150, top: 520, ["--r" as string]: "160deg", transformOrigin: "100% 50%" }),
        ]
      : [prop("frond", `fr${row + 1}`, "ps-p--leaf ps-wide", row % 2 ? { width: 500, left: -160, top: row * ROW + 300, ["--r" as string]: "-10deg" } : { width: 500, right: -170, top: row * ROW + 300, ["--r" as string]: "170deg", transformOrigin: "100% 50%" })],
  );

  const vars = { ["--ps-display" as string]: theme.displayFont, ["--ps-sans" as string]: theme.bodyFont } as CSSProperties;
  const cls = ["ps-root", moving ? "ps-motion" : "", gallery ? "ps-gallery" : ""].filter(Boolean).join(" ");

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{POOLSIDE_CSS}</style>
      <canvas ref={waterRef} className="ps-water-gl" aria-hidden />
      <div className="ps-deck" aria-hidden />
      <div className="ps-rim" aria-hidden />
      <div className="ps-cope" aria-hidden />
      {deck}
      {fronds}
      {prop("ladder", "ladder", "", { width: 62, left: "calc(50% - var(--pool) / 2 + 40px)", top: "calc(var(--top) - 22px)", zIndex: 5 })}

      <main className="ps-water">
        <section data-ripple>
          <p className="ps-k">{customValue(content, "heroLine") || "You’re invited to a pool party"}</p>
          <h1 className={`ps-name${name ? "" : " ps-hint"}`}>{name || (editorPreview ? "Your name" : "")}</h1>
          {turning ? <p className="ps-turns">{turning}</p> : editorPreview ? <p className="ps-turns ps-hint">Add the age in the Poolside details</p> : null}
          <p className="ps-when">
            {when ? <span>{when}</span> : editorPreview ? "Your date" : null}
            {at ? (
              <>
                {" · "}
                <span>{at}</span>
              </>
            ) : null}
            {town ? (
              <>
                {" · "}
                <span>{venue && venue !== town ? `${venue}, ${town}` : town}</span>
              </>
            ) : null}
          </p>
          {vis.rsvp !== false && !over && !gallery ? (
            <button type="button" className="ps-btn" onClick={toRsvp}>
              {customValue(content, "replyButton") || "Kindly reply"}
              <i />
            </button>
          ) : null}
          {gallery ? null : prop("ring", "hero-ring", "ps-p--in ps-f1", {}, "orange", true)}
          {gallery ? null : prop("ball", "hero-ball", "ps-p--in ps-f2", {}, undefined, true)}
        </section>

        {vis.schedule !== false && (schedule.length || venue || editorPreview) ? (
          <section className="ps-sec">
            {float()}
            <p className="ps-k">{customValue(content, "dayLabel") || "The day"}</p>
            <h2 className={`ps-h2${venue || customValue(content, "dayTitle") ? "" : " ps-hint"}`}>{customValue(content, "dayTitle") || venue || "Where the party is"}</h2>
            {address ? <p className="ps-addr">{address}</p> : null}
            {venue ? (
              <div style={{ marginTop: 10 }}>
                <VenueLinks content={content} font="var(--ps-sans)" color="var(--ink)" size={15} />
              </div>
            ) : null}
            {schedule.length ? (
              <div className="ps-legs">
                {schedule.map((s) => (
                  <div key={s.id}>
                    <b>{timeOf(s.startTime)}</b>
                    <span>
                      {s.label}
                      {s.description ? <em>{s.description}</em> : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : editorPreview ? (
              <p className="ps-addr ps-hint">Add the day under Schedule.</p>
            ) : null}
          </section>
        ) : null}

        {vis.dress !== false && (dress || editorPreview) ? (
          <section className="ps-sec">
            {float()}
            <p className="ps-k">What to wear</p>
            {dress ? <p className="ps-note">{dress}</p> : <p className="ps-note ps-hint">Add a dress code in the Poolside details.</p>}
          </section>
        ) : null}

        {vis.registry !== false && gifts ? (
          <section className="ps-sec">
            {float()}
            <p className="ps-k">Gifts</p>
            <p className="ps-note">{customValue(content, "giftNote") || content.cashGiftNote?.trim() || "Your company is the only gift needed."}</p>
            {content.registryLinks.length ? (
              <div className="ps-links">
                {content.registryLinks.map((r) => (
                  <a key={r.id} className="ps-btn ps-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                    {r.storeName}
                  </a>
                ))}
              </div>
            ) : null}
            {cash ? (
              giftsOpen ? (
                <div className="ps-gifts">
                  <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "var(--ink)", muted: "var(--ink)", surface: "#fff", line: "rgba(14,53,85,0.18)", bodyFont: "var(--ps-sans)", displayFont: "var(--ps-display)", radius: 12 }} />
                </div>
              ) : (
                <div className="ps-links">
                  <button type="button" className="ps-btn ps-btn--line" onClick={() => setGiftsOpen(true)}>
                    {customValue(content, "giftButton") || "View gift details"}
                  </button>
                </div>
              )
            ) : null}
          </section>
        ) : null}

        {vis.faqs !== false && faqs.length ? (
          <section className="ps-sec">
            {float()}
            <p className="ps-k">Good to know</p>
            {faqs.map((f) => (
              <div key={f.id} className="ps-faq">
                <b>{f.question}</b>
                <span>{f.answer}</span>
              </div>
            ))}
          </section>
        ) : null}
      </main>

      <section ref={endRef} className="ps-end">
        {over ? (
          <div className="ps-towel">
            <h2>Thank you for coming</h2>
            <p className="ps-small">{customValue(content, "afterParty") || "What a day by the water."}</p>
          </div>
        ) : vis.rsvp !== false ? (
          <div id="rsvp" style={{ width: "100%", display: "grid", placeItems: "center" }}>
            <RsvpCard
              content={content}
              editorPreview={editorPreview}
              sample={!live && !editorPreview}
              credit={
                credit.show ? (
                  <p className="ps-maker">
                    <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 600 }} />
                  </p>
                ) : null
              }
            />
          </div>
        ) : credit.show ? (
          <p className="ps-maker">
            <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 600 }} />
          </p>
        ) : null}
      </section>
    </div>
  );
}
