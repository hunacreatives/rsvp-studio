import { useEffect, useRef } from "react";

const COLORS = [
  "#ffc800", // yellow
  "#ff7052", // coral
  "#2dc76d", // green
  "#3fb6dc", // sky
  "#2f61d5", // blue
  "#7540ee", // purple
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

/**
 * Lightweight celebratory fireworks, drawn on a canvas layer behind the
 * hero copy. Honours prefers-reduced-motion and pauses when the tab is hidden.
 */
export default function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let particles: Particle[] = [];

    const burst = (x: number, y: number) => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const count = 26 + Math.floor(Math.random() * 16);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 1.4 + Math.random() * 2.6;
        const maxLife = 60 + Math.random() * 40;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          color,
          size: 1.4 + Math.random() * 1.8,
        });
      }
    };

    let raf = 0;
    let lastLaunch = 0;
    let running = true;

    const frame = (t: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);

      if (t - lastLaunch > 900 + Math.random() * 1100) {
        lastLaunch = t;
        burst(
          width * (0.15 + Math.random() * 0.7),
          height * (0.12 + Math.random() * 0.4),
        );
      }

      ctx.clearRect(0, 0, width, height);
      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.life -= 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03; // gravity
        p.vx *= 0.985;
        p.vy *= 0.985;
        const alpha = Math.max(0, p.life / p.maxLife) * 0.85;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);

    // a first burst shortly after mount
    const kickoff = window.setTimeout(() => burst(width * 0.5, height * 0.3), 400);

    const onVisibility = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(kickoff);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
