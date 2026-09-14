/**
 * Placeholder artwork for an invitation card / phone screen.
 * Mirrors the sky + hills motif used in the design mockup until real
 * evite screenshots are dropped in.
 */
export default function InvitePlaceholder({
  className,
  seed = 0,
  label,
  rounded = 14,
}: {
  className?: string;
  seed?: number;
  label?: string;
  rounded?: number;
}) {
  const hue = 190 + ((seed * 37) % 60);
  return (
    <div
      className={className}
      style={{
        borderRadius: rounded,
        overflow: "hidden",
        boxShadow: "0 30px 60px -30px rgba(0,7,39,0.28)",
      }}
    >
      <svg
        viewBox="0 0 300 400"
        className="block w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`sky-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`hsl(${hue} 80% 92%)`} />
            <stop offset="1" stopColor={`hsl(${hue} 62% 78%)`} />
          </linearGradient>
        </defs>
        <rect width="300" height="400" fill={`url(#sky-${seed})`} />
        <ellipse cx="82" cy="66" rx="46" ry="24" fill="#fff" opacity="0.92" />
        <ellipse cx="122" cy="74" rx="34" ry="20" fill="#fff" opacity="0.92" />
        <path
          d="M0 250 C 60 220 110 270 160 250 C 210 232 260 262 300 244 L300 400 L0 400 Z"
          fill="#7cb342"
        />
        <path
          d="M0 292 C 70 270 120 308 180 290 C 230 276 270 302 300 292 L300 400 L0 400 Z"
          fill="#5c9a2e"
        />
        {label && (
          <text
            x="150"
            y="196"
            textAnchor="middle"
            fontFamily="Lora, serif"
            fontSize="19"
            fill="#25265e"
            opacity="0.5"
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}
