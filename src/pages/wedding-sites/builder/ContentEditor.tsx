import type { ReactNode } from "react";
import type { EventContent } from "../content/types";
import HostsFields from "./sections/HostsFields";
import DateVenueFields from "./sections/DateVenueFields";
import ScheduleFields from "./sections/ScheduleFields";
import AccommodationsFields from "./sections/AccommodationsFields";
import TravelFields from "./sections/TravelFields";
import GalleryFields from "./sections/GalleryFields";
import KeyPeopleFields from "./sections/KeyPeopleFields";
import RegistryFields from "./sections/RegistryFields";
import FaqFields from "./sections/FaqFields";

interface ContentEditorProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
  eventId: string | undefined;
}

interface Group {
  title: string;
  render: () => ReactNode;
}

// Plain, native <details>-based groups — no editor framework, no
// drag-and-drop. Starts with the high-value fields called out in the
// product brief; rich-text/inline editing is an explicit non-goal for V1.
export default function ContentEditor({ content, onChange, eventId }: ContentEditorProps) {
  const groups: Group[] = [
    { title: "Hosts & Story", render: () => <HostsFields content={content} onChange={onChange} /> },
    { title: "Date & Venue", render: () => <DateVenueFields content={content} onChange={onChange} /> },
    { title: "Schedule", render: () => <ScheduleFields content={content} onChange={onChange} /> },
    { title: "Accommodations", render: () => <AccommodationsFields content={content} onChange={onChange} /> },
    { title: "Travel Information", render: () => <TravelFields content={content} onChange={onChange} /> },
    { title: "Gallery", render: () => <GalleryFields content={content} onChange={onChange} eventId={eventId} /> },
    { title: "Key People", render: () => <KeyPeopleFields content={content} onChange={onChange} /> },
    { title: "Registry", render: () => <RegistryFields content={content} onChange={onChange} /> },
    { title: "FAQs", render: () => <FaqFields content={content} onChange={onChange} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {groups.map((group, index) => (
        <details key={group.title} open={index === 0} style={{ borderBottom: "1px solid var(--line)" }}>
          <summary
            style={{
              padding: "14px 4px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--ink)",
            }}
          >
            {group.title}
          </summary>
          <div style={{ padding: "4px 4px 20px" }}>{group.render()}</div>
        </details>
      ))}
    </div>
  );
}
