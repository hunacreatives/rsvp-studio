// Lengths as people read them. The plan is always kept in centimetres; this only changes how
// sizes and distances are shown and typed: metres ("1.20 m", "85 cm") or feet and inches
// ("5′ 3″"), for venues and rental tables measured in feet ("60-inch rounds").

export type Units = "m" | "ft";

const IN = 2.54;

/** A length for labels: "85 cm", "1.20 m", "12.5 m" · "9″", "5′ 3″". */
export function fmtLen(cm: number, units: Units = "m"): string {
  const v = Math.max(0, cm);
  if (units === "ft") {
    const inches = Math.round(v / IN);
    const ft = Math.floor(inches / 12);
    const rest = inches % 12;
    if (!ft) return `${rest}″`;
    return rest ? `${ft}′ ${rest}″` : `${ft}′`;
  }
  if (v < 100) return `${Math.round(v)} cm`;
  return `${(v / 100).toFixed(v < 1000 ? 2 : 1)} m`;
}

/** Width × depth: "6.00 × 4.50 m", "19′ 8″ × 14′ 9″". */
export function fmtSize(w: number, h: number, units: Units = "m"): string {
  if (units === "ft") return `${fmtLen(w, "ft")} × ${fmtLen(h, "ft")}`;
  return `${(w / 100).toFixed(2)} × ${(h / 100).toFixed(2)} m`;
}

/** What a typed field shows: metres with 2 decimals ("1.20"), or feet and inches ("5′ 3″"). */
export function fieldLen(cm: number, units: Units = "m"): string {
  return units === "ft" ? fmtLen(cm, "ft") : (cm / 100).toFixed(2);
}

/**
 * A typed length, in centimetres, or null if it can't be read. A bare number is metres (or
 * feet); units can be written out: "120 cm", "1.2m", "5'3\"", "5 ft 3 in", "63in", "5′ 3″".
 * `size`: a table or a stage, not a position: then a bare number from 20 up is centimetres (or
 * inches), since nobody means a 180-metre table.
 */
export function parseLen(text: string, units: Units = "m", size = false): number | null {
  const s = text.trim().toLowerCase().replace(/,/g, ".").replace(/[′’']/g, "'").replace(/[″”"]/g, '"');
  if (!s) return null;
  const num = "(\\d+(?:\\.\\d+)?|\\.\\d+)";
  const only = (re: string) => new RegExp(`^${re}$`).exec(s);
  let m: RegExpExecArray | null;
  if ((m = only(`${num}\\s*cm`))) return Number(m[1]);
  if ((m = only(`${num}\\s*mm`))) return Number(m[1]) / 10;
  if ((m = only(`${num}\\s*m`))) return Number(m[1]) * 100;
  if ((m = only(`${num}\\s*(?:in|")`))) return Number(m[1]) * IN;
  // Feet, with or without inches after: 5' · 5ft · 5' 3" · 5 ft 3 in · 5'3
  if ((m = only(`${num}\\s*(?:ft|')\\s*(?:${num}\\s*(?:in|")?)?`))) return (Number(m[1]) * 12 + Number(m[2] ?? 0)) * IN;
  if ((m = only(num))) {
    const v = Number(m[1]);
    const small = size && v >= 20;
    if (units === "ft") return small ? v * IN : v * 12 * IN;
    return small ? v : v * 100;
  }
  return null;
}
