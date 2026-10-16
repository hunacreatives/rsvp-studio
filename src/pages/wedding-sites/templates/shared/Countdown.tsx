import { useEffect, useState } from "react";

// Days : hours : minutes : seconds to the event (Philippine time when the date
// has no zone). Ticks every second when `live`; otherwise shows the count once.
// Each template styles the classes it passes in (prefix, e.g. "ll" → .ll-count).

/** Days : hours : minutes : seconds to the event (ticks every second once mounted). */
export function Countdown({ iso, live, prefix = "ll" }: { iso: string; live: boolean; prefix?: string }) {
  const target = Date.parse(iso.includes("T") ? `${iso}${/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? "" : "+08:00"}` : `${iso}T00:00:00+08:00`);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);
  if (Number.isNaN(target)) return null;
  const left = Math.max(0, target - now);
  const d = Math.floor(left / 86_400_000), h = Math.floor(left / 3_600_000) % 24, m = Math.floor(left / 60_000) % 60, s = Math.floor(left / 1000) % 60;
  const cell = (v: number, label: string) => (
    <div className={`${prefix}-count__cell`}>
      <span className={`${prefix}-count__n`}>{String(v).padStart(2, "0")}</span>
      <span className={`${prefix}-count__l`}>{label}</span>
    </div>
  );
  return (
    <div className={`${prefix}-count`} role="timer" aria-label={`${d} days, ${h} hours and ${m} minutes to go`}>
      {cell(d, "Days")}
      <span className={`${prefix}-count__sep`}>:</span>
      {cell(h, "Hours")}
      <span className={`${prefix}-count__sep`}>:</span>
      {cell(m, "Minutes")}
      <span className={`${prefix}-count__sep`}>:</span>
      {cell(s, "Seconds")}
    </div>
  );
}

