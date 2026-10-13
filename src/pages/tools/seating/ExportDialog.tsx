import { useState } from "react";
import type { Chart } from "./model";
import { downloadBoardPdf, downloadBoardPng, downloadPdf, downloadPng, downloadSheet } from "./exporting";
import type { Paper } from "./pdf";
import { exportBackup } from "./store";

// Download: a real PDF file (made here, no print dialog), the entrance board for the print
// shop, a picture of the floor plan, a spreadsheet, or a backup file to reopen later.

export default function ExportDialog({ chart, onClose, onDone }: { chart: Chart; onClose(): void; onDone(what: string): void }) {
  const [parts, setParts] = useState({ plan: true, az: true, tables: true });
  const [paper, setPaper] = useState<Paper>("A4");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const unseated = chart.guests.filter((g) => !g.tableId).length;

  const run = async (what: string, fn: () => Promise<void> | void) => {
    setBusy(what);
    setErr("");
    try {
      await fn();
      onDone(what);
    } catch {
      setErr("Couldn’t make that file. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sp-scrim" onClick={onClose}>
      <div className="sp-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-dl-h" onClick={(e) => e.stopPropagation()}>
        <h2 id="sp-dl-h">Download</h2>
        {unseated ? <p style={{ color: "var(--warn)" }}>{unseated} {unseated === 1 ? "guest isn’t" : "guests aren’t"} seated yet and won’t be on the lists.</p> : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 15 }}>Seating plan (PDF)</b>
          <label className="sp-toggle">
            Floor plan
            <input type="checkbox" checked={parts.plan} onChange={(e) => setParts({ ...parts, plan: e.target.checked })} />
          </label>
          <label className="sp-toggle">
            Find your table (everyone A–Z)
            <input type="checkbox" checked={parts.az} onChange={(e) => setParts({ ...parts, az: e.target.checked })} />
          </label>
          <label className="sp-toggle">
            Table lists (for your coordinator and caterer)
            <input type="checkbox" checked={parts.tables} onChange={(e) => setParts({ ...parts, tables: e.target.checked })} />
          </label>
          <div className="sp-seg" role="group" aria-label="Paper size" style={{ borderColor: "var(--panel-line)" }}>
            {(["A4", "Letter", "A3"] as Paper[]).map((p) => (
              <button key={p} aria-pressed={paper === p} onClick={() => setPaper(p)}>
                {p}
              </button>
            ))}
          </div>
          <button className="sp-btn primary" disabled={!!busy || (!parts.plan && !parts.az && !parts.tables)} onClick={() => run("pdf", () => downloadPdf(chart, parts, paper))}>
            {busy === "pdf" ? "Making your PDF…" : "Download PDF"}
          </button>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--panel-line)", width: "100%", margin: "4px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 15 }}>Entrance board</b>
          <p>A poster for the venue entrance: “Find your table” with everyone A–Z, in navy and gold, sized A3. Print it at A3 or bigger.</p>
          <div className="sp-acts">
            <button className="sp-btn primary" disabled={!!busy} onClick={() => run("board-pdf", () => downloadBoardPdf(chart))}>
              {busy === "board-pdf" ? "Making it…" : "Download board (PDF)"}
            </button>
            <button className="sp-btn soft" disabled={!!busy} onClick={() => run("board-png", () => downloadBoardPng(chart))}>
              {busy === "board-png" ? "Making it…" : "Board as image"}
            </button>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--panel-line)", width: "100%", margin: "4px 0" }} />
        <div className="sp-opts">
          <button className="sp-opt" disabled={!!busy} onClick={() => run("png", () => downloadPng(chart))}>
            <b>{busy === "png" ? "Making it…" : "Floor plan image"}</b>
            <span>A PNG to share or print big</span>
          </button>
          <button className="sp-opt" disabled={!!busy} onClick={() => run("csv", () => downloadSheet(chart))}>
            <b>Spreadsheet</b>
            <span>Names, groups, tables and meals (CSV)</span>
          </button>
          <button className="sp-opt" disabled={!!busy} onClick={() => run("backup", () => exportBackup(chart))}>
            <b>Backup file</b>
            <span>Reopen this plan on any device</span>
          </button>
        </div>
        {err ? <p className="sp-err">{err}</p> : null}
        <div className="row">
          <button className="sp-btn soft" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
