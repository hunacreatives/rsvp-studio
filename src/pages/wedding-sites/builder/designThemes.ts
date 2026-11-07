// Theme pages: /build opened on one kind of design, with its own link to share or advertise
// (/pickleball). A design belongs to a theme when its `keywords` include the theme's keyword, so a
// new pickleball design shows up on /pickleball by itself once it lists "pickleball".
// The design preview's back button returns here (?from=<theme>).

export const DESIGN_THEMES = {
  pickleball: {
    path: "/pickleball",
    keyword: "pickleball",
    title: "Pickleball Invites",
    line: "For a birthday on the court, open play or game day with friends. Guests RSVP right on the invite. Free to start.",
    back: "Pickleball designs",
  },
} as const;

export type DesignTheme = keyof typeof DESIGN_THEMES;

export const isDesignTheme = (s: string | null | undefined): s is DesignTheme => !!s && Object.hasOwn(DESIGN_THEMES, s);
