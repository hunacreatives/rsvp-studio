import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { useSavanna, type Cast, type Who } from "./savanna";
import RsvpCard from "./RsvpCard";
import { SAFARI_CSS } from "./styles";

/**
 * Safari (children's birthdays): a paper-cut storybook savanna, driven through in a jeep as the
 * guest scrolls. The child's name is cut from coloured paper, a giraffe leans down to read it;
 * then the jeep stops at each animal, which tells the guest its part in a speech bubble (the
 * day, what to wear, gifts, good to know), and the reply is a safari pass.
 *  - The opening (published page and design preview): the letters drop in one by one, then the
 *    giraffe leans down. Builder, gallery card, reduced motion: already leaning, no idle motion.
 */

const NUMBERS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const words = (n: number) => (n < 20 ? NUMBERS[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? `-${NUMBERS[n % 10]}` : "") : String(n));
// the paper the letters are cut from, and how each one sits
const INKS = ["#e0633f", "#f2a93b", "#3f8f85", "#6f9142", "#b65a8a", "#4f79b5"];
const TILT = [-6, 4, -3, 5, -4, 3];
const LIFT = [0, 6, -4, 5, -2, 4];
// who waits at each stop, in order
const AT_STOPS: Who[] = ["zebra", "elephants", "lion", "giraffe"];
const TINTS = ["#e4f0e3", "#f8e3df", "#fbeccb", "#e6e9f6"];

function hostNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]}` : first[0] ?? "";
}
const ageOf = (c: EventContent) => {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 120 ? n : 0;
};

/** The name in cut-paper letters: each its own colour and tilt, dropping in one after another;
 *  words never break, and a long name is set smaller so it fits. */
function Letters({ name }: { name: string }) {
  let k = 0;
  return (
    <>
      {name.split(/\s+/).filter(Boolean).map((w, wi) => (
        <Fragment key={wi}>
          {wi ? <span className="sf-gap" aria-hidden /> : null}
          <span style={{ whiteSpace: "nowrap" }} aria-hidden>
            {[...w].map((ch) => {
              const i = k++;
              return (
                <span key={i} className="sf-l" style={{ ["--c" as string]: INKS[i % INKS.length], ["--r" as string]: `${TILT[i % 6]}deg`, ["--y" as string]: `${LIFT[i % 6]}px`, transitionDelay: `${0.15 + i * 0.09}s` }}>
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

export default function SafariTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const moving = !reduced && !editorPreview && !gallery;
  const [intro, setIntro] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [lean, setLean] = useState(!intro);

  const age = ageOf(content);
  const vis = settings.sectionVisibility;
  const ed = siteEdit(editorPreview);
  const E = editorPreview;
  const name = customValue(content, "names") || hostNames(content);
  const turningDefault = age ? `${content.hosts.filter((h) => h.name.trim()).length > 1 && !customValue(content, "names") ? "are" : "is"} turning ${words(age)}` : "";
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

  // the stops on the drive
  const stops = useMemo(() => {
    const list: string[] = [];
    if (vis.schedule !== false && (schedule.length || venue || editorPreview)) list.push("day");
    if (vis.dress !== false && (dress || editorPreview)) list.push("wear");
    if (vis.registry !== false && (gifts || editorPreview)) list.push("gifts");
    if (vis.faqs !== false && (faqs.length || editorPreview)) list.push("faqs");
    return list;
  }, [vis.schedule, vis.dress, vis.registry, vis.faqs, schedule.length, venue, editorPreview, dress, gifts, faqs.length]);
  const hidden = [
    vis.schedule === false && { k: "schedule", label: "The day" },
    vis.dress === false && { k: "dress", label: "What to wear" },
    vis.registry === false && { k: "registry", label: "Gifts" },
    vis.faqs === false && { k: "faqs", label: "Good to know" },
  ].filter(Boolean) as { k: string; label: string }[];
  // the cast: the giraffe at the start, one animal at each stop, the giraffe again at the reply
  // when it isn't already at a stop
  const cast = useMemo<Cast>(() => {
    const c: Cast = [{ who: "giraffe", at: 0 }];
    stops.forEach((_, i) => c.push({ who: AT_STOPS[i % AT_STOPS.length], at: i + 1 }));
    if (stops.length < AT_STOPS.length) c.push({ who: "giraffe", at: -1 });
    return c;
  }, [stops]);
  useSavanna(stageRef, rootRef, { cast, flag: age ? String(age) : "★", animate: moving, onlyHero: gallery });

  // the opening: the letters drop in, then the giraffe leans down to read them
  const opening = useRef(intro);
  useEffect(() => {
    if (!opening.current) return;
    const a = window.setTimeout(() => setIntro(false), 300);
    const b = window.setTimeout(() => setLean(true), 1300);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, []);
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: moving ? "smooth" : "auto", block: "start" });
  // a long name is set smaller (by its longest word) so it fits
  const longest = Math.max(4, ...name.split(/\s+/).map((w) => w.length));
  const vars = {
    ["--sf-display" as string]: theme.displayFont,
    ["--sf-sans" as string]: theme.bodyFont,
    ["--name-size" as string]: `clamp(64px, ${Math.min(12, 50 / longest).toFixed(2)}cqw, 176px)`,
    ["--name-size-m" as string]: `clamp(52px, ${Math.min(26, 104 / longest).toFixed(2)}cqw, 120px)`,
  } as CSSProperties;
  const cls = ["sf-root", moving ? "sf-motion" : "", intro ? "sf-intro" : "", lean ? "sf-lean" : "", gallery ? "sf-gallery" : ""].filter(Boolean).join(" ");
  const maker = credit.show ? (
    <p className="sf-maker">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 700 }} />
    </p>
  ) : null;

  const stop = (key: string, i: number) => {
    const bubble = (sec: string, inner: React.ReactNode) => (
      <section key={key} className="sf-stop" data-sf-stop>
        <div className="sf-say" data-sf-say>
          <div className="sf-bubble sf-paper" style={{ ["--tint" as string]: TINTS[i % TINTS.length] }} {...ed.section(sec)}>
            <p className="sf-tab">Stop {i + 1}</p>
            {inner}
          </div>
        </div>
      </section>
    );
    if (key === "day")
      return bubble(
        "schedule",
        <>
          <Field as="h2" className="sf-h2" path="custom.dayTitle" value={customValue(content, "dayTitle")} fallback="The day" placeholder="" editor={E} />
          {E ? (
            <>
              <Field as="p" className="sf-addr" path="primaryLocation.name" value={venue} placeholder="Where the party is" editor={E} />
              <Field as="p" className="sf-addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
            </>
          ) : venue ? (
            <p className="sf-addr">{[venue, address].filter(Boolean).join(", ")}</p>
          ) : null}
          {venue ? (
            <div style={{ marginTop: 6 }}>
              <VenueLinks content={content} font="var(--sf-sans)" color="#b5482a" size={14} align="center" />
            </div>
          ) : null}
          {schedule.length ? (
            <div className="sf-legs" {...ed.list("schedule")}>
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
    if (key === "wear")
      return bubble(
        "dress",
        <>
          <Field as="h2" className="sf-h2" path="custom.wearTitle" value={customValue(content, "wearTitle")} fallback="What to wear" placeholder="" editor={E} />
          <Field as="p" className="sf-p" path="custom.dressCode" value={dress} placeholder="What to wear or bring, e.g. safari khaki and comfy shoes." editor={E} multiline />
        </>,
      );
    if (key === "gifts")
      return bubble(
        "registry",
        <>
          <Field as="h2" className="sf-h2" path="custom.giftTitle" value={customValue(content, "giftTitle")} fallback="Gifts" placeholder="" editor={E} />
          <Field as="p" className="sf-p" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your company is the only gift needed."} placeholder="" editor={E} multiline />
          {content.registryLinks.length ? (
            <div className="sf-links">
              {content.registryLinks.map((r) => (
                <a key={r.id} className="sf-btn" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                  {r.storeName}
                </a>
              ))}
            </div>
          ) : null}
          {cash ? (
            giftsOpen ? (
              <div className="sf-gifts">
                <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "#3b2614", muted: "#7a5a3e", surface: "#fffaf0", line: "rgba(59,38,20,0.18)", bodyFont: "var(--sf-sans)", displayFont: "var(--sf-display)", radius: 12, align: "left" }} />
              </div>
            ) : (
              <div className="sf-links">
                <button type="button" className="sf-btn" onClick={() => setGiftsOpen(true)}>
                  {customValue(content, "giftButton") || "View gift details"}
                </button>
              </div>
            )
          ) : null}
        </>,
      );
    return bubble(
      "faqs",
      <>
        <Field as="h2" className="sf-h2" path="custom.faqTitle" value={customValue(content, "faqTitle")} fallback="Good to know" placeholder="" editor={E} />
        <div {...ed.list("faqs")}>
          {faqs.map((f) => (
            <div key={f.id} className="sf-faq" {...ed.item(f.id)}>
              <Field as="b" path="question" value={f.question} placeholder="A question" editor={E} />
              <Field as="span" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
            </div>
          ))}
        </div>
        <AddItem list="faqs" label={faqs.length ? "Add a question" : "Add a question guests ask"} editor={E} />
      </>,
    );
  };

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{SAFARI_CSS}</style>
      <div ref={stageRef} className="sf-stage" aria-hidden />

      <div className="sf-world">
        <section className="sf-hero">
          <div className="sf-title">
            <Field as="p" className="sf-tag sf-paper" path="custom.heroLine" value={customValue(content, "heroLine")} fallback="You’re invited on a safari" placeholder="" editor={E} />
            <Field as="h1" className="sf-letters" path="custom.names" value={name} placeholder="Your child’s name" editor={E} aria-label={name || undefined}>
              <Letters name={name} />
            </Field>
            {turningDefault || customValue(content, "ageLine") || E ? (
              <div className="sf-ribbonwrap">
                <Field as="p" className="sf-ribbon" path="custom.ageLine" value={customValue(content, "ageLine")} fallback={turningDefault || undefined} placeholder="is turning five (or set the age in Safari details)" editor={E} />
              </div>
            ) : null}
            <p className="sf-when">
              {when ? <span>{when}</span> : editorPreview ? "Your date" : null}
              {at ? (
                <>
                  {" · "}
                  <span>{at}</span>
                </>
              ) : null}
              {venue || town ? (
                <>
                  <br />
                  <span>{venue && town && venue !== town ? `${venue}, ${town}` : venue || town}</span>
                </>
              ) : null}
            </p>
            {vis.rsvp !== false && !over && !gallery ? (
              <button type="button" className="sf-reply sf-paper" onClick={ed.on ? undefined : toRsvp}>
                <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Kindly reply" placeholder="" editor={E} />
              </button>
            ) : null}
          </div>
        </section>

        {gallery ? null : (
          <>
            {stops.map(stop)}
            {hidden.map((h) => (
              <HiddenSection key={h.k} k={h.k} label={h.label} editor={E} />
            ))}
            <section className="sf-last" id="rsvp" data-sf-stop>
              {over ? (
                <div className="sf-passwrap">
                  <div className="sf-pass sf-paper">
                    <div className="sf-head">
                      <b>Thank you</b>
                      <span>for coming on safari</span>
                    </div>
                    <div className="sf-body">
                      <p className="sf-small">{customValue(content, "afterParty") || "What an adventure it was."}</p>
                      {maker}
                    </div>
                  </div>
                </div>
              ) : vis.rsvp !== false ? (
                <div className="sf-passwrap" {...ed.section("rsvp")}>
                  <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} credit={maker} />
                </div>
              ) : (
                <>
                  <HiddenSection k="rsvp" label="RSVP" editor={E} />
                  {maker ? <div className="sf-passwrap" style={{ textAlign: "center" }}>{maker}</div> : null}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
