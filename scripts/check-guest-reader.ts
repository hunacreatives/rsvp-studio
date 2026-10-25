// Mesa's guest list reader (src/pages/tools/seating/parse.ts), checked against the kinds of
// lists people really paste: spreadsheets, Google Forms, Viber, numbered lists, emoji, RSVP
// answers. Run after changing the reader:
//   npx tsx scripts/check-guest-reader.ts
// Prints each case and exits 1 if any reads wrong.

import { parseGuestText, SAMPLE_LIST } from "../src/pages/tools/seating/parse";

type Expect = { guests: number; names?: string[]; skipped?: number; unsure?: number; groups?: string[]; tables?: number };
const cases: [string, string, Expect][] = [
  ["Excel copy with a header", "Name\tSide\tNo. of guests\tTable\nJuan Dela Cruz\tBride\t2\t5\nMaria Santos\tGroom\t1\t\nThe Reyes Family\tBride\t4\t", { guests: 7, names: ["Reyes family · 1", "Guest of Juan"], tables: 2 }],
  ["Google Forms export", "Timestamp,Full name,Will you attend?,How many are you?,Message\n10/02/2026 14:22:01,Ana Lopez,Yes,2,Congrats!\n10/02/2026 15:01:44,Ben Cruz,No,0,\n10/03/2026 09:10:12,Carla Diaz,Yes,3,See you", { guests: 5, skipped: 1, names: ["Ana Lopez", "Carla Diaz"] }],
  ["Numbered list", "1. Juan Dela Cruz\n2. Maria Clara Santos\n3) Pedro Penduko + wife\n4 - Jose Rizal Jr.", { guests: 5, names: ["Jose Rizal Jr", "Pedro’s wife"] }],
  ["Viber, everyone on one line", "Tita Baby, Tito Nonoy, Ate Kat and Kuya JR, Lola Rosing, the Mendoza kids (3)", { guests: 8, names: ["Tita Baby", "Kuya JR", "Mendoza kid 3"] }],
  ["Families with a count", "Santos Family (5 pax)\nFam. Reyes - 4\nGarcia fam x3\nVillanueva family of 6", { guests: 18, names: ["Santos family · 5", "Reyes family · 4", "Garcia family · 3", "Villanueva family · 6"] }],
  ["Partners and kids in words", "Juan + wife + 2 kids\nPedro and his wife\nMark w/ gf\nLiza & husband & baby", { guests: 11, names: ["Juan’s wife", "Pedro’s wife", "Mark’s partner", "Liza’s husband", "Liza’s kid"] }],
  ["Bullets and emoji", "• Ana Lopez 💕\n- Ben Cruz ✅\n✔️ Carla Diaz (confirmed)\n👉 Dan Uy +1", { guests: 5, names: ["Ana Lopez", "Ben Cruz", "Carla Diaz", "Dan Uy", "Guest of Dan"] }],
  ["ALL CAPS with sides", "BRIDE SIDE\nJUAN DELA CRUZ\nMARIA SANTOS + 1\nGROOM SIDE\nPEDRO REYES & ANA REYES", { guests: 5, names: ["Juan Dela Cruz"], groups: ["Bride Side", "Groom Side"] }],
  ["Mr. and Mrs.", "Mr. and Mrs. Jose Santos\nMr. & Mrs. Cruz\nDr. Ramon Uy and Dra. Lisa Uy\nAtty. & Mrs. Benjamin Tan", { guests: 8, names: ["Mrs. Jose Santos", "Mrs. Cruz", "Mrs. Benjamin Tan"] }],
  ["RSVP answers on the line", "Ana Lopez - confirmed\nBen Cruz (not coming)\nCarla Diaz - maybe\nDan Uy - yes 2 pax\nEva Lim - declined", { guests: 4, skipped: 2, unsure: 1, names: ["Ana Lopez", "Carla Diaz", "Dan Uy"] }],
  ["Pasted Viber chat", "[10/02/26, 2:15 PM] Ate Joanna: Tita Grace + 1\n[10/02/26, 2:16 PM] Ate Joanna: Kuya Mark & Ate Bing", { guests: 4, names: ["Tita Grace", "Ate Bing"] }],
  ["Table plan lines", "Table 1 - Juan, Maria, Pedro\nTable 2: Ana Lopez, Ben Cruz\nVIP table: Ninong Jun, Ninang Liza", { guests: 7, tables: 7 }],
  ["Nicknames", "Ma. Theresa \"Tess\" Santos\nJose 'Jojo' Reyes\nMaria Cristina Lopez-Cruz", { guests: 3 }],
  ["Rows without a header", "Juan Dela Cruz, Bride, 2\nMaria Santos, Groom, 1", { guests: 3, names: ["Juan Dela Cruz", "Maria Santos"], groups: ["Bride’s side", "Groom’s side"] }],
  [
    "Cousins under each family",
    "BRIDE'S FAMILY\nTita Nena Santos\nCousins: Ria Santos, Kim Santos\nGROOM'S FAMILY\nLolo Andres Mendoza\nCousins: Paul Mendoza, Jessa Mendoza\nOFFICEMATES (BRIDE)\nJenny Lim",
    { guests: 7, groups: ["Bride’s Family", "Bride’s Family · Cousins", "Groom’s Family", "Groom’s Family · Cousins", "Officemates (bride)"] },
  ],
  ["The built-in sample", SAMPLE_LIST, { guests: 61, names: ["Patrick Mendoza", "Paolo Santos"] }],
];

let failed = 0;
for (const [label, text, want] of cases) {
  const r = parseGuestText(text);
  const names = r.guests.map((g) => g.name);
  const problems: string[] = [];
  if (r.guests.length !== want.guests) problems.push(`${r.guests.length} guests, expected ${want.guests}`);
  for (const n of want.names ?? []) if (!names.includes(n)) problems.push(`missing “${n}”`);
  if (want.skipped !== undefined && r.skipped.length !== want.skipped) problems.push(`${r.skipped.length} left out, expected ${want.skipped}`);
  if (want.unsure !== undefined && r.unsure.length !== want.unsure) problems.push(`${r.unsure.length} to check, expected ${want.unsure}`);
  if (want.tables !== undefined && Object.keys(r.wantTable).length !== want.tables) problems.push(`${Object.keys(r.wantTable).length} with a table, expected ${want.tables}`);
  for (const g of want.groups ?? []) if (!r.groups.some((x) => x.name === g)) problems.push(`no group “${g}”`);
  if (problems.length) failed++;
  console.log(`${problems.length ? "✗" : "✓"} ${label}${problems.length ? `: ${problems.join("; ")}\n    read: ${names.join(" | ")}` : ""}`);
}
console.log(failed ? `\n${failed} of ${cases.length} cases read wrong.` : `\nAll ${cases.length} cases read right.`);
process.exit(failed ? 1 : 0);
