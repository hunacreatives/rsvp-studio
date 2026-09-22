import type { TemplateProps } from "../../engine/registry";
import { resolveEventTheme } from "../../engine/theme";
import type { EditorialFormalSettings } from "./index";
import Hero from "./sections/Hero";
import HostIntro from "./sections/HostIntro";
import ScheduleSection from "./sections/ScheduleSection";
import VenueSection from "./sections/VenueSection";
import GallerySection from "./sections/GallerySection";
import RegistrySection from "./sections/RegistrySection";
import FaqSection from "./sections/FaqSection";
import RsvpSection from "./sections/RsvpSection";

// Top-level composition for "Template A". Adapted from tercelat41's
// single-page invite — generalized from one couple's hardcoded content
// into sections that each consume canonical, event-type-agnostic
// EventContent data plus this template's own curated theme/settings. See
// docs/template-builder-decisions.md.
export default function EditorialFormalTemplate({ content, settings }: TemplateProps<EditorialFormalSettings>) {
  const theme = resolveEventTheme(settings);
  const visibility = settings.sectionVisibility;

  return (
    <div style={{ background: theme.background, minHeight: "100vh" }}>
      {visibility.hero ? (
        <Hero
          content={content}
          theme={theme}
          heroTreatment={settings.heroTreatment}
          heroImageUrl={settings.heroImage?.masterUrl}
        />
      ) : null}
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
        <p style={{ color: theme.background, fontSize: 14, margin: 0, fontFamily: theme.bodyFont }}>
          Made with love by{" "}
          <a
            href="https://www.hunacreatives.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.background, fontWeight: 700 }}
          >
            The RSVP Studio
          </a>
        </p>
      </div>
    </div>
  );
}
