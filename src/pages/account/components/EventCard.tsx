import type { Event } from "./EventsSection";

interface EventCardProps {
  event: Event;
  role: "Owner" | "Member";
  venueName?: string;
  heroImageUrl?: string;
  onOpen: () => void;
  onEditWebsite: () => void;
  onArchive: () => void;
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  anniversary: "Anniversary",
  other: "Celebration",
};

export default function EventCard({ event, role, venueName, heroImageUrl, onOpen, onEditWebsite, onArchive }: EventCardProps) {
  const typeLabel = EVENT_TYPE_LABEL[event.event_type ?? ""] ?? "Event";

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "#fff", border: "1px solid var(--line)" }}
    >
      <button onClick={onOpen} className="text-left" style={{ display: "block" }}>
        <div
          style={{
            aspectRatio: "4 / 3",
            background: heroImageUrl ? undefined : "linear-gradient(135deg, var(--paper), var(--line))",
            display: heroImageUrl ? "block" : "grid",
            placeItems: "center",
          }}
        >
          {heroImageUrl ? (
            <img src={heroImageUrl} alt={event.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="font-display text-lg" style={{ color: "var(--slate)" }}>
              {event.name}
            </span>
          )}
        </div>
        <div className="p-4">
          <p className="text-[13px]" style={{ color: "var(--slate)" }}>
            {typeLabel}
          </p>
          <p className="font-display font-semibold text-[16px]" style={{ color: "var(--ink)" }}>
            {event.name}
          </p>
          <p className="text-[13px] mt-2" style={{ color: "var(--slate)" }}>
            {event.event_date
              ? new Date(event.event_date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
              : "Date TBD"}
          </p>
          {venueName ? (
            <p className="text-[13px] mt-1" style={{ color: "var(--slate)" }}>
              {venueName}
            </p>
          ) : null}
        </div>
      </button>

      <div className="flex items-center justify-between px-4 pb-4 mt-auto">
        <span
          className="px-3 py-1 rounded-full text-[12px] font-medium"
          style={{ border: "1px solid var(--acc-blue)", color: "var(--acc-blue)" }}
        >
          {role}
        </span>
        <div className="relative group">
          <button aria-label="Event options" className="px-2 py-1" style={{ color: "var(--slate)" }}>
            &#8942;
          </button>
          <div
            className="absolute right-0 top-full hidden group-hover:block rounded-xl overflow-hidden shadow-lg z-10"
            style={{ background: "#fff", border: "1px solid var(--line)", minWidth: 160 }}
          >
            <button
              onClick={onEditWebsite}
              className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-black/5"
              style={{ color: "var(--ink)" }}
            >
              Edit Website
            </button>
            <button
              onClick={onOpen}
              className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-black/5"
              style={{ color: "var(--ink)" }}
            >
              View RSVPs
            </button>
            <button
              onClick={onArchive}
              className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-black/5"
              style={{ color: "var(--acc-coral)" }}
            >
              Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
