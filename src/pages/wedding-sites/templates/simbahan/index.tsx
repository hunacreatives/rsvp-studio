import { lazyTemplate } from "../../engine/lazyTemplate";
import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import { simbahanDemo } from "../../content/fixtures/simbahan-demo";

// the design itself loads on its own, when it is first shown (engine/lazyTemplate)
const SimbahanTemplate = lazyTemplate(() => import("./SimbahanTemplate"));

const defaultSettings: BaseTemplateSettings = {
  paletteId: "simbahan",
  fontPairingId: "castoro-titling",
  sectionVisibility: { ...defaultSectionVisibility },
};

// A church wedding in an old Filipino stone church, drawn live in real 3D: the great wooden doors
// swing open into the light, and the guest walks down the aisle past the pews, the flowers and
// the candles, under shafts of late sun, one stop for each part of the day (the story, the
// programme, the sponsors, the entourage, what to wear, good to know), to the reply at the altar
// before the gilded retablo. Each card is a page of a church programme in black and rubric red.
export const simbahanTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "simbahan",
  label: "Simbahan",
  archetype: "cinematic",
  previewThumbnailUrl: "/event-templates/cards/simbahan.webp?v=2",
  cardImage: "/event-templates/cards/simbahan.webp?v=2",
  component: SimbahanTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: simbahanDemo,
  uses: ["story", "dateVenue", "schedule", "accommodations", "registry", "faqs"],
  storyLabel: "Our story",
  storyHint: "A few short paragraphs. Leave a blank line between them. The first letter is set large, in red.",
  hideable: [
    { key: "hostIntro", label: "Our story" },
    { key: "venue", label: "Ceremony and reception" },
    { key: "schedule", label: "The programme" },
    { key: "sponsors", label: "Parents and principal sponsors" },
    { key: "entourage", label: "The entourage" },
    { key: "dress", label: "What to wear" },
    { key: "accommodations", label: "Where to stay" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Questions" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "Your names, as they appear", hint: "Leave empty to use the names on your event.", placeholder: "Isabel & Rafael", maxLength: 40 },
    { key: "heroKicker", label: "Line above your names", placeholder: "Together with our families", maxLength: 44 },
    { key: "walkOn", label: "Prompt at the bottom of the first screen", placeholder: "Step inside", maxLength: 24 },
    { key: "rubricStory", label: "Our story: red line above the heading", section: "hostIntro", placeholder: "A reading from the couple", maxLength: 40 },
    { key: "storyTitle", label: "Our story: heading", section: "hostIntro", placeholder: "Our story", maxLength: 30 },
    { key: "rubricDay", label: "The day: red line above the heading", placeholder: "The order of the day", maxLength: 40 },
    { key: "dayTitle", label: "The day: heading", placeholder: "The day", maxLength: 30 },
    { key: "ceremonyLabel", label: "Ceremony label", section: "venue", placeholder: "The ceremony", maxLength: 30 },
    { key: "receptionLabel", label: "Reception label", section: "venue", placeholder: "The reception", maxLength: 30 },
    { key: "receptionName", label: "Reception venue", section: "venue", hint: "Leave empty if there is no separate reception.", placeholder: "Hacienda Sinag", maxLength: 60 },
    { key: "receptionAddress", label: "Reception address", section: "venue", placeholder: "Barangay Dilaw, Calantas, Ilocos Norte", maxLength: 100 },
    { key: "receptionTime", label: "Reception time", section: "venue", placeholder: "Half past five in the evening", maxLength: 50 },
    { key: "receptionMap", label: "Reception map link (optional)", section: "venue", hint: "A Google Maps link. Leave empty to search for the venue.", placeholder: "https://maps.app.goo.gl/…", maxLength: 300 },
    { key: "programLabel", label: "Programme label", section: "schedule", placeholder: "The programme", maxLength: 30 },
    { key: "rubricSponsors", label: "Sponsors: red line above the heading", section: "sponsors", placeholder: "With the blessing of", maxLength: 40 },
    { key: "sponsorsTitle", label: "Sponsors: heading", section: "sponsors", hint: "Your parents and principal sponsors come from Entourage & motif.", placeholder: "Our sponsors", maxLength: 30 },
    { key: "rubricEntourage", label: "Entourage: red line above the heading", section: "entourage", placeholder: "Those who walk with us", maxLength: 40 },
    { key: "entourageTitle", label: "Entourage: heading", section: "entourage", hint: "Secondary sponsors and the bridal party come from Entourage & motif.", placeholder: "The entourage", maxLength: 30 },
    { key: "rubricWear", label: "What to wear: red line above the heading", section: "dress", placeholder: "For the day", maxLength: 40 },
    { key: "dressTitle", label: "What to wear: heading", section: "dress", placeholder: "What to wear", maxLength: 30 },
    { key: "dressCode", label: "What to wear", section: "dress", hint: "Your motif colours (Entourage & motif) show as swatches under it.", placeholder: "Barong Tagalog or a dark suit for the gentlemen; Filipiniana or a long gown for the ladies.", multiline: true, maxLength: 240 },
    { key: "rubricDetails", label: "Good to know: red line above the heading", placeholder: "Before you come", maxLength: 40 },
    { key: "detailsTitle", label: "Good to know: heading", placeholder: "Good to know", maxLength: 30 },
    { key: "stayTitle", label: "Where to stay: heading", section: "accommodations", placeholder: "Where to stay", maxLength: 30 },
    { key: "giftsTitle", label: "Gifts: heading", section: "registry", placeholder: "Gifts", maxLength: 30 },
    { key: "giftNote", label: "Gift note", section: "registry", hint: "Leave empty to use the note under Gifts.", placeholder: "Your presence is the greatest gift.", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "faqTitle", label: "Questions: heading", section: "faqs", placeholder: "Questions", maxLength: 30 },
    { key: "rubricRsvp", label: "RSVP: red line above the heading", section: "rsvp", placeholder: "At the altar", maxLength: 40 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Will you join us?", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send my reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", hint: "Shown after a guest accepts.", placeholder: "We look forward to seeing you at the church.", maxLength: 90 },
    { key: "afterParty", label: "After the wedding", hint: "Replaces the RSVP the day after.", placeholder: "Thank you for celebrating with us.", maxLength: 160 },
  ],
};
