import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { myEvents } from "./website";
import type { Chart } from "./model";
import { commit } from "./store";
import { applyPlanRead, planScale, type PlanRead } from "./venue";

// Room & venue → Read the plan for me. The venue's floor plan goes to the AI reader
// (api/template-ai.ts ?op=floorplan, api/_lib/floorplan.ts), which says where the walls,
// stage, doors, pillars and drawn tables are, and the room's size if the plan shows it.
// The host sees it drawn over their picture and picks what to use; nothing changes before.

const m1 = (cm: number) => (Math.round(cm / 10) / 10).toFixed(1).replace(/\.0$/, "");

export default function PlanReader({ chart, pic, userId, onSignIn, onApplied }: { chart: Chart; pic: string; userId: string | null; onSignIn(): void; onApplied(text: string, fitTables: boolean): void }) {
  const signedIn = !!userId;
  // Premium only: a host with at least one Premium event. The server checks too.
  const [premium, setPremium] = useState<boolean | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    myEvents(userId).then((e) => alive && setPremium(e.some((x) => x.premium)));
    return () => {
      alive = false;
    };
  }, [userId]);
  const [state, setState] = useState<"idle" | "reading" | "review">("idle");
  const [read, setRead] = useState<PlanRead | null>(null);
  const [err, setErr] = useState("");
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState("");
  const [useItems, setUseItems] = useState(true);
  const [useTables, setUseTables] = useState(true);

  const go = async () => {
    if (!signedIn) return onSignIn();
    setErr("");
    setState("reading");
    try {
      const { data } = await supabase.auth.getSession();
      const r = await fetch("/api/template-ai?op=floorplan", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ image: pic, type: pic.startsWith("data:image/png") ? "image/png" : "image/jpeg" }),
      });
      const out = (await r.json().catch(() => null)) as { read?: PlanRead; error?: string; premium?: boolean; left?: number } | null;
      if (out?.premium === false) setPremium(false);
      if (typeof out?.left === "number") setLeft(out.left);
      if (!r.ok || !out?.read) {
        setErr(out?.error ?? "We couldn’t read the plan just now. Try again in a moment.");
        setState("idle");
        return;
      }
      setRead(out.read);
      setUseTables(out.read.tables.length > 0);
      setUseItems(out.read.items.length > 0);
      setState("review");
    } catch {
      setErr("We couldn’t reach the plan reader. Check your connection and try again.");
      setState("idle");
    }
  };

  const typed = Number(width.replace(",", "."));
  const scale = read && nat ? planScale(read, nat, typed > 0 ? typed : undefined) : 0;
  const size = read && nat && scale ? { w: (read.room.x1 - read.room.x0) * nat.w * scale, h: (read.room.y1 - read.room.y0) * nat.h * scale } : null;
  const sane = size && size.w >= 300 && size.h >= 300 && size.w <= 20000 && size.h <= 20000;
  const needWidth = read && !read.width_m && !read.depth_m && read.size_from !== "table sizes";

  const apply = () => {
    if (!read || !nat || !scale || !sane) return;
    let res = { room: chart.room, added: 0, moved: 0, leftOver: 0 };
    commit((c) => {
      res = applyPlanRead(c, read, nat, scale, { items: useItems, tables: useTables });
    });
    const bits = [`Your room is now ${m1(res.room.w)} × ${m1(res.room.h)} m`];
    if (res.moved) bits.push(`${res.moved} ${res.moved === 1 ? "table placed" : "tables placed"} on the plan`);
    if (res.added) bits.push(`${res.added} ${res.added === 1 ? "table" : "tables"} added`);
    if (res.leftOver) bits.push(`${res.leftOver} ${res.leftOver === 1 ? "table doesn’t" : "tables don’t"} fit and ${res.leftOver === 1 ? "is" : "are"} outside the right wall. Remove ${res.leftOver === 1 ? "it" : "them"}, or use 12-seat tables`);
    setState("idle");
    setRead(null);
    onApplied(bits.join(". ") + ".", !useTables);
  };

  const names = (() => {
    if (!read) return "";
    const count = new Map<string, number>();
    for (const it of read.items) count.set(it.label, (count.get(it.label) ?? 0) + 1);
    const parts = [...count].map(([l, n]) => (n > 1 ? `${n} ${l.toLowerCase()}s` : l.toLowerCase()));
    return parts.length > 4 ? `${parts.slice(0, 3).join(", ")} and ${parts.length - 3} more` : parts.join(", ").replace(/, ([^,]*)$/, " and $1");
  })();

  return (
    <div className="sp-read">
      {state !== "review" ? (
        <>
          <div className={`sp-read__pic${state === "reading" ? " scanning" : ""}`}>
            <img src={pic} alt="Venue floor plan" onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
          </div>
          {signedIn && premium === false ? (
            <div className="sp-read__go">
              <div>
                <b>Mesa can read the plan for you, with Premium</b>
                <span>It finds the walls, stage, doors, pillars and tables. Any RSVP Studio Premium website includes it. Measuring it yourself below is free.</span>
              </div>
              <Link className="sp-btn soft" to="/build">
                See Premium
              </Link>
            </div>
          ) : (
            <div className="sp-read__go">
              <div>
                <b>{state === "reading" ? "Reading your plan…" : "Let Mesa read the plan"}</b>
                <span>
                  {state === "reading"
                    ? "About 15 seconds. Walls, stage, doors, pillars and tables."
                    : left !== null
                      ? `${left} ${left === 1 ? "read" : "reads"} left today.`
                      : signedIn
                        ? "It finds the walls, stage, doors, pillars and tables, and the size if the plan shows one. 5 reads a day with Premium."
                        : "It finds the walls, stage, doors, pillars and tables. Comes with Premium."}
                </span>
              </div>
              <button className="sp-btn primary" disabled={state === "reading" || (signedIn && premium === null) || left === 0} onClick={go}>
                {state === "reading" ? "Reading…" : signedIn ? "Read the plan for me" : "Sign in to read it"}
              </button>
            </div>
          )}
        </>
      ) : read && nat ? (
        <>
          <div className="sp-read__pic">
            <img src={pic} alt="Venue floor plan" />
            <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden>
              <rect className="rm" x={read.room.x0 * 1000} y={read.room.y0 * 1000} width={(read.room.x1 - read.room.x0) * 1000} height={(read.room.y1 - read.room.y0) * 1000} />
              {useItems ? read.items.map((it, i) => <rect key={i} className="it" x={it.x0 * 1000} y={it.y0 * 1000} width={Math.max(6, (it.x1 - it.x0) * 1000)} height={Math.max(6, (it.y1 - it.y0) * 1000)} />) : null}
              {useTables ? read.tables.map((t, i) => (t.shape === "round" ? <ellipse key={i} className="tb" cx={((t.x0 + t.x1) / 2) * 1000} cy={((t.y0 + t.y1) / 2) * 1000} rx={((t.x1 - t.x0) / 2) * 1000} ry={((t.y1 - t.y0) / 2) * 1000} /> : <rect key={i} className="tb" x={t.x0 * 1000} y={t.y0 * 1000} width={(t.x1 - t.x0) * 1000} height={(t.y1 - t.y0) * 1000} />)) : null}
            </svg>
          </div>
          <p className="sp-read__h">Here’s what we read</p>
          <ul className="sp-read__list">
            <li>
              <b>The room</b>
              <span>
                {size && sane ? `${m1(size.w)} × ${m1(size.h)} m` : "Size not shown on the plan"}
                {read.size_from === "dimensions" ? ", from the plan’s measurements" : read.size_from === "scale bar" ? ", from the scale bar" : read.size_from === "table sizes" && !typed ? ", judged from the tables. Type the width if you know it" : ""}
              </span>
            </li>
            {needWidth || read.size_from === "table sizes" ? (
              <li className="sp-read__w">
                <label className="sp-field dark">
                  How wide is the room, left to right? (m)
                  <input type="number" inputMode="decimal" min={3} max={200} step="0.5" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="e.g. 24" />
                </label>
              </li>
            ) : null}
            {read.items.length ? (
              <li>
                <label className="sp-toggle">
                  <span>
                    {read.items.length} {read.items.length === 1 ? "thing" : "things"} in the room
                    <small>{names}. Replaces what’s in the room now</small>
                  </span>
                  <input type="checkbox" className="sp-switch" checked={useItems} onChange={(e) => setUseItems(e.target.checked)} />
                </label>
              </li>
            ) : null}
            {read.tables.length ? (
              <li>
                <label className="sp-toggle">
                  <span>
                    {read.tables.length} {read.tables.length === 1 ? "table" : "tables"} drawn on the plan
                    <small>Your tables move to these spots. Guests keep their seats</small>
                  </span>
                  <input type="checkbox" className="sp-switch" checked={useTables} onChange={(e) => setUseTables(e.target.checked)} />
                </label>
              </li>
            ) : null}
          </ul>
          {read.notes.length ? (
            <ul className="sp-read__notes">
              {read.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
          {size && !sane ? <p className="sp-err">That makes the room smaller than 3 m or bigger than 200 m. Check the width.</p> : null}
          <div className="sp-acts" style={{ justifyContent: "flex-end" }}>
            <button className="sp-btn soft" onClick={() => (setState("idle"), setRead(null))}>
              Cancel
            </button>
            <button className="sp-btn primary" disabled={!sane} onClick={apply}>
              Use this
            </button>
          </div>
        </>
      ) : null}
      {err ? <p className="sp-err">{err}</p> : null}
    </div>
  );
}
