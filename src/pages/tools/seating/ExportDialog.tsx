import { useMemo, useState } from "react";
import type { Chart } from "./model";
import {
  BOARD_LABEL,
  azPages,
  boardSvg,
  catererPages,
  downloadBoardPdf,
  downloadBoardPng,
  downloadCards,
  downloadPdf,
  downloadPng,
  downloadSheet,
  escortPages,
  placeCardPages,
  planSvg,
  tableCardPages,
  tablePages,
  type BoardSize,
  type CardKind,
  type PdfPart,
} from "./exporting";
import type { Paper } from "./pdf";
import { exportBackup } from "./store";

// Download: pick one thing on the left; the right shows what it looks like, only the
// choices it needs, and one button. Everything is made here in the browser.

type Kind = "plan" | "board" | "numbers" | "escort" | "place" | "image" | "sheet" | "backup";
const ITEMS: { k: Kind; title: string; sub: string; group: "print" | "files" }[] = [
  { k: "plan", title: "Seating plan", sub: "Floor plan and lists, one PDF", group: "print" },
  { k: "board", title: "Entrance board", sub: "Everyone A–Z, poster size", group: "print" },
  { k: "numbers", title: "Table numbers", sub: "For the middle of each table", group: "print" },
  { k: "escort", title: "Escort cards", sub: "Name and table, for the entrance", group: "print" },
  { k: "place", title: "Place cards", sub: "Fold-over, one per seat", group: "print" },
  { k: "image", title: "Floor plan image", sub: "A picture to send or post", group: "files" },
  { k: "sheet", title: "Spreadsheet", sub: "Every guest, table and meal", group: "files" },
  { k: "backup", title: "Mesa file", sub: "This plan, to open again in Mesa", group: "files" },
];
const PARTS: [PdfPart, string, string][] = [
  ["plan", "Floor plan", "Every table, and who sits where"],
  ["az", "Find your table, A–Z", "For guests at the door"],
  ["tables", "Table lists", "For your coordinator"],
  ["caterer", "Caterer sheet", "Guests, kids and meals per table"],
];

// The logo is a separate file the preview can't load; the real download has it.
const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/<image href="\/tools\/mesa\/watermark.png"[^>]*\/>/g, ""))}`;
const pages = (n: number) => `${n} ${n === 1 ? "page" : "pages"}`;

export default function ExportDialog({ chart: plan, onClose, onDone, getShareUrl }: { chart: Chart; onClose(): void; onDone(what: string): void; getShareUrl?: () => Promise<string | null> }) {
  // Guests who replied they can't come are left off everything printed.
  const chart = useMemo(() => ({ ...plan, guests: plan.guests.filter((g) => g.reply !== "no") }), [plan]);
  const [kind, setKind] = useState<Kind>("plan");
  const [open, setOpen] = useState(false); // phones: the list first, then one item
  const [parts, setParts] = useState<Record<PdfPart, boolean>>({ plan: true, az: true, tables: true, caterer: false });
  const [paper, setPaper] = useState<Paper>("A4");
  const [board, setBoard] = useState<BoardSize>("A3");
  const [qr, setQr] = useState(!!getShareUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const seated = chart.guests.filter((g) => g.tableId).length;
  const unseated = chart.guests.length - seated;
  const item = ITEMS.find((i) => i.k === kind)!;

  // What it looks like (its first page) and how much of it there is.
  const view = useMemo(() => {
    if (kind === "plan") {
      const az = parts.az ? azPages(chart, paper) : [];
      const tl = parts.tables ? tablePages(chart, paper) : [];
      const ca = parts.caterer ? catererPages(chart, paper) : [];
      const n = (parts.plan ? 1 : 0) + az.length + tl.length + ca.length;
      const first = parts.plan ? planSvg(chart, { title: true, pageW: 800 }) : (az[0] ?? tl[0] ?? ca[0] ?? "");
      return { svg: first, info: n ? `${pages(n)} · ${paper}` : "Choose at least one" };
    }
    if (kind === "board") return { svg: boardSvg(chart, board), info: `1 poster · ${BOARD_LABEL[board]}` };
    if (kind === "numbers" || kind === "escort" || kind === "place") {
      const p = kind === "numbers" ? tableCardPages(chart, paper) : kind === "escort" ? escortPages(chart, paper) : placeCardPages(chart, paper);
      const tables = chart.tables.filter((t) => t.shape !== "head" && t.shape !== "sweetheart" && chart.guests.some((g) => g.tableId === t.id)).length;
      return { svg: p[0] ?? "", info: `${kind === "numbers" ? `${tables} tables` : `${seated} cards`} · ${pages(p.length)} · ${paper}` };
    }
    if (kind === "image") return { svg: planSvg(chart, { title: true, pageW: 1700 }), info: "PNG, about 4,000 pixels wide" };
    if (kind === "sheet") return { svg: "", info: `CSV with ${chart.guests.length} guests. Opens in Excel or Google Sheets` };
    return { svg: "", info: "Opens only in Mesa: the plan menu → Open a Mesa file" };
  }, [kind, chart, parts, paper, board, seated]);

  const make = async (fn: () => Promise<void> | void, what: string) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
      onDone(what);
    } catch {
      setErr("Couldn’t make that file. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const go = () =>
    make(async () => {
      if (kind === "plan") return downloadPdf(chart, parts, paper);
      if (kind === "board") return downloadBoardPdf(chart, board);
      if (kind === "image") return downloadPng(chart);
      if (kind === "sheet") return downloadSheet(chart);
      if (kind === "backup") return exportBackup(chart);
      let code: string | undefined;
      if (kind === "numbers" && qr && getShareUrl) {
        const url = await getShareUrl();
        if (url) {
          const QR = await import("qrcode");
          code = await QR.toString(url, { type: "svg", margin: 0, color: { dark: "#000727", light: "#ffffff" } });
        }
      }
      return downloadCards(chart, kind as CardKind, paper, code);
    }, kind);

  const usesPaper = kind === "plan" || kind === "numbers" || kind === "escort" || kind === "place";
  const label = kind === "sheet" ? "Download spreadsheet" : kind === "backup" ? "Save Mesa file" : kind === "image" ? "Download image" : "Download PDF";

  return (
    <div className="sp-scrim" onClick={onClose}>
      <div className={`sp-dialog sp-dl${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="sp-dl-h" onClick={(e) => e.stopPropagation()}>
        <div className="sp-dl__top">
          <h2 id="sp-dl-h">Download</h2>
          <button className="sp-ib" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        {unseated ? (
          <p className="sp-dl__warn">
            {unseated} {unseated === 1 ? "guest isn’t" : "guests aren’t"} seated yet and won’t be on these.
          </p>
        ) : null}
        <div className="sp-dl__body">
          <nav className="sp-dl__list" aria-label="What to download">
            {(["print", "files"] as const).map((g) => (
              <div key={g}>
                <p className="sp-dl__group">{g === "print" ? "To print" : "Files"}</p>
                {ITEMS.filter((i) => i.group === g).map((i) => (
                  <button
                    key={i.k}
                    aria-current={kind === i.k ? "true" : undefined}
                    onClick={() => {
                      setKind(i.k);
                      setOpen(true);
                      setErr("");
                    }}
                  >
                    <b>{i.title}</b>
                    <span>{i.sub}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <section className="sp-dl__panel" aria-label={item.title}>
            <button className="sp-dl__back" onClick={() => setOpen(false)}>
              ← All downloads
            </button>
            <div className={`sp-dl__preview${view.svg ? "" : " file"}`}>{view.svg ? <img src={svgUrl(view.svg)} alt={`Preview of the ${item.title.toLowerCase()}`} /> : <span>{kind === "sheet" ? "CSV" : "MESA"}</span>}</div>
            <div className="sp-dl__opts">
              {kind === "plan" ? (
                <div className="sp-dl__checks" role="group" aria-label="What goes in the PDF">
                  {PARTS.map(([k, l, d]) => (
                    <label key={k}>
                      <input type="checkbox" checked={parts[k]} onChange={(e) => setParts({ ...parts, [k]: e.target.checked })} />
                      <span>
                        {l}
                        <small>{d}</small>
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
              {kind === "board" ? (
                <div className="sp-field">
                  Size
                  <div className="sp-seg" role="group" aria-label="Board size">
                    {(Object.keys(BOARD_LABEL) as BoardSize[]).map((s) => (
                      <button key={s} aria-pressed={board === s} onClick={() => setBoard(s)}>
                        {BOARD_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {usesPaper ? (
                <div className="sp-field">
                  Paper
                  <div className="sp-seg" role="group" aria-label="Paper size">
                    {(["A4", "Letter", "A3"] as Paper[]).map((p) => (
                      <button key={p} aria-pressed={paper === p} onClick={() => setPaper(p)}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {kind === "numbers" && getShareUrl ? (
                <label className="sp-toggle">
                  <span>
                    QR code to find your seat
                    <small>{chart.site?.finder ? "Opens Find your table on your website" : "Opens your view-only link"}</small>
                  </span>
                  <input type="checkbox" className="sp-switch" checked={qr} onChange={(e) => setQr(e.target.checked)} />
                </label>
              ) : null}
            </div>
            <div className="sp-dl__go">
              <span>{view.info}</span>
              <button className="sp-btn primary" disabled={busy || (kind === "plan" && !Object.values(parts).some(Boolean))} onClick={go}>
                {busy ? "Making it…" : label}
              </button>
            </div>
            {kind === "board" ? (
              <button className="sp-link soft sp-dl__alt" disabled={busy} onClick={() => make(() => downloadBoardPng(chart, board), "board-png")}>
                Or download it as an image
              </button>
            ) : null}
            {err ? <p className="sp-err">{err}</p> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
