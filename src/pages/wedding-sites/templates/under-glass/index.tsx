import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import UnderGlassTemplate from "./UnderGlassTemplate";
import { underGlassDemo } from "../../content/fixtures/under-glass-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "under-glass",
  fontPairingId: "bodoni-garamond",
  sectionVisibility: { ...defaultSectionVisibility },
};

// Milestone birthdays (a lola's 80th) and anniversaries (fifty years): the photos every family
// keeps under the glass top of the dining table, decade by decade, a foil numeral, a message
// wall for family near and far.
export const underGlassTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "under-glass",
  label: "Under Glass",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/under-glass/demo/pic-1.webp",
  cardImage: "/event-templates/cards/under-glass.webp?v=2",
  component: UnderGlassTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: underGlassDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "registry", "faqs"],
  galleryLimit: 24,
  photoBacks: true,
  storyLabel: "A note from the family",
  storyHint: "A few lines from the children or the couple. Leave a blank line between paragraphs.",
  hideable: [
    { key: "hostIntro", label: "A note from the family" },
    { key: "gallery", label: "Through the years (photos)" },
    { key: "schedule", label: "The program (schedule)" },
    { key: "entourage", label: "Entourage" },
    { key: "dress", label: "What to wear" },
    { key: "messages", label: "Message wall (guests’ messages, first names only)" },
    { key: "livestream", label: "Livestream" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "honoree", label: "Name on the card", hint: "How family calls them. Leave empty to use the names on your event.", placeholder: "Lola Ising", maxLength: 40 },
    { key: "milestone", label: "The number", hint: "The birthday (80) or the years married (50). Shown large, in foil.", placeholder: "80", maxLength: 3 },
    {
      key: "metal",
      label: "Foil",
      hint: "Automatic: gold for birthdays; for anniversaries silver (25), pearl (30), ruby (40), sapphire (45), gold (50), diamond (60).",
      options: [
        { value: "", label: "Automatic" },
        { value: "gold", label: "Gold" },
        { value: "silver", label: "Silver" },
        { value: "ruby", label: "Ruby" },
        { value: "sapphire", label: "Sapphire" },
        { value: "pearl", label: "Pearl" },
        { value: "diamond", label: "Diamond" },
      ],
    },
    { key: "heroLine", label: "Small line above the name", hint: "Leave empty for “Maligayang ika-80 kaarawan” or “Ginintuang Anibersaryo”.", maxLength: 50 },
    { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
    { key: "noteFrom", label: "Note signed by", section: "hostIntro", placeholder: "Carmela, Ben & Joy", maxLength: 60 },
    { key: "ceremonyLabel", label: "Ceremony heading", hint: "Leave empty for “Thanksgiving Mass” (or “The renewal of vows”).", maxLength: 40 },
    { key: "receptionName", label: "The celebration: venue", hint: "Where the dinner is. Leave empty if it’s the same place.", placeholder: "The Fernwood Gardens", maxLength: 60 },
    { key: "receptionAddress", label: "The celebration: address", placeholder: "Quezon City", maxLength: 100 },
    { key: "receptionTime", label: "The celebration: time", placeholder: "Six o’clock in the evening", maxLength: 50 },
    { key: "receptionMap", label: "The celebration: map link (optional)", maxLength: 300 },
    { key: "yearsTitle", label: "Photos heading", section: "gallery", hint: "Start each photo’s caption with its year (“1968 — Our wedding day”) and they’re laid out by decade.", placeholder: "Through the years", maxLength: 40 },
    { key: "programTitle", label: "Program heading", section: "schedule", placeholder: "The program", maxLength: 30 },
    { key: "entourageTitle", label: "Entourage heading", section: "entourage", hint: "Names come from Entourage & motif.", placeholder: "The entourage", maxLength: 40 },
    { key: "dressCode", label: "What to wear", section: "dress", hint: "Your motif colours (Entourage & motif) show as fabric swatches.", placeholder: "Filipiniana or formal, in gold and cream.", multiline: true, maxLength: 220 },
    { key: "messagesTitle", label: "Message wall heading", section: "messages", hint: "Guests write when they reply and choose to show it. Hide any one from your Guests tab.", placeholder: "Messages for Lola Ising", maxLength: 50 },
    { key: "livestreamUrl", label: "Livestream link", section: "livestream", hint: "For family abroad: they see the time in their own city.", placeholder: "https://facebook.com/…/live", maxLength: 300 },
    { key: "livestreamButton", label: "Livestream button", section: "livestream", placeholder: "Open the livestream", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your presence is the greatest gift. In lieu of gifts, Lola asks for a donation to…", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Kindly reply", maxLength: 30 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send my reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", placeholder: "Salamat po. Your seat is saved.", maxLength: 90 },
    { key: "closing", label: "Closing line", placeholder: "Salamat sa Diyos", maxLength: 40 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
