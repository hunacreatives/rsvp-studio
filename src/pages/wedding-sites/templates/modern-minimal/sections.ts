// Modern Minimal's movable sections, in its own order (between the hero and the RSVP).
export const MM_SECTIONS: { key: string; label: string; vis?: string[] }[] = [
  { key: "hostIntro", label: "Our story" },
  { key: "schedule", label: "Schedule" },
  { key: "venue", label: "Venue" },
  { key: "stay", label: "Travel", vis: ["accommodations", "travelInformation"] },
  { key: "entourage", label: "Entourage" },
  { key: "gallery", label: "Photos" },
  { key: "registry", label: "Gifts" },
  { key: "faqs", label: "Questions" },
];
