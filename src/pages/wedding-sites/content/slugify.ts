/** Shared between useEventSiteDraft and useCreateEvent — both need to turn
 *  a display name into a URL-safe slug for /invite/:slug. */
export function slugify(input: string, fallback = "event"): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}
