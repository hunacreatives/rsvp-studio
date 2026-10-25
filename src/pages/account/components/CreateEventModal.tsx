import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { lenisRef } from "@/lib/lenis";
import CharacterLoader from "@/components/CharacterLoader";
import * as api from "@/pages/account/portal/api";
import CreateEventForm from "./CreateEventForm";
import { useCreateEvent, type CreateEventInput, type EventType } from "../useCreateEvent";
import { useTemplateCatalog } from "@/pages/wedding-sites/engine/catalog";
import { getTemplateDefinition, templateFitsEvent } from "@/pages/wedding-sites/engine/registry";

interface CreateEventModalProps {
  onClose: () => void;
  /** Picked on /build: the builder opens with this design already chosen. */
  templateId?: string;
  /** "Add a client" (Coordinator desk): the event is theirs to hand over, and doesn't count
   *  toward the free projects (supabase/coordinator-desk.sql), so that check is skipped. */
  forClient?: boolean;
}

const EVENT_TYPES: { type: EventType; label: string; icon: string }[] = [
  { type: "wedding", label: "Wedding", icon: "ri-heart-line" },
  { type: "birthday", label: "Birthday", icon: "ri-cake-2-line" },
  { type: "anniversary", label: "Anniversary", icon: "ri-calendar-event-line" },
  { type: "baby", label: "Christening & First Birthday", icon: "ri-bear-smile-line" },
  { type: "engagement", label: "Engagement & Tinghun", icon: "ri-vip-diamond-line" },
  { type: "other", label: "Other Celebration", icon: "ri-sparkling-2-line" },
];

// Two steps, matching the Joy-style reference flow: pick an event type,
// then a short quick-start form. Creating the event seeds its wedding
// site draft immediately (see useCreateEvent) and lands on the template
// gallery — never publishes anything, matching the non-destructive
// selection rule used everywhere else in the builder.
export default function CreateEventModal({ onClose, templateId, forClient = false }: CreateEventModalProps) {
  const [eventType, setEventType] = useState<EventType | null>(null);
  const { createEvent, status, errorDetail } = useCreateEvent({ forClient });
  // Made, but the hand-over invite didn't go out: say so before moving on.
  const [inviteProblem, setInviteProblem] = useState<{ eventId: string; email: string; problem: string } | null>(null);
  const [inviting, setInviting] = useState(false);
  // A design picked on /build is for certain kinds of event (Studio → Templates): only those
  // are offered, and with just one the question is skipped.
  const { ready: catalogReady } = useTemplateCatalog();
  const picked = templateId ? getTemplateDefinition(templateId) : undefined;
  const eventTypes = picked ? EVENT_TYPES.filter((o) => templateFitsEvent(picked, o.type)) : EVENT_TYPES;
  const onlyType = catalogReady && picked && eventTypes.length === 1 ? eventTypes[0].type : null;
  useEffect(() => {
    if (onlyType && eventType === null) setEventType(onlyType);
  }, [onlyType, eventType]);
  const navigate = useNavigate();
  // Free accounts: 3 projects at a time (supabase/free-limits.sql). At the limit,
  // offer to make one Premium (which frees its slot) or delete one.
  const [freeProjects, setFreeProjects] = useState<api.FreeProject[] | undefined>(forClient ? [] : undefined);
  const atLimit = !!freeProjects && freeProjects.length >= api.FREE_PROJECT_LIMIT;
  const [premiumPrice, setPremiumPrice] = useState(0);
  const [paying, setPaying] = useState<string | null>(null);
  // Freeze the page behind (as the log-in modal does) and close on Escape.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const lenis = lenisRef.current;
    if (lenis) lenis.stop();
    else document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      if (lenis) lenis.start();
      else document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => {
    if (forClient) return;
    api.myFreeProjects().then(setFreeProjects);
    supabase.from("site_prices").select("amount").eq("tier", "premium").maybeSingle().then(({ data }) => setPremiumPrice(Number(data?.amount ?? 0)));
  }, [forClient]);

  const toDesigns = (eventId: string) => navigate(`/account/events/${eventId}/site-builder${templateId ? `?template=${encodeURIComponent(templateId)}` : ""}`);
  async function handleSubmit(input: CreateEventInput) {
    const eventId = await createEvent(input);
    if (eventId) {
      if (forClient && input.clientEmail) {
        setInviting(true);
        const problem = await api.inviteToEvent(eventId, input.clientEmail, "owner");
        setInviting(false);
        if (problem) return setInviteProblem({ eventId, email: input.clientEmail, problem });
      }
      toDesigns(eventId);
    } else if (!forClient) {
      // The database said no (a project was made in another tab): show the choice.
      setFreeProjects(await api.myFreeProjects());
    }
  }

  const upgrade = async (eventId: string) => {
    setPaying("Opening the payment page…");
    try {
      const r = await api.startCheckout({ eventId, upgrade: true });
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
      role="dialog"
      aria-modal="true"
      aria-label={forClient ? "Add a client" : "Create a new event"}
    >
      <div
        className="relative w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl p-6 sm:p-8"
        style={{ background: "#fff", maxHeight: "min(90vh, 90dvh)" }}
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-black/5"
          style={{ color: "var(--ink)" }}
        >
          <i className="ri-close-line text-2xl" />
        </button>

        {inviteProblem ? (
          <>
            <h2 className="font-display text-2xl font-semibold mb-3 pr-10" style={{ color: "var(--ink)" }}>
              Your client’s event is ready
            </h2>
            <p style={{ color: "var(--slate)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              The invite to {inviteProblem.email} didn’t go out. {inviteProblem.problem} You can send it again from People on the&nbsp;event.
            </p>
            <button onClick={() => toDesigns(inviteProblem.eventId)} className="btn btn-primary mt-6 w-full">
              Continue to designs
            </button>
          </>
        ) : freeProjects === undefined || (templateId && !catalogReady) ? (
          <CharacterLoader message="One moment…" />
        ) : atLimit ? (
          <>
            <h2 className="font-display text-2xl font-semibold mb-3 pr-10" style={{ color: "var(--ink)" }}>
              You have {freeProjects.length} free projects
            </h2>
            <p style={{ color: "var(--slate)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              Free accounts can have {api.FREE_PROJECT_LIMIT} projects at a time, with one website live.
              {premiumPrice > 0 ? ` Make one Premium (${peso}, one time) or delete one to start another.` : " Delete one to start another."}
            </p>
            <ul className="divide-y" style={{ listStyle: "none", margin: "18px 0 0", padding: 0, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", borderColor: "var(--line)" }}>
              {freeProjects.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3" style={{ borderColor: "var(--line)" }}>
                  <span className="min-w-0 flex-1 break-words" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                    {p.name}
                    <span className="ml-2 align-middle text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: p.live ? "#3d7a12" : "var(--slate)" }}>
                      {p.live ? "Live" : "Draft"}
                    </span>
                  </span>
                  <span className="flex gap-2">
                    {premiumPrice > 0 ? (
                      <button onClick={() => upgrade(p.id)} disabled={!!paying && paying.startsWith("Opening")} className="min-h-[44px] rounded-full px-4 text-[14px] font-medium text-white" style={{ background: "var(--acc-blue)" }}>
                        Make Premium
                      </button>
                    ) : null}
                    <button onClick={() => navigate(`/account/projects/${p.id}?tab=website`)} className="min-h-[44px] rounded-full px-4 text-[14px] font-medium" style={{ border: "1px solid var(--line)", color: "var(--ink)" }}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <button onClick={onClose} className="btn btn-ghost !text-[15px] !normal-case !tracking-normal w-full" style={{ justifyContent: "center", border: "none", marginTop: 12 }}>
              Cancel
            </button>
            {paying ? <p role="status" style={{ marginTop: 12, fontSize: 14, color: paying.startsWith("Opening") ? "var(--slate)" : "var(--acc-coral)" }}>{paying}</p> : null}
          </>
        ) : eventType === null ? (
          <>
            <h2 className="font-display text-2xl font-semibold mb-6 px-8 text-center" style={{ color: "var(--ink)" }}>
              {forClient ? "What is your client celebrating?" : "What kind of event would you like to create?"}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
              {eventTypes.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setEventType(option.type)}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl px-2 py-5 text-center transition-colors hover:bg-black/[0.02] sm:py-6"
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
              onBack={onlyType ? onClose : () => setEventType(null)}
              onSubmit={handleSubmit}
              submitting={status === "creating" || inviting}
              forClient={forClient}
            />
            {status === "error" ? (
              <p role="alert" style={{ marginTop: 12, fontSize: 14, color: "var(--acc-coral)" }}>
                {errorDetail ?? "Something went wrong creating your event — try again."}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
