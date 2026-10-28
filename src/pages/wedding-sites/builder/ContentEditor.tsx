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

// Where a design's own field goes in the Details panel when it doesn't say (field.section):
// with the part of the page it's on, so a host finds it beside what it describes.
const HOME: Record<string, string> = {};
for (const k of "heroLine names honoree milestone ageLine invitation parentsLine monogram metal number masthead coverHeadline issueLine coverInk kicker headline occasionLine introButton archText introLine sealText openText heroZh hostZh1 hostZh2 familiesZh familiesLine flagInitials leadIn insideKicker skipText heroKicker babyEvent heroName parents".split(" ")) HOME[k] = "hosts";
for (const k of "receptionName receptionAddress receptionTime receptionMap meetLine placeLine note boardingTime departTime returnTime nightTitle ceremonyLabel lauriatLabel courtLabel format skillNote countdownLine".split(" ")) HOME[k] = "dateVenue";
for (const k of "replyButton rsvpTitle rsvpButton rsvpNote thankYou afterParty closing".split(" ")) HOME[k] = "rsvp";
HOME.picturesLine = "gallery";
HOME.stayLine = "accommodations";
// The RSVP page's own wording, in the order a guest meets it.
const RSVP_ORDER = (k: string) => {
  const i = ["rsvpTitle", "rsvpNote", "rsvpButton", "thankYou", "replyButton", "afterParty", "closing"].indexOf(k);
  return i < 0 ? 50 : i;
};
// A field's section key → the standard group it joins (anything else is a section of the design's own).
const STD_HOME: Record<string, string> = { hosts: "hosts", hostIntro: "hosts", venue: "dateVenue", dateVenue: "dateVenue", schedule: "schedule", accommodations: "accommodations", travelInformation: "travel", travel: "travel", gallery: "gallery", keyPeople: "keyPeople", registry: "registry", faqs: "faqs", entourage: "entourage", rsvp: "rsvp" };

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
  // The design's own fields, each with the part of the page it belongs to.
  const fields = template?.customFields ?? [];
  const homeOf = (f: { key: string; section?: string }) => f.section ?? HOME[f.key] ?? "hosts";
  // a section's headings first (fields tagged for it), then the rest in the design's order
  const fieldsFor = (home: string) =>
    fields
      .filter((f) => (STD_HOME[homeOf(f)] ?? homeOf(f)) === home)
      .sort((a, b) => Number(!a.section) - Number(!b.section) || (home === "rsvp" ? RSVP_ORDER(a.key) - RSVP_ORDER(b.key) : 0));
  const extra = (home: string) => {
    const own = fieldsFor(home);
    return own.length ? <CustomFields fields={own} content={content} onChange={onChange} /> : null;
  };
  const withExtra = (home: string, main: ReactNode, first = false) => {
    const own = extra(home);
    if (!own) return main;
    const sep = <div style={{ height: 1, background: "var(--line)", margin: "18px 0 14px" }} />;
    return first ? (
      <>
        {own}
        {sep}
        {main}
      </>
    ) : (
      <>
        {main}
        {sep}
        {own}
      </>
    );
  };
  // A group's title: what the design calls that part of the page ("The evening (schedule and
  // pier)"), else the general name.
  const own = template?.hideable;
  const named = (key: string | undefined, general: string) => (key && own?.find((h) => h.key === key)?.label) || general;
  const storyName = template?.storyLabel?.trim();
  const all: Group[] = [
    {
      title: shows("story") ? `Names & ${(storyName || "story").replace(/^(Your|Our|A|The) /i, "").toLowerCase()}` : "Names",
      follow: "hosts",
      vis: shows("story") ? "hostIntro" : undefined,
      summary: [names.join(" & "), story ? count(story, "paragraph") : ""].filter(Boolean).join(" · "),
      empty: !names.length,
      essential: { done: names.length > 0, next: "Add your names", hint: "They lead your site and every invite you send." },
      render: () => withExtra("hosts", <HostsFields content={content} onChange={onChange} hideStory={!shows("story")} storyLabel={template?.storyLabel} storyHint={template?.storyHint} />),
    },
    {
      title: "Date & venue",
      section: "dateVenue",
      vis: "venue",
      summary: [shortDate(content.eventDate), content.primaryLocation.name].filter(Boolean).join(" · "),
      empty: !content.eventDate && !where,
      essential: { done: !!content.eventDate && !!where, next: "Add the date and venue", hint: "Guests see these first, and get a map from the address." },
      render: () => withExtra("dateVenue", <DateVenueFields content={content} onChange={onChange} />),
    },
    { title: named("schedule", "Schedule"), section: "schedule", vis: "schedule", summary: count(content.schedule.length, "item"), empty: !content.schedule.length, render: () => withExtra("schedule", <ScheduleFields content={content} onChange={onChange} />, true) },
    { title: named("accommodations", "Where to stay"), section: "accommodations", vis: "accommodations", summary: count(content.accommodations.length, "place"), empty: !content.accommodations.length, render: () => withExtra("accommodations", <AccommodationsFields content={content} onChange={onChange} />, true) },
    { title: named("travelInformation", "Getting there"), section: "travel", vis: "travelInformation", summary: count(content.travelInformation.length, "note"), empty: !content.travelInformation.length, render: () => withExtra("travel", <TravelFields content={content} onChange={onChange} />, true) },
    {
      title: named("gallery", "Photos"),
      section: "gallery",
      vis: "gallery",
      summary: count(photos, "photo"),
      empty: !photos,
      essential: { done: photos > 0 || !!hasCover, next: "Add a photo", hint: "One is enough to start. Drop it on the page, or add it here." },
      render: () => withExtra("gallery", <GalleryFields content={content} onChange={onChange} eventId={eventId} limit={template?.galleryLimit} backs={template?.photoBacks} />, true),
    },
    { title: "Special people", section: "keyPeople", summary: count(content.keyPeople.length, "person", "people"), empty: !content.keyPeople.length, render: () => withExtra("keyPeople", <KeyPeopleFields content={content} onChange={onChange} />, true) },
    { title: named("registry", "Gifts"), section: "registry", vis: "registry", summary: gifts, empty: !gifts, render: () => withExtra("registry", <RegistryFields content={content} onChange={onChange} eventId={eventId} />, true) },
    { title: named("faqs", "FAQs"), section: "faqs", vis: "faqs", summary: count(content.faqs.length, "question"), empty: !content.faqs.length, render: () => withExtra("faqs", <FaqFields content={content} onChange={onChange} />, true) },
    // Built-in designs only: uploaded designs draw their own RSVP form and sections.
    ...(template?.archetype !== "uploaded" && template?.entourage !== false
      ? [
          { title: named("entourage", "Entourage & motif"), follow: "entourage", vis: "entourage", summary: [count(ent.length, "group"), count((content.motifColors ?? []).length, "colour")].filter(Boolean).join(" · "), empty: !ent.length && !(content.motifColors ?? []).length, render: () => withExtra("entourage", <EntourageFields content={content} onChange={onChange} />, true) },
        ]
      : []),
    ...(template?.archetype !== "uploaded"
      ? [
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
                {extra("rsvp") ? (
                  <>
                    <div style={{ height: 1, background: "var(--line)", margin: "18px 0 14px" }} />
                    {extra("rsvp")}
                  </>
                ) : null}
              </>
            ),
          },
        ]
      : []),
  ];
  const ownKeys = [...new Set(fields.map(homeOf).filter((k) => !STD_HOME[k]))].sort((a, b) => {
    const i = (k: string) => (own ?? []).findIndex((h) => h.key === k);
    return (i(a) < 0 ? 999 : i(a)) - (i(b) < 0 ? 999 : i(b));
  });
  for (const key of ownKeys) {
    const fs = fieldsFor(key);
    const filled = fs.map((f) => content.custom?.[f.key]?.trim()).filter(Boolean) as string[];
    all.push({
      title: named(key, fs[0]?.label ?? key),
      vis: key,
      follow: key,
      summary: filled[0] ? (filled[0].length > 40 ? `${filled[0].slice(0, 40)}…` : filled[0]) : "",
      empty: !filled.length,
      render: () => <CustomFields fields={fs} content={content} onChange={onChange} />,
    });
  }
  // Page order: names first, RSVP last, the rest as the design (and the host) orders its sections.
  const rank = (g: Group) => {
    if (g.follow === "hosts") return -2;
    if (g.follow === "rsvp") return 999;
    const keys = order?.length ? order : (own ?? []).map((h) => h.key);
    const i = keys.findIndex((k) => k === g.vis || (k === "stay" && (g.vis === "accommodations" || g.vis === "travelInformation")) || (k === "hostIntro" && g.section === "keyPeople"));
    if (i < 0) return g.section === "dateVenue" ? -1 : 500;
    return i + (g.section === "keyPeople" ? 0.5 : g.vis === "travelInformation" ? 0.1 : 0);
  };
  return all
    // a section the design doesn't use, unless it has the design's own fields
    .filter((g) => !g.section || shows(g.section) || fieldsFor(g.section === "dateVenue" ? "dateVenue" : g.section).length > 0)
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
