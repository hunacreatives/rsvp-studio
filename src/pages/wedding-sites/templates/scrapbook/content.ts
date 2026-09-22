import type { EventContent, GalleryItem, ImageAsset, Location } from "../../content/types";

/**
 * Named photo slots for the collages.
 *
 * Assignment happens once, here, in a fixed priority order — call sites
 * ask for `slots.hero` rather than `galleries[0].items[3]`, so no section
 * is bound to a fragile array index. Master images are never modified;
 * cropping is left to CSS object-fit + each asset's own focalPoint.
 */
export interface PhotoSlots {
  hero?: ImageAsset;
  venue?: ImageAsset;
  storyA?: ImageAsset;
  storyB?: ImageAsset;
  travel?: ImageAsset;
  final?: ImageAsset;
  /** Second photo in the details collage — last in priority, so it only
   *  fills once every section that needs a photo already has one. */
  venueSecondary?: ImageAsset;
  /** Anything left over, for the optional gallery section. */
  overflow: GalleryItem[];
}

const SLOT_ORDER = ["hero", "venue", "storyA", "storyB", "travel", "final", "venueSecondary"] as const;

export function resolvePhotoSlots(content: EventContent, explicitHero?: ImageAsset): PhotoSlots {
  const items = content.galleries
    .flatMap((g) => g.items)
    .slice()
    .sort((a, b) => a.order - b.order);

  const slots: PhotoSlots = { overflow: [] };

  // Hero priority: an explicitly chosen hero image wins, and then it
  // does NOT also consume a gallery photo — the gallery flows into the
  // remaining slots instead.
  const order = explicitHero ? SLOT_ORDER.filter((k) => k !== "hero") : SLOT_ORDER;
  if (explicitHero) slots.hero = explicitHero;

  items.forEach((item, index) => {
    const key = order[index];
    if (key) slots[key] = item.image;
    else slots.overflow.push(item);
  });
  return slots;
}

/**
 * The town/city for lines like "getting married … in ___".
 *
 * Deliberately derived from the address, NOT from `primaryLocation.name`
 * — that field is the VENUE name ("The Wildflower Barn"), and falling
 * back to it produced nonsense like "getting married … in Francis" when
 * a host name had been typed into the venue field. If no locality can be
 * read from the address we return null and callers drop the clause
 * entirely rather than substituting something semantically wrong.
 */
export function deriveLocality(location: Location): string | null {
  const address = location.addressLine?.trim();
  if (!address) return null;

  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 3) return parts[parts.length - 2] || null; // "street, city, region"
  if (parts.length === 2) return parts[1] || null; // "street, city"
  return null; // a single unstructured line — don't guess
}

/** Street line vs town, so the venue card can set them as a hierarchy
 *  instead of dumping one long address string. */
export function splitAddress(location: Location): { street: string | null; locality: string | null } {
  const address = location.addressLine?.trim();
  const locality = deriveLocality(location);
  if (!address) return { street: null, locality };
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const street = parts.length >= 2 ? parts[0] : null;
  return { street, locality };
}

export function hasLocation(location: Location): boolean {
  return Boolean(location.name?.trim() || location.addressLine?.trim());
}

export function formatLongDate(iso: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function formatTime(iso: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const hasClockTime = iso.includes("T") && !(date.getHours() === 0 && date.getMinutes() === 0);
  return hasClockTime ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;
}

export function hostNames(content: EventContent): string[] {
  return content.hosts.map((h) => h.name.trim()).filter(Boolean);
}

/** "Alex and Jordan" for two hosts, "Alex, Jordan and Sam" for more. */
export function joinHosts(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function monogram(names: string[]): string {
  return names
    .map((n) => n.charAt(0).toUpperCase())
    .filter(Boolean)
    .join(" ");
}
