import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as api from "../api";
import CreateEventModal from "../../components/CreateEventModal";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { byWhen, EventList, isPast } from "./blocks";
import ClientList from "./ClientList";
import NeedsAttention from "./NeedsAttention";
import PartnerStrip from "./PartnerStrip";
import { useGuestStats } from "../guestStats";
import { firstName } from "../format";
import { isClientEvent, isUnclaimed } from "../types";
import { EmptyState, PrimaryButton, SectionTitle } from "../ui";

// Home for coordinators (supabase/coordinator-desk.sql): every client with the next thing to do
// (This week first, when there's anything this week), and "Add a client". Their own events, if any, sit underneath.
// The first time, the title welcomes them instead of "Welcome back".

const WELCOMED = (id: string) => `rsvp.coordinator-welcomed.${id}`;
function welcomed(id: string) {
  try {
    return localStorage.getItem(WELCOMED(id)) === "1";
  } catch {
    return true;
  }
}

/** A coordinator with a client who isn't a partner yet: the partner program, once,
 *  under their client list (dismissed per browser). */
function usePartnerInvite(clients: number, demo: boolean) {
  const key = "rsvp.partner-invite-dismissed";
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (demo || clients < 1) return;
    try {
      if (localStorage.getItem(key) === "1") return;
    } catch {
      /* show it */
    }
    let alive = true;
    // Not a partner, and hasn't applied already (supabase/partner-flow.sql).
    Promise.all([api.myPartner(), api.myPartnerApplication()]).then(([p, applied]) => alive && setShow(!p && !applied));
    return () => {
      alive = false;
    };
  }, [clients, demo]);
  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* fine */
    }
  };
  return { show, dismiss };
}

export default function CoordinatorDesk({ children }: { /** Tasks and activity, as on Home. */ children?: ReactNode }) {
  const { projects, profile, demo } = usePortal();
  const navigate = useNavigate();
  const stats = useGuestStats(projects, demo);
  const clients = projects.filter(isClientEvent);
  const own = projects.filter((p) => !isClientEvent(p)).sort(byWhen);
  const [adding, setAdding] = useState(false);
  // Client events I still own and haven't handed over, still to come (what the cap counts).
  const openClients = clients.filter((p) => isUnclaimed(p) && !isPast(p)).length;
  const [isPartner, setIsPartner] = useState(true);
  useEffect(() => {
    if (demo || openClients < 7) return;
    let alive = true;
    api.myPartner().then((p) => alive && setIsPartner(!!p));
    return () => {
      alive = false;
    };
  }, [demo, openClients]);
  const partnerInvite = usePartnerInvite(clients.length, demo);
  const [welcome] = useState(() => !demo && !welcomed(profile.id));
  useEffect(() => {
    try {
      localStorage.setItem(WELCOMED(profile.id), "1");
    } catch {
      // private window: they'll be welcomed again, that's all
    }
  }, [profile.id]);

  return (
    <>
      {welcome ? (
        <PageHeader title="Welcome, coordinator" sub={"Set up each client’s event, then hand it over when they’re ready. You stay on to\u00a0help."} />
      ) : (
        <PageHeader title={`Welcome back${profile.full_name ? `, ${firstName(profile.full_name)}` : ""}`} />
      )}
      <PartnerStrip />
      <NeedsAttention stats={stats} projects={own} />

      <SectionTitle
        action={
          <span className="flex flex-col items-end gap-1">
            <PrimaryButton onClick={() => setAdding(true)} className="!px-5 !py-2.5">
              <i className="ri-add-line text-[17px]" aria-hidden /> Add a client
            </PrimaryButton>
            {/* Free accounts hold 10 client events before handing them over (partners: no cap). */}
            {openClients >= 7 && !isPartner ? <span className="text-[13px] text-[var(--slate)]">{openClients} of 10 before hand-over</span> : null}
          </span>
        }
      >
        Your clients{clients.length ? <span className="text-[var(--slate)]"> · {clients.length}</span> : null}
      </SectionTitle>
      {clients.length ? (
        <>
          <ClientList clients={clients} stats={stats} />
          {partnerInvite.show ? (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] border border-[rgba(0,7,39,0.14)] bg-white px-5 py-4">
              {/* Grows from 240px, so on a phone the words take the full width and the link wraps under. */}
              <p className="min-w-0 grow basis-[240px] text-[15px] text-[var(--ink)]">
                <b className="font-semibold">Earn from the clients you bring.</b>{" "}
                <span className="text-[var(--slate)]">As a partner, your clients get 10% off and you earn up to 20% of what they&nbsp;pay.</span>
              </p>
              <Link to="/account/partner" className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-[var(--acc-blue)] hover:underline md:min-h-0">
                Apply to the partner program →
              </Link>
              <button onClick={partnerInvite.dismiss} aria-label="Not now" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--slate)] hover:bg-black/5 md:h-9 md:w-9">
                <i className="ri-close-line text-lg" aria-hidden />
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon="ri-team-line"
          title="No clients yet"
          body="Add a client to set up their event. When a client invites you as their coordinator, it shows up here too."
        />
      )}

      {own.length ? (
        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-[18px] font-semibold text-[var(--ink)]">Your own events</h2>
            {own.length > 3 ? (
              <button onClick={() => navigate("/account/projects")} className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[var(--acc-blue)] hover:underline md:min-h-0">
                All {own.length} events →
              </button>
            ) : null}
          </div>
          <EventList projects={own.filter((p, i) => !isPast(p) || i < 2).slice(0, 3)} stats={stats} />
        </section>
      ) : null}

      {children}
      {adding ? <CreateEventModal forClient onClose={() => setAdding(false)} /> : null}
    </>
  );
}
