import type { ReactNode } from "react";
import type { EventContent } from "../content/types";
import type { StandardSection, TemplateDefinition } from "../engine/registry";
import type { SectionVisibility } from "../presentation/types";
import { FormField, inputStyle } from "./components/FormField";
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
import { DEFAULT_HIDEABLE } from "./pageEdit";

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
  /** A cover photo is set (counts as the photo essential). */
  hasCover?: boolean;
  /** The design's section order on the page (definition.sections keys, the host's order). */
  order?: string[];
}

/** One editor group: a row in the Details panel and the page it opens. */
export interface PanelGroup {
  id: string;
  title: string;
  /** Its SectionVisibility key, when the design can hide it. */
  vis?: string;
  shown: boolean;
  /** The row's one-line status ("3 people", "Empty"). */
  summary: string;
  empty: boolean;
  /** One of the essentials a site needs before it's shared, and whether it's done. */
  essential?: { done: boolean; next: string; hint: string };
  render: () => ReactNode;
}

interface Group {
  title: string;
  /** Hidden when the template doesn't use this section. */
  section?: StandardSection;
  /** Its SectionVisibility key: a hide/show eye when the design can hide it. */
  vis?: string;
  render: () => ReactNode;
  /** Where the preview scrolls when a field here is edited (usePreviewFollow's section words). */
  follow?: string;
  summary: string;
  empty: boolean;
  essential?: { done: boolean; next: string; hint: string };
}

// Sections whose editor group has its own hide/show (so a design's own fields for that
// section don't repeat it).
const OWN_SWITCH = ["hostIntro", "venue", "schedule", "accommodations", "travelInformation", "gallery", "registry", "faqs", "entourage", "rsvp"];

const count = (n: number, one: string, many = `${one}s`) => (n ? `${n} ${n === 1 ? one : many}` : "");
const shortDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** The Details panel's content groups, in page order (the design's section order where it has one). */
export function editorGroups({ content, onChange, eventId, template, premium = false, onUpgrade, visibility, onShowSection, hasCover, order }: ContentEditorProps): PanelGroup[] {
  const uses = template?.uses;
  const shows = (s: StandardSection) => !uses || uses.includes(s);
  const hideable = template?.hideable ?? DEFAULT_HIDEABLE;
  const canHide = (key?: string) => !!key && !!onShowSection && hideable.some((h) => h.key === key);
  const isShown = (key?: string) => !key || visibility?.[key] !== false;
  const names = content.hosts.map((h) => h.name.trim()).filter(Boolean);
  const photos = content.galleries.reduce((n, g) => n + g.items.filter((i) => i.image.masterUrl).length, 0);
  const story = (content.story ?? "").split(/\n\s*\n/).filter((p) => p.trim()).length;
  const where = content.primaryLocation.name || content.primaryLocation.addressLine;
  const gifts = [count(content.registryLinks.length, "link"), (content.cashGifts ?? []).map((g) => g.label).filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const ent = (content.entourage ?? []).filter((g) => g.people.length || g.title);
  const questions = (content.rsvpQuestions ?? []).length;
  const all: Group[] = [
    {
      title: shows("story") ? "Names & story" : "Names",
      follow: "hosts",
      vis: shows("story") ? "hostIntro" : undefined,
      summary: [names.join(" & "), story ? count(story, "paragraph") : ""].filter(Boolean).join(" · "),
      empty: !names.length,
      essential: { done: names.length > 0, next: "Add your names", hint: "They lead your site and every invite you send." },
      render: () => <HostsFields content={content} onChange={onChange} hideStory={!shows("story")} storyLabel={template?.storyLabel} storyHint={template?.storyHint} />,
    },
    ...(template?.customFields?.length
      ? [
          {
            title: `${template.label} details`,
            summary: "",
            empty: false,
            render: () => (
              <CustomFields
                fields={template.customFields!}
                content={content}
                onChange={onChange}
                sections={onShowSection ? hideable.filter((h) => !OWN_SWITCH.includes(h.key)) : []}
                visibility={visibility}
                onShowSection={onShowSection}
              />
            ),
          },
        ]
      : []),
    {
      title: "Date & venue",
      section: "dateVenue",
      vis: "venue",
      summary: [shortDate(content.eventDate), content.primaryLocation.name].filter(Boolean).join(" · "),
      empty: !content.eventDate && !where,
      essential: { done: !!content.eventDate && !!where, next: "Add the date and venue", hint: "Guests see these first, and get a map from the address." },
      render: () => <DateVenueFields content={content} onChange={onChange} />,
    },
    { title: "Schedule", section: "schedule", vis: "schedule", summary: count(content.schedule.length, "item"), empty: !content.schedule.length, render: () => <ScheduleFields content={content} onChange={onChange} /> },
    { title: "Where to stay", section: "accommodations", vis: "accommodations", summary: count(content.accommodations.length, "place"), empty: !content.accommodations.length, render: () => <AccommodationsFields content={content} onChange={onChange} /> },
    { title: "Getting there", section: "travel", vis: "travelInformation", summary: count(content.travelInformation.length, "note"), empty: !content.travelInformation.length, render: () => <TravelFields content={content} onChange={onChange} /> },
    {
      title: "Photos",
      section: "gallery",
      vis: "gallery",
      summary: count(photos, "photo"),
      empty: !photos,
      essential: { done: photos > 0 || !!hasCover, next: "Add a photo", hint: "One is enough to start. Drop it on the page, or add it here." },
      render: () => <GalleryFields content={content} onChange={onChange} eventId={eventId} limit={template?.galleryLimit} backs={template?.photoBacks} />,
    },
    { title: "Special people", section: "keyPeople", summary: count(content.keyPeople.length, "person", "people"), empty: !content.keyPeople.length, render: () => <KeyPeopleFields content={content} onChange={onChange} /> },
    { title: "Gifts", section: "registry", vis: "registry", summary: gifts, empty: !gifts, render: () => <RegistryFields content={content} onChange={onChange} eventId={eventId} /> },
    { title: "FAQs", section: "faqs", vis: "faqs", summary: count(content.faqs.length, "question"), empty: !content.faqs.length, render: () => <FaqFields content={content} onChange={onChange} /> },
    // Built-in designs only: uploaded designs draw their own RSVP form and sections.
    ...(template?.archetype !== "uploaded"
      ? [
          { title: "Entourage & motif", follow: "entourage", vis: "entourage", summary: [count(ent.length, "group"), count((content.motifColors ?? []).length, "colour")].filter(Boolean).join(" · "), empty: !ent.length && !(content.motifColors ?? []).length, render: () => <EntourageFields content={content} onChange={onChange} /> },
          {
            title: "RSVP",
            vis: "rsvp",
            follow: "rsvp",
            summary: [content.rsvpDeadline ? `Closes ${shortDate(content.rsvpDeadline)}` : "", count(questions, "question")].filter(Boolean).join(" · "),
            empty: !content.rsvpDeadline && !questions,
            essential: { done: !!content.rsvpDeadline, next: "Set when replies close", hint: "Guests see the date on the form. It closes the day after." },
            render: () => (
              <>
                <FormField label="Replies close on" hint="Guests see the date on the form. It closes the day after.">
                  <input type="date" style={inputStyle} value={content.rsvpDeadline ?? ""} max={content.eventDate ? content.eventDate.slice(0, 10) : undefined} onChange={(e) => onChange({ ...content, rsvpDeadline: e.target.value || undefined })} />
                </FormField>
                <RsvpQuestionsFields content={content} onChange={onChange} premium={premium} onUpgrade={onUpgrade} />
              </>
            ),
          },
        ]
      : []),
  ];
  // Page order: names first, RSVP last, the rest as the design (and the host) orders its sections.
  const rank = (g: Group) => {
    if (g.follow === "hosts") return -2;
    if (g.follow === "rsvp") return 999;
    const keys = order ?? [];
    const i = keys.findIndex((k) => k === g.vis || (k === "stay" && (g.vis === "accommodations" || g.vis === "travelInformation")) || (k === "hostIntro" && g.section === "keyPeople"));
    return i < 0 ? 500 : i + (g.section === "keyPeople" ? 0.5 : g.vis === "travelInformation" ? 0.1 : 0);
  };
  return all
    .filter((g) => !g.section || shows(g.section))
    .map((g, i) => ({ g, i }))
    .sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i)
    .map(({ g }) => ({
      id: g.follow ?? g.section ?? g.vis ?? "custom",
      title: g.title,
      vis: canHide(g.vis) ? g.vis : undefined,
      shown: isShown(canHide(g.vis) ? g.vis : undefined),
      summary: g.summary,
      empty: g.empty,
      essential: g.essential,
      render: g.render,
    }));
}

/**
 * Every group's fields as a page of the Details panel. All stay mounted (hidden when not
 * open): editing text on the page writes through these fields (usePreviewFollow), and each
 * page carries data-edit-section so the preview can follow it.
 */
export function PanelPages({ groups, page }: { groups: PanelGroup[]; page: string | null }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.id} data-panel-page={g.id} data-edit-section={g.id} hidden={page !== g.id}>
          {g.vis === "rsvp" && !g.shown ? <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8a5a00" }}>Hidden. Guests can’t reply until it’s back on.</p> : null}
          {g.render()}
        </div>
      ))}
    </>
  );
}

/** The groups one after another (the preview harness's simple editor). */
export default function ContentEditor(props: ContentEditorProps) {
  const groups = editorGroups(props);
  return (
    <div style={{ display: "grid", gap: 22 }}>
      {groups.map((g) => (
        <div key={g.id} data-edit-section={g.id}>
          <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{g.title}</p>
          {g.render()}
        </div>
      ))}
    </div>
  );
}
