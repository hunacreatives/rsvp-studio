import type { PanelGroup } from "../ContentEditor";
import { essentialProgress } from "../DetailsPanel";

// The page's next step, above the preview: until a draft is published, a new host always sees
// what's left (the same essentials as the Details panel's guided list) and one button for it.
// Shown only where that list is out of sight — phones on the Page tab, desktop with the panel
// closed — so the progress is never on screen twice.
export default function NextStepBar({
  groups,
  published,
  onStart,
  wide = false,
}: {
  groups: PanelGroup[];
  published: boolean;
  /** Open this essential's page with its first empty field focused. */
  onStart: (groupId: string) => void;
  /** Desktop: the row's content sits in a centred column. */
  wide?: boolean;
}) {
  const { done, total, next } = essentialProgress(groups);
  if (published || total === 0) return null;
  const ready = !next;

  return (
    <div role="region" aria-label="Next step" style={{ flexShrink: 0, background: "#fff", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: wide ? 720 : undefined, margin: "0 auto", padding: wide ? "10px 20px" : "10px 12px 10px 16px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden style={{ display: "inline-flex", gap: 3 }}>
              {Array.from({ length: total }, (_, i) => (
                <span key={i} style={{ width: 14, height: 4, borderRadius: 2, background: i < done ? "var(--ink)" : "var(--line)", transition: "background .24s ease" }} />
              ))}
            </span>
            <span style={{ fontSize: 12, color: "var(--slate)", whiteSpace: "nowrap" }}>{ready ? `All ${total} done` : `${done} of ${total} done`}</span>
          </div>
          <p aria-live="polite" style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ready ? (
              <>
                Ready to share. <span style={{ fontWeight: 400, color: "var(--slate)" }}>Publish when you are.</span>
              </>
            ) : (
              next.essential!.next
            )}
          </p>
        </div>
        {/* Ready: Publish is the header's button, right above — not a second one here. */}
        {!ready ? (
          <button
            type="button"
            onClick={() => onStart(next.id)}
            style={{ flexShrink: 0, minHeight: 40, padding: "0 18px", border: 0, borderRadius: 999, background: "var(--ink)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Start
          </button>
        ) : null}
      </div>
    </div>
  );
}
