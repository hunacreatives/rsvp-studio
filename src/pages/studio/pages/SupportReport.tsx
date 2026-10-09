import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { BUSINESS_DAY_MS, businessMs, categoryLabel, RATING_LABEL, SUPPORT_CATEGORIES, ticketCode, type Holidays } from "@/pages/account/portal/support";
import type { SupportRating, ThreadSummary } from "@/pages/account/portal/types";
import { ErrorText, Input, PillButton, PrimaryButton } from "@/pages/account/portal/ui";
import * as studio from "../studioApi";

// Studio → Support → Report. How support is going, in office hours
// (Mon–Fri 9 AM–6 PM Manila, minus holidays): counts always next to percentages,
// auto-closed requests kept apart from ones we actually solved.

const MANILA = 8 * 3_600_000;
const monthOf = (iso: string | null | undefined) => (iso ? new Date(new Date(iso).getTime() + MANILA).toISOString().slice(0, 7) : "");
const shiftMonth = (key: string, by: number) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
};
const monthName = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Office-hours duration in words: "2h 15m", or "1.5 business days" from a full day up. */
function workTime(ms: number | null) {
  if (ms === null) return "—";
  if (ms >= BUSINESS_DAY_MS) return `${(ms / BUSINESS_DAY_MS).toFixed(1)} business days`;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function stats(requests: ThreadSummary[], month: string, holidays: Holidays) {
  const received = requests.filter((t) => monthOf(t.created_at) === month);
  const closedIn = requests.filter((t) => t.status === "resolved" && monthOf(t.resolved_at) === month);
  const autoClosed = closedIn.filter((t) => t.auto_closed_at);
  const solved = closedIn.filter((t) => !t.auto_closed_at);
  const answered = received.filter((t) => t.first_response_at);
  const firstReply = answered.map((t) => businessMs(t.created_at, t.first_response_at!, holidays));
  const withinDay = firstReply.filter((ms) => ms <= BUSINESS_DAY_MS).length;
  const resolution = solved.map((t) => businessMs(t.created_at, t.resolved_at!, holidays));
  const rated = requests.filter((t) => t.rating && monthOf(t.rated_at) === month);
  const ratings = { great: 0, okay: 0, not_good: 0 } as Record<SupportRating, number>;
  for (const t of rated) ratings[t.rating!]++;
  const topics = SUPPORT_CATEGORIES.map((c) => ({ ...c, count: received.filter((t) => (t.category ?? "other") === c.id).length })).filter((c) => c.count);
  return {
    received: received.length,
    solved: solved.length,
    autoClosed: autoClosed.length,
    answered: answered.length,
    unanswered: received.length - answered.length,
    firstReply: median(firstReply),
    withinDay,
    resolution: median(resolution),
    ratings,
    rated,
    topics,
  };
}

export default function SupportReport({ requests, holidays }: { requests: ThreadSummary[]; holidays: Holidays }) {
  const { people } = usePortal();
  const [, setParams] = useSearchParams();
  const thisMonth = monthOf(new Date().toISOString());
  const [month, setMonth] = useState(thisMonth);
  const now = useMemo(() => stats(requests, month, holidays), [requests, month, holidays]);
  const prev = useMemo(() => stats(requests, shiftMonth(month, -1), holidays), [requests, month, holidays]);

  const openNow = requests.filter((t) => t.status !== "resolved");
  const oldest = openNow
    .filter((t) => t.status === "needs_reply")
    .sort((a, b) => new Date(a.last_customer_at ?? a.last_message_at).getTime() - new Date(b.last_customer_at ?? b.last_message_at).getTime())[0];
  const openRequest = (id: string) => setParams({ thread: id });
  const nameOf = (t: ThreadSummary) => t.counterpartName || people[t.profile_id]?.email || "Customer";
  const ratedCount = now.rated.length;
  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");
  const vs = (a: number, b: number) => (b || a ? `${a >= b ? "+" : ""}${a - b} vs ${monthName(shiftMonth(month, -1)).split(" ")[0]}` : "");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <PillButton onClick={() => setMonth(shiftMonth(month, -1))}>‹</PillButton>
        <span className="min-w-[150px] text-center text-[15px] font-semibold text-[var(--ink)]">{monthName(month)}</span>
        <PillButton onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth}>
          ›
        </PillButton>
        <span className="ml-auto text-[12px] text-[var(--slate)]">Times count office hours only: Mon–Fri, 9 AM–6 PM Manila, minus holidays.</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Received" value={String(now.received)} sub={vs(now.received, prev.received)} />
        <Stat
          label="Solved"
          value={String(now.solved)}
          sub={`${now.autoClosed} auto-closed (no reply from the customer)`}
        />
        <Stat label="Open now" value={String(openNow.length)} sub={`${openNow.filter((t) => t.status === "needs_reply").length} need a reply · ${openNow.filter((t) => t.status === "waiting").length} waiting on customer`} />
        <Stat
          label="Oldest waiting on us"
          value={oldest ? workTime(businessMs(oldest.last_customer_at ?? oldest.last_message_at, new Date(), holidays)) : "—"}
          sub={oldest ? `${ticketCode(oldest.ticket_number)} · ${nameOf(oldest)}` : "Nobody is waiting on us."}
          onClick={oldest ? () => openRequest(oldest.id) : undefined}
        />
        <Stat
          label="First reply (median)"
          value={workTime(now.firstReply)}
          sub={prev.firstReply !== null ? `${workTime(prev.firstReply)} last month` : `${now.answered} answered${now.unanswered ? ` · ${now.unanswered} not yet` : ""}`}
        />
        <Stat
          label="Replied within 1 business day"
          value={pct(now.withinDay, now.answered)}
          sub={now.answered ? `${now.withinDay} of ${now.answered} requests` : "No replies yet this month."}
          tone={now.answered && now.withinDay / now.answered < 0.9 ? "late" : undefined}
        />
        <Stat label="Time to solve (median)" value={workTime(now.resolution)} sub={`${now.solved} solved by us; auto-closed not counted`} />
        <Stat
          label="Ratings"
          value={ratedCount ? `${pct(now.ratings.great, ratedCount)} great` : "—"}
          sub={ratedCount ? `${ratedCount} rated of ${now.solved} solved` : "No ratings yet this month."}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="By topic">
          {now.topics.length ? (
            <ul className="space-y-2.5">
              {now.topics.map((c) => (
                <li key={c.id} className="text-[13px]">
                  <span className="flex justify-between text-[var(--ink)]">
                    <span>{c.label}</span>
                    <span className="text-[var(--slate)]">
                      {c.count} · {pct(c.count, now.received)}
                    </span>
                  </span>
                  <span className="mt-1 block h-1.5 rounded-full bg-[var(--paper)]">
                    <span className="block h-full rounded-full bg-[var(--acc-blue)]" style={{ width: `${(c.count / now.received) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No requests this month.</Empty>
          )}
        </Card>

        <Card title="Ratings">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RATING_LABEL) as SupportRating[]).map((r) => (
              <span key={r} className="rounded-full bg-[var(--paper)] px-3 py-1.5 text-[13px] text-[var(--ink)]">
                {RATING_LABEL[r].emoji} {RATING_LABEL[r].label} <strong>{now.ratings[r]}</strong>
                {ratedCount ? <span className="text-[var(--slate)]"> · {pct(now.ratings[r], ratedCount)}</span> : null}
              </span>
            ))}
          </div>
          {now.rated.filter((t) => t.rating_comment).length ? (
            <ul className="mt-4 space-y-2">
              {now.rated
                .filter((t) => t.rating_comment)
                .map((t) => (
                  <li key={t.id}>
                    <button onClick={() => openRequest(t.id)} className="block w-full rounded-xl bg-[var(--paper)] px-3 py-2 text-left text-[13px] hover:bg-[#ececee]">
                      <span className="block text-[var(--ink)]">
                        {RATING_LABEL[t.rating!].emoji} “{t.rating_comment}”
                      </span>
                      <span className="block text-[12px] text-[var(--slate)]">
                        {ticketCode(t.ticket_number)} · {categoryLabel(t.category)} · {nameOf(t)}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <Empty>{ratedCount ? "No comments left." : "Customers rate from the email we send when a request is solved."}</Empty>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <HolidaysCard />
        <JobCard />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone, onClick }: { label: string; value: string; sub?: string; tone?: "late"; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={`rounded-[18px] border border-[var(--line)] bg-white p-4 text-left ${onClick ? "hover:border-[var(--ink)]" : ""}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">{label}</span>
      <span className={`mt-1.5 block text-[22px] font-semibold ${tone === "late" ? "text-[#c2412d]" : "text-[var(--ink)]"}`}>{value}</span>
      {sub ? <span className="mt-0.5 block text-[12px] text-[var(--slate)]">{sub}</span> : null}
    </Tag>
  );
}

function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[var(--line)] bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-[13px] text-[var(--slate)]">{children}</p>;

/** The days the reply clock skips. 2026 is seeded; Eid'l Fitr / Eid'l Adha and next year are added once proclaimed. */
function HolidaysCard() {
  const { demo } = usePortal();
  const { list } = studio.useHolidays();
  const [year, setYear] = useState(new Date().getFullYear());
  const [draft, setDraft] = useState({ day: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const shown = list.filter((h) => h.day.startsWith(String(year)));
  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      if (demo) throw new Error("Changes are turned off in demo mode.");
      await work();
      setDraft({ day: "", name: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
    }
  };
  return (
    <Card
      title="Holidays (no reply clock)"
      aside={
        <span className="flex items-center gap-1 text-[13px] text-[var(--ink)]">
          <PillButton onClick={() => setYear(year - 1)}>‹</PillButton>
          <span className="px-1">{year}</span>
          <PillButton onClick={() => setYear(year + 1)}>›</PillButton>
        </span>
      }
    >
      <ul className="max-h-[260px] divide-y divide-[var(--line)] overflow-y-auto" data-lenis-prevent>
        {shown.map((h) => (
          <li key={h.day} className="flex items-center gap-3 py-2 text-[13px]">
            <span className="w-[110px] shrink-0 text-[var(--slate)]">{formatDate(h.day)}</span>
            <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{h.name}</span>
            <button onClick={() => run(() => studio.deleteHoliday(h.day))} className="text-[12px] text-[var(--slate)] hover:text-[#c2412d]" aria-label={`Remove ${h.name}`}>
              Remove
            </button>
          </li>
        ))}
        {!shown.length ? <li className="py-2 text-[13px] text-[var(--slate)]">None for {year} yet — add them once they’re proclaimed.</li> : null}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input type="date" value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value })} className="w-[160px]" />
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Eid’l Fitr" className="min-w-[140px] flex-1" />
        <PrimaryButton disabled={!draft.day || !draft.name.trim()} onClick={() => run(() => studio.saveHoliday(draft))}>
          Add
        </PrimaryButton>
      </div>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

/** When the daily reminder / auto-close / digest job last ran. A stale time means the cron stopped. */
function JobCard() {
  const [run, setRun] = useState<studio.JobRun | null | undefined>(undefined);
  useEffect(() => {
    studio.loadJobRun().then(setRun);
  }, []);
  const hours = run ? (Date.now() - new Date(run.last_run_at).getTime()) / 3_600_000 : null;
  const stale = hours !== null && hours > 36;
  const d = run?.details;
  return (
    <Card title="Daily support job">
      <p className={`text-[14px] ${stale ? "font-medium text-[#c2412d]" : "text-[var(--ink)]"}`}>
        {run === undefined
          ? "Checking…"
          : run === null
            ? "Hasn’t run yet. It runs every morning at about 9 AM Manila once deployed."
            : `Last ran ${new Date(run.last_run_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${
                stale ? " — that’s over a day and a half ago. Check Vercel → Cron Jobs." : ""
              }`}
      </p>
      {d ? (
        <p className="mt-1.5 text-[12px] text-[var(--slate)]">
          {d.reminders ?? 0} {d.reminders === 1 ? "reminder" : "reminders"} · {d.closed ?? 0} auto-closed · digest {d.digest ? "sent" : "not needed"}
          {d.errors?.length ? <span className="block text-[#c2412d]">Problems: {d.errors.join("; ")}</span> : null}
        </p>
      ) : null}
      <p className="mt-3 text-[12px] text-[var(--slate)]">
        Each morning: a “Still need help?” email after 3 days waiting on the customer (1 day if urgent); closes it 2+ days later at 7 days, never urgent ones, held ones, or
        within 14 days of their event. Then a digest to hello@ on working days, only when something needs attention.
      </p>
    </Card>
  );
}
