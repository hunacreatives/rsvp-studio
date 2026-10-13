import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { CharacterTrio } from "@/components/CharacterLoader";
import { Reveal } from "@/lib/Reveal";
import { PRESETS, buildLayout, seatByTableLabels, seatHonorees } from "./presets";
import { parseGuestText, SAMPLE_LIST } from "./parse";
import { planSeating } from "./autoseat";
import { CHAIR, emptyChart, roundRadius, seatPoint, type Category, type Chart, type ChartKind } from "./model";
import { boardSvg } from "./exporting";
import { open, readBackup } from "./store";
import Confetti from "./Confetti";
import { trackEvent } from "@/lib/analytics";
import { SEATING_FACTS, SEATING_FAQ, SEATING_H1, SEATING_LAYOUT, SEATING_NAME, SEATING_SUB } from "../../../../api/_lib/seating-copy";

// Mesa's page: the same family as Build Your Website (warm wash, the blue button), laid out
// like a product page: one idea per section, big type, big pictures of the real thing, a
// little confetti. For every kind of event. The form that starts a plan opens in a sheet.
// Words: api/_lib/seating-copy.ts (the server serves the same).

/** Copy with "\n" where a line should break: each phrase on its own line on wide screens,
 *  flowing normally (with orphan protection) on phones. */
function Lines({ text }: { text: string }) {
  const parts = text.split("\n");
  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className="mesa-line">
          {p}
          {i < parts.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

const CAT_FILL: Record<Category, string> = {
  vip: "#e6cf98",
  entourage: "#ddd0f0",
  bride: "#efcfbb",
  groom: "#c9d6f0",
  family: "#ecdcb6",
  friends: "#cbe3d3",
  work: "#c6e2ea",
  court: "#f0cdd9",
  kids: "#f3e2ab",
  other: "#e0dfe7",
};

/** The sample wedding, seated, with the order seats were filled (for the animation). */
function useSample() {
  return useMemo(() => {
    const parsed = parseGuestText(SAMPLE_LIST);
    const special = parsed.guests.filter((g) => ["vip", "entourage", "court"].includes(parsed.groups.find((x) => x.id === g.groupId)?.cat ?? "")).length;
    const chart: Chart = { ...emptyChart("wedding"), ...buildLayout("wedding", parsed.guests.length, 10, special), groups: parsed.groups, guests: parsed.guests, names: "Andrea & Miguel", title: "Andrea & Miguel" };
    seatHonorees(chart, "Andrea & Miguel");
    const moves = planSeating(chart).moves;
    for (const m of moves) Object.assign(chart.guests.find((g) => g.id === m.guestId)!, { tableId: m.tableId, seat: m.seat });
    return { chart, order: moves.map((m) => m.guestId), parsed };
  }, []);
}

/** The plan, with seats filling in one after another when `play` turns on. */
function PlanPicture({ chart, order, play = true, still = false }: { chart: Chart; order?: string[]; play?: boolean; still?: boolean }) {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const total = order?.length ?? 0;
  const [n, setN] = useState(still || reduce || !order ? total : 0);
  useEffect(() => {
    if (still || reduce || !order || !play) return;
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= total) window.clearInterval(t);
    }, 45);
    return () => window.clearInterval(t);
  }, [play, still, reduce, order, total]);
  const shown = useMemo(() => new Set(order ? order.slice(0, n) : []), [order, n]);
  const animated = useMemo(() => new Set(order ?? []), [order]);
  const cat = new Map(chart.groups.map((g) => [g.id, g.cat]));
  const bySeat = new Map(chart.guests.filter((g) => g.tableId).map((g) => [`${g.tableId}:${g.seat}`, g]));
  return (
    <svg viewBox={`-80 -80 ${chart.room.w + 160} ${chart.room.h + 160}`} className="block h-full w-full" role="img" aria-label="A seated wedding reception plan">
      <rect x={-80} y={-80} width={chart.room.w + 160} height={chart.room.h + 160} fill="#fbfaf6" />
      <rect x={0} y={0} width={chart.room.w} height={chart.room.h} rx={10} fill="#fffef9" stroke="#25265e" strokeWidth={5} />
      {chart.objects
        .filter((o) => o.type === "stage" || o.type === "dance")
        .map((o) => (
          <g key={o.id}>
            <rect x={o.x - o.w / 2} y={o.y - o.h / 2} width={o.w} height={o.h} rx={10} fill="#f1ede3" />
            <text x={o.x} y={o.y + 10} textAnchor="middle" fontSize={28} letterSpacing={5} fill="#8a8478" fontFamily="Inter, sans-serif" fontWeight={600}>
              {o.type === "stage" ? "STAGE" : "DANCE FLOOR"}
            </text>
          </g>
        ))}
      {chart.tables.map((t) => {
        const seats = Array.from({ length: t.seats }, (_, i) => {
          const g = bySeat.get(`${t.id}:${i}`);
          const on = !!g && (!animated.has(g.id) || shown.has(g.id));
          const [x, y] = seatPoint(t, i);
          const fill = on ? (t.shape === "head" ? "#b8913a" : CAT_FILL[(g!.groupId && cat.get(g!.groupId)) || "other"]) : "none";
          return <circle key={i} className={on && animated.has(g!.id) && !still ? "mesa-pop" : undefined} cx={x} cy={y} r={CHAIR} fill={fill} stroke={on ? "none" : "#d6d0c2"} strokeWidth={3} />;
        });
        return t.shape === "round" ? (
          <g key={t.id}>
            <circle cx={t.x} cy={t.y} r={roundRadius(t.seats)} fill="#fff" stroke="#25265e" strokeWidth={4} />
            <text x={t.x} y={t.y + 15} textAnchor="middle" fontSize={44} fontFamily="Lora, Georgia, serif" fontWeight={600} fill="#000727">
              {t.label}
            </text>
            {seats}
          </g>
        ) : (
          <g key={t.id}>
            <rect x={t.x - (t.w ?? 640) / 2} y={t.y - 38} width={t.w ?? 640} height={76} rx={12} fill="#fff" stroke="#25265e" strokeWidth={4} />
            <text x={t.x} y={t.y + 12} textAnchor="middle" fontSize={32} fontFamily="Lora, Georgia, serif" fontWeight={600} fill="#000727">
              Presidential
            </text>
            {seats}
          </g>
        );
      })}
    </svg>
  );
}

function Laptop({ children }: { children: ReactNode }) {
  return (
    <div className="mesa-laptop">
      <div className="mesa-screen">{children}</div>
      <div className="mesa-base" />
    </div>
  );
}

function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mesa-phone ${className}`}>
      <div className="mesa-phone-screen">{children}</div>
    </div>
  );
}

function TableMath() {
  const [n, setN] = useState("200");
  const guests = Math.max(0, Math.min(3000, Math.round(Number(n) || 0)));
  const l = useMemo(() => (guests ? buildLayout("wedding", guests) : null), [guests]);
  const special = l ? l.tables.filter((t) => t.cat || t.shape === "head").length : 0;
  return (
    <div className="mt-6 flex flex-col items-start gap-4">
      <label className="flex items-center gap-3 text-[15px] opacity-85">
        For
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={3000}
          value={n}
          onChange={(e) => setN(e.target.value)}
          aria-label="Number of guests"
          className="h-14 w-32 rounded-2xl border-0 bg-white text-center font-display text-[28px] font-semibold text-[var(--ink)] outline-none focus:ring-4 focus:ring-white/40"
        />
        guests
      </label>
      <p className="font-display text-[clamp(2.2rem,4vw,3rem)] font-semibold leading-none tracking-[-0.02em]">{l ? `${l.tables.length} tables` : "—"}</p>
      <p className="text-[15px] leading-relaxed opacity-85">
        {l ? `${l.tables.length - special} guest tables of 10, including one spare, plus the presidential table, two for sponsors and two for the secondary sponsors and entourage.` : "Type how many guests you expect."}
      </p>
    </div>
  );
}

const ROOMS: { kind: ChartKind; label: string }[] = [
  { kind: "wedding", label: "Wedding" },
  { kind: "debut", label: "Debut" },
  { kind: "lauriat", label: "Lauriat" },
  { kind: "party", label: "Birthday or other" },
  { kind: "blank", label: "Empty room" },
];

/** The form that starts a plan, in a sheet over the page. */
function StartSheet({ onClose, onReady, current }: { onClose(): void; onReady(autoSeat: boolean): void; current?: Chart | null }) {
  const [kind, setKind] = useState<ChartKind>("wedding");
  const [names, setNames] = useState("");
  const [text, setText] = useState("");
  const [count, setCount] = useState("150");
  const [perTable, setPerTable] = useState<8 | 10 | 12>(10);
  const [autoSeat, setAutoSeat] = useState(true);
  const [err, setErr] = useState("");
  const parsed = useMemo(() => (text.trim() ? parseGuestText(text) : null), [text]);

  // Once per opening (not per render), so the page's own scrolling is put back exactly.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, []);

  const build = () => {
    const guests = parsed?.guests ?? [];
    const groups = parsed?.groups ?? [];
    const special = guests.filter((g) => ["vip", "entourage", "court"].includes(groups.find((x) => x.id === g.groupId)?.cat ?? "")).length;
    const n = Math.max(guests.length, guests.length ? 0 : Number(count) || 0);
    const layout = buildLayout(kind, n, perTable, special);
    const preset = PRESETS.find((p) => p.kind === kind)!;
    const who = names.trim().slice(0, 80);
    const chart: Chart = { ...emptyChart(kind), title: who || (kind === "blank" ? "Our seating plan" : `${preset.title.replace(" (PH)", "")} seating plan`), ...layout, groups, guests, ...(who ? { names: who } : {}) };
    if (who && (kind === "wedding" || kind === "debut")) seatHonorees(chart, who);
    if (parsed) seatByTableLabels(chart, parsed.wantTable);
    open(chart);
    trackEvent("seating_start", { layout: kind, guests: guests.length });
    onReady(autoSeat && guests.some((g) => !chart.guests.find((x) => x.id === g.id)?.tableId));
  };

  const field = "w-full rounded-xl border border-[var(--line)] bg-white px-4 text-[16px] text-[var(--ink)] outline-none focus:border-[var(--ink)] md:text-[15px]";
  const pill = (on: boolean) => `min-h-[42px] rounded-full border px-4 text-[14px] font-medium transition-colors ${on ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]"}`;

  return (
    <div className="mesa-sheet-scrim" onClick={onClose} data-lenis-prevent>
      <div className="mesa-sheet" role="dialog" aria-modal="true" aria-labelledby="mesa-start-h" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-[var(--slate)]">{SEATING_NAME} by The RSVP Studio</p>
            <h2 id="mesa-start-h" className="mt-1 font-display text-[1.9rem] font-semibold leading-tight text-[var(--ink)]">
              Start your seating plan
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-[var(--slate)] hover:bg-[var(--paper)]">
            <i className="ri-close-line text-xl" />
          </button>
        </div>
        <div className="mt-6 grid gap-5">
          <label className="text-[14px] font-medium text-[var(--ink)]">
            Names on the plan
            <input value={names} onChange={(e) => setNames(e.target.value)} placeholder={kind === "debut" ? "Bea" : "Andrea & Miguel"} autoComplete="off" className={`mt-1.5 h-12 ${field}`} />
          </label>
          <div className="text-[14px] font-medium text-[var(--ink)]">
            Type of event
            <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Type of event">
              {ROOMS.map((r) => (
                <button
                  key={r.kind}
                  role="radio"
                  aria-checked={kind === r.kind}
                  onClick={() => {
                    setKind(r.kind);
                    if (r.kind === "lauriat") setPerTable(12);
                  }}
                  className={pill(kind === r.kind)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {kind !== "blank" ? (
            <div className="text-[14px] font-medium text-[var(--ink)]">
              Guests per table
              <div className="mt-1.5 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Guests per table">
                {([8, 10, 12] as const).map((n) => (
                  <button key={n} role="radio" aria-checked={perTable === n} onClick={() => setPerTable(n)} className={`${pill(perTable === n)} min-w-[52px]`}>
                    {n}
                  </button>
                ))}
                <span className="text-[13px] font-normal text-[var(--slate)]">You can change any table later.</span>
              </div>
            </div>
          ) : null}
          <label className="text-[14px] font-medium text-[var(--ink)]">
            Guest list
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder={"Paste it as it is. One family per line works best.\n\nTito Ben & Tita Marie Santos + 2 kids\nLola Cora Santos\nBianca Lopez +1"}
              className={`mt-1.5 py-3 leading-relaxed ${field}`}
            />
          </label>
          <div className="-mt-2 flex flex-wrap justify-between gap-3 text-[13px] text-[var(--slate)]">
            <span>
              {parsed ? (
                <>
                  <b className="text-[var(--ink)]">{parsed.guests.length} guests</b> in {parsed.parties.length} households
                  {parsed.groups.length ? `, ${parsed.groups.length} groups` : ""}
                  {Object.keys(parsed.wantTable).length ? `. ${Object.keys(parsed.wantTable).length} already have a table.` : ""}
                </>
              ) : (
                "Headings like “Bride’s family” or “Table 5” are understood."
              )}
            </span>
            <button className="font-medium text-[var(--ink)] underline underline-offset-4" onClick={() => setText(text ? "" : SAMPLE_LIST)}>
              {text ? "Clear" : "Use a sample list"}
            </button>
          </div>
          {!parsed && kind !== "blank" ? (
            <label className="flex flex-wrap items-center gap-3 text-[14px] text-[var(--slate)]">
              No list yet? Start with about
              <input type="number" inputMode="numeric" min={10} max={2000} value={count} onChange={(e) => setCount(e.target.value)} className={`h-10 w-24 ${field}`} />
              guests
            </label>
          ) : null}
          {parsed?.guests.length ? (
            <label className="flex items-center gap-2.5 text-[14px] text-[var(--ink)]">
              <input type="checkbox" checked={autoSeat} onChange={(e) => setAutoSeat(e.target.checked)} className="h-[18px] w-[18px] accent-[var(--acc-blue)]" />
              Seat everyone for me
            </label>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
            <label className="cursor-pointer text-[14px] font-medium text-[var(--ink)] underline underline-offset-4">
              Open a backup file
              <input
                type="file"
                accept=".json,application/json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const c = await readBackup(f);
                  if (!c) return setErr("That file isn’t a seating plan backup.");
                  open(c);
                  onReady(false);
                }}
              />
            </label>
            <button className="btn btn-primary" onClick={build}>
              {current ? "Start a new plan" : "Create my plan"}
            </button>
          </div>
          {current ? <p className="text-[13px] text-[var(--slate)]">This replaces “{current.title}” in this browser. Download a backup or save it to an account first if you want to keep it.</p> : null}
          {err ? <p className="text-[13px] text-[#c2412d]">{err}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function StartScreen({ onReady, current, onResume }: { onReady(autoSeat: boolean): void; current?: Chart | null; onResume?(): void }) {
  const sample = useSample();
  const [sheet, setSheet] = useState(false);
  const board = useMemo(() => boardSvg(sample.chart), [sample]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const start = () => setSheet(true);

  const startButtons = (
    <div className="flex flex-col items-center justify-center gap-x-6 gap-y-2 sm:flex-row">
      {current ? (
        <>
          <button className="btn btn-primary w-full max-w-[280px] sm:w-auto" onClick={onResume}>
            Continue your plan
          </button>
          <button className="group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-[var(--ink)]" onClick={start}>
            <span className="underline-offset-[5px] group-hover:underline">Start a new one</span>
          </button>
        </>
      ) : (
        <>
          <button className="btn btn-primary w-full max-w-[280px] sm:w-auto" onClick={start}>
            Start free
          </button>
          <a href="#how" className="group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-[var(--ink)]">
            <span className="underline-offset-[5px] group-hover:underline">See how it works</span>
            <i className="ri-arrow-down-line" aria-hidden />
          </a>
        </>
      )}
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="mesa-page overflow-hidden">
        {/* Hero: the Build page's warm wash, a string of banderitas, the name, the product. */}
        <section className="relative overflow-hidden pt-14 text-center md:pt-20" style={{ background: "linear-gradient(180deg, #fff1cc 0%, #fff8e6 45%, var(--warm-white) 80%)" }}>
          <Confetti />
          <div className="container-x mesa-hero-content">
            <p className="mesa-lockup">
              <span className="mesa-word">{SEATING_NAME}</span>
              <span className="mesa-by">by The RSVP Studio</span>
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl font-display font-semibold leading-[1.02] tracking-[-0.035em] text-[var(--ink)] text-balance" style={{ fontSize: "clamp(2.5rem, 5.6vw, 4.4rem)" }}>
              {SEATING_H1}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--slate)] text-balance md:text-[21px]">
              <Lines text={SEATING_SUB} />
            </p>
            <div className="mt-8">{startButtons}</div>
            <p className="mt-4 text-[14px] text-[var(--slate)]">{current ? `“${current.title}” · ${current.guests.filter((g) => g.tableId).length} of ${current.guests.length} seated` : SEATING_FACTS}</p>
            {/* The real thing: screenshots of Mesa itself (public/tools/mesa). */}
            <div className="relative mx-auto mt-12 max-w-[820px] pb-16 md:mt-14 md:pb-20">
              <span className="mesa-wash w1" aria-hidden />
              <span className="mesa-wash w2" aria-hidden />
              <span className="mesa-wash w3" aria-hidden />
              <Laptop>
                <img src="/tools/mesa/editor-1440.webp" srcSet="/tools/mesa/editor-1440.webp 1440w, /tools/mesa/editor.webp 2880w" sizes="(max-width: 860px) 92vw, 800px" alt="Mesa’s editor: a wedding reception with every guest seated" className="block h-full w-full rounded-[10px] object-cover object-left-top" />
              </Laptop>
              <Phone className="mesa-phone-hero hidden sm:block">
                <img src="/tools/mesa/phone.webp" alt="Mesa on a phone" className="block h-full w-full object-cover object-top" />
              </Phone>
              <div className="mesa-float mesa-float-why hidden md:block">
                <p className="mesa-why-name">Ninang Liza Cruz</p>
                <p className="mesa-why-table">Table S1 · Principal sponsors</p>
                <p className="mesa-why-line">
                  <b>Why here:</b> at the sponsors table, next to her household.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works: the three steps side by side, each with a small picture. */}
        <section id="how" className="scroll-mt-20 bg-[var(--warm-white)] py-16 md:py-24">
          <div className="container-x">
            <Reveal className="text-center">
              <h2 className="mesa-h2 mx-auto">How it works</h2>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <Reveal className="mesa-tile t1">
                <p className="mesa-tile-n">Step 1</p>
                <h3>Paste your list.</h3>
                <p>
                  <Lines text={"Straight from Viber, Notes or Excel.\nFamilies stay together;\nheadings become groups."} />
                </p>
                <div className="mesa-tile-pic">
                  <div className="mesa-bubbles">
                    {["BRIDE'S FAMILY", "Tito Boy & Tita Nora + 2 kids", "Lola Cora Santos", "FRIENDS", "Bianca Lopez +1", "Gabby Yap & Hans Ty"].map((l) => (
                      <span key={l} className={/^[A-Z' ]+$/.test(l) ? "head" : ""}>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
              <Reveal className="mesa-tile t2" delay={0.06}>
                <p className="mesa-tile-n">Step 2</p>
                <h3>Tap Seat everyone.</h3>
                <p>
                  <Lines text={"Sponsors up front,\neach family on its own side,\nlolos and lolas away from the speakers."} />
                </p>
                <div className="mesa-tile-pic">
                  <div className="mesa-why">
                    <p className="mesa-why-name">Ninang Liza Cruz</p>
                    <p className="mesa-why-table">Table S1</p>
                    <p className="mesa-why-line">
                      <b>Why here:</b> at the sponsors table, next to her household.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal className="mesa-tile t3" delay={0.12}>
                <p className="mesa-tile-n">Step 3</p>
                <h3>Print or share.</h3>
                <p>
                  <Lines text={"An entrance board, the floor plan,\ntable lists for your caterer, or a link."} />
                </p>
                <div className="mesa-tile-pic">
                  <div className="mesa-poster" dangerouslySetInnerHTML={{ __html: board }} />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* The Filipino reception, and your venue */}
        <section className="mesa-lilac py-16 md:py-24">
          <div className="container-x grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <Reveal>
              <h2 className="mesa-h2">Made for the Filipino reception.</h2>
              <dl className="mt-8 grid gap-4">
                {SEATING_LAYOUT.slice(0, 4).map(([h, p]) => (
                  <div key={h}>
                    <dt className="text-[16px] font-semibold text-[var(--ink)]">{h}</dt>
                    <dd className="mt-0.5 text-[15px] leading-relaxed text-[var(--slate)]">
                      <Lines text={p} />
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-[16px] font-semibold text-[var(--ink)]">Your venue, to scale</dt>
                  <dd className="mt-0.5 text-[15px] leading-relaxed text-[var(--slate)]">
                    <Lines text={"Add the floor plan your venue sent and measure one line;\nMesa fits the tables around its walls and pillars."} />
                  </dd>
                </div>
              </dl>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="mesa-frame">
                <PlanPicture chart={sample.chart} still />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Everything's free */}
        <section className="bg-[var(--warm-white)] py-16 md:py-24">
          <div className="container-x">
            <Reveal className="text-center">
              <h2 className="mesa-h2 mx-auto">Everything’s free.</h2>
            </Reveal>
            <dl className="mesa-specs mx-auto mt-10 max-w-[1000px]">
              {[
                ["No guest limit", "300, 500, more.", "ri-team-line", "sky"],
                ["No sign-up to start", "Seat everyone first;\na free account to download.", "ri-door-open-line", "sun"],
                ["Saves as you go", "In this browser,\nor your free account.", "ri-cloud-line", "green"],
                ["Works on your phone", "Tap a group, then a table.", "ri-smartphone-line", "coral"],
                ["Seating rules", "Who sits together,\nwho doesn’t.", "ri-links-line", "lilac"],
                ["Any table", "Round, long, head, U, L,\nsweetheart, cocktail.", "ri-shapes-line", "sky"],
                ["Downloads", "PDF, image, spreadsheet,\nentrance board.", "ri-download-2-line", "sun"],
                ["Share links", "View-only,\nfor your coordinator.", "ri-share-forward-line", "green"],
              ].map(([h, p, icon, tint]) => (
                <div key={h} className={`mesa-spec ${tint}`}>
                  <span className={`mesa-icon ${tint}`} aria-hidden>
                    <i className={icon} />
                  </span>
                  <dt>{h}</dt>
                  <dd>
                    <Lines text={p} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Questions, with the table calculator */}
        <section className="bg-[var(--paper)] py-16 md:py-24">
          <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div className="mesa-calc">
              <h2 className="font-display text-[1.6rem] font-semibold">How many tables?</h2>
              <TableMath />
            </div>
            <div>
              <h2 className="font-display text-[1.6rem] font-semibold text-[var(--ink)]">Questions</h2>
              <div className="mt-4">
                {SEATING_FAQ.map(([q, a]) => (
                  <details key={q} className="group border-b border-[var(--line)] py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                      {q}
                      <i className="ri-add-line text-xl text-[var(--slate)] transition-transform group-open:rotate-45" />
                    </summary>
                    <p className="mt-2 text-[15px] leading-relaxed text-[var(--slate)]">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="relative overflow-hidden py-16 text-center md:py-24" style={{ background: "linear-gradient(0deg, #fff1cc 0%, #fff8e6 45%, var(--warm-white) 100%)" }}>
          <Confetti lite />
          <div className="container-x mesa-hero-content">
            <CharacterTrio className="mx-auto w-[150px] md:w-[180px]" />
            <h2 className="mesa-h2 mx-auto mt-8">Save everyone a seat.</h2>
            <p className="mesa-p mx-auto">
              Then let guests find their own table on your{" "}
              <Link to="/build" className="font-medium text-[var(--ink)] underline underline-offset-4">
                RSVP Studio website
              </Link>
              .
            </p>
            <div className="mt-8">{startButtons}</div>
          </div>
        </section>
      </main>
      <FooterSection />
      {sheet ? <StartSheet current={current} onClose={() => setSheet(false)} onReady={onReady} /> : null}
    </>
  );
}
