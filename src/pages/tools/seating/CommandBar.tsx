import { useMemo, useRef, useState } from "react";

// ⌘K: find any guest or table, or run an action, from the keyboard.

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run(): void;
}

export default function CommandBar({ commands, onClose }: { commands: Command[]; onClose(): void }) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands.filter((c) => c.id.startsWith("a-")).slice(0, 8);
    const words = s.split(/\s+/);
    return commands
      .map((c) => {
        const l = c.label.toLowerCase();
        if (!words.every((w) => l.includes(w) || (c.hint ?? "").toLowerCase().includes(w))) return null;
        return { c, score: (l.startsWith(s) ? 0 : 1) + (c.id.startsWith("a-") ? 0.5 : 0) + l.length / 200 };
      })
      .filter(Boolean)
      .sort((a, b) => a!.score - b!.score)
      .slice(0, 30)
      .map((x) => x!.c);
  }, [q, commands]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  return (
    <div className="sp-cmd" onClick={onClose}>
      <div className="sp-cmd-box" role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          placeholder="Find a guest or table, or type an action"
          onChange={(e) => {
            setQ(e.target.value);
            setI(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setI((n) => Math.min(results.length - 1, n + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setI((n) => Math.max(0, n - 1));
            } else if (e.key === "Enter") run(results[i]);
          }}
          aria-label="Search guests, tables and actions"
          role="combobox"
          aria-expanded="true"
          aria-controls="sp-cmd-list"
        />
        <div className="sp-cmd-list" id="sp-cmd-list" role="listbox" ref={list}>
          {results.length ? (
            results.map((c, n) => (
              <button key={c.id} className="sp-cmd-item" role="option" aria-selected={n === i} onMouseEnter={() => setI(n)} onClick={() => run(c)}>
                {c.label}
                {c.hint ? <small>{c.hint}</small> : null}
              </button>
            ))
          ) : (
            <p className="sp-empty">Nothing matches “{q}”.</p>
          )}
        </div>
      </div>
    </div>
  );
}
