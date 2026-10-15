import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { EnvelopeBack, Flap, Flourish, LaceCard, ListGlyph, Paper, Pocket, RoseSky, Rosette, VELVET_FOLDS, VELVET_NOISE, WaxSeal, iconFor, type PaperTone } from "./art";
import { bigLine, celebrant, dateLine, eventIsOver, firstNames, timeLine, timeOf } from "./content";
import RsvpReply from "./RsvpReply";
import { DEBUT_CSS } from "./styles";
import { STATIONERY_CSS } from "../shared/stationery";

/**
 * Debut, in two pages:
 *  1. The invitation: a lace-edged ivory card in a wine envelope, held by a
 *     gold wax seal ("18"). On the published page it starts sealed; tapping
 *     the seal (or waiting a moment) slides the card up out of the envelope.
 *     The card always fits one screen. "RSVP here" turns the page.
 *  2. The debut page (#details): lace cards for her note, the program, the
 *     dress code, each of the 18 Roses / Candles / Treasures lists (names
 *     appear one by one), gifts, FAQs and the RSVP (rose petals on a yes).
 *
 * All artwork is drawn in code (art.tsx); colours follow the palette.
 * Prefers-reduced-motion skips every animation.
 */

const AUTO_OPEN_MS = 3800;
const OPEN_MS = 3400;
const TURN_MS = 600;
const INSIDE_HASHES = ["#details", "#rsvp"];

function useReveal(on: boolean) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(!on);
  useEffect(() => {
    if (!on) return setShown(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return { ref, shown };
}

type Sheet = { edge?: "lace" | "deckle" | "plain"; tone?: PaperTone; tilt?: number; seed?: number };

/** One printed piece on the table: its own paper, edge and tilt. */
function Section({ title, reveal, children, icon, id, sheet = {}, className = "" }: { title: string; reveal: boolean; children: ReactNode; icon?: ReactNode; id?: string; sheet?: Sheet; className?: string }) {
  const { ref, shown } = useReveal(reveal);
  return (
    <section id={id} ref={ref} className={`db-sec ${className}${shown ? " is-on" : ""}`}>
      <Paper edge={sheet.edge ?? "deckle"} tone={sheet.tone ?? "ivory"} tilt={sheet.tilt ?? 0} seed={sheet.seed ?? 1}>
        {icon ? <div className="db-sec__icon">{icon}</div> : null}
        <h2 className="db-script db-sec__title">{title}</h2>
        <Flourish className="db-sec__flourish" />
        {children}
      </Paper>
    </section>
  );
}

const Hint = ({ children }: { children: ReactNode }) => <p className="db-hint">{children}</p>;

export default function DebutTemplate({ content, settings, editorPreview = false, live = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced;
  const reveal = live && motion;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const startInside = live && typeof window !== "undefined" && INSIDE_HASHES.includes(window.location.hash);
  const [page, setPage] = useState<"intro" | "inside">(startInside ? "inside" : "intro");
  const [turning, setTurning] = useState(false);
  // The envelope: sealed → opening → open. Only the published page starts sealed.
  const [env, setEnv] = useState<"sealed" | "opening" | "open">(live && motion && !startInside ? "sealed" : "open");
  const openEnvelope = useCallback(() => setEnv((e) => (e === "sealed" ? "opening" : e)), []);
  useEffect(() => {
    if (env === "sealed") {
      const t = setTimeout(openEnvelope, AUTO_OPEN_MS);
      return () => clearTimeout(t);
    }
    if (env === "opening") {
      const t = setTimeout(() => setEnv("open"), OPEN_MS);
      return () => clearTimeout(t);
    }
  }, [env, openEnvelope]);

  // The card + envelope always fit one screen on the published page.
  useLayoutEffect(() => {
    if (!live || page !== "intro") return;
    const stage = stageRef.current;
    const intro = stage?.parentElement;
    if (!stage || !intro) return;
    const fit = () => {
      stage.style.zoom = "";
      const cs = getComputedStyle(intro);
      const credit = intro.querySelector<HTMLElement>(".db-intro__credit");
      const creditH = credit ? credit.offsetHeight + parseFloat(getComputedStyle(credit).marginTop || "0") : 0;
      const avail = window.innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - creditH - 2;
      const z = Math.min(1, avail / stage.offsetHeight);
      if (z < 0.995) stage.style.zoom = String(Math.max(0.55, z));
    };
    fit();
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => window.removeEventListener("resize", fit);
  }, [live, page]);

  const toTop = useCallback(() => {
    if (live) window.scrollTo({ top: 0 });
    else rootRef.current?.scrollIntoView({ block: "start" });
  }, [live]);

  useEffect(() => {
    if (!live) return;
    const onPop = () => {
      setTurning(false);
      setPage(INSIDE_HASHES.includes(window.location.hash) ? "inside" : "intro");
      setEnv("open");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [live]);

  useEffect(() => {
    if (startInside && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [startInside]);

  const openInside = () => {
    const go = () => {
      setPage("inside");
      setTurning(false);
      if (live) history.pushState(null, "", "#details");
      toTop();
    };
    if (motion) {
      setTurning(true);
      setTimeout(go, TURN_MS);
    } else go();
  };
  const backToCard = () => {
    if (live && window.location.hash) history.back();
    else {
      setPage("intro");
      toTop();
    }
  };

  const name = celebrant(content);
  const first = firstNames(content);
  const when = dateLine(content.eventDate);
  const time = timeLine(content);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const groups = (content.entourage ?? []).filter((g) => g.people.some((p) => p.trim()));
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => f.question.trim());
  const gifts = content.registryLinks.length > 0 || hasCashGifts(content);
  const over = !editorPreview && eventIsOver(content.eventDate);
  const vis = settings.sectionVisibility;

  const vars = {
    ["--db-wine" as string]: theme.ink,
    ["--db-wine-2" as string]: `color-mix(in srgb, ${theme.ink} 82%, #fff)`,
    ["--db-wine-3" as string]: `color-mix(in srgb, ${theme.ink} 80%, #000)`,
    ["--db-ivory" as string]: theme.background,
    ["--db-gold" as string]: theme.muted,
    ["--db-script" as string]: theme.displayFont,
    ["--db-serif" as string]: theme.bodyFont,
    ["--db-caps" as string]: '"Cinzel", "Trajan Pro", Georgia, serif',
    ["--st-paper" as string]: theme.background,
    ["--st-env" as string]: theme.ink,
    ["--st-ink" as string]: theme.ink,
  } as CSSProperties;

  const detail = (label: string, body: ReactNode) => (
    <div className="db-detail">
      <p className="db-detail__label">
        <Rosette size={14} />
        {label}
      </p>
      {body}
    </div>
  );

  return (
    <div ref={rootRef} className={`db-root db-env-${env}${motion ? " db-motion" : ""}${turning ? " db-turning" : ""}`} style={vars}>
      <style>{STATIONERY_CSS + DEBUT_CSS}</style>
      <div className="db-velvet" style={{ backgroundImage: `${VELVET_NOISE}, url("${VELVET_FOLDS}")` }} aria-hidden />
      <RoseSky still={!motion || editorPreview} />

      {page === "intro" ? (
        <header className="db-intro" onClick={env === "sealed" ? openEnvelope : undefined}>
          <div className="db-stage" ref={stageRef}>
            <div className="db-env db-env--back" aria-hidden>
              <EnvelopeBack />
            </div>
            <div className="db-card-wrap">
              <LaceCard className="db-card" scallop={12}>
                <p className="db-script db-card__kicker db-rise" style={{ ["--d" as string]: ".9s" }}>
                  {customValue(content, "kicker") || "You’re Invited"}
                </p>
                <p className="db-caps-sm db-rise" style={{ ["--d" as string]: "1.05s" }}>
                  {customValue(content, "leadIn") || "Join us to celebrate the"}
                </p>
                <h1 className="db-caps db-card__big db-rise" style={{ ["--d" as string]: "1.15s" }}>
                  {bigLine(content)}
                </h1>
                <p className="db-of db-rise" style={{ ["--d" as string]: "1.25s" }}>
                  of
                </p>
                <p className={`db-script db-card__name db-rise${name ? "" : " db-hint"}`} style={{ ["--d" as string]: "1.35s" }}>
                  {name || (editorPreview ? "Your name" : "")}
                </p>
                <div className="db-rise" style={{ ["--d" as string]: "1.45s" }}>
                  <Flourish className="db-card__flourish" />
                </div>
                <div className="db-details db-rise" style={{ ["--d" as string]: "1.55s" }}>
                  {time || editorPreview ? detail("Time", <p className={time ? "" : "db-hint"}>{time ?? "Add a start time"}</p>) : null}
                  {when || editorPreview ? detail("Date", <p className={when ? "" : "db-hint"}>{when ?? "Add your date"}</p>) : null}
                  {venue || address || editorPreview
                    ? detail(
                        "Venue",
                        <>
                          {venue ? <p className="db-detail__strong">{venue}</p> : editorPreview ? <p className="db-hint">Venue</p> : null}
                          {address ? <p>{address}</p> : null}
                        </>,
                      )
                    : null}
                </div>
                <div className="db-card__close db-rise" style={{ ["--d" as string]: "1.7s" }}>
                  <p>{customValue(content, "closing") || "Let’s make it a night to remember."}</p>
                </div>
              </LaceCard>
            </div>
            <div className="db-stage__below" aria-hidden />

            <div className="db-env db-env--flap" aria-hidden>
              <Flap />
            </div>
            <div className="db-env db-pocket" aria-hidden>
              <Pocket />
            </div>
            <div className="db-env db-env--ui">
              <button type="button" className="db-seal-btn" onClick={(e) => (env === "sealed" ? (e.stopPropagation(), openEnvelope()) : undefined)} aria-label={env === "sealed" ? "Open the invitation" : undefined} tabIndex={env === "sealed" ? 0 : -1}>
                <WaxSeal text={customValue(content, "sealText") || "18"} />
              </button>
              <p className="db-tap" aria-hidden={env !== "sealed"}>
                Tap the seal to open
              </p>
              <button type="button" className="db-btn db-pocket__go" onClick={openInside} tabIndex={env === "open" ? 0 : -1}>
                {customValue(content, "introButton") || "RSVP here"}
              </button>
            </div>
          </div>
          {credit.show ? (
            <p className="db-intro__credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline" }} />
            </p>
          ) : null}
        </header>
      ) : (
        <div className="db-inside">
          <div className="db-topbar">
            <button type="button" className="db-back" onClick={backToCard}>
              <span aria-hidden>‹</span> Back to the invitation
            </button>
          </div>

          <div className="db-col">
            <div className="db-head">
              <Paper edge="lace" scallop={10} tilt={-0.8}>
                <p className="db-caps-sm">{customValue(content, "insideKicker") || "You are cordially invited to the debut of"}</p>
                <p className={`db-script db-head__name${name ? "" : " db-hint"}`}>{name || (editorPreview ? "Your name" : "")}</p>
                <Flourish className="db-sec__flourish" />
                {when ? <p className="db-head__line">{when}</p> : null}
                {time ? <p className="db-head__line">{time}</p> : null}
                {venue ? <p className="db-head__line db-detail__strong">{venue}</p> : null}
                {address ? <p className="db-head__line">{address}</p> : null}
                <VenueLinks content={content} font="var(--db-serif)" color="var(--db-wine)" size={16} style={{ marginTop: 6 }} />
              </Paper>
              <div className="db-head__seal" aria-hidden>
                <WaxSeal text={customValue(content, "sealText") || "18"} />
              </div>
            </div>

            <div className="db-pair">
            {vis.hostIntro !== false && (paragraphs.length || editorPreview) ? (
              <Section title={first ? `A Note from ${first}` : "A Note"} reveal={reveal} sheet={{ tone: "cream", tilt: 1.4, seed: 2 }} className="db-sec--note">
                {paragraphs.length ? (
                  paragraphs.map((p, i) => (
                    <p key={i} className="db-text">
                      {p.split("\n").map((line, j) => (
                        <span key={j}>
                          {j ? <br /> : null}
                          {line}
                        </span>
                      ))}
                    </p>
                  ))
                ) : (
                  <Hint>Your message to your guests goes here.</Hint>
                )}
              </Section>
            ) : null}

            {vis.dress !== false && (dress || swatches.length || editorPreview) ? (
              <Section title="Dress Code" reveal={reveal} sheet={{ tone: "blush", tilt: -2, seed: 3 }} className="db-sec--dress">
                {dress ? <p className="db-text">{dress}</p> : <Hint>Add a dress code in the Debut details, or switch this section off.</Hint>}
                {swatches.length ? (
                  <div className="db-swatches">
                    {swatches.map((c) => (
                      <span key={c} className="db-swatch" style={{ background: c }} />
                    ))}
                  </div>
                ) : null}
              </Section>
            ) : null}

            </div>

            {vis.schedule !== false && (schedule.length || editorPreview) ? (
              <Section title="The Program" reveal={reveal} sheet={{ tilt: -0.7, seed: 4 }}>
                {schedule.length ? (
                  <ol className="db-program">
                    {schedule.map((s) => (
                      <li key={s.id}>
                        <span className="db-program__time">{timeOf(s.startTime)}</span>
                        <Rosette size={12} />
                        <span className="db-program__what">
                          {s.label}
                          {s.description ? <em>{s.description}</em> : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Hint>Add your program under Schedule: the grand entrance, the cotillion, the 18 Roses…</Hint>
                )}
              </Section>
            ) : null}

            {vis.entourage !== false
              ? groups.length
                ? groups.map((g, gi) => (
                    <Section key={g.id} title={g.title || "Special Guests"} reveal={reveal} icon={<ListGlyph icon={iconFor(g.title)} />} sheet={{ tilt: gi % 2 ? 0.9 : -1.1, seed: 10 + gi, tone: gi % 3 === 2 ? "cream" : "ivory" }} className="db-sec--list">
                      <ol className={`db-names${g.people.filter((p) => p.trim()).length > 6 ? " db-names--two" : ""}`}>
                        {g.people
                          .filter((p) => p.trim())
                          .map((p, i) => (
                            <li key={i} style={{ ["--i" as string]: i } as CSSProperties}>
                              <span className="db-names__n">{i + 1}</span>
                              {p}
                            </li>
                          ))}
                      </ol>
                    </Section>
                  ))
                : editorPreview ? (
                    <Section title="18 Roses" reveal={false} icon={<ListGlyph icon="rose" />}>
                      <Hint>Add your 18 Roses, 18 Candles and 18 Treasures under Entourage & motif (tap “Debut” for the lists). Each gets its own card here.</Hint>
                    </Section>
                  ) : null
              : null}

            {vis.registry !== false && gifts ? (
              <Section title="Gifts" reveal={reveal} sheet={{ tone: "cream", tilt: 1.6, seed: 20 }} className="db-sec--small">
                {content.cashGiftNote ? null : <p className="db-text">Your presence is the most precious gift. Should you wish to give, here’s how.</p>}
                {content.registryLinks.length ? (
                  <div className="db-links">
                    {content.registryLinks.map((r) => (
                      <a key={r.id} className="db-btn db-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                        {r.storeName}
                      </a>
                    ))}
                  </div>
                ) : null}
                <CashGifts
                  content={content}
                  look={{ ink: "var(--db-wine)", muted: "var(--db-wine)", surface: "#fff", line: "color-mix(in srgb, var(--db-gold) 55%, transparent)", bodyFont: "var(--db-serif)", displayFont: "var(--db-serif)", radius: 6 }}
                />
              </Section>
            ) : null}

            {vis.faqs !== false && faqs.length ? (
              <Section title="Good to Know" reveal={reveal} sheet={{ tilt: -1.2, seed: 21 }}>
                <div className="db-faqs">
                  {faqs.map((f) => (
                    <div key={f.id}>
                      <p className="db-faqs__q">{f.question}</p>
                      <p className="db-text">{f.answer}</p>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {over ? (
              <Section title="Thank You" reveal={reveal}>
                <p className="db-text">{customValue(content, "afterParty") || `Thank you for celebrating with ${first || "us"}.`}</p>
              </Section>
            ) : vis.rsvp !== false ? (
              <RsvpReply content={content} editorPreview={editorPreview} reveal={reveal} motion={motion} />
            ) : null}
          </div>

          {credit.show ? (
            <footer className="db-footer">
              <p>
                <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
              </p>
            </footer>
          ) : null}
        </div>
      )}
    </div>
  );
}
