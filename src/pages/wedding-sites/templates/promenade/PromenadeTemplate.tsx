import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import type { EventContent } from "../../content/types";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { Countdown } from "../shared/Countdown";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { Carousel, DressFigures, dressColours } from "./art";
import { coupleNames, eventIsOver, heroDate, storyEntries, timeOf } from "./content";
import RsvpBlock from "./RsvpBlock";
import { useStroll, type StopKey } from "./stroll";
import { PROMENADE_CSS } from "./styles";

/**
 * Promenade (wedding): a formal estate garden seen from above at the end of a summer afternoon,
 * drawn live in WebGL (garden.ts). The guest strolls down its long gravel promenade as they
 * scroll, and each part of the day is a stop beside one feature of the garden: the parterre,
 * the topiary lawn, the fountain, the rose garden, the lime walk, and the white rotunda at the
 * end, where they reply.
 *  - The opening (published page and design preview): high over the whole garden, the camera
 *    comes down and round to the gate as the couple's names appear, set on the gravel of the
 *    forecourt. Their initials are clipped in box in the court just inside the gate.
 *  - Each stop's card is a cotton-paper card with a deckled edge, laid in the garden and lit by
 *    its sun (its shadow falls the way the hedges' do). Every card pauses in the same place while
 *    it's read; the camera glides on between them (stroll.ts).
 *  - Builder, gallery card, reduced motion: the garden still, every card in its place.
 */

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const PLACE: Record<Exclude<StopKey, "gate">, { key: string; fallback: string; sec?: string }> = {
  story: { key: "placeStory", fallback: "The parterre", sec: "hostIntro" },
  pictures: { key: "placePictures", fallback: "The topiary lawn", sec: "gallery" },
  day: { key: "placeDay", fallback: "The fountain" },
  dress: { key: "placeDress", fallback: "The rose garden", sec: "dress" },
  details: { key: "placeDetails", fallback: "The lime walk" },
  rsvp: { key: "placeRsvp", fallback: "The pavilion", sec: "rsvp" },
};

/** "A&D": the initials clipped in the monogram court. */
function initials(content: EventContent): string {
  const own = customValue(content, "monogram").trim();
  if (own) return own.slice(0, 5);
  const names = customValue(content, "names").trim() || coupleNames(content);
  const parts = names.split(/\s*(?:&|,|\band\b|\+)\s*/i).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("&");
}

export default function PromenadeTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const moving = !reduced && !editorPreview && !gallery;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const [intro] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const ed = siteEdit(editorPreview);
  const E = editorPreview;

  const vis = settings.sectionVisibility;
  const couple = customValue(content, "names") || coupleNames(content);
  const date = heroDate(content.eventDate);
  const photos = (content.galleries[0]?.items ?? []).filter((g) => g.image?.masterUrl);
  const story = storyEntries(content.story);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => E || s.label.trim());
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const stay = content.accommodations.filter((a) => E || a.name.trim());
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => E || f.question.trim());
  const gifts = content.registryLinks.length > 0 || hasCashGifts(content);
  const over = !E && eventIsOver(content.eventDate);

  // the stops after the gate, each one only when there's something in it (all of them in the builder)
  const show = {
    story: vis.hostIntro !== false && (story.length > 0 || E),
    pictures: vis.gallery !== false && (photos.length > 0 || E),
    day: (vis.schedule !== false && (schedule.length > 0 || E)) || (vis.venue !== false && (!!venue || !!address || E)),
    dress: vis.dress !== false && (!!dress || swatches.length > 0 || E),
    details: (vis.accommodations !== false && (stay.length > 0 || E)) || (vis.registry !== false && (gifts || E)) || (vis.faqs !== false && (faqs.length > 0 || E)),
    rsvp: over || vis.rsvp !== false,
  };
  const order: StopKey[] = ["gate", "story", "pictures", "day", "dress", "details", "rsvp"];
  const stops = order.filter((k) => k === "gate" || (!gallery && show[k as Exclude<StopKey, "gate">]));
  useStroll({ root: rootRef, stage: stageRef, gl: glRef }, { stops: stops.join(","), animate: moving, intro, monogram: initials(content), font: theme.displayFont, wide: gallery, snap: (live || demo) && moving });
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const vars = {
    ["--pm-ink" as string]: theme.ink,
    ["--pm-gold" as string]: theme.muted,
    ["--pm-display" as string]: theme.displayFont,
    ["--pm-sans" as string]: theme.bodyFont,
  } as CSSProperties;
  const cls = ["pm-root", moving ? "pm-motion" : "", gallery ? "pm-gallery" : "", E ? "pm-editor" : ""].filter(Boolean).join(" ");

  const card = (k: Exclude<StopKey, "gate">, children: ReactNode, sec?: string) => (
    <section key={k} className={`pm-stop pm-stop--${k}`} data-pm-stop data-pm-key={k} id={k === "rsvp" ? "rsvp" : undefined}>
      <div className="pm-dock">
        <article className="pm-card" data-pm-dock {...(sec ? ed.section(sec) : {})}>
          <div className="pm-paper">
            <p className="pm-place">
              <span className="pm-num" aria-hidden>
                {ROMAN[stops.indexOf(k)] ?? ""}
              </span>
              <i aria-hidden />
              <Field path={`custom.${PLACE[k].key}`} value={customValue(content, PLACE[k].key)} fallback={PLACE[k].fallback} placeholder="" editor={E} />
            </p>
            {children}
          </div>
        </article>
        <div className="pm-hold" aria-hidden />
      </div>
    </section>
  );
  const title = (key: string, fallback: string) => <Field as="h2" className="pm-h2" path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} placeholder="" editor={E} />;
  const sub = (key: string, fallback: string) => <Field as="h3" className="pm-h3" path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} placeholder="" editor={E} />;

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{PROMENADE_CSS}</style>

      <div ref={stageRef} className="pm-stage" aria-hidden>
        <canvas ref={glRef} className="pm-gl" />
      </div>

      <div className="pm-world">
        {/* the forecourt: the names set on its gravel, the gate below them */}
        <section className="pm-gate" data-pm-stop>
          <div className="pm-words">
            <Field as="p" className="pm-kick" path="custom.heroKicker" value={customValue(content, "heroKicker")} fallback="We are getting married" placeholder="" editor={E} />
            <Field as="h1" className="pm-names" path="custom.names" value={customValue(content, "names")} fallback={coupleNames(content) || undefined} placeholder="Your names" editor={E} />
            <p className="pm-rule" aria-hidden>
              <i />
              <b>{initials(content)}</b>
              <i />
            </p>
            {date ? <p className="pm-date">{date}</p> : E ? <p className="pm-date">Your date</p> : null}
            <Field as="p" className="pm-line" path="custom.heroLine" value={customValue(content, "heroLine")} fallback="Join us in the garden" placeholder="" editor={E} />
            {vis.countdown !== false && content.eventDate && !over && !gallery ? (
              <div className="pm-countwrap">
                <Countdown iso={content.eventDate} live={live || E || demo} prefix="pm" />
              </div>
            ) : null}
          </div>
          {gallery ? null : (
            <p className="pm-walkon">
              <Field path="custom.walkOn" value={customValue(content, "walkOn")} fallback="Walk with us" placeholder="" editor={E} />
              <i aria-hidden />
            </p>
          )}
        </section>
        {vis.countdown === false ? <HiddenSection k="countdown" label="Countdown" editor={E} /> : null}

        {gallery ? null : (
          <>
            {show.story ? (
              card(
                "story",
                <>
                  {title("storyTitle", "Our story")}
                  {story.length ? (
                    <ol className="pm-story">
                      {story.map((s, i) => (
                        <li key={i}>
                          {s.year ? <span className="pm-story__year">{s.year}</span> : null}
                          <span className="pm-story__body">
                            {s.title ? <b>{s.title}</b> : null}
                            {s.body}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="pm-hint">Tell your story in a few moments, under Our story. Start each paragraph with a line like “2021 · How we met”.</p>
                  )}
                </>,
                "hostIntro",
              )
            ) : vis.hostIntro === false ? (
              <HiddenSection k="hostIntro" label="Our story" editor={E} />
            ) : null}

            {show.pictures ? (
              card(
                "pictures",
                <>
                  {title("picturesTitle", "A few moments")}
                  {photos.length ? (
                    <Carousel items={photos.map((p) => ({ url: p.image.masterUrl, alt: p.image.alt || p.caption || "", focal: p.image.focalPoint }))} />
                  ) : (
                    <p className="pm-hint">Add your photos under Photos.</p>
                  )}
                </>,
                "gallery",
              )
            ) : vis.gallery === false ? (
              <HiddenSection k="gallery" label="Pictures" editor={E} />
            ) : null}

            {show.day
              ? card(
                  "day",
                  <>
                    {title("dayTitle", "The day")}
                    {vis.venue !== false ? (
                      <div className="pm-venue" {...ed.section("venue")}>
                        {E ? (
                          <>
                            <Field as="p" className="pm-venue__name" path="primaryLocation.name" value={venue} placeholder="Venue" editor={E} />
                            <Field as="p" className="pm-small" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
                          </>
                        ) : (
                          <>
                            {venue ? <p className="pm-venue__name">{venue}</p> : null}
                            {address ? <p className="pm-small">{address}</p> : null}
                          </>
                        )}
                        {venue || address ? (
                          <div className="pm-venue__links">
                            <VenueLinks content={content} font="var(--pm-sans)" color="var(--pm-ink)" align="left" size={15} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {vis.schedule !== false ? (
                      <ol className="pm-program" {...ed.section("schedule")} {...ed.list("schedule")}>
                        {schedule.map((s) => (
                          <li key={s.id} {...ed.item(s.id)}>
                            <span className="pm-program__time">{timeOf(s.startTime) || (E ? "Time" : "")}</span>
                            <span className="pm-program__what">
                              <Field path="label" value={s.label} placeholder="What’s happening" editor={E} />
                              {s.description || E ? <Field as="em" path="description" value={s.description} placeholder="A note (optional)" editor={E} multiline /> : null}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    {vis.schedule !== false ? <AddItem list="schedule" label={schedule.length ? "Add to the day" : "Add the day’s plan"} editor={E} /> : null}
                  </>,
                )
              : null}
            {vis.schedule === false ? <HiddenSection k="schedule" label="Program" editor={E} /> : null}
            {vis.venue === false ? <HiddenSection k="venue" label="Venue" editor={E} /> : null}

            {show.dress ? (
              card(
                "dress",
                <>
                  {title("dressTitle", "What to wear")}
                  <DressFigures {...dressColours(swatches, { suit: "#2f2c33", gowns: [theme.muted, "#d9a7a0"] })} />
                  <Field as="p" className="pm-p" path="custom.dressCode" value={dress} placeholder="Formal. Gentlemen in dark suits, ladies in floor-length gowns." editor={E} multiline />
                  {swatches.length ? (
                    <div className="pm-swatches" aria-label="The colours of the day">
                      {swatches.map((c) => (
                        <i key={c} style={{ background: c }} />
                      ))}
                    </div>
                  ) : null}
                </>,
                "dress",
              )
            ) : vis.dress === false ? (
              <HiddenSection k="dress" label="Dress code" editor={E} />
            ) : null}

            {show.details
              ? card(
                  "details",
                  <>
                    {title("detailsTitle", "Good to know")}
                    {vis.accommodations !== false && (stay.length || E) ? (
                      <div className="pm-part" {...ed.section("accommodations")}>
                        {sub("stayTitle", "Where to stay")}
                        <div {...ed.list("accommodations")}>
                          {stay.map((a) => (
                            <div key={a.id} className="pm-row" {...ed.item(a.id)}>
                              <Field as="b" path="name" value={a.name} placeholder="Hotel" editor={E} />
                              {a.addressLine || a.notes ? <span>{[a.addressLine, a.notes].filter(Boolean).join(" · ")}</span> : null}
                              {a.bookingUrl ? (
                                <a className="pm-link" href={a.bookingUrl} target="_blank" rel="noopener noreferrer">
                                  Book a room
                                </a>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        <AddItem list="accommodations" label="Add a place to stay" editor={E} />
                      </div>
                    ) : null}
                    {vis.registry !== false && (gifts || E) ? (
                      <div className="pm-part" {...ed.section("registry")}>
                        {sub("giftsTitle", "Gifts")}
                        {content.cashGiftNote?.trim() ? null : <Field as="p" className="pm-small" path="custom.giftNote" value={customValue(content, "giftNote")} fallback="Your presence is the greatest gift. Should you wish to give, here’s how." placeholder="" editor={E} multiline />}
                        {content.registryLinks.length ? (
                          <div className="pm-links">
                            {content.registryLinks.map((r) => (
                              <a key={r.id} className="pm-btn pm-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                                {r.storeName}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <CashGifts content={content} editor={E} look={{ ink: "var(--pm-ink)", muted: "var(--pm-ink)", surface: "#fffdf8", line: "rgba(90,70,50,0.18)", bodyFont: "var(--pm-sans)", displayFont: "var(--pm-display)", radius: 2 }} />
                      </div>
                    ) : null}
                    {vis.faqs !== false && (faqs.length || E) ? (
                      <div className="pm-part" {...ed.section("faqs")}>
                        {sub("faqTitle", "Questions")}
                        <div className="pm-faqs" {...ed.list("faqs")}>
                          {faqs.map((f) => (
                            <details key={f.id} {...ed.item(f.id)} open={E || undefined}>
                              <summary>
                                <Field path="question" value={f.question} placeholder="A question" editor={E} />
                              </summary>
                              <Field as="p" className="pm-small" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
                            </details>
                          ))}
                        </div>
                        <AddItem list="faqs" label="Add a question" editor={E} />
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
                      <h2 className="pm-h2">Thank you</h2>
                      <p className="pm-p">{customValue(content, "afterParty") || `Thank you for celebrating with ${couple || "us"}.`}</p>
                    </>
                  ) : (
                    <>
                      {title("rsvpTitle", "Will you join us?")}
                      <RsvpBlock content={content} editorPreview={E} motion={moving} />
                    </>
                  )}
                  {credit.show ? (
                    <p className="pm-maker">
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
                  <p className="pm-maker pm-maker--end">
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
