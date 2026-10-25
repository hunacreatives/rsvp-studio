// Start from my RSVPs: an invite list and replies → Mesa households. Checks the cases that
// matter: coming with fewer or more, declines left out, no reply yet, forwarded links,
// a guest who sent the form twice, the names they gave, and replies not on the list.
// Run: npx tsx --tsconfig tsconfig.app.json scripts/check-replies.ts
import { householdsFromEvent, syncReplies, type Reply } from "../src/pages/tools/seating/replies";
import { emptyChart, type Chart } from "../src/pages/tools/seating/model";

let fails = 0;
const ok = (cond: boolean, msg: string) => (cond ? console.log("  ok  ", msg) : (fails++, console.log("  FAIL", msg)));
let n = 0;
const reply = (p: Partial<Reply>): Reply => ({ id: `r${++n}`, name: "", email: null, phone: null, attending: true, guest_count: 1, kid_count: null, dietary: null, invitee_id: null, answers: null, updated_at: null, created_at: `2026-10-0${(n % 9) + 1}T00:00:00Z`, ...p });

const invitees = [
  { id: "i1", name: "Tito Ben & Tita Marie Santos + 2 kids", party_size: 4, table_label: null, contact: "ben@x.ph" },
  { id: "i2", name: "Ninong Jun & Ninang Liza Cruz", party_size: 2, table_label: null, contact: null },
  { id: "i3", name: "Hannah Sy", party_size: 1, table_label: null, contact: null },
  { id: "i4", name: "Lola Cora Reyes", party_size: 1, table_label: null, contact: null },
  { id: "i5", name: "Paolo Reyes", party_size: 2, table_label: null, contact: "0917 123 4567" },
  { id: "i6", name: "Mika Rivera", party_size: 1, table_label: null, contact: null },
];
const replies = [
  // Santos: 3 coming, 1 kid, by email, with a dietary note
  reply({ name: "Ben Santos", email: "BEN@x.ph", guest_count: 3, kid_count: 1, dietary: "No pork" }),
  // Cruz: can't come
  reply({ name: "Jun Cruz", attending: false }),
  // Hannah: replied twice; the newer says 2
  reply({ name: "Hannah Sy", guest_count: 1, updated_at: "2026-10-01T00:00:00Z" }),
  reply({ name: "Hannah Sy", guest_count: 2, updated_at: "2026-10-05T00:00:00Z" }),
  // Paolo: by mobile, gave the names
  reply({ name: "Paolo R.", phone: "+63 917 123 4567", guest_count: 2, answers: { Party: "Paolo Reyes, Jill Ramirez" } }),
  // Mika: personal link forwarded to a friend; both reply on it
  reply({ name: "Mika Rivera", invitee_id: "i6", guest_count: 1 }),
  reply({ name: "Carla Diaz", invitee_id: "i6", guest_count: 1 }),
  // Not on the list: two people from the open form, one can't come
  reply({ name: "Enzo Aquino", guest_count: 2 }),
  reply({ name: "Toni Navarro", attending: false }),
];
const r = householdsFromEvent(invitees, replies);
const household = (inviteeId: string) => r.guests.filter((g) => g.inviteeId === inviteeId);
const santos = household("i1");
ok(santos.length === 3 && santos.filter((g) => g.tags?.includes("kid")).length === 1, `Santos: 3 coming, 1 kid (${santos.map((g) => g.name).join(", ")})`);
ok(santos[0].meal === "No pork", "Santos: dietary note on the person who replied");
ok(!household("i2").length && r.declined === 2, "Cruz and the open-form decline are left out (2 declined)");
ok(household("i3").length === 2, "Hannah: the newer reply (2) counts, not both");
ok(household("i4").length === 1 && household("i4")[0].reply === "pending" && household("i4")[0].tags?.includes("senior") === true, "Lola Cora: no reply yet, in as pending, tagged senior");
ok(household("i5").map((g) => g.name).join("|") === "Paolo Reyes|Jill Ramirez", "Paolo: matched by mobile, the names he gave");
ok(household("i6").length === 2, "Mika: her reply and the friend's on her link, one household of 2");
const enzo = r.guests.filter((g) => g.inviteeId?.startsWith("r:"));
ok(enzo.length === 2 && enzo.every((g) => g.reply === "yes"), "Enzo: not on the list, his own household of 2");
ok(r.pending === 1, "1 line not replied yet");
ok(r.seen.i1 === "yes:3" && r.seen.i2 === "no" && r.seen.i4 === "pending", "what each line said is remembered");
ok(new Set(r.guests.map((g) => g.party)).size === 6, "6 households in all");

// ---- keeping the plan current ----
console.log("\nsync");
const plan: Chart = { ...emptyChart("wedding"), groups: r.groups, guests: r.guests.map((g, i) => ({ ...g, tableId: "t1", seat: i })), tables: [{ id: "t1", label: "1", shape: "round", seats: 20, x: 0, y: 0, rot: 0 }], site: { eventId: "e1", slug: "x", seen: r.seen } };
const party = (id: string) => plan.guests.filter((g) => g.inviteeId === id);
// Nothing changed: nothing happens.
let s0 = syncReplies(plan, invitees, replies);
ok(!s0.changed && !s0.items.length, "same replies again: no changes");
// The host marks one of Paolo's two as not coming; the next sync must leave that alone.
party("i5")[1].reply = "no";
s0 = syncReplies(plan, invitees, replies);
ok(party("i5")[1].reply === "no", "the host's own change stays when the reply hasn't changed");
// New answers.
const later = replies.map((x) => ({ ...x }));
later.find((x) => x.name === "Ben Santos")!.attending = false; // Santos can't come now
later.find((x) => x.name === "Mika Rivera")!.guest_count = 1;
later.splice(later.findIndex((x) => x.name === "Carla Diaz"), 1); // the friend's reply is gone: 1 coming
later.filter((x) => x.name === "Hannah Sy").forEach((x) => (x.guest_count = 3)); // 3, no names
later.push(reply({ name: "Lola Cora Reyes", guest_count: 1, invitee_id: "i4" })); // pending → yes
const moreInvites = [...invitees, { id: "i7", name: "Kuya Toto Reyes", party_size: 2, table_label: null, contact: null }];
const s1 = syncReplies(plan, moreInvites, later);
ok(party("i1").every((g) => g.reply === "no") && s1.declined.length === 1, "Santos now can't come: all marked, still seated");
ok(party("i1").every((g) => g.tableId === "t1"), "nothing is unseated by itself");
ok(party("i6").filter((g) => g.reply !== "no").length === 1, "Mika: 2 → 1, her plus-one goes (clear-cut)");
ok(s1.items.some((x) => x.kind === "more" && x.coming === 3 && x.have === 2), "Hannah: says 3, plan has 2 → a plan-check item");
ok(party("i4")[0].reply === "yes", "Lola Cora replied: now coming");
ok(s1.items.some((x) => x.kind === "new" && x.lines.some((l) => l.inviteeId === "i7")), "Kuya Toto added to the invite list → offered to add");
const s1b = syncReplies(plan, moreInvites, later);
ok(s1b.items.some((x) => x.kind === "more" && x.coming === 3), "Hannah's item is still there next time (until it's fixed)");
// Santos changes back to yes: comes back.
const again = later.map((x) => ({ ...x }));
again.find((x) => x.name === "Ben Santos")!.attending = true;
const s2 = syncReplies(plan, moreInvites, again);
ok(s2.back.length === 1 && party("i1").every((g) => g.reply === "yes"), "Santos says yes again: back in");
console.log(fails ? `\n${fails} failed` : "\nall good");
process.exit(fails ? 1 : 0);
