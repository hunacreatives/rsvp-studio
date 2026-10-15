import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import EntourageBlock, { entourageTitle } from "../shared/Entourage";
import { FELT, LaceRibbon, PAPER_GRAIN, STATIONERY_CSS, WaxSeal } from "../shared/stationery";
import { Countdown, EnvelopeStack, Sprig } from "./art";
import { coupleNames, eventIsOver, fullNames, longDate, monogram, placeLine, dotDate, timeOf, timeWords } from "./content";
import RsvpCard from "./RsvpCard";
import { LOVE_LETTER_CSS } from "./styles";

/**
 * Love Letter (wedding), in two pages:
 *  1. The envelope: the whole screen is olive felt paper with faint folds,
 *     "A love letter from" and the couple's names, a lace ribbon across it held
 *     by an ivory monogram seal, and "Open the invitation". On the published
 *     page the seal drops in; tapping it lifts the seal, parts the ribbon and
 *     slides the envelope away.
 *  2. The invitation (#details), on cream paper: the open envelope holding a
 *     photo in an oval mat, the name card and the date card; where, when (the
 *     time in words), a countdown, then the story, the day, what to wear,
 *     travel and stay, gifts, FAQs and a printed reply card; it ends on a photo
 *     band with the monogram.
 *
 * All artwork is drawn in code (../shared/stationery + ./art). Prefers-reduced-
 * motion skips the animation.
 */

const OPEN_MS = 1500;
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
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return { ref, shown };
}

function Block({ title, reveal, children, id }: { title: string; reveal: boolean; children: ReactNode; id?: string }) {
  const { ref, shown } = useReveal(reveal);
  return (
    <section id={id} ref={ref} className={`ll-block${shown ? " is-on" : ""}`}>
      <Sprig />
      <h2 className="ll-script ll-block__title">{title}</h2>
      {children}
    </section>
  );
}

const Hint = ({ children }: { children: ReactNode }) => <p className="ll-hint">{children}</p>;

export default function LoveLetterTemplate({ content, settings, editorPreview = false, live = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced;
  const reveal = live && motion;
  const rootRef = useRef<HTMLDivElement>(null);

  const startInside = live && typeof window !== "undefined" && INSIDE_HASHES.includes(window.location.hash);
  const [page, setPage] = useState<"intro" | "inside">(startInside ? "inside" : "intro");
  const [opening, setOpening] = useState(false);
  const arriving = live && motion && !startInside;

  const toTop = useCallback(() => {
    if (live) window.scrollTo({ top: 0 });
    else rootRef.current?.scrollIntoView({ block: "start" });
  }, [live]);

  useEffect(() => {
    if (!live) return;
    const onPop = () => {
      setOpening(false);
      setPage(INSIDE_HASHES.includes(window.location.hash) ? "inside" : "intro");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [live]);

  useEffect(() => {
    if (startInside && window.location.hash === "#rsvp") setTimeout(() => document.getElementById("rsvp")?.scrollIntoView({ block: "start" }), 300);
  }, [startInside]);

  const open = () => {
    if (opening) return;
    const go = () => {
      setPage("inside");
      setOpening(false);
      if (live) history.pushState(null, "", "#details");
      toTop();
    };
    if (motion) {
      setOpening(true);
      setTimeout(go, OPEN_MS);
    } else go();
  };
  const back = () => {
    if (live && window.location.hash) history.back();
    else {
      setPage("intro");
      toTop();
    }
  };
  const toRsvp = () => document.getElementById("rsvp")?.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });

  const couple = coupleNames(content);
  const names = fullNames(content);
  const mono = monogram(content) || (editorPreview ? "A & B" : "");
  const when = longDate(content.eventDate);
  const words = timeWords(content.eventDate);
  const place = placeLine(content);
  const venue = content.primaryLocation.name?.trim() ?? "";
  const photos = content.galleries[0]?.items ?? [];
  const cover = settings.heroImage?.masterUrl || photos[0]?.image.masterUrl;
  const coverFocal = settings.heroImage?.masterUrl ? settings.heroImage.focalPoint : photos[0]?.image.focalPoint;
  const band = photos[1]?.image.masterUrl || cover;
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const stay = content.accommodations.filter((a) => a.name.trim());
  const travel = content.travelInformation.filter((t) => t.title.trim() || t.body.trim());
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => f.question.trim());
  const groups = (content.entourage ?? []).filter((g) => g.people.some((p) => p.trim()));
  const gifts = content.registryLinks.length > 0 || hasCashGifts(content);
  const over = !editorPreview && eventIsOver(content.eventDate);
  const vis = settings.sectionVisibility;

  const vars = {
    ["--ll-olive" as string]: theme.ink,
    ["--ll-accent" as string]: theme.muted,
    ["--ll-cream" as string]: theme.background,
    ["--ll-script" as string]: theme.displayFont,
    ["--ll-serif" as string]: theme.bodyFont,
    ["--st-paper" as string]: `color-mix(in srgb, ${theme.background} 50%, #fff)`,
    ["--st-env" as string]: theme.ink,
    ["--st-ink" as string]: theme.ink,
    ["--st-lace" as string]: "#eee6d4",
  } as CSSProperties;

  return (
    <div ref={rootRef} className={`ll-root${motion ? " ll-motion" : ""}${arriving ? " ll-arrive" : ""}${opening ? " ll-opening" : ""}`} style={vars}>
      <style>{STATIONERY_CSS + LOVE_LETTER_CSS}</style>

      {page === "intro" ? (
        <header className="ll-intro" style={{ ["--felt" as string]: `url("${FELT}")` } as CSSProperties}>
          {/* faint folds of the envelope */}
          <svg className="ll-folds" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d="M0 0 L50 52 L100 0" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth=".35" vectorEffect="non-scaling-stroke" transform="translate(0 .25)" />
            <path d="M0 0 L50 52 L100 0" fill="none" stroke="#000" strokeOpacity=".22" strokeWidth=".5" vectorEffect="non-scaling-stroke" />
            <path d="M0 100 L50 60 L100 100" fill="none" stroke="#000" strokeOpacity=".14" strokeWidth=".5" vectorEffect="non-scaling-stroke" />
          </svg>

          <div className="ll-intro__top">
            <p className="ll-caps ll-in" style={{ ["--d" as string]: ".2s" }}>{customValue(content, "introLine") || "A love letter from"}</p>
            <p className={`ll-script ll-intro__names ll-in${couple ? "" : " ll-hint"}`} style={{ ["--d" as string]: ".45s" }}>
              {couple || (editorPreview ? "Your names" : "")}
            </p>
          </div>

          <div className="ll-intro__ribbon">
            <div className="ll-ribbon-half ll-ribbon-half--l">
              <LaceRibbon height={64} />
            </div>
            <div className="ll-ribbon-half ll-ribbon-half--r">
              <LaceRibbon height={64} />
            </div>
            <button type="button" className="ll-intro__seal" onClick={open} aria-label="Open the invitation">
              <WaxSeal text={mono} tone="ivory" shape="oval" sprig />
            </button>
          </div>

          <button type="button" className="ll-caps ll-intro__open ll-in" style={{ ["--d" as string]: "1.3s" }} onClick={open}>
            {customValue(content, "openText") || "Open the invitation"}
          </button>
          {credit.show ? (
            <p className="ll-intro__credit">
              <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline" }} />
            </p>
          ) : null}
        </header>
      ) : (
        <div className="ll-inside" style={{ ["--grain" as string]: `url("${PAPER_GRAIN}")` } as CSSProperties}>
          <div className="ll-topbar">
            <button type="button" className="ll-back" onClick={back}>
              <span aria-hidden>‹</span> The envelope
            </button>
          </div>

          <div className="ll-hero">
            <EnvelopeStack names={names} date={dotDate(content.eventDate)} mono={mono} photo={cover} focal={coverFocal} editorHint={editorPreview} />
          </div>

          <div className="ll-where">
            <p className="ll-caps ll-caps--ink">{customValue(content, "meetLine") || "Meet us in"}</p>
            <p className={`ll-script ll-where__place${place ? "" : " ll-hint"}`}>{place || (editorPreview ? "Your town" : "")}</p>
            {venue && venue !== place ? <p className="ll-small-caps">{venue}</p> : null}
            {when ? <p className="ll-small-caps">{when}</p> : editorPreview ? <p className="ll-small-caps ll-hint">on your date</p> : null}
            {words ? <p className="ll-small-caps">{words}</p> : null}
            {customValue(content, "note") ? <p className="ll-small-caps ll-where__note">{customValue(content, "note")}</p> : null}
            <VenueLinks content={content} font="var(--ll-serif)" color="var(--ll-olive)" size={15} style={{ marginTop: 6 }} />
            {vis.countdown !== false && content.eventDate && !over ? <Countdown iso={content.eventDate} live={live || editorPreview} /> : null}
            {vis.rsvp !== false && !over ? (
              <button type="button" className="ll-btn" onClick={toRsvp}>
                {customValue(content, "replyButton") || "Kindly reply"}
              </button>
            ) : null}
          </div>

          <main className="ll-blocks">
            {vis.hostIntro !== false && (paragraphs.length || editorPreview) ? (
              <Block title="Our Story" reveal={reveal}>
                {paragraphs.length ? paragraphs.map((p, i) => <p key={i} className="ll-text">{p}</p>) : <Hint>Your story or a note to your guests goes here.</Hint>}
              </Block>
            ) : null}

            {vis.schedule !== false && (schedule.length || editorPreview) ? (
              <Block title="The Day" reveal={reveal}>
                {schedule.length ? (
                  <ol className="ll-day">
                    {schedule.map((s) => (
                      <li key={s.id}>
                        <span className="ll-day__time">{timeOf(s.startTime)}</span>
                        <span className="ll-day__what">
                          {s.label}
                          {s.description ? <em>{s.description}</em> : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Hint>Add the order of the day under Schedule.</Hint>
                )}
              </Block>
            ) : null}

            {vis.dress !== false && (dress || swatches.length || editorPreview) ? (
              <Block title="What to Wear" reveal={reveal}>
                {dress ? <p className="ll-text">{dress}</p> : <Hint>Add a dress code in the Love Letter details, or switch this section off.</Hint>}
                {swatches.length ? (
                  <div className="ll-swatches">
                    {swatches.map((c) => (
                      <span key={c} style={{ background: c }} />
                    ))}
                  </div>
                ) : null}
              </Block>
            ) : null}

            {vis.entourage !== false && groups.length ? (
              <Block title={entourageTitle(content)} reveal={reveal}>
                <EntourageBlock content={{ ...content, motifColors: [] }} heading={false} ink="var(--ll-olive)" muted="var(--ll-olive)" displayFont="var(--ll-serif)" bodyFont="var(--ll-serif)" />
              </Block>
            ) : null}

            {vis.travelInformation !== false && travel.length ? (
              <Block title="Getting There" reveal={reveal}>
                {travel.map((t) => (
                  <div key={t.id} className="ll-item">
                    {t.title ? <p className="ll-item__title">{t.title}</p> : null}
                    <p className="ll-text">{t.body}</p>
                  </div>
                ))}
              </Block>
            ) : null}

            {vis.accommodations !== false && stay.length ? (
              <Block title="Where to Stay" reveal={reveal}>
                {stay.map((a) => (
                  <div key={a.id} className="ll-item">
                    <p className="ll-item__title">{a.bookingUrl ? <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer">{a.name}</a> : a.name}</p>
                    {a.addressLine ? <p className="ll-text">{a.addressLine}</p> : null}
                    {a.notes ? <p className="ll-text ll-text--soft">{a.notes}</p> : null}
                  </div>
                ))}
              </Block>
            ) : null}

            {vis.registry !== false && gifts ? (
              <Block title="Gifts" reveal={reveal}>
                {content.cashGiftNote ? null : <p className="ll-text">Your presence is the greatest gift. Should you wish to give, here’s how.</p>}
                {content.registryLinks.length ? (
                  <div className="ll-links">
                    {content.registryLinks.map((r) => (
                      <a key={r.id} className="ll-btn ll-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                        {r.storeName}
                      </a>
                    ))}
                  </div>
                ) : null}
                <CashGifts content={content} look={{ ink: "var(--ll-olive)", muted: "var(--ll-olive)", surface: "#fff", line: "color-mix(in srgb, var(--ll-olive) 25%, transparent)", bodyFont: "var(--ll-serif)", displayFont: "var(--ll-serif)", radius: 4 }} />
              </Block>
            ) : null}

            {vis.faqs !== false && faqs.length ? (
              <Block title="Good to Know" reveal={reveal}>
                {faqs.map((f) => (
                  <div key={f.id} className="ll-item">
                    <p className="ll-item__title">{f.question}</p>
                    <p className="ll-text">{f.answer}</p>
                  </div>
                ))}
              </Block>
            ) : null}

            {over ? (
              <Block title="Thank You" reveal={reveal}>
                <p className="ll-text">{customValue(content, "afterParty") || `Thank you for celebrating with ${couple || "us"}.`}</p>
              </Block>
            ) : vis.rsvp !== false ? (
              <RsvpCard content={content} editorPreview={editorPreview} reveal={reveal} />
            ) : null}

            <p className="ll-caps ll-caps--ink ll-closing">{customValue(content, "closing") || "We look forward to celebrating together"}</p>
          </main>

          <div className="ll-band" style={band ? ({ ["--band" as string]: `url("${band}")` } as CSSProperties) : ({ ["--felt" as string]: `url("${FELT}")` } as CSSProperties)}>
            <div className={`ll-band__bg${band ? "" : " ll-band__bg--felt"}`} aria-hidden />
            <div className="ll-band__seal">
              <WaxSeal text={mono} tone="ivory" shape="oval" sprig />
            </div>
            {credit.show ? (
              <p className="ll-band__credit">
                <CreditLine linkStyle={{ color: "inherit", textDecoration: "underline", fontWeight: 600 }} />
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
