import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import * as api from "@/pages/account/portal/api";
import CreateEventForm from "./CreateEventForm";
import { useCreateEvent, type CreateEventInput, type EventType } from "../useCreateEvent";

interface CreateEventModalProps {
  onClose: () => void;
}

const EVENT_TYPES: { type: EventType; label: string; icon: string }[] = [
  { type: "wedding", label: "Wedding", icon: "ri-heart-line" },
  { type: "birthday", label: "Birthday", icon: "ri-cake-2-line" },
  { type: "anniversary", label: "Anniversary", icon: "ri-calendar-event-line" },
  { type: "other", label: "Other Celebration", icon: "ri-sparkling-2-line" },
];

// Two steps, matching the Joy-style reference flow: pick an event type,
// then a short quick-start form. Creating the event seeds its wedding
// site draft immediately (see useCreateEvent) and lands on the template
// gallery — never publishes anything, matching the non-destructive
// selection rule used everywhere else in the builder.
export default function CreateEventModal({ onClose }: CreateEventModalProps) {
  const [eventType, setEventType] = useState<EventType | null>(null);
  const { createEvent, status, errorDetail } = useCreateEvent();
  const navigate = useNavigate();
  // One free website at a time (supabase/project-lifecycle.sql): if they already
  // have one, offer to make it Premium (which frees the slot) or delete it.
  const [freeSite, setFreeSite] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [premiumPrice, setPremiumPrice] = useState(0);
  const [paying, setPaying] = useState<string | null>(null);
  useEffect(() => {
    api.myFreeSite().then(setFreeSite);
    supabase.from("site_prices").select("amount").eq("tier", "premium").maybeSingle().then(({ data }) => setPremiumPrice(Number(data?.amount ?? 0)));
  }, []);

  async function handleSubmit(input: CreateEventInput) {
    const eventId = await createEvent(input);
    if (eventId) {
      navigate(`/account/events/${eventId}/site-builder`);
    } else {
      // The database said no (a free site was made in another tab): show the choice.
      const current = await api.myFreeSite();
      if (current) setFreeSite(current);
    }
  }

  const upgrade = async () => {
    if (!freeSite) return;
    setPaying("Opening the payment page…");
    try {
      const r = await api.startCheckout({ eventId: freeSite.id, upgrade: true });
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      else setPaying(null);
    } catch (e) {
      setPaying(e instanceof Error ? e.message : "Couldn’t start the payment — please try again.");
    }
  };
  const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(premiumPrice);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,7,39,0.45)", zIndex: 100 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8 relative"
        style={{ background: "#fff", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--slate)" }}
        >
          &times;
        </button>

        {freeSite === undefined ? (
          <p style={{ textAlign: "center", color: "var(--slate)", margin: "24px 0" }}>One moment…</p>
        ) : freeSite ? (
          <>
            <h2 className="font-display text-2xl font-semibold mb-3" style={{ color: "var(--ink)" }}>
              You already have a free website
            </h2>
            <p style={{ color: "var(--slate)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: "var(--ink)" }}>{freeSite.name}</strong> is your free website. Free accounts get one website at a time.
              {premiumPrice > 0 ? ` Make it Premium (${peso}, one time) to start another, or delete it.` : " Delete it to start another."}
            </p>
            <div className="flex flex-col gap-2" style={{ marginTop: 22 }}>
              {premiumPrice > 0 ? (
                <button onClick={upgrade} disabled={!!paying && paying.startsWith("Opening")} className="btn btn-primary" style={{ justifyContent: "center" }}>
                  Upgrade {freeSite.name} to Premium · {peso}
                </button>
              ) : null}
              <button onClick={() => navigate(`/account/projects/${freeSite.id}?tab=website`)} className="btn btn-ghost" style={{ justifyContent: "center" }}>
                Delete {freeSite.name}
              </button>
              <button onClick={onClose} className="btn btn-ghost" style={{ justifyContent: "center", border: "none" }}>
                Cancel
              </button>
            </div>
            {paying ? <p style={{ marginTop: 12, fontSize: 13, color: paying.startsWith("Opening") ? "var(--slate)" : "var(--acc-coral)" }}>{paying}</p> : null}
          </>
        ) : eventType === null ? (
          <>
            <h2 className="font-display text-2xl font-semibold mb-6 text-center" style={{ color: "var(--ink)" }}>
              What kind of event would you like to create?
            </h2>
            <div className="flex flex-col gap-3">
              {EVENT_TYPES.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setEventType(option.type)}
                  className="flex flex-col items-center gap-2 py-6 rounded-2xl transition-colors hover:bg-black/[0.02]"
                  style={{ border: "1px solid var(--line)" }}
                >
                  <i className={`${option.icon} text-2xl`} style={{ color: "var(--ink)" }} />
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{option.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <CreateEventForm
              eventType={eventType}
              onBack={() => setEventType(null)}
              onSubmit={handleSubmit}
              submitting={status === "creating"}
            />
            {status === "error" ? (
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--acc-coral)" }}>
                {errorDetail ?? "Something went wrong creating your event — try again."}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
