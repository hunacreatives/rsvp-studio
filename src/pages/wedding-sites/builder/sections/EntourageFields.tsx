import type { EntourageGroup, EventContent } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle } from "../components/FormField";

// Builder → Entourage & motif: sponsors, entourage, 18 roses… in groups (one name per line),
// and the motif colours shown with the dress code. Starting points for Filipino occasions.

const PRESETS: Record<string, string[]> = {
  Wedding: ["Parents of the Bride", "Parents of the Groom", "Principal Sponsors", "Secondary Sponsors: Candle", "Secondary Sponsors: Veil", "Secondary Sponsors: Cord", "Secondary Sponsors: Coin", "Best Man", "Maid of Honor", "Groomsmen", "Bridesmaids", "Bearers", "Flower Girls"],
  Debut: ["18 Roses", "18 Candles", "18 Treasures", "Escort"],
  Christening: ["Godparents"],
  Birthday: ["Hosts"],
};

export default function EntourageFields({ content, onChange }: { content: EventContent; onChange: (next: EventContent) => void }) {
  const groups = content.entourage ?? [];
  const colors = content.motifColors ?? [];
  const set = (next: EntourageGroup[]) => onChange({ ...content, entourage: next });
  const patch = (i: number, p: Partial<EntourageGroup>) => set(groups.map((g, j) => (j === i ? { ...g, ...p } : g)));
  const small: React.CSSProperties = { fontSize: 13, color: "var(--slate)", margin: 0 };
  const chip: React.CSSProperties = { minHeight: 36, padding: "0 12px", borderRadius: 999, fontSize: 13, cursor: "pointer", border: "1px solid var(--line)", background: "#fff", color: "var(--ink)" };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!groups.length ? (
        <div>
          <p style={{ ...small, marginBottom: 8 }}>Start with the usual groups for your event:</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(PRESETS).map(([k, titles]) => (
              <button key={k} type="button" style={chip} onClick={() => set(titles.map((title) => ({ id: createId("grp"), title, people: [] })))}>
                {k}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {groups.map((g, i) => (
        <div key={g.id} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 12, display: "grid", gap: 8 }}>
          <input style={{ ...inputStyle, fontWeight: 600 }} value={g.title} maxLength={60} placeholder="Group, e.g. Principal Sponsors" onChange={(e) => patch(i, { title: e.target.value })} aria-label="Group name" />
          <textarea
            style={{ ...inputStyle, minHeight: 84, resize: "vertical" }}
            value={g.people.join("\n")}
            placeholder={"One name per line\ne.g. Mr. & Mrs. Jose Santos"}
            aria-label={`${g.title || "Group"} names`}
            onChange={(e) => patch(i, { people: e.target.value.split("\n").slice(0, 60) })}
            onBlur={(e) => patch(i, { people: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 60) })}
          />
          <button type="button" onClick={() => set(groups.filter((_, j) => j !== i))} style={{ justifySelf: "end", minHeight: 36, border: "none", background: "none", color: "#c2412d", fontSize: 13, cursor: "pointer" }}>
            Remove group
          </button>
        </div>
      ))}
      {groups.length ? (
        <button type="button" onClick={() => set([...groups, { id: createId("grp"), title: "", people: [] }])} style={{ ...chip, minHeight: 44, borderStyle: "dashed" }}>
          + Add a group
        </button>
      ) : null}

      <FormField label="Motif colours (optional)" hint="Shown with your dress code, so guests can match.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {colors.map((c, i) => (
            <span key={i} style={{ position: "relative", display: "inline-flex" }}>
              <input type="color" value={c} aria-label={`Colour ${i + 1}`} onChange={(e) => onChange({ ...content, motifColors: colors.map((x, j) => (j === i ? e.target.value : x)) })} style={{ width: 44, height: 44, padding: 0, border: "1px solid var(--line)", borderRadius: 12, background: "none", cursor: "pointer" }} />
              <button type="button" aria-label="Remove colour" onClick={() => onChange({ ...content, motifColors: colors.filter((_, j) => j !== i) })} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, border: "1px solid var(--line)", background: "#fff", fontSize: 12, lineHeight: "18px", cursor: "pointer", padding: 0 }}>
                ×
              </button>
            </span>
          ))}
          {colors.length < 6 ? (
            <button type="button" onClick={() => onChange({ ...content, motifColors: [...colors, "#c9a96e"] })} style={{ ...chip, minHeight: 44 }}>
              + Add a colour
            </button>
          ) : null}
        </div>
      </FormField>
    </div>
  );
}
