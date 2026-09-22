import type {
  Accommodation,
  EventContent,
  FAQ,
  Gallery,
  GalleryItem,
  ImageAsset,
  Location,
  Person,
  RegistryLink,
  ScheduleItem,
  TravelInformation,
} from "./types";

// Defensive runtime normalization for EventContent.
//
// No schema-validation library (zod/yup) is used here on purpose — see
// docs/template-builder-decisions.md. This is a hand-written boundary
// function used only where untrusted/partial data crosses into the render
// path: loading fixture JSON and reading a row back from Supabase. Every
// field gets a safe default so a template component never has to guard
// against `undefined` arrays itself.

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray<T>(value: unknown): unknown[] {
  return Array.isArray(value) ? (value as unknown[]) : ([] as T[]);
}

function normalizeImageAsset(raw: unknown): ImageAsset | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const focal = (r.focalPoint as Record<string, unknown>) ?? {};
  return {
    id: asString(r.id),
    masterUrl: asString(r.masterUrl),
    width: asNumber(r.width),
    height: asNumber(r.height),
    alt: asString(r.alt),
    focalPoint: { x: asNumber(focal.x, 0.5), y: asNumber(focal.y, 0.5) },
    createdAt: asString(r.createdAt, new Date(0).toISOString()),
  };
}

function normalizePerson(raw: unknown): Person {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: asString(r.id),
    name: asString(r.name),
    role: asOptionalString(r.role),
    photo: normalizeImageAsset(r.photo),
    note: asOptionalString(r.note),
  };
}

function normalizeLocation(raw: unknown): Location {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: asString(r.id),
    name: asString(r.name),
    addressLine: asString(r.addressLine),
    mapUrl: asOptionalString(r.mapUrl),
    photo: normalizeImageAsset(r.photo),
  };
}

function normalizeScheduleItem(raw: unknown): ScheduleItem {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: asString(r.id),
    startTime: asString(r.startTime),
    endTime: asOptionalString(r.endTime),
    label: asString(r.label),
    location: r.location ? normalizeLocation(r.location) : undefined,
    description: asOptionalString(r.description),
  };
}

function normalizeAccommodation(raw: unknown): Accommodation {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: asString(r.id),
    name: asString(r.name),
    addressLine: asString(r.addressLine),
    mapUrl: asOptionalString(r.mapUrl),
    bookingUrl: asOptionalString(r.bookingUrl),
    notes: asOptionalString(r.notes),
  };
}

function normalizeTravelInformation(raw: unknown): TravelInformation {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: asString(r.id),
    title: asString(r.title),
    body: asString(r.body),
  };
}

function normalizeRegistryLink(raw: unknown): RegistryLink {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: asString(r.id),
    storeName: asString(r.storeName),
    url: asString(r.url),
    logoUrl: asOptionalString(r.logoUrl),
  };
}

function normalizeFAQ(raw: unknown, index: number): FAQ {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: asString(r.id),
    question: asString(r.question),
    answer: asString(r.answer),
    order: asNumber(r.order, index),
  };
}

function normalizeGalleryItem(raw: unknown, index: number): GalleryItem | undefined {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const image = normalizeImageAsset(r.image);
  if (!image) return undefined;
  const layoutHint = r.layoutHint;
  return {
    id: asString(r.id),
    image,
    caption: asOptionalString(r.caption),
    order: asNumber(r.order, index),
    layoutHint:
      layoutHint === "wide" || layoutHint === "portrait" || layoutHint === "standard"
        ? layoutHint
        : undefined,
  };
}

function normalizeGallery(raw: unknown): Gallery {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const items = asArray<unknown>(r.items)
    .map((item, index) => normalizeGalleryItem(item, index))
    .filter((item): item is GalleryItem => Boolean(item))
    .sort((a, b) => a.order - b.order);
  return {
    id: asString(r.id),
    title: asOptionalString(r.title),
    items,
  };
}

/**
 * Normalize an arbitrary, possibly-partial value into a fully-defaulted
 * EventContent. Never throws — a template component can always safely map
 * over every array field without an existence check.
 */
export function normalizeEventContent(raw: unknown): EventContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const schedule = asArray<unknown>(r.schedule)
    .map(normalizeScheduleItem)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const faqs = asArray<unknown>(r.faqs)
    .map((item, index) => normalizeFAQ(item, index))
    .sort((a, b) => a.order - b.order);

  return {
    id: asString(r.id),
    slug: asString(r.slug),
    hosts: asArray<unknown>(r.hosts).map(normalizePerson),
    eventDate: asString(r.eventDate),
    story: asOptionalString(r.story),
    primaryLocation: normalizeLocation(r.primaryLocation),
    schedule,
    accommodations: asArray<unknown>(r.accommodations).map(normalizeAccommodation),
    travelInformation: asArray<unknown>(r.travelInformation).map(normalizeTravelInformation),
    galleries: asArray<unknown>(r.galleries).map(normalizeGallery),
    registryLinks: asArray<unknown>(r.registryLinks).map(normalizeRegistryLink),
    faqs,
    keyPeople: asArray<unknown>(r.keyPeople).map(normalizePerson),
    rsvpTableName: asString(r.rsvpTableName),
  };
}
