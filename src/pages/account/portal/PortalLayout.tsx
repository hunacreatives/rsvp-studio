import { useEffect, useState, Suspense } from "react";
import { createPortal } from "react-dom";
import PageLoading from "@/components/PageLoading";
import CharacterLoader from "@/components/CharacterLoader";
import type { ReactNode } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { PortalProvider, usePortal } from "./PortalContext";
import NewProjectModal from "./components/NewProjectModal";
import { firstName } from "./format";
import * as api from "./api";

const NAV = [
  { to: "/account", label: "Home", icon: "ri-home-4-line", end: true },
  { to: "/account/projects", label: "Projects", icon: "ri-folder-3-line" },
  { to: "/account/billing", label: "Billing", icon: "ri-file-list-3-line" },
  { to: "/account/settings", label: "Account", icon: "ri-user-3-line" },
  { to: "/account/messages", label: "Messages", icon: "ri-inbox-2-line" },
];

/** Partners (supabase/revenue.sql) get a "Partner" page; everyone else never sees it. */
function useIsPartner() {
  const { demo } = usePortal();
  const [partner, setPartner] = useState(false);
  useEffect(() => {
    if (!demo) api.myPartner().then((p) => setPartner(!!p));
  }, [demo]);
  return partner;
}

export default function PortalLayout() {
  return (
    <PortalProvider fallback={<CharacterLoader fullScreen message="Loading your dashboard…" />}>
      <PrefetchPortalPages />
      <Shell />
    </PortalProvider>
  );
}

function Shell() {
  const { profile, threads, demo } = usePortal();
  const navigate = useNavigate();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  // Arrived from the "confirm your email" link (?welcome=1): say so once.
  const [params, setParams] = useSearchParams();
  const [justConfirmed, setJustConfirmed] = useState(params.get("welcome") === "1");
  useEffect(() => {
    if (params.get("welcome") !== "1") return;
    const next = new URLSearchParams(params);
    next.delete("welcome");
    setParams(next, { replace: true });
  }, [params, setParams]);
  const unread = threads.filter((t) => t.unread).length;
  const isPartner = useIsPartner();

  // Studio team accounts use the admin console, never the client dashboard.
  if (profile.is_staff && !demo) return <Navigate to="/studio" replace />;

  const signOut = async () => {
    if (!demo) await supabase.auth.signOut();
    navigate("/");
  };

  return (
    // Phones: room at the bottom for the fixed tab bar (+ the iPhone home indicator).
    <div className="min-h-screen pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0" style={{ background: "#fff" }}>
      <Navbar />
      {demo ? (
        <div className="bg-[var(--acc-yellow)] px-4 py-1.5 text-center text-[12px] font-medium text-[var(--ink)]">
          Demo data (dev only) — <a className="underline" href="?demo=off">exit demo</a>
        </div>
      ) : null}

      {justConfirmed ? (
        <div className="border-b border-[#bfe8cf] bg-[#ecfaf1]" role="status">
          <div className="container-x flex items-center gap-3 py-3 text-[14px] text-[var(--ink)]">
            <i className="ri-checkbox-circle-fill text-xl text-[var(--acc-green)]" />
            <p className="flex-1">
              <strong>Your email is confirmed.</strong> Welcome to The RSVP Studio, {firstName(profile.full_name, "friend")}. You&rsquo;re signed in and ready to go.
            </p>
            <button onClick={() => setJustConfirmed(false)} aria-label="Dismiss" className="-my-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5">
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="container-x py-6 md:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-5">
          {/* Sidebar (desktop). Phones get the bottom tab bar instead, so pages start at the top. */}
          <aside className="hidden lg:block lg:w-[232px] lg:shrink-0">
            <div className="rounded-[22px] bg-[var(--paper)] p-4 lg:sticky lg:top-24 lg:min-h-[630px] lg:p-5">
              <p className="px-1 font-display text-[2.1rem] font-semibold leading-none tracking-[-0.02em] text-[var(--ink)] lg:text-[2.6rem]">
                Hi, {firstName(profile.full_name, "there")}.
              </p>
              <nav className="-mx-1 mt-4 flex flex-wrap gap-1 lg:mx-0 lg:mt-6 lg:flex-col lg:flex-nowrap">
                {NAV.map((item) => (
                  <SideLink key={item.to} to={item.to} end={item.end} icon={item.icon}>
                    {item.label}
                    {item.to === "/account/messages" && unread > 0 ? (
                      <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[var(--acc-blue)] px-1.5 text-[11px] font-semibold text-white">
                        {unread}
                      </span>
                    ) : null}
                  </SideLink>
                ))}
                {isPartner ? (
                  <SideLink to="/account/partner" icon="ri-hand-heart-line">
                    Partner
                  </SideLink>
                ) : null}
                <span className="mx-2 my-3 hidden h-px bg-[var(--line)] lg:block" />
                <SideLink to="/account/help" icon="ri-question-line">
                  Help &amp; Support
                </SideLink>
                <button
                  onClick={signOut}
                  className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-[15px] text-[var(--slate)] transition-colors hover:bg-black/5 lg:mt-1"
                >
                  <i className="ri-logout-box-r-line text-[19px]" />
                  Log out
                </button>
              </nav>
            </div>
          </aside>

          {/* Main column */}
          <main className="min-w-0 flex-1 lg:pl-3">
            <div className="mb-6 hidden gap-6 lg:flex">
              <QuickAction icon="ri-folder-3-line" label="New Project" onClick={() => setNewProjectOpen(true)} />
            </div>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      <FooterSection />
      <MobileTabBar unread={unread} isPartner={isPartner} onNewProject={() => setNewProjectOpen(true)} onSignOut={signOut} />
      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </div>
  );
}

function SideLink({ to, end, icon, children }: { to: string; end?: boolean; icon: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-[15px] transition-colors ${
          isActive ? "bg-[#e3e3e6] font-medium text-[var(--ink)]" : "text-[var(--ink)] hover:bg-black/5"
        }`
      }
    >
      <i className={`${icon} text-[19px]`} />
      {children}
    </NavLink>
  );
}

function QuickAction({ icon, label, onClick, badge = 0 }: { icon: string; label: string; onClick: () => void; badge?: number }) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1.5">
      <span className="relative grid h-[58px] w-[58px] place-items-center rounded-full bg-[var(--paper)] text-[var(--ink)] transition-colors group-hover:bg-[#e8e8ea]">
        <i className={`${icon} text-[24px]`} />
        {badge > 0 ? <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[var(--acc-blue)] ring-2 ring-white" /> : null}
      </span>
      <span className="text-[13px] text-[var(--ink)]">{label}</span>
    </button>
  );
}

const TABS = [
  { to: "/account", label: "Home", icon: "ri-home-4-line", end: true },
  { to: "/account/projects", label: "Projects", icon: "ri-folder-3-line" },
  { to: "/account/messages", label: "Messages", icon: "ri-inbox-2-line" },
  { to: "/account/billing", label: "Billing", icon: "ri-file-list-3-line" },
];

/**
 * Phones/tablets: a fixed bottom tab bar (one thumb reaches everything) with
 * "More" for Account, Help & Support, New Project and Log out.
 */
function MobileTabBar({ unread, isPartner, onNewProject, onSignOut }: { unread: number; isPartner: boolean; onNewProject: () => void; onSignOut: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = pathname.startsWith("/account/settings") || pathname.startsWith("/account/help") || pathname.startsWith("/account/partner");

  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  const tabClass = (active: boolean) =>
    `relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[12px] ${active ? "font-semibold text-[var(--ink)]" : "text-[var(--slate)]"}`;

  return (
    <>
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-xl">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <i className={`${isActive ? t.icon.replace("-line", "-fill") : t.icon} text-[22px] leading-none`} />
                    {t.to === "/account/messages" && unread > 0 ? (
                      <span className="absolute -right-2.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--acc-blue)] px-1 text-[11px] font-semibold leading-none text-white">
                        {unread}
                      </span>
                    ) : null}
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(true)} className={tabClass(moreActive || moreOpen)} aria-haspopup="dialog" aria-expanded={moreOpen}>
            <span className="relative">
              <i className={`${moreActive ? "ri-menu-fill" : "ri-menu-line"} text-[22px] leading-none`} />
            </span>
            More
          </button>
        </div>
      </nav>

      {moreOpen
        ? createPortal(
            <div className="fixed inset-0 z-[115] lg:hidden" role="dialog" aria-modal="true" aria-label="More">
              <div className="absolute inset-0 bg-[rgba(0,7,39,0.45)]" onClick={() => setMoreOpen(false)} />
              <div className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#d6d6dc]" />
                <ul className="divide-y divide-[var(--line)]">
                  {[
                    ...(isPartner ? [{ label: "Partner", icon: "ri-hand-heart-line", onClick: () => navigate("/account/partner") }] : []),
                    { label: "Account", icon: "ri-user-3-line", onClick: () => navigate("/account/settings") },
                    { label: "Help & Support", icon: "ri-question-line", onClick: () => navigate("/account/help") },
                    { label: "New Project", icon: "ri-folder-add-line", onClick: () => { setMoreOpen(false); onNewProject(); } },
                    { label: "Log out", icon: "ri-logout-box-r-line", onClick: () => { setMoreOpen(false); onSignOut(); }, muted: true },
                  ].map((it) => (
                    <li key={it.label}>
                      <button
                        onClick={it.onClick}
                        className={`flex min-h-[52px] w-full items-center gap-4 px-2 text-left text-[16px] ${it.muted ? "text-[var(--slate)]" : "text-[var(--ink)]"}`}
                      >
                        <i className={`${it.icon} text-[20px]`} />
                        {it.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Page title block used by every dashboard page. */
export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--ink)] md:text-[3rem]">
          {title}
        </h1>
        {sub ? <p className="mt-3 text-[17px] text-[var(--ink)] md:text-[19px]">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Fetch the dashboard's pages in the background so moving between them is instant. */
function PrefetchPortalPages() {
  useEffect(() => {
    const t = setTimeout(() => {
      void import("./pages/HomePage");
      void import("./pages/ProjectsPage");
      void import("./pages/ProjectDetailPage");
      void import("./pages/BillingPage");
      void import("./pages/InvoicePage");
      void import("./pages/AccountPage");
      void import("./pages/MessagesPage");
      void import("./pages/HelpPage");
    }, 300);
    return () => clearTimeout(t);
  }, []);
  return null;
}
