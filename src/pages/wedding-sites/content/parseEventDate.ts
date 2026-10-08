/**
 * Parse an event date/time from EventContent.
 *
 * `new Date("2026-12-12")` is midnight UTC, which renders as Dec 11 for
 * anyone west of UTC. A date-only value is a calendar day, not an
 * instant, so it's built as a local date instead. Values with a time
 * ("2026-12-12T15:00") are already parsed as local time by the engine.
 */
export function parseEventDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}
