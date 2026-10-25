// The Coordinator desk's next step per client (src/pages/account/portal/clientSteps.ts): each
// step in its turn, the date-based ones on the right days, and the This week strip and search.
// Run: npx tsx --tsconfig tsconfig.app.json scripts/check-client-steps.ts
import { daysFrom, matchesClient, nextClientStep, thisWeek, weekday, type ClientStepInput } from "../src/pages/account/portal/clientSteps";

let fails = 0;
const ok = (cond: boolean, msg: string) => (cond ? console.log("  ok  ", msg) : (fails++, console.log("  FAIL", msg)));

const TODAY = "2026-10-26"; // a Monday
const ME = "me";
const date = (offset: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
type P = ClientStepInput["project"];
const project = (p: Partial<P> = {}): P => ({ id: "ev1", event_date: date(30), project_status: "in_progress", access: "coordinator", client_of: null, handed_over_at: null, handover_to: null, ...p });
const live = { publishedAt: "2026-10-01T00:00:00Z", deadline: null, ended: false };
const step = (i: Partial<ClientStepInput>) => nextClientStep({ project: project(), site: live, stats: { invited: 50, waiting: 0 }, today: TODAY, ...i });

ok(daysFrom(TODAY, date(6)) === 6 && daysFrom(TODAY, null) === null, "daysFrom counts whole days");
ok(weekday("2026-10-31") === "Sat", "weekday: Oct 31 2026 is a Saturday");

// In order
ok(step({ project: project({ event_date: date(-1) }) }).key === "done", "past event: done");
ok(step({ project: project({ project_status: "completed" }) }).key === "done", "marked complete: done");
ok(step({ site: { ...live, ended: true } }).key === "done", "site ended: done");
ok(step({ project: project({ access: "viewer" }) }).key === "view", "a viewer (crew): nothing to do but look");
const design = step({ site: null });
ok(design.label === "Pick a design" && design.to === "/account/events/ev1/site-builder", "no site yet: Pick a design → the template gallery");
const publish = step({ site: { publishedAt: null, deadline: null, ended: false } });
ok(publish.label === "Finish and publish" && publish.to.endsWith("/site-builder/edit"), "not published: Finish and publish → the builder");
const mine = project({ access: "owner", client_of: ME });
const hand = step({ project: mine });
ok(hand.label === "Hand over to your client" && hand.to === "/account/projects/ev1#people", "my unclaimed client event, published: Hand over → People");
ok(step({ project: { ...mine, handover_to: "ana@x.ph" } }).key !== "handover", "hand-over invite already out: on to the next thing");
ok(step({ project: { ...mine, handed_over_at: "2026-10-20T00:00:00Z" } }).key !== "handover", "already handed over: no hand-over step");
ok(step({ site: null, project: mine }).key === "design", "a site comes before the hand-over");
const list = step({ stats: { invited: 0, waiting: 0 } });
ok(list.label === "Add the guest list" && list.to === "/account/projects/ev1?tab=guests&list=invites", "no invite list: Add the guest list → Guests → Invite list");
ok(step({ stats: undefined }).key === "ready", "guest numbers still loading: no guest steps");

// Replies
const fri = step({ site: { ...live, deadline: date(4) }, stats: { invited: 52, waiting: 12 } });
ok(fri.key === "waiting" && fri.label === "12 haven’t replied" && fri.cta === "Send a reminder", "deadline 4 days off: 12 haven’t replied, Send a reminder");
const close = step({ site: { ...live, deadline: date(3) }, stats: { invited: 52, waiting: 12 } });
ok(close.label === "Replies close Thu" && !close.urgent, "deadline in 3 days with people waiting: Replies close Thu");
ok(step({ site: { ...live, deadline: date(1) }, stats: { invited: 52, waiting: 2 } }).label === "Replies close tomorrow", "…tomorrow");
const today = step({ site: { ...live, deadline: TODAY }, stats: { invited: 52, waiting: 2 } });
ok(today.label === "Replies close today" && today.urgent === true, "…today, in the warning colour");
ok(step({ site: { ...live, deadline: date(2) }, stats: { invited: 52, waiting: 0 } }).key === "ready", "deadline close but everyone replied: nothing about replies");
ok(step({ site: { ...live, deadline: date(-2) }, stats: { invited: 52, waiting: 5 } }).key === "waiting", "deadline passed, still waiting: n haven’t replied");

// As the day gets close
const seat = step({ project: project({ event_date: date(14) }) });
ok(seat.label === "Seat your guests" && seat.to === "/tools/seating-chart-maker?event=ev1", "event in 14 days, all replied: Seat your guests → Mesa");
ok(step({ project: project({ event_date: date(15) }) }).key === "ready", "event in 15 days: all set for now");
const check = step({ project: project({ event_date: date(2) }) });
ok(check.label === "Set up check-in" && !check.urgent && check.to.startsWith("/tools/seating-chart-maker"), "event in 2 days: Set up check-in → Mesa");
ok(step({ project: project({ event_date: TODAY }) }).urgent === true, "event today: check-in, in the warning colour");
ok(step({ project: project({ event_date: date(1) }), checkinOn: true }).key === "ready", "check-in already on: nothing left to set up");
ok(step({ project: project({ event_date: date(2) }), stats: { invited: 40, waiting: 3 } }).key === "checkin", "two days out: check-in comes before chasing the last replies");
ok(step({ project: project({ event_date: date(2) }), stats: { invited: 40, waiting: 3 }, checkinOn: true }).key === "waiting", "check-in on: then the replies");
ok(step({ project: project({ event_date: date(6) }), stats: { invited: 40, waiting: 3 } }).key === "waiting", "a week out: replies before seating");
ok(step({ project: project({ event_date: null }) }).key === "ready", "no date: nothing date-based");

// This week + search
const ps = [
  { id: "a", name: "Ana & Ben", event_date: date(5), project_status: "in_progress" },
  { id: "b", name: "Lia’s debut", event_date: date(6), project_status: "in_progress" },
  { id: "c", name: "Cruz 50th", event_date: date(47), project_status: "in_progress" },
  { id: "d", name: "Yesterday’s", event_date: date(-1), project_status: "in_progress" },
  { id: "e", name: "Today", event_date: TODAY, project_status: "in_progress" },
  { id: "f", name: "Done early", event_date: date(3), project_status: "completed" },
  { id: "g", name: "Next Monday", event_date: date(7), project_status: "in_progress" },
  { id: "h", name: "No date", event_date: null, project_status: "in_progress" },
];
ok(thisWeek(ps, TODAY).map((p) => p.id).join(",") === "e,a,b,g", "This week: today through 7 days on, soonest first, not past/completed/undated");
ok(matchesClient({ name: "José & Ria" }, "jose") && matchesClient({ name: "Lia’s debut" }, " DEBUT ") && !matchesClient({ name: "Cruz 50th" }, "ana"), "search ignores case, accents and spaces");
ok(matchesClient({ name: "Anything" }, ""), "empty search shows everyone");

console.log(fails ? `\n${fails} failed` : "\nall good");
process.exit(fails ? 1 : 0);
