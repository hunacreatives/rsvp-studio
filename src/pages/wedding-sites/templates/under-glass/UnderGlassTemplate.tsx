import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { useReveal } from "../shared/reveal";
import { PAPER_GRAIN } from "../shared/stationery";
import { decades, eventIsOver, greeting, heroPrints, honoree as honoreeOf, isAnniversary, longDate, metalFor, milestone, printsOf, receptionMap, streamTable, timeOf, timeWords, townOf } from "./content";
import { Flip, PrintCard } from "./Print";
import Messages from "./Messages";
import RsvpCard from "./RsvpCard";
import { UNDER_GLASS_CSS } from "./styles";

/**
 * Under Glass (milestone birthdays and anniversaries): the photos every lola keeps under the
 * glass top of the dining table.
 *  - The opening (published page and design preview): three prints lie curled on a narra
 *    table (today's portrait, the oldest photo, one between); a pane of glass slides in over
 *    them and they press flat; a printed card slides under its corner with the name and the
 *    number in foil. Builder and gallery card: the table at rest, glass on.
 *  - The whole page is that one table under one sheet of glass, a patch of window light
 *    drifting across it. On it: a note from the family, the Mass (or the renewal of vows) and
 *    the celebration as two cards, the years decade by decade (each print in the format of its
 *    era, captioned on a slip in her hand; tap one and it lifts out and turns over to show
 *    what's written on the back), the program typed on a folded card,
 *    the entourage (anniversaries), what to wear as fabric swatches, the message wall, the
 *    livestream's time in the cities family calls from, gifts, good to know, the reply card.
 */

// The table: narra, mirrored into a tile that runs the whole page without a seam.
const WOOD = "/event-templates/under-glass/table.webp";
const WEAVE = "/event-templates/calado/linen-soft.webp";
const TILTS = [-2.4, 1.8, -1.2, 2.6, -1.8, 1.3, -2.8, 2.1];

/**
 * The three prints in the first screen, balanced whatever their shapes: the portrait in the
 * middle, and each side print given about the same area (a tall print narrower, a wide one
 * wider), centred on the portrait's middle and tucked slightly under it. Units are hundredths
 * of the page's width (desktop, capped) and of the phone's width.
 */
function heroLayout(prints: { image: { width: number; height: number } }[]) {
  const aspect = (i: number) => {
    const im = prints[i]?.image;
    return im?.width && im?.height ? im.width / im.height : 0.75;
  };
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const place = (pw: number, top: number, share: number, wMin: number, wMax: number, below: number) => {
    const ph = pw / aspect(0) + 2;
    const mid = top + ph / 2;
    const sides = [1, 2].map((i) => {
      const a = aspect(i);
      const w = clamp(Math.sqrt(share * pw * ph * a), wMin, wMax);
      return { w, t: mid - (w / a + 2) / 2 };
    });
    const bottom = Math.max(top + ph, ...sides.map((s) => s.t + s.w / aspect(sides.indexOf(s) + 1) + 2));
    return { pw, top, sides, height: bottom + below };
  };
  const d = place(26, 4, 0.5, 14, 27, 13);
  // Phone: the portrait large in the middle, the side prints lower, at its corners.
  const m = place(48, 3, 0.55, 32, 46, 16);
  const mm = { ...m, sides: m.sides.map((s) => ({ ...s, t: s.t + (48 / aspect(0)) * 0.2 })) };
  mm.height = Math.max(m.height, ...mm.sides.map((s, i) => s.t + s.w / aspect(i + 1) + 2 + 16));
  return { d, m: mm };
}

/** Afternoon sun through one of the windows along the table: six lit panes, the frame between
 *  them unlit, soft at the edges, lying across whatever's on the table. It belongs to the table,
 *  so it scrolls with it. */
const Sunlight = ({ at }: { at: "hero" | "years" | "wall" }) => (
  <span className={`ug-win ug-win--${at}`} aria-hidden>
    <span className="ug-win__panes">
      {Array.from({ length: 6 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  </span>
);

export default function UnderGlassTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced && !editorPreview;
  const play = (live || demo) && motion;
  const pageRef = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [lifted, setLifted] = useState<{ id: string; seed: number } | null>(null);

  useEffect(() => {
    if (!play) return;
    const t = window.setTimeout(() => setGo(true), 450);
    return () => window.clearTimeout(t);
  }, [play]);
  useReveal(pageRef, motion && (live || demo), [content.galleries[0]?.items.length]);
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const anniversary = isAnniversary(content);
  const name = honoreeOf(content);
  const n = milestone(content);
  const metal = metalFor(content);
  const prints = printsOf(content);
  const hero = heroPrints(prints);
  const lay = heroLayout(hero);
  const tableVars = { ["--th" as string]: lay.d.height.toFixed(1), ["--thm" as string]: lay.m.height.toFixed(1), ["--pw" as string]: lay.d.pw } as CSSProperties;
  const printVars = (i: number) =>
    ({
      ["--w" as string]: (i === 0 ? lay.d.pw : lay.d.sides[i - 1].w).toFixed(2),
      ["--t" as string]: (i === 0 ? lay.d.top : lay.d.sides[i - 1].t).toFixed(2),
      ["--wm" as string]: (i === 0 ? lay.m.pw : lay.m.sides[i - 1].w).toFixed(2),
      ["--tm" as string]: (i === 0 ? lay.m.top : lay.m.sides[i - 1].t).toFixed(2),
    }) as CSSProperties;
  const years = decades(prints);
  const vis = settings.sectionVisibility;
  const when = longDate(content.eventDate);
  const town = townOf(content);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const time = timeWords(content.eventDate);
  const recName = customValue(content, "receptionName");
  const recAddress = customValue(content, "receptionAddress");
  const recTime = customValue(content, "receptionTime");
  const recMap = receptionMap(content);
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => s.label.trim());
  const groups = (content.entourage ?? []).map((g) => ({ ...g, people: g.people.map((p) => p.trim()).filter(Boolean) })).filter((g) => g.people.length);
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const stream = customValue(content, "livestreamUrl");
  const zones = streamTable(content.eventDate);
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash || !!customValue(content, "giftNote");
  const over = !editorPreview && eventIsOver(content.eventDate);
  const ceremony = customValue(content, "ceremonyLabel") || (anniversary ? "The renewal of vows" : "Thanksgiving Mass");

  const toRsvp = (focus = false) => {
    document.getElementById("rsvp")?.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });
    if (focus) window.setTimeout(() => (document.querySelector("#rsvp textarea") as HTMLTextAreaElement | null)?.focus({ preventScroll: true }), 700);
  };

  const vars = {
    ["--ug-bg" as string]: theme.background,
    ["--ug-ink" as string]: theme.ink,
    ["--ug-muted" as string]: theme.muted,
    ["--ug-display" as string]: theme.displayFont,
    ["--ug-serif" as string]: theme.bodyFont,
    ["--ug-wood" as string]: `url("${WOOD}")`,
    ["--ug-grain" as string]: `url("${PAPER_GRAIN}")`,
    ["--ug-weave" as string]: `url("${WEAVE}")`,
  } as CSSProperties;
  const cls = ["ug-root", `ug-metal--${metal}`, play ? "ug-play" : "", go ? "ug-go" : "", gallery ? "ug-gallery" : ""].filter(Boolean).join(" ");

  return (
    <div className={cls} style={vars}>
      <style>{UNDER_GLASS_CSS}</style>
      <div ref={pageRef} className="ug-page">
        {/* One sheet of glass over the whole table: a faint tint, its edge, a reflection. */}
        <span className="ug-sheet" aria-hidden>
          <i className="ug-glass__edge" />
          <i className="ug-glass__sheen" />
        </span>
        {/* The top of the table */}
        <header className="ug-hero">
          <div className="ug-table" style={tableVars}>
            <Sunlight at="hero" />
            <span className="ug-table__light" aria-hidden />
            <div className="ug-table__prints">
              {hero.length ? (
                hero.map((p, i) => <PrintCard key={p.id} p={p} seed={i + 3} eager className={`ug-hp ug-hp--${i}`} style={printVars(i)} onOpen={gallery ? undefined : () => setLifted({ id: p.id, seed: i + 3 })} />)
              ) : editorPreview ? (
                <p className="ug-table__hint">Add your photos under Photos. Start each caption with its year, like “1968 — Our wedding day”.</p>
              ) : null}
            </div>
          </div>

          <div className="ug-card ug-hero__card">
            <p className="ug-greet">{greeting(content)}</p>
            <h1 className={`ug-name${name ? "" : " ug-hint"}`}>{name || (editorPreview ? "Your celebrant’s name" : "")}</h1>
            {n ? (
              <p className="ug-num" aria-label={anniversary ? `${n} years` : `turns ${n}`}>
                <span className="ug-num__small">{anniversary ? "" : "turns"}</span>
                <span className="ug-foil">{n}</span>
                <span className="ug-num__small">{anniversary ? "years" : ""}</span>
              </p>
            ) : editorPreview ? (
              <p className="ug-hint ug-small">Add the number (80, 50…) in the Under Glass details.</p>
            ) : null}
            <p className="ug-hero__when">
              {when ? <span>{when}</span> : editorPreview ? <span className="ug-hint">Your date</span> : null}
              {town ? <span className="ug-soft">{town}</span> : null}
            </p>
            {vis.rsvp !== false && !over ? (
              <button type="button" className="ug-btn ug-btn--line" onClick={() => toRsvp()}>
                {customValue(content, "replyButton") || "Kindly reply"}
              </button>
            ) : null}
          </div>
        </header>

        <main>
          {/* A note from the family */}
          {vis.hostIntro !== false && (paragraphs.length || editorPreview) ? (
            <section className="ug-sec ug-narrow ug-paper ug-note" data-reveal>
              {paragraphs.length ? paragraphs.map((p, i) => <p key={i} className={`ug-text${i === 0 ? " ug-text--lead" : ""}`}>{p}</p>) : <p className="ug-text ug-hint">A note from the family goes here.</p>}
              {customValue(content, "noteFrom") ? <p className="ug-hand ug-note__from">{customValue(content, "noteFrom")}</p> : null}
            </section>
          ) : null}

          {/* The Mass and the celebration */}
          {venue || recName || editorPreview ? (
            <section className="ug-sec ug-places">
              <article className="ug-place ug-place--holy" data-reveal>
                <p className="ug-kicker">{ceremony}</p>
                <h3 className={`ug-place__name${venue ? "" : " ug-hint"}`}>{venue || "Your church"}</h3>
                {address ? <p className="ug-place__addr">{address}</p> : null}
                {time ? <p className="ug-place__time">{time}</p> : null}
                <VenueLinks content={content} font="var(--ug-serif)" color="var(--ug-ink)" size={15} />
              </article>
              {recName || editorPreview ? (
                <article className="ug-place" data-reveal style={{ ["--i" as string]: 1 } as CSSProperties}>
                  <p className="ug-kicker">The celebration</p>
                  <h3 className={`ug-place__name${recName ? "" : " ug-hint"}`}>{recName || "Add the celebration in the Under Glass details"}</h3>
                  {recAddress ? <p className="ug-place__addr">{recAddress}</p> : null}
                  {recTime ? <p className="ug-place__time">{recTime}</p> : null}
                  {recMap ? (
                    <a className="ug-place__map" href={recMap} target="_blank" rel="noopener noreferrer">
                      Open in Maps
                    </a>
                  ) : null}
                </article>
              ) : null}
            </section>
          ) : null}

          {/* Through the years */}
          {vis.gallery !== false && (prints.length || editorPreview) ? (
            <section className="ug-sec ug-sec--wide">
              <Sunlight at="years" />
              <h2 className="ug-title" data-reveal>
                {customValue(content, "yearsTitle") || (anniversary ? "Our years together" : "Through the years")}
              </h2>
              {prints.length && !gallery ? <p className="ug-hand ug-tip" data-reveal>Tap a photo to turn it over</p> : null}
              {prints.length ? (
                <div className="ug-years">
                {years.map((d, di) => (
                  <div key={d.title} className="ug-decade" data-reveal data-n={Math.min(d.prints.length, 3)}>
                    <p className="ug-hand ug-decade__slip">{d.title}</p>
                    <div className="ug-decade__table">
                      {d.prints.map((p, i) => (
                        <div key={p.id} className="ug-decade__item" style={{ ["--tilt" as string]: `${TILTS[(di * 3 + i) % TILTS.length]}deg`, ["--i" as string]: i } as CSSProperties}>
                          <PrintCard p={p} seed={di * 7 + i} onOpen={gallery ? undefined : () => setLifted({ id: p.id, seed: di * 7 + i })} />
                          {p.label || p.year ? <p className="ug-hand ug-slip">{[p.label, p.year].filter(Boolean).join(", ")}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                </div>
              ) : (
                <p className="ug-text ug-paper ug-paper--slim" style={{ textAlign: "center", maxWidth: 620, margin: "0 auto", opacity: 0.85 }}>
                  Add photos under Photos, and start each caption with its year (“1968 — Our wedding day”). They’re laid out by decade, each in the look of a print from its time.
                </p>
              )}
            </section>
          ) : null}

          {/* The program, typed on a folded card */}
          {vis.schedule !== false && (schedule.length || editorPreview) ? (
            <section className="ug-sec ug-narrow">
              <h2 className="ug-title" data-reveal>
                {customValue(content, "programTitle") || "The program"}
              </h2>
              <div className="ug-typed" data-reveal>
                {schedule.length ? (
                  <ol>
                    {schedule.map((s) => (
                      <li key={s.id}>
                        <span className="ug-typed__t">{timeOf(s.startTime)}</span>
                        <span className="ug-typed__w">
                          {s.label}
                          {s.description ? <em>{s.description}</em> : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="ug-hint">Add the program under Schedule.</p>
                )}
              </div>
            </section>
          ) : null}

          {/* The entourage (anniversaries: sponsors, the children's roles) */}
          {vis.entourage !== false && groups.length ? (
            <section className="ug-sec ug-narrow" data-reveal>
              <h2 className="ug-title">{customValue(content, "entourageTitle") || (anniversary ? "The entourage" : "With love from")}</h2>
              <div className="ug-ent ug-paper">
                {groups.map((g) => (
                  <div key={g.id} className="ug-ent__g">
                    <p className="ug-kicker">{g.title}</p>
                    {g.people.map((p, i) => (
                      <p key={i} className="ug-ent__p">
                        {p}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* What to wear, as fabric swatches */}
          {vis.dress !== false && (dress || swatches.length || editorPreview) ? (
            <section className="ug-sec ug-narrow" data-reveal>
              <h2 className="ug-title">What to wear</h2>
              <div className="ug-paper ug-paper--slim">{dress ? <p className="ug-text">{dress}</p> : <p className="ug-text ug-hint">Add a dress code in the Under Glass details. Your motif colours show as fabric swatches.</p>}</div>
              {swatches.length ? (
                <div className="ug-swatches" role="img" aria-label="Motif colours">
                  {swatches.map((c, i) => (
                    <span key={c + i} className="ug-swatch" style={{ ["--c" as string]: c, ["--tilt" as string]: `${TILTS[i % TILTS.length]}deg` } as CSSProperties} />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {/* The message wall */}
          {vis.messages !== false ? (
            <section className="ug-sec ug-sec--wide">
              <Sunlight at="wall" />
              <h2 className="ug-title" data-reveal>
                {customValue(content, "messagesTitle") || (name ? `Messages for ${name}` : "Messages")}
              </h2>
              <Messages content={content} live={live} editorPreview={editorPreview} honoree={name} onWrite={() => toRsvp(true)} />
            </section>
          ) : null}

          {/* The livestream, for family abroad */}
          {vis.livestream !== false && stream ? (
            <section className="ug-sec ug-narrow" data-reveal>
              <div className="ug-card ug-stream">
                <p className="ug-kicker">For family far away</p>
                <h2 className="ug-title ug-title--small">Watch it live</h2>
                {zones ? (
                  <ul className="ug-zones">
                    {zones.map((z) => (
                      <li key={z.city} className={z.mine ? "is-mine" : ""}>
                        <span>
                          {z.city}
                          {z.mine ? <em> (your time)</em> : null}
                        </span>
                        <span>{z.time}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <a className="ug-btn" href={/^https?:\/\//i.test(stream) ? stream : undefined} target="_blank" rel="noopener noreferrer">
                  {customValue(content, "livestreamButton") || "Open the livestream"}
                </a>
              </div>
            </section>
          ) : null}

          {/* Gifts */}
          {vis.registry !== false && gifts ? (
            <section className="ug-sec ug-narrow" data-reveal>
              <div className="ug-paper">
              <h2 className="ug-title ug-title--in">Gifts</h2>
              <p className="ug-text">{customValue(content, "giftNote") || content.cashGiftNote?.trim() || "Your presence is the greatest gift."}</p>
              {content.registryLinks.length ? (
                <div className="ug-links">
                  {content.registryLinks.map((r) => (
                    <a key={r.id} className="ug-btn ug-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                      {r.storeName}
                    </a>
                  ))}
                </div>
              ) : null}
              {cash ? (
                giftsOpen ? (
                  <div className="ug-gifts">
                    <CashGifts content={{ ...content, cashGiftNote: "" }} look={{ ink: "var(--ug-ink)", muted: "var(--ug-soft)", surface: "#fdfbf7", line: "color-mix(in srgb, var(--ug-ink) 16%, transparent)", bodyFont: "var(--ug-serif)", displayFont: "var(--ug-serif)", radius: 3 }} />
                  </div>
                ) : (
                  <button type="button" className="ug-btn ug-btn--line" onClick={() => setGiftsOpen(true)}>
                    {customValue(content, "giftButton") || "View gift details"}
                  </button>
                )
              ) : null}
              </div>
            </section>
          ) : null}

          {/* Good to know */}
          {vis.faqs !== false && faqs.length ? (
            <section className="ug-sec ug-narrow">
              <h2 className="ug-title" data-reveal>
                Good to know
              </h2>
              {faqs.map((f) => (
                <div key={f.id} className="ug-faq ug-paper" data-reveal>
                  <p className="ug-faq__q">{f.question}</p>
                  <p className="ug-text">{f.answer}</p>
                </div>
              ))}
            </section>
          ) : null}

          {/* The reply card */}
          {over ? (
            <section className="ug-sec ug-narrow ug-paper" data-reveal>
              <h2 className="ug-title ug-title--in">Maraming salamat po</h2>
              <p className="ug-text">{customValue(content, "afterParty") || `Thank you for celebrating ${name || "with us"}.`}</p>
            </section>
          ) : vis.rsvp !== false ? (
            <section className="ug-sec ug-narrow">
              <RsvpCard content={content} editorPreview={editorPreview} sample={!live && !editorPreview} honoree={name} />
            </section>
          ) : null}
        </main>

        <footer className="ug-foot ug-paper">
          <p className="ug-foot__thanks">{customValue(content, "closing") || "Salamat sa Diyos"}</p>
          {name ? <p className="ug-foot__name">{name}</p> : null}
          {credit.show ? (
            <p className="ug-credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
            </p>
          ) : null}
        </footer>
      </div>

      {lifted
        ? (() => {
            const p = prints.find((x) => x.id === lifted.id);
            return p ? <Flip p={p} seed={lifted.seed} vars={vars} css={UNDER_GLASS_CSS} motion={motion} onClose={() => setLifted(null)} /> : null;
          })()
        : null}
    </div>
  );
}
