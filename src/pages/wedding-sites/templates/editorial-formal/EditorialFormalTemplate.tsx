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
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";

// Top-level composition for "Template A". Adapted from tercelat41's
// single-page invite — generalized from one couple's hardcoded content
// into sections that each consume canonical, event-type-agnostic
// EventContent data plus this template's own curated theme/settings. See
// docs/template-builder-decisions.md.
export default function EditorialFormalTemplate({ content, settings, editorPreview = false }: TemplateProps<EditorialFormalSettings>) {
  const credit = useSiteCredit();
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
      {visibility.rsvp ? <RsvpSection content={content} theme={theme} editorPreview={editorPreview} /> : null}

      {credit.show ? (
        <div style={{ width: "100%", background: theme.ink, padding: "24px 0", textAlign: "center" }}>
          <p style={{ color: theme.background, fontSize: 14, margin: 0, fontFamily: theme.bodyFont }}>
            <CreditLine linkStyle={{color: theme.background, fontWeight: 700}} />
          </p>
        </div>
      ) : null}
    </div>
  );
}
