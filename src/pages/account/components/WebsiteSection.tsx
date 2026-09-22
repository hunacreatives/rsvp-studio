import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Event } from "./EventsSection";

interface WebsiteSectionProps {
  events: Event[];
  /**
   * "edit" (default, reached from the profile sidebar) continues the
   * draft you already have. "gallery" (reached from the main nav's
   * "Build Your Website") lands on the template picker instead, so
   * browsing/switching designs stays a separate action from resuming
   * your current draft — see docs/template-builder-decisions.md.
   */
  mode?: "edit" | "gallery";
}

// The single place to manage an event's website. If the account has
// exactly one event, skip straight to it — no extra click. If it has
// more than one, ask which one, rather than silently picking the first
// (the previous behavior here and in BuildEntryPage).
export default function WebsiteSection({ events, mode = "edit" }: WebsiteSectionProps) {
  const navigate = useNavigate();
  const destination = (eventId: string) =>
    `/account/events/${eventId}/site-builder${mode === "edit" ? "/edit" : ""}`;

  useEffect(() => {
    if (events.length === 1) {
      navigate(destination(events[0].id), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, navigate, mode]);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: "#fff", border: "1px solid var(--line)" }}>
        <p style={{ color: "var(--slate)" }}>No events linked to your account yet.</p>
      </div>
    );
  }

  if (events.length === 1) {
    return <p style={{ color: "var(--slate)" }}>Loading your website&hellip;</p>;
  }

  return (
    <div>
      <p className="eyebrow mb-2">Website</p>
      <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: "var(--ink)" }}>
        Which event's website do you want to edit?
      </h2>
      <div className="flex flex-col gap-3">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => navigate(destination(event.id))}
            className="text-left rounded-2xl p-5 flex items-center justify-between gap-4 transition-colors hover:bg-black/[0.02]"
            style={{ background: "#fff", border: "1px solid var(--line)" }}
          >
            <div>
              <p className="font-display font-semibold text-[16px]" style={{ color: "var(--ink)" }}>
                {event.name}
              </p>
              {event.event_date && (
                <p className="text-[13px] mt-1" style={{ color: "var(--slate)" }}>
                  {new Date(event.event_date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
            <span className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
              Edit &rarr;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
