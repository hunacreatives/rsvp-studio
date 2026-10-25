import type { Issue } from "./check";

// The plan check in the guest panel (check.ts): what to look at before printing, each with
// its fix and a way to see the tables on the plan. Shown under Seat everyone's summary, and
// any time from "· 3 to check" beside the seated count.

/** `bare`: no heading (the chip above it already says how many). */
export default function PlanCheck({ issues, onFix, onShow, max = 6, bare = false }: { issues: Issue[]; onFix(i: Issue): void; onShow(i: Issue): void; max?: number; bare?: boolean }) {
  if (!issues.length)
    return (
      <div className="sp-check ok">
        <b>Ready to print</b>
        <p>Everyone has a seat, households are together and nobody is sitting with strangers.</p>
      </div>
    );
  const shown = issues.slice(0, max);
  return (
    <div className={`sp-check${bare ? " bare" : ""}`}>
      {bare ? null : <b>{issues.some((i) => i.level === "fix") ? (issues.length === 1 ? "1 thing to look at" : `${issues.length} things to look at`) : issues.length === 1 ? "One suggestion" : `${issues.length} suggestions`}</b>}
      <ul>
        {shown.map((i) => (
          <li key={i.id} className={i.level}>
            <span>{i.text}</span>
            <span className="acts">
              {i.fix ? (
                <button className="sp-link" onClick={() => onFix(i)}>
                  {i.fix.label}
                </button>
              ) : null}
              {i.tableIds.length ? (
                <button className="sp-link soft" onClick={() => onShow(i)}>
                  Show
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {issues.length > shown.length ? <p>And {issues.length - shown.length} more. Fix these first and the list updates.</p> : null}
    </div>
  );
}
