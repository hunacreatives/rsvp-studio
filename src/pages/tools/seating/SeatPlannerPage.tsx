import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StartScreen from "./StartScreen";
import Editor, { type Look } from "./Editor";
import { loadSaved, open, useStore } from "./store";
import { listCloud, loadCloud } from "./cloud";
import { supabase } from "@/lib/supabase";
import "./seating.css";

// /tools/seating-chart-maker — the free Seat Planner. With a saved plan (this browser, or
// the account's copy when it's newer), arriving here shows the front page with a "welcome
// back" prompt: continue, start from scratch, or close it and keep browsing. The editor
// opens directly only when you were already in it this tab (a refresh) or are coming back
// from signing up to finish a download/share. Paper & ink by default; ⋯ → Look switches.

// Set while the editor is open in this tab, so a refresh goes back into it. Cleared on
// leaving the page (unmount), so coming back via the menu asks first.
const IN_EDITOR = "seating:in-editor";
const AFTER_AUTH = "seating:after-auth"; // set by Editor before the sign-up gate

const session = {
  has: (k: string) => {
    try {
      return sessionStorage.getItem(k) !== null;
    } catch {
      return false;
    }
  },
  set: (k: string) => {
    try {
      sessionStorage.setItem(k, "1");
    } catch {
      /* not remembered */
    }
  },
  clear: (k: string) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* nothing to clear */
    }
  },
};

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
  // "ask": a saved plan exists and we haven't been told to open it yet.
  const [asking, setAsking] = useState(() => {
    if (session.has(AFTER_AUTH)) return false; // finishing a download/share after sign-up
    // Straight back into the editor only on a refresh of it — not when this tab arrives
    // here again some other way (a link, the menu, a typed address).
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return !(nav?.type === "reload" && session.has(IN_EDITOR));
  });

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
  const editing = !!chart && !home && !asking;

  useEffect(() => {
    if (editing) session.set(IN_EDITOR);
    // Going to the front page on purpose (?home) counts as leaving the editor.
    else if (home) session.clear(IN_EDITOR);
  }, [editing, home]);
  // Leaving Mesa for another page: next visit asks again. (A refresh doesn't unmount.)
  useEffect(() => () => session.clear(IN_EDITOR), []);

  const enterEditor = () => {
    setAsking(false);
    if (home) navigate("/tools/seating-chart-maker", { replace: true });
  };
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
  if (!chart || home || asking)
    return (
      <StartScreen
        current={chart}
        // Only on arrival with a saved plan — not when you chose "Mesa home" from the editor.
        welcomeBack={!!chart && asking && !home}
        onResume={enterEditor}
        onReady={(a) => {
          setAutoSeat(a);
          enterEditor();
        }}
      />
    );
  return <Editor key={chart.id} look={look} setLook={setLook} autoSeat={autoSeat} onStartOver={() => setAutoSeat(false)} />;
}
