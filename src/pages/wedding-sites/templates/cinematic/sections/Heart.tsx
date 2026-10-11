/** The reference's one heart path (feather "heart"), filled or outlined. */
export function Heart({ size, fill = "none", stroke, strokeWidth, opacity, className }: { size: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke ?? "none"} strokeWidth={strokeWidth} opacity={opacity} aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
