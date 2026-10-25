import { useEffect, useLayoutEffect, useRef, useState } from "react";

// The right-click menu: a short list of what you can do to the thing under the pointer.
// It opens at the pointer, stays inside the window, and closes on a click elsewhere,
// Escape, scrolling or resizing.

export type CtxItem =
  | {
      label: string;
      hint?: string;
      danger?: boolean;
      checked?: boolean;
      run(): void;
    }
  | "sep";

export default function ContextMenu({ x, y, title, sub, items, onClose }: { x: number; y: number; title?: string; sub?: string; items: CtxItem[]; onClose(): void }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Open up or to the left when there isn't room below or to the right.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: x + width + 8 > window.innerWidth ? Math.max(8, x - width) : x,
      top: y + height + 8 > window.innerHeight ? Math.max(8, y - height) : y,
    });
    el.querySelector<HTMLButtonElement>("button")?.focus({
      preventScroll: true,
    });
  }, [x, y]);

  useEffect(() => {
    const away = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const btns = [...(box.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
      const i = btns.indexOf(document.activeElement as HTMLButtonElement);
      btns[(i + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length]?.focus();
    };
    const close = () => onClose();
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("contextmenu", away, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("contextmenu", away, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("wheel", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [onClose]);

  return (
    <div ref={box} className="sp-float sp-menu sp-ctx" role="menu" aria-label={title ?? "Actions"} style={pos} onContextMenu={(e) => e.preventDefault()}>
      {title ? (
        <p className="sp-ctx__h">
          {title}
          {sub ? <small>{sub}</small> : null}
        </p>
      ) : null}
      {items.map((it, i) =>
        it === "sep" ? (
          <hr key={i} />
        ) : (
          <button
            key={i}
            role={it.checked === undefined ? "menuitem" : "menuitemcheckbox"}
            aria-checked={it.checked}
            className={it.danger ? "sp-danger" : undefined}
            onClick={() => {
              onClose();
              it.run();
            }}
          >
            {it.label}
            {it.checked ? (
              <span className="sp-ctx__tick" aria-hidden>
                ✓
              </span>
            ) : null}
            {it.hint ? <small>{it.hint}</small> : null}
          </button>
        ),
      )}
    </div>
  );
}
