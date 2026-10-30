import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { tinghunDemo } from "../../content/fixtures/tinghun-demo";
import { TINGHUN_FIELDS, TINGHUN_HIDEABLE } from "../tinghun/fields";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const TinghunLacquerTemplate = lazyTemplate(() => import("./TinghunLacquerTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "lacquer-cinnabar",
  fontPairingId: "chiron-cormorant",
  sectionVisibility: { ...defaultSectionVisibility },
};

// Lacquer Door: the most traditional of the three Tinghun designs. A pair of carved lattice
// doors in cinnabar lacquer swing open onto the couple's names (囍 in the transom above); the
// day is a tiered betrothal box, the elders sit on the panels of a lacquer gift box. Its
// evening scheme is the same house by lamplight.
export const tinghunLacquerTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "tinghun-lacquer",
  label: "Lacquer Door",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/cards/tinghun-lacquer.webp?v=2",
  cardImage: "/event-templates/cards/tinghun-lacquer.webp?v=2",
  component: TinghunLacquerTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: tinghunDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "registry", "faqs"],
  galleryLimit: 6,
  storyLabel: "A note from our families",
  storyHint: "A few words from both families to your guests. Leave a blank line between paragraphs.",
  hideable: TINGHUN_HIDEABLE,
  customFields: [
    ...TINGHUN_FIELDS,
    { key: "monogram", label: "Monogram", hint: "At the foot of the page. Leave empty to use your initials, like M & J.", placeholder: "M & J", maxLength: 9 },
  ],
};
