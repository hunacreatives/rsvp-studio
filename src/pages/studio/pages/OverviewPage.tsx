import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { ActivityList, isOverdue } from "@/pages/account/portal/components/blocks";
import { formatDate, formatMoney, inboxStamp } from "@/pages/account/portal/format";
import { Avatar } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";

const today = () => new Date().toISOString().slice(0, 10);

export default function OverviewPage() {
  const { profile, projects, threads, invoices, tasks, activity } = usePortal();
  const name = (id: string) => projects.find((p) => p.id === id)?.name ?? "";

  const active = projects.filter((p) => p.project_status === "in_progress");
  const waiting = threads.filter((t) => t.unread);
  const open = invoices.filter((i) => i.status === "open");
  const overdue = open.filter(isOverdue);
  const outstanding = open.reduce((s, i) => s + i.amount, 0);
  const paidThisMonth = invoices
    .filter((i) => i.status === "paid" && i.paid_at?.slice(0, 7) === today().slice(0, 7))
    .reduce((s, i) => s + i.amount, 0);

  const openTasks = tasks
    .filter((t) => !t.done_at && t.due_date)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
    .slice(0, 6);
  const needsNextStep = active.filter((p) => !p.next_step || (p.next_step_due && p.next_step_due < today())).slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <StudioHeader title={`${greeting}${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.`} sub="Here’s what needs the studio’s attention." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active projects" value={String(active.length)} sub={`${projects.length} total`} to="/studio/projects" />
        <Stat label="Awaiting reply" value={String(waiting.length)} sub="client messages" to="/studio/inbox" tone={waiting.length ? "coral" : undefined} />
        <Stat label="Outstanding" value={formatMoney(outstanding)} sub={`${open.length} open · ${overdue.length} overdue`} to="/studio/invoices" tone={overdue.length ? "coral" : undefined} />
        <Stat label="Paid this month" value={formatMoney(paidThisMonth)} sub="from client invoices" to="/studio/invoices" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Box title="Awaiting your reply" link={{ to: "/studio/inbox", label: "Inbox" }} empty={!waiting.length && "No client is waiting on you."}>
          {waiting.slice(0, 6).map((t) => (
            <Link key={t.id} to={`/studio/inbox?thread=${t.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
              <Avatar name={t.counterpartName} seed={t.profile_id} url={t.counterpartAvatar} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">
                  {t.counterpartName} <span className="font-normal text-[var(--slate)]">· {t.event_id ? name(t.event_id) : t.subject}</span>
                </span>
                <span className="block truncate text-[13px] text-[var(--slate)]">{t.lastMessage?.body || "Sent a file"}</span>
              </span>
              <span className="shrink-0 text-[12px] text-[var(--slate)]">{inboxStamp(t.last_message_at)}</span>
            </Link>
          ))}
        </Box>

        <Box title="Overdue & due invoices" link={{ to: "/studio/invoices", label: "Invoices" }} empty={!open.length && "No open invoices."}>
          {[...open]
            .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
            .slice(0, 6)
            .map((i) => (
              <Link key={i.id} to={`/studio/projects?project=${i.event_id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">{name(i.event_id)}</span>
                  <span className="block truncate text-[13px] text-[var(--slate)]">#{i.number} · {i.description}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[14px] text-[var(--ink)]">{formatMoney(i.amount)}</span>
                  <span className={`block text-[12px] ${isOverdue(i) ? "font-medium text-[#c2412d]" : "text-[var(--slate)]"}`}>
                    {isOverdue(i) ? "Overdue · " : ""}{i.due_date ? formatDate(i.due_date) : "On receipt"}
                  </span>
                </span>
              </Link>
            ))}
        </Box>

        <Box title="Client tasks due" empty={!openTasks.length && "No client tasks with due dates."}>
          {openTasks.map((t) => (
            <Link key={t.id} to={`/studio/projects?project=${t.event_id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
              <i className="ri-checkbox-blank-circle-line text-[var(--slate)]" />
              <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--ink)]">
                {t.title} <span className="text-[var(--slate)]">· {name(t.event_id)}</span>
              </span>
              <span className={`shrink-0 text-[12px] ${t.due_date! < today() ? "font-medium text-[#c2412d]" : "text-[var(--slate)]"}`}>{formatDate(t.due_date)}</span>
            </Link>
          ))}
        </Box>

        <Box title="Needs a next step" empty={!needsNextStep.length && "Every active project has a current next step."}>
          {needsNextStep.map((p) => (
            <Link key={p.id} to={`/studio/projects?project=${p.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">{p.name}</span>
                <span className="block truncate text-[13px] text-[var(--slate)]">
                  {p.next_step ? `“${p.next_step}” was due ${formatDate(p.next_step_due)}` : "No next step set"}
                </span>
              </span>
              <span className="text-[12px] text-[var(--slate)]">{p.progress}%</span>
            </Link>
          ))}
        </Box>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-[1.4rem] font-semibold text-[var(--ink)]">Recent activity</h2>
        <div className="[&>div]:border [&>div]:border-[var(--line)] [&>div]:!bg-white">
          <ActivityList items={activity.slice(0, 8)} />
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, sub, to, tone }: { label: string; value: string; sub: string; to: string; tone?: "coral" }) {
  return (
    <Link to={to} className="rounded-[20px] border border-[var(--line)] bg-white px-5 py-4 transition-colors hover:border-[var(--ink)]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">{label}</p>
      <p className={`mt-1 text-[28px] font-semibold ${tone === "coral" ? "text-[#c2412d]" : "text-[var(--ink)]"}`}>{value}</p>
      <p className="text-[13px] text-[var(--slate)]">{sub}</p>
    </Link>
  );
}

function Box({ title, link, empty, children }: { title: string; link?: { to: string; label: string }; empty?: string | false; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-[22px] border border-[var(--line)] bg-white px-5 py-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-[1.25rem] font-semibold text-[var(--ink)]">{title}</h2>
        {link ? <Link to={link.to} className="text-[13px] text-[var(--acc-blue)] hover:underline">{link.label} →</Link> : null}
      </div>
      {empty ? <p className="py-6 text-[14px] text-[var(--slate)]">{empty}</p> : <div className="divide-y divide-[var(--line)]">{children}</div>}
    </section>
  );
}
