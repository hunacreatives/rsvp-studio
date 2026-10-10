import { useEffect, useState, Suspense } from "react";
import PageLoading from "@/components/PageLoading";
import type { ReactNode } from "react";
import { Navigate, NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { PortalProvider, usePortal } from "./PortalContext";
import NewProjectModal from "./components/NewProjectModal";
import { firstName } from "./format";

const NAV = [
  { to: "/account", label: "Home", icon: "ri-home-4-line", end: true },
  { to: "/account/projects", label: "Projects", icon: "ri-folder-3-line" },
  { to: "/account/billing", label: "Billing", icon: "ri-file-list-3-line" },
  { to: "/account/settings", label: "Account", icon: "ri-user-3-line" },
  { to: "/account/messages", label: "Messages", icon: "ri-inbox-2-line" },
];

function Loading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />
      <div className="grid place-items-center py-32">
        <p className="text-[var(--slate)]">Loading your dashboard…</p>
      </div>
    </div>
  );
}

export default function PortalLayout() {
  return (
    <PortalProvider fallback={<Loading />}>
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

  // Studio team accounts use the admin console, never the client dashboard.
  if (profile.is_staff && !demo) return <Navigate to="/studio" replace />;

  const signOut = async () => {
    if (!demo) await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
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
            <button onClick={() => setJustConfirmed(false)} aria-label="Dismiss" className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5">
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="container-x py-8 md:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-5">
          {/* Sidebar */}
          <aside className="lg:w-[232px] lg:shrink-0">
            <div className="rounded-[22px] bg-[var(--paper)] p-4 lg:sticky lg:top-24 lg:min-h-[630px] lg:p-5">
              <p className="px-1 font-display text-[2.1rem] font-semibold leading-none tracking-[-0.02em] text-[var(--ink)] lg:text-[2.6rem]">
                Hi, {firstName(profile.full_name, "there")}.
              </p>
              {/* Phones: every link visible, wrapping onto a second row (no hidden sideways scroll). */}
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
            <div className="mb-6 flex gap-6">
              <QuickAction icon="ri-folder-3-line" label="New Project" onClick={() => setNewProjectOpen(true)} />
              <QuickAction icon="ri-chat-3-line" label="Messages" onClick={() => navigate("/account/messages")} badge={unread} />
            </div>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      <FooterSection />
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
