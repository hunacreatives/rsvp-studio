import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import TinghunPorcelainTemplate from "./TinghunPorcelainTemplate";
import { tinghunDemo } from "../../content/fixtures/tinghun-demo";
import { TINGHUN_FIELDS, TINGHUN_HIDEABLE } from "../tinghun/fields";

// Chinoiserie for a garden or hotel ting hun: blue-and-white porcelain linework (peony,
// mandarin ducks, a plate for the names), and the programme on a handscroll that unrolls.
const defaultSettings: BaseTemplateSettings = {
  paletteId: "porcelain-blue",
  fontPairingId: "cactus-cormorant",
  sectionVisibility: { ...defaultSectionVisibility },
};

export const tinghunPorcelainTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "tinghun-porcelain",
  label: "Porcelain Garden",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/cards/tinghun-porcelain.webp",
  cardImage: "/event-templates/cards/tinghun-porcelain.webp",
  component: TinghunPorcelainTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: tinghunDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "registry", "faqs"],
  galleryLimit: 6,
  storyLabel: "A note from our families",
  storyHint: "A few words to your guests from both families. Leave a blank line between paragraphs.",
  hideable: TINGHUN_HIDEABLE,
  // The shared Tinghun fields, then this design's own headings and monogram.
  customFields: [
    ...TINGHUN_FIELDS,
    { key: "storyTitle", label: "Note heading", section: "hostIntro", placeholder: "A note from our families", maxLength: 40 },
    { key: "dayTitle", label: "Programme heading", section: "schedule", placeholder: "The programme", maxLength: 30 },
    { key: "eldersTitle", label: "Elders heading", section: "entourage", placeholder: "Elders & family", maxLength: 30 },
    { key: "monogram", label: "Monogram", hint: "On the small plate at the end. Leave empty to use your initials.", placeholder: "M & J", maxLength: 9 },
  ],
};
