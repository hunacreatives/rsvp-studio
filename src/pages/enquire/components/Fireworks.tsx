import { useEffect, useRef } from "react";

const COLORS = [
  "#ffc800", // yellow
  "#ff7052", // coral
  "#2dc76d", // green
  "#3fb6dc", // sky
  "#2f61d5", // blue
  "#7540ee", // purple
];

type Point = { x: number; y: number };

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  trail: Point[];
};

type Rocket = {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  color: string;
  trail: Point[];
};

type Flash = { x: number; y: number; life: number; maxLife: number };

const TRAIL_LEN = 5;
const ROCKET_GRAVITY = 0.045;
const PARTICLE_GRAVITY = 0.045;

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Celebratory fireworks: a rocket climbs with a fading trail, then bursts
 * into a ring of gravity-affected sparks that flicker as they fall.
 * Honours prefers-reduced-motion and pauses when the tab is hidden.
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
    let rockets: Rocket[] = [];
    let flashes: Flash[] = [];

    const burst = (x: number, y: number, color: string) => {
      flashes.push({ x, y, life: 14, maxLife: 14 });
      const count = 32 + Math.floor(Math.random() * 18);
      const secondary = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
        const speed = 1.8 + Math.random() * 3.2;
        const maxLife = 55 + Math.random() * 40;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          color: Math.random() < 0.75 ? color : secondary,
          size: 1.5 + Math.random() * 1.8,
          trail: [],
        });
      }
    };

    const launch = () => {
      const x = width * (0.15 + Math.random() * 0.7);
      const targetY = height * (0.14 + Math.random() * 0.32);
      rockets.push({
        x,
        y: height + 6,
        vy: -(6.2 + Math.random() * 1.6),
        targetY,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        trail: [],
      });
    };

    let raf = 0;
    let lastLaunch = 0;
    let running = true;

    const frame = (t: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);

      if (t - lastLaunch > 850 + Math.random() * 900) {
        lastLaunch = t;
        launch();
      }

      ctx.clearRect(0, 0, width, height);

      // rockets: rise, decelerate, leave a trail, then burst near the apex
      rockets = rockets.filter((r) => r.vy < 0 && r.y > r.targetY);
      for (const r of rockets) {
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > TRAIL_LEN) r.trail.shift();
        r.y += r.vy;
        r.vy += ROCKET_GRAVITY;

        for (let i = 0; i < r.trail.length; i++) {
          const p = r.trail[i];
          const a = ((i + 1) / r.trail.length) * 0.5;
          ctx.fillStyle = withAlpha(r.color, a);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = withAlpha("#ffffff", 0.9);
        ctx.beginPath();
        ctx.arc(r.x, r.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      // rockets that just reached apex/ran out of upward velocity: burst them
      for (const r of [...rockets]) {
        if (r.vy >= -0.4 || r.y <= r.targetY) {
          burst(r.x, r.y, r.color);
          rockets = rockets.filter((x) => x !== r);
        }
      }

      // soft flash at the moment of each burst
      flashes = flashes.filter((f) => f.life > 0);
      for (const f of flashes) {
        f.life -= 1;
        const a = (f.life / f.maxLife) * 0.35;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 34);
        grad.addColorStop(0, `rgba(255,255,255,${a})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 34, 0, Math.PI * 2);
        ctx.fill();
      }

      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > TRAIL_LEN) p.trail.shift();

        p.life -= 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += PARTICLE_GRAVITY;
        p.vx *= 0.985;
        p.vy *= 0.99;

        const lifeRatio = p.life / p.maxLife;
        const twinkle = 0.7 + 0.3 * Math.sin(p.life * 0.9 + p.x);
        const alpha = Math.max(0, lifeRatio) * 0.9 * twinkle;

        for (let i = 0; i < p.trail.length; i++) {
          const tp = p.trail[i];
          const ta = ((i + 1) / p.trail.length) * alpha * 0.5;
          ctx.fillStyle = withAlpha(p.color, ta);
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, p.size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = withAlpha(p.color, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);

    const kickoff = window.setTimeout(launch, 400);

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
