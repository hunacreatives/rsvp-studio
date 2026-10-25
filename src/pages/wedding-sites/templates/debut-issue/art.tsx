// The Debut Issue's printed bits, drawn in code: the barcode on the cover and the back
// cover (its bars come from her name and date, so every issue has its own) and the round
// "reply by" sticker.

function bars(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out: number[] = [];
  for (let i = 0; i < 46; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    out.push(1 + ((h >>> 0) % 3));
  }
  return out;
}

/** An EAN-style barcode with guard bars and the issue's digits under it. */
export function Barcode({ seed, digits, className }: { seed: string; digits: string; className?: string }) {
  const widths = bars(seed);
  let x = 0;
  const rects: { x: number; w: number; tall: boolean }[] = [];
  const guard = (at: number) => {
    rects.push({ x: at, w: 1, tall: true }, { x: at + 2, w: 1, tall: true });
    return at + 4;
  };
  x = guard(0);
  widths.forEach((w, i) => {
    if (i === 23) x = guard(x);
    if (i % 2 === 0) rects.push({ x, w, tall: false });
    x += w;
  });
  x = guard(x);
  return (
    <svg className={className} viewBox={`0 0 ${x} 34`} preserveAspectRatio="none" aria-hidden>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={r.tall ? 30 : 26} fill="currentColor" />
      ))}
      <text x={x / 2} y={33.5} textAnchor="middle" fontSize={6} fill="currentColor" style={{ fontFamily: "var(--di-sans)", letterSpacing: "1.6px" }}>
        {digits}
      </text>
    </svg>
  );
}

/** The round sticker on the cover ("Reply by Nov 1"), a little tilted. */
export function Sticker({ top, big, bottom }: { top: string; big: string; bottom: string }) {
  return (
    <span className="di-sticker" aria-hidden>
      <span className="di-sticker__top">{top}</span>
      <span className="di-sticker__big">{big}</span>
      <span className="di-sticker__bottom">{bottom}</span>
    </span>
  );
}
