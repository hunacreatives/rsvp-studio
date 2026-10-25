// Mesa's page words, in one place: the app shows them, and api/invite-page.ts (?op=page)
// puts the same text in the page's HTML for search engines and link previews, so what
// Google reads is what people see. Mesa = "table"; the tool is Mesa by The RSVP Studio.

export const SEATING_PATH = "/tools/seating-chart-maker";
export const SEATING_TITLE = "Mesa: Free Seating Chart Maker for Weddings, Debuts & Events — The RSVP Studio";
export const SEATING_DESCRIPTION = "Mesa is a free seating chart maker for weddings, debuts, birthdays and every kind of event. Paste your guest list and seat everyone, no sign-up needed; download and share with a free account.";

export const SEATING_NAME = "Mesa";
export const SEATING_H1 = "Mesa by The RSVP Studio";
// "\n" marks where a line should break on wide screens (never a word left alone).
export const SEATING_SUB = "The free seating chart maker for weddings,\ndebuts, birthdays and every celebration in between.";
export const SEATING_FACTS = "No sign-up to start · No guest limit · Works on your phone";

export const SEATING_STEPS: [string, string][] = [
  ["Paste your list", "Copy it from Viber, Notes or Excel. “Tito Ben & Tita Marie + 2 kids” stays together as one family. If your list already says “Table 5”, they go to Table 5."],
  ["Seat everyone", "Sponsors go beside the presidential table, the bride’s guests on one side and the groom’s on the other. Drag anyone to change it."],
  ["Print or share", "Download the floor plan, an A–Z list for the entrance and table lists for your caterer, or send your coordinator a link."],
];

export const SEATING_LAYOUT: [string, string][] = [
  ["Presidential table", "The couple and both sets of parents,\nin front of the stage, facing the guests."],
  ["Principal sponsors", "Right beside the presidential table, married pairs together.\nSix to twelve pairs usually need two tables."],
  ["Secondary sponsors and entourage", "Near the front. Cord, veil, coin and candle sponsors share a table;\nthe entourage takes one or two."],
  ["Family", "The bride’s guests on one side of the dance floor,\nthe groom’s on the other."],
  ["Everyone else", "Friends, officemates and church friends further back, each group at its own tables. Lolos and lolas away from the speakers."],
];

export const SEATING_FAQ: [string, string][] = [
  ["How many guests fit at a round table?", "Usually 10. A 60-inch round seats 8 and a 72-inch round seats 10. Lauriat receptions often use rounds of 12."],
  ["Who sits at the presidential table?", "The couple and both sets of parents. Some couples add grandparents. Principal sponsors sit at the tables beside it."],
  ["How many tables do I need?", "Your guest count divided by 10, plus the presidential, sponsors’ and entourage tables, plus one spare for late RSVPs."],
  ["When should we finish the seating plan?", "Two to three weeks before the day, after your RSVP deadline, so your coordinator and caterer have the final lists."],
  ["Can guests find their own table?", "Print the A–Z list for the entrance, or add a Find your table page to your RSVP Studio website so guests can check on their phones."],
  ["Is Mesa free? Where does my list go?", "Yes, with no guest limit. You can start and seat everyone without an account; downloads and share links need a free one. Your list stays in your browser until you sign up, then it’s saved to your account."],
];
