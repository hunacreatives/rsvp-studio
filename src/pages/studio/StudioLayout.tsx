import { useCallback, useEffect, useState, Suspense } from "react";
import PageLoading from "@/components/PageLoading";
import CharacterLoader from "@/components/CharacterLoader";
import type { ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
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

const NAV: { to: string; label: string; icon: string; end?: boolean; ownerOnly?: boolean }[] = [
  { to: "/studio", label: "Overview", icon: "ri-dashboard-3-line", end: true },
  { to: "/studio/leads", label: "Leads", icon: "ri-user-star-line" },
  { to: "/studio/emails", label: "Emails", icon: "ri-mail-star-line" },
  { to: "/studio/partners", label: "Partners", icon: "ri-hand-heart-line" },
  { to: "/studio/projects", label: "Projects", icon: "ri-folder-3-line" },
  { to: "/studio/inbox", label: "Inbox", icon: "ri-inbox-2-line" },
  { to: "/studio/support", label: "Support", icon: "ri-customer-service-2-line" },
  { to: "/studio/invoices", label: "Invoices", icon: "ri-file-list-3-line" },
  { to: "/studio/revenue", label: "Revenue", icon: "ri-line-chart-line", ownerOnly: true },
  { to: "/studio/clients", label: "Clients", icon: "ri-group-line" },
  { to: "/studio/templates", label: "Templates", icon: "ri-layout-masonry-line" },
  { to: "/studio/blog", label: "Blog", icon: "ri-quill-pen-line" },
  { to: "/studio/website", label: "Website", icon: "ri-global-line" },
  { to: "/studio/team", label: "Team", icon: "ri-shield-user-line" },
];

export default function StudioLayout() {
  return (
    <PortalProvider demoAs="staff" fallback={<CharacterLoader fullScreen message="Loading the console…" />}>
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

  // Revenue is for the owner only.
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    if (demo) setOwner(true);
    else studio.isOwner().then(setOwner);
  }, [demo]);

  // Clients who wander here get their own dashboard instead.
  if (!profile.is_staff && !demo) return <Navigate to="/account" replace />;

  // Project conversations live in the Inbox; support requests on the Support page.
  const unread = threads.filter((t) => t.unread && t.kind !== "support").length;
  const needsReply = threads.filter((t) => t.kind === "support" && t.status === "needs_reply").length;
  const signOut = async () => {
    if (!demo) await supabase.auth.signOut();
    navigate("/");
  };

  const nav = NAV.filter((n) => !n.ownerOnly || owner);
  const badgeFor = (to: string) => (to === "/studio/leads" ? newLeads : to === "/studio/inbox" ? unread : to === "/studio/support" ? needsReply : 0);

  return (
    <div className="min-h-screen bg-[#f6f6f3] lg:flex">
      {/* Sidebar (desktop). Phones get the bottom tab bar below instead. */}
      <aside className="hidden bg-[var(--ink)] text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[244px] lg:shrink-0 lg:flex-col">
        <div className="px-6 py-7">
          <Link to="/studio" className="block">
            <img src="/brand/logotype-white.png" alt="The RSVP Studio" className="h-9 w-auto" />
            <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Studio Console</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-4">
          {nav.map((item) => (
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
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[#f6f6f3]/90 px-4 py-2 backdrop-blur sm:px-5 md:px-8 lg:py-3">
          <Link to="/studio" className="flex min-h-[44px] shrink-0 items-center gap-2 lg:hidden" aria-label="Studio overview">
            <img src="/brand/logotype-dark.png" alt="The RSVP Studio" className="h-7 w-auto" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--slate)]">Console</span>
          </Link>
          <p className="hidden whitespace-nowrap text-[13px] text-[var(--slate)] sm:block">
            {projects.filter((p) => p.project_status === "in_progress").length} active projects
            {unread ? (
              <>
                {" · "}
                <Link to="/studio/inbox" className="inline-block py-2 font-medium text-[var(--ink)] hover:underline">{unread} unread</Link>
              </>
            ) : null}
          </p>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="Account menu" aria-expanded={menuOpen} className="flex min-h-[44px] items-center gap-2.5 rounded-full py-1 pl-1 pr-1 hover:bg-black/5 sm:pl-3">
              <span className="hidden max-w-[180px] truncate text-[14px] text-[var(--ink)] sm:inline">{profile.full_name || profile.email}</span>
              <Avatar name={profile.full_name} seed={profile.id} url={profile.avatar_url} size={34} />
            </button>
            {menuOpen ? (
              <>
                {/* Tap anywhere else to close (touch screens have no mouse-leave). */}
                <button aria-label="Close menu" tabIndex={-1} className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-lg" onMouseLeave={() => setMenuOpen(false)}>
                  <p className="break-all border-b border-[var(--line)] px-4 py-3 text-[12px] text-[var(--slate)]">{profile.email}</p>
                  <a href="/" target="_blank" rel="noreferrer" className="block px-4 py-3 text-[14px] text-[var(--ink)] hover:bg-black/5">View website</a>
                  <button onClick={signOut} className="block w-full px-4 py-3 text-left text-[14px] text-[var(--acc-coral)] hover:bg-black/5">Log out</button>
                </div>
              </>
            ) : null}
          </div>
        </header>
        <main className="px-4 pb-[calc(96px_+_env(safe-area-inset-bottom))] pt-6 sm:px-5 md:px-8 lg:py-8">
          <Suspense fallback={<PageLoading />}>
            <Outlet context={{ owners, members, directory, reloadClients } satisfies StudioOutlet} />
          </Suspense>
        </main>
      </div>

      <MobileTabBar badgeFor={badgeFor} nav={nav} />
    </div>
  );
}

/** Phones and tablets: the four busiest sections, plus "More" for the rest. */
const TAB_MAIN = ["/studio", "/studio/projects", "/studio/inbox", "/studio/support"];

function MobileTabBar({ badgeFor, nav }: { badgeFor: (to: string) => number; nav: typeof NAV }) {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname]);
  const main = nav.filter((n) => TAB_MAIN.includes(n.to));
  const more = nav.filter((n) => !TAB_MAIN.includes(n.to));
  const inMore = more.some((n) => pathname.startsWith(n.to));
  const moreBadge = more.reduce((s, n) => s + badgeFor(n.to), 0);
  const Badge = ({ n }: { n: number }) =>
    n > 0 ? <span className="absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--acc-coral)] px-1 text-[12px] font-semibold leading-none text-white">{n}</span> : null;

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="More sections">
          <button aria-label="Close" className="absolute inset-0 bg-[rgba(0,7,39,0.4)]" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[22px] bg-[var(--ink)] px-3 pb-[calc(76px_+_env(safe-area-inset-bottom))] pt-3 text-white">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25" />
            {more.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex min-h-[52px] items-center gap-3 rounded-xl px-4 text-[16px] ${isActive ? "bg-white/10 font-medium" : "text-white/80"}`}
              >
                <i className={`${item.icon} text-[20px]`} />
                {item.label}
                {badgeFor(item.to) > 0 ? (
                  <span className="ml-auto grid h-6 min-w-6 place-items-center rounded-full bg-[var(--acc-coral)] px-2 text-[12px] font-semibold">{badgeFor(item.to)}</span>
                ) : null}
              </NavLink>
            ))}
            <a href="/" target="_blank" rel="noreferrer" className="flex min-h-[52px] items-center gap-3 rounded-xl px-4 text-[16px] text-white/80">
              <i className="ri-external-link-line text-[20px]" /> View website
            </a>
          </div>
        </div>
      ) : null}
      <nav
        className="fixed inset-x-0 bottom-0 z-[70] grid grid-cols-5 border-t border-white/10 bg-[var(--ink)] pb-[env(safe-area-inset-bottom)] text-white lg:hidden"
        aria-label="Studio sections"
      >
        {main.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[12px] ${isActive && !moreOpen ? "font-medium text-white" : "text-white/60"}`}
          >
            <span className="relative">
              <i className={`${item.icon} text-[22px] leading-none`} />
              <Badge n={badgeFor(item.to)} />
            </span>
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[12px] ${inMore || moreOpen ? "font-medium text-white" : "text-white/60"}`}
        >
          <span className="relative">
            <i className={`${moreOpen ? "ri-close-line" : "ri-menu-line"} text-[22px] leading-none`} />
            <Badge n={moreBadge} />
          </span>
          More
        </button>
      </nav>
    </>
  );
}

/** Page heading for console pages. `hideOnPhone` hides it on phones (e.g. while a conversation is open). */
export function StudioHeader({ title, sub, action, hideOnPhone = false }: { title: string; sub?: ReactNode; action?: ReactNode; hideOnPhone?: boolean }) {
  return (
    <div className={`mb-6 flex-wrap items-end justify-between gap-4 md:mb-7 ${hideOnPhone ? "hidden md:flex" : "flex"}`}>
      <div className="min-w-0">
        <h1 className="font-display text-[1.85rem] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink)] md:text-[2.1rem]">{title}</h1>
        {sub ? <p className="mt-1 text-[15px] text-[var(--slate)]">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}
