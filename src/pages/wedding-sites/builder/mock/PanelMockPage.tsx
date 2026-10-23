import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

// Dev-only: three directions for the builder's Details panel, side by side, clickable, with
// the same sample content (Outline, Find, Guided). For choosing one; not wired to a site.

// ---- tokens ----
const C = { ink: "#000727", slate: "#6b6b7c", line: "#e7e7e0", strong: "#d6d6ce", paper: "#f5f5f2", white: "#fffff9" };
const font = "Inter, system-ui, sans-serif";

// ---- sample content ----
type Sec = { key: string; label: string; meta: string; hideable: boolean; essential?: boolean };
const SECTIONS: Sec[] = [
  { key: "names", label: "Names & cover", meta: "Isabella & Mateo", hideable: false, essential: true },
  { key: "story", label: "Your story", meta: "3 paragraphs", hideable: true },
  { key: "venue", label: "Date & venue", meta: "Jun 14 · Villa Aurelia", hideable: true, essential: true },
  { key: "schedule", label: "Schedule", meta: "4 items", hideable: true, essential: true },
  { key: "stay", label: "Travel & stay", meta: "2 hotels · 1 note", hideable: true },
  { key: "people", label: "Special people", meta: "2 people", hideable: false },
  { key: "entourage", label: "Entourage", meta: "Empty", hideable: true },
  { key: "photos", label: "Photos", meta: "6 photos", hideable: true, essential: true },
  { key: "gifts", label: "Gifts", meta: "2 links · GCash", hideable: true },
  { key: "faqs", label: "FAQs", meta: "5 questions", hideable: true },
  { key: "rsvp", label: "RSVP", meta: "Not set", hideable: false, essential: true },
];
const PALETTES: [string, string[]][] = [
  ["Ivory & Ink", ["#fffff9", "#000727", "#8a8aa0"]],
  ["Paper & Indigo", ["#f6f4ee", "#1d2357", "#7d84b2"]],
  ["Warm Coral", ["#fff8f3", "#3a2a26", "#e46f5c"]],
  ["Sky & Slate", ["#f4f8fb", "#253041", "#5aa6d6"]],
  ["Burgundy & Cream", ["#fbf6ee", "#5b1622", "#a3485a"]],
  ["Maroon & Linen", ["#f5efe6", "#4a1b1b", "#a47d6a"]],
  ["Blush & Sage", ["#fbf4f2", "#3d4a3d", "#c97f8a"]],
  ["Court Pink & Green", ["#fbf7f2", "#14513a", "#e89bb2"]],
  ["Wine & Gold", ["#fbf6ef", "#4b1325", "#c79a4b"]],
  ["Olive & Cream", ["#f8f5ea", "#3e4425", "#a5452f"]],
  ["Cream & Gold", ["#fcf8ef", "#2f2a22", "#c2a265"]],
  ["Night Court", ["#0e1430", "#f3f1ea", "#8ea0c8"]],
];
type Person = { id: number; name: string; role: string };
const PEOPLE: Person[] = [
  { id: 1, name: "Sofia Rossi", role: "Maid of honour" },
  { id: 2, name: "Diego Alvarez", role: "Best man" },
];

// ---- icons (1.5px line) ----
const I = {
  chev: <path d="m9 6 6 6-6 6" />,
  back: <path d="m15 6-6 6 6 6" />,
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17.3 17.3 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  dots: (
    <>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
    </>
  ),
  check: <path d="m6 12.5 4 4 8-9" />,
  page: <path d="M6 4h9l3 3v13H6zM15 4v3h3" />,
  brush: <path d="M4 20c3 0 5-1 5-4l7-9 2 2-9 7c0 3-2 4-5 4Z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
    </>
  ),
};
const Icon = ({ d, size = 16, color = C.slate, style }: { d: ReactNode; size?: number; color?: string; style?: CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", ...style }}>
    {d}
  </svg>
);

// ---- atoms ----
const iconBtn: CSSProperties = { width: 32, height: 32, display: "grid", placeItems: "center", border: 0, borderRadius: 8, background: "transparent", cursor: "pointer" };
function Header({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <div style={{ height: 56, display: "flex", alignItems: "center", gap: 6, padding: "0 12px 0 16px", borderBottom: onBack ? `1px solid ${C.line}` : "none", flex: "none" }}>
      {onBack ? (
        <button type="button" aria-label="Back" onClick={onBack} style={{ ...iconBtn, marginLeft: -8 }}>
          <Icon d={I.back} color={C.ink} />
        </button>
      ) : null}
      <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      {right}
      <button type="button" aria-label="Close" style={iconBtn}>
        <Icon d={I.x} />
      </button>
    </div>
  );
}
function Field({ label, hint, value, placeholder, type = "text", half }: { label: string; hint?: string; value?: string; placeholder?: string; type?: string; half?: boolean }) {
  return (
    <label style={{ display: "grid", gap: 6, marginBottom: 16, gridColumn: half ? "span 1" : "1 / -1" }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{label}</span>
      <input type={type} defaultValue={value} placeholder={placeholder} style={input} />
      {hint ? <span style={{ fontSize: 12, color: C.slate, marginTop: -2 }}>{hint}</span> : null}
    </label>
  );
}
const input: CSSProperties = { height: 40, padding: "0 12px", border: `1px solid ${C.strong}`, borderRadius: 8, background: "#fff", font: `400 14px ${font}`, color: C.ink, outline: "none", width: "100%", boxSizing: "border-box" };
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{ width: 32, height: 18, padding: 2, border: 0, borderRadius: 999, background: on ? C.ink : C.strong, cursor: "pointer", flex: "none", transition: "background .15s" }}>
      <span style={{ display: "block", width: 14, height: 14, borderRadius: 999, background: "#fff", transform: on ? "translateX(14px)" : "none", transition: "transform .15s" }} />
    </button>
  );
}
function AddBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="pm-hover" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 10px", marginLeft: -10, border: 0, borderRadius: 8, background: "transparent", color: C.ink, font: `500 14px ${font}`, cursor: "pointer" }}>
      <Icon d={I.plus} color={C.ink} />
      {children}
    </button>
  );
}
const Group = ({ children }: { children: ReactNode }) => <div style={{ margin: "18px 0 4px", fontSize: 12, fontWeight: 500, color: C.slate }}>{children}</div>;
const Note = ({ children }: { children: ReactNode }) => <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.5, color: C.slate }}>{children}</p>;

/** A sliding page: one view at a time. */
const Slide = ({ k, children }: { k: string; children: ReactNode }) => (
  <div key={k} className="pm-slide" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
    {children}
  </div>
);
const Body = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 16px 24px", ...style }}>{children}</div>;

// ---- drill-in pages (shared) ----
function PeoplePage({ compact = false }: { compact?: boolean }) {
  const [people, setPeople] = useState(PEOPLE);
  const [menu, setMenu] = useState<number | null>(null);
  return (
    <>
      {compact ? null : <Note>People named on your page, like your maid of honour or ninongs.</Note>}
      {compact ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 28px", gap: 8, padding: "6px 0", fontSize: 12, fontWeight: 500, color: C.slate, borderBottom: `1px solid ${C.line}` }}>
          <span>Name</span>
          <span>Role</span>
          <span />
        </div>
      ) : null}
      {people.map((p) => (
        <div key={p.id} style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 28px", gap: 8, alignItems: "center", minHeight: compact ? 40 : 48, borderBottom: `1px solid ${C.line}` }}>
          <input defaultValue={p.name} placeholder="Name" style={quiet} className="pm-quiet" />
          <input defaultValue={p.role} placeholder="Maid of honour" style={quiet} className="pm-quiet" />
          <button type="button" aria-label="More" onClick={() => setMenu(menu === p.id ? null : p.id)} style={{ ...iconBtn, width: 28, height: 28 }}>
            <Icon d={I.dots} />
          </button>
          {menu === p.id ? (
            <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 5, width: 160, padding: 4, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 10px 30px -12px rgba(0,7,39,.25)" }}>
              {["Move up", "Move down"].map((m) => (
                <button key={m} type="button" onClick={() => setMenu(null)} className="pm-hover" style={menuItem}>
                  {m}
                </button>
              ))}
              <button
                type="button"
                className="pm-hover"
                onClick={() => {
                  setPeople(people.filter((x) => x.id !== p.id));
                  setMenu(null);
                }}
                style={{ ...menuItem, color: "#a3311f" }}
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
      ))}
      <div style={{ marginTop: 10 }}>
        <AddBtn onClick={() => setPeople([...people, { id: Date.now(), name: "", role: "" }])}>Add person</AddBtn>
      </div>
    </>
  );
}
const quiet: CSSProperties = { ...input, height: 34, padding: "0 8px", border: "1px solid transparent", background: "transparent" };
const menuItem: CSSProperties = { display: "block", width: "100%", height: 34, padding: "0 10px", border: 0, borderRadius: 7, background: "transparent", textAlign: "left", font: `400 14px ${font}`, color: C.ink, cursor: "pointer" };

function VenuePage({ list = false }: { list?: boolean }) {
  const [own, setOwn] = useState(false);
  if (list) {
    const rows: [string, string, string?][] = [
      ["Date", "2027-06-14", "date"],
      ["Start time", "16:00", "time"],
      ["RSVP by", "2027-05-02", "date"],
      ["Venue", "Villa Aurelia"],
      ["Address", "Via delle Colline 12, Florence"],
    ];
    return (
      <div style={{ marginTop: 4 }}>
        {rows.map(([l, v, t]) => (
          <label key={l} style={{ display: "grid", gridTemplateColumns: "112px 1fr", alignItems: "center", minHeight: 40, borderBottom: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 13, color: C.slate }}>{l}</span>
            <input type={t ?? "text"} defaultValue={v} style={quiet} className="pm-quiet" />
          </label>
        ))}
        <p style={{ margin: "12px 0 0", fontSize: 12, color: C.slate }}>Guests get a map from the name and address.</p>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 12, marginTop: 4 }}>
      <Field label="Event date" type="date" value="2027-06-14" half />
      <Field label="Start time" type="time" value="16:00" half />
      <Field label="RSVP by" type="date" value="2027-05-02" hint="Guests see “Please reply by May 2”, and the form closes after." />
      <Field label="Venue name" value="Villa Aurelia" />
      <Field label="Venue address" value="Via delle Colline 12, Florence" hint="Guests get a map from the name and address." />
      <div style={{ gridColumn: "1 / -1" }}>
        {own ? <Field label="Your own map link" placeholder="https://maps.app.goo.gl/…" /> : <AddBtn onClick={() => setOwn(true)}>Use your own map link</AddBtn>}
      </div>
    </div>
  );
}

function ColoursPage() {
  const [sel, setSel] = useState(0);
  return (
    <>
      <Note>Pick a palette. Your fonts stay as they are.</Note>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px 8px" }}>
        {PALETTES.map(([name, cs], i) => (
          <button key={name} type="button" onClick={() => setSel(i)} style={{ display: "grid", gap: 6, padding: 0, border: 0, background: "none", cursor: "pointer", textAlign: "left" }}>
            <span style={{ display: "flex", height: 48, borderRadius: 8, overflow: "hidden", outline: sel === i ? `2px solid ${C.ink}` : `1px solid ${C.line}`, outlineOffset: sel === i ? 2 : -1 }}>
              {cs.map((c) => (
                <span key={c} style={{ flex: 1, background: c }} />
              ))}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.ink, lineHeight: 1.25 }}>{name}</span>
          </button>
        ))}
      </div>
    </>
  );
}
const Stub = ({ label }: { label: string }) => <Note>{label} keeps today’s fields, laid out like Date &amp; venue.</Note>;

function Premium({ onRow }: { onRow?: () => void }) {
  const rows = ["Remind guests 2 days before", "Let guests share their photos", "Only guests with a personal link can RSVP", "Let guests find their table"];
  return (
    <>
      <Group>Premium</Group>
      {rows.map((r) => (
        <button key={r} type="button" onClick={onRow} className="pm-hover" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, padding: "0 8px", marginLeft: -8, border: 0, borderRadius: 8, background: "transparent", textAlign: "left", cursor: "pointer", font: `400 14px ${font}`, color: C.slate }}>
          <span style={{ flex: 1 }}>{r}</span>
          <Icon d={I.lock} size={14} />
        </button>
      ))}
    </>
  );
}

// ---- 1. Outline ----
function Outline() {
  const [tab, setTab] = useState<"sections" | "style" | "settings">("sections");
  const [page, setPage] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({ faqs: true });
  const [pw, setPw] = useState(false);
  const sec = SECTIONS.find((s) => s.key === page);
  if (page) {
    const title = sec?.label ?? (page === "colours" ? "Colours" : page === "fonts" ? "Fonts" : "Cover photo");
    return (
      <Slide k={page}>
        <Header
          title={title}
          onBack={() => setPage(null)}
          right={
            sec?.hideable ? (
              <button type="button" aria-label={hidden[sec.key] ? "Show on site" : "Hide from site"} onClick={() => setHidden({ ...hidden, [sec.key]: !hidden[sec.key] })} style={iconBtn}>
                <Icon d={hidden[sec.key] ? I.eyeOff : I.eye} />
              </button>
            ) : null
          }
        />
        <Body style={{ paddingTop: 16 }}>{page === "people" ? <PeoplePage /> : page === "venue" ? <VenuePage /> : page === "colours" ? <ColoursPage /> : <Stub label={title} />}</Body>
      </Slide>
    );
  }
  return (
    <Slide k={`top-${tab}`}>
      <Header title="Edit site" right={<button type="button" aria-label="Search" style={iconBtn}><Icon d={I.search} /></button>} />
      <div style={{ padding: "0 16px 12px" }}>
        <div role="tablist" style={{ display: "flex", height: 32, padding: 2, borderRadius: 8, background: C.paper }}>
          {(["sections", "style", "settings"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={{ flex: 1, border: tab === t ? `1px solid ${C.line}` : "1px solid transparent", borderRadius: 6, background: tab === t ? "#fff" : "transparent", boxShadow: tab === t ? "0 1px 2px rgba(0,7,39,.06)" : "none", font: `500 13px ${font}`, color: tab === t ? C.ink : C.slate, cursor: "pointer", textTransform: "capitalize" }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <Body>
        {tab === "sections" ? (
          <>
            {SECTIONS.map((s) => (
              <div key={s.key} className="pm-row" style={{ display: "flex", alignItems: "center", gap: 6, height: 44, padding: "0 4px 0 8px", margin: "0 -8px", borderRadius: 8, cursor: "pointer" }} onClick={() => setPage(s.key)}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: hidden[s.key] ? C.slate : C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
                <span style={{ maxWidth: 140, fontSize: 13, color: C.slate, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hidden[s.key] ? "" : s.meta}</span>
                {s.hideable ? (
                  <button
                    type="button"
                    className={hidden[s.key] ? "" : "pm-eye"}
                    aria-label={hidden[s.key] ? `Show ${s.label}` : `Hide ${s.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHidden({ ...hidden, [s.key]: !hidden[s.key] });
                    }}
                    style={{ ...iconBtn, width: 28, height: 28 }}
                  >
                    <Icon d={hidden[s.key] ? I.eyeOff : I.eye} />
                  </button>
                ) : (
                  <span style={{ width: 28 }} />
                )}
                <Icon d={I.chev} />
              </div>
            ))}
            <p style={{ margin: "16px 0 0", fontSize: 12, color: C.slate }}>Sections run in the same order as your page. Move them there.</p>
          </>
        ) : tab === "style" ? (
          <>
            {[
              ["cover", "Cover photo", ""],
              ["colours", "Colours", "Ivory & Ink"],
              ["fonts", "Fonts", "Lora & Inter"],
            ].map(([k, l, m]) => (
              <div key={k} className="pm-row" onClick={() => setPage(k)} style={{ display: "flex", alignItems: "center", gap: 10, height: k === "cover" ? 56 : 44, padding: "0 4px 0 8px", margin: "0 -8px", borderRadius: 8, cursor: "pointer" }}>
                {k === "cover" ? <span style={{ width: 40, height: 40, borderRadius: 6, background: "linear-gradient(135deg,#d9cbb8,#8f7a62)", flex: "none" }} /> : null}
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.ink }}>{l}</span>
                <span style={{ fontSize: 13, color: C.slate }}>{m}</span>
                <Icon d={I.chev} />
              </div>
            ))}
          </>
        ) : (
          <>
            <Note>These apply to your live site right away.</Note>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
              <span style={{ flex: 1, fontSize: 14, color: C.ink }}>Ask guests for a password</span>
              <Switch on={pw} onChange={setPw} label="Ask guests for a password" />
            </div>
            {pw ? <Field label="Password" placeholder="At least 4 characters" /> : null}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
              <span style={{ flex: 1, fontSize: 14, color: C.ink }}>Ask for the names of everyone they’re bringing</span>
              <Switch on={false} onChange={() => {}} label="Ask for names" />
            </div>
            <Premium />
          </>
        )}
      </Body>
    </Slide>
  );
}

// ---- 2. Find ----
type Hit = { group: string; label: string; meta?: string; page: string; icon: ReactNode };
function Find() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const all: Hit[] = useMemo(
    () => [
      ...SECTIONS.map((s) => ({ group: "On your page", label: s.label, meta: s.meta, page: s.key, icon: I.page })),
      { group: "Style", label: "Cover photo", page: "cover", icon: I.brush },
      { group: "Style", label: "Colours", meta: "Ivory & Ink", page: "colours", icon: I.brush },
      { group: "Style", label: "Fonts", meta: "Lora & Inter", page: "fonts", icon: I.brush },
      { group: "Guests", label: "Password", meta: "Off", page: "guests", icon: I.user },
      { group: "Guests", label: "Plus-one names", meta: "Off", page: "guests", icon: I.user },
      { group: "Premium", label: "Reminders, photo sharing, tables", page: "premium", icon: I.lock },
    ],
    [],
  );
  const fields: Hit[] = [
    { group: "Fields", label: "Venue address", meta: "in Date & venue", page: "venue", icon: I.search },
    { group: "Fields", label: "RSVP by", meta: "in Date & venue", page: "venue", icon: I.search },
    { group: "Actions", label: "Add a person", meta: "Special people", page: "people", icon: I.plus },
    { group: "Actions", label: "Hide FAQs", page: "faqs", icon: I.eyeOff },
  ];
  const hits = q.trim() ? [...fields, ...all].filter((h) => (h.label + " " + (h.meta ?? "")).toLowerCase().includes(q.toLowerCase())) : all;
  if (page) {
    const t = all.find((h) => h.page === page)?.label ?? "Details";
    return (
      <Slide k={page}>
        <Header title={t} onBack={() => setPage(null)} />
        <Body style={{ paddingTop: 12 }}>{page === "people" ? <PeoplePage compact /> : page === "venue" ? <VenuePage list /> : page === "colours" ? <ColoursPage /> : page === "premium" ? <Premium /> : <Stub label={t} />}</Body>
      </Slide>
    );
  }
  let last = "";
  return (
    <Slide k="find">
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 56, padding: "0 12px 0 16px", flex: "none" }}>
        <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 10px", borderRadius: 8, background: C.paper }}>
          <Icon d={I.search} />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHi(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setHi((h) => Math.min(h + 1, hits.length - 1));
              if (e.key === "ArrowUp") setHi((h) => Math.max(h - 1, 0));
              if (e.key === "Enter" && hits[hi]) setPage(hits[hi].page);
              if (e.key === "Escape") setQ("");
            }}
            placeholder="Find a section, field or setting"
            style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", font: `400 14px ${font}`, color: C.ink }}
          />
          <kbd style={{ height: 18, minWidth: 18, display: "grid", placeItems: "center", border: `1px solid ${C.line}`, borderRadius: 4, font: `500 11px ${font}`, color: C.slate, background: "#fff" }}>/</kbd>
        </label>
        <button type="button" aria-label="Close" style={iconBtn}>
          <Icon d={I.x} />
        </button>
      </div>
      <Body>
        {hits.length ? (
          hits.map((h, i) => {
            const head = h.group !== last ? ((last = h.group), <Group key={`g-${h.group}`}>{h.group}</Group>) : null;
            return (
              <div key={`${h.group}-${h.label}`}>
                {head}
                <div onMouseEnter={() => setHi(i)} onClick={() => setPage(h.page)} style={{ display: "flex", alignItems: "center", gap: 10, height: 36, padding: "0 8px", margin: "0 -8px", borderRadius: 8, background: hi === i ? C.paper : "transparent", cursor: "pointer" }}>
                  <Icon d={h.icon} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.label}</span>
                  {h.meta ? <span style={{ fontSize: 12, color: C.slate, whiteSpace: "nowrap" }}>{h.meta}</span> : null}
                </div>
              </div>
            );
          })
        ) : (
          <Note>Nothing called that. Try “gifts” or “password”.</Note>
        )}
        <p style={{ margin: "18px 0 0", fontSize: 12, color: C.slate }}>↑ ↓ to move, Enter to open, Esc to clear.</p>
      </Body>
    </Slide>
  );
}

// ---- 3. Guided ----
function Guided() {
  const [page, setPage] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({ names: true, venue: true, schedule: true, photos: true });
  const essentials = SECTIONS.filter((s) => s.essential);
  const count = essentials.filter((s) => done[s.key]).length;
  const next = essentials.find((s) => !done[s.key]);
  if (page) {
    const s = SECTIONS.find((x) => x.key === page)!;
    return (
      <Slide k={page}>
        <Header title={s.label} onBack={() => setPage(null)} />
        <Body style={{ paddingTop: 16 }}>{page === "people" ? <PeoplePage /> : page === "venue" ? <VenuePage /> : <Stub label={s.label} />}</Body>
        <div style={{ flex: "none", padding: 12, borderTop: `1px solid ${C.line}`, background: C.white }}>
          <button
            type="button"
            onClick={() => {
              setDone({ ...done, [page]: true });
              setPage(null);
            }}
            style={{ width: "100%", height: 40, border: 0, borderRadius: 8, background: C.ink, color: "#fff", font: `600 14px ${font}`, cursor: "pointer" }}
          >
            Done
          </button>
        </div>
      </Slide>
    );
  }
  return (
    <Slide k="guided">
      <Header title="Your site" />
      <Body>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>
          {count} of {essentials.length} essentials done
        </div>
        <div style={{ height: 4, margin: "8px 0 16px", borderRadius: 2, background: C.line, overflow: "hidden" }}>
          <div style={{ width: `${(count / essentials.length) * 100}%`, height: "100%", background: C.ink, transition: "width .24s ease" }} />
        </div>
        {next ? (
          <div style={{ padding: 16, border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff", marginBottom: 18 }}>
            <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 18, fontWeight: 500, color: C.ink }}>Set up your RSVP</div>
            <p style={{ margin: "4px 0 14px", fontSize: 13, lineHeight: 1.5, color: C.slate }}>Choose when replies close. Guests see the date on the form.</p>
            <Field label="RSVP by" type="date" />
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button type="button" onClick={() => setDone({ ...done, [next.key]: true })} style={{ height: 36, padding: "0 16px", border: 0, borderRadius: 8, background: C.ink, color: "#fff", font: `600 13px ${font}`, cursor: "pointer" }}>
                Save and continue
              </button>
              <button type="button" style={{ border: 0, background: "none", font: `500 13px ${font}`, color: C.slate, cursor: "pointer" }}>
                Skip for now
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: 16, border: `1px solid ${C.line}`, borderRadius: 12, background: "#fff", marginBottom: 18 }}>
            <div style={{ fontFamily: "Lora, Georgia, serif", fontSize: 18, fontWeight: 500, color: C.ink }}>Everything guests need is in</div>
            <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.5, color: C.slate }}>Check it on a phone, then publish.</p>
          </div>
        )}
        {essentials
          .filter((s) => s !== next)
          .map((s) => (
            <div key={s.key} className="pm-row" onClick={() => setPage(s.key)} style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 4px 0 8px", margin: "0 -8px", borderRadius: 8, cursor: "pointer" }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, display: "grid", placeItems: "center", flex: "none", background: done[s.key] ? C.ink : "transparent", border: done[s.key] ? 0 : `1.5px solid ${C.strong}` }}>{done[s.key] ? <Icon d={I.check} size={12} color="#fff" /> : null}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.ink }}>{s.label}</span>
              <span style={{ fontSize: 13, color: C.slate }}>{s.meta}</span>
              <Icon d={I.chev} />
            </div>
          ))}
        <Group>Optional</Group>
        {SECTIONS.filter((s) => !s.essential).map((s) => (
          <div key={s.key} className="pm-row" onClick={() => setPage(s.key)} style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 4px 0 8px", margin: "0 -8px", borderRadius: 8, cursor: "pointer" }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.ink }}>{s.label}</span>
            <span style={{ fontSize: 13, color: s.meta === "Empty" ? C.ink : C.slate, fontWeight: s.meta === "Empty" ? 500 : 400 }}>{s.meta === "Empty" ? "Add" : s.meta}</span>
            <Icon d={I.chev} />
          </div>
        ))}
        <Premium />
      </Body>
    </Slide>
  );
}

// ---- page ----
export default function PanelMockPage() {
  const [phone, setPhone] = useState(false);
  const w = phone ? 390 : 380;
  const cols: [string, string, () => ReactNode][] = [
    ["1 · Outline", "Page outline in page order, Sections / Style / Settings. Drill in to edit.", () => <Outline />],
    ["2 · Find", "Search first: sections, fields and actions. Keyboard-friendly, compact.", () => <Find />],
    ["3 · Guided", "Progress to ready, one next step at a time. For first-time hosts.", () => <Guided />],
  ];
  return (
    <div style={{ minHeight: "100vh", background: "#e3ded4", padding: "28px 24px 48px", fontFamily: font, color: C.ink }}>
      <style>{`
        .pm-row:hover,.pm-hover:hover{background:${C.paper}!important}
        .pm-row .pm-eye{opacity:0}.pm-row:hover .pm-eye{opacity:1}
        .pm-quiet:hover{border-color:${C.strong}!important}.pm-quiet:focus{border-color:${C.ink}!important;background:#fff!important;box-shadow:0 0 0 3px rgba(0,7,39,.08)}
        .pm-slide{animation:pm-in .16s cubic-bezier(.2,.8,.2,1)}
        @keyframes pm-in{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
        ${phone ? ".pm-row .pm-eye{opacity:1}" : ""}
        @media (prefers-reduced-motion:reduce){.pm-slide{animation:none}}
      `}</style>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: "Lora, Georgia, serif", fontSize: 26, fontWeight: 500 }}>Details panel: three directions</h1>
        <span style={{ fontSize: 13, color: C.slate }}>Same content in each. Click rows, tabs, eyes and the ⋯ menus.</span>
        <button type="button" onClick={() => setPhone(!phone)} style={{ marginLeft: "auto", height: 34, padding: "0 14px", border: `1px solid ${C.strong}`, borderRadius: 999, background: "#fff", font: `500 13px ${font}`, cursor: "pointer" }}>
          {phone ? "Show desktop size" : "Show phone size"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {cols.map(([t, d, render]) => (
          <div key={t} style={{ width: w }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div>
            <p style={{ margin: "4px 0 10px", fontSize: 13, color: C.slate, minHeight: 36 }}>{d}</p>
            <div style={{ height: phone ? 760 : 720, display: "flex", flexDirection: "column", background: C.white, borderRadius: phone ? 28 : 12, border: `1px solid ${C.line}`, overflow: "hidden", boxShadow: "0 20px 50px -30px rgba(0,7,39,.35)" }}>{render()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
