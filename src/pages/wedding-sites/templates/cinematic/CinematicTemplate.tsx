import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { CINEMATIC_CSS } from "./styles";
import { useParticles } from "./useParticles";
import { useScrollScrubVideo } from "./useScrollScrubVideo";
import { formatWhen, headlineLines, venueLine } from "./content";
import Polaroids from "./sections/Polaroids";
import RsvpSection from "./sections/RsvpSection";
import { Heart } from "./sections/Heart";

/**
 * The "gel-at-30" design, rebuilt 1:1 from the real site
 * (~/angelica-birthday-website): a watercolor floral background that stays
 * put (a scroll-scrubbed blooming video on phones), the headline shown
 * full-screen first and then the page revealing in stages, two tilted
 * polaroids with stickers, handwritten details, and a frosted RSVP card.
 *
 * Template-only fields (index.tsx): headline, dress code, RSVP card wording.
 */

// The reference's reveal timeline, in ms from page load.
const T = { fade: 2200, headline: 3000, message: 3800, details: 4600 };

export default function CinematicTemplate({ content, settings, editorPreview = false, live = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useParticles(canvasRef, !reduced);

  // A custom background photo replaces the watercolor on every screen (no blooming video).
  const customBg = settings.heroImage?.masterUrl;
  const bgImage = customBg ?? "/event-templates/cinematic/background.webp";
  const useVideo = !customBg && !reduced;
  useScrollScrubVideo(videoRef, useVideo);

  // Staged reveal: only on the published page. Builder and gallery cards show the finished page.
  const animate = live && !reduced;
  const [stage, setStage] = useState(animate ? 0 : 4);
  const [introFading, setIntroFading] = useState(false);
  useEffect(() => {
    if (!animate) return;
    const timers = [
      setTimeout(() => setIntroFading(true), T.fade),
      setTimeout(() => setStage(1), T.headline),
      setTimeout(() => setStage(2), T.message),
      setTimeout(() => setStage(3), T.details),
    ];
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  const lines = headlineLines(content);
  const nowrap = lines.length > 1 && lines.every((l) => l.length <= 18);
  const headline = (
    <h1 className={`cn-headline ${nowrap ? "cn-headline--nowrap" : "cn-headline--wrap"}`}>
      {lines.length ? lines.map((l, i) => <span key={i}>{l}</span>) : <span className="cn-hint">{editorPreview ? "Your headline" : ""}</span>}
    </h1>
  );
  const when = formatWhen(content.eventDate);
  const venue = venueLine(content);
  const paragraphs = (content.story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const photos = content.galleries[0]?.items ?? [];
  const on = (n: number) => (stage >= n ? " is-on" : "");

  // Colours the reference hard-codes, taken from the theme so Look & Feel can recolour them.
  const vars = {
    ["--cn-rose" as string]: theme.ink,
    ["--cn-sage" as string]: theme.muted,
    ["--cn-script" as string]: theme.displayFont,
    ["--cn-hand" as string]: theme.bodyFont,
    ["--cn-sans" as string]: "Montserrat, Inter, system-ui, sans-serif",
  };
  const introBg = settings.paletteId === "blush-sage" || !settings.paletteId ? "#F5EDE6" : theme.background;

  return (
    <div className="cn-root" style={{ ...vars, background: theme.background }}>
      <style>{CINEMATIC_CSS}</style>

      <div className={`cn-bg${useVideo ? " cn-bg--video" : ""}`} aria-hidden>
        <img className="cn-bg__image" src={bgImage} alt="" />
        {useVideo ? (
          <video ref={videoRef} className="cn-bg__video" muted autoPlay playsInline preload="auto" poster={bgImage}>
            <source src="/event-templates/cinematic/scroll-bg.mp4" type="video/mp4" />
          </video>
        ) : null}
        <div className="cn-bg__vignette" />
        <div className="cn-bg__glow" />
        <div className="cn-bg__blob cn-bg__blob--a" />
        <div className="cn-bg__blob cn-bg__blob--b" />
        <div className="cn-bg__blob cn-bg__blob--c" />
        <canvas ref={canvasRef} className="cn-bg__canvas" />
      </div>

      {/* The headline, full screen, before the page appears (published page only). */}
      {animate && stage < 1 && typeof document !== "undefined"
        ? createPortal(
            <div className={`cn-intro${introFading ? " is-fading" : ""}`} style={{ ...vars, background: introBg }}>
              <style>{CINEMATIC_CSS}</style>
              {headline}
            </div>,
            document.body,
          )
        : null}

      <main className="cn-main">
        <div className="cn-col">
          <div className={`cn-in${on(1)}`} style={{ transitionDuration: "1800ms", transform: "translateY(2rem)" }}>
            {headline}
          </div>

          {settings.sectionVisibility.gallery !== false ? (
            <div className={`cn-photos cn-in${on(1)}`} style={{ transitionDuration: "1500ms", transitionDelay: stage >= 1 && animate ? "600ms" : "0ms" }}>
              <Polaroids items={photos} editorPreview={editorPreview} />
            </div>
          ) : null}

          <div className={`cn-doodles cn-in${on(1)}`} style={{ transitionDuration: "1200ms", transitionDelay: stage >= 1 && animate ? "1200ms" : "0ms" }} aria-hidden>
            <Heart size={18} stroke="#D4727A" strokeWidth={1.3} />
            <Heart size={14} stroke="#F4A6A3" strokeWidth={1} />
          </div>

          {paragraphs.length || editorPreview ? (
            <div className={`cn-message cn-in${on(2)}`} style={{ transitionDuration: "1800ms" }}>
              {paragraphs.length ? (
                paragraphs.map((p, i) => (
                  <p key={i} className="cn-hand cn-hand--note">
                    {p.split("\n").map((line, j) => (
                      <span key={j}>
                        {j ? <br /> : null}
                        {line}
                      </span>
                    ))}
                  </p>
                ))
              ) : (
                <p className="cn-hand cn-hand--note cn-hint">Your invitation message goes here.</p>
              )}
            </div>
          ) : null}

          {when || venue || editorPreview ? (
            <div className={`cn-details cn-in${on(3)}`} style={{ transitionDuration: "1500ms" }}>
              <p className={`cn-hand cn-hand--date${when ? "" : " cn-hint"}`}>{when ?? (editorPreview ? "Date & time" : "")}</p>
              {venue ? (
                <p className="cn-hand cn-hand--venue">
                  {content.primaryLocation.mapUrl ? (
                    <a href={content.primaryLocation.mapUrl} target="_blank" rel="noopener noreferrer">
                      {venue}
                    </a>
                  ) : (
                    venue
                  )}
                </p>
              ) : editorPreview ? (
                <p className="cn-hand cn-hand--venue cn-hint">Venue</p>
              ) : null}
            </div>
          ) : null}

          <div className={`cn-divider cn-in${on(3)}`} style={{ transitionDuration: "1200ms", transitionDelay: stage >= 3 && animate ? "500ms" : "0ms" }} aria-hidden>
            <div>
              <i />
              <Heart size={16} fill="#C9A0A0" opacity={0.6} />
              <i />
            </div>
          </div>
        </div>
      </main>

      {settings.sectionVisibility.rsvp !== false ? <RsvpSection content={content} editorPreview={editorPreview} reveal={animate} /> : null}

      {credit.show ? (
        <footer className="cn-footer">
          <p>
            <CreditLine linkStyle={{ color: "#fff", textDecoration: "underline", fontWeight: 600 }} />
          </p>
        </footer>
      ) : null}
    </div>
  );
}
