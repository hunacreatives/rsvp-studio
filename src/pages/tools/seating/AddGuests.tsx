import { useMemo, useState } from "react";
import { parseGuestText, SAMPLE_LIST } from "./parse";
import type { Chart } from "./model";
import { commit } from "./store";
import { seatByTableLabels } from "./presets";

// Paste more guests into an open chart: shows how the list was read before adding it.

export default function AddGuests({ chart, onClose, onAdded }: { chart: Chart; onClose(): void; onAdded(n: number): void }) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const parsed = useMemo(() => (text.trim() ? parseGuestText(text, chart) : null), [text, chart]);

  const add = () => {
    if (!parsed?.guests.length) return;
    commit((c) => {
      c.groups.push(...parsed.groups);
      c.guests.push(...parsed.guests);
      // "TABLE 5: …" lists: those guests go straight to their tables.
      seatByTableLabels(c, parsed.wantTable);
    });
    onAdded(parsed.guests.length);
    onClose();
  };

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    if (/\.(xlsx|xls|numbers)$/i.test(f.name)) {
      setNote("Save the sheet as CSV first (File → Download → CSV), or copy the rows and paste them here.");
      return;
    }
    setNote("");
    setText(await f.text());
  };

  return (
    <div className="sp-scrim" onClick={onClose}>
      <div className="sp-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-add-h" onClick={(e) => e.stopPropagation()}>
        <h2 id="sp-add-h">Add guests</h2>
        <p>Paste from Viber, Notes, Excel or Google Sheets. One household per line works best. Headings like “Bride’s family” keep people together.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Tito Ben & Tita Marie Santos + 2 kids\nMr. & Mrs. Cruz\nJuan dela Cruz +1\n\nOFFICE MATES\nArnel, Bryan, Carla"}
          autoFocus
          aria-label="Guest list"
        />
        {note ? <p style={{ color: "var(--warn)" }}>{note}</p> : null}
        {parsed ? (
          <>
            <p>
              <b style={{ color: "var(--panel-fg)" }}>
                {parsed.guests.length} {parsed.guests.length === 1 ? "person" : "people"}
              </b>{" "}
              in {parsed.parties.length} {parsed.parties.length === 1 ? "household" : "households"}
              {parsed.groups.length ? `, ${parsed.groups.length} new ${parsed.groups.length === 1 ? "group" : "groups"}` : ""}
              {parsed.duplicates ? `. ${parsed.duplicates} already on your list, skipped.` : "."}
              {Object.keys(parsed.wantTable).length ? ` ${Object.keys(parsed.wantTable).length} already have a table and will be seated there.` : ""}
            </p>
            <div className="sp-preview">
              {parsed.parties.slice(0, 60).map((p, i) => (
                <div key={i}>
                  <span title={p.people.join(", ")}>{p.people.join(", ")}</span>
                  <em>{p.group ?? ""}</em>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <div className="row">
          <label className="sp-link" style={{ marginRight: "auto" }}>
            Upload a CSV
            <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain,.xlsx,.xls" hidden onChange={(e) => readFile(e.target.files?.[0])} />
          </label>
          {!chart.guests.length && !text ? (
            <button className="sp-link" onClick={() => setText(SAMPLE_LIST)}>
              Try a sample list
            </button>
          ) : null}
          <button className="sp-btn soft" onClick={onClose}>
            Cancel
          </button>
          <button className="sp-btn primary" disabled={!parsed?.guests.length} onClick={add}>
            Add {parsed?.guests.length || ""} {parsed?.guests.length === 1 ? "guest" : "guests"}
          </button>
        </div>
      </div>
    </div>
  );
}
