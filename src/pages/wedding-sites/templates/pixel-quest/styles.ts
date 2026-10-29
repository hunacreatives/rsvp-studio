// Pixel Quest: a side-scrolling pixel level the whole page long, with an arcade HUD over it and
// pixel dialog windows for the words. Sizes follow the page's own width (container units),
// never the window's; nothing is fixed to the window (the level, the HUD and the CRT are a
// sticky frame inside the page).

// a pixel picture (one character per pixel) as an SVG data URL
const svgUrl = (rows: string[], pal: Record<string, string>) => {
  const w = rows[0].length, h = rows.length;
  let paths = "";
  for (const [ch, col] of Object.entries(pal)) {
    let d = "";
    rows.forEach((row, y) => { for (let x = 0; x < w; x++) if (row[x] === ch) d += `M${x} ${y}h1v1h-1z`; });
    if (d) paths += `<path fill='${col}' d='${d}'/>`;
  }
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${paths}</svg>`)}")`;
};
// the dialog window's frame: an ink edge with rounded pixel corners, a cream bevel (lit top
// left, shaded bottom right), an ink line, then the window's night blue. Sliced at 4.
const FRAME = svgUrl(
  [
    ".kkkkkkkkk.",
    "kkqqqqqqqkk",
    "kqqqqqqqqQk",
    "kqqkkkkkqQk",
    "kqqkbbbkqQk",
    "kqqkbbbkqQk",
    "kqqkbbbkqQk",
    "kqqkkkkkqQk",
    "kqQQQQQQQQk",
    "kkQQQQQQQkk",
    ".kkkkkkkkk.",
  ],
  { k: "#1b1030", q: "#fff1d0", Q: "#d9bf8c", b: "#14112e" },
);
// the little arrow before each answer
const BULLET = svgUrl(["k.....", "kk....", "kyk...", "kyyk..", "kyk...", "kk....", "k....."].map((r) => r.replace(/k/g, "y")), { y: "#ffd23f" });

const OUTLINE = (c: string, d: number) => `${d}px 0 0 ${c}, -${d}px 0 0 ${c}, 0 ${d}px 0 ${c}, 0 -${d}px 0 ${c}, ${d}px ${d}px 0 ${c}, -${d}px ${d}px 0 ${c}, ${d}px -${d}px 0 ${c}, -${d}px -${d}px 0 ${c}`;

export const PIXELQUEST_CSS = `
.pq-root { --frame: 100svh; --ink: #1b1030; --night: #14112e; --cream: #fff1d0; --gold: #ffd23f; --coral: #ff5a5f; --teal: #2ec4b6; --muted: #c4bce9; --slot: #221d4a; --edge: #3d3580;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: var(--cream);
  font-family: var(--pq-sans); -webkit-font-smoothing: antialiased; background: var(--night); }
.pq-root *, .pq-root *::before, .pq-root *::after { box-sizing: border-box; }
.pq-root p, .pq-root h1, .pq-root h2, .pq-root h3, .pq-root ol { margin: 0; }

/* ---- the level: a sticky frame behind the words */
.pq-stage { position: sticky; top: 0; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); z-index: 0; overflow: hidden; pointer-events: none; background: #4f73d9; }
.pq-view { position: absolute; left: 0; top: 0; display: block; image-rendering: crisp-edges; image-rendering: pixelated; }
/* the screen: a scanline on every row of pixels, the tube's dark corners */
.pq-scan { position: absolute; inset: 0; z-index: 1;
  background: repeating-linear-gradient(180deg, rgba(10, 6, 30, 0) 0, rgba(10, 6, 30, 0) calc(var(--px, 4px) - 1px), rgba(10, 6, 30, 0.12) calc(var(--px, 4px) - 1px), rgba(10, 6, 30, 0.12) var(--px, 4px)),
    radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(10, 6, 30, 0.42) 100%); }
.pq-world { position: relative; z-index: 2; }

/* ---- the HUD: the player and the score, the coins, the stage, the days to go */
.pq-hud { position: absolute; left: 0; right: 0; top: 0; z-index: 2; display: flex; justify-content: space-between; gap: 18px; padding: 20px 30px 0; font-family: var(--pq-pixel); text-transform: uppercase; color: #fff; text-shadow: ${OUTLINE("#1b1030", 2)}; }
.pq-hud > div { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pq-hud b { display: flex; align-items: center; gap: 7px; font-weight: 400; font-size: 11px; line-height: 1; color: var(--gold); white-space: nowrap; }
.pq-hud span { font-size: 17px; line-height: 1; white-space: nowrap; }
.pq-hudname b { display: block; color: #ff9fbe; max-width: 240px; overflow: hidden; text-overflow: ellipsis; padding: 2px; margin: -2px; }
.pq-coin { width: 9px; height: 12px; filter: drop-shadow(0 2px 0 #1b1030); }

/* ---- the title screen: the first section */
.pq-title { position: relative; height: var(--frame); display: flex; justify-content: center; align-items: flex-start; text-align: center; padding: calc(var(--frame) * 0.15) 20px 0; }
.pq-titlebox { max-width: 100%; transition: opacity 0.5s steps(3); }
.pq-started .pq-titlebox { opacity: 0; pointer-events: none; }
.pq-kick { font: 14px/1.4 var(--pq-pixel); letter-spacing: 0.08em; text-transform: uppercase; color: #fff; text-shadow: ${OUTLINE("#1b1030", 3)}; }
.pq-logo { font-family: var(--pq-pixel); font-weight: 400; font-size: var(--name-size, clamp(40px, 12cqw, 150px)); line-height: 1.12; margin-top: 0.32em !important; text-transform: uppercase; color: var(--gold); text-wrap: balance; }
.pq-word { display: inline-block; white-space: nowrap; }
/* each letter a block: gold, an ink edge, a coral side and its shadow, dropped onto the screen */
.pq-l { display: inline-block; position: relative;
  text-shadow: 0.0625em 0 0 #1b1030, -0.0625em 0 0 #1b1030, 0 -0.0625em 0 #1b1030, 0.0625em -0.0625em 0 #1b1030, -0.0625em -0.0625em 0 #1b1030,
    0 0.0625em 0 #ff8a3d, 0.0625em 0.0625em 0 #ff8a3d, -0.0625em 0.0625em 0 #1b1030, 0 0.125em 0 #c23a4a, 0.0625em 0.125em 0 #c23a4a, -0.0625em 0.125em 0 #1b1030,
    0 0.1875em 0 #1b1030, 0.0625em 0.1875em 0 #1b1030, -0.0625em 0.1875em 0 #1b1030, 0 0.3em 0 rgba(27, 16, 48, 0.32); }
.pq-age { display: inline-block; margin-top: 30px !important; padding: 11px 18px 10px; font: 15px/1.3 var(--pq-pixel); text-transform: uppercase; color: var(--cream); background: var(--coral);
  box-shadow: 0 0 0 4px #1b1030, inset 0 4px 0 #ff8f92, inset 0 -4px 0 #c23a4a, 0 10px 0 0 rgba(27, 16, 48, 0.3); }
.pq-start { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 34px auto 0; min-height: 44px; padding: 0 8px; border: 0; background: none; cursor: pointer;
  font: 19px/1 var(--pq-pixel); text-transform: uppercase; color: #fff; text-shadow: ${OUTLINE("#1b1030", 3)}; }
.pq-start .pq-arrow { width: 18px; height: 18px; color: var(--gold); filter: drop-shadow(3px 0 0 #1b1030) drop-shadow(-3px 0 0 #1b1030) drop-shadow(0 3px 0 #1b1030) drop-shadow(0 -3px 0 #1b1030); }
.pq-motion .pq-start > * { animation: pq-blink 1.1s linear infinite; }
@keyframes pq-blink { 0%, 59% { opacity: 1; } 60%, 100% { opacity: 0; } }
.pq-meta { display: inline-block; margin-top: 30px !important; padding: 11px 20px 12px; background: rgba(20, 17, 46, 0.86); box-shadow: 0 0 0 4px #1b1030; font: 500 19px/1.45 var(--pq-sans); color: var(--cream); text-wrap: balance; }
.pq-meta span { white-space: nowrap; }
.pq-arrow { display: block; flex: none; }

/* the boot: the tube switches on (a dot, a line, a white flash), the name drops in letter by
   letter, then the rest of the title appears */
.pq-crt { position: absolute; inset: 0; z-index: 6; pointer-events: none; animation: pq-crtbg 1.3s linear both; }
.pq-crt::after { content: ""; position: absolute; inset: 0; background: #f4f0ff; animation: pq-crt 1.3s cubic-bezier(.25, .7, .2, 1) both; }
@keyframes pq-crtbg { 0%, 46% { background: #07051a; } 47%, 100% { background: transparent; } }
@keyframes pq-crt { 0% { transform: scale(0.01, 0.006); opacity: 1; } 22% { transform: scale(1, 0.006); opacity: 1; } 46% { transform: scale(1, 1); opacity: 1; } 100% { transform: scale(1, 1); opacity: 0; } }
.pq-preboot .pq-crt { background: #07051a; }
.pq-preboot .pq-crt::after { opacity: 0; }
.pq-preboot .pq-titlebox, .pq-preboot .pq-hud { opacity: 0; }
.pq-preboot .pq-crt, .pq-preboot .pq-crt::after { animation: none; }
.pq-boot .pq-l { animation: pq-drop 0.7s cubic-bezier(.3, 1.45, .5, 1) both; animation-delay: calc(1.05s + var(--i) * 0.09s); }
@keyframes pq-drop { from { translate: 0 -7em; } to { translate: 0 0; } }
.pq-boot .pq-kick { animation: pq-in 0.4s steps(3) 0.95s both; }
.pq-boot .pq-age, .pq-boot .pq-meta { animation: pq-in 0.4s steps(3) both; animation-delay: calc(1.5s + var(--n, 4) * 0.09s); }
.pq-boot .pq-start { animation: pq-in 0.4s steps(3) both; animation-delay: calc(1.75s + var(--n, 4) * 0.09s); }
.pq-boot .pq-hud { animation: pq-in 0.4s steps(3) 1s both; }
@keyframes pq-in { from { opacity: 0; } to { opacity: 1; } }

/* ---- the stages: every window pauses in the same place (its dock, under the HUD). The window
   is sticky for its hold, then scrolls away; the gap before each stage, a frame long, is the
   run. level.ts measures the dock and sets the window's top. */
.pq-stop { position: relative; padding-top: var(--frame); }
.pq-mapstop { padding-top: 0; }
.pq-dock { position: relative; }
.pq-hold { height: calc(var(--frame) * 0.55); }
.pq-final { padding-bottom: 10svh; }
.pq-card { position: sticky; top: 92px; width: min(700px, calc(100cqw - 48px)); margin: 0 auto; border: 12px solid transparent; border-image: ${FRAME} 4 fill / 12px stretch;
  filter: drop-shadow(0 6px 0 rgba(14, 10, 36, 0.55)); color: var(--cream); }
.pq-bar { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 14px 9px; background: var(--tone, var(--gold)); color: #1b1030; font: 11px/1.3 var(--pq-pixel); text-transform: uppercase; box-shadow: 0 3px 0 #1b1030; }
.pq-bar > span:last-child { text-align: right; }
.pq-win { position: relative; padding: 20px 24px 34px; }
.pq-head { display: flex; align-items: center; gap: 18px; }
.pq-face { flex: none; display: block; width: 62px; height: 62px; padding: 7px; background: #2a2458; box-shadow: 0 0 0 3px #1b1030, inset 0 0 0 3px var(--edge); }
.pq-h2 { font: 23px/1.4 var(--pq-pixel); font-weight: 400; color: #fff; text-wrap: balance; }
.pq-p { font: 400 20px/1.5 var(--pq-sans); margin-top: 18px !important; text-wrap: pretty; }
.pq-line { font-size: 17px; line-height: 1.4; color: var(--muted); margin-top: 4px !important; text-wrap: balance; }
.pq-venue { margin-top: 18px; }
.pq-vname { font: 600 20px/1.35 var(--pq-sans); color: #fff; }
.pq-links { margin-top: 6px; }
.pq-plan { margin-top: 14px; padding-top: 12px; background: linear-gradient(90deg, var(--edge) 50%, transparent 50%) 0 0 / 10px 3px repeat-x; }
.pq-plan.is-cols { columns: 2; column-gap: 30px; }
.pq-plan > div { break-inside: avoid; display: grid; grid-template-columns: 94px minmax(0, 1fr); gap: 12px; padding: 7px 0; align-items: baseline; }
.pq-plan b { font: 11px/1.6 var(--pq-pixel); font-weight: 400; color: var(--gold); white-space: nowrap; }
.pq-plan span { font-size: 18.5px; line-height: 1.35; text-wrap: balance; }
.pq-plan em { display: block; font-style: normal; font-size: 15.5px; color: var(--muted); margin-top: 1px; text-wrap: balance; }
.pq-faqs { margin-top: 12px; }
.pq-faqs.is-cols { columns: 2; column-gap: 30px; }
.pq-faq { break-inside: avoid; padding: 9px 0 9px 22px; background: ${BULLET} 0 16px / 6px 7px no-repeat; }
.pq-faq b { display: block; font: 600 19px/1.35 var(--pq-sans); color: #fff; text-wrap: balance; }
.pq-faq span { display: block; font-size: 17.5px; line-height: 1.45; color: #ddd6f7; margin-top: 3px; text-wrap: pretty; }
.pq-btns { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 20px; }
.pq-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; margin: 3px; padding: 0 20px; border: 0; border-radius: 0; background: var(--gold); color: #1b1030; font: 11px/1.3 var(--pq-pixel); text-transform: uppercase; text-decoration: none; cursor: pointer;
  box-shadow: 0 0 0 3px #1b1030, inset -4px -4px 0 #e89a1c, inset 4px 4px 0 #fff3a8; }
.pq-btn:active, .pq-send:active, .pq-act:active { translate: 0 2px; }
.pq-btn--ghost { margin-top: 20px; background: #2a2458; color: var(--cream); box-shadow: 0 0 0 3px #1b1030, inset -4px -4px 0 #1d1844, inset 4px 4px 0 var(--edge); }
.pq-gifts { margin-top: 18px; }
.pq-next { position: absolute; right: 6px; bottom: 0; z-index: 1; width: 44px; height: 44px; display: grid; place-items: center; padding: 0; border: 0; background: none; color: var(--gold); cursor: pointer; }
.pq-next .pq-arrow { width: 16px; height: 16px; }
.pq-motion .pq-next .pq-arrow { animation: pq-bob 0.9s steps(2, jump-none) infinite alternate; }
@keyframes pq-bob { to { translate: 0 4px; } }

/* the stage list: a path across the world map, each stage a tile (each one jumps to its stage) */
.pq-stages { position: relative; list-style: none; padding: 0; margin-top: 20px !important; display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; }
.pq-stages::before { content: ""; position: absolute; left: 8%; right: 8%; top: 25px; height: 4px; background: linear-gradient(90deg, var(--edge) 50%, transparent 50%) 0 0 / 12px 4px repeat-x; }
.pq-stages button { position: relative; width: 100%; display: grid; justify-items: center; gap: 12px; padding: 4px 2px 6px; border: 0; background: none; color: inherit; text-align: center; cursor: pointer; font: inherit; }
.pq-stages i { width: 60px; height: 44px; display: grid; place-items: center; font: 11px var(--pq-pixel); font-style: normal; color: #1b1030; background: var(--tone); box-shadow: 0 0 0 3px #1b1030, inset -4px -4px 0 rgba(27, 16, 48, 0.22), inset 4px 4px 0 rgba(255, 255, 255, 0.38); }
.pq-stages b { display: block; font: 600 18px/1.25 var(--pq-sans); color: #fff; text-wrap: balance; }
.pq-stages em { display: block; font-style: normal; font-size: 15px; line-height: 1.3; color: var(--muted); margin-top: 3px; text-wrap: balance; }
.pq-stages button > .pq-arrow { display: none; width: 14px; height: 14px; color: var(--gold); }
.pq-stages button:hover b, .pq-stages button:focus-visible b { color: var(--gold); }

/* ---- the final stage: the reply */
.pq-small { font-size: 16px; line-height: 1.45; color: var(--muted); margin-top: 10px !important; text-wrap: pretty; }
.pq-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.pq-pair > div { min-width: 0; }
.pq-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 20px; }
.pq-act { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 56px; margin: 3px; padding: 0 10px; white-space: nowrap; border: 0; border-radius: 0; background: #2a2458; color: #fff; font: 600 18px/1.2 var(--pq-sans); cursor: pointer;
  box-shadow: 0 0 0 3px #1b1030, inset -4px -4px 0 #1d1844, inset 4px 4px 0 var(--edge); }
.pq-act i { flex: none; display: grid; place-items: center; width: 28px; height: 28px; font: 11px var(--pq-pixel); font-style: normal; color: #1b1030; box-shadow: 0 0 0 3px #1b1030; }
.pq-act.a i { background: var(--teal); } .pq-act.b i { background: var(--coral); }
.pq-act.a.is-on { background: #17635f; box-shadow: 0 0 0 3px #1b1030, inset 0 0 0 4px var(--teal); }
.pq-act.b.is-on { background: #6e2943; box-shadow: 0 0 0 3px #1b1030, inset 0 0 0 4px var(--coral); }
.pq-form label { display: block; margin-top: 18px; font: 11px/1.4 var(--pq-pixel); text-transform: uppercase; color: var(--gold); }
.pq-field { display: block; width: 100%; margin-top: 9px; padding: 12px 14px; border: 0; border-radius: 0; background: var(--slot); color: #fff; font: 19px/1.3 var(--pq-sans); letter-spacing: 0; text-transform: none; box-shadow: inset 0 0 0 3px var(--edge); }
.pq-field:focus { outline: none; box-shadow: inset 0 0 0 3px var(--gold); }
.pq-field::placeholder { color: rgba(196, 188, 233, 0.6); }
textarea.pq-field { resize: vertical; min-height: 76px; }
.pq-seats { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; font: 11px var(--pq-pixel); text-transform: uppercase; color: var(--gold); }
.pq-seats__ctrl { display: inline-flex; align-items: center; gap: 16px; font: 16px var(--pq-pixel); color: #fff; }
.pq-seats__ctrl button { width: 44px; height: 44px; margin: 3px; border: 0; border-radius: 0; background: #2a2458; color: #fff; font: 18px var(--pq-pixel); cursor: pointer; box-shadow: 0 0 0 3px #1b1030, inset -3px -3px 0 #1d1844, inset 3px 3px 0 var(--edge); }
.pq-seats__ctrl button:disabled { opacity: 0.4; cursor: default; }
.pq-link { display: inline-block; margin-top: 6px; padding: 8px 0; border: 0; background: none; color: var(--muted); font: 15px var(--pq-sans); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.pq-error { color: #ff9ea1; font-size: 16px; margin-top: 14px !important; }
.pq-send { width: 100%; margin-top: 22px; min-height: 56px; border: 0; border-radius: 0; background: var(--gold); color: #1b1030; font: 13px/1.3 var(--pq-pixel); text-transform: uppercase; cursor: pointer;
  box-shadow: 0 0 0 3px #1b1030, inset -4px -4px 0 #e89a1c, inset 4px 4px 0 #fff3a8; }
.pq-send:disabled { opacity: 0.75; cursor: default; }
.pq-score { margin-top: 18px; padding: 16px 18px; background: #0b0920; box-shadow: inset 0 0 0 3px var(--edge); font-family: var(--pq-pixel); text-transform: uppercase; }
.pq-scorehd { font-size: 11px; color: #ff9fbe; }
.pq-motion .pq-scorehd { animation: pq-blink 1.1s linear infinite; }
.pq-scorerow { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; margin-top: 14px !important; font-size: 15px; color: #fff; }
.pq-scorerow b { flex: 1; min-width: 0; font-weight: 400; color: var(--gold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pq-maker { margin-top: 20px !important; text-align: center; font: 600 12px/1.5 var(--pq-sans); letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
.pq-maker a, .pq-maker b { color: #fff; font-weight: 700; }
.pq-card--slim .pq-win { padding: 8px 16px 14px; }

.pq-gallery { --frame: 75cqw; }
.pq-gallery .pq-title { padding-top: calc(var(--frame) * 0.17); }
@media (prefers-reduced-motion: reduce) { .pq-root *, .pq-root *::before, .pq-root *::after { animation: none !important; transition: none !important; } }

/* ---- phones: the windows fill the width under a slimmer HUD, the stage list runs down */
@container (max-width: 700px) {
  .pq-hud { padding: 14px 12px 0; gap: 8px; text-shadow: ${OUTLINE("#1b1030", 2)}; }
  .pq-hud > div { gap: 7px; }
  .pq-hud b { font-size: 9px; gap: 5px; }
  .pq-hud span { font-size: 12px; }
  .pq-hudname b { max-width: 104px; }
  .pq-coin { width: 7px; height: 9px; }
  .pq-title { padding-top: calc(var(--frame) * 0.14); padding-left: 14px; padding-right: 14px; }
  .pq-kick { font-size: 11px; text-shadow: ${OUTLINE("#1b1030", 2)}; }
  .pq-logo { font-size: var(--name-size-m, clamp(30px, 19cqw, 88px)); }
  .pq-age { font-size: 12px; padding: 9px 13px 8px; margin-top: 24px !important; }
  .pq-start { font-size: 15px; margin-top: 28px; gap: 10px; text-shadow: ${OUTLINE("#1b1030", 2)}; }
  .pq-start .pq-arrow { width: 14px; height: 14px; }
  .pq-meta { font-size: 17px; padding: 9px 14px 10px; margin-top: 24px !important; }
  .pq-card { width: calc(100cqw - 20px); border-width: 8px; border-image-width: 8px; }
  /* the run is a frame long, so only one window is on screen at a time */
  .pq-stop { padding-top: calc(var(--frame) * 1.02); }
  .pq-mapstop { padding-top: 0; }
  .pq-hold { height: calc(var(--frame) * 0.32); }
  .pq-final { padding-bottom: 48svh; }
  .pq-bar { font-size: 10px; padding: 9px 10px 8px; }
  .pq-win { padding: 16px 16px 36px; }
  .pq-head { gap: 14px; }
  .pq-face { width: 50px; height: 50px; padding: 5px; }
  .pq-h2 { font-size: 17px; }
  .pq-p { font-size: 18px; margin-top: 14px !important; }
  .pq-line { font-size: 16px; }
  .pq-vname { font-size: 18.5px; }
  .pq-venue { margin-top: 14px; }
  .pq-plan.is-cols, .pq-faqs.is-cols { columns: 1; }
  .pq-plan > div { grid-template-columns: 82px minmax(0, 1fr); gap: 10px; padding: 6px 0; }
  .pq-plan b { font-size: 10px; }
  .pq-plan span { font-size: 17px; }
  .pq-plan em { font-size: 15px; }
  .pq-faq { padding: 8px 0 8px 18px; background-position: 0 14px; }
  .pq-faq b { font-size: 17.5px; }
  .pq-faq span { font-size: 16px; }
  .pq-stages { grid-auto-flow: row; gap: 6px; margin-top: 16px !important; }
  .pq-stages::before { left: 28px; right: auto; top: 24px; bottom: 24px; width: 4px; height: auto; background: linear-gradient(180deg, var(--edge) 50%, transparent 50%) 0 0 / 4px 12px repeat-y; }
  .pq-stages button { grid-template-columns: 60px minmax(0, 1fr) 14px; justify-items: start; align-items: center; gap: 14px; text-align: left; padding: 4px 4px 4px 0; }
  .pq-stages i { width: 60px; height: 40px; }
  .pq-stages b { font-size: 17px; }
  .pq-stages em { font-size: 15px; margin-top: 1px; }
  .pq-stages button > .pq-arrow { display: block; }
  .pq-acts { gap: 12px; }
  .pq-act { font-size: 15.5px; gap: 8px; min-height: 54px; padding: 0 6px; }
  .pq-act i { width: 24px; height: 24px; font-size: 10px; }
  .pq-field { font-size: 18px; }
  .pq-form label, .pq-seats { font-size: 10px; }
  .pq-pair { grid-template-columns: 1fr; }
}
`;
