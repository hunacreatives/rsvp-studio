import { useRef } from "react";
import type { TemplateProps } from "../../engine/registry";
import { usePrefersReducedMotion } from "../../engine/motion";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { CINEMATIC_CSS } from "./styles";
import { useParticles } from "./useParticles";
import { useScrollScrubVideo } from "./useScrollScrubVideo";
import Hero from "./sections/Hero";
import RsvpSection from "./sections/RsvpSection";
import { FaqSection, RegistrySection, ScheduleSection, TravelSection } from "./sections/DetailsSections";

/**
 * "Cinematic" archetype — built 1:1 from the "gel-at-30" reference site
 * (a real deployed birthday invite): a fixed full-viewport atmospheric
 * background (static art + vignette + glow + drifting particles) behind
 * a single long scroll of glass-card content, opening with a staged
 * name-reveal rather than a static hero.
 *
 * Unlike Scrapbook's fixed-tone bands, this archetype has no alternating
 * background system at all — every section floats as a translucent card
 * over the SAME fixed background, so there's no adjacent-tone conflict
 * to resolve when a section is hidden.
 */
export default function CinematicTemplate({ content, settings, editorPreview = false }: TemplateProps<BaseTemplateSettings>) {
  const theme = resolveEventTheme(settings);
  const visibility = settings.sectionVisibility;
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useParticles(canvasRef, !prefersReducedMotion);
  useScrollScrubVideo(videoRef, !prefersReducedMotion);

  const backgroundUrl = settings.heroImage?.masterUrl ?? "/event-templates/cinematic/background.webp";

  return (
    <div
      className="cn-root"
      style={{
        ["--cn-ink" as string]: theme.ink,
        ["--cn-muted" as string]: theme.muted,
        ["--cn-display" as string]: theme.displayFont,
        ["--cn-body" as string]: theme.bodyFont,
        ["--cn-body-plain" as string]: "Inter, system-ui, sans-serif",
        ["--cn-bg-color" as string]: theme.background,
        background: theme.background,
      }}
    >
      <style>{CINEMATIC_CSS}</style>

      <div className="cn-bg" aria-hidden>
        <img className="cn-bg__image" src={backgroundUrl} alt="" />
        {prefersReducedMotion ? null : (
          <video
            ref={videoRef}
            className="cn-bg__video"
            muted
            playsInline
            preload="auto"
            poster={backgroundUrl}
          >
            <source src="/event-templates/cinematic/scroll-bg.mp4" type="video/mp4" />
          </video>
        )}
        <div className="cn-bg__vignette" />
        <div className="cn-bg__glow" />
        <div
          className="cn-bg__blob"
          style={{
            top: "-8%",
            left: "-10%",
            width: "42%",
            aspectRatio: "1/1",
            background: theme.ink,
            opacity: 0.14,
            animation: prefersReducedMotion ? "none" : "cn-float-very-slow 14s ease-in-out infinite",
          }}
        />
        <div
          className="cn-bg__blob"
          style={{
            bottom: "-10%",
            right: "-8%",
            width: "48%",
            aspectRatio: "1/1",
            background: theme.muted,
            opacity: 0.12,
            animation: prefersReducedMotion ? "none" : "cn-float-slow 18s ease-in-out infinite",
          }}
        />
        <canvas ref={canvasRef} className="cn-bg__canvas" />
      </div>

      {visibility.hero ? <Hero content={content} editorPreview={editorPreview} /> : null}
      {visibility.schedule ? <ScheduleSection content={content} editorPreview={editorPreview} /> : null}
      {visibility.travelInformation || visibility.accommodations ? (
        <TravelSection content={content} editorPreview={editorPreview} />
      ) : null}
      {visibility.registry ? <RegistrySection content={content} editorPreview={editorPreview} /> : null}
      {visibility.faqs ? <FaqSection content={content} editorPreview={editorPreview} /> : null}
      {visibility.rsvp ? <RsvpSection content={content} editorPreview={editorPreview} /> : null}

      <div className="cn-footer">
        <p>
          Made with love by{" "}
          <a href="https://www.hunacreatives.com/contact" target="_blank" rel="noopener noreferrer">
            The RSVP Studio
          </a>
        </p>
      </div>
    </div>
  );
}
