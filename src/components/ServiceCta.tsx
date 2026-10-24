import { useState, type CSSProperties, type ReactNode } from "react";
import { Reveal } from "@/lib/Reveal";
import { Character } from "@/components/CharacterLoader";

// The card every service page ends on (Oct 24 2026): our characters, doing RSVPs, under the sky
// the visitor actually has (6 AM to 6 PM on their clock is day).
//   Day — the mail run. The heart passes an invitation to the blue one, who passes it to the
//         circle, who posts it: the mailbox flag pops up and a "Yes, 2 guests" reply rises
//         out while everyone cheers. Sun, drifting clouds.
//   Night — the party. Fairy lights; the heart and the circle raise their glasses and clink
//         (a little sparkle) while the blue one sways. Moon, twinkling stars.
// One signature moment each, the rest small. The heading and action sit in the sky. Still under
// prefers-reduced-motion. (Replaced the blue card, "too boring, too blue".)

const DAY_LOOP = "6.4s";
const NIGHT_LOOP = "5.6s";

const CSS = `
.sc-scene * { box-sizing: border-box; }
.sc-char { position: absolute; bottom: 0; left: var(--lm); width: var(--wm); transform-origin: 50% 100%; will-change: transform; }
.sc-wide { display: none; }
.sc-prop { position: absolute; left: var(--lm); width: var(--wm); }
@media (min-width: 640px) {
  .sc-char, .sc-prop { left: var(--l); width: var(--w); }
  .sc-wide { display: block; }
  .sc-narrow { display: none; }
}

/* shared */
@keyframes sc-spin { to { transform: rotate(360deg) } }
@keyframes sc-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes sc-drift { from { transform: translateX(-30%) } to { transform: translateX(130%) } }
@keyframes sc-glow { 0%, 100% { box-shadow: 0 0 34px 6px rgba(255,236,170,.18) } 50% { box-shadow: 0 0 48px 12px rgba(255,236,170,.3) } }
@keyframes sc-twinkle { 0%, 100% { opacity: .25; transform: scale(.7) } 50% { opacity: 1; transform: scale(1) } }

/* day: the mail run (one loop, everyone on the same clock) */
@keyframes sc-d-pink { 0%, 16%, 76%, 90%, 100% { transform: none } 3% { transform: translateY(0) scaleY(.92) } 9% { transform: translateY(-12%) rotate(-4deg) } 82% { transform: translateY(-14%) } }
@keyframes sc-d-blue { 0%, 26%, 46%, 76%, 90%, 100% { transform: none } 30% { transform: translateY(0) scaleY(.94) } 38% { transform: translateY(-12%) rotate(3deg) } 83% { transform: translateY(-14%) } }
@keyframes sc-d-orange { 0%, 54%, 72%, 78%, 92%, 100% { transform: none } 57% { transform: translateY(0) scaleY(.93) } 65% { transform: translateY(-12%) rotate(4deg) } 85% { transform: translateY(-14%) } }
@keyframes sc-d-mail {
  0%, 4% { left: var(--x1); bottom: 34%; opacity: 0; transform: scale(.7) rotate(-8deg) }
  7% { left: var(--x1); bottom: 38%; opacity: 1; transform: scale(1) rotate(-8deg) }
  18% { left: calc((var(--x1) + var(--x2)) / 2); bottom: 78%; transform: rotate(6deg) }
  28%, 34% { left: var(--x2); bottom: 46%; transform: rotate(-4deg) }
  45% { left: calc((var(--x2) + var(--x3)) / 2); bottom: 80%; transform: rotate(8deg) }
  55%, 61% { left: var(--x3); bottom: 40%; transform: rotate(-6deg) }
  67% { left: calc((var(--x3) + var(--x4)) / 2); bottom: 64%; opacity: 1; transform: rotate(10deg) }
  72% { left: var(--x4); bottom: 42%; opacity: 0; transform: scale(.55) rotate(90deg) }
  100% { left: var(--x4); bottom: 42%; opacity: 0; transform: scale(.55) rotate(90deg) }
}
@keyframes sc-d-flag { 0%, 71%, 96%, 100% { transform: rotate(90deg) } 75%, 92% { transform: rotate(0deg) } }
/* the reply card hangs left of the mailbox on phones (it's near the edge), centred above it on wider screens */
.sc-reply { --rx: -78%; }
@media (min-width: 640px) { .sc-reply { --rx: -50%; } }
@keyframes sc-d-reply { 0%, 72%, 100% { opacity: 0; transform: translate(var(--rx), 30%) scale(.7) } 78%, 92% { opacity: 1; transform: translate(var(--rx), 0) scale(1) } 97% { opacity: 0; transform: translate(var(--rx), -20%) scale(.95) } }

/* night: the party */
@keyframes sc-n-sway { 0%, 100% { transform: rotate(-4deg) } 50% { transform: rotate(4deg) } }
@keyframes sc-n-toast-l { 0%, 30%, 70%, 100% { transform: none } 44%, 54% { transform: translate(26%, -30%) rotate(14deg) } }
@keyframes sc-n-toast-r { 0%, 30%, 70%, 100% { transform: none } 44%, 54% { transform: translate(-26%, -30%) rotate(-14deg) } }
.sc-glass { bottom: var(--gbm); }
@media (min-width: 640px) { .sc-glass { bottom: var(--gb); } }
@keyframes sc-n-lean-l { 0%, 30%, 70%, 100% { transform: none } 44%, 54% { transform: rotate(5deg) } }
@keyframes sc-n-lean-r { 0%, 30%, 70%, 100% { transform: none } 44%, 54% { transform: rotate(-5deg) } }
@keyframes sc-n-clink { 0%, 46%, 64%, 100% { opacity: 0; transform: translate(-50%, 50%) scale(.3) } 49% { opacity: 1; transform: translate(-50%, 50%) scale(1) } 58% { opacity: 0; transform: translate(-50%, 50%) scale(1.35) } }
@keyframes sc-n-bulb { 0%, 100% { opacity: .45 } 50% { opacity: 1 } }

@media (prefers-reduced-motion: reduce) {
  .sc-scene *, .sc-scene .rs-eye { animation: none !important; }
  .sc-mail, .sc-reply, .sc-clink { display: none !important; }
}
`;

type Spot = { l: number; w: number; m?: [number, number] };
type Actor = Spot & { name: string; anim: string };

/** Day: the line the invitation travels along, left to right, and the mailbox at the end. */
// Three at a time (the full six read as too busy).
const DAY_CAST: Actor[] = [
  { name: "pink", l: 15, w: 15.5, m: [2, 26], anim: `sc-d-pink ${DAY_LOOP} ease-in-out infinite` },
  { name: "blue", l: 39, w: 13, m: [31, 22], anim: `sc-d-blue ${DAY_LOOP} ease-in-out infinite` },
  { name: "orange", l: 59, w: 14, m: [55, 23], anim: `sc-d-orange ${DAY_LOOP} ease-in-out infinite` },
];
const MAILBOX: Spot = { l: 79, w: 6.5, m: [83, 13] };
/** Where the invitation is handed over (its left edge, % of the scene): heart, blue, circle, mailbox slot. */
const MAIL_STOPS = { d: ["27%", "43.5%", "63%", "80.8%"], m: ["18%", "38%", "63%", "86%"] };

/** Night: the heart and the circle side by side for the toast. */
const NIGHT_CAST: Actor[] = [
  { name: "blue", l: 22, w: 13, m: [3, 22], anim: `sc-n-sway 3.2s ease-in-out -1.1s infinite` },
  { name: "pink", l: 40, w: 15.5, m: [28, 26], anim: `sc-n-lean-l ${NIGHT_LOOP} ease-in-out infinite` },
  { name: "orange", l: 59, w: 14, m: [60, 23], anim: `sc-n-lean-r ${NIGHT_LOOP} ease-in-out infinite` },
];
/** The two glasses (left edge, width %) and where they meet. */
/** The two glasses, held in the heart's right hand and the circle's left (left edge, width %);
 *  `bottom` is hand height. The clink happens between them, at their rims when raised. */
const GLASS_L: Spot = { l: 54, w: 3.2, m: [50.5, 6] };
const GLASS_R: Spot = { l: 58.4, w: 3.2, m: [58, 6] };
const GLASS_BOTTOM = { d: "17%", m: "14%" };
const CLINK_AT = { d: ["57.8%", "44%"], m: ["57.3%", "40%"] };

const spotVars = (s: Spot): CSSProperties =>
  ({ ["--l" as string]: `${s.l}%`, ["--w" as string]: `${s.w}%`, ["--lm" as string]: `${s.m?.[0] ?? 0}%`, ["--wm" as string]: `${s.m?.[1] ?? 0}%` }) as CSSProperties;

/** Daytime on the visitor's clock. A local build can force it: ?sky=day|night. */
function useDaytime() {
  const [day] = useState(() => {
    const forced = import.meta.env.DEV && typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("sky") : null;
    if (forced === "day" || forced === "night") return forced === "day";
    const h = new Date().getHours();
    return h >= 6 && h < 18;
  });
  return day;
}

// ---- sky ----------------------------------------------------------------

function Sun() {
  return (
    <div className="absolute right-[7%] top-[14px] w-[clamp(64px,9vw,112px)] sm:top-[9%]" style={{ aspectRatio: "1", animation: "sc-float 6s ease-in-out infinite" }} aria-hidden>
      <div className="absolute inset-0" style={{ animation: "sc-spin 40s linear infinite" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="absolute left-1/2 top-1/2 h-[14%] w-[5%] rounded-full bg-[#ffc94d]" style={{ transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-330%)` }} />
        ))}
      </div>
      <span className="absolute inset-[22%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffe8a3,#ffc23d)] shadow-[0_0_40px_12px_rgba(255,201,77,.35)]" />
    </div>
  );
}

function Cloud({ top, scale, duration, delay }: { top: string; scale: number; duration: number; delay: number }) {
  return (
    <div className="pointer-events-none absolute left-0 w-[16%]" style={{ top, animation: `sc-drift ${duration}s linear ${delay}s infinite` }} aria-hidden>
      <div style={{ transform: `scale(${scale})` }} className="relative h-[clamp(22px,3vw,38px)]">
        <span className="absolute bottom-0 left-0 h-[70%] w-full rounded-full bg-white/85" />
        <span className="absolute bottom-[25%] left-[18%] h-full w-[42%] rounded-full bg-white/85" />
        <span className="absolute bottom-[20%] left-[48%] h-[80%] w-[34%] rounded-full bg-white/85" />
      </div>
    </div>
  );
}

const STARS = [
  [8, 14], [18, 32], [27, 10], [38, 26], [52, 8], [61, 30], [70, 12], [84, 36], [92, 20], [12, 46], [46, 40], [76, 44],
];

function NightSky() {
  return (
    <>
      {STARS.map(([x, y], i) => (
        <span key={i} aria-hidden className="absolute rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, width: i % 3 ? 3 : 4, height: i % 3 ? 3 : 4, animation: `sc-twinkle ${2.4 + (i % 4) * 0.7}s ease-in-out ${i * 0.37}s infinite` }} />
      ))}
      <div className="absolute right-[8%] top-[18px] w-[clamp(54px,7.5vw,92px)] sm:top-[10%]" style={{ aspectRatio: "1", animation: "sc-float 7s ease-in-out infinite" }} aria-hidden>
        {/* A crescent cut with a mask, so it works over any sky; the glow breathes. */}
        <span className="absolute inset-[12%] rounded-full" style={{ animation: "sc-glow 5s ease-in-out infinite" }} />
        <svg viewBox="0 0 100 100" className="relative block h-full w-full">
          <defs>
            <mask id="sc-moon-cut">
              <rect width="100" height="100" fill="#fff" />
              <circle cx="68" cy="36" r="34" fill="#000" />
            </mask>
          </defs>
          <circle cx="50" cy="50" r="40" fill="#fff3c4" mask="url(#sc-moon-cut)" />
        </svg>
      </div>
    </>
  );
}

// ---- day: the mail run --------------------------------------------------

/** An invitation in its envelope, with a heart seal. */
function Envelope() {
  return (
    <svg viewBox="0 0 64 44" className="block w-full" aria-hidden>
      <rect x="1" y="1" width="62" height="42" rx="4" fill="#fffdf8" stroke="#d9cdb6" strokeWidth="2" />
      <path d="M2 4 L32 26 L62 4" fill="none" stroke="#d9cdb6" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 31 C26 26 27 21 30.5 21 C31.6 21 32 22 32 22 C32 22 32.4 21 33.5 21 C37 21 38 26 32 31 Z" fill="#f78fb3" />
    </svg>
  );
}

function Mailbox() {
  return (
    <svg viewBox="0 0 60 100" className="block w-full overflow-visible" aria-hidden>
      <rect x="26" y="46" width="8" height="54" rx="2" fill="#a07b55" />
      <path d="M6 48 V30 C6 18 15 10 30 10 C45 10 54 18 54 30 V48 Z" fill="#2f4fbf" />
      <path d="M6 48 V30 C6 18 15 10 30 10" fill="none" stroke="#5a78e0" strokeWidth="3" />
      <rect x="14" y="30" width="32" height="4" rx="2" fill="#1d2f80" />
      {/* the flag: down until the invitation goes in */}
      <g style={{ transformOrigin: "55px 40px", animation: `sc-d-flag ${DAY_LOOP} ease-in-out infinite` }}>
        <rect x="53" y="14" width="4" height="26" rx="1.5" fill="#7a5c3e" />
        <rect x="55" y="14" width="14" height="10" rx="1.5" fill="#ff7052" />
      </g>
    </svg>
  );
}

function MailRun() {
  return (
    <>
      <div
        className="sc-prop sc-mailbox"
        style={{ ...spotVars(MAILBOX), bottom: 0 }}
      >
        <Mailbox />
        {/* the reply that comes back */}
        <div
          className="sc-reply absolute bottom-[108%] left-1/2 whitespace-nowrap rounded-xl bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] shadow-[0_10px_24px_-12px_rgba(0,7,39,0.45)] ring-1 ring-[rgba(0,7,39,0.06)] sm:text-[13px]"
          style={{ animation: `sc-d-reply ${DAY_LOOP} ease-out infinite` }}
        >
          <span className="mr-1 text-[#3d8b3d]">✓</span>Yes, 2 guests
        </div>
      </div>
      {/* the invitation, on its way down the line */}
      <div className="sc-mail sc-wide absolute w-[4.4%]" style={{ ["--x1" as string]: MAIL_STOPS.d[0], ["--x2" as string]: MAIL_STOPS.d[1], ["--x3" as string]: MAIL_STOPS.d[2], ["--x4" as string]: MAIL_STOPS.d[3], animation: `sc-d-mail ${DAY_LOOP} ease-in-out infinite` } as CSSProperties}>
        <Envelope />
      </div>
      <div className="sc-mail sc-narrow absolute w-[8%]" style={{ ["--x1" as string]: MAIL_STOPS.m[0], ["--x2" as string]: MAIL_STOPS.m[1], ["--x3" as string]: MAIL_STOPS.m[2], ["--x4" as string]: MAIL_STOPS.m[3], animation: `sc-d-mail ${DAY_LOOP} ease-in-out infinite` } as CSSProperties}>
        <Envelope />
      </div>
    </>
  );
}

// ---- night: the party ---------------------------------------------------

/** A coupe glass with something golden in it. */
function Glass() {
  return (
    <svg viewBox="0 0 30 46" className="block w-full" aria-hidden>
      <path d="M2 4 H28 C28 14 22 19 15 19 C8 19 2 14 2 4 Z" fill="rgba(255,255,255,.88)" />
      <path d="M4.5 8 H25.5 C24.5 14 20 16.5 15 16.5 C10 16.5 5.5 14 4.5 8 Z" fill="#f5c96a" />
      <rect x="13.8" y="18" width="2.4" height="20" fill="rgba(255,255,255,.88)" />
      <rect x="8" y="38" width="14" height="3" rx="1.5" fill="rgba(255,255,255,.88)" />
    </svg>
  );
}

const BULBS = ["#ffd36b", "#ff9f8a", "#9fd8ff", "#ffd36b", "#c7a6ff", "#ff9f8a", "#ffd36b", "#9fd8ff", "#ff9f8a", "#ffd36b", "#c7a6ff", "#9fd8ff"];

/** The wire: scallops hanging between posts (in the SVG's 1000×60 box), and three bulbs on each,
 *  placed on the curve itself so they hang from the wire. */
const POSTS = 4;
const POST_Y = 4;
const SAG_Y = 44;
const WIRE = Array.from({ length: POSTS }, (_, i) => {
  const x0 = (i * 1000) / POSTS;
  const x1 = ((i + 1) * 1000) / POSTS;
  return `${i ? "" : `M0 ${POST_Y} `}Q ${(x0 + x1) / 2} ${SAG_Y} ${x1} ${POST_Y}`;
}).join(" ");
const LIGHTS = Array.from({ length: POSTS * 3 }, (_, k) => {
  const i = Math.floor(k / 3);
  const t = [0.22, 0.5, 0.78][k % 3];
  const y = (1 - t) ** 2 * POST_Y + 2 * (1 - t) * t * SAG_Y + t ** 2 * POST_Y; // on the curve
  return { x: ((i + t) / POSTS) * 100, y: (y / 60) * 100 };
});

function Party() {
  return (
    <>
      {/* fairy lights strung across the top of the scene */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26%]" aria-hidden>
        <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <path d={WIRE} fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        {LIGHTS.map((b, i) => {
          const c = BULBS[i % BULBS.length];
          return (
            <span key={i} className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, transform: "translate(-50%, -2px)" }}>
              {/* a little cap on the wire, then the bulb hanging from it */}
              <span className="mx-auto block h-[4px] w-[5px] rounded-[1px] bg-[rgba(255,255,255,.55)]" />
              <span className="block h-[12px] w-[9px] rounded-b-full rounded-t-[45%]" style={{ background: c, boxShadow: `0 0 12px 3px ${c}88`, animation: `sc-n-bulb ${1.8 + (i % 3) * 0.6}s ease-in-out ${i * 0.23}s infinite` }} />
            </span>
          );
        })}
      </div>
      {/* the toast */}
      <div className="sc-prop sc-glass" style={{ ...spotVars(GLASS_L), ["--gb" as string]: GLASS_BOTTOM.d, ["--gbm" as string]: GLASS_BOTTOM.m, transformOrigin: "50% 100%", animation: `sc-n-toast-l ${NIGHT_LOOP} ease-in-out infinite` }}>
        <Glass />
      </div>
      <div className="sc-prop sc-glass" style={{ ...spotVars(GLASS_R), ["--gb" as string]: GLASS_BOTTOM.d, ["--gbm" as string]: GLASS_BOTTOM.m, transformOrigin: "50% 100%", animation: `sc-n-toast-r ${NIGHT_LOOP} ease-in-out infinite` }}>
        <Glass />
      </div>
      {/* the clink: a little burst where the glasses meet */}
      {(["d", "m"] as const).map((k) => (
        <svg key={k} viewBox="-20 -20 40 40" className={`sc-clink absolute ${k === "d" ? "sc-wide w-[5%]" : "sc-narrow w-[11%]"}`} style={{ left: CLINK_AT[k][0], bottom: CLINK_AT[k][1], animation: `sc-n-clink ${NIGHT_LOOP} ease-out infinite` }} aria-hidden>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="0" y1="-8" x2="0" y2="-16" stroke="#ffe08a" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a})`} />
          ))}
        </svg>
      ))}
    </>
  );
}

// ---- the card -------------------------------------------------------------

export default function ServiceCta({
  heading,
  line,
  quote,
  quoteLabel = "Get a quote",
  build,
}: {
  heading: ReactNode;
  line: string;
  quote: () => void;
  quoteLabel?: string;
  /** "Or make it yourself, free": pages where a host can build it themselves. */
  build?: () => void;
}) {
  const day = useDaytime();
  const cast = day ? DAY_CAST : NIGHT_CAST;
  return (
    <Reveal
      className="sc-scene relative overflow-hidden rounded-[24px] text-center sm:rounded-[28px]"
      style={{ background: day ? "linear-gradient(180deg,#cfe4f7 0%,#e6f0f6 45%,#fbf3e4 100%)" : "linear-gradient(180deg,#0b1240 0%,#141b4f 55%,#262d68 100%)" }}
    >
      <style>{CSS}</style>
      {day ? (
        <>
          <Sun />
          <Cloud top="14%" scale={1} duration={70} delay={-20} />
          <Cloud top="30%" scale={0.7} duration={95} delay={-60} />
        </>
      ) : (
        <NightSky />
      )}

      <div className="relative z-10 px-6 pt-[92px] sm:pt-16">
        <h2 className={`mx-auto max-w-2xl font-display font-semibold leading-[1.1] text-balance ${day ? "text-[var(--ink)]" : "text-white"}`} style={{ fontSize: "clamp(1.9rem, 3.8vw, 2.9rem)" }}>
          {heading}
        </h2>
        <p className={`mx-auto mt-4 max-w-lg text-[16px] text-balance ${day ? "text-[#3c3d57]" : "text-white/75"}`}>{line}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <button onClick={quote} className={`btn ${day ? "btn-dark" : "btn-white"}`}>
            {quoteLabel}
          </button>
          {build ? (
            <button
              onClick={build}
              className={`text-[15px] font-medium underline underline-offset-[6px] ${day ? "text-[var(--ink)] decoration-[rgba(0,7,39,0.3)] hover:decoration-[var(--ink)]" : "text-[#f1d899] decoration-[#f1d899]/40 hover:decoration-[#f1d899]"}`}
            >
              Or make it yourself, free
            </button>
          ) : null}
        </div>
      </div>

      {/* The ground, and everyone on it. */}
      <div className="relative mx-auto mt-8 w-full max-w-[1100px] sm:mt-10" style={{ height: "clamp(160px, 20vw, 220px)" }} aria-hidden>
        {cast.map((c) => (
          <Character key={c.name} name={c.name} className={`sc-char ${c.m ? "" : "sc-wide"}`} style={{ position: "absolute", bottom: 0, ...spotVars(c), animation: c.anim }} />
        ))}
        {day ? <MailRun /> : <Party />}
      </div>
      <div className="h-5 sm:h-6" style={{ background: day ? "#efe4cf" : "#1d2358" }} />
    </Reveal>
  );
}
