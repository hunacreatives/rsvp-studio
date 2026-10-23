import { useEffect, useRef, useState, type CSSProperties, type Dispatch, type RefObject, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import type { EventContent } from "../../content/types";
import type { TemplateDefinition } from "../../engine/registry";
import { inOrder } from "../../templates/shared/siteEdit";
import { LISTS, moveItem, removeItem, usePageEdit, type ListKey } from "../pageEdit";

// Sections and list items edited on the page. Hover (tap, on a phone) a section the design
// marks (siteEdit().section) for a small bar at its top right: its name, ↑ ↓ to move it, Hide.
// Hover an item of a list (siteEdit().list/item) for ↑ ↓ (← → when the items sit side by
// side) and × to remove it. Everything goes through pageEdit, so it's undoable, and removing
// says "Removed … · Undo". Nothing here exists on the published site.

type Hit = { el: HTMLElement; key: string; vis: string[] };
type ItemHit = { el: HTMLElement; list: ListKey; id: string };

export default function PreviewSectionTools({
  root,
  scroller,
  definition,
  order,
  content,
  setContent,
}: {
  root: RefObject<HTMLElement | null>;
  scroller: RefObject<HTMLElement | null>;
  definition: TemplateDefinition | undefined;
  /** The saved section order (settings.sectionOrder). */
  order: string[] | undefined;
  content: EventContent;
  setContent: Dispatch<SetStateAction<EventContent>>;
}) {
  const edit = usePageEdit();
  const [sec, setSec] = useState<Hit | null>(null);
  const [item, setItem] = useState<ItemHit | null>(null);
  const [, setTick] = useState(0);
  const hide = useRef(0);
  const latest = useRef(content);
  latest.current = content;

  useEffect(() => {
    const r = root.current;
    if (!r) return;
    const pick = (target: EventTarget | null) => {
      const t = target as HTMLElement | null;
      if (!t?.closest) return;
      const s = t.closest<HTMLElement>("[data-site-section]");
      const it = t.closest<HTMLElement>("[data-site-item]");
      const listEl = it?.closest<HTMLElement>("[data-site-list]");
      window.clearTimeout(hide.current);
      setSec((h) => (s && r.contains(s) ? (h?.el === s ? h : { el: s, key: s.dataset.siteSection!, vis: (s.dataset.siteVis ?? s.dataset.siteSection!).split(" ") }) : null));
      setItem((h) => (it && listEl && r.contains(it) && LISTS[listEl.dataset.siteList as ListKey] ? (h?.el === it ? h : { el: it, list: listEl.dataset.siteList as ListKey, id: it.dataset.siteItem! }) : null));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") pick(e.target);
    };
    // touch has no hover: a tap selects
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") pick(e.target);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      window.clearTimeout(hide.current);
      hide.current = window.setTimeout(() => {
        setSec(null);
        setItem(null);
      }, 300);
    };
    r.addEventListener("pointermove", onMove);
    r.addEventListener("pointerdown", onDown);
    r.addEventListener("pointerleave", onLeave);
    return () => {
      r.removeEventListener("pointermove", onMove);
      r.removeEventListener("pointerdown", onDown);
      r.removeEventListener("pointerleave", onLeave);
    };
  }, [root]);

  // stay on their element while the preview scrolls
  useEffect(() => {
    if (!sec && !item) return;
    const s = scroller.current;
    const bump = () => setTick((n) => n + 1);
    s?.addEventListener("scroll", bump, { passive: true });
    window.addEventListener("resize", bump);
    return () => {
      s?.removeEventListener("scroll", bump);
      window.removeEventListener("resize", bump);
    };
  }, [sec, item, scroller]);

  if (!edit || typeof document === "undefined") return null;
  const pane = scroller.current?.getBoundingClientRect();
  const keep = () => window.clearTimeout(hide.current);
  const leave = () => {
    hide.current = window.setTimeout(() => {
      setSec(null);
      setItem(null);
    }, 300);
  };

  // ---- section bar ----
  let sectionBar = null;
  const s = sec?.el.isConnected ? sec : null;
  if (s && pane) {
    const r = s.el.getBoundingClientRect();
    const top = Math.max(r.top + 10, pane.top + 10);
    if (top < Math.min(r.bottom, pane.bottom) - 40) {
      const movable = definition?.sections;
      const keys = movable ? inOrder(movable.map((x) => x.key), order) : [];
      const i = keys.indexOf(s.key);
      const label = movable?.find((x) => x.key === s.key)?.label ?? (definition?.hideable ?? []).find((h) => h.key === s.key)?.label ?? "";
      const right = Math.min(r.right, pane.right) - 10;
      sectionBar = (
        <div onPointerEnter={keep} onPointerLeave={leave} style={{ ...bar, top, left: right, translate: "-100% 0" }}>
          {label ? <span style={{ padding: "0 8px 0 10px", fontSize: 12, fontWeight: 600, opacity: 0.75 }}>{label}</span> : null}
          {i >= 0 ? (
            <>
              <button type="button" aria-label={`Move ${label} up`} title="Move up" disabled={i === 0} onClick={() => edit.moveSection(s.key, -1)} style={btn(i === 0)}>
                ↑
              </button>
              <button type="button" aria-label={`Move ${label} down`} title="Move down" disabled={i === keys.length - 1} onClick={() => edit.moveSection(s.key, 1)} style={btn(i === keys.length - 1)}>
                ↓
              </button>
            </>
          ) : null}
          <button type="button" onClick={() => edit.hideSection(s.vis, false)} style={{ ...btn(false), width: "auto", padding: "0 12px", fontSize: 12.5, fontWeight: 600 }}>
            Hide
          </button>
        </div>
      );
    }
  }

  // ---- item bar ----
  let itemBar = null;
  let itemOutline = null;
  const it = item?.el.isConnected ? item : null;
  if (it && pane) {
    const def = LISTS[it.list];
    const items = def.get(latest.current);
    const i = items.findIndex((x) => x.id === it.id);
    const r = it.el.getBoundingClientRect();
    if (i >= 0 && r.bottom > pane.top && r.top < pane.bottom) {
      // side by side (pills, cards, photos): ← →
      const sibling = it.el.parentElement?.querySelector<HTMLElement>(`[data-site-item="${items[i + 1]?.id ?? items[i - 1]?.id}"]`);
      const across = !!sibling && Math.abs(sibling.getBoundingClientRect().top - r.top) < 8;
      const canMove = def.movable !== false && items.length > 1;
      const canRemove = items.length > (def.min ?? 0);
      const top = r.top - 38 > pane.top + 4 ? r.top - 38 : r.top + 4;
      itemOutline = <div aria-hidden style={{ position: "fixed", left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12, zIndex: 52, borderRadius: 6, outline: "1px solid rgba(47,97,213,.55)", pointerEvents: "none" }} />;
      itemBar =
        canMove || canRemove ? (
          <div onPointerEnter={keep} onPointerLeave={leave} style={{ ...bar, top, left: Math.max(pane.left + 6, r.left - 6) }}>
            {canMove ? (
              <>
                <button type="button" aria-label="Move earlier" title={across ? "Move left" : "Move up"} disabled={i === 0} onClick={() => move(-1)} style={btn(i === 0)}>
                  {across ? "←" : "↑"}
                </button>
                <button type="button" aria-label="Move later" title={across ? "Move right" : "Move down"} disabled={i === items.length - 1} onClick={() => move(1)} style={btn(i === items.length - 1)}>
                  {across ? "→" : "↓"}
                </button>
              </>
            ) : null}
            {canRemove ? (
              <button type="button" aria-label={`Remove ${def.name(items[i])}`} title="Remove" onClick={remove} style={btn(false)}>
                ×
              </button>
            ) : null}
          </div>
        ) : null;
    }
    function move(by: -1 | 1) {
      edit!.checkpoint();
      setContent((c) => moveItem(c, it!.list, it!.id, by));
    }
    function remove() {
      const name = def.name(items[i]);
      edit!.checkpoint();
      setContent((c) => removeItem(c, it!.list, it!.id));
      setItem(null);
      edit!.notify(`Removed ${name}`);
    }
  }

  return createPortal(
    <>
      {itemOutline}
      {itemBar}
      {sectionBar}
    </>,
    document.body,
  );
}

const bar: CSSProperties = {
  position: "fixed",
  zIndex: 56,
  display: "flex",
  alignItems: "center",
  gap: 2,
  height: 34,
  padding: 2,
  borderRadius: 999,
  background: "rgba(0,7,39,.88)",
  color: "#fff",
  font: "500 13px/1 Inter, system-ui, sans-serif",
  boxShadow: "0 8px 22px -10px rgba(0,7,39,.5)",
  whiteSpace: "nowrap",
};
const btn = (off: boolean): CSSProperties => ({
  width: 30,
  height: 30,
  display: "grid",
  placeItems: "center",
  border: 0,
  borderRadius: 999,
  background: "transparent",
  color: "#fff",
  fontSize: 15,
  cursor: off ? "default" : "pointer",
  opacity: off ? 0.35 : 1,
});
