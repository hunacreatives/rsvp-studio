import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import CapizTemplate from "./CapizTemplate";
import { capizDemo } from "../../content/fixtures/capiz-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "capiz-plaster",
  fontPairingId: "bodoni-newsreader",
  sectionVisibility: { ...defaultSectionVisibility },
};

// A Filipino wedding as a walk through an old house in lime plaster and narra: a capiz
// window that slides open onto the couple, the entourage set in a great capiz window,
// a reply card on the sill, and the house's stone base. Candlelight is its evening scheme.
export const capizTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "capiz",
  label: "Capiz",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/capiz/demo/pic-1.webp",
  cardImage: "/event-templates/cards/capiz.webp",
  component: CapizTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: capizDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "accommodations", "travel", "registry", "faqs"],
  // The window, two story recesses, then the wall of photos.
  galleryLimit: 12,
  storyLabel: "Our story",
  storyHint: "Shown beside two of your photos. Leave a blank line between paragraphs.",
  hideable: [
    { key: "parents", label: "Parents (in the invitation)" },
    { key: "countdown", label: "Countdown" },
    { key: "hostIntro", label: "Our story" },
    { key: "entourage", label: "Entourage" },
    { key: "schedule", label: "The day (schedule)" },
    { key: "dress", label: "What to wear" },
    { key: "gallery", label: "Photos" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "travelInformation", label: "Getting there" },
    { key: "accommodations", label: "Where to stay" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "heroLine", label: "Small line above your names", hint: "Optional.", placeholder: "The wedding of", maxLength: 40 },
    { key: "parentsLine", label: "Line above your parents", hint: "Your parents come from Entourage & motif (Parents of the Bride / of the Groom).", placeholder: "Together with our parents", maxLength: 50 },
    {
      key: "invitation",
      label: "Invitation wording",
      hint: "For a civil or garden wedding, “the pleasure of your company” is the usual wording.",
      placeholder: "we request the honour of your presence at our wedding",
      multiline: true,
      maxLength: 140,
    },
    { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
    { key: "receptionName", label: "Reception venue", hint: "Leave empty if it’s the same place as the ceremony.", placeholder: "Casa Manila Courtyard", maxLength: 60 },
    { key: "receptionAddress", label: "Reception address", placeholder: "Plaza San Luis Complex, Intramuros, Manila", maxLength: 100 },
    { key: "receptionTime", label: "Reception time", placeholder: "Half past four in the afternoon", maxLength: 50 },
    { key: "receptionMap", label: "Reception map link (optional)", hint: "A Google Maps link. Leave empty to search for the venue.", placeholder: "https://maps.app.goo.gl/…", maxLength: 300 },
    { key: "storyTitle", label: "Story heading", section: "hostIntro", placeholder: "Our story", maxLength: 30 },
    { key: "entourageTitle", label: "Entourage heading", section: "entourage", placeholder: "The entourage", maxLength: 30 },
    { key: "dayTitle", label: "Schedule heading", section: "schedule", placeholder: "The day", maxLength: 30 },
    {
      key: "dressCode",
      label: "What to wear",
      hint: "Your motif colours (Entourage & motif) show as tinted capiz panes under it.",
      placeholder: "Barong Tagalog or a suit for the gentlemen; Filipiniana or a long gown for the ladies.",
      multiline: true,
      maxLength: 240,
      section: "dress",
    },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Kindly reply", maxLength: 30 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send my reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest accepts.", section: "rsvp", placeholder: "Thank you. We can’t wait to celebrate with you.", maxLength: 90 },
    { key: "closing", label: "Closing line", placeholder: "Hanggang sa muli", maxLength: 40 },
    { key: "monogram", label: "Monogram", hint: "Leave empty to use your initials, like A & M.", placeholder: "A & M", maxLength: 9 },
    { key: "afterParty", label: "After the wedding", hint: "Replaces the RSVP the day after.", placeholder: "Thank you for celebrating with us.", maxLength: 160 },
  ],
};
