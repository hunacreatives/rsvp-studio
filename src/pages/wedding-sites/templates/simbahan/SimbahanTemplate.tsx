import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { coupleNames, dateWords, eventIsOver, nameParts, paragraphs, receptionMap, ROMAN, splitEntourage, timeOf, timeWords, type EntRow } from "./content";
import RsvpCard from "./RsvpCard";
import { useAisle, type StopKey } from "./aisle";
import { SIMBAHAN_CSS } from "./styles";

/**
 * Simbahan (wedding): an old Filipino stone church at the end of the afternoon, drawn live in
 * WebGL (church.ts). The page opens outside, before the great wooden doors; they swing open
 * into the light, the couple's names appear, and the guest steps inside. Scrolling walks them
 * down the aisle, one stop at a time, past the pews, the flowers and the candles, under the
 * shafts of sun from the clerestory, to the reply at the altar before the gilded retablo.
 *  - Each stop's card is a page of a church programme: heavy cotton stock with gilt edges, set
 *    in black and rubric red the way a missal is, a silk ribbon marker laid across it. Every
 *    card pauses in the same place while it's read; the camera walks on between them (aisle.ts).
 *  - Builder, gallery card, reduced motion: the doors open, the church still, every card in place.
 */

type CardKey = Exclude<StopKey, "door">;
const RUBRIC: Record<CardKey, { key: string; fallback: string; sec?: string }> = {
  story: { key: "rubricStory", fallback: "A reading from the couple", sec: "hostIntro" },
  day: { key: "rubricDay", fallback: "The order of the day" },
  sponsors: { key: "rubricSponsors", fallback: "With the blessing of", sec: "sponsors" },
  entourage: { key: "rubricEntourage", fallback: "Those who walk with us", sec: "entourage" },
  wear: { key: "rubricWear", fallback: "For the day", sec: "dress" },
  details: { key: "rubricDetails", fallback: "Before you come" },
  rsvp: { key: "rubricRsvp", fallback: "At the altar", sec: "rsvp" },
};

function Ornament() {
  return (
    <svg className="sb-orn" viewBox="0 0 132 14" aria-hidden>
      <path d="M2 7H50M82 7h48" stroke="currentColor" strokeWidth="0.8" />
      <path d="M66 1.5 71 7l-5 5.5L61 7z" fill="currentColor" />
      <circle cx="55" cy="7" r="1.6" fill="currentColor" />
      <circle cx="77" cy="7" r="1.6" fill="currentColor" />
    </svg>
  );
}

export default function SimbahanTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const moving = !reduced && !editorPreview && !gallery;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const [intro] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [giftsOpen, setGiftsOpen] = useState(false);
  const ed = siteEdit(editorPreview);
  const E = editorPreview;

  const vis = settings.sectionVisibility;
  const couple = customValue(content, "names") || coupleNames(content);
  const parts = nameParts(couple);
  const when = dateWords(content.eventDate);
  const hour = timeWords(content.eventDate);
  const story = paragraphs(content.story);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const recName = customValue(content, "receptionName");
  const recAddress = customValue(content, "receptionAddress");
  const recTime = customValue(content, "receptionTime");
  const recMap = receptionMap(content);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => E || s.label.trim());
  const { parents, rows } = splitEntourage(content, E);
  const principal = rows.filter((r) => r.kind === "principal");
  const party = rows.filter((r) => r.kind !== "principal");
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const stay = content.accommodations.filter((a) => E || a.name.trim());
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => E || f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash;
  const over = !E && eventIsOver(content.eventDate);

  // the stops after the doors, each one only when there's something in it (all of them in the builder)
  const show: Record<CardKey, boolean> = {
    story: vis.hostIntro !== false && (story.length > 0 || E),
    day: (vis.schedule !== false && (schedule.length > 0 || E)) || (vis.venue !== false && (!!venue || !!recName || E)),
    sponsors: vis.sponsors !== false && (parents.length > 0 || principal.length > 0 || E),
    entourage: vis.entourage !== false && (party.length > 0 || E),
    wear: vis.dress !== false && (!!dress || swatches.length > 0 || E),
    details: (vis.accommodations !== false && (stay.length > 0 || E)) || (vis.registry !== false && (gifts || E)) || (vis.faqs !== false && (faqs.length > 0 || E)),
    rsvp: over || vis.rsvp !== false,
  };
  const order: StopKey[] = ["door", "story", "day", "sponsors", "entourage", "wear", "details", "rsvp"];
  const stops = order.filter((k) => k === "door" || (!gallery && show[k as CardKey]));
  useAisle({ root: rootRef, stage: stageRef, gl: glRef }, { stops: stops.join(","), animate: moving, intro, wide: gallery, snap: (live || demo) && moving });
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const longest = Math.max(5, ...parts.map((p) => p.length));
  const vars = {
    ["--sb-ink" as string]: theme.ink,
    ["--sb-display" as string]: theme.displayFont,
    ["--sb-text" as string]: theme.bodyFont,
    ["--sb-name" as string]: `clamp(46px, min(${Math.min(7.6, 46 / longest).toFixed(2)}cqw, calc(var(--frame) * 0.11)), 116px)`,
    ["--sb-name-m" as string]: `clamp(38px, ${Math.min(15, 78 / longest).toFixed(2)}cqw, 72px)`,
  } as CSSProperties;
  // the opening's class is on from the first paint, so the names never show before the doors open
  const cls = ["sb-root", moving ? "sb-motion" : "", intro ? "sb-intro" : "sb-named", gallery ? "sb-gallery" : "", E ? "sb-editor" : ""].filter(Boolean).join(" ");

  const card = (k: CardKey, children: ReactNode, sec?: string) => (
    <section key={k} className={`sb-stop sb-stop--${k}`} data-sb-stop data-sb-key={k} id={k === "rsvp" ? "rsvp" : undefined}>
      <div className="sb-dock">
        <article className="sb-card" data-sb-dock {...(sec ? ed.section(sec) : {})}>
          <div className="sb-paper">
            <span className="sb-ribbon" aria-hidden />
            <p className="sb-rubric">
              <span className="sb-num" aria-hidden>
                {ROMAN[stops.indexOf(k)] ?? ""}
              </span>
              <Field path={`custom.${RUBRIC[k].key}`} value={customValue(content, RUBRIC[k].key)} fallback={RUBRIC[k].fallback} placeholder="" editor={E} />
            </p>
            {children}
          </div>
        </article>
        <div className="sb-hold" aria-hidden />
      </div>
    </section>
  );
  const title = (key: string, fallback: string) => (
    <>
      <Field as="h2" className="sb-h2" path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} placeholder="" editor={E} />
      <Ornament />
    </>
  );
  const sub = (key: string, fallback: string) => <Field as="h3" className="sb-h3" path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} placeholder="" editor={E} />;
  const group = (row: EntRow, cols?: boolean) =>
    row.cells.map((c) => (
      <div key={c.id} className="sb-group" {...ed.item(c.id)}>
        <Field as="p" className="sb-group__t" path="title" value={c.raw} placeholder="Group, e.g. Principal Sponsors" editor={E}>
          {c.title}
        </Field>
        <ul className={`sb-people${cols && c.people.length > 3 ? " sb-people--cols" : ""}`}>
          {c.people.map((p, j) => (
            <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={E} />
          ))}
        </ul>
        <AddItem list={`entourage:${c.id}:people`} label="Add a name" editor={E} className="sb-add" />
      </div>
    ));

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{SIMBAHAN_CSS}</style>

      <div ref={stageRef} className="sb-stage" aria-hidden>
        <canvas ref={glRef} className="sb-gl" />
        <div className="sb-shade" />
      </div>

      <div className="sb-world">
        {/* the doors: the names over them, in the light from inside */}
        <section className="sb-door" data-sb-stop>
          <div className="sb-words">
            <Field as="p" className="sb-kick" path="custom.heroKicker" value={customValue(content, "heroKicker")} fallback="Together with our families" placeholder="" editor={E} />
            {E || parts.length !== 2 ? (
              <Field as="h1" className="sb-names" path="custom.names" value={customValue(content, "names")} fallback={coupleNames(content) || undefined} placeholder="Your names" editor={E} />
            ) : (
              <h1 className="sb-names">
                <span>{parts[0]}</span> <em>&amp;</em> <span>{parts[1]}</span>
              </h1>
            )}
            {when ? <p className="sb-date">{when}</p> : E ? <p className="sb-date">Your date</p> : null}
            {hour || venue ? (
              <p className="sb-at">
                {hour ? <span>{hour}</span> : null}
                {hour && venue ? <i aria-hidden> · </i> : null}
                {venue ? <span>{venue}</span> : null}
              </p>
            ) : null}
          </div>
          {gallery ? null : (
            <p className="sb-walkon">
              <Field path="custom.walkOn" value={customValue(content, "walkOn")} fallback="Step inside" placeholder="" editor={E} />
              <i aria-hidden />
            </p>
          )}
        </section>

        {gallery ? null : (
          <>
            {show.story ? (
              card(
                "story",
                <>
                  {title("storyTitle", "Our story")}
                  {story.length ? (
                    <div className="sb-story">
                      {story.map((p, i) => (
                        <Field key={i} as="p" className={`sb-p${i === 0 ? " sb-drop" : ""}`} path={`story#${i}`} value={p} placeholder="" editor={E} multiline />
                      ))}
                    </div>
                  ) : (
                    <p className="sb-hint">Tell your story in a few short paragraphs, under Our story.</p>
                  )}
                </>,
                "hostIntro",
              )
            ) : vis.hostIntro === false ? (
              <HiddenSection k="hostIntro" label="Our story" editor={E} />
            ) : null}

            {show.day
              ? card(
                  "day",
                  <>
                    {title("dayTitle", "The day")}
                    {vis.venue !== false ? (
                      <div className="sb-venues" {...ed.section("venue")}>
                        <div className="sb-venue">
                          {sub("ceremonyLabel", "The ceremony")}
                          {hour ? <p className="sb-time">{hour}</p> : null}
                          {E ? (
                            <>
                              <Field as="p" className="sb-venue__name" path="primaryLocation.name" value={venue} placeholder="The church" editor={E} />
                              <Field as="p" className="sb-small" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
                            </>
                          ) : (
                            <>
                              {venue ? <p className="sb-venue__name">{venue}</p> : null}
                              {address ? <p className="sb-small">{address}</p> : null}
                            </>
                          )}
                          {venue || address ? <VenueLinks content={content} font="var(--sb-text)" color="var(--sb-red)" align="left" size={15} /> : null}
                        </div>
                        {recName || E ? (
                          <div className="sb-venue">
                            {sub("receptionLabel", "The reception")}
                            <Field as="p" className="sb-time" path="custom.receptionTime" value={recTime} placeholder="Half past five in the evening" editor={E} />
                            <Field as="p" className="sb-venue__name" path="custom.receptionName" value={recName} placeholder="The reception venue" editor={E} />
                            <Field as="p" className="sb-small" path="custom.receptionAddress" value={recAddress} placeholder="Address" editor={E} />
                            {recMap && !E ? (
                              <a className="sb-link sb-link--red" href={recMap} target="_blank" rel="noopener noreferrer">
                                Open in Maps
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {vis.schedule !== false && (schedule.length || E) ? (
                      <div className="sb-part" {...ed.section("schedule")}>
                        {sub("programLabel", "The programme")}
                        <ol className="sb-program" {...ed.list("schedule")}>
                          {schedule.map((s) => (
                            <li key={s.id} {...ed.item(s.id)}>
                              <span className="sb-program__time">{timeOf(s.startTime) || (E ? "Time" : "")}</span>
                              <span className="sb-program__what">
                                <Field path="label" value={s.label} placeholder="What’s happening" editor={E} />
                                {s.description || E ? <Field as="em" path="description" value={s.description} placeholder="A note (optional)" editor={E} multiline /> : null}
                              </span>
                            </li>
                          ))}
                        </ol>
                        <AddItem list="schedule" label={schedule.length ? "Add to the programme" : "Add the day’s programme"} editor={E} />
                      </div>
                    ) : null}
                  </>,
                )
              : null}
            {vis.schedule === false ? <HiddenSection k="schedule" label="Programme" editor={E} /> : null}
            {vis.venue === false ? <HiddenSection k="venue" label="Venues" editor={E} /> : null}

            {show.sponsors ? (
              card(
                "sponsors",
                <>
                  {title("sponsorsTitle", "Our sponsors")}
                  {parents.length ? (
                    <div className="sb-parents" {...ed.list("entourage")}>
                      {parents.map((g) => (
                        <div key={g.id} className="sb-group" {...ed.item(g.id)}>
                          <Field as="p" className="sb-group__t" path="title" value={g.title} placeholder="Parents of the Bride" editor={E} />
                          <ul className="sb-people">
                            {g.people.map((p, j) => (
                              <Field key={j} as="li" path={`people.${j}`} value={p} placeholder="Name" editor={E} />
                            ))}
                          </ul>
                          <AddItem list={`entourage:${g.id}:people`} label="Add a name" editor={E} className="sb-add" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {principal.length ? (
                    <div className="sb-part sb-principal" {...ed.list("entourage")}>
                      {principal.map((r) => group(r, true))}
                    </div>
                  ) : null}
                  <AddItem list="entourage" label={parents.length || principal.length ? "Add a group" : "Add your parents and principal sponsors"} editor={E} className="sb-add" />
                </>,
                "sponsors",
              )
            ) : vis.sponsors === false ? (
              <HiddenSection k="sponsors" label="Parents and sponsors" editor={E} />
            ) : null}

            {show.entourage ? (
              card(
                "entourage",
                <>
                  {title("entourageTitle", "The entourage")}
                  {party.length ? (
                    <div className="sb-party" {...ed.list("entourage")}>
                      {party.map((r, i) => (
                        <div key={i} className={`sb-row sb-row--${r.kind}`} style={{ ["--n" as string]: r.cells.length }}>
                          {group(r)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="sb-hint">Add your secondary sponsors (candle, veil, cord) and the bridal party under Entourage &amp; motif.</p>
                  )}
                  <AddItem list="entourage" label="Add a group" editor={E} className="sb-add" />
                </>,
                "entourage",
              )
            ) : vis.entourage === false ? (
              <HiddenSection k="entourage" label="Entourage" editor={E} />
            ) : null}

            {show.wear ? (
              card(
                "wear",
                <>
                  {title("dressTitle", "What to wear")}
                  <Field as="p" className="sb-p sb-p--wear" path="custom.dressCode" value={dress} placeholder="Barong Tagalog or a dark suit; Filipiniana or a long gown." editor={E} multiline />
                  {swatches.length ? (
                    <div className="sb-swatches" aria-label="The colours of the day">
                      {swatches.map((c) => (
                        <i key={c} style={{ background: c }} />
                      ))}
                    </div>
                  ) : null}
                </>,
                "dress",
              )
            ) : vis.dress === false ? (
              <HiddenSection k="dress" label="What to wear" editor={E} />
            ) : null}

            {show.details
              ? card(
                  "details",
                  <>
                    {title("detailsTitle", "Good to know")}
                    {vis.accommodations !== false && (stay.length || E) ? (
                      <div className="sb-part" {...ed.section("accommodations")}>
                        {sub("stayTitle", "Where to stay")}
                        <div {...ed.list("accommodations")}>
                          {stay.map((a) => (
                            <div key={a.id} className="sb-row1" {...ed.item(a.id)}>
                              <Field as="b" path="name" value={a.name} placeholder="Hotel" editor={E} />
                              {a.addressLine || a.notes ? <span>{[a.addressLine, a.notes].filter(Boolean).join(". ")}</span> : null}
                              {a.bookingUrl ? (
                                <a className="sb-link sb-link--red" href={a.bookingUrl} target="_blank" rel="noopener noreferrer">
                                  Book a room
                                </a>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        <AddItem list="accommodations" label="Add a place to stay" editor={E} className="sb-add" />
                      </div>
                    ) : null}
                    {vis.registry !== false && (gifts || E) ? (
                      <div className="sb-part" {...ed.section("registry")}>
                        {sub("giftsTitle", "Gifts")}
                        <Field as="p" className="sb-small" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your presence is the greatest gift."} placeholder="" editor={E} multiline />
                        {content.registryLinks.length ? (
                          <div className="sb-links">
                            {content.registryLinks.map((r) => (
                              <a key={r.id} className="sb-btn sb-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                                {r.storeName}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {cash || E ? (
                          giftsOpen || E ? (
                            <div className="sb-gifts">
                              <CashGifts content={content} editor={E} note={false} look={{ ink: "var(--sb-ink)", muted: "var(--sb-soft)", surface: "#fbf7ee", line: "rgba(70, 44, 24, 0.2)", bodyFont: "var(--sb-text)", displayFont: "var(--sb-text)", radius: 2, align: "left" }} />
                            </div>
                          ) : (
                            <div className="sb-links">
                              <button type="button" className="sb-btn sb-btn--line" onClick={() => setGiftsOpen(true)}>
                                {customValue(content, "giftButton") || "View gift details"}
                              </button>
                            </div>
                          )
                        ) : null}
                      </div>
                    ) : null}
                    {vis.faqs !== false && (faqs.length || E) ? (
                      <div className="sb-part" {...ed.section("faqs")}>
                        {sub("faqTitle", "Questions")}
                        <div className="sb-faqs" {...ed.list("faqs")}>
                          {faqs.map((f) => (
                            <details key={f.id} {...ed.item(f.id)} open={E || undefined}>
                              <summary>
                                <Field path="question" value={f.question} placeholder="A question" editor={E} />
                              </summary>
                              <Field as="p" className="sb-small" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
                            </details>
                          ))}
                        </div>
                        <AddItem list="faqs" label="Add a question" editor={E} className="sb-add" />
                      </div>
                    ) : null}
                  </>,
                )
              : null}
            {vis.accommodations === false ? <HiddenSection k="accommodations" label="Where to stay" editor={E} /> : null}
            {vis.registry === false ? <HiddenSection k="registry" label="Gifts" editor={E} /> : null}
            {vis.faqs === false ? <HiddenSection k="faqs" label="Questions" editor={E} /> : null}

            {show.rsvp ? (
              card(
                "rsvp",
                <>
                  {over ? (
                    <>
                      <h2 className="sb-h2">Thank you</h2>
                      <Ornament />
                      <p className="sb-p">{customValue(content, "afterParty") || `Thank you for celebrating with ${couple || "us"}.`}</p>
                    </>
                  ) : (
                    <>
                      {title("rsvpTitle", "Will you join us?")}
                      <RsvpCard content={content} editorPreview={E} />
                    </>
                  )}
                  {credit.show ? (
                    <p className="sb-maker">
                      <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
                    </p>
                  ) : null}
                </>,
                over ? undefined : "rsvp",
              )
            ) : (
              <>
                <HiddenSection k="rsvp" label="RSVP" editor={E} />
                {credit.show ? (
                  <p className="sb-maker sb-maker--end">
                    <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
                  </p>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
