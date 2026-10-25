import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PresentationState } from "../presentation/types";
import { PanelPages, type PanelGroup } from "./ContentEditor";
import LookAndFeel, { styleSummary, type StylePart } from "./LookAndFeel";
import "./builder.css";

// The builder's Details panel: everything about the site in one organised place, for what
// isn't edited on the page itself (dates, links, QR codes, RSVP rules, colours, privacy).
//
// Three tabs. Sections is guided until the essentials are in (progress, the next step, a
// checklist), then it's the page outline: every section in page order with its status and a
// hide/show eye. Style: cover photo, colours, fonts. Settings: privacy, guests, Premium.
// A row opens its page (Back, or Esc, returns to the same place). Search finds any section or
// field. The content pages all stay mounted, hidden: editing on the page writes through
// their fields (components/usePreviewFollow.ts), which opens a page with openPanelPage().

type Tab = "sections" | "style" | "settings";
const STYLE_PAGES: { id: `style:${StylePart}`; part: StylePart; title: string }[] = [
  { id: "style:cover", part: "cover", title: "Cover photo" },
  { id: "style:colours", part: "colours", title: "Colours" },
  { id: "style:fonts", part: "fonts", title: "Fonts" },
];
const SETTINGS_HITS = ["Ask guests for a password", "Remind guests 2 days before", "Let guests share their photos", "Only guests with a personal link can RSVP", "Let guests find their table", "Text guests who reply by mobile"];

/** Open one of the panel's pages (a group id, or "style:colours" etc.) from anywhere. */
export function openPanelPage(page: string) {
  window.dispatchEvent(new CustomEvent("rs-panel-page", { detail: page }));
}

export default function DetailsPanel({
  groups,
  presentation,
  setPresentation,
  eventId,
  settings,
  onShowSection,
  onClose,
}: {
  groups: PanelGroup[];
  presentation: PresentationState;
  setPresentation: (next: PresentationState) => void;
  eventId: string | undefined;
  /** The Settings tab (GuestSettings). */
  settings: ReactNode;
  onShowSection?: (key: string, on: boolean) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("sections");
  const [page, setPage] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const style = styleSummary(presentation);

  const open = (p: string) => {
    if (!page) listScroll.current = body.current?.scrollTop ?? 0;
    setTab(p.startsWith("style:") ? "style" : "sections");
    setQuery(null);
    setPage(p);
  };
  const back = () => setPage(null);
  // back on the list: where it was
  useLayoutEffect(() => {
    if (!body.current) return;
    body.current.scrollTop = page ? 0 : listScroll.current;
  }, [page]);
  // pages opened from elsewhere (editing on the page)
  useEffect(() => {
    const on = (e: Event) => {
      const p = (e as CustomEvent<string>).detail;
      if (p === "settings") {
        setPage(null);
        setQuery(null);
        setTab("settings");
      } else open(p);
    };
    window.addEventListener("rs-panel-page", on);
    return () => window.removeEventListener("rs-panel-page", on);
  });

  const current = page ? (groups.find((g) => g.id === page) ?? null) : null;
  const stylePage = page ? STYLE_PAGES.find((s) => s.id === page) : undefined;
  const title = current?.title ?? stylePage?.title ?? "";

  // ---- search: sections, style, settings, and every field label in the pages ----
  const hits = useMemo(() => {
    if (query === null) return [];
    const q = query.trim().toLowerCase();
    const out: { label: string; where?: string; go: () => void }[] = [];
    const add = (label: string, go: () => void, where?: string) => {
      if (!q || label.toLowerCase().includes(q)) out.push({ label, where, go });
    };
    for (const g of groups) add(g.title, () => open(g.id));
    for (const s of STYLE_PAGES) if (s.part === "cover" || !style.own) add(s.title, () => open(s.id), "Style");
    for (const s of SETTINGS_HITS) add(s, () => (setQuery(null), setPage(null), setTab("settings")), "Settings");
    if (q && body.current) {
      const seen = new Set<string>();
      for (const pageEl of body.current.querySelectorAll<HTMLElement>("[data-panel-page]")) {
        const g = groups.find((x) => x.id === pageEl.dataset.panelPage);
        for (const l of pageEl.querySelectorAll("label")) {
          const text = (l.textContent ?? "").replace(/\s+/g, " ").trim();
          const key = `${g?.id}:${text}`;
          if (!text || text.length > 60 || seen.has(key) || !text.toLowerCase().includes(q)) continue;
          seen.add(key);
          out.push({
            label: text,
            where: g?.title,
            go: () => {
              if (!g) return;
              open(g.id);
              requestAnimationFrame(() => {
                const field = l.querySelector<HTMLElement>("input, textarea, select") ?? l.parentElement?.querySelector<HTMLElement>("input, textarea, select");
                field?.scrollIntoView({ block: "center" });
                field?.focus({ preventScroll: true });
              });
            },
          });
        }
      }
    }
    return out.slice(0, 40);
  }, [query, groups, style.own]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if ((e.target as HTMLElement).closest("[role=menu]")) return;
      if (query !== null) setQuery(null);
      else if (page) back();
      else return;
      e.stopPropagation();
    }
  };

  // ---- the guided list ----
  const essentials = groups.filter((g) => g.essential);
  const done = essentials.filter((g) => g.essential!.done).length;
  const guiding = essentials.length > 0 && done < essentials.length;
  const next = guiding ? essentials.find((g) => !g.essential!.done) : undefined;
  const startNext = (g: PanelGroup) => {
    open(g.id);
    requestAnimationFrame(() => {
      const el = body.current?.querySelector<HTMLElement>(`[data-panel-page="${g.id}"]`);
      const empty = [...(el?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input:not([type=checkbox]):not([type=file]), textarea") ?? [])].find((f) => !f.value);
      empty?.focus();
    });
  };

  const row = (g: PanelGroup, check?: boolean) => {
    const hidden = !g.shown;
    return (
      <div
        key={g.id}
        role="button"
        tabIndex={0}
        className="dp-row"
        onClick={() => open(g.id)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(g.id))}
        style={rowStyle}
      >
        {check !== undefined ? (
          <span aria-label={check ? "Done" : "To do"} style={{ width: 18, height: 18, flex: "none", display: "grid", placeItems: "center", borderRadius: 999, background: check ? "var(--ink)" : "transparent", border: check ? 0 : "1.5px solid var(--line-strong)" }}>
            {check ? <Icon d={P.check} size={12} color="#fff" /> : null}
          </span>
        ) : null}
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: hidden ? "var(--slate)" : "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</span>
        {!hidden ? (
          g.empty && !g.essential ? (
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Add</span>
          ) : (
            <span style={{ maxWidth: 150, fontSize: 13, color: "var(--slate)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.summary}</span>
          )
        ) : null}
        {g.vis && onShowSection ? (
          <button
            type="button"
            className={`dp-eye ${hidden ? "is-off" : ""}`}
            aria-label={hidden ? `Show ${g.title} on your site` : `Hide ${g.title} from your site`}
            title={hidden ? "Show on your site" : "Hide from your site"}
            onClick={(e) => {
              e.stopPropagation();
              onShowSection(g.vis!, hidden);
            }}
            style={iconBtn28}
          >
            <Icon d={hidden ? P.eyeOff : P.eye} />
          </button>
        ) : (
          <span style={{ width: 28, flex: "none" }} />
        )}
        <Icon d={P.chev} />
      </div>
    );
  };

  return (
    <div className="dp" onKeyDown={onKey} style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "var(--warm-white, #fffff9)" }}>
      {/* header */}
      <div style={{ height: 56, flex: "none", display: "flex", alignItems: "center", gap: 4, padding: "0 10px 0 16px", borderBottom: page ? "1px solid var(--line)" : "none" }}>
        {query !== null ? (
          <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 10px", borderRadius: 8, background: "var(--paper)" }}>
            <Icon d={P.search} />
            <input
              autoFocus
              value={query}
              onChange={(e) => (setQuery(e.target.value), setHi(0))}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") (e.preventDefault(), setHi((h) => Math.min(h + 1, hits.length - 1)));
                if (e.key === "ArrowUp") (e.preventDefault(), setHi((h) => Math.max(h - 1, 0)));
                if (e.key === "Enter" && hits[hi]) hits[hi].go();
              }}
              placeholder="Find a section, field or setting"
              aria-label="Find a section, field or setting"
              style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontSize: "var(--rb-field-font, 14px)", fontFamily: "inherit", color: "var(--ink)" }}
            />
          </label>
        ) : page ? (
          <>
            <button type="button" aria-label="Back" onClick={back} style={{ ...iconBtn32, marginLeft: -8 }}>
              <Icon d={P.back} color="var(--ink)" />
            </button>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            {current?.vis && onShowSection ? (
              <button type="button" aria-label={current.shown ? `Hide ${current.title} from your site` : `Show ${current.title} on your site`} title={current.shown ? "Hide from your site" : "Show on your site"} onClick={() => onShowSection(current.vis!, !current.shown)} style={iconBtn32}>
                <Icon d={current.shown ? P.eye : P.eyeOff} />
              </button>
            ) : null}
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Edit site</span>
            <button type="button" aria-label="Search" title="Find a section or field" onClick={() => setQuery("")} style={iconBtn32}>
              <Icon d={P.search} />
            </button>
          </>
        )}
        <button type="button" aria-label={query !== null ? "Close search" : "Close the panel"} onClick={() => (query !== null ? setQuery(null) : onClose())} style={iconBtn32}>
          <Icon d={P.x} />
        </button>
      </div>

      {/* tabs */}
      {!page && query === null ? (
        <div style={{ padding: "0 16px 10px", flex: "none" }}>
          <div role="tablist" aria-label="Details" style={{ display: "flex", height: 34, padding: 2, borderRadius: 9, background: "var(--paper)" }}>
            {(["sections", "style", "settings"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                style={{ flex: 1, border: tab === t ? "1px solid var(--line)" : "1px solid transparent", borderRadius: 7, background: tab === t ? "#fff" : "transparent", boxShadow: tab === t ? "0 1px 2px rgba(0,7,39,.06)" : "none", fontSize: 13, fontWeight: 500, color: tab === t ? "var(--ink)" : "var(--slate)", cursor: "pointer", fontFamily: "inherit" }}
              >
                {t === "sections" ? "Sections" : t === "style" ? "Style" : "Settings"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div ref={body} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: page ? "16px 16px 40px" : "2px 16px 40px" }}>
        {/* search results */}
        {query !== null ? (
          hits.length ? (
            hits.map((h, i) => (
              <div key={`${h.where}-${h.label}-${i}`} role="button" tabIndex={-1} className="dp-row" onMouseEnter={() => setHi(i)} onClick={h.go} style={{ ...rowStyle, height: 40, background: hi === i ? "var(--paper)" : undefined }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.label}</span>
                {h.where ? <span style={{ fontSize: 12, color: "var(--slate)", whiteSpace: "nowrap" }}>{h.where}</span> : null}
              </div>
            ))
          ) : (
            <p style={note}>Nothing called that. Try “gifts” or “password”.</p>
          )
        ) : null}

        {/* sections: guided, then the outline */}
        {query === null && !page && tab === "sections" ? (
          <>
            {guiding && next ? (
              <>
                <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                  {done} of {essentials.length} essentials done
                </p>
                <div aria-hidden style={{ height: 4, margin: "8px 0 14px", borderRadius: 2, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{ width: `${(done / essentials.length) * 100}%`, height: "100%", background: "var(--ink)", transition: "width .24s ease" }} />
                </div>
                <div style={{ padding: 16, marginBottom: 14, border: "1px solid var(--line)", borderRadius: 12, background: "#fff" }}>
                  <p style={{ margin: 0, fontFamily: "Lora, Georgia, serif", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>{next.essential!.next}</p>
                  <p style={{ margin: "4px 0 14px", fontSize: 13, lineHeight: 1.5, color: "var(--slate)" }}>{next.essential!.hint}</p>
                  <button type="button" onClick={() => startNext(next)} style={{ minHeight: 36, padding: "0 16px", border: 0, borderRadius: 8, background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Start
                  </button>
                </div>
                {essentials.filter((g) => g !== next).map((g) => row(g, g.essential!.done))}
                <p style={groupLabel}>Everything else</p>
                {groups.filter((g) => !g.essential).map((g) => row(g))}
              </>
            ) : (
              groups.map((g) => row(g))
            )}
          </>
        ) : null}

        {/* style */}
        {query === null && !page && tab === "style" ? (
          <>
            <div role="button" tabIndex={0} className="dp-row" onClick={() => open("style:cover")} onKeyDown={(e) => e.key === "Enter" && open("style:cover")} style={{ ...rowStyle, height: 56 }}>
              {style.cover ? <img src={style.cover} alt="" style={{ width: 40, height: 40, flex: "none", borderRadius: 6, objectFit: "cover" }} /> : <span style={{ width: 40, height: 40, flex: "none", borderRadius: 6, background: "var(--paper)", border: "1px dashed var(--line-strong)" }} />}
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>Cover photo</span>
              <span style={{ fontSize: 13, color: "var(--slate)" }}>{style.cover ? "" : "The design’s own"}</span>
              <Icon d={P.chev} />
            </div>
            {!style.own ? (
              <>
                {[
                  ["style:colours", "Colours", style.palette],
                  ["style:fonts", "Fonts", style.fonts],
                ].map(([id, label, meta]) => (
                  <div key={id} role="button" tabIndex={0} className="dp-row" onClick={() => open(id)} onKeyDown={(e) => e.key === "Enter" && open(id)} style={rowStyle}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{label}</span>
                    <span style={{ fontSize: 13, color: "var(--slate)" }}>{meta}</span>
                    <Icon d={P.chev} />
                  </div>
                ))}
              </>
            ) : (
              <p style={{ ...note, marginTop: 12 }}>This design brings its own colours and fonts.</p>
            )}
          </>
        ) : null}

        {/* settings */}
        <div hidden={query !== null || !!page || tab !== "settings"} style={{ paddingTop: 6 }}>
          {settings}
        </div>

        {/* pages */}
        {stylePage ? <LookAndFeel part={stylePage.part} presentation={presentation} onChange={setPresentation} eventId={eventId} loadFontPreviews={stylePage.part === "fonts"} /> : null}
        <PanelPages groups={groups} page={query === null ? page : null} />
      </div>
    </div>
  );
}

// ---- bits ----
const rowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 6px 0 10px", margin: "0 -10px", borderRadius: 8, cursor: "pointer", outline: "none" };
const iconBtn32: CSSProperties = { width: 32, height: 32, flex: "none", display: "grid", placeItems: "center", border: 0, borderRadius: 8, background: "transparent", color: "var(--slate)", cursor: "pointer" };
const iconBtn28: CSSProperties = { ...iconBtn32, width: 28, height: 28 };
const note: CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--slate)" };
const groupLabel: CSSProperties = { margin: "18px 0 4px", fontSize: 12, fontWeight: 500, color: "var(--slate)" };

const P = {
  chev: <path d="m9 6 6 6-6 6" />,
  back: <path d="m15 6-6 6 6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  check: <path d="m6 12.5 4 4 8-9" />,
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
};
function Icon({ d, size = 16, color = "var(--slate)" }: { d: ReactNode; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none" }}>
      {d}
    </svg>
  );
}
