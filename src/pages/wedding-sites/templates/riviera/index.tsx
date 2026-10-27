import type { TemplateDefinition } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import { defaultSectionVisibility } from "../../presentation/types";
import RivieraTemplate from "./RivieraTemplate";
import { rivieraDemo } from "../../content/fixtures/riviera-demo";

const defaultSettings: BaseTemplateSettings = {
  paletteId: "riviera",
  fontPairingId: "bodoni-newsreader",
  sectionVisibility: { ...defaultSectionVisibility },
};

// Yacht parties (birthdays, engagements, anniversaries at sea): one yacht seen from above, the
// whole page long, under way on a real-time sea. Every section sits on a part of the boat.
export const rivieraTemplateDefinition: TemplateDefinition<BaseTemplateSettings> = {
  id: "riviera",
  label: "Riviera",
  archetype: "formal-stationery",
  previewThumbnailUrl: "/event-templates/cards/riviera.webp?v=1",
  cardImage: "/event-templates/cards/riviera.webp?v=1",
  component: RivieraTemplate,
  defaultSettings,
  tier: "premium",
  demoContent: rivieraDemo,
  uses: ["story", "dateVenue", "schedule", "registry", "faqs"],
  storyLabel: "Invitation note",
  storyHint: "A few lines, on the hardtop. Leave a blank line between paragraphs.",
  hideable: [
    { key: "hostIntro", label: "Invitation note" },
    { key: "schedule", label: "The evening (schedule and pier)" },
    { key: "dress", label: "What to wear" },
    { key: "registry", label: "Gifts" },
    { key: "faqs", label: "Good to know (FAQs)" },
    { key: "rsvp", label: "RSVP" },
  ],
  customFields: [
    { key: "names", label: "Names on the sun pad", hint: "Leave empty to use the names on your event.", placeholder: "Celine & Marco", maxLength: 40 },
    { key: "heroLine", label: "Small line above the names", hint: "Leave empty for “An engagement cruise”, “A birthday at sea”…", placeholder: "An engagement cruise", maxLength: 50 },
    { key: "replyButton", label: "Reply button", placeholder: "Kindly reply", maxLength: 24 },
    { key: "boardingTime", label: "Boarding time", hint: "On the windscreen, beside the departure time (your event’s time).", placeholder: "4:30 PM", maxLength: 12 },
    { key: "returnTime", label: "Back on shore", placeholder: "9:30 PM", maxLength: 12 },
    { key: "flagInitials", label: "Letters on the flag", hint: "Leave empty for your initials.", placeholder: "C · M", maxLength: 9 },
    { key: "noteTitle", label: "Invitation heading", section: "hostIntro", placeholder: "You’re invited", maxLength: 30 },
    { key: "eveningLabel", label: "Evening label", section: "schedule", placeholder: "The evening", maxLength: 30 },
    { key: "eveningTitle", label: "Evening heading", section: "schedule", hint: "Leave empty to use the pier (your venue’s name).", placeholder: "Manila Bay, at sunset", maxLength: 50 },
    { key: "dressCode", label: "What to wear", section: "dress", placeholder: "White and navy, linen welcome. Soft soles or barefoot on deck.", multiline: true, maxLength: 220 },
    { key: "giftNote", label: "Gift note", section: "registry", placeholder: "Your company is the only gift we need.", multiline: true, maxLength: 220 },
    { key: "giftButton", label: "Gift button", section: "registry", placeholder: "View gift details", maxLength: 30 },
    { key: "rsvpTitle", label: "RSVP heading", section: "rsvp", placeholder: "Will you join us aboard?", maxLength: 40 },
    { key: "rsvpButton", label: "Send button", section: "rsvp", placeholder: "Send reply", maxLength: 24 },
    { key: "thankYou", label: "Thank-you message", section: "rsvp", placeholder: "Your place on board is saved.", maxLength: 90 },
    { key: "afterParty", label: "After the day", hint: "Replaces the RSVP the day after.", maxLength: 160 },
  ],
};
