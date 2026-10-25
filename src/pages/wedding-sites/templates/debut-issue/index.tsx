import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import DebutIssueTemplate from "./DebutIssueTemplate";
import { debutIssueDemo } from "../../content/fixtures/debut-issue-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "debut-issue",
  fontPairingId: "bodoni-newsreader",
  sectionVisibility: { ...defaultSectionVisibility },
};

// A debut as a fashion magazine, made from her pre-debut pictorial: the cover (her photo, her
// name as the masthead, cover lines from the site itself), an opening that turns the cover on
// its spine to her letter and the contents, then a feature per page: the night, the program,
// the 18 Roses / Candles / Treasures, the pictorial, what to wear, the gift guide, Q&A and a
// tear-out reply card. Printed in ink and her first motif colour.
export const debutIssueTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "debut-issue",
  label: "Debut Issue",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/cards/debut-issue.webp",
  cardImage: "/event-templates/cards/debut-issue.webp",
  component: DebutIssueTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: debutIssueDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "registry", "faqs"],
  galleryLimit: 16,
  storyLabel: "Your letter",
  storyHint: "Her letter on the page beside the contents, like an editor’s letter. Leave a blank line between paragraphs.",
  hideable: [
    { key: "hostIntro", label: "Her letter" },
    { key: "countdown", label: "Countdown" },
    { key: "schedule", label: "The Program (schedule)" },
    { key: "entourage", label: "18 Roses, Candles & Treasures" },
    { key: "gallery", label: "The Pictorial (photos)" },
    { key: "dress", label: "What to Wear" },
    { key: "registry", label: "Gift Guide" },
    { key: "faqs", label: "Q&A (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "masthead", label: "Name on the cover", hint: "Leave empty for her first name.", placeholder: "Sofia", maxLength: 14 },
    { key: "coverHeadline", label: "Cover headline", placeholder: "The Debut Issue", maxLength: 30 },
    { key: "issueLine", label: "Line above the name", hint: "Leave empty for “Issue No. 18 · November 2030”.", maxLength: 44 },
    { key: "number", label: "The number", hint: "For the issue number on the cover.", placeholder: "18", maxLength: 3 },
    {
      key: "coverInk",
      label: "Cover text",
      hint: "Dark text suits a light photo.",
      options: [
        { value: "", label: "Light" },
        { value: "dark", label: "Dark" },
      ],
    },
    { key: "letterTitle", label: "Letter heading", section: "hostIntro", hint: "Leave empty for “A letter from Sofia”.", maxLength: 40 },
    { key: "letterSign", label: "Signed", section: "hostIntro", hint: "Leave empty for her first name.", maxLength: 30 },
    { key: "nightTitle", label: "Date & venue heading", placeholder: "The Night", maxLength: 24 },
    { key: "programTitle", label: "Program heading", section: "schedule", placeholder: "The Program", maxLength: 24 },
    { key: "pictorialTitle", label: "Photos heading", section: "gallery", hint: "Your first photo is the cover; the next two go with the letter and the night.", placeholder: "The Pictorial", maxLength: 24 },
    { key: "dressTitle", label: "Dress code heading", section: "dress", placeholder: "What to Wear", maxLength: 24 },
    { key: "dressCode", label: "Dress code", section: "dress", hint: "Your motif colours (Entourage & motif) show as the colour story. The first one is the issue’s spot colour.", placeholder: "Formal. Long gowns and suits, in navy and silver.", multiline: true, maxLength: 200 },
    { key: "giftTitle", label: "Gifts heading", section: "registry", placeholder: "Gift Guide", maxLength: 24 },
    { key: "faqTitle", label: "FAQs heading", section: "faqs", placeholder: "Q&A", maxLength: 24 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Kindly reply", maxLength: 24 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send my reply", maxLength: 22 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", hint: "Shown after a guest accepts.", placeholder: "Your seat is saved. Come ready to dance.", maxLength: 80 },
    { key: "replyButton", label: "Button on the back cover", placeholder: "Reply now", maxLength: 22 },
    { key: "closing", label: "Back cover line", placeholder: "See you on the dance floor", maxLength: 40 },
    { key: "afterParty", label: "After the night", hint: "Replaces the RSVP the day after your debut.", placeholder: "Thank you for celebrating with me.", maxLength: 160 },
  ],
};
