import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { customValue } from "../../content/custom";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { Countdown } from "../shared/Countdown";
import { EnvelopeBack, Flap, Pocket, STATIONERY_CSS, WaxSeal } from "../shared/stationery";
import { Carousel, DressFigures, EMBOSS, READY, dressColours, paintingUrl, useBriefMode } from "./art";
import { BriefDock, HeroArt, Painting, Pin } from "./lineart";
import { coupleNames, dayMonth, eventIsOver, heroDate, monogram, storyEntries, timeOf } from "./content";
import RsvpBlock from "./RsvpBlock";
import { PROMENADE_CSS } from "./styles";

/**
 * Promenade (wedding): a sealed white envelope with an embossed floral paper
 * and a gold monogram seal ("Skip intro" at the bottom). Tapping the seal opens
 * the flap and reveals the site: a full-screen hero (the couple's photo, or the
 * hero painting), then Countdown, Our Story (a dated timeline), Pictures (a
 * carousel), Program (a dot timeline), Dress Code (swatches), Venue, Where to
 * Stay, Gifts, FAQs (an accordion) and RSVP (gold confetti on a yes).
 *
 * The watercolours are painted by the studio's designers; until each arrives,
 * its slot is empty for guests. ?brief=1 turns the page into the designers'
 * brief (see art.tsx).
 */

const OPEN_MS = 1700;
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

function Sec({ title, sub, reveal, children, band = "cream", id }: { title: string; sub?: string; reveal: boolean; children: ReactNode; band?: "cream" | "white"; id?: string }) {
  const { ref, shown } = useReveal(reveal);
  return (
    <section id={id} ref={ref} className={`pm-sec pm-sec--${band}${shown ? " is-on" : ""}`}>
      <div className="pm-sec__in">
        <h2 className="pm-script pm-sec__title">{title}</h2>
        {sub ? <p className="pm-sec__sub">{sub}</p> : null}
        {children}
      </div>
    </section>
  );
}

const Hint = ({ children }: { children: ReactNode }) => <p className="pm-hint">{children}</p>;

export default function PromenadeTemplate({ content, settings, editorPreview = false, live = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const motion = !reduced;
  const reveal = live && motion;
  const brief = useBriefMode();
  const rootRef = useRef<HTMLDivElement>(null);

  const startInside = live && typeof window !== "undefined" && INSIDE_HASHES.includes(window.location.hash);
  const [page, setPage] = useState<"intro" | "site">(startInside ? "site" : "intro");
  const [opening, setOpening] = useState(false);
  const showIntro = page === "intro";

  const toTop = useCallback(() => {
    if (live) window.scrollTo({ top: 0 });
    else rootRef.current?.scrollIntoView({ block: "start" });
  }, [live]);
  useEffect(() => {
    if (!live) return;
    const onPop = () => {
      setOpening(false);
      setPage(INSIDE_HASHES.includes(window.location.hash) ? "site" : "intro");
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
      setPage("site");
      setOpening(false);
      if (live) history.pushState(null, "", "#details");
      toTop();
    };
    if (motion) {
      setOpening(true);
      setTimeout(go, OPEN_MS);
    } else go();
  };

  const couple = coupleNames(content);
  const mono = monogram(content) || (editorPreview ? "A & B" : "");
  const date = heroDate(content.eventDate);
  const photos = (content.galleries[0]?.items ?? []).filter((g) => g.image?.masterUrl);
  const heroPhoto = settings.heroImage?.masterUrl || photos[0]?.image.masterUrl;
  const heroFocal = settings.heroImage?.masterUrl ? settings.heroImage.focalPoint : photos[0]?.image.focalPoint;
  const story = storyEntries(content.story);
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dress = customValue(content, "dressCode");
  const swatches = (content.motifColors ?? []).filter((c) => /^#[0-9a-f]{3,8}$/i.test(c));
  const venue = content.primaryLocation.name?.trim() ?? "";
  const address = content.primaryLocation.addressLine?.trim() ?? "";
  const stay = content.accommodations.filter((a) => a.name.trim());
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order).filter((f) => f.question.trim());
  const gifts = content.registryLinks.length > 0 || hasCashGifts(content);
  const over = !editorPreview && eventIsOver(content.eventDate);
  const vis = settings.sectionVisibility;
  const slot = (name: Parameters<typeof Painting>[0]["name"], className?: string) => <Painting name={name} brief={brief} className={className} />;

  const vars = {
    ["--pm-cream" as string]: theme.background,
    ["--pm-ink" as string]: theme.ink,
    ["--pm-gold" as string]: theme.muted,
    ["--pm-script" as string]: theme.displayFont,
    ["--pm-sans" as string]: theme.bodyFont,
    ["--pm-serif" as string]: '"Playfair Display", Georgia, serif',
    ["--st-paper" as string]: "#fffdf8",
    ["--st-env" as string]: "#f2ede3",
    ["--st-fold-shadow" as string]: ".16",
    ["--st-flap-shadow" as string]: ".2",
    ["--st-ink" as string]: theme.ink,
  } as CSSProperties;

  return (
    <div ref={rootRef} className={`pm-root${motion ? " pm-motion" : ""}${opening ? " pm-opening" : ""}${brief ? " pm-briefing" : ""}`} style={vars}>
      <style>{STATIONERY_CSS + PROMENADE_CSS}</style>

      {showIntro ? (
        <header className="pm-intro" onClick={open} style={{ ["--emboss" as string]: `url("${READY.envelope ? paintingUrl("envelope") : EMBOSS}")` } as CSSProperties}>
          <div className="pm-intro__env">
            <EnvelopeBack />
          </div>
          <div className="pm-intro__env pm-intro__pocket">
            <Pocket />
          </div>
          <div className="pm-intro__env pm-intro__flap">
            <Flap />
          </div>
          <div className="pm-intro__paper" aria-hidden />
          <button type="button" className="pm-intro__seal" onClick={(e) => (e.stopPropagation(), open())} aria-label="Open the invitation">
            {READY.seal ? (
              <span className="pm-seal-photo">
                <img src={paintingUrl("seal")} alt="" />
                <span>{mono}</span>
              </span>
            ) : (
              <WaxSeal text={mono} tone="gold" />
            )}
          </button>
          {brief ? (
            <>
              <Pin name="envelope" style={{ position: "absolute", left: "16%", top: "18%", zIndex: 7 }} />
              <Pin name="seal" style={{ position: "absolute", left: "calc(50% + clamp(60px, 15cqw, 95px))", top: "calc(55.5% - clamp(60px, 15cqw, 95px))", zIndex: 7 }} />
            </>
          ) : null}
          <button type="button" className="pm-skip" onClick={(e) => (e.stopPropagation(), open())}>
            {customValue(content, "skipText") || "Skip intro"}
          </button>
        </header>
      ) : (
        <div className="pm-site">
          <header className={`pm-hero${(heroPhoto && !brief) || READY.hero ? "" : " pm-hero--plain"}`}>
            {heroPhoto && !brief ? (
              <img className="pm-hero__img" src={heroPhoto} alt="" style={{ objectPosition: `${(heroFocal?.x ?? 0.5) * 100}% ${(heroFocal?.y ?? 0.4) * 100}%` }} />
            ) : READY.hero ? (
              <img className="pm-hero__img" src={paintingUrl("hero")} alt="" />
            ) : (
              <HeroArt />
            )}
            {brief ? <Pin name="hero" style={{ position: "absolute", right: "8%", top: "12%", zIndex: 3 }} /> : null}
            {(
              <div className="pm-hero__text">
                <p className="pm-hero__kicker">{customValue(content, "heroKicker") || "We are getting married"}</p>
                <h1 className={`pm-hero__names${couple ? "" : " pm-hint"}`}>{couple || (editorPreview ? "Your names" : "")}</h1>
                <p className="pm-hero__line">{customValue(content, "heroLine") || "Join us to celebrate our special day"}</p>
                {date ? <p className="pm-hero__date">{date}</p> : null}
                <span className="pm-hero__arrow" aria-hidden>
                  ↓
                </span>
              </div>
            )}
          </header>

          {vis.countdown !== false && content.eventDate && !over ? (
            <Sec title="Countdown" reveal={reveal} band="white">
              {slot("clock", "pm-art--clock")}
              <p className="pm-text">
                {customValue(content, "countdownLine") || `We are excited to celebrate our wedding on ${dayMonth(content.eventDate) ?? "the day"}.`}
              </p>
              <Countdown iso={content.eventDate} live={live || editorPreview} prefix="pm" />
            </Sec>
          ) : null}

          {vis.hostIntro !== false && (story.length || editorPreview || brief) ? (
            <Sec title="Our Story" reveal={reveal}>
              {slot("garland", "pm-art--garland")}
              {story.length ? (
                <ol className="pm-story">
                  {story.map((s, i) => (
                    <li key={i}>
                      <span className="pm-story__dot" aria-hidden />
                      {s.year ? <p className="pm-story__year">{s.year}</p> : null}
                      {s.title ? <p className="pm-script pm-story__title">{s.title}</p> : null}
                      <p className="pm-text pm-text--left">{s.body}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <Hint>Tell your story in a few moments. Start each paragraph with a line like “2021 · How We Met”.</Hint>
              )}
            </Sec>
          ) : null}

          {vis.gallery !== false && (photos.length || editorPreview) ? (
            <Sec title="Pictures" sub={customValue(content, "picturesLine") || "A few moments from our journey together"} reveal={reveal}>
              {photos.length ? (
                <Carousel items={photos.map((p) => ({ url: p.image.masterUrl, alt: p.image.alt || p.caption || "", focal: p.image.focalPoint }))} />
              ) : (
                <Hint>Add your photos under Photos.</Hint>
              )}
            </Sec>
          ) : null}

          {vis.schedule !== false && (schedule.length || editorPreview) ? (
            <Sec title="Program" reveal={reveal} band="white">
              {schedule.length ? (
                <ol className="pm-program">
                  {schedule.map((s, i) => (
                    <li key={s.id} className={i === 0 ? "is-first" : ""}>
                      <span className="pm-program__dot" aria-hidden />
                      <span className="pm-program__time">{timeOf(s.startTime)}</span>
                      <span className="pm-program__what">
                        {s.label}
                        {s.description ? <em>{s.description}</em> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <Hint>Add the order of the day under Schedule.</Hint>
              )}
            </Sec>
          ) : null}

          {vis.dress !== false && (dress || swatches.length || editorPreview || brief) ? (
            <Sec title="Dress Code" reveal={reveal}>
              <DressFigures {...dressColours(swatches, { suit: "#2f2c33", gowns: [theme.muted, "#d9a7a0"] })} />
              {dress ? <p className="pm-text">{dress}</p> : <Hint>Add a dress code in the Promenade details, or switch this section off.</Hint>}
              {swatches.length ? (
                <div className="pm-swatches">
                  {swatches.map((c) => (
                    <span key={c}>
                      <i style={{ background: c }} />
                      <b>{c.toLowerCase()}</b>
                    </span>
                  ))}
                </div>
              ) : null}
            </Sec>
          ) : null}

          {vis.venue !== false && (venue || address || editorPreview || brief) ? (
            <Sec title="Venue" reveal={reveal} band="white">
              {slot("venue", "pm-art--venue")}
              {venue ? <p className="pm-venue__name">{venue}</p> : editorPreview ? <Hint>Venue</Hint> : null}
              {address ? <p className="pm-text">{address}</p> : null}
              <VenueLinks content={content} font="var(--pm-sans)" color="var(--pm-ink)" size={14} />
            </Sec>
          ) : null}

          {vis.accommodations !== false && (stay.length || brief) ? (
            <Sec title="Accommodations" reveal={reveal}>
              {slot("stay", "pm-art--stay")}
              <p className="pm-text">{customValue(content, "stayLine") || "We’ve gathered a few places nearby for our guests."}</p>
              <div className="pm-stays">
                {stay.map((a) => (
                  <div key={a.id} className="pm-stay">
                    <p className="pm-stay__name">{a.name}</p>
                    {a.addressLine ? <p className="pm-text pm-text--small">{a.addressLine}</p> : null}
                    {a.notes ? <p className="pm-text pm-text--small pm-text--soft">{a.notes}</p> : null}
                    {a.bookingUrl ? (
                      <a className="pm-link" href={a.bookingUrl} target="_blank" rel="noopener noreferrer">
                        Book a room
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </Sec>
          ) : null}

          {vis.registry !== false && gifts ? (
            <Sec title="Gifts" reveal={reveal} band="white">
              {content.cashGiftNote ? null : <p className="pm-text">Your presence is the greatest gift. Should you wish to give, here’s how.</p>}
              {content.registryLinks.length ? (
                <div className="pm-links">
                  {content.registryLinks.map((r) => (
                    <a key={r.id} className="pm-btn pm-btn--line" href={r.url || undefined} target="_blank" rel="noopener noreferrer">
                      {r.storeName}
                    </a>
                  ))}
                </div>
              ) : null}
              <CashGifts content={content} look={{ ink: "var(--pm-ink)", muted: "var(--pm-ink)", surface: "#fff", line: "color-mix(in srgb, var(--pm-gold) 50%, transparent)", bodyFont: "var(--pm-sans)", displayFont: "var(--pm-sans)", radius: 10 }} />
            </Sec>
          ) : null}

          {vis.faqs !== false && faqs.length ? (
            <Sec title="FAQs" reveal={reveal} band="white">
              <div className="pm-faqs">
                {faqs.map((f) => (
                  <details key={f.id}>
                    <summary>{f.question}</summary>
                    <p className="pm-text pm-text--left">{f.answer}</p>
                  </details>
                ))}
              </div>
            </Sec>
          ) : null}

          {over ? (
            <Sec title="Thank You" reveal={reveal}>
              <p className="pm-text">{customValue(content, "afterParty") || `Thank you for celebrating with ${couple || "us"}.`}</p>
            </Sec>
          ) : vis.rsvp !== false ? (
            <Sec title="RSVP" reveal={reveal} id="rsvp">
              <RsvpBlock content={content} editorPreview={editorPreview || brief} motion={motion} />
            </Sec>
          ) : null}

          {brief ? <BriefDock /> : null}
          {credit.show ? (
            <footer className="pm-footer">
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
