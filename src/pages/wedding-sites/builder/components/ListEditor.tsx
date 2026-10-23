import { useEffect, useRef, useState, type ReactNode } from "react";
import { LISTS, usePageEdit, type ListKey } from "../pageEdit";
import "../builder.css";

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
  /** Empty: no add button (the section adds items its own way, e.g. uploading photos). */
  addLabel: string;
  emptyLabel?: string;
  /** Which content list this is (pageEdit's LISTS): how few it may have, whether it can be
   *  reordered, and how the "Removed … · Undo" message names an item. */
  list?: ListKey;
}

export function ListEditor<T>({ items, onChange, createItem, renderItem, addLabel, emptyLabel, list }: ListEditorProps<T>) {
  const edit = usePageEdit();
  const def = list ? LISTS[list] : undefined;
  const movable = def?.movable !== false;
  const removable = items.length > (def?.min ?? 0);
  function updateAt(index: number, patch: Partial<T>) {
    const next = items.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeAt(index: number) {
    // In the builder it's undoable (⌘Z, or Undo on the message), so no "are you sure?".
    if (!edit) {
      if (!window.confirm("Remove this? This can’t be undone.")) return;
    } else edit.checkpoint();
    const next = items.filter((_, i) => i !== index);
    const ordered = next.length > 0 && next.every((it) => typeof (it as { order?: unknown }).order === "number");
    onChange(ordered ? next.map((it, i) => ({ ...it, order: i })) : next);
    edit?.notify(`Removed ${def ? def.name(items[index] as never) : "it"}`);
  }

  function move(index: number, by: -1 | 1) {
    edit?.checkpoint();
    const to = index + by;
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    [next[index], next[to]] = [next[to], next[index]];
    // Lists whose items carry their own `order` (photos, FAQs): sites sort by it, so a move
    // has to renumber it too, or the site would put them straight back.
    const ordered = next.every((it) => typeof (it as { order?: unknown }).order === "number");
    onChange(ordered ? next.map((it, i) => ({ ...it, order: i })) : next);
  }

  function add() {
    edit?.checkpoint();
    onChange([...items, createItem()]);
  }

  return (
    <div>
      {items.length === 0 && emptyLabel ? (
        <p style={{ fontSize: 13, color: "var(--slate)", margin: "0 0 8px" }}>{emptyLabel}</p>
      ) : null}
      <div>
        {items.map((item, index) => (
          <div key={(item as { id?: string }).id ?? index} style={{ position: "relative", padding: "14px 0 2px", borderTop: index ? "1px solid var(--line)" : "none" }}>
            {(items.length > 1 && movable) || removable ? (
              <div className="rb-list-controls" style={{ position: "absolute", top: 8, right: -6, zIndex: 2, display: "flex", justifyContent: "flex-end" }}>
                <ItemMenu
                  up={items.length > 1 && movable && index > 0 ? () => move(index, -1) : undefined}
                  down={items.length > 1 && movable && index < items.length - 1 ? () => move(index, 1) : undefined}
                  remove={removable ? () => removeAt(index) : undefined}
                />
              </div>
            ) : null}
            <div style={{ paddingRight: 28 }}>{renderItem(item, (patch) => updateAt(index, patch), index)}</div>
          </div>
        ))}
      </div>
      {addLabel ? (
        <button type="button" className="rb-tap44 dp-text-btn" onClick={add}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

/** ⋯ for one item: Move up, Move down, Remove. */
function ItemMenu({ up, down, remove }: { up?: () => void; down?: () => void; remove?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const pick = (f?: () => void) => () => {
    setOpen(false);
    f?.();
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="rb-list-btn" aria-label="More" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ width: 30, height: 30, display: "grid", placeItems: "center", border: 0, borderRadius: 8, background: open ? "var(--paper)" : "transparent", color: "var(--slate)", cursor: "pointer" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="19" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20, width: 168, padding: 4, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 12px 30px -12px rgba(0,7,39,.28)" }}>
          {up ? (
            <button type="button" role="menuitem" className="dp-menu-item" onClick={pick(up)}>
              Move up
            </button>
          ) : null}
          {down ? (
            <button type="button" role="menuitem" className="dp-menu-item" onClick={pick(down)}>
              Move down
            </button>
          ) : null}
          {remove ? (
            <button type="button" role="menuitem" className="dp-menu-item" onClick={pick(remove)} style={{ color: "#a3311f" }}>
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
