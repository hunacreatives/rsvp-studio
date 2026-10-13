import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { Chart } from "./model";

// One chart, kept in this browser. Every change is a new snapshot, so undo/redo is exact
// and nothing "comes back" after a delete. Saved to localStorage shortly after each change
// and when the tab is hidden. A backup file (exportBackup) is the copy that survives a
// cleared browser.

const KEY = "seating:v1:current";
const HISTORY = 100;

const cat = z.enum(["vip", "entourage", "bride", "groom", "family", "friends", "work", "court", "kids", "other"]);
const ChartSchema = z.object({
  v: z.literal(1),
  id: z.string(),
  title: z.string().max(120),
  names: z.string().max(120).optional(),
  // Older plans kept "keep apart" pairs; they're read as Must-apart rules.
  apart: z.array(z.tuple([z.string(), z.string()])).max(500).optional(),
  rules: z
    .array(z.object({ id: z.string(), a: z.string(), b: z.string(), kind: z.enum(["together", "apart"]), must: z.boolean() }))
    .max(1000)
    .optional(),
  bg: z.object({ key: z.string().max(40), x: z.number(), y: z.number(), w: z.number().positive(), h: z.number().positive(), opacity: z.number().min(0).max(1) }).optional(),
  kind: z.enum(["wedding", "debut", "lauriat", "party", "blank"]),
  room: z.object({ w: z.number().min(200).max(20000), h: z.number().min(200).max(20000) }),
  tables: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().max(40),
        note: z.string().max(60).optional(),
        shape: z.enum(["round", "rect", "head", "sweetheart", "ushape", "lshape", "cocktail"]),
        seats: z.number().int().min(1).max(40),
        x: z.number(),
        y: z.number(),
        rot: z.number(),
        w: z.number().optional(),
        h: z.number().optional(),
        locked: z.boolean().optional(),
        cat: cat.optional(),
        side: z.enum(["bride", "groom"]).optional(),
      }),
    )
    .max(300),
  objects: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["stage", "dance", "buffet", "dj", "bar", "cake", "photo", "entrance", "gifts", "lechon", "exit", "restroom", "pillar", "custom"]),
        label: z.string().max(40),
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
        rot: z.number(),
      }),
    )
    .max(100),
  groups: z.array(z.object({ id: z.string(), name: z.string().max(80), cat })).max(500),
  guests: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(120),
        groupId: z.string().nullable(),
        party: z.string(),
        tableId: z.string().nullable(),
        seat: z.number().int().nullable(),
        tags: z.array(z.enum(["senior", "kid", "vip", "plusone"])).optional(),
        meal: z.string().max(60).optional(),
      }),
    )
    .max(3000),
  updatedAt: z.number(),
});

export function parseChart(raw: unknown): Chart | null {
  const r = ChartSchema.safeParse(raw);
  if (!r.success) return null;
  const { apart, ...rest } = r.data;
  const c = rest as Chart;
  const ids = new Set(c.guests.map((g) => g.id));
  if (apart?.length) c.rules = [...(c.rules ?? []), ...apart.map(([a, b], i) => ({ id: `r${i}${a}`, a, b, kind: "apart" as const, must: true }))];
  if (c.rules) c.rules = c.rules.filter((x) => ids.has(x.a) && ids.has(x.b) && x.a !== x.b);
  // Repair rather than reject: a seat claimed twice, or at a table that's gone, is unseated.
  const tables = new Map(c.tables.map((t) => [t.id, t]));
  const taken = new Set<string>();
  for (const g of c.guests) {
    const t = g.tableId ? tables.get(g.tableId) : undefined;
    const key = `${g.tableId}:${g.seat}`;
    if (!t || g.seat == null || g.seat < 0 || g.seat >= t.seats || taken.has(key)) {
      g.tableId = null;
      g.seat = null;
    } else taken.add(key);
  }
  return c;
}

type SaveState = "saved" | "unsaved" | "blocked";
interface State {
  chart: Chart | null;
  past: Chart[];
  future: Chart[];
  save: SaveState;
  /** Bumped when a venue picture arrives, so the plan redraws. */
  bgv: number;
}

let state: State = { chart: null, past: [], future: [], save: "saved", bgv: 0 };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  emit();
};

export const getState = () => state;
export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useStore<T>(pick: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => pick(state), () => pick(state));
}

// ---- saving ------------------------------------------------------------------
let timer: ReturnType<typeof setTimeout> | undefined;
function writeNow() {
  clearTimeout(timer);
  timer = undefined;
  if (!state.chart) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state.chart));
    if (state.save !== "saved") set({ save: "saved" });
  } catch {
    set({ save: "blocked" });
  }
}
function scheduleSave() {
  if (state.save === "saved") set({ save: "unsaved" });
  clearTimeout(timer);
  timer = setTimeout(writeNow, 500);
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", writeNow);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && writeNow());
}

export function loadSaved(): Chart | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseChart(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

// ---- changes -----------------------------------------------------------------
/** Start fresh with a chart (no undo back past this point). */
export function open(chart: Chart) {
  set({ chart, past: [], future: [] });
  scheduleSave();
}

export function clearSaved() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing saved */
  }
  set({ chart: null, past: [], future: [] });
}

/** One undoable change. `fn` edits a copy. */
export function commit(fn: (c: Chart) => void) {
  const cur = state.chart;
  if (!cur) return;
  const next = structuredClone(cur);
  fn(next);
  next.updatedAt = Date.now();
  set({ chart: next, past: [...state.past.slice(-(HISTORY - 1)), cur], future: [] });
  scheduleSave();
}

// A drag is many small moves but one undo step.
let gestureBase: Chart | null = null;
export function beginGesture() {
  gestureBase = state.chart;
}
export function live(fn: (c: Chart) => void) {
  const cur = state.chart;
  if (!cur) return;
  const next = structuredClone(cur);
  fn(next);
  set({ chart: next });
}
export function endGesture() {
  const base = gestureBase;
  gestureBase = null;
  if (!base || base === state.chart || !state.chart) return;
  state.chart.updatedAt = Date.now();
  set({ past: [...state.past.slice(-(HISTORY - 1)), base], future: [] });
  scheduleSave();
}
export function cancelGesture() {
  if (gestureBase) set({ chart: gestureBase });
  gestureBase = null;
}

export function undo() {
  const prev = state.past[state.past.length - 1];
  if (!prev || !state.chart) return;
  set({ chart: prev, past: state.past.slice(0, -1), future: [state.chart, ...state.future] });
  scheduleSave();
}
export function redo() {
  const next = state.future[0];
  if (!next || !state.chart) return;
  set({ chart: next, past: [...state.past, state.chart], future: state.future.slice(1) });
  scheduleSave();
}

// ---- venue floor plan images -------------------------------------------------------
// Kept outside the chart (and its 100 undo snapshots): one compressed image per plan, in
// localStorage, in the account copy (cloud.ts) and in backup files.
const BG = "seating:bg:";
const bgCache = new Map<string, string>();
export function bgImage(key: string | undefined): string | null {
  if (!key) return null;
  if (bgCache.has(key)) return bgCache.get(key)!;
  try {
    const v = localStorage.getItem(BG + key);
    if (v) bgCache.set(key, v);
    return v;
  } catch {
    return null;
  }
}
export function setBgImage(key: string, dataUrl: string) {
  bgCache.set(key, dataUrl);
  try {
    localStorage.setItem(BG + key, dataUrl);
  } catch {
    /* too big for this browser's storage: kept for this visit and in the account copy */
  }
  set({ bgv: state.bgv + 1 });
}

export function exportBackup(chart: Chart) {
  const background = bgImage(chart.bg?.key);
  const blob = new Blob([JSON.stringify(background ? { ...chart, background } : chart, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(chart.title || "seating-plan").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "seating-plan"}.seating.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function readBackup(file: File): Promise<Chart | null> {
  try {
    const raw = JSON.parse(await file.text());
    const c = parseChart(raw);
    if (c?.bg && typeof raw.background === "string" && raw.background.startsWith("data:image/")) setBgImage(c.bg.key, raw.background);
    return c;
  } catch {
    return null;
  }
}
