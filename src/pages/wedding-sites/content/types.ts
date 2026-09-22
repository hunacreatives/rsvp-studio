// Canonical, template-independent EVENT content model — generic across
// event types (wedding, birthday, anniversary, or anything else RSVP
// Studio builds an evite/event site for). Nothing here is wedding-specific
// on purpose: `hosts` is a list, not a fixed "couple" pair, and there is
// no hardcoded vocabulary like "wedding party" anywhere.
//
// Rule of thumb enforced throughout this file: model semantic entities
// (Host, ScheduleItem, Gallery, ...), never page-shaped fields (no
// `heroLeftText`, `sectionThreeImage`, etc.). Templates decide how to
// arrange and style this data; this file only decides what the data *is*.
//
// See docs/template-builder-decisions.md for why specific shapes were
// chosen (e.g. why Gallery is an ordered item list, why ImageAsset has no
// baked-in aspect ratio, why `story` is one rich field, why `hosts` is a
// list rather than a fixed pair).

export interface ImageAsset {
  id: string;
  masterUrl: string;
  width: number;
  height: number;
  alt: string;
  /** Normalized 0..1 focal point. Templates derive their own crop via
   *  CSS object-position from this — never store a destructive crop. */
  focalPoint: { x: number; y: number };
  createdAt: string; // ISO datetime
}

export interface Person {
  id: string;
  name: string;
  /** Free text on purpose — e.g. "Maid of Honor", "Best Woman", "Mom of
   *  the Birthday Girl". An enum would force a fixed vocabulary that
   *  doesn't fit every kind of event. */
  role?: string;
  photo?: ImageAsset;
  note?: string;
}

export interface Location {
  id: string;
  name: string;
  addressLine: string;
  mapUrl?: string;
  photo?: ImageAsset;
}

export interface ScheduleItem {
  id: string;
  startTime: string; // ISO datetime
  endTime?: string;
  /** Free text on purpose — e.g. "Ceremony", "Cocktail Hour", "Cake Cutting". */
  label: string;
  location?: Location;
  description?: string;
}

export interface Accommodation {
  id: string;
  name: string;
  addressLine: string;
  mapUrl?: string;
  bookingUrl?: string;
  notes?: string;
}

export interface TravelInformation {
  id: string;
  title: string;
  /** Travel info is inherently prose — kept as one freeform field rather
   *  than forced into structured sub-fields. */
  body: string;
}

export interface RegistryLink {
  id: string;
  storeName: string;
  url: string;
  logoUrl?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  /** Explicit order field (not array-index-implied) so a future builder
   *  UI can reorder via a data edit, not a re-serialize. */
  order: number;
}

/**
 * Gallery is an ORDERED list of items with per-item metadata — not a flat
 * unordered array. An editorial/botanical template needs sequencing and a
 * per-image role (which pairs of photos sit together, which one is meant
 * to be "wide"); a flat array can't recover that intent later without a
 * breaking reshape.
 */
export interface GalleryItem {
  id: string;
  image: ImageAsset;
  caption?: string;
  order: number;
  /** Optional hint only. A template MAY use this to decide pairing/
   *  emphasis; a simpler template is free to ignore it entirely and
   *  render a uniform grid. Never required. */
  layoutHint?: "wide" | "portrait" | "standard";
}

export interface Gallery {
  id: string;
  title?: string;
  /** Ordered by `order`. */
  items: GalleryItem[];
}

export interface EventContent {
  id: string;
  /** Used to build the public URL: /invite/:slug */
  slug: string;
  /**
   * Who the event is for/hosted by — a LIST, not a fixed pair. Works for
   * a couple (2 hosts), a single birthday honoree (1 host), joint
   * siblings' birthdays (3+ hosts), etc. See Decision log for why this
   * replaced an earlier wedding-specific "Couple" shape.
   */
  hosts: Person[];
  eventDate: string; // ISO date
  /**
   * ONE rich free-text field, not discrete `howWeMet`/`proposal`-style
   * fields — an editorial decision the host(s) make in their own voice,
   * not a layout decision. Paragraphs are separated by a blank line
   * ("\n\n"). Works equally for a couple's love story or a birthday
   * honoree's life story.
   *
   * Reversible later: if a template genuinely needs discrete sections,
   * add an ADDITIVE optional `storySections?: { heading: string; body:
   * string }[]` field; templates that don't use it keep reading `story`.
   */
  story?: string;
  /** The main venue, used for hero/at-a-glance display. */
  primaryLocation: Location;
  /** Ordered by startTime. */
  schedule: ScheduleItem[];
  accommodations: Accommodation[];
  travelInformation: TravelInformation[];
  /** Usually one gallery, modeled as an array so an event can have e.g.
   *  a "Getting Ready" gallery and a separate "The Big Day" gallery later. */
  galleries: Gallery[];
  registryLinks: RegistryLink[];
  /** Ordered by `order`. */
  faqs: FAQ[];
  /** Other notable people tied to the event (e.g. a wedding party, a
   *  birthday honoree's closest friends) — generic and optional; some
   *  templates and event types omit this section entirely. */
  keyPeople: Person[];
  /** Mirrors the existing events.table_name convention: the name of this
   *  event's dynamically-provisioned RSVP table in Supabase. */
  rsvpTableName: string;
}
