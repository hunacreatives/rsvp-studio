import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildLayout, seatByTableLabels, seatHonorees } from "./presets";
import { ReadList, ReadNotes } from "./ReadCheck";
import { parseGuestText, SAMPLE_LIST } from "./parse";
import { emptyChart, uid, type Chart, type ChartKind } from "./model";
import { open, readBackup, setBgImage } from "./store";
import { toDataUrl } from "./venue";
import { useSignedIn } from "./cloud";
import { householdsFromEvent, type EventGuests } from "./replies";
import { loadInvitees, loadReplies, myEvents, type SiteEvent } from "./website";
import { trackEvent } from "@/lib/analytics";

// Starting a plan, in three short steps over the page:
//   1. What are you planning?  the kind of event (each card a small drawing of its room) and,
//      optionally, whose celebration it is.
//   2. Your guests             paste a list, upload a file, start with a number, or (signed in)
//                              bring in an RSVP Studio event's invite list and replies.
//   3. Check and create        "Here's what we read", guests per table, seat everyone.
// The plan itself is made exactly as before (presets.ts buildLayout, then the honorees and
// any "TABLE 5" lines seated). A plan already in this browser gets a "Continue it" banner.

type Source = "paste" | "file" | "none" | "event";

/** The event's kind of celebration → the room Mesa sets out. */
const KIND_OF: Record<string, ChartKind> = { wedding: "wedding", debut: "debut", engagement: "party", birthday: "party", baby: "party", milestone: "party", party: "party" };

const KINDS: { kind: ChartKind; label: string; blurb: string; who: string }[] = [
  { kind: "wedding", label: "Wedding", blurb: "Presidential table, sponsors, both sides", who: "Andrea & Miguel" },
  { kind: "debut", label: "Debut", blurb: "Debutante’s table, family, Roses and Candles", who: "Bea" },
  { kind: "lauriat", label: "Lauriat", blurb: "12-seat rounds and a VIP table", who: "The Tan family" },
  { kind: "party", label: "Birthday or other", blurb: "A stage, a VIP table and rounds", who: "Mia’s 30th" },
  { kind: "blank", label: "Empty room", blurb: "Start from a blank floor", who: "Our event" },
];

/** A small drawing of each room, in the card. */
function RoomArt({ kind }: { kind: ChartKind }) {
  const dot = (x: number, y: number, r = 3.4) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />;
  const rows = (xs: number[], ys: number[], r?: number) => ys.flatMap((y) => xs.map((x) => dot(x, y, r)));
  return (
    <svg viewBox="0 0 72 48" className="h-12 w-[72px]" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      {kind === "blank" ? (
        <rect x="6" y="5" width="60" height="38" rx="3" strokeDasharray="3 3" />
      ) : (
        <>
          {kind !== "lauriat" ? <rect x={kind === "debut" ? 27 : 20} y="5" width={kind === "debut" ? 18 : 32} height="5" rx="1.5" fill="currentColor" stroke="none" opacity=".85" /> : null}
          {kind === "lauriat" ? rows([14, 30, 46, 62], [14, 34], 5) : null}
          {kind === "wedding" || kind === "debut" ? (
            <>
              <rect x="27" y="19" width="18" height="16" rx="1.5" strokeDasharray="2 2" opacity=".7" />
              {rows([8, 18], [18, 30, 42])}
              {rows([54, 64], [18, 30, 42])}
            </>
          ) : null}
          {kind === "party" ? rows([12, 26, 46, 60], [22, 38]) : null}
        </>
      )}
    </svg>
  );
}

/** A round table with its chairs, for the "guests per table" cards. */
function TableArt({ seats }: { seats: number }) {
  const pts = Array.from({ length: seats }, (_, i) => {
    const a = (i / seats) * Math.PI * 2 - Math.PI / 2;
    return [24 + Math.cos(a) * 17, 24 + Math.sin(a) * 17];
  });
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle cx="24" cy="24" r="10" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="currentColor" stroke="none" opacity=".75" />
      ))}
    </svg>
  );
}

/** A big choice card: selected gets the ink border and a tick. */
function Choice({ on, onClick, children, className = "" }: { on: boolean; onClick(): void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`relative rounded-2xl border bg-white text-left transition-[border-color,box-shadow,transform] duration-150 active:scale-[.985] ${on ? "border-[var(--ink)] shadow-[0_0_0_1px_var(--ink)]" : "border-[var(--line)] hover:border-[rgba(0,7,39,0.35)]"} ${className}`}
    >
      {on ? (
        <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[var(--ink)] text-white" aria-hidden>
          <i className="ri-check-line text-[13px]" />
        </span>
      ) : null}
      {children}
    </button>
  );
}

// The plan's name when "Whose celebration?" is left blank (it's the plan's name, not Mesa's).
const DEFAULT_NAME: Record<ChartKind, string> = { wedding: "Our wedding", debut: "Our debut", lauriat: "Our lauriat", party: "Our celebration", blank: "Our event" };

export default function StartFlow({ onClose, onReady, current, onContinue, startEvent }: { onClose(): void; onReady(autoSeat: boolean): void; current?: Chart | null; onContinue?(): void; startEvent?: string }) {
  const [step, setStep] = useState<1 | 2 | 3>(startEvent ? 2 : 1);
  const [kind, setKind] = useState<ChartKind>("wedding");
  const [names, setNames] = useState("");
  const [source, setSource] = useState<Source>(startEvent ? "event" : "paste");
  // From an RSVP Studio event: the host's events, the one picked, and what it brought in.
  const { userId } = useSignedIn();
  const [events, setEvents] = useState<SiteEvent[] | null>(null);
  const [eventId, setEventId] = useState<string | null>(startEvent ?? null);
  const [fromEvent, setFromEvent] = useState<EventGuests | null>(null);
  const [eventBusy, setEventBusy] = useState(false);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [count, setCount] = useState(150);
  const [perTable, setPerTable] = useState<8 | 10 | 12>(10);
  // The venue's floor plan, if they have one: it goes under the plan, and Room & venue opens
  // after so Mesa can read it (or they measure it).
  const [venue, setVenue] = useState<{ url: string; w: number; h: number; name: string } | null>(null);
  const [venueErr, setVenueErr] = useState("");
  const [autoSeat, setAutoSeat] = useState(true);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const textParsed = useMemo(() => (source !== "none" && source !== "event" && text.trim() ? parseGuestText(text) : null), [text, source]);
  const parsed = source === "event" ? fromEvent : textParsed;
  const ev = events?.find((e) => e.id === eventId) ?? null;

  useEffect(() => {
    if (!userId || events) return;
    myEvents(userId).then((list) => {
      setEvents(list);
      if (!eventId && list.length === 1 && !list[0].legacy) setEventId(list[0].id);
    });
  }, [userId, events, eventId]);
  // Picking an event reads its invite list and replies; its kind of event sets the room.
  useEffect(() => {
    if (source !== "event" || !eventId || !events) return;
    const e = events.find((x) => x.id === eventId);
    if (!e || e.legacy) return setFromEvent(null);
    let alive = true;
    setEventBusy(true);
    setNote("");
    if (KIND_OF[e.type ?? ""]) setKind(KIND_OF[e.type ?? ""]);
    Promise.all([loadInvitees(e.id), loadReplies(e.id)]).then(([inv, rs]) => {
      if (!alive) return;
      setEventBusy(false);
      if (!inv || !rs) return setNote("Couldn’t read that event’s guests. Please try again.");
      setFromEvent(householdsFromEvent(inv, rs));
    });
    return () => {
      alive = false;
    };
  }, [source, eventId, events]);
  const info = KINDS.find((k) => k.kind === kind)!;
  const body = useRef<HTMLDivElement>(null);

  // Once per opening: Esc closes, and the page behind doesn't scroll.
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
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [step]);

  const build = () => {
    const guests = parsed?.guests ?? [];
    const groups = parsed?.groups ?? [];
    const special = guests.filter((g) => ["vip", "entourage", "court"].includes(groups.find((x) => x.id === g.groupId)?.cat ?? "")).length;
    const n = guests.length || (source === "none" ? count : 0);
    const layout = buildLayout(kind, n, perTable, special, groups.length);
    const who = names.trim().slice(0, 80);
    const chart: Chart = { ...emptyChart(kind), title: who || (source === "event" && ev ? ev.name : DEFAULT_NAME[kind]), ...layout, groups, guests, ...(who ? { names: who } : {}) };
    // Started from an event: linked from the start (saved with it), so later replies find it.
    if (source === "event" && ev && fromEvent) chart.site = { eventId: ev.id, slug: ev.slug, finder: ev.premium && ev.finder, seen: fromEvent.seen, syncedAt: Date.now() };
    if (who && (kind === "wedding" || kind === "debut")) seatHonorees(chart, who);
    if (parsed) seatByTableLabels(chart, parsed.wantTable);
    if (venue) {
      const key = uid("b");
      setBgImage(key, venue.url);
      chart.bg = { key, x: 0, y: 0, w: chart.room.w, h: Math.round((chart.room.w * venue.h) / venue.w), opacity: 0.55 };
      try {
        sessionStorage.setItem("seating:open-room", "1");
      } catch {
        /* the dialog just won't open by itself */
      }
    }
    open(chart);
    trackEvent("seating_start", { layout: kind, guests: guests.length, source });
    onReady(autoSeat && guests.some((g) => !chart.guests.find((x) => x.id === g.id)?.tableId));
  };

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    setNote("");
    if (/\.json$/i.test(f.name) || f.type === "application/json") {
      const c = await readBackup(f);
      if (!c) return setNote("That isn’t a Mesa file. Mesa files end in -mesa-plan.json.");
      open(c);
      onReady(false);
      return;
    }
    if (/\.(xlsx|xls|numbers)$/i.test(f.name)) {
      setNote("Save the sheet as CSV first (File → Download → CSV), or copy the rows and paste them.");
      return;
    }
    setFileName(f.name);
    setText(await f.text());
  };

  const hasList = !!parsed?.guests.length;
  const canNext = step === 1 || (step === 2 && (source === "none" ? count >= 10 : hasList));
  const canUseEvents = !!userId && !!events?.length;
  const steps = ["Event", "Guests", "Check"];
  const label = "text-[14px] font-medium text-[var(--ink)]";
  const status = parsed ? (
    <p className="flex items-center gap-2 text-[14px] text-[var(--ink)]">
      {hasList ? <i className="ri-checkbox-circle-fill text-[18px] text-[#2e8b57]" aria-hidden /> : null}
      <span>
        {hasList ? (
          <>
            <b className="font-semibold">{parsed.guests.length} guests</b> found
            {parsed.groups.length > 1 ? `, in ${parsed.groups.length} groups` : ""}
          </>
        ) : (
          "No names found yet."
        )}
      </span>
    </p>
  ) : null;

  return (
    <div className="mesa-sheet-scrim" onClick={onClose} data-lenis-prevent>
      <div className="mesa-sheet mesa-flow" role="dialog" aria-modal="true" aria-labelledby="mesa-flow-h" onClick={(e) => e.stopPropagation()}>
        {/* Progress and close */}
        <div className="flex items-center gap-4">
          <ol className="flex flex-1 gap-1.5" aria-label={`Step ${step} of 3`}>
            {steps.map((s, i) => (
              <li key={s} className="flex-1">
                <span className={`block h-1 rounded-full transition-colors duration-300 ${i < step ? "bg-[var(--ink)]" : "bg-[var(--line)]"}`} />
                <span className={`mt-1.5 block text-[12px] font-medium ${i + 1 === step ? "text-[var(--ink)]" : "text-[var(--slate)]"}`}>{s}</span>
              </li>
            ))}
          </ol>
          <button onClick={onClose} aria-label="Close" className="-mr-2 -mt-3 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--slate)] hover:bg-[var(--paper)]">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div ref={body} className="mesa-flow-body">
          {step === 1 ? (
            <div key="s1" className="mesa-step">
              {current && onContinue ? (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--paper)] px-4 py-3 text-[14px] text-[var(--ink)]">
                  <span>
                    You have <b className="font-semibold">“{current.title}”</b> in progress.
                  </span>
                  <button className="font-semibold underline underline-offset-4" onClick={onContinue}>
                    Continue it
                  </button>
                </div>
              ) : null}
              <h2 id="mesa-flow-h" className="mesa-flow-h">
                What are you planning?
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Type of event">
                {KINDS.map((k) => (
                  <Choice
                    key={k.kind}
                    on={kind === k.kind}
                    onClick={() => {
                      setKind(k.kind);
                      if (k.kind === "lauriat") setPerTable(12);
                    }}
                    className="flex flex-col items-start justify-start px-3.5 pb-3.5 pt-3"
                  >
                    <span className={`block ${kind === k.kind ? "text-[var(--ink)]" : "text-[var(--slate)]"}`}>
                      <RoomArt kind={k.kind} />
                    </span>
                    <span className="mt-2 block text-[15px] font-semibold text-[var(--ink)]">{k.label}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--slate)]">{k.blurb}</span>
                  </Choice>
                ))}
              </div>
              <label className={`mt-6 block ${label}`}>
                Whose celebration? <span className="font-normal text-[var(--slate)]">(optional)</span>
                <input value={names} onChange={(e) => setNames(e.target.value)} placeholder={info.who} autoComplete="off" className="mesa-field mt-1.5 h-12" />
                <span className="mt-1.5 block text-[13px] font-normal text-[var(--slate)]">
                  {kind === "wedding" ? "The couple sit at the middle of the presidential table." : kind === "debut" ? "She sits at the debutante’s table." : "It’s the name of your plan."}
                </span>
              </label>
              {kind !== "blank" ? (
                <div className="mt-6">
                  <p className={label}>Guests per table</p>
                  <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Guests per table">
                    {([8, 10, 12] as const).map((n) => (
                      <Choice key={n} on={perTable === n} onClick={() => setPerTable(n)} className="flex min-h-[56px] items-center justify-center px-2 py-2">
                        <span className={`flex items-center gap-2 ${perTable === n ? "text-[var(--ink)]" : "text-[var(--slate)]"}`}>
                          <TableArt seats={n} />
                          <span className="text-[15px] font-semibold text-[var(--ink)]">{n}</span>
                        </span>
                      </Choice>
                    ))}
                  </div>
                  <p className="mt-2 text-[13px] text-[var(--slate)]">You can change any table later.</p>
                </div>
              ) : null}
              <div className="mt-6">
                <p className={label}>
                  The venue’s floor plan <span className="font-normal text-[var(--slate)]">(optional)</span>
                </p>
                {venue ? (
                  <div className="mesa-venue mt-2">
                    <img src={venue.url} alt="" />
                    <span>
                      <b>{venue.name}</b>
                      <small>Your room is set up from it once the plan opens.</small>
                    </span>
                    <button className="font-semibold underline underline-offset-4" onClick={() => setVenue(null)}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="mesa-venue add mt-2">
                    <i className="ri-image-add-line" aria-hidden />
                    <span>
                      <b>Add a photo or screenshot of it</b>
                      <small>From your venue or coordinator. Mesa uses it to set up the room.</small>
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        if (!f.type.startsWith("image/")) return setVenueErr("Use a picture (PNG or JPEG). For a PDF, take a screenshot of the floor plan first.");
                        const img = await toDataUrl(f);
                        if (!img) return setVenueErr("Couldn’t read that picture. Try a PNG or JPEG.");
                        setVenueErr("");
                        setVenue({ ...img, name: f.name.length > 40 ? `${f.name.slice(0, 37)}…` : f.name });
                      }}
                    />
                  </label>
                )}
                {venueErr ? <p className="mt-2 text-[13px] text-[var(--warn,#b4532e)]">{venueErr}</p> : null}
              </div>
            </div>
          ) : step === 2 ? (
            <div key="s2" className="mesa-step">
              <h2 id="mesa-flow-h" className="mesa-flow-h">
                Your guests
              </h2>
              <p className="mt-1.5 text-[15px] text-[var(--slate)]">Any format works. You’ll check what we read next.</p>
              <div className={`mt-5 grid gap-2 ${canUseEvents ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`} role="radiogroup" aria-label="How to add guests">
                {(
                  [
                    ...(canUseEvents ? ([["event", "ri-mail-open-line", "From my RSVPs"]] as const) : []),
                    ["paste", "ri-clipboard-line", "Paste a list"],
                    ["file", "ri-upload-2-line", "Upload a file"],
                    ["none", "ri-hashtag", "No list yet"],
                  ] as const
                ).map(([s, icon, l]) => (
                  <Choice key={s} on={source === s} onClick={() => (setSource(s), setNote(""))} className="grid min-h-[84px] place-items-center px-2 py-3 text-center">
                    <span>
                      <i className={`${icon} block text-[22px] ${source === s ? "text-[var(--ink)]" : "text-[var(--slate)]"}`} aria-hidden />
                      <span className="mt-1 block text-[13.5px] font-semibold text-[var(--ink)]">{l}</span>
                    </span>
                  </Choice>
                ))}
              </div>

              {source === "event" ? (
                <div className="mt-5">
                  {!events ? (
                    <p className="text-[14px] text-[var(--slate)]">Looking for your events…</p>
                  ) : (
                    <div className="mesa-events" role="radiogroup" aria-label="Your event">
                      {events.map((e) => (
                        <Choice key={e.id} on={eventId === e.id} onClick={() => !e.legacy && setEventId(e.id)} className={`flex flex-col items-start px-4 py-3 text-left ${e.legacy ? "opacity-60" : ""}`}>
                          <span className="text-[15px] font-semibold text-[var(--ink)]">{e.name}</span>
                          <span className="mt-0.5 text-[13px] text-[var(--slate)]">
                            {e.legacy ? "Mesa can’t read this site’s replies. Paste your guest list instead." : [e.date ? new Date(`${e.date}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "", e.live ? "Website live" : "Website not published yet"].filter(Boolean).join(" · ")}
                          </span>
                        </Choice>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    {eventBusy ? (
                      <p className="text-[14px] text-[var(--slate)]">Reading your invite list and replies…</p>
                    ) : fromEvent ? (
                      <p className="flex items-center gap-2 text-[14px] text-[var(--ink)]">
                        {fromEvent.guests.length ? <i className="ri-checkbox-circle-fill text-[18px] text-[#2e8b57]" aria-hidden /> : null}
                        <span>
                          {fromEvent.guests.length ? (
                            <>
                              <b className="font-semibold">{fromEvent.guests.length} guests</b> in {fromEvent.parties.length} households
                              {fromEvent.declined ? `. ${fromEvent.declined} can’t come and are left out` : ""}
                            </>
                          ) : (
                            "No guests on this event yet. Add them on its invite list, or paste a list here."
                          )}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : source === "paste" ? (
                <div className="mt-5">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={8}
                    autoFocus
                    aria-label="Guest list"
                    placeholder={"Copy it from Viber, Notes, Excel or Google Sheets and paste it here.\n\nTito Ben & Tita Marie Santos + 2 kids\nLola Cora Santos\nBianca Lopez +1"}
                    className="mesa-field py-3 leading-relaxed"
                  />
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                    {status ?? <p className="text-[13.5px] text-[var(--slate)]">Headings like “Bride’s family” or “Table 5” keep people together.</p>}
                    <button className="text-[13.5px] font-medium text-[var(--ink)] underline underline-offset-4" onClick={() => setText(text ? "" : SAMPLE_LIST)}>
                      {text ? "Clear" : "Use a sample list"}
                    </button>
                  </div>
                </div>
              ) : source === "file" ? (
                <div className="mt-5">
                  <label
                    onDragOver={(e) => (e.preventDefault(), setDragging(true))}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      void readFile(e.dataTransfer.files[0]);
                    }}
                    className={`grid min-h-[170px] cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${dragging ? "border-[var(--acc-blue)] bg-[#eef3ff]" : "border-[var(--line)] bg-white hover:border-[rgba(0,7,39,0.35)]"}`}
                  >
                    <span>
                      <i className="ri-file-text-line block text-[30px] text-[var(--slate)]" aria-hidden />
                      <span className="mt-2 block text-[15px] font-semibold text-[var(--ink)]">{fileName || "Drop your file here, or choose one"}</span>
                      <span className="mt-1 block text-[13px] text-[var(--slate)]">CSV or text, from Excel, Google Sheets or Google Forms. A Mesa file opens too.</span>
                    </span>
                    <input type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.xls,text/csv,text/plain,application/json" hidden onChange={(e) => void readFile(e.target.files?.[0])} />
                  </label>
                  <div className="mt-2.5">{status}</div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-5">
                  <p className={label}>About how many guests?</p>
                  <div className="mt-3 flex items-center gap-3">
                    <button className="mesa-step-btn" aria-label="10 fewer" onClick={() => setCount((c) => Math.max(10, c - 10))}>
                      <i className="ri-subtract-line" />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={10}
                      max={2000}
                      value={count}
                      onChange={(e) => setCount(Math.min(2000, Math.max(0, Math.round(Number(e.target.value) || 0))))}
                      aria-label="Number of guests"
                      className="h-14 w-28 rounded-xl border border-[var(--line)] text-center font-display text-[28px] font-semibold text-[var(--ink)] outline-none focus:border-[var(--ink)]"
                    />
                    <button className="mesa-step-btn" aria-label="10 more" onClick={() => setCount((c) => Math.min(2000, c + 10))}>
                      <i className="ri-add-line" />
                    </button>
                    <span className="text-[15px] text-[var(--slate)]">guests</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[50, 100, 150, 200, 300].map((n) => (
                      <button key={n} onClick={() => setCount(n)} className={`h-9 rounded-full border px-3.5 text-[13.5px] font-medium ${count === n ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)]"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-[13px] text-[var(--slate)]">We’ll set out the tables. Add names any time.</p>
                </div>
              )}
              {note ? <p className="mt-3 text-[13.5px] text-[#b4532e]">{note}</p> : null}
            </div>
          ) : (
            <div key="s3" className="mesa-step">
              <h2 id="mesa-flow-h" className="mesa-flow-h">
                {hasList ? "Here’s what we read" : "Ready to make your plan"}
              </h2>
              {hasList && parsed ? (
                <div className="mt-4 grid gap-3">
                  <p className="text-[15px] text-[var(--slate)]">
                    <b className="font-semibold text-[var(--ink)]">{parsed.guests.length} guests</b> in {parsed.parties.length} households
                    {parsed.groups.length > 1 ? `, ${parsed.groups.length} groups` : ""}
                    {Object.keys(parsed.wantTable).length ? `. ${Object.keys(parsed.wantTable).length} already have a table` : ""}. People on one line sit together.
                  </p>
                  <ReadNotes parsed={parsed} />
                  {source === "event" && fromEvent ? (
                    <p className="text-[13.5px] leading-relaxed text-[var(--slate)]">
                      {fromEvent.pending ? `${fromEvent.pending} ${fromEvent.pending === 1 ? "household hasn’t" : "households haven’t"} replied yet; they’re in, marked as not replied. ` : ""}
                      Ninongs and ninangs go to the sponsors’ tables; everyone else starts in one group. Add headings like “Bride’s family” on the plan (Add guests) and Seat everyone keeps those families together.
                    </p>
                  ) : null}
                  <ReadList parsed={parsed} maxHeight="min(300px, 34dvh)" />
                </div>
              ) : (
                <p className="mt-2 text-[15px] text-[var(--slate)]">
                  {kind === "blank" ? "An empty room. Add tables and guests on the plan." : `A ${info.label.toLowerCase()} room for about ${count} guests, ${perTable} at a table. You can add names on the plan.`}
                </p>
              )}
              {hasList ? (
                <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white px-4 py-3.5">
                  <span>
                    <span className="block text-[15px] font-semibold text-[var(--ink)]">Seat everyone for me</span>
                    <span className="block text-[13px] text-[var(--slate)]">Families together, sponsors up front. You can move anyone after.</span>
                  </span>
                  <input type="checkbox" checked={autoSeat} onChange={(e) => setAutoSeat(e.target.checked)} className="mesa-switch" />
                </label>
              ) : null}
            </div>
          )}
        </div>

        {/* Back / Next, pinned to the bottom of the sheet */}
        <div className="mesa-flow-foot">
          {current && step === 3 ? <p className="mb-3 text-[12.5px] text-[var(--slate)]">This replaces “{current.title}” in this browser. Save it as a Mesa file or to a free account first to keep it.</p> : null}
          <div className="flex items-center justify-between gap-3">
            {step > 1 ? (
              <button className="btn btn-ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2)}>
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button className="btn btn-primary disabled:opacity-40" disabled={!canNext} onClick={() => setStep((s) => (s + 1) as 2 | 3)}>
                Next
              </button>
            ) : (
              <button className="btn btn-primary" onClick={build}>
                Create my plan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
