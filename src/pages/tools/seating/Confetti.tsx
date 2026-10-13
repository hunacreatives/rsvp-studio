import { useMemo } from "react";

// A little confetti drifting behind Mesa's hero and closing: celebration, any kind of event.
// Soft colours, behind the words, and none at all for anyone who prefers less motion.

// Yellows and golds only: the hero's one colour.
const COLORS = ["#f2d06b", "#e6cf98", "#d9b45a", "#f5dd8f", "#e8c46a"];

/** Same "random" every time (no flicker between renders). */
function seeded(n: number) {
  let x = n;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
}

export default function Confetti({ lite = false }: { lite?: boolean }) {
  const pieces = useMemo(() => {
    const r = seeded(lite ? 7 : 42);
    return Array.from({ length: lite ? 16 : 30 }, (_, i) => ({
      left: r() * 100,
      delay: -r() * 16,
      dur: 12 + r() * 9,
      drift: (r() - 0.5) * 120,
      spin: 300 + r() * 500,
      size: 6 + r() * 5,
      shape: i % 3,
      color: COLORS[i % COLORS.length],
    }));
  }, [lite]);

  return (
    <div className={`fiesta${lite ? " lite" : ""}`} aria-hidden>
      <div className="fiesta-confetti">
        {pieces.map((c, i) => (
          <span
            key={i}
            className={`c${c.shape}`}
            style={{
              left: `${c.left}%`,
              width: c.shape === 1 ? c.size * 0.8 : c.size,
              height: c.shape === 0 ? c.size * 0.45 : c.shape === 1 ? c.size * 0.8 : c.size * 1.4,
              background: c.color,
              color: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.dur}s`,
              ["--drift" as string]: `${c.drift}px`,
              ["--spin" as string]: `${c.spin}deg`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
