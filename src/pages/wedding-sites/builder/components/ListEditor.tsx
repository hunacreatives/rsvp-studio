import type { ReactNode } from "react";

// Generic add/remove list editor, shared across every repeatable content
// section (schedule, accommodations, travel info, gallery items, registry
// links, FAQs, wedding party). This is BUILDER UI structural logic, not
// template visual code — sharing it here doesn't conflict with the
// "templates own their own visuals" rule, which only applies to the
// couple-facing rendered site, not the internal editor.

interface ListEditorProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  addLabel: string;
  emptyLabel?: string;
}

export function ListEditor<T>({ items, onChange, createItem, renderItem, addLabel, emptyLabel }: ListEditorProps<T>) {
  function updateAt(index: number, patch: Partial<T>) {
    const next = items.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeAt(index: number) {
    if (!window.confirm("Remove this? This can’t be undone.")) return;
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, by: -1 | 1) {
    const to = index + by;
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  }

  function add() {
    onChange([...items, createItem()]);
  }

  return (
    <div>
      {items.length === 0 && emptyLabel ? (
        <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 12 }}>{emptyLabel}</p>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 16,
              position: "relative",
              background: "#fff",
            }}
          >
            <div style={{ position: "absolute", top: 8, right: 10, display: "flex", gap: 6, alignItems: "center" }}>
              {items.length > 1 ? (
                <>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up" title="Move up" style={iconBtn(index === 0)}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Move down" title="Move down" style={iconBtn(index === items.length - 1)}>
                    ↓
                  </button>
                </>
              ) : null}
              <button type="button" onClick={() => removeAt(index)} aria-label="Remove" style={{ ...iconBtn(false), fontSize: 13 }}>
                Remove
              </button>
            </div>
            {renderItem(item, (patch) => updateAt(index, patch), index)}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        style={{
          marginTop: 12,
          border: "1px dashed var(--line)",
          borderRadius: 8,
          padding: "10px 16px",
          background: "transparent",
          color: "var(--ink)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        + {addLabel}
      </button>
    </div>
  );
}

function iconBtn(disabled: boolean): React.CSSProperties {
  return { border: "none", background: "transparent", color: "var(--slate)", cursor: disabled ? "default" : "pointer", fontSize: 15, opacity: disabled ? 0.3 : 1, padding: "2px 4px" };
}
