// "Show on website": one section's on/off switch in the editor (saved with the
// template's settings, the same switch as Look & Feel's "Sections to show").
export default function ShowSection({ on, onChange, label = "Show on website", warn }: { on: boolean; onChange: (on: boolean) => void; label?: string; warn?: string }) {
  return (
    <label className="rb-check-row" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, margin: "0 0 10px", fontSize: 14, color: "var(--ink)" }}>
      <input type="checkbox" className="rb-check" checked={on} onChange={(e) => onChange(e.target.checked)} />
      {label}
      {!on ? <span style={{ fontSize: 12, color: warn ? "#8a5a00" : "var(--slate)" }}>{warn ? `— ${warn}` : "— hidden"}</span> : null}
    </label>
  );
}
