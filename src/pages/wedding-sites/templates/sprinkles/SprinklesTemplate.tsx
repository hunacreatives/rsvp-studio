import { createElement, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
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
import { flavourOf } from "./flavours";
import RsvpCard from "./RsvpCard";
import { useShaker, type ShakerApi } from "./shaker";
import { SPRINKLES_CSS } from "./styles";

/**
 * Sprinkles (birthdays, any age): a cake's frosting is the page, and every big heading is made of
 * real sprinkles that pour in, tumble and settle into the letters when its section docks, then
 * fall away when the page moves on (shaker.ts). The name and the age first ("Mia turns 7"), then
 * the party, where, what to wear, gifts, good to know and the reply. Everything else is plain,
 * crisp type on the icing. Three cakes: strawberry with rainbow sprinkles, chocolate with pastels,
 * vanilla with gold and white.
 *  - The pour plays on the published page and the design preview, when motion is allowed.
 *    Builder, gallery card, reduced motion: every heading lies settled.
 */

type Key = "party" | "where" | "wear" | "gifts" | "faqs";
const SEC: Record<Key | "rsvp", string> = { party: "schedule", where: "venue", wear: "dress", gifts: "registry", faqs: "faqs", rsvp: "rsvp" };
const TITLE: Record<Key | "rsvp", string> = { party: "The party", where: "Where", wear: "What to wear", gifts: "Gifts", faqs: "Good to know", rsvp: "Reply" };

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
const sizeVars = (text: string, big: number, bigM: number, cap: number) => {
  const n = longestWord(text);
  return {
    ["--hs" as string]: `clamp(40px, ${Math.min(big, 84 / (0.6 * n)).toFixed(2)}cqw, ${cap}px)`,
    ["--hs-m" as string]: `clamp(34px, ${Math.min(bigM, 86 / (0.62 * n)).toFixed(2)}cqw, 140px)`,
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

export default function SprinklesTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  // (dev only: ?cake=chocolate to look at the other cakes in the preview harness)
  const devCake = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("cake") : null;
  const flavour = flavourOf(content, devCake ? `sprinkles-${devCake}` : settings.paletteId);
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<ShakerApi | null>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
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

  const keys = useMemo(() => {
    const list: Key[] = [];
    if (vis.schedule !== false && (schedule.length || when || E)) list.push("party");
    if (vis.venue !== false && (venue || address || E)) list.push("where");
    if (vis.dress !== false && (dress || E)) list.push("wear");
    if (vis.registry !== false && (gifts || E)) list.push("gifts");
    if (vis.faqs !== false && (faqs.length || E)) list.push("faqs");
    return list;
  }, [vis.schedule, vis.venue, vis.dress, vis.registry, vis.faqs, schedule.length, when, venue, address, dress, gifts, faqs.length, E]);
  const hidden = [
    vis.schedule === false && { k: "schedule", label: "The party" },
    vis.venue === false && { k: "venue", label: "Where" },
    vis.dress === false && { k: "dress", label: "What to wear" },
    vis.registry === false && { k: "registry", label: "Gifts" },
    vis.faqs === false && { k: "faqs", label: "Good to know" },
  ].filter(Boolean) as { k: string; label: string }[];
  const showReply = over || vis.rsvp !== false;
  const titleOf = (k: Key | "rsvp") => customValue(content, `${k}Title`) || TITLE[k];
  const headings = [name, ageLine, ...(gallery ? [] : keys.map(titleOf)), showReply ? (over ? "Thank you" : titleOf("rsvp")) : ""].join("|");
  const routeKey = `${gallery ? "g" : keys.join(",")}|${showReply ? 1 : 0}|${headings}|${flavour.id}`;

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

  const nameN = longestWord(name);
  const vars = {
    ["--sp-bg" as string]: flavour.frosting,
    ["--sp-ink" as string]: flavour.ink,
    ["--sp-muted" as string]: flavour.muted,
    ["--sp-line" as string]: flavour.line,
    ["--sp-field" as string]: flavour.field,
    ["--sp-btn" as string]: flavour.btn,
    ["--sp-btn-ink" as string]: flavour.btnInk,
    ["--sp-display" as string]: theme.displayFont,
    ["--sp-body" as string]: theme.bodyFont,
    ["--ns" as string]: `clamp(56px, ${Math.min(17, 86 / (0.6 * nameN)).toFixed(2)}cqw, 240px)`,
    ["--ns-m" as string]: `clamp(48px, ${Math.min(40, 88 / (0.62 * nameN)).toFixed(2)}cqw, 150px)`,
  } as CSSProperties;
  const cls = ["sp-root", moving ? "sp-motion" : "sp-still", boot ? "sp-boot" : "", opened ? "sp-opened" : "", E ? "sp-editor" : "", gallery ? "sp-gallery" : "", `sp-${flavour.id}`].filter(Boolean).join(" ");
  const maker = credit.show ? (
    <p className="sp-maker">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }} />
    </p>
  ) : null;

  const section = (k: Key | "rsvp", body: ReactNode, opts?: { id?: string; heading?: string; path?: string; wide?: boolean }) => (
    <section key={k} className={`sp-sec sp-sec--${k}`} id={opts?.id} data-sp-stop {...ed.section(SEC[k])}>
      <div className="sp-in">
        <Heading
          path={opts?.path ?? `custom.${k}Title`}
          value={opts?.heading !== undefined ? opts.heading : customValue(content, `${k}Title`)}
          fallback={TITLE[k]}
          editor={E}
          style={sizeVars(opts?.heading || titleOf(k), 10.5, 19, 150)}
        />
        <div className={`sp-body${opts?.wide ? " is-wide" : ""}`}>{body}</div>
      </div>
    </section>
  );

  const body = (k: Key) => {
    if (k === "party")
      return section(
        k,
        <>
          <div className="sp-when">
            {when ? <p className="sp-lead">{when}</p> : E ? <p className="sp-lead sp-faint">Set the date in Date & venue</p> : null}
            {at ? <p className="sp-sub">{at}</p> : null}
          </div>
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
        { wide: schedule.length > 0 || E },
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
      { wide: true },
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

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{SPRINKLES_CSS}</style>
      {moving ? (
        <div ref={stageRef} className="sp-stage" aria-hidden>
          <canvas ref={viewRef} className="sp-view" />
        </div>
      ) : null}

      <section className="sp-sec sp-open" data-sp-stop>
        <div className="sp-in">
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
          {gallery ? null : (
            <button type="button" className="sp-cue" onClick={E ? undefined : next} tabIndex={E ? -1 : undefined}>
              <Field path="custom.cueLabel" value={customValue(content, "cueLabel")} fallback="The details" placeholder="" editor={E} />
              <svg viewBox="0 0 12 12" aria-hidden>
                <path d="M6 1.5v8M2.5 6.5 6 10l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
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
