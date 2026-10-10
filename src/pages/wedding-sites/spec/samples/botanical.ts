// Botanical, rebuilt as an uploadable template spec — the Phase 1a proof
// that the spec runtime can reproduce a hand-coded template with no code.
// Layer boxes come from the same measurements the coded Hero used (text
// safe zone: top 25%, bottom 26.5%, left/right 9% of the card).
//
// This is plain data: it is exactly what Studio → Templates will store in
// the database for an uploaded design.

export const botanicalSpec = {
  specVersion: 1,
  meta: { eventTypes: ["wedding"] },
  tokens: {
    palettes: [
      {
        id: "burgundy-cream",
        label: "Burgundy & Cream",
        colors: { bg: "#fff4e4", surface: "#f8e8d4", ink: "#520606", muted: "#8a7060", accent: "#520606", onAccent: "#fff4e4" },
      },
    ],
    defaultPaletteId: "burgundy-cream",
    allowGlobalPalettes: false,
    fonts: {
      display: { family: "Dancing Script", weights: [400, 700], fallback: "cursive" },
      body: { family: "Cormorant Garamond", weights: [400, 600, 700], italic: true, fallback: "Georgia, serif" },
    },
    radius: "round",
  },
  assets: {
    "invitation-card": { url: "/event-templates/botanical/invitation-card.webp", w: 900, h: 1863 },
  },
  sections: [
    {
      id: "hero",
      kind: "canvas",
      visibilityKey: "hero",
      aspect: [900, 1863],
      maxWidth: 600,
      band: "bg",
      backgroundAssetId: "invitation-card",
      layers: [
        { id: "eyebrow", type: "text", text: "Wedding Invitation", bind: { field: "occasion.invitation" }, box: { x: 0.09, y: 0.245, w: 0.82, h: 0.03 }, size: 2.6, color: "bg", opacity: 0.92 },
        {
          id: "host-1", type: "text", when: { minHosts: 2 }, bind: { field: "hosts.0.name" }, editorHint: "First name",
          box: { x: 0.09, y: 0.405, w: 0.82, h: 0.07 }, font: "display", size: 7.4, minSize: 4.2, color: "bg", lineHeight: 1.1,
        },
        {
          id: "and", type: "text", when: { minHosts: 2 }, text: "and",
          box: { x: 0.09, y: 0.466, w: 0.82, h: 0.018 }, size: 2.0, color: "bg", uppercase: true, letterSpacing: 0.2, opacity: 0.85,
        },
        {
          id: "host-2", type: "text", when: { minHosts: 2 }, bind: { field: "hosts.1.name" }, editorHint: "Second name",
          box: { x: 0.09, y: 0.472, w: 0.82, h: 0.07 }, font: "display", size: 7.4, minSize: 4.2, color: "bg", lineHeight: 1.1,
        },
        {
          id: "host-solo", type: "text", when: { maxHosts: 1 }, bind: { field: "hosts.names" }, editorHint: "Your name",
          box: { x: 0.09, y: 0.41, w: 0.82, h: 0.13 }, font: "display", size: 7.4, minSize: 4.2, color: "bg", lineHeight: 1.1,
        },
        {
          id: "month", type: "text", bind: { field: "eventDate", format: "monthShort" }, editorHint: "MON", hideWhenEmpty: true,
          box: { x: 0.39, y: 0.675, w: 0.1, h: 0.018 }, size: 1.85, weight: 700, letterSpacing: 0.1, color: "bg", align: "left", opacity: 0.85,
        },
        {
          id: "day", type: "text", bind: { field: "eventDate", format: "day" }, editorHint: "00", hideWhenEmpty: true,
          box: { x: 0.39, y: 0.69, w: 0.1, h: 0.035 }, font: "display", size: 5.8, weight: 700, color: "bg", align: "left", lineHeight: 1,
        },
        {
          id: "year", type: "text", bind: { field: "eventDate", format: "year" }, editorHint: "Year", hideWhenEmpty: true,
          box: { x: 0.39, y: 0.725, w: 0.1, h: 0.018 }, size: 1.85, color: "bg", align: "left", opacity: 0.85,
        },
        {
          id: "time", type: "text", bind: { field: "eventDate", format: "time" }, hideWhenEmpty: true,
          box: { x: 0.5, y: 0.677, w: 0.29, h: 0.02 }, size: 2.15, weight: 700, color: "bg", align: "left",
        },
        {
          id: "venue", type: "text", bind: { field: "venue.nameOrAddress" }, editorHint: "Your venue", hideWhenEmpty: true,
          box: { x: 0.5, y: 0.697, w: 0.29, h: 0.05 }, size: 2.15, minSize: 1.6, color: "bg", align: "left", valign: "top", lineHeight: 1.5, opacity: 0.9,
        },
      ],
    },
    { id: "story", kind: "block", block: "story", visibilityKey: "hostIntro", heading: "Our Story", divider: "leaf" },
    { id: "people", kind: "block", block: "keyPeople", visibilityKey: "hostIntro", heading: "The Entourage", divider: "leaf" },
    { id: "schedule", kind: "block", block: "schedule", visibilityKey: "schedule", band: "surface", heading: "Order of Events", divider: "leaf" },
    { id: "venue", kind: "block", block: "venue", visibilityKey: "venue", heading: "The Venue", divider: "leaf" },
    { id: "gallery", kind: "block", block: "gallery", visibilityKey: "gallery", band: "surface", heading: "Gallery", divider: "leaf" },
    { id: "registry", kind: "block", block: "registry", visibilityKey: "registry", heading: "Registry", divider: "leaf" },
    { id: "faqs", kind: "block", block: "faqs", visibilityKey: "faqs", band: "surface", heading: "Questions", divider: "leaf" },
    { id: "rsvp", kind: "block", block: "rsvp", visibilityKey: "rsvp", heading: "Kindly Respond", divider: "leaf" },
    { id: "footer", kind: "block", block: "footer" },
  ],
};
