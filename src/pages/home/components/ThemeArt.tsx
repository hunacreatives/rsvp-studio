import { useEffect } from "react";

/**
 * "Personal" card art: no object, just the person. Every 3s the whole tile
 * takes on someone else's look: a new colour and their name set in its own
 * typeface (bold sans, script, italic serif).
 * Motion: index.css (hw-persona-*); reduced motion rests on Claudy's.
 */

const STATES = [
  {
    name: "CLAUDY",
    caption: "30TH BIRTHDAY · NOV 14",
    ink: "#fff",
    font: "Inter, ui-sans-serif, system-ui, sans-serif",
    size: 148,
    weight: 700,
    style: "normal",
    tracking: -4,
  },
  {
    name: "Maya & Jo",
    caption: "WEDDING · MARCH 2",
    ink: "#fff6dc",
    font: '"Great Vibes", cursive',
    size: 118,
    weight: 400,
    style: "normal",
    tracking: 0,
  },
  {
    name: "Lola",
    caption: "80TH BIRTHDAY · JUNE 6",
    ink: "#24275b",
    font: "Lora, Georgia, serif",
    size: 190,
    weight: 600,
    style: "italic",
    tracking: -2,
  },
];

// Great Vibes is the only face here the site doesn't already load.
let scriptLoaded = false;
function loadScript() {
  if (scriptLoaded || typeof document === "undefined") return;
  scriptLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap";
  document.head.appendChild(link);
}

export default function ThemeArt({ className = "" }: { className?: string }) {
  useEffect(loadScript, []);
  return (
    <div className={`hw overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 700" className="block h-full w-full" aria-hidden>
        <rect className="hw-persona-bg" width="800" height="700" />
        {STATES.map((s, i) => (
          <g key={s.name} className={`hw-persona hw-persona--${i + 1}`} fill={s.ink} textAnchor="middle">
            <text
              x="400"
              y="385"
              fontFamily={s.font}
              fontSize={s.size}
              fontWeight={s.weight}
              fontStyle={s.style}
              letterSpacing={s.tracking}
            >
              {s.name}
            </text>
            <text
              x="400"
              y="470"
              fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
              fontSize="20"
              fontWeight="600"
              letterSpacing="5"
              opacity="0.85"
            >
              {s.caption}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
