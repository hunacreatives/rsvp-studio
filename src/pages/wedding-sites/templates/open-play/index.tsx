import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import OpenPlayTemplate from "./OpenPlayTemplate";
import { openPlayDemo } from "../../content/fixtures/open-play-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "open-court",
  fontPairingId: "barlow-condensed",
  sectionVisibility: { ...defaultSectionVisibility },
};

// A pickleball court seen from above, scrolled baseline to baseline (Philippine open-play
// culture: a session card, rounds, the kitchen for house rules, an open-play paddle rack of
// who's playing). Night court is its second colour scheme.
export const openPlayTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "open-play",
  label: "Open Play",
  archetype: "editorial",
  previewThumbnailUrl: "/event-templates/open-play/demo/play-1.webp",
  cardImage: "/event-templates/cards/open-play.webp",
  component: OpenPlayTemplate,
  defaultSettings,
  tier: "free",
  demoContent: openPlayDemo,
  uses: ["story", "dateVenue", "schedule", "gallery", "registry", "faqs"],
  // The card renders the court at nearly its full width, so it fills the card edge to edge.
  galleryWidth: 960,
  // The hero box plus up to four court photos.
  galleryLimit: 5,
  storyLabel: "Message",
  storyHint: "A few lines under the session card, e.g. “Turning 30 on court. Beginners welcome, merienda after.”",
  hideable: [
    { key: "hostIntro", label: "Message" },
    { key: "kitchen", label: "The kitchen (house rules and FAQs)" },
    { key: "schedule", label: "The rounds (schedule)" },
    { key: "wear", label: "What to wear" },
    { key: "bring", label: "What to bring" },
    { key: "gallery", label: "Photos" },
    { key: "entourage", label: "Entourage" },
    { key: "registry", label: "Gifts" },
    { key: "roster", label: "Who’s playing (guests’ first names on the paddle rack)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "kicker", label: "Small line above the headline", placeholder: "Laro tayo", maxLength: 24 },
    { key: "headline", label: "Headline", hint: "Press Enter where it should break.", placeholder: "Kai’s 30th\nOpen Play", multiline: true, maxLength: 40 },
    { key: "occasionLine", label: "Line under the headline", placeholder: "Come play for my 30th birthday", maxLength: 70 },
    { key: "courtLabel", label: "Court", placeholder: "Courts 3 & 4", maxLength: 24 },
    { key: "format", label: "How you’ll play", placeholder: "Doubles · round robin", maxLength: 32 },
    { key: "skillNote", label: "Who can play", placeholder: "All levels", maxLength: 32 },
    { key: "kitchenTitle", label: "House rules heading", section: "kitchen", placeholder: "Stay out of the kitchen", maxLength: 32 },
    { key: "kitchenRules", label: "House rules", hint: "One per line.", section: "kitchen", placeholder: "Paddles in the rack to queue\nWinners stay, losers buy drinks", multiline: true, maxLength: 400 },
    { key: "foodLine", label: "Food and drinks", hint: "Shown under the rounds.", section: "schedule", placeholder: "Merienda after, sagot ko", maxLength: 60 },
    { key: "dressCode", label: "What to wear", section: "wear", placeholder: "Court shoes, and anything blue or white.", multiline: true, maxLength: 200 },
    { key: "bring", label: "What to bring", hint: "One thing per line.", section: "bring", placeholder: "Court shoes\nA water bottle\nYour paddle (may extra kami)", multiline: true, maxLength: 400 },
    { key: "rackLabel", label: "Above the paddle rack", section: "roster", placeholder: "Who’s playing", maxLength: 24 },
    { key: "paddleNote", label: "Under the paddle rack", section: "roster", placeholder: "Spare paddles at the front desk", maxLength: 60 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Join the roster", maxLength: 30 },
    { key: "rsvpButton", label: "RSVP button", section: "rsvp", placeholder: "Put my paddle in", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", hint: "Shown after a guest says yes.", section: "rsvp", placeholder: "You’re on the roster. See you on court.", maxLength: 80 },
  ],
};
