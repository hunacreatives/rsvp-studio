import { useCallback, useEffect, useState, Suspense } from "react";
import PageLoading from "@/components/PageLoading";
import type { ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { PortalProvider, usePortal } from "@/pages/account/portal/PortalContext";
import type { PersonLite } from "@/pages/account/portal/types";
import { Avatar } from "@/pages/account/portal/ui";
import * as studio from "./studioApi";

/**
 * Admin area for the studio team. Its own shell — no marketing navbar or
 * footer, and staff accounts never land in the client dashboard.
 */

export type ClientDirectory = Awaited<ReturnType<typeof studio.loadClientDirectory>>;
export type StudioOutlet = {
  owners: Record<string, PersonLite>;
  members: Record<string, PersonLite[]>;
  directory: ClientDirectory;
  reloadClients: () => void;
};

export const useStudio = () => useOutletContext<StudioOutlet>();

const NAV = [
  { to: "/studio", label: "Overview", icon: "ri-dashboard-3-line", end: true },
  { to: "/studio/leads", label: "Leads", icon: "ri-user-star-line" },
  { to: "/studio/projects", label: "Projects", icon: "ri-folder-3-line" },
  { to: "/studio/inbox", label: "Inbox", icon: "ri-inbox-2-line" },
  { to: "/studio/support", label: "Support", icon: "ri-customer-service-2-line" },
  { to: "/studio/invoices", label: "Invoices", icon: "ri-file-list-3-line" },
  { to: "/studio/clients", label: "Clients", icon: "ri-group-line" },
  { to: "/studio/templates", label: "Templates", icon: "ri-layout-masonry-line" },
  { to: "/studio/team", label: "Team", icon: "ri-shield-user-line" },
];

export default function StudioLayout() {
  return (
    <PortalProvider demoAs="staff" fallback={<div className="grid min-h-screen place-items-center bg-[#f6f6f3] text-[var(--slate)]">Loading console…</div>}>
      <Shell />
    </PortalProvider>
  );
}

function Shell() {
  const { profile, projects, threads, demo } = usePortal();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [owners, setOwners] = useState<Record<string, PersonLite>>({});
  const [members, setMembers] = useState<Record<string, PersonLite[]>>({});
  const [directory, setDirectory] = useState<ClientDirectory>([]);

  const reloadClients = useCallback(() => {
    if (demo || !profile.is_staff) return;
    studio.loadClients(projects).then((c) => {
      setOwners(c.owners);
      setMembers(c.members);
    });
    studio.loadClientDirectory().then(setDirectory);
  }, [demo, profile.is_staff, projects]);

  useEffect(reloadClients, [reloadClients]);

  // Fetch every Studio page in the background once the console is open, so
  // switching between them never waits for a download.
  useEffect(() => {
    const t = setTimeout(() => {
      void import("./pages/OverviewPage");
      void import("./pages/LeadsPage");
      void import("./pages/ProjectsPage");
      void import("./pages/InboxPage");
      void import("./pages/SupportPage");
      void import("./pages/InvoicesPage");
      void import("./pages/ClientsPage");
      void import("./pages/TeamPage");
      void import("./templates/TemplatesPage");
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // New inquiries waiting for a first reply (badge on Leads).
  const [newLeads, setNewLeads] = useState(0);
  useEffect(() => {
    if (demo || !profile.is_staff) return;
    studio.countNewLeads().then(setNewLeads);
  }, [demo, profile.is_staff, projects]);

  // Clients who wander here get their own dashboard instead.
  if (!profile.is_staff && !demo) return <Navigate to="/account" replace />;

  // Project conversations live in the Inbox; support requests on the Support page.
  const unread = threads.filter((t) => t.unread && t.kind !== "support").length;
  const needsReply = threads.filter((t) => t.kind === "support" && t.status === "needs_reply").length;
  const signOut = async () => {
    if (!demo) await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#f6f6f3] lg:flex">
      {/* Sidebar */}
      <aside className="bg-[var(--ink)] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[244px] lg:shrink-0 lg:flex-col">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-7">
          <Link to="/studio" className="block">
            <img src="/brand/logotype-white.png" alt="The RSVP Studio" className="h-8 w-auto lg:h-9" />
            <span className="mt-2 hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 lg:block">Studio Console</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 lg:hidden">Console</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-0">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${isActive ? "bg-white/10 font-medium text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`
              }
            >
              <i className={`${item.icon} text-[18px]`} />
              {item.label}
              {item.to === "/studio/leads" && newLeads > 0 ? (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[var(--acc-coral)] px-1.5 text-[11px] font-semibold text-white">{newLeads}</span>
              ) : null}
              {item.to === "/studio/inbox" && unread > 0 ? (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[var(--acc-coral)] px-1.5 text-[11px] font-semibold text-white">{unread}</span>
              ) : null}
              {item.to === "/studio/support" && needsReply > 0 ? (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[var(--acc-coral)] px-1.5 text-[11px] font-semibold text-white">{needsReply}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 px-4 py-4 lg:block">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-white/60 hover:text-white">
            <i className="ri-external-link-line" /> View website
          </a>
        </div>
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        {demo ? <div className="bg-[var(--acc-yellow)] py-1.5 text-center text-[12px] font-medium text-[var(--ink)]">Demo data — read-only</div> : null}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[#f6f6f3]/90 px-5 py-3 backdrop-blur md:px-8">
          <p className="text-[13px] text-[var(--slate)]">
            {projects.filter((p) => p.project_status === "in_progress").length} active projects
            {unread ? <> · <Link to="/studio/inbox" className="font-medium text-[var(--ink)] hover:underline">{unread} unread</Link></> : null}
          </p>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5 rounded-full py-1 pl-3 pr-1 hover:bg-black/5">
              <span className="text-[14px] text-[var(--ink)]">{profile.full_name || profile.email}</span>
              <Avatar name={profile.full_name} seed={profile.id} url={profile.avatar_url} size={34} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-lg" onMouseLeave={() => setMenuOpen(false)}>
                <p className="border-b border-[var(--line)] px-4 py-3 text-[12px] text-[var(--slate)]">{profile.email}</p>
                <a href="/" target="_blank" rel="noreferrer" className="block px-4 py-3 text-[14px] text-[var(--ink)] hover:bg-black/5">View website</a>
                <button onClick={signOut} className="block w-full px-4 py-3 text-left text-[14px] text-[var(--acc-coral)] hover:bg-black/5">Log out</button>
              </div>
            ) : null}
          </div>
        </header>
        <main className="px-5 py-8 md:px-8">
          <Suspense fallback={<PageLoading />}>
            <Outlet context={{ owners, members, directory, reloadClients } satisfies StudioOutlet} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/** Page heading for console pages. */
export function StudioHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink)]">{title}</h1>
        {sub ? <p className="mt-1 text-[15px] text-[var(--slate)]">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}
