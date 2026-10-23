// Scrapbook's movable sections, in its own order (between the cover and the RSVP).
export const SB_SECTIONS: { key: string; label: string; vis?: string[] }[] = [
  { key: "hostIntro", label: "Our story" },
  { key: "schedule", label: "The day" },
  { key: "venue", label: "The venue" },
  { key: "stay", label: "Travel & stay", vis: ["accommodations", "travelInformation"] },
  { key: "entourage", label: "Entourage" },
  { key: "gallery", label: "Our album" },
  { key: "registry", label: "Gifts" },
  { key: "faqs", label: "Questions" },
];
