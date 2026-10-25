import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Canvas, { type CanvasHandle, type CtxTarget, type Sel } from "./Canvas";
import ContextMenu, { type CtxItem } from "./ContextMenu";
import GuestPanel from "./GuestPanel";
import Inspector from "./Inspector";
import AddGuests from "./AddGuests";
import ExportDialog from "./ExportDialog";
import CommandBar, { type Command } from "./CommandBar";
import { planSeating } from "./autoseat";
import { checkPlan, type Issue } from "./check";
import PlanCheck from "./PlanCheck";
import { AddRoomPanel, AddTablePanel, SeatPrefsPanel, ViewPanel } from "./Tools";
import { nextTableLabel } from "./presets";
import { OBJ_LABEL, SHAPE_LABEL, footprint, freeSeats, ruleBreaks, tableSize, uid, type Chart, type ObjType, type Shape, type Table, type VenueObject } from "./model";
import { fmtLen, parseLen, type Units } from "./units";
import RulesDialog from "./Rules";
import RoomDialog from "./RoomDialog";
import { fitTablesToRoom } from "./fit";
import { bgImage } from "./store";
import { beginGesture, clearSaved, commit, currentChart, endGesture, live, open as openChart, readBackup, redo, undo, useStore } from "./store";
import type { DropTarget } from "./drag";
import { trackEvent } from "@/lib/analytics";
// Loaded only when someone signs up from here (keeps it out of the shared bundle).
const AuthModal = lazy(() => import("@/pages/home/components/AuthModal"));
import { deleteCloud, listCloud, loadCloud, saveCloud, shareLink, stopSharing, useSignedIn, type CloudRow, type CloudState } from "./cloud";
import ShareDialog from "./ShareDialog";
import SendSeats from "./SendSeats";
import DayOfDialog from "./DayOfDialog";
import { dayChanges, type DayRow } from "./checkin";
import { replyIssues, syncReplies, type ReplyItem } from "./replies";
import { loadInvitees, loadReplies, myEvents } from "./website";
import { exportBackup } from "./store";
import NeedHand from "@/components/NeedHand";
import { MESA_ANSWERS } from "@/lib/helpAnswers";
import GroupCard, { type AlignHow } from "./GroupCard";
import { alignMoves, itemsOf } from "./guides";

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
  help: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M7.8 7.8a2.3 2.3 0 114 1.6c-.8.6-1.8 1-1.8 2.2M10 14.2h.01" />
    </>
  ),
  tape: <path d="M2 13l11-11 5 5-11 11zM5 10l1.5 1.5M8 7l1.5 1.5M11 4l1.5 1.5" />,
  pick: <path d="M3 3h4M3 3v4M17 3h-4M17 3v4M3 17h4M3 17v-4M17 17h-4M17 17v-4M8 8l6 2.5-2.5 1-1 2.5z" />,
  rules: (
    <>
      <circle cx="5.5" cy="10" r="2.5" />
      <circle cx="14.5" cy="10" r="2.5" />
      <path d="M8 10h4" />
    </>
  ),
  share: <path d="M10 13V3M6.5 6.5L10 3l3.5 3.5M4 11v5h12v-5" />,
  room: (
    <>
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <path d="M3 9h5v7" />
    </>
  ),
  view: (
    <>
      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
      <circle cx="10" cy="10" r="2.4" />
    </>
  ),
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  // The plan check (check.ts): worked out as the plan changes; opened from the guest panel.
  // Replies from the linked event (Premium): what the plan check should raise about them.
  const [replyItems, setReplyItems] = useState<ReplyItem[]>([]);
  // Metres or feet and inches, for distances and sizes (kept per device, like names).
  const [units, setUnitsState] = useState<Units>(() => {
    try {
      return localStorage.getItem("seating:units") === "ft" ? "ft" : "m";
    } catch {
      return "m";
    }
  });
  const setUnits = (v: Units) => {
    setUnitsState(v);
    try {
      localStorage.setItem("seating:units", v);
    } catch {
      /* fine */
    }
  };
  const issues = useMemo(() => checkPlan(chart, replyIssues(chart, replyItems), units), [chart, replyItems, units]);
  const [checkOpen, setCheckOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; undo?: boolean; action?: { label: string; run(): void } } | null>(null);
  const [dialog, setDialog] = useState<null | "add" | "export" | "cmd" | "reset" | "rules" | "room" | "send" | "dayof">(null);
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
  // Grid, rulers and snapping (kept per device, like names and units).
  const pref = <T extends string>(key: string, ok: readonly T[], fallback: T): T => {
    try {
      const v = localStorage.getItem(key) as T | null;
      return v && ok.includes(v) ? v : fallback;
    } catch {
      return fallback;
    }
  };
  const keep = (key: string, v: string) => {
    try {
      localStorage.setItem(key, v);
    } catch {
      /* fine */
    }
  };
  const [gridPref, setGridState] = useState(() => pref("seating:grid", ["off", "half", "m"] as const, "m"));
  const [rulers, setRulersState] = useState(() => pref("seating:rulers", ["on", "off"] as const, "off") === "on");
  const [snapOn, setSnapState] = useState(() => pref("seating:snap", ["on", "off"] as const, "on") === "on");
  const [walkways, setWalkwaysState] = useState(() => !window.matchMedia("(pointer: coarse)").matches && pref("seating:walkways", ["on", "off"] as const, "off") === "on");
  // (Not remembered on phones: it's a check you run, and fills a small screen.)
  const setWalkways = (v: boolean) => (setWalkwaysState(v), !window.matchMedia("(pointer: coarse)").matches && keep("seating:walkways", v ? "on" : "off"));
  // Tape measure: on while measuring; the last line stays until cleared.
  const [measuring, setMeasuring] = useState(false);
  const [tape, setTape] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [realLen, setRealLen] = useState("");
  const setGrid = (v: typeof gridPref) => (setGridState(v), keep("seating:grid", v));
  const setRulers = (v: boolean) => (setRulersState(v), keep("seating:rulers", v ? "on" : "off"));
  const setSnap = (v: boolean) => (setSnapState(v), keep("seating:snap", v ? "on" : "off"));
  // Several tables and things picked at once (2+), and Select mode (phones, or the Select button).
  const [multi, setMulti] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const multiSet = useMemo(() => new Set(multi), [multi]);
  const [menu, setMenu] = useState<null | "plan" | "seat" | "table" | "room" | "view">(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [ctx, setCtx] = useState<null | { x: number; y: number; title?: string; sub?: string; items: CtxItem[] }>(null);
  const closeCtx = useCallback(() => setCtx(null), []);
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
  const shareNow = async () => {
    if (!userId) return needAccount("share");
    setShare({ url: null, busy: true });
    const url = await shareLink(chart);
    setShare({ url, busy: false });
    if (url) trackEvent("seating_share");
  };
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
  const tipsShown = tips && chart.guests.length > 0;

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
  /** A short message at the bottom of the plan; `undo` adds an Undo button and `action` a button
   *  of its own (both stay longer). */
  const say = useCallback((msg: string, opts: { undo?: boolean; action?: { label: string; run(): void } } = {}) => {
    setToast({ text: msg, undo: opts.undo, action: opts.action });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), opts.undo || opts.action ? 6000 : 2800);
  }, []);
  /** Something locked in place was dragged, turned or nudged: say so, with a way to unlock it. */
  const lockedNote = useCallback(
    (kind: "table" | "object", id: string) => {
      const it = kind === "table" ? chart.tables.find((t) => t.id === id) : chart.objects.find((o) => o.id === id);
      if (!it) return;
      const name = kind === "table" ? tableName((it as Table).label) : (it as VenueObject).label;
      say(`${name} is locked in place.`, {
        action: {
          label: "Unlock",
          run: () =>
            commit((c) => {
              const x = kind === "table" ? c.tables.find((t) => t.id === id) : c.objects.find((o) => o.id === id);
              if (x) x.fixed = undefined;
            }),
        },
      });
    },
    [chart, say],
  );
  // Seat everyone's one-line result fades after a few seconds (unless its details are open).
  useEffect(() => {
    if (!summary || detailsOpen) return;
    const t = window.setTimeout(() => setSummary(null), 7000);
    return () => window.clearTimeout(t);
  }, [summary, detailsOpen]);

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
        // A seat Seat everyone gave away was a can't-come guest's: they come off it.
        const taken = new Set(plan.moves.map((m) => `${m.tableId}:${m.seat}`));
        for (const g of c.guests) if (g.reply === "no" && g.tableId && taken.has(`${g.tableId}:${g.seat}`)) Object.assign(g, { tableId: null, seat: null });
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

  // The last guest gets a seat (by Seat everyone, once its seats have filled, or by hand):
  // the gold wave. Not when a plan opens already full.
  const [wave, setWave] = useState(0);
  const allSeated = chart.guests.length > 0 && hidden.size === 0 && chart.guests.every((g) => g.tableId);
  const wasAll = useRef<boolean | null>(null);
  useEffect(() => {
    if (wasAll.current === false && allSeated) setWave((w) => w + 1);
    wasAll.current = allSeated;
  }, [allSeated]);

  // A floor plan added while starting: Room & venue opens once the seats have filled.
  // (Read once into a ref, so running the effect twice in development still opens it.)
  const openRoom = useRef<boolean | null>(null);
  useEffect(() => {
    if (openRoom.current === null) {
      try {
        openRoom.current = sessionStorage.getItem("seating:open-room") === "1";
        sessionStorage.removeItem("seating:open-room");
      } catch {
        openRoom.current = false;
      }
    }
    if (!openRoom.current) return;
    const t = window.setTimeout(() => {
      openRoom.current = false;
      setDialog((d) => d ?? "room");
    }, autoSeat ? 3200 : 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- replies from the event (Premium) ----------------------------------------
  // When the plan opens, and when the tab is looked at again (at most every 5 minutes), the
  // event's replies are read and anything that changed is marked: can't come, coming after
  // all, not replied. Nothing is unseated here; the host clears can't-come seats with one tap.
  const [eventPremium, setEventPremium] = useState<boolean | null>(null);
  const lastSync = useRef(0);
  const siteEvent = chart.site?.eventId ?? null;
  useEffect(() => {
    if (!siteEvent || !userId) return setEventPremium(null);
    let alive = true;
    myEvents(userId).then((list) => alive && setEventPremium(!!list.find((e) => e.id === siteEvent)?.premium));
    return () => {
      alive = false;
    };
  }, [siteEvent, userId]);
  const syncNow = useCallback(async () => {
    const c0 = currentChart();
    const ev = c0?.site?.eventId;
    if (!ev || animating.current) return;
    lastSync.current = Date.now();
    const [inv, rs] = await Promise.all([loadInvitees(ev), loadReplies(ev)]);
    const now = currentChart();
    if (!inv || !rs || !now || now.site?.eventId !== ev) return;
    // Worked out on a copy first, so an unchanged plan isn't touched (no undo step, no save).
    const test = structuredClone(now);
    const res = syncReplies(test, inv, rs);
    setReplyItems(res.items);
    if (!res.changed) return;
    commit((c) => void syncReplies(c, inv, rs));
    if (res.back.length) say(`${res.back.length} ${res.back.length === 1 ? "household is" : "households are"} coming after all.`);
  }, [say]);
  useEffect(() => {
    if (!eventPremium) return;
    void syncNow();
    const onShow = () => document.visibilityState === "visible" && Date.now() - lastSync.current > 5 * 60_000 && void syncNow();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [eventPremium, syncNow]);
  // After the day (or during it): walk-ins and moves the welcome team made, to bring into the
  // plan in one step. Read once when the plan opens.
  const [dayRows, setDayRows] = useState<DayRow[]>([]);
  useEffect(() => {
    if (!userId || !siteEvent) return;
    let alive = true;
    dayChanges(chart.id, chart.site?.dayAt).then((r) => alive && setDayRows(r));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, siteEvent, chart.id]);
  const bringDayIn = () => {
    const rows = dayRows;
    let placed = 0;
    commit((c) => {
      const free = (tid: string, seat: number | null) => seat !== null && !c.guests.some((g) => g.tableId === tid && g.seat === seat);
      let group = c.groups.find((g) => g.name === "Walk-ins");
      for (const r of rows) {
        if (r.guest_id.startsWith("w")) {
          if (c.guests.some((g) => g.id === r.guest_id)) continue;
          if (!group) {
            group = { id: uid("g"), name: "Walk-ins", cat: "other" };
            c.groups.push(group);
          }
          const ok = !!r.table_id && c.tables.some((t) => t.id === r.table_id) && free(r.table_id, r.seat);
          c.guests.push({ id: r.guest_id, name: r.name ?? "Walk-in", groupId: group.id, party: `w:${r.guest_id.split("-")[0]}`, tableId: ok ? r.table_id : null, seat: ok ? r.seat : null });
          placed++;
        } else {
          const g = c.guests.find((x) => x.id === r.guest_id);
          if (g && r.table_id && c.tables.some((t) => t.id === r.table_id) && free(r.table_id, r.seat)) {
            Object.assign(g, { tableId: r.table_id, seat: r.seat });
            placed++;
          }
        }
      }
      if (c.site) c.site.dayAt = rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), c.site.dayAt ?? "");
    });
    setDayRows([]);
    say(`${placed} day-of ${placed === 1 ? "change" : "changes"} brought into the plan.`, { undo: true });
  };

  // Can't come, still seated (kept tables are the host's to change): one tap frees them.
  const lockedIds = new Set(chart.tables.filter((t) => t.locked).map((t) => t.id));
  const cantCome = chart.guests.filter((g) => g.reply === "no" && g.tableId && !lockedIds.has(g.tableId));
  const cantComeHouseholds = new Set(cantCome.map((g) => g.party)).size;
  const clearCantCome = () => {
    const ids = new Set(cantCome.map((g) => g.id));
    const n = ids.size;
    commit((c) => c.guests.forEach((g) => ids.has(g.id) && Object.assign(g, { tableId: null, seat: null })));
    say(`${n} ${n === 1 ? "seat is" : "seats are"} free for others.`, { undo: true });
  };

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
        ? `${r.overflow} ${r.overflow === 1 ? "table doesn’t" : "tables don’t"} fit and ${r.overflow === 1 ? "is" : "are"} waiting just outside the room. Remove a table or make the room bigger.`
        : `Moved ${r.moved} ${r.moved === 1 ? "table" : "tables"} to fit the room${r.inkUsed ? ", around the walls and pillars on your plan" : ""}. Undo if you preferred it before.`,
    );
  }, [chart, say]);

  // ---- adding things -------------------------------------------------------------
  /** The nearest empty spot to the middle of the view, so new things never land on top of
   *  a table, the stage or the dance floor. */
  const freeSpot = (w: number, h: number, near?: { x: number; y: number }) => {
    const c0 = near ?? canvas.current?.center() ?? { x: chart.room.w / 2, y: chart.room.h / 2 };
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

  const addTable = (shape: Shape, seats: number, near?: { x: number; y: number }) => {
    const id = uid("t");
    const label = shape === "head" ? "Head table" : shape === "sweetheart" ? "Sweetheart" : nextTableLabel(chart.tables);
    const draft = { id, label, shape, seats, x: 0, y: 0, rot: 0 };
    const sz = tableSize(draft);
    const { grow = 0, ...at } = freeSpot(sz.w, sz.h, near);
    commit((c) => {
      growRoom(c, grow);
      c.tables.push({ ...draft, ...at });
    });
    if (grow) window.setTimeout(() => canvas.current?.fit(), 40);
    pulseTable(id);
    setSel({ kind: "table", id });
    setMenu(null);
  };
  const addObject = (type: ObjType, near?: { x: number; y: number }) => {
    const size: Record<ObjType, [number, number]> = { stage: [800, 240], dance: [560, 420], buffet: [500, 80], dj: [220, 90], bar: [300, 80], cake: [70, 70], photo: [220, 90], entrance: [320, 50], gifts: [160, 70], lechon: [180, 80], exit: [200, 50], restroom: [300, 200], pillar: [60, 60], custom: [300, 200] };
    const id = uid("o");
    const { grow = 0, ...at } = freeSpot(size[type][0], size[type][1], near);
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

  // ---- right-click ---------------------------------------------------------------
  const tableName = (label: string) => (/^\d+[a-z]?$/i.test(label) ? `Table ${label}` : label);
  const backTo = (n: number, what: string) => `${what}. ${n} ${n === 1 ? "guest is" : "guests are"} back in Not seated.`;
  const unseat = (ids: string[], what: string) => {
    const n = chart.guests.filter((g) => ids.includes(g.id) && g.tableId).length;
    if (!n) return;
    commit((c) => c.guests.forEach((g) => ids.includes(g.id) && Object.assign(g, { tableId: null, seat: null })));
    say(backTo(n, what), { undo: true });
  };
  const turn = (kind: "table" | "object", id: string) =>
    commit((c) => {
      const it = kind === "table" ? c.tables.find((x) => x.id === id) : c.objects.find((x) => x.id === id);
      if (it) it.rot = (it.rot + 45) % 360;
    });
  const tableItems = (tableId: string, seat?: number): CtxItem[] => {
    const t = chart.tables.find((x) => x.id === tableId);
    if (!t) return [];
    const here = chart.guests.filter((g) => g.tableId === t.id);
    return [
      ...(armed ? [{ label: `Seat ${armed.label} here`, run: () => place(armed.ids, { tableId: t.id, seat }) }, "sep" as const] : []),
      { label: `Edit ${tableName(t.label)}`, run: () => setSel({ kind: "table", id: t.id }) },
      {
        label: "Duplicate",
        run: () => {
          const id = uid("t");
          commit((c) => {
            const nums = c.tables.map((x) => Number(x.label)).filter(Number.isFinite);
            c.tables.push({ ...structuredClone(t), id, x: t.x + 60, y: t.y + 60, locked: undefined, fixed: undefined, label: /^\d+$/.test(t.label) ? String(Math.max(0, ...nums) + 1) : `${t.label} 2` });
          });
          pulseTable(id);
        },
      },
      ...(t.fixed ? [] : [{ label: "Turn 45°", run: () => turn("table", t.id) }]),
      { label: "Lock in place", hint: "Can’t be moved or turned", checked: !!t.fixed, run: () => commit((c) => (c.tables.find((x) => x.id === t.id)!.fixed = t.fixed ? undefined : true)) },
      { label: "Keep these guests", hint: "Seat everyone won’t change who sits\u00a0here", checked: !!t.locked, run: () => commit((c) => (c.tables.find((x) => x.id === t.id)!.locked = t.locked ? undefined : true)) },
      ...(!here.length || t.spare ? [{ label: "Spare table", hint: "Kept empty for walk-ins", checked: !!t.spare, run: () => commit((c) => (c.tables.find((x) => x.id === t.id)!.spare = t.spare ? undefined : true)) }] : []),
      "sep",
      ...(here.length ? [{ label: "Clear this table", run: () => unseat(here.map((g) => g.id), "Table cleared") }] : []),
      {
        label: "Delete this table",
        danger: true,
        run: () => {
          commit((c) => {
            c.tables = c.tables.filter((x) => x.id !== t.id);
            for (const g of c.guests) if (g.tableId === t.id) Object.assign(g, { tableId: null, seat: null });
          });
          if (sel?.id === t.id) setSel(null);
          say(here.length ? backTo(here.length, "Table deleted") : "Table deleted.", { undo: true });
        },
      },
    ];
  };
  /** Shift-click, a box on the floor, or a tap in Select mode: add, take off, or replace. */
  const onPick = (ids: string[], how: "toggle" | "add" | "set") => {
    const base = multi.length ? multi : sel && sel.kind !== "guest" ? [sel.id] : [];
    let next = how === "set" ? ids : [...base];
    if (how === "add") for (const id of ids) if (!next.includes(id)) next.push(id);
    if (how === "toggle") for (const id of ids) next = next.includes(id) ? next.filter((x) => x !== id) : [...next, id];
    if (next.length >= 2) {
      setMulti(next);
      setSel(null);
    } else {
      setMulti([]);
      const one = next[0];
      setSel(one ? { kind: chart.tables.some((t) => t.id === one) ? "table" : "object", id: one } : null);
    }
  };
  const deleteMany = (ids: string[]) => {
    const off = chart.guests.filter((g) => g.tableId && ids.includes(g.tableId)).length;
    commit((c) => {
      c.tables = c.tables.filter((t) => !ids.includes(t.id));
      c.objects = c.objects.filter((o) => !ids.includes(o.id));
      for (const g of c.guests) if (g.tableId && ids.includes(g.tableId)) Object.assign(g, { tableId: null, seat: null });
    });
    setMulti([]);
    say(off ? backTo(off, `${ids.length} deleted`) : `${ids.length} deleted.`, { undo: true });
  };
  /** Picked tables in tidy rows: `perRow` across, exactly `walk` cm of clear space between
   *  neighbouring chairs (each table at its own size), in reading order. The block starts where
   *  the group was and moves to the nearest clear floor if it would land on other tables or
   *  things; tables locked in place stay put and are kept clear of. */
  const arrangePicked = (perRow: number, walk: number) => {
    const ts = chart.tables.filter((t) => multi.includes(t.id) && !t.fixed);
    if (ts.length < 2) return;
    const feet = new Map(ts.map((t) => [t.id, footprint(t)]));
    const fw = (t: Table) => feet.get(t.id)!.x1 - feet.get(t.id)!.x0;
    const fh = (t: Table) => feet.get(t.id)!.y1 - feet.get(t.id)!.y0;
    const ch = Math.max(...ts.map(fh));
    // Reading order: rows top to bottom (within half a table), then left to right.
    const order = [...ts].sort((a, b) => (Math.abs(a.y - b.y) > ch / 2 ? a.y - b.y : a.x - b.x));
    // Each table's footprint box, relative to the block's top-left.
    const rel: { t: Table; x0: number; y0: number; w: number; h: number }[] = [];
    let y = 0;
    for (let r = 0; r * perRow < order.length; r++) {
      const row = order.slice(r * perRow, r * perRow + perRow);
      const rh = Math.max(...row.map(fh));
      let x = 0;
      for (const t of row) {
        rel.push({ t, x0: x, y0: y + (rh - fh(t)) / 2, w: fw(t), h: fh(t) });
        x += fw(t) + walk;
      }
      y += rh + walk;
    }
    const others = itemsOf(chart, new Set(ts.map((t) => t.id))).map((i) => i.foot);
    const room = chart.room;
    const clearAt = (ox: number, oy: number) =>
      rel.every((b) => {
        const x0 = ox + b.x0;
        const y0 = oy + b.y0;
        const x1 = x0 + b.w;
        const y1 = y0 + b.h;
        // Half the walkway from anything else, too, and inside the walls.
        const m = walk / 2;
        if (x0 < 0 || y0 < 0 || x1 > room.w || y1 > room.h) return false;
        return others.every((o) => !(x0 - m < o.x1 && x1 + m > o.x0 && y0 - m < o.y1 && y1 + m > o.y0));
      });
    const start = { x: Math.min(...ts.map((t) => feet.get(t.id)!.x0)), y: Math.min(...ts.map((t) => feet.get(t.id)!.y0)) };
    let at: { x: number; y: number } | null = clearAt(start.x, start.y) ? start : null;
    for (let r = 20; !at && r < Math.hypot(room.w, room.h); r += 20) {
      const steps = Math.max(8, Math.round((2 * Math.PI * r) / 40));
      for (let i = 0; i < steps && !at; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = Math.round((start.x + Math.cos(a) * r) / 10) * 10;
        const yy = Math.round((start.y + Math.sin(a) * r) / 10) * 10;
        if (clearAt(x, yy)) at = { x, y: yy };
      }
    }
    // No clear floor anywhere: leave them where they are rather than pile them onto others.
    if (!at) return say("There isn’t clear floor for them in rows like that. Try a narrower walkway, or make the room bigger.");
    const origin = at;
    commit((c) => {
      for (const b of rel) {
        const f = feet.get(b.t.id)!;
        const it = c.tables.find((x) => x.id === b.t.id)!;
        // The footprint isn't always centred on the table (head tables): keep the offset.
        it.x = Math.round((origin.x + b.x0 + (b.t.x - f.x0)) * 10) / 10;
        it.y = Math.round((origin.y + b.y0 + (b.t.y - f.y0)) * 10) / 10;
      }
    });
    if (at !== start) say("Arranged, and moved a little to clear the other tables.", { undo: true });
  };
  /** The venue plan's real scale, from a measurement: what was measured is really `cm` long.
   *  Scales the picture about where the tape started; tables and the room stay as they are. */
  const scalePlan = (cm: number) => {
    if (!tape || !chart.bg) return;
    const measured = Math.hypot(tape.x2 - tape.x1, tape.y2 - tape.y1);
    if (measured < 1 || cm < 1) return;
    const f = cm / measured;
    commit((c) => {
      const bg = c.bg!;
      Object.assign(bg, { x: Math.round(tape.x1 + (bg.x - tape.x1) * f), y: Math.round(tape.y1 + (bg.y - tape.y1) * f), w: Math.round(bg.w * f), h: Math.round(bg.h * f) });
    });
    setTape({ ...tape, x2: Math.round(tape.x1 + (tape.x2 - tape.x1) * f), y2: Math.round(tape.y1 + (tape.y2 - tape.y1) * f) });
    setRealLen("");
    say("Floor plan scaled. Check a second measurement to be sure.", { undo: true });
  };
  const alignPicked = (how: AlignHow) => {
    const items = itemsOf(chart, new Set()).filter((i) => multi.includes(i.id));
    const moves = alignMoves(items, how);
    commit((c) => {
      for (const it of [...c.tables, ...c.objects]) {
        const m = moves.get(it.id);
        if (m && !it.fixed) (it.x = Math.round((it.x + m.dx) * 10) / 10, it.y = Math.round((it.y + m.dy) * 10) / 10);
      }
    });
  };

  const onCanvasMenu = (target: CtxTarget, world: { x: number; y: number }, at: { x: number; y: number }) => {
    if (target.kind === "seat" && target.guestId) {
      const g = chart.guests.find((x) => x.id === target.guestId);
      const t = chart.tables.find((x) => x.id === target.tableId);
      if (!g || !t) return;
      const first = g.name.split(" ")[0];
      const household = chart.guests.filter((x) => x.party === g.party);
      return setCtx({
        ...at,
        title: g.name,
        sub: `${tableName(t.label)}, seat ${target.seat + 1}`,
        items: [
          ...(armed && !armed.ids.includes(g.id) ? [{ label: `Seat ${armed.label} here`, hint: `${first} moves to Not seated if there’s no room`, run: () => place(armed.ids, { tableId: t.id, seat: target.seat }) }, "sep" as const] : []),
          { label: `Open ${first}’s card`, hint: "Meal, notes, seating rules", run: () => setSel({ kind: "guest", id: g.id }) },
          { label: `Move ${first}`, run: () => arm([g.id], g.name, `u:${g.id}`) },
          ...(household.length > 1 ? [{ label: `Move the household`, hint: `${household.length} together`, run: () => arm(household.map((x) => x.id), `${first}’s household`, `p:${g.party}`) }] : []),
          { label: "Take off this table", run: () => unseat([g.id], `${first} taken off ${tableName(t.label)}`) },
          "sep",
          { label: `Edit ${tableName(t.label)}`, run: () => setSel({ kind: "table", id: t.id }) },
        ],
      });
    }
    if (target.kind === "seat" || target.kind === "table") {
      const id = target.kind === "seat" ? target.tableId : target.id;
      const t = chart.tables.find((x) => x.id === id);
      if (!t) return;
      const n = chart.guests.filter((g) => g.tableId === t.id).length;
      return setCtx({ ...at, title: tableName(t.label), sub: `${n} of ${t.seats} seated`, items: tableItems(t.id, target.kind === "seat" ? target.seat : undefined) });
    }
    if (target.kind === "object") {
      const o = chart.objects.find((x) => x.id === target.id);
      if (!o) return;
      return setCtx({
        ...at,
        title: o.label,
        items: [
          { label: "Edit", run: () => setSel({ kind: "object", id: o.id }) },
          ...(o.fixed ? [] : [{ label: "Turn 45°", run: () => turn("object", o.id) }]),
          { label: "Lock in place", hint: "Can’t be moved, turned or resized", checked: !!o.fixed, run: () => commit((c) => (c.objects.find((x) => x.id === o.id)!.fixed = o.fixed ? undefined : true)) },
          "sep",
          {
            label: "Delete",
            danger: true,
            run: () => {
              commit((c) => (c.objects = c.objects.filter((x) => x.id !== o.id)));
              if (sel?.id === o.id) setSel(null);
              say(`${o.label} deleted.`, { undo: true });
            },
          },
        ],
      });
    }
    setCtx({
      ...at,
      items: [
        { label: "Add a round table here", hint: "10 seats", run: () => addTable("round", 10, world) },
        { label: "Add a long table here", hint: "10 seats", run: () => addTable("rect", 10, world) },
        { label: "Add the dance floor here", run: () => addObject("dance", world) },
        "sep",
        { label: "Fit to screen", run: () => canvas.current?.fit() },
        ...(canUndo ? [{ label: "Undo", hint: "⌘Z", run: doUndo }] : []),
      ],
    });
  };
  /** Right-click on a group, household or guest in the list. */
  const onListMenu = (ids: string[], label: string, at: { x: number; y: number }) => {
    const people = chart.guests.filter((g) => ids.includes(g.id));
    const seated = people.filter((g) => g.tableId);
    const one = people.length === 1 ? people[0] : null;
    setCtx({
      ...at,
      title: label,
      sub: seated.length === people.length ? (people.length === 1 ? "Seated" : "All seated") : seated.length ? `${seated.length} of ${people.length} seated` : "Not seated",
      items: [
        ...(seated.length ? [{ label: "Show on the plan", run: () => focusGuest(seated[0].id) }] : []),
        { label: seated.length === people.length ? "Move" : "Seat", hint: "Then tap a table", run: () => arm((seated.length === people.length ? people : people.filter((g) => !g.tableId)).map((g) => g.id), label, `m:${ids.join(",")}`) },
        ...(one ? [{ label: "Open guest card", run: () => setSel({ kind: "guest", id: one.id }) }] : []),
        ...(seated.length ? ["sep" as const, { label: people.length === 1 ? "Take off their table" : "Take off their tables", run: () => unseat(seated.map((g) => g.id), `${label} taken off`) }] : []),
      ],
    });
  };

  // ---- keyboard ------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Escape closes whatever is open on top first: a dialog, a menu.
      if (e.key === "Escape" && (dialog || share || plans || gate || menu)) {
        if (dialog === "cmd") return; // the command bar handles its own
        setDialog(null);
        setShare(null);
        setPlans(null);
        setGate(null);
        setMenu(null);
        return;
      }
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
        setMulti([]);
        setPicking(false);
        setMeasuring(false);
        setTape(null);
        return;
      }
      // Several picked: arrows move them all (not those locked in place), Delete removes them.
      if (multi.length > 1) {
        const step = e.shiftKey ? 50 : 10;
        const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (d[e.key]) {
          e.preventDefault();
          commit((c) => {
            for (const it of [...c.tables, ...c.objects]) if (multi.includes(it.id) && !it.fixed) (it.x += d[e.key][0], it.y += d[e.key][1]);
          });
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          deleteMany(multi);
          return;
        }
      }
      if (!sel || sel.kind === "guest") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const off = sel.kind === "table" ? chart.guests.filter((g) => g.tableId === sel.id).length : 0;
        if (off) say(`Table deleted. ${off} ${off === 1 ? "guest is" : "guests are"} back in Not seated.`, { undo: true });
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
      const pinned = sel.kind === "table" ? chart.tables.find((t) => t.id === sel.id)?.fixed : chart.objects.find((o) => o.id === sel.id)?.fixed;
      if (pinned && (d[e.key] || e.key.toLowerCase() === "r")) {
        e.preventDefault();
        lockedNote(sel.kind, sel.id);
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, dialog, share, plans, gate, menu, chart, lockedNote, multi]);

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
      section: "Tables",
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
      return { id: `g${g.id}`, section: "Guests", label: g.name, hint: t ? (/^\d+$/.test(t.label) ? `Table ${t.label}` : t.label) : "Not seated", run: () => focusGuest(g.id) };
    });
    const act = (id: string, label: string, run: () => void, hint?: string): Command => ({ id: `a-${id}`, section: "Do", label, hint, run });
    const actions: Command[] = [
      act("seat", "Seat everyone", () => seatEveryone()),
      act("reseat", "Seat everyone again from scratch", () => seatEveryone(true)),
      act("check", "Check my plan", () => {
        setCheckOpen(true);
        setSheetOpen(true);
      }),
      act("add", "Add guests", () => setDialog("add")),
      act("rules", "Seating rules", () => setDialog("rules"), broken ? `${broken} not kept` : undefined),
      act("round", "Add a round table", () => addTable("round", 10)),
      act("long", "Add a long table", () => addTable("rect", 10)),
      act("room", "Room size & venue floor plan", () => setDialog("room")),
      act("share", "Share a view-only link", () => shareNow()),
      act("send", "Send seats to your website", () => (userId ? setDialog("send") : setAuthOpen(true))),
      act("dayof", "Day-of check-in", () => (userId ? setDialog("dayof") : setAuthOpen(true))),
      act("dl", "Download or print", () => openExport()),
      act("fit", "Fit to screen", () => canvas.current?.fit()),
      act("names", "Show full names on seats", () => setNames("full")),
      act("initials", "Show initials on seats", () => setNames("initials")),
      act("look-b", "Look: Paper & ink", () => setLook("b")),
      act("look-a", "Look: Blueprint", () => setLook("a")),
      act("look-c", "Look: Evening", () => setLook("c")),
      act("undo", "Undo", undo, "⌘Z"),
    ];
    return [...actions, ...tables, ...guests];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, seatEveryone]);

  const fixIssue = (i: Issue) => {
    if (!i.fix) return;
    commit((c) => i.fix!.apply(c));
    if (i.tableIds[0]) pulseTable(i.tableIds[0]);
    say("Done. Undo if you’d rather not.");
    trackEvent("seating_check_fix", { kind: i.id.split(":")[0] });
  };
  const showIssue = (i: Issue) => {
    if (!i.tableIds[0]) return;
    canvas.current?.focus(i.tableIds[0]);
    pulseTable(i.tableIds[0]);
    setSheetOpen(false);
  };
  // Under the search: Seat everyone's result as one quiet line (details on request), and the
  // plan check as one chip that opens its list in place.
  const fixes = issues.filter((i) => i.level === "fix").length;
  const looks = issues.length - fixes;
  const anySeated = chart.guests.some((g) => g.tableId);
  const summaryNode =
    summary || anySeated || cantCome.length || dayRows.length || (siteEvent && eventPremium === false) ? (
      <div className="sp-status">
        {dayRows.length ? (
          <div className="sp-note sp-note--reply" role="status">
            <div className="sp-note__row">
              <span className="sp-note__t">
                {dayRows.length} day-of {dayRows.length === 1 ? "change" : "changes"} from your team
              </span>
              <span className="sp-note__acts">
                <button className="sp-link" onClick={bringDayIn}>
                  Bring into plan
                </button>
              </span>
            </div>
          </div>
        ) : null}
        {cantCome.length ? (
          <div className="sp-note sp-note--reply" role="status">
            <div className="sp-note__row">
              <span className="sp-note__t">
                {cantComeHouseholds} {cantComeHouseholds === 1 ? "household" : "households"} can’t come · {cantCome.length} {cantCome.length === 1 ? "seat" : "seats"} free
              </span>
              <span className="sp-note__acts">
                <button className="sp-link" onClick={clearCantCome}>
                  Clear their seats
                </button>
              </span>
            </div>
          </div>
        ) : null}
        {siteEvent && eventPremium === false ? (
          <p className="sp-upsell">
            Replies update your seating plan with Premium.{" "}
            <Link className="sp-link soft" to={`/account/projects/${siteEvent}?tab=website`}>
              See Premium
            </Link>
          </p>
        ) : null}
        {summary ? (
          <div className="sp-note" role="status">
            <div className="sp-note__row">
              <span className="sp-note__t">
                <span className="sp-note__ok" aria-hidden>
                  ✓
                </span>
                {summary.notes[0] ?? "Done"}
                {summary.warn.length ? <em> · {summary.warn[0]}</em> : null}
              </span>
              <span className="sp-note__acts">
                {summary.notes.length > 1 ? (
                  <button className="sp-link soft" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((o) => !o)}>
                    {detailsOpen ? "Less" : "Details"}
                  </button>
                ) : null}
                <button
                  className="sp-link soft"
                  onClick={() => {
                    undo();
                    setSummary(null);
                  }}
                >
                  Undo
                </button>
                <button className="sp-note__x" aria-label="Dismiss" onClick={() => setSummary(null)}>
                  ×
                </button>
              </span>
            </div>
            {detailsOpen ? (
              <ul>
                {summary.notes.slice(1).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
            {summary.tablesNeeded ? (
              <button className="sp-link" onClick={() => addTablesForRest(summary.tablesNeeded)}>
                Add {summary.tablesNeeded} {summary.tablesNeeded === 1 ? "table" : "tables"} and seat them
              </button>
            ) : null}
          </div>
        ) : null}
        {anySeated ? (
          <button className={`sp-chip${fixes ? " warn" : looks ? "" : " ok"}`} aria-expanded={checkOpen} disabled={!issues.length} onClick={() => setCheckOpen((o) => !o)}>
            <span className="sp-chip__i" aria-hidden>
              {fixes ? "!" : looks ? "✦" : "✓"}
            </span>
            <span className="sp-chip__t">{fixes ? `${fixes} to fix before printing` : looks ? `${looks} ${looks === 1 ? "suggestion" : "suggestions"}` : "Ready to print"}</span>
            {issues.length ? (
              <svg className={`sp-chip__c${checkOpen ? " open" : ""}`} width="12" height="12" viewBox="0 0 10 10" aria-hidden>
                <path d="M3 1.5L7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : null}
          </button>
        ) : null}
        {checkOpen && issues.length ? <PlanCheck issues={issues} onFix={fixIssue} onShow={showIssue} bare /> : null}
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
        <div className="sp-rel">
          <button className="sp-ib sp-caretbtn" aria-label="Plan menu" aria-haspopup="menu" aria-expanded={menu === "plan"} onClick={() => setMenu(menu === "plan" ? null : "plan")}>
            <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden>
              <path d="M2 3.5L5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {menu === "plan" ? (
            <div className="sp-float sp-menu sp-menu-plan" role="menu">
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
                  Save to a free account<small>Open it on any device</small>
                </button>
              )}
              <button
                onClick={() => {
                  setMenu(null);
                  exportBackup(chart);
                  changes.current = 0;
                }}
              >
                Save a Mesa file<small>Opens again in Mesa on any device</small>
              </button>
              <button
                onClick={() => {
                  setMenu(null);
                  fileInput.current?.click();
                }}
              >
                Open a Mesa file
              </button>
              <button
                onClick={() => {
                  setMenu(null);
                  if (userId) setDialog("send");
                  else setAuthOpen(true);
                }}
              >
                Send seats to your website<small>Guests look up their table</small>
              </button>
              <button
                onClick={() => {
                  setMenu(null);
                  if (userId) setDialog("dayof");
                  else setAuthOpen(true);
                }}
              >
                Day-of check-in<small>{eventPremium === false ? "Premium · your team checks guests in" : "Your team checks guests in"}</small>
              </button>
              {/* Phones: what the canvas toolbar and the top bar hold on a computer. */}
              <hr className="sp-hide-lg" />
              <button className="sp-hide-lg" onClick={() => (setMenu(null), shareNow())}>
                Share a view-only link
              </button>
              <button className="sp-hide-lg" onClick={() => (setMenu(null), setDialog("rules"))}>
                Seating rules{broken ? <small>{broken} not kept</small> : null}
              </button>
              <button className="sp-hide-lg" onClick={() => (setMenu(null), setDialog("room"))}>
                Room size &amp; venue floor plan
              </button>
              <hr />
              <button onClick={() => (setMenu(null), setHelpOpen(true))}>
                Need a hand?<small>Chat with us, or a quick answer</small>
              </button>
              <Link to="/tools/seating-chart-maker?home" className="sp-menu-link" onClick={() => setMenu(null)}>
                Mesa home
              </Link>
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
        <span
          className={`sp-saved${save === "blocked" || cloud === "error" || cloud === "limit" ? " warn" : " sp-hide-xs"}`}
          title={
            cloud === "limit"
              ? "Your account has 30 plans for events still to come. Delete one in the plan menu → My plans to save this one."
              : cloud === "error"
                ? "Couldn’t reach your account. It’s still saved in this browser; we’ll try again."
                : userId
                  ? "Saved to your account"
                  : save === "blocked"
                    ? "This browser isn’t letting us save. Save a Mesa file to keep your plan."
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
                <span className="sp-hide-sm">Saved</span>
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
        {/* Left: the plan (name, menu, saved, undo). Right: share, download, then the main action.
            Adding things and Rules live on the canvas toolbar; the view settings by the zoom. */}
        <span className="sp-div sp-hide-sm" />
        <button className="sp-ib" aria-label="Undo" title="Undo (⌘Z)" disabled={!canUndo} onClick={doUndo}>
          <Icon d={I.undo} />
        </button>
        {/* Phones: Redo shows once there's something to redo. */}
        <button className={`sp-ib${canRedo ? "" : " sp-hide-xs"}`} aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={doRedo}>
          <Icon d={I.redo} />
        </button>
        <span className="sp-grow" />
        <button className="sp-ib sp-hide-lg" aria-label="Need a hand?" title="Need a hand?" onClick={() => setHelpOpen(true)}>
          <Icon d={I.help} />
        </button>
        <button className="sp-btn tool sp-hide-sm" title="Share a view-only link" aria-label="Share" onClick={shareNow}>
          <Icon d={I.share} size={15} />
          <span className="sp-lbl">Share</span>
        </button>
        <button className="sp-btn tool" onClick={openExport} aria-label="Download" title="Download or print">
          <Icon d={I.dl} size={15} />
          <span className="sp-hide-sm sp-lbl">Download</span>
        </button>
        <span className="sp-div sp-hide-sm" />
        {/* Seat everyone, with its other choices behind the arrow. */}
        <div className="sp-rel sp-split">
          <button className="sp-btn primary" onClick={() => seatEveryone()} disabled={!chart.guests.length || !chart.tables.length}>
            <Spark />
            <span className="sp-hide-sm">Seat everyone</span>
            <span className="sp-hide-lg">Seat</span>
          </button>
          <button className="sp-btn primary sp-split__more" aria-label="More ways to seat" aria-haspopup="menu" aria-expanded={menu === "seat"} disabled={!chart.guests.length || !chart.tables.length} onClick={() => setMenu(menu === "seat" ? null : "seat")}>
            <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden>
              <path d="M2 3.5L5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {menu === "seat" ? (
            <div className="sp-float sp-menu sp-menu-seat" role="menu">
              <button onClick={() => (setMenu(null), seatEveryone())}>
                Fill the empty seats<small>Keeps everyone where they are</small>
              </button>
              <button onClick={() => (setMenu(null), seatEveryone(true))}>
                Seat everyone from scratch<small>Tables keeping their guests stay as they are</small>
              </button>
              <button onClick={() => (setMenu(null), setCheckOpen(true), setSheetOpen(true))}>Check my plan</button>
              <hr />
              <SeatPrefsPanel prefs={chart.prefs ?? {}} onChange={(p) => commit((c) => (c.prefs = p))} />
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
            if (!c) return say("That isn’t a Mesa file. Mesa files end in -mesa-plan.json.");
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
          onRowMenu={onListMenu}
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
              setMulti([]);
              if (!s) return;
              setSummary(null);
              // Keep what was tapped in view, clear of the card: on the right on a computer,
              // the bottom sheet on a phone.
              const id = s.kind === "guest" ? chart.guests.find((g) => g.id === s.id)?.tableId : s.id;
              const phone = window.matchMedia("(max-width: 820px)").matches;
              if (id) window.setTimeout(() => canvas.current?.reveal(id, phone ? { bottom: Math.round(window.innerHeight * 0.55) } : { right: 316 }), 30);
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
            units={units}
            onLockedDrag={lockedNote}
            multi={multiSet}
            picking={picking}
            onPick={onPick}
            snap={snapOn}
            grid={gridPref}
            rulers={rulers}
            walkways={walkways}
            measuring={measuring}
            tape={tape}
            onTape={setTape}
            onMoveMany={(moves) =>
              commit((c) => {
                for (const m of moves) {
                  const it = m.kind === "table" ? c.tables.find((t) => t.id === m.id) : c.objects.find((o) => o.id === m.id);
                  if (it) Object.assign(it, { x: m.x, y: m.y });
                }
              })
            }
            onResize={(kind, id, b) =>
              commit((c) => {
                if (kind === "table") {
                  const t = c.tables.find((x) => x.id === id);
                  if (!t) return;
                  Object.assign(t, { x: b.x, y: b.y, w: b.w });
                  if (t.shape === "ushape" || t.shape === "lshape") t.h = b.h;
                } else {
                  const o = c.objects.find((x) => x.id === id);
                  if (!o) return;
                  // Pillars and the cake stay round or square.
                  const square = o.type === "pillar" || o.type === "cake";
                  const side = Math.max(b.w, b.h);
                  Object.assign(o, { x: b.x, y: b.y, w: square ? side : b.w, h: square ? side : b.h });
                }
              })
            }
            onContext={onCanvasMenu}
            wave={wave}
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
          ) : null}
          {toast ? (
            <div className="sp-float sp-hint sp-toast" role="status">
              <span>{toast.text}</span>
              {toast.undo ? (
                <button
                  className="sp-link"
                  onClick={() => {
                    undo();
                    setToast(null);
                  }}
                >
                  Undo
                </button>
              ) : null}
              {toast.action ? (
                <button
                  className="sp-link"
                  onClick={() => {
                    toast.action!.run();
                    setToast(null);
                  }}
                >
                  {toast.action.label}
                </button>
              ) : null}
            </div>
          ) : null}
          <NeedHand open={helpOpen} onClose={() => setHelpOpen(false)} where="mesa" answers={MESA_ANSWERS} />
          {multi.length > 1 ? (
            <GroupCard
              chart={chart}
              ids={multi}
              onClose={() => (setMulti([]), setPicking(false))}
              onAlign={alignPicked}
              onArrange={arrangePicked}
              units={units}
              onLock={(on) =>
                commit((c) => {
                  for (const it of [...c.tables, ...c.objects]) if (multi.includes(it.id)) it.fixed = on || undefined;
                })
              }
              onDelete={() => deleteMany(multi)}
            />
          ) : null}
          {measuring ? (
            <div className="sp-float sp-hint sp-tapebar" role="status">
              {tape ? (
                <>
                  <b>{fmtLen(Math.hypot(tape.x2 - tape.x1, tape.y2 - tape.y1), units)}</b>
                  {chart.bg ? (
                    <form
                      className="sp-tapebar__scale"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const cm = parseLen(realLen, units);
                        if (cm) scalePlan(cm);
                      }}
                    >
                      <label>
                        Really
                        <input value={realLen} onChange={(e) => setRealLen(e.target.value)} inputMode="decimal" placeholder={units === "ft" ? "12′" : "4.5"} aria-label="The real length" />
                      </label>
                      <button className="sp-btn soft" disabled={!parseLen(realLen, units)}>
                        Set plan scale
                      </button>
                    </form>
                  ) : null}
                  <button className="sp-link" onClick={() => setTape(null)}>
                    Clear
                  </button>
                </>
              ) : (
                <span>Drag between two points to measure.{touch ? "" : " Shift keeps it straight."}</span>
              )}
              <button className="sp-btn soft" onClick={() => (setMeasuring(false), setTape(null))}>
                Done
              </button>
            </div>
          ) : null}
          {picking ? (
            <div className="sp-float sp-hint" role="status">
              <span>{multi.length > 1 ? <b>{multi.length} picked</b> : "Tap tables to pick them, or drag a box"}</span>
              <button className="sp-btn soft" onClick={() => setPicking(false)}>
                Done
              </button>
            </div>
          ) : null}
          {sel ? <Inspector chart={chart} sel={sel} why={sel.kind === "guest" ? reasons[sel.id] : undefined} onClose={() => setSel(null)} onArm={arm} onFocusTable={(id) => canvas.current?.focus(id)} onNotice={(m) => say(m, { undo: true })} units={units} /> : null}
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
                  Save a Mesa file
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
          {/* The canvas toolbar: add a table, add to the room, rules. */}
          <div className={`sp-float sp-tools${sel || tipsShown ? " busy" : ""}`} role="toolbar" aria-label="Add to the plan">
            <div className="sp-rel">
              <button className="sp-tool" aria-haspopup="menu" aria-expanded={menu === "table"} onClick={() => setMenu(menu === "table" ? null : "table")}>
                <Icon d={I.plus} size={15} />
                Table
              </button>
              {menu === "table" ? (
                <div className="sp-float sp-popwrap">
                  <AddTablePanel onAdd={addTable} />
                </div>
              ) : null}
            </div>
            <div className="sp-rel">
              <button className="sp-tool" aria-haspopup="menu" aria-expanded={menu === "room"} onClick={() => setMenu(menu === "room" ? null : "room")}>
                <Icon d={I.room} size={15} />
                Room
              </button>
              {menu === "room" ? (
                <div className="sp-float sp-popwrap">
                  <AddRoomPanel
                    hasPlan={!!chart.bg}
                    onAdd={addObject}
                    onRoom={() => {
                      setMenu(null);
                      setDialog("room");
                    }}
                    onFit={() => {
                      setMenu(null);
                      fitTables();
                    }}
                  />
                </div>
              ) : null}
            </div>
            <button className="sp-tool" aria-pressed={picking} onClick={() => (setPicking((v) => !v), setSel(null), setArmed(null))} title="Pick several tables to move or line up (or Shift-click)">
              <Icon d={I.pick} size={15} />
              {picking ? "Done" : "Select"}
            </button>
            <button className="sp-tool" aria-pressed={measuring} onClick={() => (setMeasuring((v) => !v), setPicking(false), setSel(null), setArmed(null))} title="Measure between two points">
              <Icon d={I.tape} size={15} />
              Measure
            </button>
            <span className="sp-tools__div" />
            <button className="sp-tool" onClick={() => setDialog("rules")} title="Who sits together, who doesn’t">
              <Icon d={I.rules} size={15} />
              Rules
              {broken ? <span className="sp-badge" title={`${broken} not kept`}>{broken}</span> : chart.rules?.length ? <span className="sp-count">{chart.rules.length}</span> : null}
            </button>
          </div>
          <div className={`sp-float sp-zoom${sel || tipsShown ? " busy" : ""}`}>
            <button className="sp-ib sp-hide-sm" aria-label="Zoom out" onClick={() => canvas.current?.zoomBy(1 / 1.4)}>
              <Icon d={<path d="M5 10h10" />} size={15} />
            </button>
            <span className="sp-hide-sm">{zoom}%</span>
            <button className="sp-ib sp-hide-sm" aria-label="Zoom in" onClick={() => canvas.current?.zoomBy(1.4)}>
              <Icon d={I.plus} size={15} />
            </button>
            <button className="sp-ib" aria-label="Fit to screen" title="Fit to screen" onClick={() => canvas.current?.fit()}>
              <Icon d={I.fit} size={15} />
            </button>
            <div className="sp-rel">
              <button className="sp-ib" aria-label="View: names, measurements and grid" title="View: names, measurements, grid and look" aria-expanded={menu === "view"} onClick={() => setMenu(menu === "view" ? null : "view")}>
                <Icon d={I.view} size={16} />
              </button>
              {menu === "view" ? (
                <div className="sp-float sp-popwrap right">
                  <ViewPanel names={names} setNames={setNames} look={look} setLook={setLook} units={units} setUnits={setUnits} grid={gridPref} setGrid={setGrid} rulers={rulers} setRulers={setRulers} snap={snapOn} setSnap={setSnap} walkways={walkways} setWalkways={setWalkways} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {ctx ? <ContextMenu {...ctx} onClose={closeCtx} /> : null}
      {dialog === "dayof" && userId ? <DayOfDialog chart={chart} premium={eventPremium} onClose={() => setDialog(null)} onLink={() => setDialog("send")} /> : null}
      {dialog === "send" && userId ? (
        <SendSeats
          chart={chart}
          userId={userId}
          onClose={() => setDialog(null)}
          onSent={() => trackEvent("seating_send_site", { guests: chart.guests.filter((g) => g.tableId).length })}
        />
      ) : null}
      {dialog === "add" ? <AddGuests chart={chart} onClose={() => setDialog(null)} onHelp={() => (setDialog(null), setHelpOpen(true))} onAdded={(n) => say(`Added ${n} ${n === 1 ? "guest" : "guests"}. Press Seat everyone when you’re ready.`)} /> : null}
      {dialog === "export" ? <ExportDialog chart={chart} onClose={() => setDialog(null)} onDone={(what) => trackEvent("seating_export", { type: what })} getShareUrl={userId ? async () => (chart.site?.slug && chart.site.finder ? `${window.location.origin}/invite/${chart.site.slug}/table` : shareLink(chart)) : undefined} /> : null}
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
          units={units}
          chart={chart}
          onClose={() => setDialog(null)}
          onFit={() => window.setTimeout(() => canvas.current?.fit(), 40)}
          onFitTables={() => {
            setDialog(null);
            fitTables();
          }}
          userId={userId}
          onSignIn={() => {
            setDialog(null);
            setAuthOpen(true);
          }}
          onRead={(text, fit) => {
            setDialog(null);
            trackEvent("seating_plan_read", {});
            if (fit) fitTables();
            window.setTimeout(() => canvas.current?.fit(), 40);
            say(text, { undo: true });
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
            <p>Saved to your account. Up to 30 for events still to come; past ones don’t count.</p>
            <div className="sp-preview sp-plans" style={{ maxHeight: 360 }}>
              {plans.map((p) => (
                <div key={p.id}>
                  <span className="sp-plans__name">
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
                    <small>
                      {p.event ? `${p.event.name}${p.event.event_date ? ` · ${new Date(p.event.event_date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}` : ""} · ` : ""}
                      edited {new Date(p.updated_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                    </small>
                  </span>
                  {p.id === chart.id ? null : (
                    <button
                      className="sp-ib sp-danger"
                      aria-label={`Delete ${p.title || "this plan"}`}
                      title="Delete"
                      onClick={async () => {
                        // Kept in hand first, so Undo can put it back exactly.
                        const kept = await loadCloud(p.id);
                        await deleteCloud(p.id);
                        setPlans((list) => list?.filter((x) => x.id !== p.id) ?? list);
                        say(`${p.title || "Plan"} deleted.`, kept ? { action: { label: "Undo", run: () => void saveCloud(kept, p.event_id).then(async () => setPlans(await listCloud())) } } : {});
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" />
                      </svg>
                    </button>
                  )}
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
            <p>This clears “{chart.title}” from this browser. Save a Mesa file first if you might want it again.</p>
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
