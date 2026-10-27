import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { isOverdue } from "@/pages/account/portal/components/blocks";
import { formatDate, formatMoney, timeAgo } from "@/pages/account/portal/format";
import { CharacterTrio } from "@/components/CharacterLoader";
import { StudioHeader } from "../StudioLayout";
import { isOverdue as replyOverdue } from "@/pages/account/portal/support";
import { countNewLeads, useHolidays } from "../studioApi";
import * as studioApi from "../studioApi";

// Studio → Overview: what needs a person today, most urgent first, each with its one action;
// this week's dates and this month's money on the side; then what happened lately. Settings and
// numbers that aren't a to-do (banner, site health, where leads come from) live on Website.

/** Today in Manila ("YYYY-MM-DD"), plus/minus days. */
const today = (plusDays = 0) => new Date(Date.now() + 8 * 3_600_000 + plusDays * 86_400_000).toISOString().slice(0, 10);

type Tone = "blush" | "butter" | "sky" | "mint" | "lilac";
const TONE: Record<Tone, string> = { blush: "#fde8ef", butter: "#fdf1cf", sky: "#e4f4fb", mint: "#e3f4e8", lilac: "#efeafc" };
type Item = {
  key: string;
  icon: string;
  tone: Tone;
  tag: string;
  late?: boolean;
  title: string;
  why: string;
  action: { label: string; to?: string; run?: () => Promise<void>; dark?: boolean };
};

export default function OverviewPage() {
  const { profile, projects: all, threads, invoices, tasks, activity, demo } = usePortal();
  const name = (id: string) => all.find((p) => p.id === id)?.name ?? "";
  // Studio projects only — DIY websites have their own list under Projects.
  const projects = all.filter((p) => p.managed_by_studio !== false);
  // The owner sees everything that came in this month (Revenue); admins, invoice payments.
  const [monthIn, setMonthIn] = useState<number | null>(null);
  useEffect(() => {
    if (demo) return;
    studioApi.isOwner().then(async (owner) => {
      if (!owner) return;
      const now = new Date();
      const rows = await studioApi.loadRevenue(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1));
      if (rows) setMonthIn(rows.reduce((s, r) => s + r.amount, 0));
    });
  }, [demo]);
  const [leads, setLeads] = useState(0);
  const [siteDown, setSiteDown] = useState(false);
  useEffect(() => {
    if (demo) return;
    countNewLeads().then(setLeads);
    studioApi.loadSiteHealth().then((h) => setSiteDown(!!h && h.uptime.configured && h.uptime.monitors.some((m) => m.status !== "up")));
  }, [demo]);
  // Done here (a reminder sent): gone from the list right away.
  const [done, setDone] = useState<Set<string>>(new Set());

  const active = projects.filter((p) => p.project_status === "in_progress");
  const lastReminded = (i: (typeof invoices)[number]) => i.last_reminded_at ?? i.issued_at;
  const support = threads.filter((t) => t.kind === "support" && t.status === "needs_reply");
  const { days: holidays } = useHolidays();
  const unread = threads.filter((t) => t.unread && t.kind !== "support");
  const open = invoices.filter((i) => i.status === "open");
  const overdue = open.filter(isOverdue);
  const outstanding = open.reduce((s, i) => s + i.amount, 0);
  const paidThisMonth = invoices.filter((i) => i.status === "paid" && i.paid_at?.slice(0, 7) === today().slice(0, 7)).reduce((s, i) => s + i.amount, 0);
  const paidIn = monthIn ?? paidThisMonth;

  // ── Today: most urgent first ────────────────────────────────────────────────
  const items: Item[] = [];
  if (siteDown)
    items.push({ key: "down", icon: "ri-error-warning-line", tone: "blush", tag: "Website · down", late: true, title: "thersvpstudio.com isn’t loading for visitors", why: "Check Website → Site health, then Vercel.", action: { label: "Site health", to: "/studio/website", dark: true } });
  for (const t of [...support].sort((a, b) => Number(replyOverdue(b, holidays)) - Number(replyOverdue(a, holidays)))) {
    const late = replyOverdue(t, holidays);
    items.push({
      key: `s-${t.id}`,
      icon: "ri-customer-service-2-line",
      tone: "blush",
      tag: late ? "Support · overdue" : "Support",
      late,
      title: `Reply to ${t.counterpartName}${t.event_id ? ` about ${name(t.event_id)}` : ""}`,
      why: late ? "Past our one-business-day promise." : t.subject || "Waiting on our reply.",
      action: { label: "Reply", to: `/studio/support?thread=${t.id}`, dark: true },
    });
  }
  if (leads)
    items.push({ key: "leads", icon: "ri-user-star-line", tone: "mint", tag: "Leads", title: `${leads} new ${leads === 1 ? "inquiry" : "inquiries"} to answer`, why: "From the quote and partner forms.", action: { label: "Open leads", to: "/studio/leads" } });
  for (const i of [...open].filter((i) => (isOverdue(i) || (i.due_date && i.due_date <= today(7))) && lastReminded(i).slice(0, 10) < today(-7)).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))) {
    const late = isOverdue(i);
    items.push({
      key: `i-${i.id}`,
      icon: "ri-money-dollar-circle-line",
      tone: "butter",
      tag: late ? `Invoice · overdue since ${formatDate(i.due_date)}` : `Invoice · due ${formatDate(i.due_date)}`,
      late,
      title: `${formatMoney(i.amount)} from ${name(i.event_id) || "a client"}`,
      why: `${i.description}. ${i.last_reminded_at ? `Last reminded ${formatDate(i.last_reminded_at)}.` : "No reminder sent yet."}`,
      action: { label: "Send reminder", run: () => studioApi.sendInvoiceReminder(i.id) },
    });
  }
  for (const t of unread)
    items.push({ key: `m-${t.id}`, icon: "ri-chat-3-line", tone: "lilac", tag: "Message", title: `${t.counterpartName}${t.event_id ? ` · ${name(t.event_id)}` : ""}`, why: t.lastMessage?.body || "Sent a file", action: { label: "Open", to: `/studio/inbox?thread=${t.id}` } });
  for (const p of active.filter((p) => !p.owner_id))
    items.push({ key: `c-${p.id}`, icon: "ri-link", tone: "sky", tag: "Project", title: `${p.name} has no client linked`, why: "Send them their invite code so they can see their project.", action: { label: "Open project", to: `/studio/projects?project=${p.id}` } });
  for (const p of active.filter((p) => p.event_date && p.event_date < today(-3)))
    items.push({ key: `e-${p.id}`, icon: "ri-flag-2-line", tone: "sky", tag: "Project", title: `${p.name} happened on ${formatDate(p.event_date)}`, why: "Mark it completed, or set what’s left.", action: { label: "Open project", to: `/studio/projects?project=${p.id}` } });
  for (const t of tasks.filter((t) => !t.done_at && t.due_date && t.due_date <= today(3)).sort((a, b) => a.due_date!.localeCompare(b.due_date!)))
    items.push({ key: `t-${t.id}`, icon: "ri-checkbox-circle-line", tone: "sky", tag: `Client task · ${t.due_date! < today() ? "overdue" : formatDate(t.due_date)}`, late: t.due_date! < today(), title: t.title, why: name(t.event_id), action: { label: "Open project", to: `/studio/projects?project=${t.event_id}` } });
  for (const p of active.filter((p) => !p.next_step || (p.next_step_due && p.next_step_due < today())))
    items.push({ key: `n-${p.id}`, icon: "ri-route-line", tone: "sky", tag: "Next step", title: p.next_step ? `“${p.next_step}” is past due` : `${p.name} needs a next step`, why: p.next_step ? p.name : "So the client knows what’s coming.", action: { label: "Open project", to: `/studio/projects?project=${p.id}` } });
  const todo = items.filter((i) => !done.has(i.key));

  // What's quiet today, said once at the bottom of the list.
  const quiet = [
    !leads && "no new leads",
    !support.length && "no support requests",
    !overdue.length && "nothing overdue",
    active.every((p) => p.next_step && !(p.next_step_due && p.next_step_due < today())) && "every project has a next step",
  ].filter(Boolean) as string[];

  // ── This week ───────────────────────────────────────────────────────────────
  const week = Array.from({ length: 7 }, (_, n) => today(n));
  const marks = [
    ...active.filter((p) => p.event_date && p.event_date >= today() && p.event_date <= today(6)).map((p) => ({ day: p.event_date!, kind: "event" as const, text: p.name, to: `/studio/projects?project=${p.id}` })),
    ...open.filter((i) => i.due_date && i.due_date >= today() && i.due_date <= today(6)).map((i) => ({ day: i.due_date!, kind: "money" as const, text: `${name(i.event_id)} · invoice due`, to: "/studio/invoices" })),
    ...tasks.filter((t) => !t.done_at && t.due_date && t.due_date >= today() && t.due_date <= today(6)).map((t) => ({ day: t.due_date!, kind: "task" as const, text: `${t.title} · ${name(t.event_id)}`, to: `/studio/projects?project=${t.event_id}` })),
  ].sort((a, b) => a.day.localeCompare(b.day));
  const nextEvent = active.filter((p) => p.event_date && p.event_date > today(6)).sort((a, b) => a.event_date!.localeCompare(b.event_date!))[0];
  const DOT = { event: "#2f61d5", money: "#e8573f", task: "#8e6bd6" };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : "";
  const late = todo.filter((t) => t.late).length;
  const summary = todo.length ? (
    <>
      <b className="font-semibold text-[var(--ink)]">
        {todo.length} {todo.length === 1 ? "thing needs" : "things need"} you today.
      </b>{" "}
      {late ? `${late} ${late === 1 ? "is" : "are"} overdue.` : "Everything else is on track."}
    </>
  ) : (
    "You’re all caught up. Nothing needs you right now."
  );
  const paidShare = paidIn + outstanding > 0 ? Math.round((paidIn / (paidIn + outstanding)) * 100) : 0;
  const month = new Date().toLocaleDateString("en-PH", { month: "long", timeZone: "Asia/Manila" });

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <StudioHeader title={`${greeting}${first}.`} sub={summary} />
        <CharacterTrio className="hidden w-[240px] shrink-0 sm:block" />
      </div>
      {demo ? null : <JobAlert />}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-white">
          <div className="px-5 pb-3 pt-5 sm:px-6">
            <h2 className="font-display text-[1.3rem] font-semibold text-[var(--ink)]">Today</h2>
            <p className="text-balance text-[13.5px] text-[var(--slate)]">Most urgent first. Each one goes away when it’s&nbsp;done.</p>
          </div>
          <ul>
            {todo.slice(0, 8).map((it) => (
              <TodayRow key={it.key} it={it} demo={demo} onDone={() => setDone((s) => new Set(s).add(it.key))} />
            ))}
          </ul>
          {todo.length > 8 ? <p className="border-t border-[var(--line)] px-6 py-3 text-[13px] text-[var(--slate)]">And {todo.length - 8} more. They’ll move up as these are done.</p> : null}
          <div className="flex items-center gap-3 border-t border-[var(--line)] px-5 py-4 text-[13.5px] text-[var(--slate)] sm:px-6">
            <img src="/email/followup-after.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
            {todo.length ? (quiet.length ? `${quiet[0][0].toUpperCase()}${quiet.join(", ").slice(1)}.` : "Work through these and the list clears.") : "Enjoy the quiet. New requests, leads and due dates show up here."}
          </div>
        </section>

        <div className="grid gap-5">
          <section className="rounded-[22px] border border-[var(--line)] bg-white">
            <h2 className="px-5 pb-2 pt-5 font-display text-[1.3rem] font-semibold text-[var(--ink)] sm:px-6">This week</h2>
            <div className="grid grid-cols-7 gap-1 px-4 pb-3 sm:px-5">
              {week.map((d, n) => {
                const dt = new Date(`${d}T00:00:00`);
                const kinds = [...new Set(marks.filter((m) => m.day === d).map((m) => m.kind))];
                return (
                  <div key={d} className={`rounded-xl py-2 text-center text-[11.5px] ${n === 0 ? "bg-[var(--ink)] text-white/75" : "text-[var(--slate)]"}`}>
                    {dt.toLocaleDateString("en-PH", { weekday: "short" })}
                    <b className={`block font-display text-[17px] font-semibold leading-tight ${n === 0 ? "text-white" : "text-[var(--ink)]"}`}>{dt.getDate()}</b>
                    <span className="flex h-2 items-center justify-center gap-0.5">
                      {kinds.map((k) => (
                        <i key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: DOT[k] }} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
            <ul>
              {marks.slice(0, 5).map((m, i) => (
                <li key={i} className="border-t border-[var(--line)]">
                  <Link to={m.to} className="flex items-center gap-3 px-5 py-3 text-[14px] hover:bg-black/[0.02] sm:px-6">
                    <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[m.kind] }} />
                    <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{m.text}</span>
                    <span className="shrink-0 text-[12.5px] text-[var(--slate)]">{m.day === today() ? "Today" : new Date(`${m.day}T00:00:00`).toLocaleDateString("en-PH", { weekday: "short" })}</span>
                  </Link>
                </li>
              ))}
              {!marks.length ? (
                <li className="flex justify-between gap-3 border-t border-[var(--line)] px-5 py-3 text-[14px] text-[var(--slate)] sm:px-6">
                  Nothing due this week<span className="text-[12.5px]">{nextEvent ? `next event: ${formatDate(nextEvent.event_date)}` : ""}</span>
                </li>
              ) : null}
            </ul>
          </section>

          <Link to={monthIn !== null ? "/studio/revenue" : "/studio/invoices"} className="block rounded-[22px] border border-[var(--line)] bg-white px-5 pb-5 pt-5 transition-colors hover:border-[var(--ink)] sm:px-6">
            <h2 className="font-display text-[1.3rem] font-semibold text-[var(--ink)]">This month</h2>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <p className="text-[12.5px] text-[var(--slate)]">
                {monthIn !== null ? "Came in" : "Paid in"}
                <b className="mt-0.5 block font-display text-[24px] font-semibold text-[var(--ink)]">{formatMoney(paidIn)}</b>
              </p>
              <p className="text-[12.5px] text-[var(--slate)]">
                Still to come
                <b className="mt-0.5 block font-display text-[24px] font-semibold text-[var(--ink)]">{formatMoney(outstanding)}</b>
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e4f4fb]">
              <div className="h-full rounded-full bg-[var(--acc-blue)]" style={{ width: `${paidShare}%` }} />
            </div>
            <p className="mt-2 text-[12.5px] text-[var(--slate)]">
              {paidShare}% of {month} paid · {overdue.length ? <span className="font-medium text-[#c2412d]">{overdue.length} overdue</span> : "0 overdue"}
            </p>
          </Link>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-2 font-display text-[1.3rem] font-semibold text-[var(--ink)]">Recent activity</h2>
        <ul>
          {activity.slice(0, 6).map((a) => (
            <li key={a.id} className="border-t border-[var(--line)]">
              <Link to={`/studio/projects?project=${a.event_id}`} className="flex items-center gap-3 py-3 text-[14px] hover:opacity-80">
                <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: ACT_DOT[a.kind] ?? "#2f61d5" }} />
                <span className="min-w-0 flex-1 truncate">
                  <b className="font-semibold text-[var(--ink)]">{a.title}</b>
                  <span className="text-[var(--slate)]"> · {name(a.event_id)}{a.detail ? ` · ${a.detail}` : ""}</span>
                </span>
                <span className="shrink-0 text-[12.5px] text-[var(--slate)]">{timeAgo(a.created_at)}</span>
              </Link>
            </li>
          ))}
          {!activity.length ? <li className="border-t border-[var(--line)] py-3 text-[14px] text-[var(--slate)]">Updates from projects show up here.</li> : null}
        </ul>
      </section>
    </>
  );
}

const ACT_DOT: Record<string, string> = { payment: "#3d9a5a", invoice: "#c7a140", rsvp: "#c7a140", task: "#8e6bd6", file: "#2f61d5", update: "#2f61d5", status: "#2f61d5" };

/** One thing to do: what, why, and its action (a link, or a quick action done right here). */
function TodayRow({ it, demo, onDone }: { it: Item; demo: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Done: the row slides away, then leaves the list.
  const [leaving, setLeaving] = useState(false);
  const btn = `inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-colors ${it.action.dark ? "border-[var(--ink)] bg-[var(--ink)] text-white hover:bg-black" : "border-[var(--ink)] bg-white text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white"}`;
  return (
    <li
      className={`grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-t border-[var(--line)] px-5 py-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:px-6 ${leaving ? "translate-x-6 opacity-0" : ""}`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-[14px] text-[20px] text-[var(--ink)]" style={{ background: TONE[it.tone] }} aria-hidden>
        <i className={it.icon} />
      </span>
      <span className="min-w-0">
        <span className={`block text-[11px] font-semibold uppercase tracking-[0.06em] ${it.late ? "text-[#c2412d]" : "text-[var(--slate)]"}`}>{it.tag}</span>
        <span className="block text-balance font-semibold text-[var(--ink)] [overflow-wrap:anywhere]">{it.title}</span>
        <span className="block truncate text-[13.5px] text-[var(--slate)]">{error ?? it.why}</span>
      </span>
      <span className="col-start-2 sm:col-start-auto">
        {it.action.to ? (
          <Link to={it.action.to} className={btn}>
            {it.action.label}
          </Link>
        ) : (
          <button
            type="button"
            className={btn}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                if (!demo) await it.action.run?.();
                setLeaving(true);
                setTimeout(onDone, 300);
              } catch (e) {
                setError(e instanceof Error ? e.message : "That didn’t work. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Sending…" : it.action.label}
          </button>
        )}
      </span>
    </li>
  );
}

function JobAlert() {
  const [run, setRun] = useState<studioApi.JobRun | null>(null);
  useEffect(() => {
    studioApi.loadJobRun().then(setRun);
  }, []);
  if (!run) return null; // not deployed yet, or still loading
  const hours = (Date.now() - new Date(run.last_run_at).getTime()) / 3_600_000;
  const errors = run.details?.errors ?? [];
  if (hours <= 26 && !errors.length) return null;
  const stale = hours > 26;
  const when = new Date(run.last_run_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <Link
      to="/studio/support?tab=report"
      className={`mb-4 flex items-start gap-3 rounded-[18px] border px-4 py-3 text-[14px] ${stale ? "border-[#f3c2b8] bg-[#fdf0ed] text-[#8a2a17]" : "border-[#f0dca8] bg-[#fdf6e3] text-[#6b4d00]"}`}
    >
      <i className={`${stale ? "ri-error-warning-line" : "ri-alert-line"} mt-0.5 text-[18px]`} aria-hidden />
      <span className="min-w-0">
        {stale ? (
          <>
            <strong>The daily job hasn’t run since {when}.</strong> Reminders, RSVP summaries and follow-up emails are waiting on it. Check Vercel → Cron Jobs.
          </>
        ) : (
          <>
            <strong>
              This morning’s daily job had {errors.length} {errors.length === 1 ? "problem" : "problems"}.
            </strong>{" "}
            <span className="break-words">{errors[0]}</span>
          </>
        )}
        <span className="ml-1 whitespace-nowrap underline underline-offset-2">Details</span>
      </span>
    </Link>
  );
}
