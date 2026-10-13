// Dragging guests (from the list, or from one seat to another) with a floating name tag.
// Pointer Events only; the drop target is whatever table or seat is under the finger,
// found with elementFromPoint, so the canvas needs no knowledge of the drag.

export interface DropTarget {
  tableId: string;
  seat?: number;
}

export function hitTarget(x: number, y: number): DropTarget | null {
  const el = document.elementFromPoint(x, y);
  const seat = el?.closest("[data-seat]") as HTMLElement | SVGElement | null;
  if (seat) {
    const [tableId, i] = (seat.getAttribute("data-seat") ?? "").split(":");
    return { tableId, seat: Number(i) };
  }
  const table = el?.closest("[data-table]");
  if (table) return { tableId: table.getAttribute("data-table")! };
  return null;
}

let lastDrop: Element | null = null;
function markDrop(t: DropTarget | null) {
  const el = t ? document.querySelector(`[data-table="${CSS.escape(t.tableId)}"]`) : null;
  if (el === lastDrop) return;
  lastDrop?.classList.remove("drop");
  el?.classList.add("drop");
  lastDrop = el;
}

/** Call from pointerdown. A short move is a tap (`onTap`); past the threshold it becomes
 *  a drag that ends in `onDrop`. */
export function trackDrag(
  start: { clientX: number; clientY: number; pointerId: number },
  label: string,
  handlers: { onDrop: (t: DropTarget | null) => void; onTap?: () => void; threshold?: number; source?: Element | null },
) {
  const t0 = handlers.threshold ?? 6;
  // No text selection while a name is being dragged across the page.
  const root = document.querySelector(".sp");
  root?.classList.add("dragging");
  window.getSelection()?.removeAllRanges();
  const sx = start.clientX;
  const sy = start.clientY;
  let ghost: HTMLDivElement | null = null;
  const move = (e: PointerEvent) => {
    if (e.pointerId !== start.pointerId) return;
    if (!ghost) {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) < t0) return;
      ghost = document.createElement("div");
      ghost.className = "sp-ghost";
      ghost.textContent = label;
      handlers.source?.classList.add("lifting");
      (document.querySelector(".sp") ?? document.body).appendChild(ghost);
    }
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    markDrop(hitTarget(e.clientX, e.clientY));
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== start.pointerId) return;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    root?.classList.remove("dragging");
    handlers.source?.classList.remove("lifting");
    window.getSelection()?.removeAllRanges();
    markDrop(null);
    if (ghost) {
      ghost.remove();
      handlers.onDrop(e.type === "pointercancel" ? null : hitTarget(e.clientX, e.clientY));
    } else if (e.type === "pointerup") handlers.onTap?.();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}
