import type { Location } from "../../content/types";

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
