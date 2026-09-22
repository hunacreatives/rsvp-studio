import type { TemplateProps } from "../../engine/registry";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import Hero from "./sections/Hero";
import HostIntro from "./sections/HostIntro";
import ScheduleSection from "./sections/ScheduleSection";
import VenueSection from "./sections/VenueSection";
import GallerySection from "./sections/GallerySection";
import RegistrySection from "./sections/RegistrySection";
import FaqSection from "./sections/FaqSection";
import RsvpSection from "./sections/RsvpSection";

// "Template C" — the ornamental/narrative archetype: centered layouts,
// arch-framed imagery, a vertical order-of-events timeline, and
// scalloped-edge cards, drawn from real wedding invitation references
// (see docs/template-builder-decisions.md). A third structurally distinct
// proof point for the canonical EventContent schema, alongside
// editorial-formal (centered/animated) and modern-minimal (grid/static).
export default function BotanicalTemplate({ content, settings }: TemplateProps<BaseTemplateSettings>) {
  const theme = resolveEventTheme(settings);
  const visibility = settings.sectionVisibility;

  return (
    <div style={{ background: theme.background, minHeight: "100vh" }}>
      {visibility.hero ? <Hero content={content} theme={theme} /> : null}
      {visibility.hostIntro ? <HostIntro content={content} theme={theme} /> : null}
      {visibility.schedule ? <ScheduleSection content={content} theme={theme} /> : null}
      {visibility.venue || visibility.accommodations || visibility.travelInformation ? (
        <VenueSection content={content} theme={theme} />
      ) : null}
      {visibility.gallery ? <GallerySection content={content} theme={theme} /> : null}
      {visibility.registry ? <RegistrySection content={content} theme={theme} /> : null}
      {visibility.faqs ? <FaqSection content={content} theme={theme} /> : null}
      {visibility.rsvp ? <RsvpSection content={content} theme={theme} /> : null}

      <div style={{ width: "100%", background: theme.ink, padding: "24px 0", textAlign: "center" }}>
        <p style={{ color: theme.background, fontSize: 12, margin: 0, fontFamily: theme.bodyFont, letterSpacing: "0.06em" }}>
          Made with love by{" "}
          <a href="https://www.hunacreatives.com/contact" target="_blank" rel="noopener noreferrer" style={{ color: theme.background, fontWeight: 700 }}>
            The RSVP Studio
          </a>
        </p>
      </div>
    </div>
  );
}
