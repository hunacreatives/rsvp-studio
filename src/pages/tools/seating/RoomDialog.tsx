import { useState, type PointerEvent as RPointerEvent } from "react";
import { contentBounds, uid, type Chart } from "./model";
import { bgImage, commit, setBgImage } from "./store";

// Room & venue: the room's real size in metres, and the venue's own floor plan under the
// tables, scaled by one measurement ("this room is 24 m wide") so tables sit at true size.

/** A phone photo or a PDF screenshot → a compressed JPEG data URL (≤ ~800 KB). */
async function toDataUrl(file: File): Promise<{ url: string; w: number; h: number } | null> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  let url = "";
  for (const q of [0.78, 0.65, 0.5, 0.4]) {
    url = canvas.toDataURL("image/jpeg", q);
    if (url.length < 800_000) break;
  }
  return { url, w, h };
}

const m = (cm: number) => Math.round(cm / 10) / 10;

export default function RoomDialog({ chart, onClose, onFit, onFitTables }: { chart: Chart; onClose(): void; onFit(): void; onFitTables(): void }) {
  const [wm, setWm] = useState(String(m(chart.room.w)));
  const [hm, setHm] = useState(String(m(chart.room.h)));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pic = bgImage(chart.bg?.key);

  const setSize = () => {
    const w = Math.round(Number(wm) * 100);
    const h = Math.round(Number(hm) * 100);
    if (!(w >= 300 && w <= 20000 && h >= 300 && h <= 20000)) return setErr("Use a size between 3 and 200 metres.");
    setErr("");
    commit((c) => {
      c.room = { w, h };
    });
    onFit();
  };

  const fitToTables = () => {
    const pad = 150;
    const b0 = contentBounds({ ...chart, room: { w: 0, h: 0 } });
    commit((c) => {
      const b = contentBounds({ ...c, room: { w: 0, h: 0 } });
      const dx = pad - b.x;
      const dy = pad - b.y;
      for (const t of c.tables) Object.assign(t, { x: t.x + dx, y: t.y + dy });
      for (const o of c.objects) Object.assign(o, { x: o.x + dx, y: o.y + dy });
      if (c.bg) Object.assign(c.bg, { x: c.bg.x + dx, y: c.bg.y + dy });
      c.room = { w: Math.round(b.w + pad * 2), h: Math.round(b.h + pad * 2) };
    });
    setWm(String(m(b0.w + pad * 2)));
    setHm(String(m(b0.h + pad * 2)));
    onFit();
  };

  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("Use a picture (PNG or JPEG). For a PDF, take a screenshot of the floor plan first.");
    setBusy(true);
    setErr("");
    const img = await toDataUrl(f);
    setBusy(false);
    if (!img) return setErr("Couldn’t read that picture. Try a PNG or JPEG.");
    const key = uid("b");
    setBgImage(key, img.url);
    commit((c) => {
      // First guess: as wide as the room. They set the real width next.
      const w = c.room.w;
      c.bg = { key, x: 0, y: 0, w, h: Math.round((w * img.h) / img.w), opacity: 0.55 };
    });
    onFit();
  };

  return (
    <div className="sp-scrim" onClick={onClose}>
      <div className="sp-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-room-h" onClick={(e) => e.stopPropagation()}>
        <h2 id="sp-room-h">Room &amp; venue</h2>
        <p>Real sizes, in metres. A 10-seat round table is 1.8 m across, so what fits here fits on the day.</p>
        <div className="sp-two">
          <label className="sp-field dark">
            Width (m)
            <input type="number" inputMode="decimal" step="0.5" min={3} max={200} value={wm} onChange={(e) => setWm(e.target.value)} />
          </label>
          <label className="sp-field dark">
            Depth (m)
            <input type="number" inputMode="decimal" step="0.5" min={3} max={200} value={hm} onChange={(e) => setHm(e.target.value)} />
          </label>
        </div>
        <div className="sp-acts">
          <button className="sp-btn primary" onClick={setSize}>
            Set room size
          </button>
          <button className="sp-btn soft" onClick={onFitTables}>
            Fit the tables to the room
          </button>
          <button className="sp-btn soft" onClick={fitToTables}>
            Fit the room around the tables
          </button>
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--panel-line)", width: "100%", margin: "4px 0" }} />
        <b style={{ fontSize: 15 }}>The venue’s floor plan</b>
        <p>Add the plan your venue or coordinator sent. A photo or screenshot is fine. Then measure one line on it so tables sit at their real size.</p>
        {pic && chart.bg ? (
          <>
            <Calibrate
              pic={pic}
              onFitTables={onFitTables}
              onApply={(bg, room) => {
                commit((c) => {
                  if (!c.bg) return;
                  Object.assign(c.bg, bg);
                  c.room = room;
                });
                setWm(String(m(room.w)));
                setHm(String(m(room.h)));
                onFit();
              }}
            />
            <label className="sp-field dark">
              Show the picture {Math.round(chart.bg.opacity * 100)}%
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(chart.bg.opacity * 100)}
                onChange={(e) => commit((c) => c.bg && (c.bg.opacity = Number(e.target.value) / 100))}
                style={{ height: 24, padding: 0, border: 0 }}
              />
            </label>
            <div className="sp-acts">
              <label className="sp-btn soft">
                Replace picture
                <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              <button className="sp-btn soft sp-danger" onClick={() => commit((c) => delete c.bg)}>
                Remove picture
              </button>
            </div>
          </>
        ) : (
          <label className="sp-btn primary" style={{ alignSelf: "flex-start" }}>
            {busy ? "Adding…" : "Add the venue’s floor plan"}
            <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        )}
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

type Pt = { x: number; y: number };
const FT = 30.48;

/** Set the picture's scale from one line of known length (a wall, or the plan's scale bar),
 *  then line the room's walls up with two of its corners. Points are in the picture's own
 *  pixels, so the screen size doesn't matter. */
function Calibrate({ pic, onApply, onFitTables }: { pic: string; onApply(bg: { x: number; y: number; w: number; h: number }, room: { w: number; h: number }): void; onFitTables(): void }) {
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [step, setStep] = useState<"line" | "corners" | "done">("line");
  const [line, setLine] = useState<Pt[]>([]);
  const [corners, setCorners] = useState<Pt[]>([]);
  const [len, setLen] = useState("");
  const [unit, setUnit] = useState<"m" | "ft">("m");
  const [cmPerPx, setCmPerPx] = useState(0);
  const [err, setErr] = useState("");

  const tap = (e: RPointerEvent<HTMLDivElement>) => {
    if (!nat || step === "done") return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: ((e.clientX - r.left) / r.width) * nat.w, y: ((e.clientY - r.top) / r.height) * nat.h };
    setErr("");
    if (step === "line") setLine((l) => (l.length >= 2 ? [p] : [...l, p]));
    else setCorners((c) => (c.length >= 2 ? [p] : [...c, p]));
  };

  const next = () => {
    const real = Number(len.replace(",", ".")) * (unit === "ft" ? FT : 100);
    const px = line.length === 2 ? Math.hypot(line[1].x - line[0].x, line[1].y - line[0].y) : 0;
    if (!(real > 0) || px < 5) return setErr("Tap both ends of the line, then type how long it is.");
    setCmPerPx(real / px);
    setStep("corners");
  };

  const apply = (whole: boolean) => {
    if (!nat || !cmPerPx) return;
    const bgSize = { w: Math.round(nat.w * cmPerPx), h: Math.round(nat.h * cmPerPx) };
    if (whole || corners.length < 2) {
      if (bgSize.w < 300 || bgSize.w > 20000) return setErr("That makes the picture an unlikely size. Check the length you typed.");
      onApply({ x: 0, y: 0, ...bgSize }, bgSize);
    } else {
      const x0 = Math.min(corners[0].x, corners[1].x);
      const y0 = Math.min(corners[0].y, corners[1].y);
      const room = { w: Math.round(Math.abs(corners[1].x - corners[0].x) * cmPerPx), h: Math.round(Math.abs(corners[1].y - corners[0].y) * cmPerPx) };
      if (room.w < 300 || room.h < 300 || room.w > 20000 || room.h > 20000) return setErr("The room comes out smaller than 3 m or bigger than 200 m. Check the length, or tap the corners again.");
      onApply({ x: Math.round(-x0 * cmPerPx), y: Math.round(-y0 * cmPerPx), ...bgSize }, room);
    }
    setStep("done");
  };

  const dot = nat ? Math.max(nat.w, nat.h) / 110 : 6;
  const pts = step === "line" ? line : corners;
  const roomM = (pp: Pt[]) => (pp.length === 2 && cmPerPx ? `${(Math.abs(pp[1].x - pp[0].x) * cmPerPx / 100).toFixed(1)} × ${(Math.abs(pp[1].y - pp[0].y) * cmPerPx / 100).toFixed(1)} m` : "");

  return (
    <div className="sp-cal">
      <p className="sp-cal-step">
        {step === "line" ? (
          <>
            <b>1.</b> Tap both ends of something you know the length of: a wall, or the plan’s scale bar.
          </>
        ) : step === "corners" ? (
          <>
            <b>2.</b> Tap two opposite corners of the room, so the walls line up.
          </>
        ) : (
          <>Done. The room now matches the plan. Fit your tables to it, or move them yourself.</>
        )}
      </p>
      <div className={`sp-cal-pic${step === "done" ? "" : " live"}`} onPointerDown={tap} style={nat ? { aspectRatio: `${nat.w} / ${nat.h}`, maxWidth: `${(360 * nat.w) / nat.h}px`, margin: "0 auto" } : undefined}>
        <img src={pic} alt="Venue floor plan" draggable={false} onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
        {nat ? (
          <svg viewBox={`0 0 ${nat.w} ${nat.h}`} preserveAspectRatio="none" aria-hidden>
            {step !== "line" && line.length === 2 ? <line x1={line[0].x} y1={line[0].y} x2={line[1].x} y2={line[1].y} className="ln old" /> : null}
            {step === "line" && line.length === 2 ? <line x1={line[0].x} y1={line[0].y} x2={line[1].x} y2={line[1].y} className="ln" /> : null}
            {step !== "line" && corners.length === 2 ? (
              <rect x={Math.min(corners[0].x, corners[1].x)} y={Math.min(corners[0].y, corners[1].y)} width={Math.abs(corners[1].x - corners[0].x)} height={Math.abs(corners[1].y - corners[0].y)} className="rm" />
            ) : null}
            {step !== "done" ? pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={dot} className="pt" />) : null}
          </svg>
        ) : null}
      </div>
      {step === "line" ? (
        <div className="sp-cal-row">
          <label className="sp-field dark">
            That line is
            <input type="number" inputMode="decimal" min={0} step="0.5" value={len} onChange={(e) => setLen(e.target.value)} placeholder={unit === "ft" ? "e.g. 40" : "e.g. 12"} />
          </label>
          <div className="sp-seg" role="group" aria-label="Unit">
            <button aria-pressed={unit === "m"} onClick={() => setUnit("m")}>
              metres
            </button>
            <button aria-pressed={unit === "ft"} onClick={() => setUnit("ft")}>
              feet
            </button>
          </div>
          <button className="sp-btn primary" disabled={line.length < 2 || !len} onClick={next}>
            Next
          </button>
        </div>
      ) : step === "corners" ? (
        <div className="sp-cal-row">
          <span className="sp-cal-size">{roomM(corners) || "Waiting for two corners"}</span>
          <button className="sp-link" onClick={() => apply(true)}>
            Skip, use the whole picture
          </button>
          <button className="sp-btn primary" disabled={corners.length < 2} onClick={() => apply(false)}>
            Use this room
          </button>
        </div>
      ) : (
        <div className="sp-cal-row" style={{ alignItems: "center" }}>
          <button className="sp-btn primary" onClick={onFitTables}>
            Fit my tables to this room
          </button>
          <button
            className="sp-link"
            onClick={() => {
              setStep("line");
              setLine([]);
              setCorners([]);
              setLen("");
            }}
          >
            Measure again
          </button>
        </div>
      )}
      {err ? <p className="sp-err">{err}</p> : null}
    </div>
  );
}
