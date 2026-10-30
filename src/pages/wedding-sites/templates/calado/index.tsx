import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { caladoDemo } from "../../content/fixtures/calado-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const CaladoTemplate = lazyTemplate(() => import("./CaladoTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "calado-cotton",
  fontPairingId: "pinyon-garamond",
  sectionVisibility: { ...defaultSectionVisibility },
};

// For babies: a christening, a first birthday, both on one day, or a dedication. The page is
// unbleached cotton; the baby's name is embroidered in a beech hoop (named for the calado
// stitching on a binyag gown), the godparents are a stitched sampler and the first twelve
// months a wall of small hoops.
export const caladoTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "calado",
  label: "Calado",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/calado/demo/month-1.webp",
  cardImage: "/event-templates/cards/calado.webp?v=2",
  component: CaladoTemplate,
  defaultSettings,
  tier: "free",
  demoContent: caladoDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "registry", "faqs"],
  // One photo per month for the first year.
  galleryLimit: 12,
  storyLabel: "A note from the parents",
  storyHint: "A few lines under the hoop. Leave a blank line between paragraphs.",
  hideable: [
    { key: "hostIntro", label: "A note from the parents" },
    { key: "entourage", label: "Godparents" },
    { key: "schedule", label: "The program (schedule)" },
    { key: "gallery", label: "The first twelve months (photos)" },
    { key: "dress", label: "What to wear" },
    { key: "livestream", label: "Livestream" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    {
      key: "babyEvent",
      label: "What you’re celebrating",
      hint: "Changes the wording through the page. A dedication never uses Catholic wording.",
      options: [
        { value: "christening", label: "Christening (binyag)" },
        { value: "both", label: "Christening & first birthday" },
        { value: "birthday", label: "First birthday" },
        { value: "dedication", label: "Baby dedication" },
      ],
    },
    { key: "heroName", label: "Name on the hoop", hint: "Leave empty to use the baby’s name. Press Enter where it should break.", placeholder: "Amara\nSofia", multiline: true, maxLength: 40 },
    { key: "heroLine", label: "Small line above the name", hint: "Leave empty for “The christening of” (or the right words for your day).", maxLength: 50 },
    { key: "parents", label: "The parents", hint: "Shown under the date.", placeholder: "Daughter of Bea & Paolo Villanueva", maxLength: 80 },
    { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
    { key: "receptionName", label: "The celebration: venue", hint: "Where the lunch or party is. Leave empty if it’s the same place.", placeholder: "Café Ilang-Ilang, Manila Hotel", maxLength: 60 },
    { key: "receptionAddress", label: "The celebration: address", placeholder: "One Rizal Park, Ermita, Manila", maxLength: 100 },
    { key: "receptionTime", label: "The celebration: time", placeholder: "Twelve noon", maxLength: 50 },
    { key: "receptionMap", label: "The celebration: map link (optional)", hint: "A Google Maps link. Leave empty to search for the venue.", maxLength: 300 },
    { key: "sponsorsTitle", label: "Godparents heading", section: "entourage", hint: "Add the names under Entourage & motif (a Ninongs group and a Ninangs group).", placeholder: "Mga Ninong at Ninang", maxLength: 40 },
    { key: "programTitle", label: "Program heading", section: "schedule", placeholder: "The program", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", hint: "Your motif colours (Entourage & motif) show as embroidery floss.", placeholder: "Soft pastels for everyone, little ones included.", multiline: true, maxLength: 220 },
    { key: "livestreamUrl", label: "Livestream link", section: "livestream", hint: "For family abroad: a YouTube, Facebook or Zoom link. They see the start time in their own time zone.", placeholder: "https://youtube.com/live/…", maxLength: 300 },
    { key: "livestreamButton", label: "Livestream button", section: "livestream", placeholder: "Open the livestream", maxLength: 30 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Kindly reply", maxLength: 30 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send our reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", hint: "Shown after a guest says yes.", placeholder: "Salamat po. We can’t wait to celebrate with you.", maxLength: 90 },
    { key: "closing", label: "Closing line", placeholder: "Maraming salamat po", maxLength: 40 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
