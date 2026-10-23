import type { ReactNode } from "react";
import type { EventContent } from "../content/types";
import type { StandardSection, TemplateDefinition } from "../engine/registry";
import type { SectionVisibility } from "../presentation/types";
import ShowSection from "./components/ShowSection";
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
import RsvpQuestionsFields from "./sections/RsvpQuestionsFields";
import EntourageFields from "./sections/EntourageFields";

interface ContentEditorProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
  eventId: string | undefined;
  /** The selected template: decides which sections show, and adds its own fields. */
  template?: TemplateDefinition;
  /** Premium site (more RSVP questions), and the upgrade dialog. */
  premium?: boolean;
  onUpgrade?: () => void;
  /** Which sections show (the template's saved settings) and how to switch one; the design's `hideable` decides which get a switch. */
  visibility?: SectionVisibility;
  onShowSection?: (key: string, on: boolean) => void;
}

interface Group {
  title: string;
  /** Hidden when the template doesn't use this section. */
  section?: StandardSection;
  /** Its SectionVisibility key: a "Show on website" switch when the design can hide it. */
  vis?: string;
  render: () => ReactNode;
}

// Plain, native <details>-based groups — no editor framework, no
// drag-and-drop. Starts with the high-value fields called out in the
// product brief; rich-text/inline editing is an explicit non-goal for V1.
export default function ContentEditor({ content, onChange, eventId, template, premium = false, onUpgrade, visibility, onShowSection }: ContentEditorProps) {
  const uses = template?.uses;
  const shows = (s: StandardSection) => !uses || uses.includes(s);
  const hideable = template?.hideable ?? [];
  const canHide = (key?: string) => !!key && !!onShowSection && hideable.some((h) => h.key === key);
  const isShown = (key: string) => visibility?.[key] !== false;
  const all: Group[] = [
    {
      title: shows("story") ? "Names & Your Story" : "Names",
      vis: shows("story") ? "hostIntro" : undefined,
      render: () => (
        <HostsFields content={content} onChange={onChange} hideStory={!shows("story")} storyLabel={template?.storyLabel} storyHint={template?.storyHint} />
      ),
    },
    ...(template?.customFields?.length
      ? [
          {
            title: `${template.label} details`,
            render: () => (
              <CustomFields
                fields={template.customFields!}
                content={content}
                onChange={onChange}
                sections={onShowSection ? hideable : []}
                visibility={visibility}
                onShowSection={onShowSection}
              />
            ),
          },
        ]
      : []),
    { title: "Date & Venue", section: "dateVenue", vis: "venue", render: () => <DateVenueFields content={content} onChange={onChange} /> },
    { title: "Schedule", section: "schedule", vis: "schedule", render: () => <ScheduleFields content={content} onChange={onChange} /> },
    { title: "Accommodations", section: "accommodations", vis: "accommodations", render: () => <AccommodationsFields content={content} onChange={onChange} /> },
    { title: "Travel Information", section: "travel", vis: "travelInformation", render: () => <TravelFields content={content} onChange={onChange} /> },
    {
      title: template?.galleryLimit ? "Photos" : "Gallery",
      section: "gallery",
      vis: "gallery",
      render: () => <GalleryFields content={content} onChange={onChange} eventId={eventId} limit={template?.galleryLimit} backs={template?.photoBacks} />,
    },
    { title: "Special People", section: "keyPeople", render: () => <KeyPeopleFields content={content} onChange={onChange} /> },
    { title: "Gifts", section: "registry", vis: "registry", render: () => <RegistryFields content={content} onChange={onChange} eventId={eventId} /> },
    { title: "FAQs", section: "faqs", vis: "faqs", render: () => <FaqFields content={content} onChange={onChange} /> },
    // Built-in designs only: uploaded designs draw their own RSVP form and sections.
    ...(template?.archetype !== "uploaded" ? [{ title: "Entourage & motif", render: () => <EntourageFields content={content} onChange={onChange} /> }] : []),
    ...(template?.archetype !== "uploaded" ? [{ title: "RSVP questions", vis: "rsvp", render: () => <RsvpQuestionsFields content={content} onChange={onChange} premium={premium} onUpgrade={onUpgrade} /> }] : []),
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
            {canHide(group.vis) && !isShown(group.vis!) ? <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "var(--slate)" }}>Hidden</span> : null}
          </summary>
          <div style={{ padding: "4px 4px 20px" }}>
            {canHide(group.vis) ? (
              <ShowSection on={isShown(group.vis!)} onChange={(on) => onShowSection!(group.vis!, on)} warn={group.vis === "rsvp" ? "Guests won’t be able to reply." : undefined} />
            ) : null}
            {group.render()}
          </div>
        </details>
      ))}
    </div>
  );
}
