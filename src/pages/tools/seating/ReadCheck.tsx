import type { ParseResult } from "./parse";

// "Here's what we read": what the reader made of a pasted list, before it goes on the plan.
// Nobody needs to know a format; they check this instead. Lines it wasn't sure about and
// guests it left out (they said no) come first, then every group with its households.

/** The two notes: lines to check, and who was left out. Shared with Add guests. */
export function ReadNotes({ parsed, className = "" }: { parsed: ParseResult; className?: string }) {
  if (!parsed.unsure.length && !parsed.skipped.length) return null;
  return (
    <div className={`grid gap-2 ${className}`}>
      {parsed.unsure.length ? (
        <div className="rounded-xl bg-[#fff4dc] px-4 py-3 text-[14px] text-[var(--ink)]">
          <p className="font-medium">
            Check {parsed.unsure.length === 1 ? "this line" : `these ${parsed.unsure.length} lines`}
          </p>
          <ul className="mt-1 grid gap-1 text-[13.5px] text-[var(--slate)]">
            {parsed.unsure.slice(0, 8).map((u, i) => (
              <li key={i}>
                <span className="text-[var(--ink)]">{u.line}</span>: {u.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {parsed.skipped.length ? (
        <div className="rounded-xl bg-[var(--paper)] px-4 py-3 text-[14px] text-[var(--ink)]">
          <p className="font-medium">
            Left out: {parsed.skipped.length}{" "}
            {parsed.skipped.every((x) => /replied/.test(x.reason)) ? (parsed.skipped.length === 1 ? "household replied they can’t come" : "households replied they can’t come") : parsed.skipped.length === 1 ? "line says they’re not coming" : "lines say they’re not coming"}
          </p>
          <p className="mt-1 text-[13.5px] text-[var(--slate)]">{parsed.skipped.slice(0, 12).map((s) => s.line).join(" · ")}</p>
        </div>
      ) : null}
    </div>
  );
}

/** A household as a short line: "Villanueva family · 1 … · 6" → "Villanueva family (6)",
 *  "Mendoza kid 1 … 3" → "Mendoza kids (3)", "Guest of Carla 1, 2" → "Guests of Carla (2)". */
function shortList(people: string[]) {
  const out: string[] = [];
  const counts = new Map<string, number>();
  for (const name of people) {
    const m = name.match(/^(.+?)(?: ·)? (\d+)$/);
    if (!m) {
      out.push(name);
      continue;
    }
    const base = m[1].replace(/\bkid$/, "kids").replace(/^Guest of /, "Guests of ");
    if (!counts.has(base)) out.push(base);
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  return out.map((x) => (counts.has(x) ? `${x} (${counts.get(x)})` : x)).join(", ");
}

/** Every group with its households, as the reader understood them. */
export function ReadList({ parsed, maxHeight = "44vh" }: { parsed: ParseResult; maxHeight?: string }) {
  const byGroup = new Map<string, ParseResult["parties"]>();
  for (const p of parsed.parties) {
    const k = p.group ?? "";
    byGroup.set(k, [...(byGroup.get(k) ?? []), p]);
  }
  const groups = [...byGroup.entries()];
  const count = (ps: ParseResult["parties"]) => ps.reduce((n, p) => n + p.people.length, 0);
  return (
    <div className="overflow-y-auto rounded-xl border border-[var(--line)] bg-white" style={{ maxHeight }} data-lenis-prevent>
      {groups.map(([name, parties]) => (
        <details key={name || "none"} open={groups.length <= 3} className="group border-b border-[var(--line)] last:border-b-0">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-[14px] font-medium text-[var(--ink)] [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 truncate">{name || "No group"}</span>
            <span className="flex shrink-0 items-center gap-2 font-normal text-[var(--slate)]">
              {count(parties)}
              <i className="ri-arrow-down-s-line text-[18px] transition-transform group-open:rotate-180" aria-hidden />
            </span>
          </summary>
          <ul className="grid gap-1.5 px-4 pb-3 text-[13.5px] leading-snug text-[var(--slate)]">
            {parties.map((p, i) => (
              <li key={i}>
                <span className="text-[var(--ink)]">{shortList(p.people)}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
