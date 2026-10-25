import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { planForEvent } from "@/pages/tools/seating/website";
import { otherPlans } from "@/pages/tools/seating/cloud";

// Guests → the event's seating plan in Mesa: open it if the host has made one, or start one
// from this event's invite list and replies (/tools/seating-chart-maker?event=…).

export default function SeatingPlanLink({ eventId, className = "" }: { eventId: string; className?: string }) {
  const [has, setHas] = useState<boolean | null>(null);
  // Plans are each person's own: say when the couple or their coordinator has one too.
  const [theirs, setTheirs] = useState<{ owner_name: string; updated_at: string } | null>(null);
  useEffect(() => {
    let alive = true;
    planForEvent(eventId)
      .then((p) => alive && setHas(!!p))
      .catch(() => alive && setHas(false));
    otherPlans(eventId).then((o) => alive && setTheirs(o[0] ?? null));
    return () => {
      alive = false;
    };
  }, [eventId]);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {theirs ? (
        <span className="text-[13px] text-[var(--slate)]">
          {theirs.owner_name} has a seating plan (edited {new Date(theirs.updated_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })})
        </span>
      ) : null}
      <Link
        to={`/tools/seating-chart-maker?event=${eventId}`}
        className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[var(--ink)] bg-white px-4 py-2 text-[14px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-white md:min-h-0 md:py-1.5 md:text-[13px] ${className}`}
      >
        <i className="ri-layout-grid-line" aria-hidden /> {has ? "Open seating plan" : theirs ? "Make my own plan" : "Make a seating plan"}
      </Link>
    </span>
  );
}
