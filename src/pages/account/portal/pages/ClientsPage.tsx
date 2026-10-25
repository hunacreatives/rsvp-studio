import { useState } from "react";
import CreateEventModal from "../../components/CreateEventModal";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import ClientList from "../components/ClientList";
import { useGuestStats } from "../guestStats";
import { isClientEvent } from "../types";
import { EmptyState, PrimaryButton } from "../ui";

// Coordinators: every client's event (ones they added and haven't handed over yet, and the ones
// they were invited to help with), the same rows as the Coordinator desk: search, Upcoming or
// Past, and the next thing to do on each. Opening one is the event page, with what they may do
// there.

export default function ClientsPage() {
  const { projects, demo } = usePortal();
  const clients = projects.filter(isClientEvent);
  const stats = useGuestStats(clients, demo);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="Your clients"
        action={
          <PrimaryButton onClick={() => setAdding(true)} className="!px-5 !py-2.5">
            <i className="ri-add-line text-[17px]" aria-hidden /> Add a client
          </PrimaryButton>
        }
      />
      {clients.length ? (
        <ClientList clients={clients} stats={stats} />
      ) : (
        <EmptyState icon="ri-team-line" title="No clients yet" body="Add a client to set up their event. When a client invites you as their coordinator, it shows up here too." />
      )}
      {adding ? <CreateEventModal forClient onClose={() => setAdding(false)} /> : null}
    </>
  );
}
