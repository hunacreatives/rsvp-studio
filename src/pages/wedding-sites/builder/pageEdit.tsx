import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { EventContent, Gallery } from "../content/types";
import { createId } from "../content/id";
import type { SectionVisibility } from "../presentation/types";

// The builder's edit actions, shared by the panel and the page itself: one definition of every
// list (what a new item is, whether its order is saved, whether it can be moved, how few/many
// it may have), pure add/remove/move on content, and the context that carries undo, section
// switches and the "Removed … · Undo" message to whoever needs them.

export type ListKey = "hosts" | "keyPeople" | "schedule" | "accommodations" | "travelInformation" | "registryLinks" | "cashGifts" | "faqs" | "entourage" | "gallery";

type Item = { id: string; order?: number; [k: string]: any };

interface ListDef {
  get: (c: EventContent) => Item[];
  set: (c: EventContent, items: Item[]) => EventContent;
  create: (c: EventContent) => Item;
  /** Items carry `order` and the site sorts by it: renumbered after every change. */
  ordered?: boolean;
  /** False: the site puts these in its own order (the schedule goes by time). */
  movable?: boolean;
  min?: number;
  max?: number;
  /** How the "Removed …" message names one. */
  name: (it: Item) => string;
}

const firstGallery = (c: EventContent): Gallery => c.galleries[0] ?? { id: createId("gallery"), items: [] };
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export const LISTS: Record<ListKey, ListDef> = {
  hosts: { get: (c) => c.hosts as unknown as Item[], set: (c, items) => ({ ...c, hosts: items as unknown as EventContent["hosts"] }), create: () => ({ id: createId("host"), name: "" }), min: 1, name: (it) => str(it.name) || "a name" },
  keyPeople: { get: (c) => c.keyPeople as unknown as Item[], set: (c, items) => ({ ...c, keyPeople: items as unknown as EventContent["keyPeople"] }), create: () => ({ id: createId("person"), name: "" }), name: (it) => str(it.name) || "a person" },
  schedule: {
    get: (c) => c.schedule as unknown as Item[],
    set: (c, items) => ({ ...c, schedule: items as unknown as EventContent["schedule"] }),
    create: () => ({ id: createId("schedule"), startTime: "", label: "" }),
    movable: false,
    name: (it) => str(it.label) || "a schedule item",
  },
  accommodations: { get: (c) => c.accommodations as unknown as Item[], set: (c, items) => ({ ...c, accommodations: items as unknown as EventContent["accommodations"] }), create: () => ({ id: createId("accommodation"), name: "", addressLine: "" }), name: (it) => str(it.name) || "a place to stay" },
  travelInformation: { get: (c) => c.travelInformation as unknown as Item[], set: (c, items) => ({ ...c, travelInformation: items as unknown as EventContent["travelInformation"] }), create: () => ({ id: createId("travel"), title: "", body: "" }), name: (it) => str(it.title) || "travel info" },
  registryLinks: { get: (c) => c.registryLinks as unknown as Item[], set: (c, items) => ({ ...c, registryLinks: items as unknown as EventContent["registryLinks"] }), create: () => ({ id: createId("registry"), storeName: "", url: "" }), name: (it) => str(it.storeName) || "a gift link" },
  cashGifts: { get: (c) => (c.cashGifts ?? []) as unknown as Item[], set: (c, items) => ({ ...c, cashGifts: items as unknown as EventContent["cashGifts"] }), create: () => ({ id: createId("gift"), label: "GCash", accountName: "", accountNumber: "" }), name: (it) => str(it.label) || "a cash gift" },
  faqs: { get: (c) => c.faqs as unknown as Item[], set: (c, items) => ({ ...c, faqs: items as unknown as EventContent["faqs"] }), create: (c) => ({ id: createId("faq"), question: "", answer: "", order: c.faqs.length }), ordered: true, name: (it) => str(it.question) || "a question" },
  entourage: { get: (c) => (c.entourage ?? []) as unknown as Item[], set: (c, items) => ({ ...c, entourage: items as unknown as EventContent["entourage"] }), create: () => ({ id: createId("grp"), title: "", people: [] }), max: 20, name: (it) => str(it.title) || "a group" },
  gallery: {
    get: (c) => (c.galleries[0]?.items ?? []) as unknown as Item[],
    set: (c, items) => ({ ...c, galleries: [{ ...firstGallery(c), items: items as unknown as Gallery["items"] }, ...c.galleries.slice(1)] }),
    create: (c) => ({
      id: createId("gallery-item"),
      order: c.galleries[0]?.items.length ?? 0,
      image: { id: createId("image"), masterUrl: "", width: 1600, height: 1600, alt: "", focalPoint: { x: 0.5, y: 0.5 }, createdAt: new Date().toISOString() },
    }),
    ordered: true,
    name: (it) => str(it.caption) || "a photo",
  },
};

const renumber = (def: ListDef, items: Item[]) => (def.ordered ? items.map((it, i) => ({ ...it, order: i })) : items);

/** Add a new item (after `afterId`, else at the end). Returns the new content and the item's id, or null at the limit. */
export function addItem(c: EventContent, key: ListKey, afterId?: string): { content: EventContent; id: string } | null {
  const def = LISTS[key];
  const items = def.get(c);
  if (def.max && items.length >= def.max) return null;
  const item = def.create(c);
  const at = afterId ? items.findIndex((it) => it.id === afterId) + 1 : items.length;
  const next = [...items.slice(0, at || items.length), item, ...items.slice(at || items.length)];
  return { content: def.set(c, renumber(def, next)), id: item.id };
}

/** Remove one item (never below the list's minimum). */
export function removeItem(c: EventContent, key: ListKey, id: string): EventContent {
  const def = LISTS[key];
  const items = def.get(c);
  if (items.length <= (def.min ?? 0)) return c;
  return def.set(c, renumber(def, items.filter((it) => it.id !== id)));
}

/** Move one item up (-1) or down (1). */
export function moveItem(c: EventContent, key: ListKey, id: string, by: -1 | 1): EventContent {
  const def = LISTS[key];
  if (def.movable === false) return c;
  const items = def.get(c).slice();
  const i = items.findIndex((it) => it.id === id);
  const to = i + by;
  if (i < 0 || to < 0 || to >= items.length) return c;
  [items[i], items[to]] = [items[to], items[i]];
  return def.set(c, renumber(def, items));
}

// ---- one field, by its path (templates/shared/siteEdit Field) ----
// Inside a list item: "name", "people.2" (a name in an entourage group). Outside: from the
// content's root, "primaryLocation.name"; "story#1" is the story's second paragraph.

const PARA = /\n\s*\n/;
const getPath = (obj: any, parts: string[]) => parts.reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(obj: any, parts: string[], value: unknown): any {
  if (!parts.length) return value;
  const [k, ...rest] = parts;
  if (Array.isArray(obj)) {
    const copy = obj.slice();
    const i = Number(k);
    // a name cleared in a list of names: it's gone
    if (!rest.length && value === "" && typeof copy[i] === "string") copy.splice(i, 1);
    else copy[i] = setPath(copy[i], rest, value);
    return copy;
  }
  return { ...(obj ?? {}), [k]: setPath(obj?.[k], rest, value) };
}
const splitPath = (path: string) => {
  const [base, para] = path.split("#");
  return { parts: base.split("."), para: para === undefined ? -1 : Number(para) };
};

export function getField(c: EventContent, list: string | null, id: string | null, path: string): string {
  const { parts, para } = splitPath(path);
  const host = list && id ? LISTS[list as ListKey]?.get(c).find((it) => it.id === id) : c;
  const v = getPath(host, parts);
  const text = typeof v === "string" ? v : "";
  return para >= 0 ? (text.split(PARA)[para] ?? "").trim() : text;
}

export function setField(c: EventContent, list: string | null, id: string | null, path: string, value: string): EventContent {
  const { parts, para } = splitPath(path);
  const write = (host: any) => {
    if (para < 0) return setPath(host, parts, value);
    const paras = (getPath(host, parts) ?? "").split(PARA);
    paras[para] = value.replace(PARA, "\n");
    return setPath(host, parts, paras.map((p: string) => p.trim()).filter(Boolean).join("\n\n"));
  };
  if (!(list && id)) return write(c);
  const def = LISTS[list as ListKey];
  if (!def) return c;
  return def.set(c, def.get(c).map((it) => (it.id === id ? write(it) : it)));
}

/** "entourage:<group id>:people": a new empty name at the end of that group. Returns its path. */
export function addSub(c: EventContent, spec: string): { content: EventContent; id: string; path: string } | null {
  const [list, id, field] = spec.split(":");
  const def = LISTS[list as ListKey];
  const item = def?.get(c).find((it) => it.id === id);
  if (!def || !item || !Array.isArray(item[field])) return null;
  const n = item[field].length;
  return { content: def.set(c, def.get(c).map((it) => (it.id === id ? { ...it, [field]: [...it[field], ""] } : it))), id, path: `${field}.${n}` };
}

/**
 * The sections every design can switch off unless it lists its own (`definition.hideable`, in
 * page order). Keys are SectionVisibility's; the editor groups name some differently, mapped
 * by VIS_OF_GROUP.
 */
export const DEFAULT_HIDEABLE: { key: keyof SectionVisibility & string; label: string }[] = [
  { key: "hostIntro", label: "Your story" },
  { key: "schedule", label: "Schedule" },
  { key: "venue", label: "Venue" },
  { key: "gallery", label: "Photos" },
  { key: "accommodations", label: "Where to stay" },
  { key: "travelInformation", label: "Getting there" },
  { key: "registry", label: "Gifts" },
  { key: "faqs", label: "FAQs" },
  { key: "rsvp", label: "RSVP form" },
];

/** Editor group (data-edit-section) → the SectionVisibility key that shows or hides it. */
export const VIS_OF_GROUP: Record<string, string> = {
  hosts: "hostIntro",
  story: "hostIntro",
  dateVenue: "venue",
  travel: "travelInformation",
  schedule: "schedule",
  accommodations: "accommodations",
  gallery: "gallery",
  registry: "registry",
  faqs: "faqs",
  entourage: "entourage",
  rsvp: "rsvp",
};

// ---- context: undo, section switches, the undo message ----

export interface PageEdit {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** The next change starts its own undo step (instead of joining the typing before it). */
  checkpoint: () => void;
  hideSection: (keys: string | string[], on: boolean) => void;
  /** Move one of the design's movable sections (definition.sections) up or down the page. */
  moveSection: (key: string, by: -1 | 1) => void;
  /** "Removed Tita Bing · Undo" */
  notify: (text: string, undoable?: boolean) => void;
}

const Ctx = createContext<PageEdit | null>(null);
export const PageEditProvider = ({ value, children }: { value: PageEdit; children: ReactNode }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;
export const usePageEdit = () => useContext(Ctx);

/** The bottom message with Undo: stays 6s, longer while the pointer is on it. */
export function useUndoToast() {
  const [toast, setToast] = useState<{ text: string; undoable: boolean; n: number } | null>(null);
  const notify = useCallback((text: string, undoable = true) => setToast((t) => ({ text, undoable, n: (t?.n ?? 0) + 1 })), []);
  const close = useCallback(() => setToast(null), []);
  return { toast, notify, close };
}

export function UndoToast({ toast, onUndo, onClose }: { toast: { text: string; undoable: boolean; n: number } | null; onUndo: () => void; onClose: () => void }) {
  const [hold, setHold] = useState(false);
  const timer = useRef(0);
  useEffect(() => {
    if (!toast || hold) return;
    timer.current = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(timer.current);
  }, [toast, hold, onClose]);
  return (
    <div aria-live="polite" style={{ position: "fixed", left: "50%", bottom: 20, translate: "-50% 0", zIndex: 80, pointerEvents: "none" }}>
      {toast ? (
        <div
          key={toast.n}
          onPointerEnter={() => setHold(true)}
          onPointerLeave={() => setHold(false)}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 8px 8px 18px", borderRadius: 999, background: "var(--ink)", color: "#fff", fontSize: 14, fontWeight: 500, boxShadow: "0 12px 32px -12px rgba(0,7,39,.5)", pointerEvents: "auto", whiteSpace: "nowrap", maxWidth: "calc(100vw - 32px)" }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{toast.text}</span>
          {toast.undoable ? (
            <button
              type="button"
              onClick={() => {
                onUndo();
                onClose();
              }}
              style={{ minHeight: 34, padding: "0 14px", border: 0, borderRadius: 999, background: "rgba(255,255,255,.14)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Undo
            </button>
          ) : null}
          <button type="button" aria-label="Dismiss" onClick={onClose} style={{ width: 30, height: 30, border: 0, borderRadius: 999, background: "none", color: "rgba(255,255,255,.7)", fontSize: 16, cursor: "pointer" }}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
