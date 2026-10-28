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
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { eventIsOver, longDate, timeOf } from "../under-glass/content";
import { Bow, Stern } from "./art";
import RsvpCard from "./RsvpCard";
import { useOcean } from "./sea";
import { RIVIERA_CSS } from "./styles";

/**
 * Riviera (yacht parties: birthdays, engagements, anniversaries at sea): the whole page is one
 * yacht seen from above, under way on a sea drawn on the GPU.
 *  - The opening (published page and design preview): she sails up into the frame and eases
 *    off; her bow wave and wake follow her. Builder, gallery card, reduced motion: at rest.
 *  - Every section is a part of the boat, bow to stern: the names on the sun pad (a sun hat and
 *    sunglasses left on it), the times on the windscreen, the invitation on the hardtop, the
 *    evening and the pier in the teak cockpit, what to wear, gifts and good to know on white
 *    deck panels, the reply on the aft deck, the maker's mark on the stern. The hull between
 *    bow and stern grows to fit whatever the host fills in.
 */

const WAVES = "/event-templates/riviera/waves.jpg";

const SANS = "Jost:wght@400;500";

/** "Celine & Marco", or "Isla": the host's own, else the hosts' first names. */
function hostNames(c: EventContent): string {
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]}` : first[0] ?? "";
}

const namesOf = (c: EventContent) => customValue(c, "names") || hostNames(c);

function kickerDefault(c: EventContent): string {
  switch (c.occasion) {
    case "engagement":
      return "An engagement cruise";
    case "birthday":
      return "A birthday at sea";
    case "anniversary":
      return "An anniversary at sea";
    case "wedding":
      return "A wedding at sea";
    default:
      return "An evening at sea";
  }
}

/** The flag's letters: the host's own, else the initials of the names ("C · M"). */
function flagOf(c: EventContent, names: string): string {
  const own = customValue(c, "flagInitials");
  if (own) return own.toUpperCase();
  const parts = names.split(/\s*&\s*|,\s*/).map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").filter(Boolean).slice(0, 3).join(" · ");
}

export default function RivieraTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  loadFontFamilies("riviera-sans", [SANS]);
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const seaRef = useRef<HTMLCanvasElement>(null);
  const yachtRef = useRef<HTMLDivElement>(null);
  const [giftsOpen, setGiftsOpen] = useState(false);
  // The sail-in: only where an opening may play, and not when the link goes straight to the reply.
  const [play] = useState(() => (live || demo) && !reduced && !editorPreview && !gallery && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const moving = !reduced && !editorPreview && !gallery;
  useOcean(seaRef, yachtRef, rootRef, { animate: moving, waves: WAVES });

  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const vis = settings.sectionVisibility;
  const ed = siteEdit(editorPreview);
  const E = editorPreview;
  const names = namesOf(content);
  const amp = names.split(/\s+&\s+/);
  const when = longDate(content.eventDate);
  const town = (content.primaryLocation.addressLine ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop() ?? "";
  const boarding = customValue(content, "boardingTime");
  const eventTime = content.eventDate.includes("T") ? timeOf(content.eventDate) : "";
  const departs = customValue(content, "departTime") || eventTime;
  const back = customValue(content, "returnTime");
  const times = [
    { k: "Boarding", v: boarding, path: "custom.boardingTime", ph: "4:30 PM", fallback: "" },
    { k: "Departs", v: departs, path: "custom.departTime", ph: "5:00 PM", fallback: eventTime },
    { k: "Return", v: back, path: "custom.returnTime", ph: "9:30 PM", fallback: "" },
  ].filter((t) => t.v || E);
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const showNote = vis.hostIntro !== false && (paragraphs.length > 0 || editorPreview);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => editorPreview || s.label.trim());
  const dress = customValue(content, "dressCode");
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => editorPreview || f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash || !!customValue(content, "giftNote");
  const over = !editorPreview && eventIsOver(content.eventDate);
  const flag = flagOf(content, names);

  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: moving ? "smooth" : "auto", block: "start" });

  const vars = { ["--rv-display" as string]: theme.displayFont, ["--rv-sans" as string]: `"Jost", ${theme.bodyFont}` } as CSSProperties;
  const cls = ["rv-root", play ? "rv-play" : "", moving ? "rv-motion" : "", gallery ? "rv-gallery" : ""].filter(Boolean).join(" ");

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{RIVIERA_CSS}</style>
      <canvas ref={seaRef} className="rv-sea" aria-hidden />
      <div className="rv-voyage">
        <div ref={yachtRef} className="rv-yacht">
          <Bow uid={uid} />
          <div className="rv-mid">
            {/* The sun pad: the names */}
            <header className="rv-zone rv-sunpad">
              <Field as="p" className="rv-label rv-gold" path="custom.heroLine" value={customValue(content, "heroLine")} fallback={kickerDefault(content)} placeholder="" editor={E} />
              <h1 className="rv-names">
                {E ? (
                  <Field path="custom.names" value={customValue(content, "names")} fallback={hostNames(content) || undefined} placeholder="Your names" editor={E} />
                ) : amp.length === 2 ? (
                  <>
                    {amp[0]} <em>&amp;</em> {amp[1]}
                  </>
                ) : (
                  names
                )}
              </h1>
              <p className="rv-date">{[when, town].filter(Boolean).join(" · ") || (editorPreview ? "Your date" : "")}</p>
              {vis.rsvp !== false && !over && !gallery ? (
                <button type="button" className="rv-reply" onClick={ed.on ? undefined : toRsvp}>
                  <Field path="custom.replyButton" value={customValue(content, "replyButton")} fallback="Kindly reply" placeholder="" editor={E} />
                  <i />
                </button>
              ) : null}
              <img className="rv-prop rv-prop--hat" src="/event-templates/riviera/hat.webp" alt="" />
              <img className="rv-prop rv-prop--shades" src="/event-templates/riviera/shades.webp" alt="" />
            </header>

            {/* The deckhouse: the times on the windscreen, the invitation on the hardtop */}
            {times.length || showNote ? (
              <section className="rv-zone rv-house" {...ed.section("hostIntro")}>
                {times.length ? (
                  <div className={`rv-screen${showNote ? "" : " rv-screen--only"}`}>
                    <p className="rv-label" style={{ color: "#c6d0da" }}>
                      All aboard
                    </p>
                    <div className="rv-times">
                      {times.map((t) => (
                        <div key={t.k}>
                          <p className="rv-k">{t.k}</p>
                          <Field as="p" className="rv-v" path={t.path} value={t.path === "custom.departTime" ? customValue(content, "departTime") : t.v} fallback={t.fallback || undefined} placeholder={t.ph} editor={E} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {showNote ? (
                  <div className={`rv-roof${times.length ? "" : " rv-roof--only"}`}>
                    <Field as="p" className="rv-label rv-gold" path="custom.noteTitle" value={customValue(content, "noteTitle")} fallback="You’re invited" placeholder="" editor={E} />
                    {paragraphs.length ? (
                      paragraphs.map((p, i) => <Field key={i} as="p" className="rv-note" path={`story#${i}`} value={p} placeholder="" editor={E} multiline />)
                    ) : (
                      <Field as="p" className="rv-note" path="story#0" value="" placeholder="Your invitation note goes here." editor={E} multiline />
                    )}
                    <i className="rv-sunroof" />
                  </div>
                ) : null}
              </section>
            ) : vis.hostIntro === false ? (
              <HiddenSection k="hostIntro" label="Invitation note" editor={E} />
            ) : null}

            {/* The cockpit: the evening and where to board */}
            {vis.schedule !== false && (schedule.length || venue || editorPreview) ? (
              <section className="rv-zone rv-cockpit" {...ed.section("schedule")}>
                <img className="rv-prop rv-prop--glasses" src="/event-templates/riviera/glasses.webp" alt="" />
                <div className="rv-plate">
                  <Field as="p" className="rv-label rv-gold" path="custom.eveningLabel" value={customValue(content, "eveningLabel")} fallback="The evening" placeholder="" editor={E} />
                  <Field as="h2" className="rv-h2" path="custom.eveningTitle" value={customValue(content, "eveningTitle")} fallback={venue || undefined} placeholder="Where you’ll board" editor={E} />
                  {customValue(content, "eveningTitle") || E ? <Field as="p" className="rv-addr" path="primaryLocation.name" value={venue} placeholder="The pier or marina" editor={E} /> : null}
                  <Field as="p" className="rv-addr" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
                  {venue ? (
                    <div style={{ marginTop: 10 }}>
                      <VenueLinks content={content} font="var(--rv-sans)" color="var(--ink)" size={14} />
                    </div>
                  ) : null}
                  {schedule.length ? (
                    <div className="rv-legs" {...ed.list("schedule")}>
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
                  <AddItem list="schedule" label={schedule.length ? "Add to the evening" : "Add the evening"} editor={E} />
                </div>
              </section>
            ) : vis.schedule === false ? (
              <HiddenSection k="schedule" label="The evening" editor={E} />
            ) : null}

            {/* What to wear */}
            {vis.dress !== false && (dress || editorPreview) ? (
              <section className="rv-zone rv-roof rv-roof--only" {...ed.section("dress")}>
                <Field as="p" className="rv-label rv-gold" path="custom.dressTitle" value={customValue(content, "dressTitle")} fallback="What to wear" placeholder="" editor={E} />
                <Field as="p" className="rv-note" path="custom.dressCode" value={dress} placeholder="Your dress code, e.g. white and navy, soft soles on deck." editor={E} multiline />
              </section>
            ) : vis.dress === false ? (
              <HiddenSection k="dress" label="What to wear" editor={E} />
            ) : null}

            {/* Gifts */}
            {vis.registry !== false && (gifts || E) ? (
              <section className="rv-zone rv-roof rv-roof--only" {...ed.section("registry")}>
                <Field as="p" className="rv-label rv-gold" path="custom.giftTitle" value={customValue(content, "giftTitle")} fallback="Gifts" placeholder="" editor={E} />
                <Field as="p" className="rv-note" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your company is the only gift we need."} placeholder="" editor={E} multiline />
                {content.registryLinks.length ? (
                  <div className="rv-links">
                    {content.registryLinks.map((r) => (
                      <a key={r.id} className="rv-btn" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                        {r.storeName}
                      </a>
                    ))}
                  </div>
                ) : null}
                {cash ? (
                  giftsOpen ? (
                    <div style={{ marginTop: 16 }}>
                      <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "var(--ink)", muted: "var(--ink-2)", surface: "#fff", line: "#e3e8ec", bodyFont: "var(--rv-sans)", displayFont: "var(--rv-display)", radius: 4 }} />
                    </div>
                  ) : (
                    <div className="rv-links">
                      <button type="button" className="rv-btn" onClick={() => setGiftsOpen(true)}>
                        {customValue(content, "giftButton") || "View gift details"}
                      </button>
                    </div>
                  )
                ) : null}
              </section>
            ) : vis.registry === false ? (
              <HiddenSection k="registry" label="Gifts" editor={E} />
            ) : null}

            {/* Good to know */}
            {vis.faqs !== false && (faqs.length || E) ? (
              <section className="rv-zone rv-roof rv-roof--only" {...ed.section("faqs")}>
                <Field as="p" className="rv-label rv-gold" path="custom.faqTitle" value={customValue(content, "faqTitle")} fallback="Good to know" placeholder="" editor={E} />
                <div {...ed.list("faqs")}>
                  {faqs.map((f) => (
                    <div key={f.id} className="rv-faq" {...ed.item(f.id)}>
                      <Field as="b" path="question" value={f.question} placeholder="A question" editor={E} />
                      <Field as="span" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
                    </div>
                  ))}
                </div>
                <AddItem list="faqs" label={faqs.length ? "Add a question" : "Add a question guests ask"} editor={E} />
              </section>
            ) : vis.faqs === false ? (
              <HiddenSection k="faqs" label="Good to know" editor={E} />
            ) : null}

            {/* The aft deck: the reply */}
            {over ? (
              <section className="rv-zone rv-aft">
                <div className="rv-plate">
                  <h2 className="rv-h2">Thank you for sailing with us</h2>
                  <p className="rv-text">{customValue(content, "afterParty") || "What an evening on the water."}</p>
                </div>
              </section>
            ) : vis.rsvp !== false ? (
              <section id="rsvp" className="rv-zone rv-aft" {...ed.section("rsvp")}>
                <i className="rv-cleat" style={{ left: -8, top: 24 }} />
                <i className="rv-cleat" style={{ right: -8, top: 24 }} />
                <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} />
              </section>
            ) : (
              <HiddenSection k="rsvp" label="RSVP" editor={E} />
            )}

            {credit.show ? (
              <p className="rv-maker">
                <CreditLine linkStyle={{ color: "inherit", textDecoration: "none", fontWeight: 500 }} />
              </p>
            ) : null}
          </div>
          <Stern uid={uid} />
          {flag ? (
            <span className="rv-ensign" aria-hidden>
              <b />
              <i>{flag}</i>
            </span>
          ) : null}
        </div>
        <div className="rv-wake-room" aria-hidden />
      </div>
    </div>
  );
}
