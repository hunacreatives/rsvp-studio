import type { ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import type { Tone } from "./components";
import { hasLocation, resolvePhotoSlots } from "./content";
import { SCRAPBOOK_CSS } from "./styles";
import Hero from "./sections/Hero";
import DetailsCollage from "./sections/DetailsCollage";
import StorySection from "./sections/StorySection";
import WeddingDetailsSection from "./sections/WeddingDetailsSection";
import TravelSection from "./sections/TravelSection";
import RegistrySection from "./sections/RegistrySection";
import FaqSection from "./sections/FaqSection";
import GallerySection from "./sections/GallerySection";
import FinalCollage from "./sections/FinalCollage";

/**
 * "Scrapbook" archetype — a full-bleed, art-directed long-form page
 * rebuilt 1:1 from the reference design (a Canva "Dark Red Beige
 * Romantic Scrapbook" website export), not a centred-card layout like
 * the project's other templates.
 *
 * Two structural rules make it hold together:
 *
 * 1. FIXED TONES. Each band's burgundy/beige is pinned to the
 *    reference's own rhythm (hero red → details beige → story red →
 *    about beige → travel red → registry beige → faq red → final
 *    beige) rather than computed by alternation. Content that the
 *    reference has no band for rides inside an existing one (key people
 *    inside the story band) or is appended at the end (the overflow
 *    photo board), so an optional section can never shift a named
 *    section onto the wrong background. Empty sections render nothing
 *    at all — no collapsed blank bands.
 *
 * 2. CONTAINER-RELATIVE SIZING. All type and breakpoints are driven by
 *    container query units (see styles.ts), so the scaled builder
 *    preview and the published page render identically.
 */
export default function ScrapbookTemplate({ content, settings, editorPreview = false }: TemplateProps<BaseTemplateSettings>) {
  const theme = resolveEventTheme(settings);
  const visibility = settings.sectionVisibility;
  const slots = resolvePhotoSlots(content, settings.heroImage);

  // In the builder, a band stays on screen (showing an editor-only
  // placeholder) even before its content exists, so the page keeps its
  // real structure while it's being filled in. On the published site
  // the same band disappears entirely rather than leaving a blank area.
  const show = (hasContent: boolean) => hasContent || editorPreview;

  // tone is pinned per band to the reference; `show` keeps empty bands
  // out of the page entirely.
  const bands: Array<{ show: boolean; tone: Tone; render: (tone: Tone) => ReactNode }> = [
    {
      show: visibility.hero,
      tone: "red",
      render: (tone) => <Hero content={content} tone={tone} slots={slots} editorPreview={editorPreview} />,
    },
    {
      show:
        visibility.venue &&
        show(Boolean(content.eventDate || hasLocation(content.primaryLocation) || slots.venue)),
      tone: "paper",
      render: (tone) => <DetailsCollage content={content} tone={tone} slots={slots} editorPreview={editorPreview} />,
    },
    {
      // Carries the key-people block too, hence the || here.
      show: visibility.hostIntro && show(Boolean(content.story?.trim() || content.keyPeople.length > 0)),
      tone: "red",
      render: (tone) => <StorySection content={content} tone={tone} slots={slots} editorPreview={editorPreview} />,
    },
    {
      show: visibility.schedule && show(content.schedule.length > 0),
      tone: "paper",
      render: (tone) => <WeddingDetailsSection content={content} tone={tone} editorPreview={editorPreview} />,
    },
    {
      show:
        (visibility.travelInformation || visibility.accommodations) &&
        show(content.travelInformation.length > 0 || content.accommodations.length > 0),
      tone: "red",
      render: (tone) => <TravelSection content={content} tone={tone} slots={slots} editorPreview={editorPreview} />,
    },
    {
      show: visibility.registry && show(content.registryLinks.length > 0),
      tone: "paper",
      render: (tone) => <RegistrySection content={content} tone={tone} editorPreview={editorPreview} />,
    },
    {
      show: visibility.faqs && show(content.faqs.length > 0),
      tone: "red",
      render: (tone) => <FaqSection content={content} tone={tone} editorPreview={editorPreview} />,
    },
    {
      show: visibility.rsvp,
      tone: "paper",
      render: (tone) => <FinalCollage content={content} tone={tone} slots={slots} editorPreview={editorPreview} />,
    },
    {
      // Appended last so it can't push a named band onto the wrong tone.
      show: visibility.gallery && slots.overflow.length > 0,
      tone: "red",
      render: (tone) => <GallerySection tone={tone} slots={slots} />,
    },
  ];

  // Tones are pinned per band, but hiding sections can leave two
  // same-coloured bands adjacent (e.g. a published draft with only the
  // details collage and the RSVP collage would render one continuous
  // beige slab). Flip any band that would repeat its predecessor. With
  // all bands present the canonical order never repeats, so this is a
  // no-op and the reference's exact rhythm is preserved.
  let previousTone: Tone | null = null;
  const sections = bands
    .filter((b) => b.show)
    .map((b) => {
      const tone: Tone = previousTone === b.tone ? (b.tone === "red" ? "paper" : "red") : b.tone;
      previousTone = tone;
      return { ...b, tone };
    });

  return (
    <div
      className="sb-root"
      style={{
        ["--sb-ink" as string]: theme.ink,
        ["--sb-paper" as string]: theme.background,
        ["--sb-display" as string]: theme.displayFont,
        ["--sb-body" as string]: theme.bodyFont,
        background: theme.background,
      }}
    >
      <style>{SCRAPBOOK_CSS}</style>

      {sections.map((band, i) => (
        <div key={i}>{band.render(band.tone)}</div>
      ))}

      <div className="sb-footer">
        <p className="sb-eyebrow" style={{ letterSpacing: "0.12em", opacity: 0.9 }}>
          Made with love by{" "}
          <a href="https://www.hunacreatives.com/contact" target="_blank" rel="noopener noreferrer">
            The RSVP Studio
          </a>
        </p>
      </div>
    </div>
  );
}
