import { useEffect, useRef } from "react";
import type { ElementType, ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** stagger delay in seconds */
  delay?: number;
  style?: React.CSSProperties;
};

/**
 * Fade-up on scroll via IntersectionObserver (reliable regardless of the
 * smooth-scroll / GSAP pipeline). The transition itself lives in index.css.
 * A safety timer reveals anything still hidden after load so content can
 * never get stuck invisible.
 */
export function Reveal({
  children,
  as,
  className,
  delay = 0,
  style,
}: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => el.setAttribute("data-revealed", "true");

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      show();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (delay) window.setTimeout(show, delay * 1000);
            else show();
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);

    // Safety net: never leave content hidden.
    const safety = window.setTimeout(show, 4000);

    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [delay]);

  return (
    <Tag ref={ref} data-reveal className={className} style={style}>
      {children}
    </Tag>
  );
}
