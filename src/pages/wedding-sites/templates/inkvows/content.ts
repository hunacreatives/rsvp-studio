// Ink and vows keeps Letterpress's wording (the date and the hour written out in words, the
// program in figures), the entourage grouped as Capiz does, the story in paragraphs.
export { coupleNames, dateWords, eventIsOver, initialsOf, nameParts, timeOf, timeWords, townOf } from "../letterpress/content";
export { splitEntourage, type EntRow } from "../capiz/content";

/** The story's paragraphs. */
export function paragraphs(story: string | undefined): string[] {
  return (story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/** "02": the section's number on the page. */
export const folio = (n: number) => String(n).padStart(2, "0");
