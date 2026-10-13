import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StartScreen from "./StartScreen";
import Editor, { type Look } from "./Editor";
import { loadSaved, open, useStore } from "./store";
import { listCloud, loadCloud } from "./cloud";
import { supabase } from "@/lib/supabase";
import "./seating.css";

// /tools/seating-chart-maker — the free Seat Planner. A plan saved in this browser opens
// straight into the editor. Signed in, the account's copy wins when it's newer (edited on
// another device), and with nothing in this browser the most recent saved plan opens.
// Otherwise, the front page. Paper & ink by default; ⋯ → Look (or ?look=a|b|c) switches.

// Paper & ink is the default. (A new key, so earlier test choices don't stick.)
const LOOK_KEY = "seating:look:v2";

function initialLook(): Look {
  const q = new URLSearchParams(window.location.search).get("look");
  if (q === "a" || q === "b" || q === "c") return q;
  try {
    const s = localStorage.getItem(LOOK_KEY);
    if (s === "a" || s === "b" || s === "c") return s;
  } catch {
    /* default */
  }
  return "b";
}

export default function SeatPlannerPage() {
  const chart = useStore((s) => s.chart);
  const [booted, setBooted] = useState(false);
  const [autoSeat, setAutoSeat] = useState(false);
  const [look, setLookState] = useState<Look>(initialLook);
  // ?home: the front page, even with a plan open (it offers to carry on with it).
  const { search } = useLocation();
  const navigate = useNavigate();
  const home = new URLSearchParams(search).has("home");

  useEffect(() => {
    let alive = true;
    (async () => {
      const local = loadSaved();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        try {
          if (local) {
            const remote = await loadCloud(local.id);
            if (alive) open(remote && remote.updatedAt > local.updatedAt ? remote : local);
          } else {
            const rows = await listCloud();
            const latest = rows[0] ? await loadCloud(rows[0].id) : null;
            if (alive && latest) open(latest);
          }
        } catch {
          if (alive && local) open(local);
        }
      } else if (local && alive) open(local);
      if (alive) setBooted(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // The editor is a full-screen tool: the page behind it doesn't scroll or bounce.
  const editing = !!chart && !home;
  useEffect(() => {
    if (!editing) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [editing]);

  const setLook = (l: Look) => {
    setLookState(l);
    try {
      localStorage.setItem(LOOK_KEY, l);
    } catch {
      /* not remembered */
    }
  };

  if (!booted) return <div style={{ minHeight: "100dvh", background: "var(--warm-white)" }} />;
  if (!chart || home)
    return (
      <StartScreen
        current={chart}
        onResume={() => navigate("/tools/seating-chart-maker", { replace: true })}
        onReady={(a) => {
          setAutoSeat(a);
          if (home) navigate("/tools/seating-chart-maker", { replace: true });
        }}
      />
    );
  return <Editor key={chart.id} look={look} setLook={setLook} autoSeat={autoSeat} onStartOver={() => setAutoSeat(false)} />;
}
