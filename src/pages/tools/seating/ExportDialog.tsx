import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Chart } from "./model";
import { azList, boardSvg, downloadBoardPng, downloadPng, downloadSheet, planSvg, tableLists, tableName } from "./exporting";
import { exportBackup } from "./store";

// Download: PDF (through the browser's print dialog, so text stays sharp and fonts are
// real), a PNG image, a spreadsheet, or a backup file to reopen later.

type Paper = "A4" | "Letter" | "A3";

export default function ExportDialog({ chart, onClose, onDone }: { chart: Chart; onClose(): void; onDone(what: string): void }) {
  const [parts, setParts] = useState({ plan: true, az: true, tables: true });
  const [paper, setPaper] = useState<Paper>("A4");
  const [printing, setPrinting] = useState<null | "lists" | "board">(null);
  const [busy, setBusy] = useState(false);
  const seated = chart.guests.filter((g) => g.tableId).length;
  const unseated = chart.guests.length - seated;

  const png = async () => {
    setBusy(true);
    try {
      await downloadPng(chart);
      onDone("png");
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sp-scrim" onClick={onClose}>
        <div className="sp-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-dl-h" onClick={(e) => e.stopPropagation()}>
          <h2 id="sp-dl-h">Download</h2>
          {unseated ? <p style={{ color: "var(--warn)" }}>{unseated} {unseated === 1 ? "guest isn’t" : "guests aren’t"} seated yet and won’t be on the lists.</p> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <b style={{ fontSize: 14 }}>Print or save as PDF</b>
            <label className="sp-toggle">
              Floor plan
              <input type="checkbox" checked={parts.plan} onChange={(e) => setParts({ ...parts, plan: e.target.checked })} />
            </label>
            <label className="sp-toggle">
              Find your table (A–Z by surname, for the entrance)
              <input type="checkbox" checked={parts.az} onChange={(e) => setParts({ ...parts, az: e.target.checked })} />
            </label>
            <label className="sp-toggle">
              Table lists (for the coordinator and caterer)
              <input type="checkbox" checked={parts.tables} onChange={(e) => setParts({ ...parts, tables: e.target.checked })} />
            </label>
            <div className="sp-seg" role="group" aria-label="Paper size" style={{ borderColor: "var(--panel-line)" }}>
              {(["A4", "Letter", "A3"] as Paper[]).map((p) => (
                <button key={p} aria-pressed={paper === p} onClick={() => setPaper(p)}>
                  {p}
                </button>
              ))}
            </div>
            <button className="sp-btn primary" disabled={!parts.plan && !parts.az && !parts.tables} onClick={() => setPrinting("lists")}>
              Print or save as PDF
            </button>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--panel-line)", width: "100%", margin: "4px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <b style={{ fontSize: 14 }}>Entrance board</b>
            <p>“Find your table”, everyone A–Z with their table, on one A3 poster in navy and gold. Print it at A3 or bigger; the image works at any print shop.</p>
            <div className="sp-acts">
              <button className="sp-btn primary" onClick={() => setPrinting("board")}>
                Print the board
              </button>
              <button
                className="sp-btn soft"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await downloadBoardPng(chart);
                    onDone("board-png");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Board as image
              </button>
            </div>
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--panel-line)", width: "100%", margin: "4px 0" }} />
          <div className="sp-opts">
            <button className="sp-opt" disabled={busy} onClick={png}>
              <b>{busy ? "Preparing…" : "Image"}</b>
              <span>Floor plan as a PNG, to share or print big</span>
            </button>
            <button
              className="sp-opt"
              onClick={() => {
                downloadSheet(chart);
                onDone("csv");
                onClose();
              }}
            >
              <b>Spreadsheet</b>
              <span>Names, groups, tables and meals (CSV)</span>
            </button>
            <button
              className="sp-opt"
              onClick={() => {
                exportBackup(chart);
                onDone("backup");
                onClose();
              }}
            >
              <b>Backup file</b>
              <span>Reopen this plan on any device</span>
            </button>
          </div>
        </div>
      </div>
      {printing ? (
        <PrintSheet
          chart={chart}
          parts={printing === "board" ? { plan: false, az: false, tables: false, board: true } : { ...parts, board: false }}
          paper={printing === "board" ? "A3" : paper}
          onDone={() => {
            onDone(printing === "board" ? "board" : "pdf");
            setPrinting(null);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}

function PrintSheet({ chart, parts, paper, onDone }: { chart: Chart; parts: { plan: boolean; az: boolean; tables: boolean; board: boolean }; paper: Paper; onDone(): void }) {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = parts.board ? `@page { size: A3 portrait; margin: 0; }` : `@page { size: ${paper} ${chart.room.w >= chart.room.h ? "landscape" : "portrait"}; margin: 12mm; }`;
    document.head.appendChild(style);
    const after = () => onDone();
    window.addEventListener("afterprint", after, { once: true });
    const t = setTimeout(() => window.print(), 120);
    return () => {
      clearTimeout(t);
      style.remove();
      window.removeEventListener("afterprint", after);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const az = azList(chart);
  let letter = "";
  return createPortal(
    <div className="sp-print-root">
      <div className="sp-print">
        {parts.board ? (
          <section className="board">
            <div dangerouslySetInnerHTML={{ __html: boardSvg(chart) }} />
          </section>
        ) : null}
        {parts.plan ? (
          <section>
            <div dangerouslySetInnerHTML={{ __html: planSvg(chart, { title: true, credit: true }) }} />
          </section>
        ) : null}
        {parts.az ? (
          <section>
            <h1>Find your table</h1>
            <p className="sub">{chart.title}</p>
            <div className="az">
              {az.flatMap((r, i) => {
                const l = r.key.charAt(0).toUpperCase();
                const out = [];
                if (l !== letter) out.push(<h4 key={`h${i}`}>{l}</h4>);
                letter = l;
                out.push(
                  <div key={i}>
                    <span>{r.name}</span>
                    <b>{r.table}</b>
                  </div>,
                );
                return out;
              })}
            </div>
            <p className="credit">Made with Mesa by The RSVP Studio · thersvpstudio.com</p>
          </section>
        ) : null}
        {parts.tables ? (
          <section>
            <h1>Table lists</h1>
            <p className="sub">{chart.title}</p>
            <div className="tables">
              {tableLists(chart).map(({ t, people }) => (
                <div key={t.id}>
                  <h3>
                    {tableName(t.label)}
                    <small>
                      {people.length}/{t.seats}
                      {t.note ? ` · ${t.note}` : ""}
                    </small>
                  </h3>
                  {people.length ? (
                    <ol>
                      {people.map((g) => (
                        <li key={g.id}>
                          {g.name}
                          {g.meal ? ` — ${g.meal}` : ""}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p style={{ margin: 0, color: "#8a8478" }}>Empty</p>
                  )}
                </div>
              ))}
            </div>
            <p className="credit">Made with Mesa by The RSVP Studio · thersvpstudio.com</p>
          </section>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
