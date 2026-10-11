import type { ReactNode } from "react";
import type { EventContent } from "../content/types";
import type { StandardSection, TemplateDefinition } from "../engine/registry";
import CustomFields from "./sections/CustomFields";
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
  /** The selected template: decides which sections show, and adds its own fields. */
  template?: TemplateDefinition;
}

interface Group {
  title: string;
  /** Hidden when the template doesn't use this section. */
  section?: StandardSection;
  render: () => ReactNode;
}

// Plain, native <details>-based groups — no editor framework, no
// drag-and-drop. Starts with the high-value fields called out in the
// product brief; rich-text/inline editing is an explicit non-goal for V1.
export default function ContentEditor({ content, onChange, eventId, template }: ContentEditorProps) {
  const uses = template?.uses;
  const shows = (s: StandardSection) => !uses || uses.includes(s);
  const all: Group[] = [
    {
      title: shows("story") ? "Names & Your Story" : "Names",
      render: () => (
        <HostsFields content={content} onChange={onChange} hideStory={!shows("story")} storyLabel={template?.storyLabel} storyHint={template?.storyHint} />
      ),
    },
    ...(template?.customFields?.length
      ? [{ title: `${template.label} details`, render: () => <CustomFields fields={template.customFields!} content={content} onChange={onChange} /> }]
      : []),
    { title: "Date & Venue", section: "dateVenue", render: () => <DateVenueFields content={content} onChange={onChange} /> },
    { title: "Schedule", section: "schedule", render: () => <ScheduleFields content={content} onChange={onChange} /> },
    { title: "Accommodations", section: "accommodations", render: () => <AccommodationsFields content={content} onChange={onChange} /> },
    { title: "Travel Information", section: "travel", render: () => <TravelFields content={content} onChange={onChange} /> },
    {
      title: template?.galleryLimit ? "Photos" : "Gallery",
      section: "gallery",
      render: () => <GalleryFields content={content} onChange={onChange} eventId={eventId} limit={template?.galleryLimit} />,
    },
    { title: "Special People", section: "keyPeople", render: () => <KeyPeopleFields content={content} onChange={onChange} /> },
    { title: "Gifts", section: "registry", render: () => <RegistryFields content={content} onChange={onChange} /> },
    { title: "FAQs", section: "faqs", render: () => <FaqFields content={content} onChange={onChange} /> },
  ];
  const groups = all.filter((g) => !g.section || shows(g.section));

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
