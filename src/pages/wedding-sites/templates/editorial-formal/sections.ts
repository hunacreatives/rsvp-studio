// Editorial Formal's movable sections, in its own order (between the hero and the RSVP).
export const EF_SECTIONS: { key: string; label: string; vis?: string[] }[] = [
  { key: "hostIntro", label: "Your story" },
  { key: "schedule", label: "Schedule" },
  { key: "venue", label: "Venue" },
  { key: "stay", label: "Travel & stay", vis: ["accommodations", "travelInformation"] },
  { key: "entourage", label: "Entourage" },
  { key: "gallery", label: "Photos" },
  { key: "registry", label: "Gifts" },
  { key: "faqs", label: "FAQs" },
];
