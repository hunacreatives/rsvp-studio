import { useMemo } from "react";
import { pixelPaths } from "./art";

/** A sprite (rows of pixels) as a crisp SVG, for the windows' portraits and the HUD's coin. */
export function Pix({ rows, className }: { rows: string[]; className?: string }) {
  const { w, h, paths } = useMemo(() => pixelPaths(rows), [rows]);
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden>
      {paths.map((p, i) => (
        <path key={i} fill={p.fill} d={p.d} />
      ))}
    </svg>
  );
}
