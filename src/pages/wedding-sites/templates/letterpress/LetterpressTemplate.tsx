import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { loadFontFamilies } from "../../presentation/loadFonts";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { AddItem, Field, HiddenSection, siteEdit } from "../shared/siteEdit";
import { ART, Envelope, MapArt, Paper, Prop, Seal, SmallEnvelope, Stamp, Swatches } from "./art";
import { coupleNames, dateWords, eventIsOver, initialsOf, nameParts, timeOf, timeWords, townOf } from "./content";
import RsvpCard from "./RsvpCard";
import { buildOpening, useTable, type Opening } from "./table";
import { INK_WAX } from "./wax";
import { LETTERPRESS_CSS } from "./styles";

/**
 * Letterpress (weddings, engagements): a fine-art invitation suite laid out on a heavy linen
 * table, seen from straight above in soft window light. The page is the table: each section is
 * one piece of the suite, and the camera glides down the table from piece to piece.
 *  - The opening (published page and design preview): the ink-blue envelope lies sealed with a
 *    gold wax seal pressed with the couple's initials. A tap breaks the seal; the flap lifts over
 *    its hinge to show its painted liner, and the invitation slides out and settles on top.
 *  - Then, one stop each: the order of the day, attire with fabric swatches in the motif colours,
 *    the venue on vellum over a map card, where to stay, a gifts note in its little envelope, the
 *    questions on a folded card, and the reply card with its stamped envelope.
 *  - Every piece pauses in the same place while it's read (table.ts). Builder, gallery card,
 *    reduced motion: the suite lies still, the envelope already open.
 */

const SCRIPT = ["Mrs+Saint+Delafield"];

export default function LetterpressTemplate({ content, settings, editorPreview = false, live = false, demo = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  loadFontFamilies("letterpress-script", SCRIPT);
  const reduced = usePrefersReducedMotion();
  const moving = !reduced && !editorPreview && !gallery;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [boot] = useState(() => (live || demo) && moving && (typeof window === "undefined" || window.location.hash !== "#rsvp"));
  const [phase, setPhase] = useState<"sealed" | "opening" | "open">(boot ? "sealed" : "open");
  const [giftsOpen, setGiftsOpen] = useState(false);
  const ed = siteEdit(editorPreview);
  const E = editorPreview;

  const vis = settings.sectionVisibility;
  const couple = customValue(content, "names") || coupleNames(content);
  const parts = nameParts(couple);
  const letters = initialsOf(content, couple);
  const dw = dateWords(content.eventDate);
  const tw = timeWords(content.eventDate);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const town = townOf(content);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)).filter((s) => E || s.label.trim());
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const stay = content.accommodations.filter((a) => E || a.name.trim());
  const travel = content.travelInformation.filter((t) => E || t.title.trim() || t.body.trim());
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => E || f.question.trim());
  const cash = hasCashGifts(content);
  const gifts = content.registryLinks.length > 0 || cash || !!customValue(content, "giftNote");
  const over = !E && eventIsOver(content.eventDate);

  const show = {
    day: vis.schedule !== false && (schedule.length > 0 || E),
    dress: vis.dress !== false && (!!dress || swatches.length > 0 || E),
    venue: vis.venue !== false && (!!venue || !!address || E),
    stay: (vis.accommodations !== false && (stay.length > 0 || E)) || (vis.travelInformation !== false && (travel.length > 0 || E)),
    gifts: vis.registry !== false && (gifts || E),
    faqs: vis.faqs !== false && (faqs.length > 0 || E),
    rsvp: over || vis.rsvp !== false,
  };
  const order = ["invite", ...(gallery ? [] : (["day", "dress", "venue", "stay", "gifts", "faqs", "rsvp"] as const).filter((k) => show[k]))];
  useTable({ root: rootRef, stage: stageRef, table: tableRef }, { routeKey: `${order.join(",")}|${phase === "open" ? 1 : 0}`, snap: (live || demo) && moving && phase === "open" });

  // the opening: sealed until a tap, a key or a swipe; the page can't scroll until it's open
  useEffect(() => {
    if (phase !== "sealed") return;
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    let op: Opening | null = null, started = 0, lastEv = 0, raf = 0, alive = true;
    const evs = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    const done = () => {
      html.style.overflow = prev;
      root.classList.remove("lp-armed");
      setPhase("open");
    };
    const go = () => {
      if (!op || !alive) return;
      // one tap is a touchstart and a pointerdown: only a second gesture hurries it along
      // (and a swipe's own momentum, which runs on for a second or more, isn't a second gesture)
      const now = performance.now(), fresh = now - lastEv > 220;
      lastEv = now;
      if (started) { if (fresh && now - started > 450) op.hurry(); return; }
      started = now;
      root.classList.add("lp-opening");
      op.play();
    };
    // build it once the layout (and the fonts) have settled into their resting places
    const arm = () => {
      if (!alive) return;
      op?.cancel();
      op = buildOpening(root, done);
      if (!op) { done(); return; }
      root.classList.add("lp-armed");
    };
    const start = () => { raf = requestAnimationFrame(() => { raf = requestAnimationFrame(arm); }); };
    if (document.fonts?.status === "loaded") start(); else document.fonts?.ready.then(start).catch(start);
    evs.forEach((e) => window.addEventListener(e, go, { passive: true }));
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      evs.forEach((e) => window.removeEventListener(e, go));
      if (!started) { op?.cancel(); html.style.overflow = prev; }
    };
  }, [phase]);
  useEffect(() => {
    if (live && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [live]);

  const longest = Math.max(5, ...parts.map((p) => p.length));
  const vars = {
    ["--lp-ink" as string]: theme.ink,
    ["--lp-display" as string]: theme.displayFont,
    ["--lp-body" as string]: theme.bodyFont,
    ["--lp-names" as string]: `${Math.min(0.66, 3.5 / (0.5 * longest)).toFixed(3)}`,
  } as CSSProperties;
  const cls = ["lp-root", phase === "sealed" ? "lp-sealed" : "", phase === "open" ? "lp-open" : "", boot ? "lp-boot" : "", gallery ? "lp-gallery" : "", E ? "lp-editor" : ""].filter(Boolean).join(" ");
  const maker = credit.show ? (
    <p className="lp-maker">
      <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }} />
    </p>
  ) : null;

  const title = (key: string, fallback: string) => <Field as="h2" className="lp-h2 lp-press" path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} placeholder="" editor={E} />;
  const label = (key: string, fallback: string) => <Field as="p" className="lp-label" path={`custom.${key}`} value={customValue(content, key)} fallback={fallback} placeholder="" editor={E} />;
  const rule = <i className="lp-rule lp-foil" aria-hidden />;
  const stop = (key: string, piece: ReactNode, props: ReactNode, sec?: string, frame?: ReactNode) => (
    <section key={key} className={`lp-stop lp-stop--${key}`} data-lp-stop data-lp-key={key} id={key === "rsvp" ? "rsvp" : undefined}>
      <div className="lp-dock">
        <div className={`lp-vig lp-vig--${key}`} data-lp-dock>
          <div className="lp-piece" {...(sec ? ed.section(sec) : {})}>
            {props}
            {piece}
          </div>
          {frame}
        </div>
        <div className="lp-hold" aria-hidden />
      </div>
    </section>
  );

  // ---- the invitation, on the open envelope
  const dateLine = customValue(content, "dateLine");
  const invite = stop(
    "invite",
    <>
      <Paper className="lp-card lp-card--invite" data-lp-invite>
        <div className="lp-mono lp-foil" aria-hidden>
          <span>{letters[0] ?? ""}</span>
          {letters[1] ? <em>&amp;</em> : null}
          {letters[1] ? <span>{letters[1]}</span> : null}
        </div>
        <Field as="p" className="lp-label lp-press" path="custom.heroKicker" value={customValue(content, "heroKicker")} fallback="Together with their families" placeholder="" editor={E} />
        {E ? (
          <Field as="h1" className="lp-names lp-press" path="custom.names" value={customValue(content, "names")} fallback={coupleNames(content) || undefined} placeholder="Your names" editor={E} />
        ) : (
          <h1 className="lp-names lp-press">
            {parts.map((p, i) => (
              <span key={i}>
                {i ? <em className="lp-amp">and</em> : null}
                <span className="lp-name">{p}</span>
              </span>
            ))}
          </h1>
        )}
        <Field as="p" className="lp-italic lp-press" path="custom.inviteLine" value={customValue(content, "inviteLine")} fallback="request the pleasure of your company at the celebration of their marriage" placeholder="" editor={E} />
        {rule}
        {E ? (
          <Field as="p" className="lp-date lp-press" path="custom.dateLine" value={dateLine} fallback={dw ? `${dw[0]}, ${dw[1]}` : undefined} placeholder="Your date (set it in Event details)" editor={E} />
        ) : dateLine ? (
          <p className="lp-date lp-press">{dateLine}</p>
        ) : dw ? (
          <p className="lp-date lp-press">
            <span>{dw[0]}</span>
            <span>{dw[1]}</span>
            {tw ? <span className="lp-time">{tw}</span> : null}
          </p>
        ) : null}
        {venue || address || E ? (
          <p className="lp-where lp-press">
            {E ? <Field path="primaryLocation.name" value={venue} placeholder="Venue" editor={E} /> : venue ? <span>{venue}</span> : null}
            {town ? <span className="lp-where__town">{town}</span> : null}
          </p>
        ) : null}
        <Field as="p" className="lp-italic lp-italic--small lp-press" path="custom.receptionLine" value={customValue(content, "receptionLine")} fallback="Dinner and dancing to follow" placeholder="" editor={E} />
      </Paper>
    </>,
    <>
      <Prop src="ribbon.webp" className="lp-p-ribbon" />
      <Envelope letters={letters} font={theme.displayFont} />
      <Prop src="limonium.webp" className="lp-p-limonium" />
      <Prop src="rings.webp" className="lp-p-rings" />
    </>,
    undefined,
    <>
      <div className="lp-prompt" aria-hidden={phase !== "sealed"}>
        {parts.length ? <p className="lp-prompt__names">{parts.join(" & ")}</p> : null}
        <p className="lp-prompt__go">
          <Field path="custom.openLabel" value={customValue(content, "openLabel")} fallback="Open the invitation" placeholder="" editor={E} />
        </p>
      </div>
      {gallery ? null : (
        <p className="lp-cue" aria-hidden>
          <Field path="custom.cueLabel" value={customValue(content, "cueLabel")} fallback="The details" placeholder="" editor={E} />
          <i />
        </p>
      )}
    </>,
  );

  const pieces: Record<string, ReactNode> = {};
  if (show.day)
    pieces.day = stop(
      "day",
      <Paper className="lp-card lp-card--day">
        {label("dayKicker", "The order of the day")}
        {title("dayTitle", "The Day")}
        {rule}
        <ol className="lp-program" {...ed.list("schedule")}>
          {schedule.map((s) => (
            <li key={s.id} {...ed.item(s.id)}>
              <span className="lp-program__time lp-press">{timeOf(s.startTime) || (E ? "Time" : "")}</span>
              <span className="lp-program__what">
                <Field as="b" className="lp-press" path="label" value={s.label} placeholder="What’s happening" editor={E} />
                {s.description || E ? <Field as="em" className="lp-press" path="description" value={s.description} placeholder="A note (optional)" editor={E} multiline /> : null}
              </span>
            </li>
          ))}
        </ol>
        <AddItem list="schedule" label={schedule.length ? "Add to the day" : "Add the day’s plan"} editor={E} />
      </Paper>,
      <>
        <Prop src="pen.webp" className="lp-p-pen" />
        <Prop src="grass.webp" className="lp-p-grass" />
      </>,
      "schedule",
    );
  if (show.dress)
    pieces.dress = stop(
      "dress",
      <Paper className="lp-card lp-card--dress">
        {label("dressKicker", "What to wear")}
        {title("dressTitle", "Attire")}
        {rule}
        <Field as="p" className="lp-p lp-press" path="custom.dressCode" value={dress} placeholder="Formal. Gentlemen in suits or barong, ladies in long gowns." editor={E} multiline />
        {swatches.length ? (
          <div className="lp-strip">
            <Swatches colors={swatches} />
            <Field as="p" className="lp-label lp-label--soft" path="custom.swatchLabel" value={customValue(content, "swatchLabel")} fallback="Our colours" placeholder="" editor={E} />
          </div>
        ) : E ? (
          <p className="lp-small">Add your motif colours under Entourage &amp; motif to show them here as fabric.</p>
        ) : null}
      </Paper>,
      <>
        <Prop src="ribbon-tail.webp" className="lp-p-tail" />
        <Prop src="thistle.webp" className="lp-p-thistle" />
      </>,
      "dress",
    );
  if (show.venue)
    pieces.venue = stop(
      "venue",
      <div className="lp-vellum-set">
        <div className="lp-mapcard" aria-hidden>
          <Paper className="lp-card lp-card--map">
            <MapArt />
          </Paper>
        </div>
        <div className="lp-vellum">
          <Seal letters={letters} font={theme.displayFont} look={INK_WAX} seed={8} className="lp-vellum__seal" />
          {label("venueKicker", "Ceremony and reception")}
          {title("venueTitle", "The Venue")}
          {E ? (
            <>
              <Field as="p" className="lp-venue" path="primaryLocation.name" value={venue} placeholder="Venue" editor={E} />
              <Field as="p" className="lp-p" path="primaryLocation.addressLine" value={address} placeholder="Address" editor={E} />
            </>
          ) : (
            <>
              {venue ? <p className="lp-venue">{venue}</p> : null}
              {address ? <p className="lp-p">{address}</p> : null}
            </>
          )}
          {schedule[0] || content.eventDate.includes("T") ? <p className="lp-label lp-label--soft">{[dw?.[0].replace(/, the .*/, ""), timeOf(content.eventDate)].filter(Boolean).join(" · ")}</p> : null}
          {venue || address ? (
            <div className="lp-links">
              <VenueLinks content={content} font="var(--lp-body)" color="var(--lp-ink)" align="center" size={15} />
            </div>
          ) : null}
        </div>
      </div>,
      <Prop src="rose.webp" className="lp-p-rose" />,
      "venue",
    );
  if (show.stay)
    pieces.stay = stop(
      "stay",
      <Paper className="lp-card lp-card--stay">
        {vis.accommodations !== false && (stay.length || E) ? (
          <div className="lp-part" {...ed.section("accommodations")}>
            {label("stayKicker", "For the weekend")}
            {title("stayTitle", "Where to Stay")}
            {rule}
            <div className="lp-list" {...ed.list("accommodations")}>
              {stay.map((a) => (
                <div key={a.id} className="lp-item" {...ed.item(a.id)}>
                  <Field as="b" className="lp-item__name lp-press" path="name" value={a.name} placeholder="Hotel" editor={E} />
                  {a.addressLine || E ? <Field as="span" className="lp-label lp-label--soft" path="addressLine" value={a.addressLine} placeholder="Where it is" editor={E} /> : null}
                  {a.notes || E ? <Field as="p" className="lp-p lp-press" path="notes" value={a.notes} placeholder="A note (optional)" editor={E} multiline /> : null}
                  {a.bookingUrl ? (
                    <a className="lp-a" href={a.bookingUrl} target="_blank" rel="noopener noreferrer">
                      Book a room
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
            <AddItem list="accommodations" label="Add a place to stay" editor={E} />
          </div>
        ) : null}
        {vis.travelInformation !== false && (travel.length || E) ? (
          <div className="lp-travel" {...ed.section("travelInformation")}>
            {title("travelTitle", "Getting There")}
            <div {...ed.list("travelInformation")}>
              {travel.map((t) => (
                <div key={t.id} className="lp-item" {...ed.item(t.id)}>
                  <Field as="b" className="lp-item__name lp-press" path="title" value={t.title} placeholder="From Manila" editor={E} />
                  <Field as="p" className="lp-p lp-press" path="body" value={t.body} placeholder="How to get there" editor={E} multiline />
                </div>
              ))}
            </div>
            <AddItem list="travelInformation" label="Add travel notes" editor={E} />
          </div>
        ) : null}
      </Paper>,
      <>
        <Prop src="limonium.webp" className="lp-p-limonium2" />
        <Seal letters={letters} font={theme.displayFont} seed={5} className="lp-p-loose" />
      </>,
    );
  if (show.gifts)
    pieces.gifts = stop(
      "gifts",
      <Paper className="lp-card lp-card--note">
        {title("giftTitle", "A Note on Gifts")}
        {rule}
        <Field as="p" className="lp-p lp-press" path="custom.giftNote" value={customValue(content, "giftNote")} fallback={content.cashGiftNote?.trim() || "Your presence is the greatest gift. Should you wish to bless us, a contribution to our first home would mean the world."} placeholder="" editor={E} multiline />
        {content.registryLinks.length ? (
          <div className="lp-btns">
            {content.registryLinks.map((r) => (
              <a key={r.id} className="lp-btn lp-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                {r.storeName}
              </a>
            ))}
          </div>
        ) : null}
        {cash || E ? (
          giftsOpen || E ? (
            <CashGifts content={{ ...content, cashGiftNote: "" }} editor={E} look={{ ink: "var(--lp-ink)", muted: "var(--lp-ink)", surface: "rgba(255,253,247,0.7)", line: "rgba(36,48,73,0.22)", bodyFont: "var(--lp-body)", displayFont: "var(--lp-display)", radius: 2 }} />
          ) : (
            <div className="lp-btns">
              <button type="button" className="lp-btn lp-btn--line" onClick={() => setGiftsOpen(true)}>
                {customValue(content, "giftButton") || "View gift details"}
              </button>
            </div>
          )
        ) : null}
        <Field as="p" className="lp-sign" path="custom.giftSign" value={customValue(content, "giftSign")} fallback={parts.length ? `With love, ${parts.join(" & ")}` : "With love"} placeholder="" editor={E} />
      </Paper>,
      <>
        <SmallEnvelope className="lp-senv--gift" />
        <Prop src="ribbon-tail.webp" className="lp-p-tail2" />
        <Prop src="thistle.webp" className="lp-p-thistle2" />
      </>,
      "registry",
    );
  // the folded card's two panels: the heading and the first half on the left, the rest on the right
  const half = Math.floor(faqs.length / 2);
  const faq = (f: (typeof faqs)[number], at: CSSProperties) => (
    <div key={f.id} className="lp-faq" style={at} {...ed.item(f.id)}>
      <Field as="b" className="lp-press" path="question" value={f.question} placeholder="A question" editor={E} />
      <Field as="p" className="lp-p lp-press" path="answer" value={f.answer} placeholder="The answer" editor={E} multiline />
    </div>
  );
  if (show.faqs)
    pieces.faqs = stop(
      "faqs",
      <Paper className="lp-card lp-card--fold">
        <i className="lp-crease" aria-hidden />
        <div className="lp-faqs" {...ed.list("faqs")}>
          <div className="lp-fold__head">
            {label("faqKicker", "Before you come")}
            {title("faqTitle", "Good to Know")}
            {rule}
          </div>
          {faqs.map((f, i) => faq(f, i < half ? { gridColumn: 1, gridRow: i + 2 } : { gridColumn: 2, gridRow: i - half + 1 }))}
          <AddItem list="faqs" label="Add a question" editor={E} />
        </div>
      </Paper>,
      <>
        <Prop src="pen.webp" className="lp-p-pen2" />
        <Prop src="grass.webp" className="lp-p-grass2" />
      </>,
      "faqs",
    );
  if (show.rsvp)
    pieces.rsvp = stop(
      "rsvp",
      over ? (
        <Paper className="lp-card lp-card--reply">
          <p className="lp-label">With thanks</p>
          <h2 className="lp-h2 lp-press">Thank you</h2>
          <p className="lp-p lp-press">{customValue(content, "afterParty") || `Thank you for celebrating with ${couple || "us"}.`}</p>
          {maker}
        </Paper>
      ) : (
        <Paper className="lp-card lp-card--reply">
          <RsvpCard content={content} editorPreview={E} credit={maker} />
        </Paper>
      ),
      <>
        <SmallEnvelope className="lp-senv--reply">
          <Stamp className="lp-senv__stamp" />
          <p className="lp-senv__to">
            {parts.length ? <span>{parts.join(" & ")}</span> : null}
            {town ? <span>{town}</span> : null}
          </p>
        </SmallEnvelope>
        <Prop src="rings.webp" className="lp-p-rings2" />
        <Prop src="rose.webp" className="lp-p-rose2" />
      </>,
      over ? undefined : "rsvp",
    );

  return (
    <div ref={rootRef} className={cls} style={vars}>
      <style>{LETTERPRESS_CSS}</style>
      <div ref={stageRef} className="lp-stage" aria-hidden>
        <div ref={tableRef} className="lp-table" style={{ backgroundImage: `url(${ART}/linen.webp)` }} />
        <i className="lp-window" />
      </div>
      <div className="lp-world">
        {invite}
        {gallery ? null : (
          <>
            {pieces.day}
            {vis.schedule === false ? <HiddenSection k="schedule" label="The day" editor={E} /> : null}
            {pieces.dress}
            {vis.dress === false ? <HiddenSection k="dress" label="Attire" editor={E} /> : null}
            {pieces.venue}
            {vis.venue === false ? <HiddenSection k="venue" label="The venue" editor={E} /> : null}
            {pieces.stay}
            {vis.accommodations === false ? <HiddenSection k="accommodations" label="Where to stay" editor={E} /> : null}
            {vis.travelInformation === false ? <HiddenSection k="travelInformation" label="Getting there" editor={E} /> : null}
            {pieces.gifts}
            {vis.registry === false ? <HiddenSection k="registry" label="Gifts" editor={E} /> : null}
            {pieces.faqs}
            {vis.faqs === false ? <HiddenSection k="faqs" label="Good to know" editor={E} /> : null}
            {pieces.rsvp ?? (
              <>
                <HiddenSection k="rsvp" label="RSVP" editor={E} />
                {maker ? <div className="lp-endnote">{maker}</div> : null}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
