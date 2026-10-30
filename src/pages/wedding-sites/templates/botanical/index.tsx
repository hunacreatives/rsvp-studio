import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { isabellaAndMateo } from "../../content/fixtures/isabella-and-mateo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const BotanicalTemplate = lazyTemplate(() => import("./BotanicalTemplate"));

// Burgundy/cream + script display font by default, matching the
// reference invitation — but still just BaseTemplateSettings underneath,
// so a couple can swap to any curated palette/pairing like any template.
const defaultSettings: BaseTemplateSettings = {
  paletteId: "burgundy-cream",
  fontPairingId: "dancing-cormorant",
  sectionVisibility: { ...defaultSectionVisibility },
};

export const botanicalTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "botanical",
  label: "Botanical",
  archetype: "botanical",
  previewThumbnailUrl: "/event-templates/botanical/thumbnail.jpg",
  component: BotanicalTemplate,
  defaultSettings,
  // Sections that can be switched off, in page order.
  hideable: [
    { key: "hostIntro", label: "Your story" },
    { key: "schedule", label: "Schedule" },
    { key: "venue", label: "Venue" },
    { key: "accommodations", label: "Where to stay" },
    { key: "travelInformation", label: "Getting there" },
    { key: "entourage", label: "Entourage" },
    { key: "gallery", label: "Photos" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "FAQs" },
    { key: "rsvp", label: "RSVP form" },
  ],
  tier: "premium",
  // Hidden from the gallery (Studio → Templates); existing Botanical sites still render.
  offered: false,
  // Sample couple for the /build gallery and preview page.
  demoContent: isabellaAndMateo,
};
