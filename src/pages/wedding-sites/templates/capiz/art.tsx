import type { CSSProperties, ReactNode } from "react";

// Capiz's first window: the head beam, the opening with its two sliding capiz sashes and the
// room behind, the posts, the closed windows beside it on a wide screen, and the sill; and one
// small sampaguita mark. The materials are drawn in code (materials.ts) and set by the CSS.

/** Deterministic 0–1 noise, so every window looks a little different but never changes. */
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** A lamp somewhere in the room: where it stands, how bright it is. */
const lampVars = (seed: number): CSSProperties =>
  ({
    ["--lx" as string]: `${Math.round(28 + rnd(seed + 1) * 44)}%`,
    ["--ly" as string]: `${Math.round(30 + rnd(seed + 2) * 36)}%`,
    ["--lb" as string]: (0.04 + rnd(seed + 3) * 0.2).toFixed(3),
    ["--fd" as string]: `${(3.4 + rnd(seed + 4) * 2.6).toFixed(2)}s`,
    ["--fo" as string]: `${(-rnd(seed + 5) * 5).toFixed(2)}s`,
  }) as CSSProperties;

/** Where a sash's shell starts in the tile, so no two windows show the same panes. */
const glassVars = (seed: number): CSSProperties =>
  ({ ["--sx" as string]: Math.floor(rnd(seed + 11) * 8), ["--sy" as string]: Math.floor(rnd(seed + 12) * 8) }) as CSSProperties;

function Glass({ seed }: { seed: number }) {
  return <div className="cz-glass" data-cz-glass style={glassVars(seed)} />;
}

/** A closed window beside the open one (wide screens): its lamp and one sash. */
function Neighbour({ side, seed }: { side: "l" | "r"; seed: number }) {
  return (
    <div className={`cz-nb cz-nb--${side}`} aria-hidden>
      <div className="cz-lamp" style={lampVars(seed)} />
      <div className="cz-nb__sash">
        <Glass seed={seed + 3} />
      </div>
    </div>
  );
}

/** The capiz window and the room behind it (the opening). */
export function Bay({
  k,
  seed,
  children,
  top,
  id,
  className = "",
  edit,
}: {
  k: string;
  seed: number;
  children: ReactNode;
  /** Above the head beam (the eave, on the first window). */
  top?: ReactNode;
  id?: string;
  className?: string;
  /** The builder's section attributes. */
  edit?: Record<string, string>;
}) {
  return (
    <section className={`cz-bay cz-bay--${k} ${className}`} data-cz-bay data-cz-key={k} id={id} {...(edit ?? {})}>
      {top}
      <div className="cz-head" aria-hidden />
      <div className="cz-row">
        <Neighbour side="l" seed={seed * 7 + 1} />
        <div className="cz-post cz-post--l" aria-hidden />
        <div className="cz-win">
          <div className="cz-room" style={lampVars(seed)}>
            {children}
          </div>
          <div className="cz-cover" aria-hidden>
            {(["l", "r"] as const).map((s) => (
              <div key={s} className={`cz-back cz-back--${s}`} data-cz-back={s}>
                <div className="cz-lamp" style={lampVars(seed)} />
              </div>
            ))}
          </div>
          {(["l", "r"] as const).map((s, i) => (
            <div key={s} className={`cz-sash cz-sash--${s}`} data-cz-sash={s} aria-hidden>
              <Glass seed={seed * 5 + i} />
            </div>
          ))}
        </div>
        <div className="cz-post cz-post--r" aria-hidden />
        <Neighbour side="r" seed={seed * 7 + 2} />
      </div>
      <div className="cz-sill" aria-hidden>
        <span className="cz-sill__light" data-cz-spill />
      </div>
    </section>
  );
}

/** One sampaguita bloom, line-drawn: five petals and a small heart. */
export function Sampaguita({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`cz-bloom ${className}`} width={size} height={size} viewBox="-20 -20 40 40" aria-hidden>
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} d="M0 -2.5 C 4.2 -6 4.6 -13 0 -17 C -4.6 -13 -4.2 -6 0 -2.5Z" transform={`rotate(${r})`} />
      ))}
      <circle r="2.1" />
    </svg>
  );
}
