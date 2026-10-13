import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Canvas, { type CanvasHandle, type Sel } from "./Canvas";
import GuestPanel from "./GuestPanel";
import Inspector from "./Inspector";
import AddGuests from "./AddGuests";
import ExportDialog from "./ExportDialog";
import CommandBar, { type Command } from "./CommandBar";
import { planSeating } from "./autoseat";
import { nextTableLabel } from "./presets";
import { OBJ_LABEL, SHAPE_LABEL, freeSeats, ruleBreaks, tableSize, uid, type Chart, type ObjType, type Shape } from "./model";
import RulesDialog from "./Rules";
import RoomDialog from "./RoomDialog";
import { fitTablesToRoom } from "./fit";
import { bgImage } from "./store";
import { beginGesture, clearSaved, commit, endGesture, live, open as openChart, readBackup, redo, undo, useStore } from "./store";
import type { DropTarget } from "./drag";
import { trackEvent } from "@/lib/analytics";
// Loaded only when someone signs up from here (keeps it out of the shared bundle).
const AuthModal = lazy(() => import("@/pages/home/components/AuthModal"));
import { listCloud, loadCloud, saveCloud, shareLink, stopSharing, useSignedIn, type CloudRow, type CloudState } from "./cloud";
import ShareDialog from "./ShareDialog";
import { exportBackup } from "./store";

export type Look = "a" | "b" | "c";

interface Summary {
  notes: string[];
  warn: string[];
  tablesNeeded: number;
}

const I = {
  undo: <path d="M7 5L3 9l4 4M3 9h9a5 5 0 010 10H9" />,
  redo: <path d="M13 5l4 4-4 4M17 9H8a5 5 0 000 10h3" />,
  plus: <path d="M10 4v12M4 10h12" />,
  dl: <path d="M10 3v10M6 9l4 4 4-4M4 16h12" />,
  more: <path d="M4 10h.01M10 10h.01M16 10h.01" strokeWidth="3" />,
  fit: <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" />,
  rules: (
    <>
      <circle cx="5.5" cy="10" r="2.5" />
      <circle cx="14.5" cy="10" r="2.5" />
      <path d="M8 10h4" />
    </>
  ),
  share: <path d="M10 13V3M6.5 6.5L10 3l3.5 3.5M4 11v5h12v-5" />,
  search: (
    <>
      <circle cx="9" cy="9" r="6" />
      <path d="M14 14l4 4" />
    </>
  ),
};
const Icon = ({ d, size = 17 }: { d: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
const Spark = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M10 1l1.8 5.2L17 8l-5.2 1.8L10 15l-1.8-5.2L3 8l5.2-1.8z" />
    <path d="M16 13l.8 2.2L19 16l-2.2.8L16 19l-.8-2.2L13 16l2.2-.8z" />
  </svg>
);

export default function Editor({ look, setLook, autoSeat, onStartOver }: { look: Look; setLook(l: Look): void; autoSeat: boolean; onStartOver(): void }) {
  const chart = useStore((s) => s.chart)!;
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const save = useStore((s) => s.save);

  const canvas = useRef<CanvasHandle>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [armed, setArmed] = useState<{ ids: string[]; label: string; key: string } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [pulse, setPulse] = useState<{ id: string; n: number } | null>(null);
  const [hits, setHits] = useState<Set<string> | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "add" | "export" | "cmd" | "reset" | "rules" | "room">(null);
  const [names, setNamesState] = useState<"auto" | "initials" | "first" | "full">(() => {
    try {
      const v = localStorage.getItem("seating:names");
      return v === "initials" || v === "first" || v === "full" ? v : "auto";
    } catch {
      return "auto";
    }
  });
  const setNames = (v: typeof names) => {
    setNamesState(v);
    try {
      localStorage.setItem("seating:names", v);
    } catch {
      /* fine */
    }
  };
  const [menu, setMenu] = useState<null | "add" | "more">(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const fileInput = useRef<HTMLInputElement>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [authOpen, setAuthOpen] = useState(false);
  const [share, setShare] = useState<null | { url: string | null; busy: boolean }>(null);
  const [plans, setPlans] = useState<CloudRow[] | null>(null);
  const { userId, ready: authReady } = useSignedIn();
  // Downloads and share links need a free account. Asked once, at that moment; what they
  // wanted carries on by itself after signing up (also after a Google sign-in round trip).
  const [gate, setGate] = useState<null | "export" | "share">(null);
  const AFTER = "seating:after-auth";
  const needAccount = (what: "export" | "share") => {
    try {
      sessionStorage.setItem(AFTER, what);
    } catch {
      /* fine: they'll just click again */
    }
    setGate(what);
    trackEvent("seating_gate", { action: what });
  };
  const openExport = () => (userId ? setDialog("export") : needAccount("export"));
  const [cloud, setCloud] = useState<CloudState>("off");

  // ---- saving to the account ------------------------------------------------------
  // The browser copy is the working copy; changes go up two seconds after they stop.
  useEffect(() => {
    if (!userId) return setCloud("off");
    setCloud("saving");
    const t = window.setTimeout(async () => setCloud(await saveCloud(chart)), 2000);
    return () => window.clearTimeout(t);
  }, [userId, chart]);

  // Not signed in: after a good amount of work, suggest keeping a copy somewhere safer.
  const changes = useRef(0);
  const lastSeen = useRef(chart.updatedAt);
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    if (chart.updatedAt === lastSeen.current) return;
    lastSeen.current = chart.updatedAt;
    changes.current += 1;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("seating:nudged") === "1";
    } catch {
      /* show it */
    }
    if (!userId && !dismissed && changes.current >= 15 && chart.guests.some((g) => g.tableId)) setNudge(true);
  }, [chart, userId]);
  const closeNudge = () => {
    setNudge(false);
    try {
      sessionStorage.setItem("seating:nudged", "1");
    } catch {
      /* fine */
    }
  };

  // First visit: three short tips, once.
  const [tips, setTips] = useState(() => {
    try {
      return localStorage.getItem("seating:tips") !== "1";
    } catch {
      return false;
    }
  });
  const closeTips = () => {
    setTips(false);
    try {
      localStorage.setItem("seating:tips", "1");
    } catch {
      /* fine */
    }
  };
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const makeShare = async () => {
    setShare({ url: null, busy: true });
    const url = await shareLink(chart);
    setShare({ url, busy: false });
    if (url) trackEvent("seating_share");
  };
  // Signed in now, with something waiting: do it.
  useEffect(() => {
    if (!authReady || !userId) return;
    let what: string | null = null;
    try {
      what = sessionStorage.getItem(AFTER);
      sessionStorage.removeItem(AFTER);
    } catch {
      /* nothing waiting */
    }
    setGate(null);
    setAuthOpen(false);
    if (what === "export") {
      setDialog("export");
      trackEvent("seating_gate_done", { action: "export" });
    } else if (what === "share") {
      trackEvent("seating_gate_done", { action: "share" });
      void makeShare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, userId]);

  const doUndo = () => {
    undo();
    setSummary(null);
  };
  const doRedo = () => {
    redo();
    setSummary(null);
  };

  const toastTimer = useRef(0);
  const say = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const pulseTable = (id: string) => setPulse((p) => ({ id, n: (p?.n ?? 0) + 1 }));

  // ---- seating ----------------------------------------------------------------
  const animating = useRef(false);
  const seatEveryone = useCallback(
    (reseat = false) => {
      if (animating.current) return;
      const plan = planSeating(chart, { reseat });
      setArmed(null);
      setSel(null);
      if (!plan.moves.length) {
        say(plan.unplaced ? "No free seats. Add a table first." : "Everyone already has a seat.");
        return;
      }
      commit((c) => {
        const byId = new Map(c.guests.map((g) => [g.id, g]));
        if (reseat) {
          const locked = new Set(c.tables.filter((t) => t.locked).map((t) => t.id));
          for (const g of c.guests) if (g.tableId && !locked.has(g.tableId)) Object.assign(g, { tableId: null, seat: null });
        }
        for (const m of plan.moves) Object.assign(byId.get(m.guestId)!, { tableId: m.tableId, seat: m.seat });
      });
      trackEvent("seating_autoseat", { guests: plan.moves.length });
      setReasons((r) => ({ ...r, ...plan.reasons }));
      // Show it happening: seats fill one after another, about 1.5 seconds in all.
      const order = plan.moves.map((m) => m.guestId);
      let left = new Set(order);
      setHidden(left);
      animating.current = true;
      const per = Math.max(1, Math.ceil(order.length / 55));
      let i = 0;
      const tick = () => {
        i += per;
        left = new Set(order.slice(i));
        setHidden(left);
        if (i < order.length) window.setTimeout(tick, 26);
        else {
          animating.current = false;
          setSummary({ notes: plan.notes, warn: plan.unplaced ? [`${plan.unplaced} still need a seat`] : [], tablesNeeded: plan.tablesNeeded });
        }
      };
      window.setTimeout(tick, 120);
    },
    [chart, say],
  );

  // First visit from the start screen: seat everyone straight away.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoSeat && !autoRan.current && chart.guests.some((g) => !g.tableId) && chart.tables.length) {
      autoRan.current = true;
      window.setTimeout(() => seatEveryone(), 650);
    }
  }, [autoSeat, chart, seatEveryone]);

  /** Seat guests at a table (or a seat). One guest dropped on a taken seat swaps places. */
  const place = useCallback(
    (ids: string[], target: DropTarget | null) => {
      if (!target || !ids.length) return;
      const t = chart.tables.find((x) => x.id === target.tableId);
      if (!t) return;
      const moving = new Set(ids);
      const others = chart.guests.filter((g) => g.tableId === t.id && !moving.has(g.id));
      if (ids.length === 1 && target.seat != null) {
        const occupant = others.find((g) => g.seat === target.seat);
        const me = chart.guests.find((g) => g.id === ids[0]);
        if (occupant && me) {
          commit((c) => {
            const a = c.guests.find((g) => g.id === me.id)!;
            const b = c.guests.find((g) => g.id === occupant.id)!;
            Object.assign(b, { tableId: me.tableId, seat: me.seat });
            Object.assign(a, { tableId: t.id, seat: target.seat });
          });
          setArmed(null);
          pulseTable(t.id);
          return;
        }
      }
      const free = freeSeats(t, others);
      if (!free.length) {
        say(`${/^\d+$/.test(t.label) ? `Table ${t.label}` : t.label} is full.`);
        return;
      }
      // Start at the tapped seat if there was one, then go round the table.
      const start = target.seat != null && free.includes(target.seat) ? target.seat : null;
      const ordered = start == null ? free : [...free.filter((s) => s >= start), ...free.filter((s) => s < start)];
      const n = Math.min(ordered.length, ids.length);
      commit((c) => {
        ids.slice(0, n).forEach((id, i) => Object.assign(c.guests.find((g) => g.id === id)!, { tableId: t.id, seat: ordered[i] }));
      });
      setArmed(null);
      pulseTable(t.id);
      if (n < ids.length) say(`${ids.length - n} didn’t fit at ${/^\d+$/.test(t.label) ? `Table ${t.label}` : t.label}. They’re still in the list.`);
    },
    [chart, say],
  );

  // ---- fit the tables to the room ----------------------------------------------------
  const fitTables = useCallback(async () => {
    const r = await fitTablesToRoom(chart, bgImage(chart.bg?.key));
    if (!r.moved && !r.objects.length) return say("Everything already fits.");
    commit((c) => {
      for (const p of r.tables) Object.assign(c.tables.find((t) => t.id === p.id)!, { x: p.x, y: p.y });
      for (const p of r.objects) Object.assign(c.objects.find((o) => o.id === p.id)!, { x: p.x, y: p.y });
    });
    window.setTimeout(() => canvas.current?.fit(), 40);
    trackEvent("seating_fit_room", { tables: r.moved, overflow: r.overflow });
    say(
      r.overflow
        ? `${r.overflow} ${r.overflow === 1 ? "table doesn’t" : "tables don’t"} fit and ${r.overflow === 1 ? "is" : "are"} outside the right wall. Remove a table or make the room bigger.`
        : `Moved ${r.moved} ${r.moved === 1 ? "table" : "tables"} to fit the room${r.inkUsed ? ", around the walls and pillars on your plan" : ""}. Undo if you preferred it before.`,
    );
  }, [chart, say]);

  // ---- adding things -------------------------------------------------------------
  /** The nearest empty spot to the middle of the view, so new things never land on top of
   *  a table, the stage or the dance floor. */
  const freeSpot = (w: number, h: number) => {
    const c0 = canvas.current?.center() ?? { x: chart.room.w / 2, y: chart.room.h / 2 };
    const boxes = [
      ...chart.tables.map((t) => {
        const sz = tableSize(t);
        const r = Math.max(sz.w, sz.h) / 2;
        return { x0: t.x - r, y0: t.y - r, x1: t.x + r, y1: t.y + r };
      }),
      ...chart.objects.map((o) => {
        const r = Math.max(o.w, o.h) / 2;
        const turned = o.rot % 180 !== 0;
        const hw = turned ? o.h / 2 : o.w / 2;
        const hh = turned ? o.w / 2 : o.h / 2;
        return { x0: o.x - Math.min(hw, r), y0: o.y - Math.min(hh, r), x1: o.x + Math.min(hw, r), y1: o.y + Math.min(hh, r) };
      }),
    ];
    const gap = 40;
    const fits = (x: number, y: number) => {
      const a = { x0: x - w / 2 - gap, y0: y - h / 2 - gap, x1: x + w / 2 + gap, y1: y + h / 2 + gap };
      if (a.x0 < 0 || a.y0 < 0 || a.x1 > chart.room.w || a.y1 > chart.room.h) return false;
      return !boxes.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0);
    };
    const snap = (v: number) => Math.round(v / 10) * 10;
    for (let r = 0; r < 4000; r += 40) {
      const steps = Math.max(1, Math.round((2 * Math.PI * r) / 60));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = c0.x + Math.cos(a) * r;
        const y = c0.y + Math.sin(a) * r;
        if (fits(x, y)) return { x: snap(x), y: snap(y) };
      }
    }
    // No gap big enough: a new row at the back, and the room grows to fit it.
    // (The entrance, exit and gifts table move down with the back wall, so they don't count.)
    const fixed = [
      ...boxes.slice(0, chart.tables.length),
      ...boxes.slice(chart.tables.length).filter((_, i) => !["entrance", "gifts", "exit"].includes(chart.objects[i].type)),
    ];
    const bottom = Math.max(0, ...fixed.map((b) => b.y1));
    return { x: snap(chart.room.w / 2), y: snap(bottom + gap * 2 + h / 2), grow: Math.max(0, bottom + gap * 3 + h + 160 - chart.room.h) };
  };
  const growRoom = (c: Chart, by: number) => {
    if (by <= 0) return;
    c.room.h += Math.round(by);
    for (const o of c.objects) if (o.type === "entrance" || o.type === "gifts" || o.type === "exit") o.y += Math.round(by);
  };

  const addTable = (shape: Shape, seats: number) => {
    const id = uid("t");
    const label = shape === "head" ? "Head table" : shape === "sweetheart" ? "Sweetheart" : nextTableLabel(chart.tables);
    const draft = { id, label, shape, seats, x: 0, y: 0, rot: 0 };
    const sz = tableSize(draft);
    const { grow = 0, ...at } = freeSpot(sz.w, sz.h);
    commit((c) => {
      growRoom(c, grow);
      c.tables.push({ ...draft, ...at });
    });
    if (grow) window.setTimeout(() => canvas.current?.fit(), 40);
    pulseTable(id);
    setSel({ kind: "table", id });
    setMenu(null);
  };
  const addObject = (type: ObjType) => {
    const size: Record<ObjType, [number, number]> = { stage: [800, 240], dance: [560, 420], buffet: [500, 80], dj: [220, 90], bar: [300, 80], cake: [70, 70], photo: [220, 90], entrance: [320, 50], gifts: [160, 70], lechon: [180, 80], exit: [200, 50], restroom: [300, 200], pillar: [60, 60], custom: [300, 200] };
    const id = uid("o");
    const { grow = 0, ...at } = freeSpot(size[type][0], size[type][1]);
    commit((c) => {
      growRoom(c, grow);
      c.objects.push({ id, type, label: OBJ_LABEL[type], ...at, w: size[type][0], h: size[type][1], rot: 0 });
    });
    setSel({ kind: "object", id });
    setMenu(null);
  };

  /** Seat everyone ran out of room: add tables in a new row at the back. */
  const addTablesForRest = (n: number) => {
    commit((c) => {
      const seats = Math.max(8, ...c.tables.filter((t) => t.shape === "round").map((t) => t.seats));
      const maxY = Math.max(0, ...c.tables.map((t) => t.y));
      const y = maxY + 360;
      const cols = Math.max(1, Math.floor((c.room.w - 300) / 360));
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const inRow = Math.min(cols, n - row * cols);
        const x = c.room.w / 2 + (col - (inRow - 1) / 2) * 360;
        c.tables.push({ id: uid("t"), label: nextTableLabel(c.tables), shape: "round", seats, x, y: y + row * 360, rot: 0 });
      }
      const bottom = Math.max(...c.tables.map((t) => t.y)) + 300;
      if (bottom > c.room.h) {
        const grow = bottom - c.room.h;
        c.room.h = bottom;
        for (const o of c.objects) if (o.type === "entrance" || o.type === "gifts") o.y += grow;
      }
    });
    setSummary(null);
    window.setTimeout(() => {
      canvas.current?.fit();
      seatEveryone();
    }, 60);
  };

  // ---- search & focus -------------------------------------------------------------
  const onSearch = (q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return setHits(null);
    const ids = chart.guests.filter((g) => g.name.toLowerCase().includes(s)).map((g) => g.id);
    setHits(new Set(ids));
    const first = chart.guests.find((g) => g.id === ids[0]);
    if (ids.length === 1 && first?.tableId) {
      canvas.current?.focus(first.tableId);
      pulseTable(first.tableId);
    }
  };
  const focusGuest = (id: string) => {
    const g = chart.guests.find((x) => x.id === id);
    if (!g) return;
    setSel({ kind: "guest", id });
    if (g.tableId) {
      canvas.current?.focus(g.tableId);
      pulseTable(g.tableId);
    }
    setSheetOpen(false);
  };

  const arm = (ids: string[], label: string, key: string) => {
    if (armed?.key === key) return setArmed(null);
    setArmed({ ids, label, key });
    setSel(null);
    setSheetOpen(false);
  };

  // ---- keyboard ------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDialog((d) => (d === "cmd" ? null : "cmd"));
        return;
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        setSummary(null);
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Escape") {
        setArmed(null);
        setSel(null);
        setMenu(null);
        return;
      }
      if (!sel || sel.kind === "guest") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        commit((c) => {
          if (sel.kind === "table") {
            c.tables = c.tables.filter((t) => t.id !== sel.id);
            for (const g of c.guests) if (g.tableId === sel.id) Object.assign(g, { tableId: null, seat: null });
          } else c.objects = c.objects.filter((o) => o.id !== sel.id);
        });
        setSel(null);
        return;
      }
      const step = e.shiftKey ? 50 : 10;
      const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (d[e.key]) {
        e.preventDefault();
        commit((c) => {
          const it = sel.kind === "table" ? c.tables.find((t) => t.id === sel.id) : c.objects.find((o) => o.id === sel.id);
          if (it) {
            it.x += d[e.key][0];
            it.y += d[e.key][1];
          }
        });
      }
      if (e.key.toLowerCase() === "r") {
        commit((c) => {
          const it = sel.kind === "table" ? c.tables.find((t) => t.id === sel.id) : c.objects.find((o) => o.id === sel.id);
          if (it) it.rot = (it.rot + (e.shiftKey ? 345 : 15)) % 360;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  // Close menus on outside click.
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => !(e.target as Element).closest(".sp-rel") && setMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  // Selection that no longer exists (deleted, undone) closes the card.
  useEffect(() => {
    if (!sel) return;
    const exists = sel.kind === "table" ? chart.tables.some((t) => t.id === sel.id) : sel.kind === "object" ? chart.objects.some((o) => o.id === sel.id) : chart.guests.some((g) => g.id === sel.id);
    if (!exists) setSel(null);
  }, [chart, sel]);

  const unseated = useMemo(() => chart.guests.filter((g) => !g.tableId).length, [chart.guests]);
  const broken = useMemo(() => ruleBreaks(chart).length, [chart]);
  const totalSeats = useMemo(() => chart.tables.reduce((a, t) => a + t.seats, 0), [chart.tables]);

  const commands: Command[] = useMemo(() => {
    const tables = chart.tables.map<Command>((t) => ({
      id: `t${t.id}`,
      label: /^\d+$/.test(t.label) ? `Table ${t.label}` : t.label,
      hint: `${chart.guests.filter((g) => g.tableId === t.id).length}/${t.seats}${t.note ? ` · ${t.note}` : ""}`,
      run: () => {
        canvas.current?.focus(t.id);
        pulseTable(t.id);
        setSel({ kind: "table", id: t.id });
      },
    }));
    const guests = chart.guests.map<Command>((g) => {
      const t = g.tableId ? chart.tables.find((x) => x.id === g.tableId) : null;
      return { id: `g${g.id}`, label: g.name, hint: t ? (/^\d+$/.test(t.label) ? `Table ${t.label}` : t.label) : "Not seated", run: () => focusGuest(g.id) };
    });
    const actions: Command[] = [
      { id: "a-seat", label: "Seat everyone", hint: "Action", run: () => seatEveryone() },
      { id: "a-reseat", label: "Seat everyone again from scratch", hint: "Action", run: () => seatEveryone(true) },
      { id: "a-add", label: "Add guests", hint: "Action", run: () => setDialog("add") },
      { id: "a-round", label: "Add a round table", hint: "Action", run: () => addTable("round", 10) },
      { id: "a-long", label: "Add a long table", hint: "Action", run: () => addTable("rect", 10) },
      { id: "a-dl", label: "Download or print", hint: "Action", run: () => openExport() },
      { id: "a-fit", label: "Fit to screen", hint: "Action", run: () => canvas.current?.fit() },
      { id: "a-undo", label: "Undo", hint: "⌘Z", run: undo },
    ];
    return [...actions, ...tables, ...guests];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, seatEveryone]);

  const summaryNode = summary ? (
    <div className="sp-summary" role="status">
      <b>{summary.notes[0] ?? "Done"}</b>
      <ul>
        {summary.notes.slice(1).map((n) => (
          <li key={n}>{n}</li>
        ))}
        {summary.warn.map((n) => (
          <li key={n} className="warn">
            {n}
          </li>
        ))}
      </ul>
      <div className="acts">
        {summary.tablesNeeded ? (
          <button className="sp-link" onClick={() => addTablesForRest(summary.tablesNeeded)}>
            Add {summary.tablesNeeded} {summary.tablesNeeded === 1 ? "table" : "tables"} and seat them
          </button>
        ) : null}
        <button
          className="sp-link"
          onClick={() => {
            undo();
            setSummary(null);
          }}
        >
          Undo
        </button>
        <button className="sp-link" onClick={() => setSummary(null)}>
          Close
        </button>
      </div>
    </div>
  ) : null;

  return (
    // data-lenis-prevent: the site's smooth scrolling stays out, so lists and dialogs scroll.
    <div className="sp" data-look={look} data-lenis-prevent>
      <header className="sp-bar">
        <Link to="/tools/seating-chart-maker?home" className="sp-home sp-hide-sm" aria-label="Mesa home" title="Mesa home">
          <img src={look === "b" ? "/brand/brandmark-dark.png" : "/brand/brandmark-white.png"} alt="" />
        </Link>
        <input
          className="sp-title"
          value={chart.title}
          onFocus={beginGesture}
          onChange={(e) => live((c) => (c.title = e.target.value.slice(0, 120)))}
          onBlur={endGesture}
          aria-label="Plan name"
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        <span
          className={`sp-saved${save === "blocked" || cloud === "error" || cloud === "limit" ? " warn" : " sp-hide-xs"}`}
          title={
            cloud === "limit"
              ? "Your account has 20 plans. Delete one in ⋯ → My plans to save this one."
              : cloud === "error"
                ? "Couldn’t reach your account. It’s still saved in this browser; we’ll try again."
                : userId
                  ? "Saved to your account"
                  : save === "blocked"
                    ? "This browser isn’t letting us save. Download a backup file to keep your plan."
                    : "Saved in this browser"
          }
        >
          {userId && cloud !== "off" ? (
            cloud === "saved" ? (
              <>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                  <path d="M6 15h8a3.5 3.5 0 00.5-7A5 5 0 005 8.5 3.3 3.3 0 006 15z" />
                  <path d="M8 11l1.5 1.5L12.5 9.5" />
                </svg>
                <span className="sp-hide-sm">Saved to your account</span>
              </>
            ) : cloud === "saving" ? (
              <span className="sp-hide-sm">Saving…</span>
            ) : cloud === "limit" ? (
              "Account full"
            ) : (
              "Offline"
            )
          ) : save === "blocked" ? (
            "Not saved"
          ) : save === "saved" ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 8.5l3 3 7-7" />
              </svg>
              <span className="sp-hide-sm">Saved</span>
            </>
          ) : (
            <span className="sp-hide-sm">Saving…</span>
          )}
        </span>
        {/* Left: the plan (name, saved, undo). Middle: find. Right: tools, then the main action. */}
        <span className="sp-div sp-hide-sm" />
        <button className="sp-ib" aria-label="Undo" title="Undo (⌘Z)" disabled={!canUndo} onClick={doUndo}>
          <Icon d={I.undo} />
        </button>
        <button className="sp-ib sp-hide-xs" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={doRedo}>
          <Icon d={I.redo} />
        </button>
        <span className="sp-grow sp-hide-sm" />
        <button className="sp-findbar sp-hide-sm" onClick={() => setDialog("cmd")} aria-label="Find a guest or table">
          <Icon d={I.search} size={15} />
          <span>Find a guest or table</span>
          <span className="sp-kbd">⌘K</span>
        </button>
        <span className="sp-grow sp-hide-sm" />
        <div className="sp-rel">
          <button className="sp-btn tool" aria-haspopup="menu" aria-expanded={menu === "add"} onClick={() => setMenu(menu === "add" ? null : "add")}>
            <Icon d={I.plus} size={15} />
            <span className="sp-hide-sm">Add</span>
          </button>
          {menu === "add" ? (
            <div className="sp-float sp-menu sp-menu-add" role="menu">
              <div className="sp-menu-col">
              <div className="lbl">Tables</div>
              <button onClick={() => addTable("round", 10)}>
                Round table<small>10 seats</small>
              </button>
              <button onClick={() => addTable("round", 8)}>
                Round table<small>8 seats</small>
              </button>
              <button onClick={() => addTable("round", 12)}>
                Round table (lauriat)<small>12 seats</small>
              </button>
              <button onClick={() => addTable("rect", 10)}>
                Long table<small>10 seats</small>
              </button>
              <button onClick={() => addTable("head", 10)}>
                Head table<small>one side</small>
              </button>
              <button onClick={() => addTable("sweetheart", 2)}>
                {SHAPE_LABEL.sweetheart}<small>the couple</small>
              </button>
              <button onClick={() => addTable("ushape", 20)}>
                {SHAPE_LABEL.ushape}<small>20 seats</small>
              </button>
              <button onClick={() => addTable("lshape", 14)}>
                {SHAPE_LABEL.lshape}<small>14 seats</small>
              </button>
              <button onClick={() => addTable("cocktail", 4)}>
                {SHAPE_LABEL.cocktail}<small>standing, 4</small>
              </button>
              </div>
              <div className="sp-menu-col">
              <div className="lbl">Room</div>
              {(["stage", "dance", "buffet", "bar", "dj", "photo", "cake", "lechon", "gifts", "entrance", "exit", "restroom", "pillar"] as ObjType[]).map((t) => (
                <button key={t} onClick={() => addObject(t)}>
                  {OBJ_LABEL[t]}
                </button>
              ))}
              <button onClick={() => addObject("custom")}>Something else…</button>
              <button
                onClick={() => {
                  setMenu(null);
                  setDialog("room");
                }}
              >
                Room size &amp; venue floor plan…
              </button>
              </div>
              <div className="sp-menu-col full">
              <button
                onClick={() => {
                  setMenu(null);
                  setDialog("add");
                }}
              >
                Guests…
              </button>
              </div>
            </div>
          ) : null}
        </div>
        <button className="sp-btn tool sp-hide-sm" onClick={() => setDialog("rules")} title="Who sits together, who doesn’t">
          <Icon d={I.rules} size={15} />
          <span className="sp-lbl">Rules</span>
          {broken ? <span className="sp-badge" title={`${broken} not kept`}>{broken}</span> : chart.rules?.length ? <span className="sp-count">{chart.rules.length}</span> : null}
        </button>
        <button
          className="sp-btn tool sp-hide-sm"
          title="Share a view-only link"
          aria-label="Share"
          onClick={async () => {
            if (!userId) return needAccount("share");
            setShare({ url: null, busy: true });
            const url = await shareLink(chart);
            setShare({ url, busy: false });
            if (url) trackEvent("seating_share");
          }}
        >
          <Icon d={I.share} size={15} />
          <span className="sp-lbl">Share</span>
        </button>
        <button className="sp-btn tool" onClick={openExport} aria-label="Download" title="Download or print">
          <Icon d={I.dl} size={15} />
          <span className="sp-hide-sm sp-lbl">Download</span>
        </button>
        <span className="sp-div sp-hide-sm" />
        <button className="sp-btn primary" onClick={() => seatEveryone()} disabled={!chart.guests.length || !chart.tables.length}>
          <Spark />
          <span className="sp-hide-sm">Seat everyone</span>
          <span className="sp-hide-lg">Seat</span>
        </button>
        <div className="sp-rel">
          <button className="sp-ib" aria-label="More" aria-haspopup="menu" aria-expanded={menu === "more"} onClick={() => setMenu(menu === "more" ? null : "more")}>
            <Icon d={I.more} />
          </button>
          {menu === "more" ? (
            <div className="sp-float sp-menu" role="menu">
              <Link to="/tools/seating-chart-maker?home" className="sp-menu-link" onClick={() => setMenu(null)}>
                Mesa home
              </Link>
              <button
                onClick={() => {
                  setMenu(null);
                  seatEveryone(true);
                }}
              >
                Seat everyone from scratch
              </button>
              <button
                onClick={() => {
                  setMenu(null);
                  fileInput.current?.click();
                }}
              >
                Open a backup file
              </button>
              <button
                onClick={() => {
                  setMenu(null);
                  exportBackup(chart);
                  changes.current = 0;
                }}
              >
                Download a backup file
              </button>
              <button
                className="sp-hide-lg"
                onClick={async () => {
                  setMenu(null);
                  if (!userId) return needAccount("share");
                  setShare({ url: null, busy: true });
                  setShare({ url: await shareLink(chart), busy: false });
                }}
              >
                Share a view-only link
              </button>
              {userId ? (
                <button
                  onClick={async () => {
                    setMenu(null);
                    setPlans(await listCloud());
                  }}
                >
                  My plans
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenu(null);
                    setAuthOpen(true);
                  }}
                >
                  Save to a free account
                </button>
              )}
              <button
                onClick={() => {
                  setMenu(null);
                  setDialog("rules");
                }}
              >
                Seating rules{broken ? <small>{broken} not kept</small> : null}
              </button>
              <button
                onClick={() => {
                  setMenu(null);
                  setDialog("room");
                }}
              >
                Room size &amp; venue floor plan
              </button>
              <button
                onClick={() => {
                  setMenu(null);
                  fitTables();
                }}
              >
                Fit the tables to the room
              </button>
              <hr />
              <div className="lbl">Names on seats</div>
              {(
                [
                  ["auto", "Initials, names when zoomed in"],
                  ["initials", "Initials"],
                  ["first", "First names"],
                  ["full", "Full names"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} onClick={() => setNames(k)} aria-pressed={names === k}>
                  {label}
                  {names === k ? <small>✓</small> : null}
                </button>
              ))}
              <hr />
              <div className="lbl">Look</div>
              {(
                [
                  ["a", "Blueprint"],
                  ["b", "Paper & ink"],
                  ["c", "Evening"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} onClick={() => setLook(k)} aria-pressed={look === k}>
                  {label}
                  {look === k ? <small>✓</small> : null}
                </button>
              ))}
              <hr />
              <button
                className="sp-danger"
                onClick={() => {
                  setMenu(null);
                  setDialog("reset");
                }}
              >
                Start a new plan
              </button>
            </div>
          ) : null}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const c = await readBackup(f);
            if (!c) return say("That file isn’t a seating plan backup.");
            openChart(c);
            window.setTimeout(() => canvas.current?.fit(false), 30);
            say("Plan opened.");
          }}
        />
      </header>

      <div className="sp-main">
        <GuestPanel
          chart={chart}
          armedKey={armed?.key ?? null}
          open={sheetOpen}
          onToggle={() => setSheetOpen((o) => !o)}
          onArm={arm}
          onFocusGuest={(g) => focusGuest(g.id)}
          onDrop={(ids, t) => place(ids, t)}
          onSearch={onSearch}
          onAddGuests={() => setDialog("add")}
          summary={summaryNode}
        />
        <div style={{ position: "relative", minWidth: 0, minHeight: 0, display: "grid" }}>
          <Canvas
            ref={canvas}
            chart={chart}
            sel={sel}
            armedIds={armed?.ids ?? null}
            hidden={hidden}
            pulse={pulse}
            hits={hits}
            onSelect={(s) => {
              setSel(s);
              if (s) setSummary(null);
            }}
            onTableTap={(id, seat) => armed && place(armed.ids, { tableId: id, seat })}
            onMove={(kind, id, x, y) =>
              commit((c) => {
                const it = kind === "table" ? c.tables.find((t) => t.id === id) : c.objects.find((o) => o.id === id);
                if (it) Object.assign(it, { x, y });
              })
            }
            onRotate={(kind, id, rot) =>
              commit((c) => {
                const it = kind === "table" ? c.tables.find((t) => t.id === id) : c.objects.find((o) => o.id === id);
                if (it) it.rot = rot;
              })
            }
            onGuestDrop={(gid, t) => (t ? place([gid], t) : undefined)}
            onZoom={setZoom}
            names={names}
          />
          {armed ? (
            <div className="sp-float sp-hint" role="status">
              <span>
                Tap a table for <b>{armed.label}</b>
              </span>
              <button className="sp-btn soft" onClick={() => setArmed(null)}>
                Cancel
              </button>
            </div>
          ) : !chart.guests.length ? (
            <div className="sp-float sp-hint">
              <span>Add your guest list to start</span>
              <button className="sp-btn primary" onClick={() => setDialog("add")}>
                Add guests
              </button>
            </div>
          ) : unseated && !summary ? (
            <div className="sp-float sp-chip sp-hide-sm">
              {unseated} not seated · {totalSeats - (chart.guests.length - unseated)} free seats
            </div>
          ) : null}
          {toast ? (
            <div className="sp-float sp-hint" style={{ top: "auto", bottom: 70 }} role="status">
              <span>{toast}</span>
            </div>
          ) : null}
          {sel ? <Inspector chart={chart} sel={sel} why={sel.kind === "guest" ? reasons[sel.id] : undefined} onClose={() => setSel(null)} onArm={arm} onFocusTable={(id) => canvas.current?.focus(id)} /> : null}
          {nudge && !userId ? (
            <div className="sp-float sp-nudge" role="status">
              <p>
                <b>This plan lives in this browser only.</b> iPhones can clear it after 7 days without a visit. Keep a copy:
              </p>
              <div className="sp-acts">
                <button
                  className="sp-btn primary"
                  onClick={() => {
                    closeNudge();
                    setAuthOpen(true);
                  }}
                >
                  Save to a free account
                </button>
                <button
                  className="sp-btn ghost"
                  onClick={() => {
                    exportBackup(chart);
                    closeNudge();
                  }}
                >
                  Download a backup
                </button>
                <button className="sp-ib" aria-label="Not now" onClick={closeNudge}>
                  ×
                </button>
              </div>
            </div>
          ) : tips && chart.guests.length ? (
            <div className="sp-float sp-nudge" role="note">
              <p>
                <b>Quick tips</b>
              </p>
              <ul>
                <li>Tap a group in the list, then tap a table to seat them.</li>
                <li>{touch ? "Press and hold a guest to move them; hold a table to move it." : "Drag a guest onto another seat to swap them."}</li>
                <li>Zoom in to see everyone’s names.</li>
              </ul>
              <div className="sp-acts">
                <button className="sp-btn primary" onClick={closeTips}>
                  Got it
                </button>
              </div>
            </div>
          ) : null}
          <div className="sp-float sp-zoom">
            <button className="sp-ib" aria-label="Zoom out" onClick={() => canvas.current?.zoomBy(1 / 1.4)}>
              −
            </button>
            <span>{zoom}%</span>
            <button className="sp-ib" aria-label="Zoom in" onClick={() => canvas.current?.zoomBy(1.4)}>
              +
            </button>
            <button className="sp-ib" aria-label="Fit to screen" title="Fit to screen" onClick={() => canvas.current?.fit()}>
              <Icon d={I.fit} size={15} />
            </button>
          </div>
        </div>
      </div>

      {dialog === "add" ? <AddGuests chart={chart} onClose={() => setDialog(null)} onAdded={(n) => say(`Added ${n} ${n === 1 ? "guest" : "guests"}. Press Seat everyone when you’re ready.`)} /> : null}
      {dialog === "export" ? <ExportDialog chart={chart} onClose={() => setDialog(null)} onDone={(what) => trackEvent("seating_export", { type: what })} /> : null}
      {dialog === "cmd" ? <CommandBar commands={commands} onClose={() => setDialog(null)} /> : null}
      {dialog === "rules" ? (
        <RulesDialog
          chart={chart}
          onClose={() => setDialog(null)}
          onShow={(id) => {
            setDialog(null);
            canvas.current?.focus(id);
            pulseTable(id);
          }}
        />
      ) : null}
      {dialog === "room" ? (
        <RoomDialog
          chart={chart}
          onClose={() => setDialog(null)}
          onFit={() => window.setTimeout(() => canvas.current?.fit(), 40)}
          onFitTables={() => {
            setDialog(null);
            fitTables();
          }}
        />
      ) : null}
      {gate && !userId ? (
        <div className="sp-scrim" onClick={() => setGate(null)}>
          <div className="sp-dialog sp-gate" role="dialog" aria-modal="true" aria-labelledby="sp-gate-h" onClick={(e) => e.stopPropagation()}>
            <h2 id="sp-gate-h">{gate === "export" ? "Download with a free account" : "Share with a free account"}</h2>
            <p>
              {gate === "export"
                ? "Your plan is ready. Make a free account to download the floor plan, the entrance board and the lists."
                : "Make a free account to send your coordinator a view-only link."}{" "}
              It also keeps your plan safe and opens it on any device.
            </p>
            <ul>
              <li>Free, no card</li>
              <li>Takes a few seconds with Google</li>
              <li>Your plan stays exactly as it is</li>
            </ul>
            <div className="row">
              <button className="sp-btn soft" onClick={() => setGate(null)}>
                Not now
              </button>
              <button className="sp-btn primary" onClick={() => setAuthOpen(true)}>
                Create a free account
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {authOpen ? (
        <Suspense fallback={null}>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" next="/tools/seating-chart-maker" />
        </Suspense>
      ) : null}
      {share ? (
        <ShareDialog
          url={share.url}
          busy={share.busy}
          signedIn={!!userId}
          onSignIn={() => {
            setShare(null);
            needAccount("share");
          }}
          onStop={async () => {
            await stopSharing(chart);
            setShare(null);
            say("The link no longer works.");
          }}
          onClose={() => setShare(null)}
        />
      ) : null}
      {plans ? (
        <div className="sp-scrim" onClick={() => setPlans(null)}>
          <div className="sp-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-plans-h" onClick={(e) => e.stopPropagation()}>
            <h2 id="sp-plans-h">My plans</h2>
            <p>Saved to your account. Up to 20.</p>
            <div className="sp-preview" style={{ maxHeight: 320 }}>
              {plans.map((p) => (
                <div key={p.id}>
                  <button
                    className="sp-link"
                    style={{ textDecoration: p.id === chart.id ? "none" : undefined }}
                    disabled={p.id === chart.id}
                    onClick={async () => {
                      const c = await loadCloud(p.id);
                      setPlans(null);
                      if (c) openChart(c);
                      else say("Couldn’t open that plan.");
                    }}
                  >
                    {p.title || "Seating plan"}
                    {p.id === chart.id ? " (open now)" : ""}
                  </button>
                  <em>{new Date(p.updated_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</em>
                </div>
              ))}
            </div>
            <div className="row">
              <button className="sp-btn soft" onClick={() => setPlans(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {dialog === "reset" ? (
        <div className="sp-scrim" onClick={() => setDialog(null)}>
          <div className="sp-dialog" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Start a new plan?</h2>
            <p>This clears “{chart.title}” from this browser. Download a backup file first if you might want it again.</p>
            <div className="row">
              <button className="sp-btn soft" onClick={() => setDialog(null)}>
                Keep this plan
              </button>
              <button
                className="sp-btn primary"
                onClick={() => {
                  clearSaved();
                  onStartOver();
                }}
              >
                Start new
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
