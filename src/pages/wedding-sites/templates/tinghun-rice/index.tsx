import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { tinghunDemo } from "../../content/fixtures/tinghun-demo";
import { TINGHUN_FIELDS, TINGHUN_HIDEABLE } from "../tinghun/fields";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const TinghunRiceTemplate = lazyTemplate(() => import("./TinghunRiceTemplate"));

// Rice Paper: a ting hun as fine stationery. Rice paper and ink, the two families' surnames
// carved in a vermilion seal that presses onto the page as it opens, and one red thread that
// draws itself down the margin as you scroll, ending at a papercut 囍. Blush Paper is its
// softer pink scheme.
const defaultSettings: BaseTemplateSettings = {
  paletteId: "rice-paper",
  fontPairingId: "wenkai-lora",
  sectionVisibility: { ...defaultSectionVisibility },
};

export const tinghunRiceTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "tinghun-rice",
  label: "Rice Paper",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/cards/tinghun-rice.webp?v=2",
  cardImage: "/event-templates/cards/tinghun-rice.webp?v=2",
  component: TinghunRiceTemplate,
  defaultSettings,
  tier: "free",
  demoContent: tinghunDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "registry", "faqs"],
  galleryLimit: 6,
  storyLabel: "A note from our families",
  storyHint: "A few words from both families. Leave a blank line between paragraphs.",
  hideable: TINGHUN_HIDEABLE,
  customFields: [
    ...TINGHUN_FIELDS,
    // Rice Paper's own headings and labels (each has default wording on the page).
    { key: "lauriatLabel", label: "Label above the lunch or dinner", placeholder: "The lauriat", maxLength: 30 },
    { key: "storyTitle", label: "Note heading", section: "hostIntro", placeholder: "A note from our families", maxLength: 40 },
    { key: "dayTitle", label: "Schedule heading", section: "schedule", placeholder: "The ceremony", maxLength: 30 },
    { key: "eldersTitle", label: "Elders heading", section: "entourage", placeholder: "Elders and family", maxLength: 30 },
    { key: "monogram", label: "Monogram", hint: "At the close. Leave empty to use your initials, like M & J.", placeholder: "M & J", maxLength: 9 },
  ],
};
