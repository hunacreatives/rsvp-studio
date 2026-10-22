import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import EntourageBlock, { entourageTitle } from "../shared/Entourage";
import { ArcText, CrossedPaddles, Sparkle, Sticker, WavyFrame, mixHex } from "./art";
import { bringList, dateLine, eventIsOver, headlineLines, hostNames, insideTitle, occasionLine, timeOf } from "./content";
import RsvpCourt from "./RsvpCourt";
import { PhotoSlot } from "../shared/PhotoSlot";
import { photosOf } from "../shared/reveal";
import { PICKLEBALL_CSS } from "./styles";

/**
 * Pickleball, in two pages like a card and its insert:
 *  1. The intro: the invitation card on pink-and-cream painted stripes (wavy
 *     court-green frame, crossed paddles, a retro script headline, the
 *     details). "RSVP here" turns the page.
 *  2. Inside: an arched header ("Let's hit the court" curved over the top),
 *     then panels (the plan, what to wear, what to bring, gifts, FAQs) and the
 *     RSVP, which ends in a burst of pickleballs, with watercolour stickers
 *     floating in the margins. After the event, the RSVP
 *     becomes a "What a night!" thank-you.
 *
 * The vector art is in art.tsx; the watercolour stickers come from the
 * studio's own "Claudy at 30" site (public/event-templates/pickleball/).
 *
 * Motion: an opening on the published page only (the ball serves in, the
 * frame draws itself, the paddles swing in, the words rise; tap to skip), a
 * page turn, panels that rise in as you scroll, and gentle loops. Prefers-
 * reduced-motion turns all of it off. On the published page the inside page
 * is #details, so the phone's back button returns to the card.
 */

const OPENING_MS = 3400;
const TURN_MS = 650;
const INSIDE_HASHES = ["#details", "#rsvp"];

/** Fade/rise in when first scrolled to (published page); otherwise just there. */
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
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return { ref, shown };
}

function Card({ title, reveal, children, id }: { title: string; reveal: boolean; children: ReactNode; id?: string }) {
  const { ref, shown } = useReveal(reveal);
  return (
    <section id={id} ref={ref} className={`pb-c${shown ? " is-on" : ""}`}>
      <h2 className="pb-serif pb-c__title">{title}</h2>
      {children}
    </section>
  );
}

/** "Rina’s 30th Birthday" with any number-word ("30th") picked out in the accent gradient. */
function TitleWords({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((w, i) => (/\d/.test(w) ? <span key={i} className="pb-grad">{w}</span> : <span key={i}>{w}</span>))}
    </>
  );
}

const Hint = ({ children }: { children: ReactNode }) => <p className="pb-hint">{children}</p>;

export default function PickleballTemplate({ content, settings, editorPreview = false, live = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced;
  const reveal = live && motion;
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Which page: the card, or inside. The published page keeps it in the URL (#details).
  const startInside = live && typeof window !== "undefined" && INSIDE_HASHES.includes(window.location.hash);
  const [page, setPage] = useState<"intro" | "inside">(startInside ? "inside" : "intro");
  const [turning, setTurning] = useState(false);

  // The opening plays once, on the published page, when it opens on the card. A tap skips it.
  const [opening, setOpening] = useState(live && motion && !startInside);
  useEffect(() => {
    if (!opening) return;
    const t = setTimeout(() => setOpening(false), OPENING_MS);
    return () => clearTimeout(t);
  }, [opening]);

  // The card always fits one screen on the published page: scaled down (zoom) just enough
  // to fit the window with the credit line under it, re-checked on resize and once fonts load.
  useLayoutEffect(() => {
    if (!live || page !== "intro") return;
    const card = cardRef.current;
    const intro = card?.parentElement;
    if (!card || !intro) return;
    const fit = () => {
      card.style.zoom = "";
      const cs = getComputedStyle(intro);
      const credit = intro.querySelector<HTMLElement>(".pb-intro__credit");
      const creditH = credit ? credit.offsetHeight + parseFloat(getComputedStyle(credit).marginTop || "0") : 0;
      const avail = window.innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - creditH - 2;
      const z = Math.min(1, avail / card.offsetHeight);
      if (z < 0.995) card.style.zoom = String(Math.max(0.55, z));
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

  // Back/forward on the published page.
  useEffect(() => {
    if (!live) return;
    const onPop = () => {
      setTurning(false);
      setPage(INSIDE_HASHES.includes(window.location.hash) ? "inside" : "intro");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [live]);

  // Arriving on #rsvp (a shared link): straight to the form.
  useEffect(() => {
    if (startInside && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [startInside]);

  const openInside = () => {
    setOpening(false);
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

  const names = hostNames(content);
  const lines = headlineLines(content);
  const kicker = customValue(content, "kicker") || "Join us for";
  const archText = customValue(content, "archText") || "Let’s hit the court";
  const buttonText = customValue(content, "introButton") || "RSVP here";
  const when = dateLine(content.eventDate);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const wear = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const bring = bringList(content);
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => f.question.trim());
  const gifts = content.registryLinks.length > 0 || hasCashGifts(content);
  const over = !editorPreview && eventIsOver(content.eventDate);
  const vis = settings.sectionVisibility;
  const shots = photosOf(content).slice(0, 3).map((g) => g.image);

  const vars = {
    // On the gallery card the first screen is the card (4:3), not the browser window.
    ...(gallery ? { ["--pb-vh" as string]: ".75cqw" } : {}),
    ["--pb-ink" as string]: theme.ink,
    ["--pb-pink" as string]: theme.muted,
    ["--pb-cream" as string]: theme.background,
    ["--pb-script" as string]: theme.displayFont,
    ["--pb-sans" as string]: theme.bodyFont,
    ["--pb-paper" as string]: mixHex(theme.background, "#ffffff", 0.55),
    ["--pb-line" as string]: mixHex(theme.muted, theme.ink, 0.85),
    ["--pb-soft" as string]: mixHex(theme.ink, theme.background, 0.62),
    ["--pb-serif" as string]: '"Fraunces", Georgia, "Times New Roman", serif',
  };
  // The painted stripes (a texture used as a mask), in the palette's pink.
  const stripeColor = mixHex(theme.muted, theme.background, 0.78);

  const facts = (
    <>
      {when ? <p>{when}</p> : editorPreview ? <p className="pb-hint">Date &amp; time</p> : null}
      {venue ? <p>{venue}</p> : editorPreview ? <p className="pb-hint">Venue</p> : null}
      {address ? <p>{address}</p> : null}
    </>
  );

  return (
    <div
      ref={rootRef}
      className={`pb-root${opening ? " pb-opening" : ""}${motion ? " pb-motion" : ""}${turning ? " pb-turning" : ""}`}
      style={vars}
      onPointerDown={opening ? () => setOpening(false) : undefined}
    >
      <style>{PICKLEBALL_CSS}</style>
      <div className="pb-stripes" style={{ backgroundColor: stripeColor }} aria-hidden />

      {page === "intro" ? (
        <header className="pb-intro">
          {/* The card stays just the card: two green sparkles, no watercolour stickers. */}
          <div className="pb-stickers" aria-hidden>
            <Sparkle className="pb-st pb-st--spark1" />
            <Sparkle className="pb-st pb-st--spark2" />
          </div>

          <div className="pb-card" ref={cardRef}>
            <WavyFrame size="lg" />
            <div className="pb-card__body">
              <CrossedPaddles />
              <div className="pb-arc pb-rise" style={{ ["--d" as string]: "1.55s" }}>
                <ArcText text={kicker} />
              </div>
              <h1 className="pb-script pb-headline pb-rise" style={{ ["--d" as string]: "1.75s" }}>
                {lines.map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </h1>
              <p className="pb-line pb-rise" style={{ ["--d" as string]: "2.05s" }}>
                {occasionLine(content)}
              </p>
              <p className={`pb-name pb-rise${names ? "" : " pb-hint"}`} style={{ ["--d" as string]: "2.2s" }}>
                {names || (editorPreview ? "Your name" : "")}
              </p>
              <div className="pb-facts pb-rise" style={{ ["--d" as string]: "2.4s" }}>
                {facts}
              </div>
              <div className="pb-rise" style={{ ["--d" as string]: "2.65s" }}>
                <button type="button" className="pb-btn pb-btn--solid pb-intro__go" onClick={openInside}>
                  {buttonText}
                  <span aria-hidden className="pb-intro__arrow">›</span>
                </button>
              </div>
            </div>
          </div>
          {credit.show ? (
            <p className="pb-intro__credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline" }} />
            </p>
          ) : null}
        </header>
      ) : (
        <div className="pb-inside">
          <div className="pb-topbar">
            <button type="button" className="pb-back" onClick={backToCard}>
              <span aria-hidden>‹</span> Back to the invitation
            </button>
          </div>

          <div className="pb-arch">
            {/* Watercolour stickers overlapping the arch's edges. */}
            <div className="pb-arch__stickers" aria-hidden>
              <Sticker name="spritz" className="pb-as pb-as--1" />
              <Sticker name="paddle-check" className="pb-as pb-as--2" />
              <Sticker name="champagne" className="pb-as pb-as--3" />
              <Sticker name="fan" className="pb-as pb-as--4" />
              <Sticker name="towel" className="pb-as pb-as--5" />
              <Sticker name="martini" className="pb-as pb-as--6" />
              <Sticker name="bucket" className="pb-as pb-as--7" />
              <Sticker name="bottle" className="pb-as pb-as--8" />
              <Sticker name="shirt" className="pb-as pb-as--9" />
            </div>

            <div className="pb-arch__text">
              <ArcText text={archText} variant="arch" />
            </div>
            <CrossedPaddles small />
            <p className="pb-eyebrow">{customValue(content, "insideKicker") || "Please join us in celebrating"}</p>
            <h1 className={`pb-serif pb-arch__title${names ? "" : " pb-hint"}`}>
              <TitleWords text={insideTitle(content) || (editorPreview ? "Your celebration" : "")} />
            </h1>
            {customValue(content, "tagline") ? <p className="pb-eyebrow pb-eyebrow--soft">{customValue(content, "tagline")}</p> : null}
            <div className="pb-arch__facts">{facts}</div>
            <VenueLinks content={content} font="var(--pb-sans)" color="var(--pb-ink)" size={14} />
            <hr className="pb-rule" />

            {/* Court moments: up to three snapshots, tilted like prints (placeholders in the builder). */}
            {vis.gallery !== false && (shots.length || editorPreview) ? (
              <div className="pb-shots" aria-label="Photos">
                {(shots.length ? shots : [null, null, null]).map((img, i) => (
                  <figure key={img?.id ?? i} className={`pb-shot pb-shot--${i + 1}`}>
                    <PhotoSlot image={img} editorPreview={editorPreview} className="pb-shot__img" />
                  </figure>
                ))}
              </div>
            ) : null}

            <div className="pb-cards">
              {vis.hostIntro !== false && (paragraphs.length || editorPreview) ? (
                <Card title="Let’s Rally" reveal={reveal}>
                  {paragraphs.length ? (
                    paragraphs.map((p, i) => (
                      <p key={i} className="pb-text">
                        {p.split("\n").map((line, j) => (
                          <span key={j}>
                            {j ? <br /> : null}
                            {line}
                          </span>
                        ))}
                      </p>
                    ))
                  ) : (
                    <Hint>Your invitation message goes here.</Hint>
                  )}
                </Card>
              ) : null}

              {vis.schedule !== false && (schedule.length || editorPreview) ? (
                <Card title="Game Plan" reveal={reveal}>
                  {schedule.length ? (
                    <ol className="pb-plan">
                      {schedule.map((s) => (
                        <li key={s.id}>
                          <span className="pb-plan__time">{timeOf(s.startTime)}</span>
                          <span className="pb-plan__dot" aria-hidden />
                          <span className="pb-plan__what">
                            <strong>{s.label}</strong>
                            {s.description ? <span>{s.description}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <Hint>Add the plan for the day under Schedule, like “3:00 pm — Warm-up rally”.</Hint>
                  )}
                </Card>
              ) : null}

              {vis.wear !== false && (wear || swatches.length || editorPreview) ? (
                <Card title="What to Wear" reveal={reveal}>
                  {wear ? <p className="pb-text">{wear}</p> : <Hint>Add a dress code in the Pickleball details, or switch this section off.</Hint>}
                  {swatches.length ? (
                    <div className="pb-swatches">
                      {swatches.map((c) => (
                        <span key={c} className="pb-swatch" style={{ background: c }} />
                      ))}
                    </div>
                  ) : null}
                </Card>
              ) : null}

              {vis.bring !== false && (bring.length || editorPreview) ? (
                <Card title="What to Bring" reveal={reveal}>
                  {bring.length ? (
                    <ul className="pb-bring">
                      {bring.map((b, i) => (
                        <li key={i}>
                          <span className="pb-bring__tick" aria-hidden>
                            <svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Hint>List what guests should bring in the Pickleball details, or switch this section off.</Hint>
                  )}
                </Card>
              ) : null}

              {(content.entourage ?? []).some((g) => g.people.length) ? (
                <Card title={entourageTitle(content)} reveal={reveal}>
                  <EntourageBlock content={{ ...content, motifColors: [] }} heading={false} ink="var(--pb-ink)" muted="var(--pb-soft)" displayFont="var(--pb-sans)" bodyFont="var(--pb-sans)" />
                </Card>
              ) : null}

              {vis.registry !== false && gifts ? (
                <Card title="Gift Ideas" reveal={reveal}>
                  {content.cashGiftNote ? null : <p className="pb-text">Your presence is enough. If you’d like to give, here’s how.</p>}
                  {content.registryLinks.length ? (
                    <div className="pb-links">
                      {content.registryLinks.map((r) => (
                        <a key={r.id} className="pb-btn pb-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                          {r.storeName}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <CashGifts
                    content={content}
                    look={{ ink: "var(--pb-ink)", muted: "var(--pb-soft)", surface: "var(--pb-paper)", line: "color-mix(in srgb, var(--pb-ink) 18%, transparent)", bodyFont: "var(--pb-sans)", displayFont: "var(--pb-sans)", radius: 18 }}
                  />
                </Card>
              ) : null}

              {vis.faqs !== false && faqs.length ? (
                <Card title="Good to Know" reveal={reveal}>
                  <div className="pb-faqs">
                    {faqs.map((f) => (
                      <div key={f.id}>
                        <p className="pb-faqs__q">{f.question}</p>
                        <p className="pb-text">{f.answer}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {over ? (
                <Card title="What a Night!" reveal={reveal}>
                  <p className="pb-text">{customValue(content, "afterParty") || `Thank you for celebrating with ${names || "us"}.`}</p>
                </Card>
              ) : vis.rsvp !== false ? (
                <RsvpCourt content={content} editorPreview={editorPreview} reveal={reveal} motion={motion} />
              ) : null}
            </div>
          </div>

          {credit.show ? (
            <footer className="pb-footer">
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
