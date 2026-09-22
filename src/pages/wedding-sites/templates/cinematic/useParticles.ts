import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  life: number;
}

/**
 * Drifting soft-glow dust, adapted from the reference site's
 * AnimatedBackground.tsx canvas loop. Skipped entirely under
 * prefers-reduced-motion (see engine/motion.ts's usePrefersReducedMotion
 * convention used by every other template).
 */
export function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>, enabled: boolean) {
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width ?? window.innerWidth;
      canvas.height = rect?.height ?? window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particlesRef.current = Array.from({ length: 28 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 0.5 + Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.25,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.08 - 0.05,
      life: Math.random() * 1000,
    }));

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.008;
      for (const p of particlesRef.current) {
        p.x += p.speedX + Math.sin(time + p.life) * 0.03;
        p.y += p.speedY;
        p.life += 1;
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
        if (p.y < -5) p.y = canvas.height + 5;
        if (p.y > canvas.height + 5) p.y = -5;
        const pulse = 0.7 + Math.sin(time * 2 + p.life * 0.01) * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 245, ${p.opacity * pulse})`;
        ctx.fill();
      }
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [canvasRef, enabled]);
}
