import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { ActivityList, byWhen, EventList, isDiy, isOverdue, isPast, TaskList } from "../components/blocks";
import { useGuestStats, type GuestStats } from "../guestStats";
import { daysUntil, formatDate, formatMoney } from "../format";
import NewProjectModal from "../components/NewProjectModal";
import { EmptyState, PrimaryButton, SectionTitle } from "../ui";
import PartnerStrip from "../components/PartnerStrip";

export default function HomePage() {
  const { projects, tasks, activity, profile, demo } = usePortal();
  const stats = useGuestStats(projects, demo);
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = useState(false);

  // Coming up first (soonest first), then past events.
  const ordered = [...projects].sort(byWhen);
  const openTasks = tasks
    .filter((t) => !t.done_at)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 4);
  // Tasks are the studio's: someone who only builds their own sites never gets any, so an
  // empty "all caught up" box would just be space. Activity shows once there is some.
  const studioClient = projects.some((p) => !isDiy(p));
  const showTasks = openTasks.length > 0 || studioClient;
  const recent = activity.slice(0, 4);

  return (
    <>
      {/* Home is the overview; the full list lives under Projects (same title twice confused people). */}
      <PageHeader title={`Welcome back${profile.full_name ? `, ${profile.full_name.trim().split(/\s+/)[0]}` : ""}`} />
      <PartnerStrip />
      <NeedsAttention stats={stats} />

      {projects.length === 0 ? (
        <EmptyState
          icon="ri-folder-add-line"
          title="No events yet"
          body="Start an inquiry with our studio, build a site yourself, or link an event we set up for you with your invite code."
          action={<PrimaryButton onClick={() => setNewOpen(true)}>Start an event</PrimaryButton>}
        />
      ) : (
        <>
          <SectionTitle
            action={
              projects.length > 5 ? (
                <button onClick={() => navigate("/account/projects")} className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[var(--acc-blue)] hover:underline md:min-h-0">
                  All {projects.length} events →
                </button>
              ) : undefined
            }
          >
            Your events
          </SectionTitle>
          {/* The ones coming up; past ones only fill the list when there's room. */}
          <EventList projects={ordered.filter((p, i) => !isPast(p) || i < 3).slice(0, 5)} stats={stats} />
        </>
      )}

      {showTasks || recent.length ? (
        <div className={`mt-12 grid gap-10 xl:gap-6 ${showTasks && recent.length ? "xl:grid-cols-2" : ""}`}>
          {showTasks ? (
            <section className="min-w-0">
              <SectionTitle>Upcoming Tasks</SectionTitle>
              <TaskList tasks={openTasks} />
            </section>
          ) : null}
          {recent.length ? (
            <section className="min-w-0">
              <SectionTitle>Recent Activity</SectionTitle>
              <ActivityList items={recent} />
            </section>
          ) : null}
        </div>
      ) : null}

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}

/**
 * The few things that need the customer, on top: money owed, a reply we're
 * waiting for, and steps that are their turn. Nothing to do → nothing shown.
 */
function NeedsAttention({ stats }: { stats: Record<string, GuestStats> }) {
  const { projects, invoices, threads, sites } = usePortal();
  const navigate = useNavigate();
  const unpaid = invoices.filter((i) => i.status === "open").sort((a, b) => (a.due_date ?? "0000").localeCompare(b.due_date ?? "0000"));
  const owed = unpaid.reduce((s, i) => s + i.amount, 0);
  const waitingOnThem = threads.filter((t) => t.kind === "support" && t.status === "waiting");
  const theirTurn = projects.filter((p) => p.project_status !== "completed" && p.next_step && p.next_step_owner === "client");
  const items: { icon: string; text: string; tone?: "late"; onClick: () => void }[] = [];
  if (unpaid.length) {
    const next = unpaid[0];
    items.push({
      icon: "ri-bank-card-line",
      text: `${formatMoney(owed)} to pay${isOverdue(next) ? ` · overdue since ${formatDate(next.due_date)}` : next.due_date ? ` · due ${formatDate(next.due_date)}` : " · due now"}`,
      tone: isOverdue(next) ? "late" : undefined,
      onClick: () => navigate(unpaid.length === 1 ? `/account/billing/${next.id}` : "/account/billing"),
    });
  }
  for (const t of waitingOnThem.slice(0, 2)) {
    items.push({ icon: "ri-chat-3-line", text: "We’re waiting for your reply on a support request", onClick: () => navigate(`/account/messages?thread=${t.id}`) });
  }
  for (const p of theirTurn.slice(0, 2)) {
    items.push({ icon: "ri-task-line", text: `Your turn: ${p.next_step}${p.next_step_due ? ` by ${formatDate(p.next_step_due)}` : ""}`, onClick: () => navigate(`/account/projects/${p.id}`) });
  }
  // Sites hosts run themselves: who hasn't replied, replies closing soon, a draft not live yet.
  for (const p of projects.filter((x) => isDiy(x) && !isPast(x))) {
    const site = sites[p.id];
    const s = stats[p.id];
    const closesIn = daysUntil(site?.deadline);
    if (site?.publishedAt && !site.ended) {
      if (closesIn !== null && closesIn >= 0 && closesIn <= 7) {
        items.push({
          icon: "ri-timer-line",
          text: `Replies for ${p.name} close ${closesIn === 0 ? "today" : closesIn === 1 ? "tomorrow" : `in ${closesIn} days`}${s?.waiting ? ` · ${s.waiting} still to reply` : ""}`,
          tone: closesIn <= 1 ? "late" : undefined,
          onClick: () => navigate(`/account/projects/${p.id}?tab=guests&list=invites`),
        });
      } else if (s?.waiting) {
        items.push({
          icon: "ri-user-follow-line",
          text: `${s.waiting} ${s.waiting === 1 ? "guest hasn’t" : "guests haven’t"} replied to ${p.name} · send a reminder`,
          onClick: () => navigate(`/account/projects/${p.id}?tab=guests&list=invites`),
        });
      }
    } else if (site && !site.publishedAt) {
      items.push({ icon: "ri-edit-2-line", text: `${p.name} isn’t published yet`, onClick: () => navigate(`/account/events/${p.id}/site-builder/edit`) });
    }
  }
  if (!items.length) return null;
  items.splice(5);
  return (
    <section className="mb-8 rounded-[22px] bg-[#fff6e3] p-4 md:p-5">
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#8a5a00]">Needs your attention</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i}>
            <button onClick={it.onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-[15px] text-[var(--ink)] hover:bg-black/5">
              <i className={`${it.icon} text-[18px] ${it.tone === "late" ? "text-[#c2412d]" : "text-[#8a5a00]"}`} />
              <span className={`flex-1 ${it.tone === "late" ? "font-medium text-[#c2412d]" : ""}`}>{it.text}</span>
              <i className="ri-arrow-right-s-line text-[var(--slate)]" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
