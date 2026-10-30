import { PAPER_GRAIN } from "../shared/stationery";
import { CALADO_MASK, CORBEL_MASK } from "./props";

// Capiz: one bahay na bato at dusk, from the eaves to the street. The upper floor is narra: the
// first capiz window (the opening), the ventanilla's balusters under its sill, a lime-washed
// pier with a farol on its bracket, the plank wall with a farol on its chain, a lit calado
// transom over plaster. Then the beam line and its corbels, and the stone silong: a marble
// plaque, bougainvillea spilling over, photos set in niches, the great zaguan doors shut and
// then standing open, and the street: the reply card on the step, the lamp post, the cobbles.
// The materials (--cz-shell, --cz-wood-h/v, --cz-bal, --cz-stone, --cz-tiles, --cz-plaster,
// --cz-marble, --cz-cobbles, --cz-flora) are drawn in code (textures.ts) and set on the root as
// they arrive; until then each has a plain stand-in. Sizes follow the page's width.

const WOOD = "#3e2015";
const W = (dir: "h" | "v", pos = "0 0") => `var(--cz-wood-${dir}, linear-gradient(${WOOD}, ${WOOD})) ${pos} / var(--cz-wood-${dir}-size, auto)`;
const STONE = (pos = "0 0", n = "") => `var(--cz-stone${n}, linear-gradient(#5f574c, #5f574c)) ${pos} / var(--cz-stone${n}-size, auto)`;
const GRAIN = `url("${PAPER_GRAIN}")`;

export const CAPIZ_CSS = `
.cz-root { --frame: 100svh; --post: 46px; --head: 34px; --sill: 30px; --eave: 196px; --stile: 12px; --vent: 150px; --beam: 128px; --step: 34px; --street: 230px;
  --win: min(1010px, 72cqw); --room: calc(var(--frame) - var(--eave) - var(--head) - var(--sill));
  --cz-soft: color-mix(in srgb, var(--cz-ink) 70%, var(--cz-bg)); --cz-rule: color-mix(in srgb, var(--cz-ink) 17%, transparent);
  --cz-brass: #8a6430; --cz-card: color-mix(in srgb, var(--cz-bg) 82%, #fff);
  --light: #f4e9d6; --light-soft: rgba(244, 233, 214, 0.76); --light-accent: #e8c88f;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: var(--cz-ink); background: #120f0e;
  font-family: var(--cz-body); -webkit-font-smoothing: antialiased; }
.cz-root.cz-dark { --cz-brass: #d6b07a; --cz-card: color-mix(in srgb, var(--cz-bg) 80%, #6b4c33); }
.cz-root *, .cz-root *::before, .cz-root *::after { box-sizing: border-box; }
.cz-root p, .cz-root h1, .cz-root h2, .cz-root h3, .cz-root ol, .cz-root ul { margin: 0; }
.cz-root img { max-width: none; }

/* ================================================================ the first window (the opening) */
.cz-head, .cz-post, .cz-sill { background-color: ${WOOD}; }
.cz-head { position: relative; z-index: 5; height: var(--head);
  background: linear-gradient(180deg, rgba(196, 206, 240, 0.2), rgba(150, 160, 200, 0.06) 3px, rgba(12, 14, 28, 0.5) 30%, rgba(8, 8, 16, 0.66) 78%, rgba(255, 188, 120, 0.22) 100%), ${W("h")};
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.6); }
.cz-row { position: relative; display: flex; overflow: hidden; isolation: isolate; background: #1a0f0a; }
.cz-post { flex: none; position: relative; z-index: 4; width: var(--post);
  background: linear-gradient(90deg, rgba(255, 190, 120, 0.26), rgba(255, 190, 120, 0) 3px, rgba(4, 4, 8, 0.55) 3px, rgba(4, 4, 8, 0.55) 5px, rgba(150, 160, 205, 0.16) 5px, rgba(150, 160, 205, 0.16) 7px, rgba(12, 14, 28, 0.48) 7px, rgba(12, 14, 28, 0.56) calc(100% - 7px), rgba(4, 4, 8, 0.6) calc(100% - 7px), rgba(4, 4, 8, 0.6) calc(100% - 3px), rgba(255, 190, 120, 0) calc(100% - 3px), rgba(255, 190, 120, 0.26)), ${W("v")};
  box-shadow: 3px 0 6px rgba(0, 0, 0, 0.45), -3px 0 6px rgba(0, 0, 0, 0.45); }
.cz-sill { position: relative; z-index: 6; height: var(--sill); margin: 0 -2px;
  background: linear-gradient(180deg, rgba(255, 214, 160, 0.16), rgba(40, 30, 40, 0.2) 32%, rgba(0, 0, 0, 0.55) 33%, rgba(12, 14, 28, 0.55) 40%, rgba(4, 4, 10, 0.76) 100%), ${W("h", "0 20px")};
  box-shadow: 0 12px 16px -6px rgba(0, 0, 0, 0.7); }
.cz-sill__light { position: absolute; left: 0; right: 0; top: 0; height: 34%; pointer-events: none;
  background: radial-gradient(ellipse calc(var(--win) * 0.5) 100% at 50% 0, rgba(255, 206, 140, 0.62), rgba(255, 206, 140, 0) 100%); }
.cz-motion .cz-sill__light { opacity: 0.15; }

.cz-win { position: relative; z-index: 2; flex: none; width: var(--win); }
.cz-room { position: relative; z-index: 0; min-height: var(--room); display: flex; color: var(--cz-ink);
  background: ${GRAIN}, radial-gradient(ellipse 95% 90% at var(--lx, 42%) 28%, color-mix(in srgb, var(--cz-bg) 70%, #fff2d2) 0%, color-mix(in srgb, var(--cz-bg) 84%, #f4d4a0) 38%, color-mix(in srgb, var(--cz-bg) 70%, #d9a468) 72%, color-mix(in srgb, var(--cz-bg) 52%, #9a6236) 100%);
  background-size: 220px 220px, 100% 100%; background-blend-mode: multiply, normal;
  box-shadow: inset 0 26px 34px -20px rgba(40, 16, 4, 0.66), inset 0 -20px 30px -18px rgba(40, 16, 4, 0.55), inset 26px 0 36px -22px rgba(40, 16, 4, 0.6), inset -26px 0 36px -22px rgba(40, 16, 4, 0.6); }
.cz-dark .cz-room { background: ${GRAIN}, radial-gradient(ellipse 70% 62% at var(--lx, 42%) 30%, color-mix(in srgb, var(--cz-bg) 55%, #9a6438) 0%, color-mix(in srgb, var(--cz-bg) 80%, #5a3518) 50%, var(--cz-bg) 82%, color-mix(in srgb, var(--cz-bg) 70%, #000) 100%);
  background-size: 220px 220px, 100% 100%; background-blend-mode: multiply, normal; }
.cz-cover { position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
.cz-back { position: absolute; top: 0; bottom: 0; width: 50%; overflow: hidden; background: #2a160b; }
.cz-back--l { left: 0; }
.cz-back--r { right: 0; }
.cz-back > .cz-lamp { width: 200%; }
.cz-back--r > .cz-lamp { left: auto; right: 0; }
.cz-lamp { position: absolute; top: 0; bottom: 0; left: 0; width: 100%; transition: opacity 1.5s ease;
  /* the room's light behind the shell: near white, warm only close to the lamp, dimmer and greyer away from it */
  background: radial-gradient(ellipse 30% 36% at var(--lx) var(--ly), rgba(255, 206, 140, 0.62), rgba(255, 214, 150, 0) 100%),
    radial-gradient(ellipse 90% 100% at var(--lx) var(--ly), #fffdf8 0%, #fbf6ee 34%, #ece5da 68%, #cdc5b9 100%); }
.cz-lamp::before, .cz-lamp::after { content: ""; position: absolute; inset: 0; }
.cz-lamp::before { background: rgba(40, 32, 30, var(--lb)); }
.cz-lamp::after { background: radial-gradient(ellipse 30% 36% at var(--lx) var(--ly), rgba(255, 236, 196, 0.6), rgba(255, 230, 190, 0) 72%); opacity: 0.7; }
.cz-motion .is-near .cz-lamp::after { animation: cz-flick var(--fd) ease-in-out var(--fo) infinite; }
@keyframes cz-flick { 0% { opacity: 0.7; } 17% { opacity: 0.84; } 29% { opacity: 0.62; } 46% { opacity: 0.8; } 61% { opacity: 0.66; } 79% { opacity: 0.88; } 100% { opacity: 0.7; } }
.cz-intro:not(.cz-lit) .cz-bay--hero .cz-cover .cz-lamp { opacity: 0.2; }

.cz-sash { position: absolute; top: 0; bottom: 0; width: 50%; z-index: 2; pointer-events: none; }
.cz-sash--l { left: 0; }
.cz-sash--r { right: 0; }
.is-near > .cz-row .cz-sash { will-change: transform; }
.cz-sash::before, .cz-sash::after, .cz-nb__sash::before, .cz-nb__sash::after, .cz-edgewin::before, .cz-edgewin::after { content: ""; position: absolute; inset: 0; z-index: 1; }
.cz-sash::before, .cz-nb__sash::before, .cz-edgewin::before { background: linear-gradient(rgba(14, 16, 32, 0.36), rgba(14, 16, 32, 0.36)), ${W("h")};
  -webkit-mask: linear-gradient(#000 0 0) top / 100% var(--stile) no-repeat, linear-gradient(#000 0 0) bottom / 100% var(--stile) no-repeat;
  mask: linear-gradient(#000 0 0) top / 100% var(--stile) no-repeat, linear-gradient(#000 0 0) bottom / 100% var(--stile) no-repeat; }
.cz-sash::after, .cz-nb__sash::after, .cz-edgewin::after { background: linear-gradient(90deg, rgba(190, 200, 240, 0.14), rgba(14, 16, 32, 0.3) 30%, rgba(6, 6, 12, 0.5)), ${W("v")};
  -webkit-mask: linear-gradient(#000 0 0) left / var(--stile) 100% no-repeat, linear-gradient(#000 0 0) right / var(--stile) 100% no-repeat;
  mask: linear-gradient(#000 0 0) left / var(--stile) 100% no-repeat, linear-gradient(#000 0 0) right / var(--stile) 100% no-repeat; }
/* the shell, a whole number of panes each way (house.ts sets --pw/--ph) */
.cz-glass { position: absolute; inset: var(--stile);
  background-image: var(--cz-shell, repeating-linear-gradient(90deg, #2a170e 0 5px, rgba(240, 226, 200, 0.3) 5px var(--pw, 54px)), repeating-linear-gradient(0deg, #2a170e 0 5px, rgba(240, 226, 200, 0.3) 5px var(--ph, 54px)));
  background-size: calc(var(--pw, 54px) * 8) calc(var(--ph, 54px) * 8);
  background-position: calc(var(--pw, 54px) * var(--sx, 0) * -1) calc(var(--ph, 54px) * var(--sy, 0) * -1);
  box-shadow: inset 0 2px 3px rgba(10, 4, 2, 0.55), inset 0 0 0 1px rgba(20, 10, 6, 0.85); }
.cz-glass::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 70% 60% at 50% 42%, rgba(255, 250, 240, 0.12), rgba(255, 250, 240, 0) 75%); }
.cz-still .cz-cover { display: none; }
.cz-still .cz-sash--l { transform: translateX(calc(-100% - var(--post) - 6px)); }
.cz-still .cz-sash--r { transform: translateX(calc(100% + var(--post) + 6px)); }
.cz-nb { position: relative; z-index: 1; flex: 1 1 0; min-width: 0; overflow: hidden; background: #2a160b; }
.cz-nb__sash { position: absolute; top: 0; bottom: 0; width: calc(var(--win) / 2); z-index: 1; }
.cz-nb--l .cz-nb__sash { right: 0; }
.cz-nb--r .cz-nb__sash { left: 0; }

.cz-eave { position: relative; height: var(--eave); overflow: hidden; background: #120b08; }
.cz-eave__sky { position: absolute; left: 0; right: 0; top: 0; height: 60%; background: linear-gradient(180deg, #0c1126 0%, #1b2140 50%, #3b3653 100%); }
/* the roof: its tile courses going back up the slope, the open tile ends along the eave */
.cz-eave__tiles { position: absolute; left: 0; right: 0; top: calc(100% - var(--soffit) - var(--roof)); height: var(--roof); z-index: 2;
  background: var(--cz-tiles, linear-gradient(transparent 40%, #4a2a1c 40%)) 0 100% / var(--cz-tiles-size, 324px 118px) repeat-x;
  filter: brightness(0.82) saturate(0.85); }
/* the fascia under the tiles, then the eave's shallow underside in shadow, a rafter tail now and
   then, warmed by the windows below */
.cz-eave__soffit { position: absolute; left: 0; right: 0; bottom: 0; height: var(--soffit); z-index: 1;
  background: linear-gradient(180deg, rgba(160, 170, 210, 0.16) 0, rgba(12, 10, 14, 0.62) 2px, rgba(12, 10, 14, 0.62) 13px, rgba(0, 0, 0, 0.85) 14px, rgba(8, 5, 4, 0.9) 40%, rgba(60, 32, 18, 0.7) 82%, rgba(255, 176, 100, 0.3) 100%),
    linear-gradient(90deg, transparent 0 calc(100% - 22px), rgba(60, 34, 22, 0.9) calc(100% - 22px) calc(100% - 4px), transparent calc(100% - 4px)) 0 14px / 168px calc(100% - 14px) repeat-x,
    ${W("h")}; }
.cz-root { --roof: 118px; --soffit: 46px; }
/* the couple, in the room */
.cz-hero { flex: 1; display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1fr); }
.cz-hero__photo { position: relative; overflow: hidden; min-height: 100%; }
.cz-hero__photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cz-hero__photo::after { content: ""; position: absolute; inset: 0; pointer-events: none; box-shadow: inset -30px 0 40px -30px rgba(40, 16, 4, 0.45); }
.cz-hero__words { --tx-soft: var(--cz-soft); --tx-accent: var(--cz-brass); align-self: center; display: grid; justify-items: center; gap: 16px; padding: 40px clamp(28px, 4cqw, 64px); text-align: center; }
.cz-hero--words { grid-template-columns: 1fr; }
.cz-names { font: italic 400 var(--cz-name)/1.02 var(--cz-display); letter-spacing: -0.01em; text-wrap: balance; padding: 0.06em 0.08em 0.1em; }
.cz-names__one { white-space: nowrap; }
.cz-amp { display: inline-block; margin: 0 0.16em; font-size: 0.72em; color: var(--cz-brass); }
.cz-date { font: 400 19px/1.45 var(--cz-body); text-wrap: balance; }
.cz-town { font: 500 13px/1.5 var(--cz-body); letter-spacing: 0.26em; text-transform: uppercase; padding-left: 0.26em; color: var(--cz-soft); }
.cz-rise { transition: opacity 1.5s ease, translate 1.9s cubic-bezier(.2, .7, .2, 1), filter 1.6s ease; }
.cz-intro:not(.cz-named) .cz-rise { opacity: 0; translate: 0 10px; filter: blur(5px); }
.cz-named .cz-names { transition-delay: 0.2s; }
.cz-named .cz-date { transition-delay: 0.6s; }
.cz-named .cz-town { transition-delay: 0.8s; }

/* ================================================================ the parts of the house below */
.cz-part { position: relative; min-height: var(--frame); display: flex; flex-direction: column; }
.cz-face { position: relative; flex: 1; display: grid; align-content: center; justify-items: center; overflow: hidden;
  padding: clamp(48px, 7cqw, 100px) clamp(24px, 8cqw, 130px); }
.cz-copy { --tx: var(--cz-ink); --tx-soft: var(--cz-soft); --tx-accent: var(--cz-brass); position: relative; z-index: 2; width: 100%; max-width: 760px;
  display: grid; justify-items: center; text-align: center; gap: 18px; color: var(--tx); }
/* type set on the dark wood and the dusk stone: the colour of lamplight on paper, a soft shadow */
.cz-light { --tx: var(--light); --tx-soft: var(--light-soft); --tx-accent: var(--light-accent); color: var(--tx); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), 0 0 22px rgba(0, 0, 0, 0.45); }

/* ---- the ventanilla: turned balusters before the low opening, a sliding panel half across */
.cz-vent { position: relative; z-index: 3; flex: none; height: var(--vent); overflow: hidden; background: #140b07; }
.cz-vent::before, .cz-vent::after { content: ""; position: absolute; left: 0; right: 0; height: 12px; z-index: 3;
  background: linear-gradient(180deg, rgba(190, 200, 240, 0.12), rgba(8, 8, 16, 0.6)), ${W("h")}; }
.cz-vent::before { top: 0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5); }
.cz-vent::after { bottom: 0; height: 16px; box-shadow: 0 6px 10px rgba(0, 0, 0, 0.6); }
.cz-vent__room { position: absolute; inset: 12px 0 16px; background: linear-gradient(180deg, #1c0e07 0%, #6e3c1c 30%, #d29454 72%, #9a5c2c 100%); }
.cz-vent__panel { position: absolute; top: 12px; bottom: 16px; left: 58%; width: 30%;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0) 5%, rgba(0, 0, 0, 0) 95%, rgba(0, 0, 0, 0.6)), linear-gradient(rgba(8, 6, 12, 0.62), rgba(8, 6, 12, 0.62)), ${W("v")};
  box-shadow: inset 0 0 0 9px rgba(255, 255, 255, 0.03), inset 0 0 0 10px rgba(0, 0, 0, 0.35); }
.cz-vent__bal { position: absolute; left: 0; right: 0; top: 12px; bottom: 16px; z-index: 2;
  background: var(--cz-bal, repeating-linear-gradient(90deg, #3a2014 0 10px, transparent 10px 40px)) 0 50% / var(--cz-bal-size, auto 100%) repeat-x; }

/* ---- horizontal narra planks, warmed from the ventanilla's light above */
.cz-planks { background: radial-gradient(ellipse 70% 50% at 50% 0, rgba(255, 180, 100, 0.28), rgba(255, 180, 100, 0) 100%),
  linear-gradient(180deg, rgba(10, 10, 22, 0.42), rgba(8, 8, 18, 0.58) 70%, rgba(4, 4, 10, 0.76)),
  repeating-linear-gradient(180deg, rgba(0, 0, 0, 0) 0 64px, rgba(0, 0, 0, 0.62) 64px 66px, rgba(190, 170, 160, 0.1) 66px 67px), ${W("h")}; }

/* ---- the lime-washed pier, a farol on its bracket */
.cz-plaster { --tx-soft: color-mix(in srgb, var(--cz-ink) 78%, var(--cz-bg)); background: radial-gradient(ellipse 60% 56% at 52% 16%, rgba(255, 200, 124, 0.5), rgba(255, 190, 120, 0.12) 60%, rgba(255, 196, 120, 0) 100%),
  linear-gradient(180deg, rgba(40, 26, 30, 0.06), rgba(40, 26, 34, 0.24) 60%, rgba(16, 10, 18, 0.5)),
  var(--cz-plaster, linear-gradient(#fff, #fff)) 0 0 / var(--cz-plaster-size, auto), var(--cz-bg);
  background-blend-mode: normal, normal, multiply, normal; }
.cz-dark .cz-plaster { background-blend-mode: normal, normal, multiply, normal; }
.cz-part--venues .cz-face { padding-top: clamp(190px, 18cqw, 240px); }
.cz-lampspot { position: absolute; z-index: 1; pointer-events: none; }
.cz-lampspot--venues { left: calc(50% - 26px); top: 18px; width: 140px; }
.cz-farol { display: block; width: 100%; height: auto; overflow: visible; filter: drop-shadow(10px 18px 10px rgba(0, 0, 0, 0.45)); }
.cz-glow { position: absolute; left: 50%; top: 50%; width: 520px; height: 520px; translate: -50% -50%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(255, 228, 172, 0.62) 0%, rgba(255, 198, 122, 0.26) 20%, rgba(255, 170, 90, 0.08) 44%, rgba(255, 170, 90, 0) 70%); }
.cz-lampspot--venues .cz-glow { left: 66%; top: 52%; }
.cz-motion .is-near .cz-glow { animation: cz-glow 4.6s ease-in-out infinite; }
@keyframes cz-glow { 0%, 100% { opacity: 1; } 30% { opacity: 0.88; } 55% { opacity: 0.97; } 78% { opacity: 0.9; } }
/* the edge of the next capiz window along, shut and lit */
.cz-edgewin { position: absolute; left: -30px; top: 9%; bottom: 9%; width: 150px; z-index: 1; --stile: 10px;
  background: radial-gradient(ellipse 60% 30% at 80% 40%, rgba(255, 214, 150, 0.5), rgba(255, 214, 150, 0) 100%), radial-gradient(ellipse 120% 70% at 70% 45%, #fbf6ee, #e8e0d4 50%, #bdb5aa); box-shadow: 10px 0 24px rgba(0, 0, 0, 0.35), 0 0 0 10px ${WOOD}; }
.cz-edgewin .cz-glass { --pw: 46px; --ph: 46px; }

/* ---- vertical boards, a farol hanging on its chain */
.cz-boards { background: radial-gradient(ellipse 44% 54% at 20% 30%, rgba(255, 186, 110, 0.32), rgba(255, 186, 110, 0) 100%),
  linear-gradient(180deg, rgba(10, 10, 22, 0.5), rgba(8, 8, 18, 0.58) 60%, rgba(4, 4, 10, 0.74)),
  repeating-linear-gradient(90deg, rgba(0, 0, 0, 0) 0 86px, rgba(0, 0, 0, 0.66) 86px 88px, rgba(200, 180, 170, 0.08) 88px 89px), ${W("v")}; }
.cz-lampspot--story { left: 17%; top: 0; width: 86px; }
.cz-lampspot--story .cz-glow { top: 68%; }

/* ---- the calado: pierced fretwork over a lit room, and plaster under it */
.cz-calado { position: relative; flex: none; height: 150px; overflow: hidden; background: #1a0e08;
  box-shadow: inset 0 14px 0 ${WOOD}, inset 0 -16px 0 ${WOOD}; }
.cz-calado::before, .cz-calado::after { content: ""; position: absolute; left: 0; right: 0; z-index: 3; background: linear-gradient(180deg, rgba(190, 200, 240, 0.14), rgba(8, 8, 16, 0.6)), ${W("h")}; }
.cz-calado::before { top: 0; height: 14px; }
.cz-calado::after { bottom: 0; height: 18px; box-shadow: 0 8px 12px rgba(0, 0, 0, 0.55); }
.cz-calado__light { position: absolute; inset: 14px 0 18px; background: radial-gradient(ellipse 50% 140% at 40% 50%, #fff2d4, #f4c27e 40%, #b86c34 80%, #5a2c12); }
.cz-calado__wood { position: absolute; inset: 14px 0 18px; z-index: 2; filter: drop-shadow(0 3px 2px rgba(0, 0, 0, 0.75)); }
.cz-calado__wood > span { position: absolute; inset: 0; background: linear-gradient(rgba(14, 14, 28, 0.4), rgba(14, 14, 28, 0.4)), ${W("h")};
  -webkit-mask: ${CALADO_MASK} 0 50% / auto 100% repeat-x; mask: ${CALADO_MASK} 0 50% / auto 100% repeat-x; }
.cz-plaster--ent { background: radial-gradient(ellipse 64% 40% at 50% 0, rgba(255, 200, 124, 0.42), rgba(255, 196, 120, 0) 100%),
  linear-gradient(180deg, rgba(40, 26, 30, 0.04), rgba(40, 26, 34, 0.2) 60%, rgba(16, 10, 18, 0.46)),
  var(--cz-plaster, linear-gradient(#fff, #fff)) 0 0 / var(--cz-plaster-size, auto), var(--cz-bg);
  background-blend-mode: normal, normal, multiply, normal; }

/* ---- the beam line: the upper floor's beam on its corbels, over the stone */
.cz-beamline { position: relative; flex: none; height: var(--beam); background: linear-gradient(180deg, rgba(0, 0, 0, 0.78), rgba(4, 4, 10, 0.55) 70%, rgba(8, 8, 18, 0.45)), ${STONE()}; }
.cz-beamline__beam { position: absolute; left: 0; right: 0; top: 0; height: 40px; z-index: 2;
  background: linear-gradient(180deg, rgba(190, 200, 240, 0.12), rgba(10, 10, 22, 0.58) 20%, rgba(4, 4, 10, 0.8)), ${W("h")};
  box-shadow: 0 16px 24px rgba(0, 0, 0, 0.7); }
.cz-beamline__corbels { position: absolute; left: 0; right: 0; top: 40px; height: 82px; z-index: 1;
  background: linear-gradient(90deg, rgba(6, 6, 14, 0.7), rgba(40, 40, 70, 0.2) 40%, rgba(6, 6, 14, 0.7)), ${W("v")};
  -webkit-mask: ${CORBEL_MASK} 60px 0 / auto 100% repeat-x; mask: ${CORBEL_MASK} 60px 0 / auto 100% repeat-x;
  filter: drop-shadow(6px 10px 8px rgba(0, 0, 0, 0.6)); }

/* ---- the stone silong at dusk, lit here and there */
/* each stop its own stretch of wall: one of three stones, at its own offset */
.cz-stone { --px: 50%; --py: 30%; --st: var(--cz-stone, linear-gradient(#5f574c, #5f574c)); --st-size: var(--cz-stone-size, auto); --st-pos: 0 0;
  background: radial-gradient(ellipse 50% 46% at var(--px) var(--py), rgba(255, 184, 108, 0.34), rgba(255, 184, 108, 0.08) 60%, rgba(255, 186, 110, 0) 100%),
    linear-gradient(180deg, rgba(14, 16, 32, 0.36), rgba(12, 14, 28, 0.42) 55%, rgba(4, 4, 10, 0.62)), var(--st) var(--st-pos) / var(--st-size); }
.cz-part--dress .cz-stone { --st: var(--cz-stone2, linear-gradient(#5f574c, #5f574c)); --st-size: var(--cz-stone2-size, auto); --st-pos: -380px -120px; }
.cz-part--wall .cz-stone { --st: var(--cz-stone3, linear-gradient(#5f574c, #5f574c)); --st-size: var(--cz-stone3-size, auto); --st-pos: -140px -40px; }
.cz-part--know .cz-stone { --st-pos: -760px -300px; }
.cz-part--gifts .cz-stone { --st: var(--cz-stone2, linear-gradient(#5f574c, #5f574c)); --st-size: var(--cz-stone2-size, auto); --st-pos: -1040px -380px; }
.cz-part--street .cz-stone { --st: var(--cz-stone3, linear-gradient(#5f574c, #5f574c)); --st-size: var(--cz-stone3-size, auto); --st-pos: -880px -20px; }

/* the marble plaque */
.cz-plaque { position: relative; z-index: 2; width: min(640px, 100%); padding: clamp(34px, 4cqw, 52px) clamp(28px, 4.4cqw, 60px);
  background: radial-gradient(circle at 18px 18px, #d6b888 0 3px, #6d5430 3.5px 5px, rgba(0, 0, 0, 0) 5.5px),
    radial-gradient(circle at calc(100% - 18px) 18px, #d6b888 0 3px, #6d5430 3.5px 5px, rgba(0, 0, 0, 0) 5.5px),
    radial-gradient(circle at 18px calc(100% - 18px), #d6b888 0 3px, #6d5430 3.5px 5px, rgba(0, 0, 0, 0) 5.5px),
    radial-gradient(circle at calc(100% - 18px) calc(100% - 18px), #d6b888 0 3px, #6d5430 3.5px 5px, rgba(0, 0, 0, 0) 5.5px),
    radial-gradient(ellipse 80% 70% at 50% 20%, rgba(255, 214, 160, 0.22), rgba(40, 40, 70, 0.22) 100%),
    var(--cz-marble, linear-gradient(#f1ece2, #f1ece2)) 0 0 / var(--cz-marble-size, auto);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), inset 2px 2px 0 rgba(255, 255, 255, 0.35), inset -2px -2px 0 rgba(0, 0, 0, 0.12), 0 0 0 7px rgba(70, 62, 54, 0.95), 0 0 0 8px rgba(0, 0, 0, 0.5), 14px 22px 30px rgba(0, 0, 0, 0.55); }
/* letters cut into the marble */
.cz-plaque .cz-copy { --tx: #3a2e25; --tx-soft: #6c5c4e; --tx-accent: #7a5a2c; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65), 0 -1px 0 rgba(0, 0, 0, 0.12); }
.cz-part--day .cz-stone { --px: 50%; --py: 40%; }

/* bougainvillea over the stone */
.cz-stone--flora { --px: 30%; --py: 46%; justify-items: start; }
.cz-flora { position: absolute; z-index: 1; top: 0; right: -60px; width: var(--fw, 620px); height: var(--fh, 520px); pointer-events: none;
  background: var(--cz-flora, none) 0 0 / 100% 100% no-repeat; }
.cz-flora--b { right: auto; left: -40px; --fw: 410px; --fh: 322px; background-image: var(--cz-flora2, none); }
.cz-attire { max-width: 480px; justify-items: start; text-align: left; margin-left: 2cqw; justify-self: start; }

/* photos set deep in the stone */
.cz-stone--wall { --px: 50%; --py: 12%; }
.cz-niches { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: clamp(160px, 15cqw, 222px); grid-auto-flow: dense; gap: clamp(18px, 2.2cqw, 30px); width: 100%; max-width: 1120px; }
.cz-niche { position: relative; padding: 10px; background: linear-gradient(135deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.15) 30%, rgba(255, 220, 180, 0.08)), ${STONE("40% 40%", "2")};
  box-shadow: inset 6px 8px 14px rgba(0, 0, 0, 0.7), inset -1px -1px 0 rgba(255, 230, 200, 0.15), 0 1px 0 rgba(255, 230, 200, 0.12); }
.cz-niche.is-wide-d { grid-column: span 2; }
.cz-niche__photo { position: relative; width: 100%; height: 100%; overflow: hidden; box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5); }
.cz-niche__photo::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(255, 210, 150, 0.12), rgba(10, 10, 30, 0.22)); }

/* the zaguan doors, shut */
.cz-stone--door { --px: 34%; --py: 40%; justify-items: start; }
.cz-zaguan { position: absolute; z-index: 1; right: 7%; bottom: 0; width: min(440px, 34cqw); height: 86%; display: flex; gap: 3px; padding: 0 3px;
  background: #0b0705; box-shadow: 0 0 0 26px rgba(90, 82, 72, 0.92), 0 0 0 27px rgba(0, 0, 0, 0.5), inset 0 14px 18px rgba(0, 0, 0, 0.6), 0 0 60px 30px rgba(0, 0, 0, 0.3); }
/* each leaf: thick narra, eight raised panels in their stiles and rails, iron studs where they
   meet, two strap hinges, a ring on the right one; the farol's light falling across them */
.cz-zaguan__leaf { position: relative; flex: 1; display: grid; grid-template: repeat(4, 1fr) / repeat(2, 1fr); gap: 14px; padding: 16px 14px;
  background: radial-gradient(circle at 40% 35%, #a08a72 0 1px, #3a2c20 2.2px, #0c0806 3.4px, rgba(0, 0, 0, 0) 4px) 4px 4px / calc(50% - 4px) calc(25% - 3px),
    radial-gradient(ellipse 160% 70% at -10% 28%, rgba(255, 190, 116, 0.26), rgba(255, 190, 116, 0) 70%),
    linear-gradient(180deg, rgba(20, 18, 30, 0.5), rgba(6, 6, 12, 0.72)), ${W("v")};
  box-shadow: inset 0 0 0 1px rgba(255, 220, 190, 0.06), inset 3px 0 6px rgba(0, 0, 0, 0.5); }
.cz-zaguan__leaf--r { background-position: 6px 4px, 0 0, 0 0, 60px 0; }
.cz-panel { position: relative; border-radius: 1px;
  background: linear-gradient(135deg, rgba(255, 220, 180, 0.1), rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.3)), linear-gradient(rgba(24, 20, 30, 0.5), rgba(10, 8, 14, 0.62)), ${W("v", "-30px 0")};
  box-shadow: inset 2px 2px 0 rgba(255, 220, 180, 0.12), inset -2px -2px 0 rgba(0, 0, 0, 0.45), 0 0 0 2px rgba(0, 0, 0, 0.45), -1px -1px 0 2px rgba(255, 220, 180, 0.06); }
.cz-panel::after { content: ""; position: absolute; inset: 22%; background: linear-gradient(135deg, rgba(255, 220, 180, 0.12), rgba(0, 0, 0, 0.2));
  box-shadow: -2px -2px 0 rgba(0, 0, 0, 0.35), 2px 2px 0 rgba(255, 220, 180, 0.08); }
.cz-hinge { position: absolute; left: -3px; width: 62%; height: 12px; border-radius: 0 6px 6px 0;
  background: radial-gradient(circle, #5a4c40 0 1.6px, #120c08 2.4px, rgba(0, 0, 0, 0) 3px) 8px 50% / 22px 100% repeat-x, linear-gradient(180deg, #3a322c, #120e0b 55%, #050403);
  box-shadow: 0 3px 4px rgba(0, 0, 0, 0.6); }
.cz-zaguan__leaf--r .cz-hinge { left: auto; right: -3px; border-radius: 6px 0 0 6px; }
.cz-hinge--a { top: 14%; }
.cz-hinge--b { bottom: 14%; }
.cz-knocker { position: absolute; left: 12px; top: 50%; width: 30px; height: 30px; margin-top: -15px; border-radius: 50%; border: 3px solid #1a1410; box-shadow: 0 0 0 1px rgba(160, 140, 120, 0.2), 2px 4px 4px rgba(0, 0, 0, 0.6); }
.cz-know { max-width: min(600px, 52cqw); justify-items: start; text-align: left; }
.cz-lampspot--door { right: calc(7% + min(440px, 34cqw) + 34px); top: 12%; width: 120px; }
.cz-lampspot--door .cz-glow { left: 66%; }

/* the zaguan standing open, the hall lit behind */
.cz-stone--open { --px: 50%; --py: 78%; align-content: end; padding-bottom: 0; }
.cz-arch { --aw: min(660px, 62cqw); --ring: 30px; position: relative; isolation: isolate; width: var(--aw); min-height: calc(var(--frame) * 0.8); display: grid; align-content: end; padding: calc(var(--aw) * 0.3) 17% 56px; }
.cz-arch::before { content: ""; position: absolute; z-index: 0; inset: calc(var(--ring) * -1) calc(var(--ring) * -1) 0; border-radius: calc(var(--aw) / 2 + var(--ring)) calc(var(--aw) / 2 + var(--ring)) 0 0;
  background: repeating-conic-gradient(from -90deg at 50% calc(var(--aw) / 2 + var(--ring)), rgba(18, 14, 10, 0.75) 0 0.45deg, rgba(0, 0, 0, 0) 0.45deg 12deg),
    linear-gradient(rgba(150, 126, 96, 0.14), rgba(150, 126, 96, 0.14)), ${STONE("30% 40%", "3")};
  -webkit-mask: linear-gradient(#000 0 0) top / 100% calc(var(--aw) / 2 + var(--ring)) no-repeat; mask: linear-gradient(#000 0 0) top / 100% calc(var(--aw) / 2 + var(--ring)) no-repeat; }
.cz-arch__in { position: absolute; inset: 0; z-index: 1; border-radius: calc(var(--aw) / 2) calc(var(--aw) / 2) 0 0; overflow: hidden;
  background: radial-gradient(circle at 50% 18%, rgba(255, 244, 214, 0.9), rgba(255, 220, 160, 0) 30%),
    linear-gradient(0deg, rgba(70, 36, 16, 0.85) 0, rgba(120, 70, 34, 0.5) 12%, rgba(150, 90, 44, 0) 26%),
    radial-gradient(ellipse 85% 70% at 50% 42%, #fbe6bf 0%, #efc184 50%, #ba7840 82%, #6e3a1c 100%);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4), inset 18px 0 30px -12px rgba(40, 14, 0, 0.6), inset -18px 0 30px -12px rgba(40, 14, 0, 0.6), 0 0 120px 40px rgba(255, 170, 90, 0.14); }
.cz-arch__leaf { position: absolute; z-index: 2; bottom: 0; width: 15%; height: 82%;
  background: radial-gradient(circle, #3a2e24 0 2px, #0c0806 2.4px 3px, rgba(0, 0, 0, 0) 3.4px) 10px 14px / 30px 40px,
    linear-gradient(90deg, rgba(0, 0, 0, 0.55), rgba(255, 200, 140, 0.14) 60%, rgba(0, 0, 0, 0.5)), ${W("v")}; }
.cz-arch__leaf--l { left: 0; transform-origin: 0 50%; transform: perspective(900px) rotateY(58deg); }
.cz-arch__leaf--r { right: 0; transform-origin: 100% 50%; transform: perspective(900px) rotateY(-58deg); }
.cz-arch .cz-copy { --tx: #2c1a0e; --tx-soft: #6a4a32; --tx-accent: #7a5226; z-index: 3; }

/* the street: the plinth, the step with the reply card on it, the cobbles */
.cz-stone--plinth { --px: 26%; --py: 70%; align-content: end; padding-bottom: 0; overflow: visible; z-index: 2; }
.cz-card { --tx: #2a1d14; --tx-soft: #6e5a48; --tx-accent: #8a6430; position: relative; z-index: 3; width: min(520px, 100%); margin: 0 0 -6px 12cqw; padding: 36px 40px 34px; rotate: -0.8deg; color: var(--tx);
  background: ${GRAIN}, linear-gradient(160deg, #fbf4e4, #efe2c8); background-size: 220px 220px, 100% 100%; background-blend-mode: multiply, normal;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 18px 6px 26px rgba(0, 0, 0, 0.55), 2px 2px 3px rgba(0, 0, 0, 0.3); }
.cz-lamppost { position: absolute; z-index: 4; left: 3%; bottom: calc((var(--step) + var(--street) * 0.42) * -1); height: min(620px, calc(var(--frame) * 0.72)); width: 110px; pointer-events: none; }
.cz-post-lamp { display: block; width: 100%; height: 100%; filter: drop-shadow(14px 10px 10px rgba(0, 0, 0, 0.5)); }
.cz-glow--post { top: 9%; width: 640px; height: 640px; }
.cz-step { position: relative; z-index: 2; flex: none; height: var(--step);
  background: linear-gradient(180deg, rgba(255, 210, 160, 0.22), rgba(30, 30, 50, 0.3) 34%, rgba(0, 0, 0, 0.55) 36%, rgba(4, 4, 10, 0.75)), ${STONE("0 60%")};
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.6); }
.cz-street { position: relative; flex: none; height: var(--street); overflow: hidden; background: #0e0c0b; }
.cz-street__ground { position: absolute; inset: 0; z-index: 0; overflow: hidden; perspective: 520px; }
.cz-street__cobbles { position: absolute; left: -40%; right: -40%; top: 0; height: 300%; transform-origin: 50% 0; transform: rotateX(64deg);
  background: radial-gradient(ellipse 30% 24% at 34% 8%, rgba(255, 190, 110, 0.4), rgba(255, 190, 110, 0) 100%), linear-gradient(rgba(10, 12, 26, 0.4), rgba(10, 12, 26, 0.4)),
    var(--cz-cobbles, linear-gradient(#3a3430, #3a3430)) 0 0 / var(--cz-cobbles-size, auto); }
.cz-street::after { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(180deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.45)); }
.cz-street__words { position: relative; z-index: 2; height: 100%; display: grid; align-content: center; justify-items: center; gap: 8px; padding: 0 16px; text-align: center; color: var(--light);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.6); }
.cz-closing { font: italic 400 clamp(30px, 3cqw, 42px)/1.1 var(--cz-display); text-wrap: balance; }
.cz-mono { font: 500 13px var(--cz-body); letter-spacing: 0.34em; text-transform: uppercase; padding-left: 0.34em; color: var(--light-soft); }
.cz-bloom { fill: none; stroke: currentColor; stroke-width: 1.2; opacity: 0.8; }
.cz-credit { margin-top: 10px !important; font-size: 13px; letter-spacing: 0.03em; color: var(--light-soft); text-wrap: balance; }
.cz-credit a { color: inherit; }

/* ================================================================ type */
.cz-whisper { font: italic 400 19px/1.4 var(--cz-body); color: var(--tx-soft, var(--cz-soft)); text-wrap: balance; }
.cz-title { font: italic 400 clamp(40px, 4.1cqw, 58px)/1.04 var(--cz-display); text-align: center; text-wrap: balance; letter-spacing: -0.005em; padding-bottom: 0.06em; }
.cz-title--left { text-align: left; justify-self: start; }
.cz-text { font: 400 18px/1.62 var(--cz-body); text-wrap: pretty; }
.cz-text + .cz-text { margin-top: 12px; }
.cz-text--lead { font-size: 21px; line-height: 1.55; }
.cz-soft { color: var(--tx-soft); }
.cz-small { margin-top: 6px !important; font-size: 15px; line-height: 1.5; color: var(--tx-soft); text-wrap: pretty; }
.cz-hint { opacity: 0.5; font-style: italic; }
.cz-col { width: 100%; display: grid; justify-items: center; text-align: center; gap: 14px; }
.cz-link { display: inline-flex; align-items: center; min-height: 44px; font: 600 15px var(--cz-body); color: inherit; text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1px; }
.cz-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; padding: 0 30px; border: 0; border-radius: 1px; cursor: pointer; text-decoration: none; text-shadow: none;
  font: 500 13px var(--cz-body); letter-spacing: 0.24em; text-transform: uppercase; color: #fbf2e2;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0.18)), ${W("h")};
  box-shadow: inset 0 1px 0 rgba(255, 230, 200, 0.22), 0 2px 6px rgba(40, 16, 4, 0.3); }
.cz-btn--light { color: #2a170e; background: linear-gradient(180deg, #f8ecd6, #e8d2ad); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 6px 14px rgba(0, 0, 0, 0.45); }
.cz-btn--line { background: transparent; color: var(--tx, var(--cz-ink)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tx, var(--cz-ink)) 45%, transparent); }
.cz-btn--block { width: 100%; }
.cz-btn:disabled { opacity: 0.6; cursor: default; }
.cz-add { margin-top: 6px; }
.cz-adds { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 16px; }

.cz-invite { gap: 14px; max-width: 660px; }
.cz-parents { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 4px 18px; width: 100%; font: 400 17px/1.5 var(--cz-body); }
.cz-parents > div { display: contents; }
.cz-parents__and { font: italic 400 17px var(--cz-body); color: var(--tx-soft); }
.cz-line { font: italic 400 22px/1.45 var(--cz-body); text-wrap: balance; max-width: 30ch; }
.cz-when { font: italic 400 clamp(28px, 2.6cqw, 36px)/1.2 var(--cz-display); text-wrap: balance; }
.cz-at { font: 500 13px/1.6 var(--cz-body); letter-spacing: 0.22em; text-transform: uppercase; color: var(--tx-soft); text-wrap: balance; padding-left: 0.22em; }
.cz-count { display: flex; align-items: flex-start; justify-content: center; gap: 12px; margin: 6px 0 4px; }
.cz-count__cell { display: grid; justify-items: center; min-width: 52px; }
.cz-count__n { font: 400 34px/1 var(--cz-display); font-variant-numeric: lining-nums tabular-nums; }
.cz-count__l { margin-top: 6px; font: 500 11px var(--cz-body); letter-spacing: 0.2em; text-transform: uppercase; color: var(--tx-soft); padding-left: 0.2em; }
.cz-count__sep { font: 400 26px/1.1 var(--cz-display); color: var(--tx-soft); }
.cz-invite .cz-btn { margin-top: 8px; }

.cz-venues { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 6cqw, 96px); max-width: 860px; }
.cz-venues--one { grid-template-columns: 1fr; max-width: 520px; }
.cz-venue { display: grid; justify-items: center; align-content: start; gap: 8px; text-align: center; }
.cz-venue__name { margin-top: 6px !important; font: italic 400 clamp(30px, 2.8cqw, 40px)/1.1 var(--cz-display); text-wrap: balance; }
.cz-venue__addr { font: 400 17px/1.5 var(--cz-body); color: var(--tx-soft); text-wrap: balance; }
.cz-venue__time { font: 400 17px/1.5 var(--cz-body); }

.cz-story { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr); gap: clamp(28px, 5cqw, 76px); align-items: center; max-width: 960px; text-align: left; justify-items: stretch; margin-left: 6cqw; }
.cz-story--text { grid-template-columns: 1fr; max-width: 620px; }
.cz-story__photos { position: relative; aspect-ratio: 1 / 1.05; }
.cz-story__photos--1 { aspect-ratio: 4 / 5; }
.cz-frame { position: absolute; overflow: hidden; padding: 9px;
  background: linear-gradient(135deg, rgba(255, 230, 190, 0.22), rgba(0, 0, 0, 0.3)), linear-gradient(#b48a4c, #6e5226);
  box-shadow: inset 0 0 0 1px rgba(255, 240, 200, 0.4), inset 0 0 0 8px rgba(0, 0, 0, 0.12), 16px 22px 30px -8px rgba(0, 0, 0, 0.7), 2px 3px 5px rgba(0, 0, 0, 0.45); }
.cz-frame > img { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.3); }
.cz-frame--a { left: 0; top: 0; width: 64%; height: 84%; }
.cz-frame--b { right: 0; bottom: 0; width: 50%; height: 48%; }
.cz-story__photos--1 .cz-frame--a { width: 100%; height: 100%; }
.cz-story__text { display: grid; gap: 14px; }

.cz-ent { max-width: 920px; gap: 22px; }
.cz-ent__rows { display: grid; gap: 22px; width: 100%; }
.cz-ent__row { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 18px 26px; }
.cz-ent__row + .cz-ent__row { padding-top: 20px; border-top: 1px solid var(--cz-rule); }
.cz-cell { display: grid; align-content: start; justify-items: center; gap: 6px; }
.cz-cell__t { font: 500 12px/1.4 var(--cz-body); letter-spacing: 0.22em; text-transform: uppercase; color: var(--tx-accent); padding-left: 0.22em; text-wrap: balance; }
.cz-cell__names { list-style: none; padding: 0; display: grid; gap: 1px; font: 400 16.5px/1.42 var(--cz-body); }
.cz-cell__names--cols { grid-template-columns: 1fr 1fr; column-gap: 34px; }
.cz-ent__row--principal .cz-cell__names { font-size: 17px; }

.cz-day { max-width: 560px; gap: 10px; }
.cz-dayline { list-style: none; padding: 0; width: 100%; display: grid; margin-top: 4px !important; }
.cz-dayline li { display: grid; grid-template-columns: 100px minmax(0, 1fr); gap: 20px; align-items: baseline; padding: 12px 0; text-align: left; border-bottom: 1px solid rgba(60, 46, 36, 0.18); }
.cz-dayline li:last-child { border-bottom: 0; }
.cz-dayline__t { font: italic 400 21px var(--cz-display); text-align: right; white-space: nowrap; }
.cz-dayline__w { font: 400 18px/1.4 var(--cz-body); }
.cz-dayline__w em { display: block; margin-top: 2px; font-size: 15.5px; color: var(--tx-soft); }

/* the colours of the day in a small capiz window let into the stone: tinted shell, lit from behind */
.cz-tint { position: absolute; z-index: 1; right: 15%; top: 30%; width: min(300px, 24cqw); height: min(360px, 40%); --stile: 12px;
  box-shadow: 0 0 0 16px rgba(90, 82, 72, 0.92), 0 0 0 17px rgba(0, 0, 0, 0.5), 0 22px 30px rgba(0, 0, 0, 0.5); }
.cz-tint::before, .cz-tint::after { content: ""; position: absolute; inset: 0; z-index: 2; }
.cz-tint::before { background: linear-gradient(rgba(14, 16, 32, 0.3), rgba(14, 16, 32, 0.3)), ${W("h")};
  -webkit-mask: linear-gradient(#000 0 0) top / 100% var(--stile) no-repeat, linear-gradient(#000 0 0) bottom / 100% var(--stile) no-repeat;
  mask: linear-gradient(#000 0 0) top / 100% var(--stile) no-repeat, linear-gradient(#000 0 0) bottom / 100% var(--stile) no-repeat; }
.cz-tint::after { background: linear-gradient(90deg, rgba(190, 200, 240, 0.12), rgba(14, 16, 32, 0.3) 30%, rgba(6, 6, 12, 0.5)), ${W("v")};
  -webkit-mask: linear-gradient(#000 0 0) left / var(--stile) 100% no-repeat, linear-gradient(#000 0 0) right / var(--stile) 100% no-repeat;
  mask: linear-gradient(#000 0 0) left / var(--stile) 100% no-repeat, linear-gradient(#000 0 0) right / var(--stile) 100% no-repeat; }
.cz-tint__light { position: absolute; inset: var(--stile); }
.cz-tint__light::after { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse 70% 60% at 45% 40%, rgba(255, 248, 232, 0.5), rgba(255, 248, 232, 0.08) 70%, rgba(20, 16, 20, 0.25)); }
.cz-tint .cz-glass { opacity: 0.88; }
.cz-know__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 26px 40px; width: 100%; text-align: left; margin-top: 6px; }
.cz-item { display: grid; align-content: start; gap: 6px; }
.cz-item__q { font: italic 400 23px/1.25 var(--cz-display); text-wrap: balance; }
.cz-item__q a { color: inherit; text-underline-offset: 4px; }
.cz-item .cz-text { font-size: 17px; line-height: 1.55; }

.cz-gifts { max-width: 100%; gap: 14px; }
.cz-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.cz-gift { width: 100%; display: grid; gap: 12px; }
.cz-gift__btn { display: flex; justify-content: center; }

/* the reply */
.cz-rsvp { gap: 12px; }
.cz-rsvp .cz-title { font-size: clamp(36px, 3.4cqw, 48px); }
.cz-seats { font-style: italic; }
.cz-form { width: 100%; display: grid; gap: 16px; text-align: left; margin-top: 4px; }
.cz-form label { display: block; margin-bottom: 4px; font: 500 12px var(--cz-body); letter-spacing: 0.2em; text-transform: uppercase; color: var(--tx-soft); }
.cz-choice { display: grid; gap: 4px; }
.cz-choice__opt { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 52px; padding: 0 4px; border: 0; border-bottom: 1px solid rgba(60, 40, 24, 0.18); background: none; text-align: left; cursor: pointer;
  font: italic 400 21px var(--cz-body); color: var(--tx); }
.cz-choice__opt::before { content: ""; flex: none; width: 20px; height: 20px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--tx) 55%, transparent);
  background: radial-gradient(circle, var(--tx-accent) 0 5px, transparent 5.5px) center / 0 0 no-repeat; transition: background-size 0.25s cubic-bezier(.3, 1.4, .5, 1); }
.cz-choice__opt.is-picked { color: var(--tx-accent); }
.cz-choice__opt.is-picked::before { border-color: var(--tx-accent); background-size: 100% 100%; }
.cz-open { display: grid; gap: 16px; animation: cz-open 0.5s cubic-bezier(.2, .8, .2, 1) both; }
@keyframes cz-open { from { opacity: 0; transform: translateY(8px); } }
.cz-field { display: block; width: 100%; min-height: 48px; padding: 8px 2px; border: 0; border-bottom: 1px solid rgba(42, 29, 20, 0.38); border-radius: 0; background: transparent; font: 400 17px var(--cz-body); color: var(--tx); }
.cz-field:focus { outline: none; border-bottom-color: var(--tx-accent); box-shadow: 0 1px 0 var(--tx-accent); }
textarea.cz-field { resize: vertical; min-height: 84px; }
.cz-count-pick { display: flex; flex-wrap: wrap; gap: 8px; }
.cz-count-pick__n { width: 46px; height: 46px; border: 1px solid rgba(42, 29, 20, 0.22); border-radius: 50%; background: none; cursor: pointer; font: 400 19px var(--cz-body); color: var(--tx); }
.cz-count-pick__n.is-picked { border-color: var(--tx-accent); color: var(--tx-accent); box-shadow: inset 0 0 0 1px var(--tx-accent); }
.cz-form .cz-link { min-height: 36px; font-size: 14px; }
.cz-error { color: #9b1c1c; font-size: 15px; }
.cz-done { display: grid; justify-items: center; gap: 10px; }

/* ---- the builder: everything open, no stops */
.cz-editor .site-hidden { background: #1a120d; color: #efe6d6; }
/* ---- the gallery card: the first window only */
.cz-gallery { --frame: 75cqw; }
@media (prefers-reduced-motion: reduce) { .cz-root *, .cz-root *::before, .cz-root *::after { animation: none !important; transition: none !important; } }

/* ================================================================ a phone: one tall column, the house at its own scale */
@container (max-width: 700px) {
  .cz-root > * { --roof: 80px; --soffit: 32px; --post: 12px; --head: 22px; --sill: 20px; --eave: 136px; --stile: 9px; --vent: 96px; --beam: 86px; --step: 26px; --street: 190px;
    --win: calc(100cqw - var(--post) * 2); --room: calc(var(--frame) - var(--eave) - var(--head) - var(--sill)); }
  .cz-nb, .cz-edgewin { display: none; }
  .cz-eave__tiles { top: calc(100% - var(--soffit) - var(--roof)); }
  .cz-hero { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1.25fr) auto; }
  .cz-hero--words { grid-template-rows: 1fr; }
  .cz-hero__photo::after { box-shadow: inset 0 -30px 40px -30px rgba(40, 16, 4, 0.4); }
  .cz-hero__words { padding: 22px 20px 26px; gap: 10px; }
  .cz-names { font-size: var(--cz-name-m); }
  .cz-date { font-size: 17px; }
  .cz-town { font-size: 12px; letter-spacing: 0.2em; }
  .cz-face { padding: 56px 22px; }
  .cz-vent::before { height: 8px; }
  .cz-vent::after { height: 11px; }
  .cz-vent__room, .cz-vent__bal { top: 8px; bottom: 11px; }
  .cz-vent__panel { top: 8px; bottom: 11px; }
  .cz-planks { background-size: auto, auto, auto, var(--cz-wood-h-size, auto); }
  .cz-whisper { font-size: 17px; }
  .cz-title { font-size: 40px; }
  .cz-text { font-size: 17px; }
  .cz-text--lead { font-size: 19px; }
  .cz-parents { grid-template-columns: 1fr; gap: 2px; }
  .cz-parents__and { margin: 4px 0; }
  .cz-line { font-size: 20px; }
  .cz-when { font-size: 27px; }
  .cz-at { font-size: 12px; letter-spacing: 0.16em; padding-left: 0.16em; }
  .cz-count { gap: 6px; }
  .cz-count__cell { min-width: 46px; }
  .cz-count__n { font-size: 28px; }
  .cz-count__l { font-size: 10px; letter-spacing: 0.14em; }
  .cz-count__sep { font-size: 22px; }
  .cz-part--venues .cz-face { padding-top: 190px; }
  .cz-lampspot--venues { width: 112px; left: calc(50% - 20px); }
  .cz-glow { width: 380px; height: 380px; }
  .cz-venues { grid-template-columns: 1fr; gap: 30px; }
  .cz-venue__name { font-size: 30px; }
  .cz-lampspot--story { left: auto; right: 10%; width: 62px; }
  .cz-boards { background-position: 0 0, 0 0, 0 0, 0 0; }
  .cz-part--story .cz-face { padding-top: 120px; }
  .cz-story { grid-template-columns: 1fr; gap: 26px; margin-left: 0; }
  .cz-story__photos { aspect-ratio: 1 / 0.88; width: 100%; }
  .cz-story__photos--1 { aspect-ratio: 4 / 3; }
  .cz-calado { height: 72px; }
  .cz-plaster--ent { padding-top: 30px; padding-bottom: 30px; }
  .cz-ent { gap: 14px; }
  .cz-ent__rows { gap: 14px; }
  .cz-ent__row + .cz-ent__row { padding-top: 14px; }
  .cz-ent .cz-title { font-size: 36px; }
  .cz-ent__row { grid-template-columns: repeat(min(var(--n), 2), minmax(0, 1fr)); gap: 16px 14px; }
  .cz-ent__row--principal { grid-template-columns: 1fr; }
  .cz-cell__names--cols { grid-template-columns: 1fr; }
  .cz-cell__names { font-size: 15px; line-height: 1.36; }
  .cz-cell__t { font-size: 11px; letter-spacing: 0.16em; padding-left: 0.16em; }
  .cz-beamline__beam { height: 28px; }
  .cz-beamline__corbels { top: 28px; height: 56px; }
  .cz-plaque { padding: 34px 22px 30px; }
  .cz-dayline li { grid-template-columns: 76px minmax(0, 1fr); gap: 14px; }
  .cz-dayline__t { font-size: 18px; }
  .cz-dayline__w { font-size: 16.5px; }
  .cz-stone--flora { padding-top: 250px; align-content: start; }
  .cz-tint { position: relative; right: auto; top: auto; justify-self: center; width: min(250px, 70%); height: 220px; margin-top: 40px; --stile: 9px; box-shadow: 0 0 0 12px rgba(90, 82, 72, 0.92), 0 0 0 13px rgba(0, 0, 0, 0.5), 0 18px 24px rgba(0, 0, 0, 0.5); }
  .cz-flora { --fw: 390px; --fh: 380px; right: -30px; }
  .cz-flora--b { display: none; }
  .cz-attire { margin-left: 0; }
  .cz-niches { grid-template-columns: 1fr 1fr; grid-auto-rows: 158px; gap: 14px; }
  .cz-niche { padding: 7px; }
  .cz-niche.is-wide-d { grid-column: auto; }
  .cz-niche.is-wide-m { grid-column: span 2; }
  .cz-stone--door { padding-top: 0; align-content: start; }
  .cz-zaguan { position: relative; right: auto; align-self: start; justify-self: center; width: 58%; height: 224px; margin: 34px 0 34px; box-shadow: 0 0 0 16px rgba(90, 82, 72, 0.92), 0 0 0 17px rgba(0, 0, 0, 0.5), inset 0 10px 14px rgba(0, 0, 0, 0.6); }
  .cz-zaguan__leaf { gap: 8px; padding: 10px 8px; }
  .cz-hinge { height: 9px; }
  .cz-knocker { width: 20px; height: 20px; margin-top: -10px; left: 6px; border-width: 2px; }
  .cz-stone--door { --px: 50%; --py: 22%; }
  .cz-know { max-width: 100%; }
  .cz-lampspot--door { display: none; }
  .cz-know__grid { grid-template-columns: 1fr; gap: 22px; }
  .cz-item__q { font-size: 21px; }
  .cz-face.cz-stone--open { padding: 56px 14px 0; }
  .cz-arch { --aw: calc(100cqw - 56px); --ring: 20px; min-height: calc(var(--frame) * 0.78); padding: calc(var(--aw) * 0.36) 15% 40px; }
  .cz-arch__leaf { width: 12%; }
  .cz-arch .cz-btn { padding: 0 16px; letter-spacing: 0.12em; }
  .cz-card { width: calc(100% - 46px); margin: 0 0 -4px auto; padding: 30px 22px 28px; rotate: -0.5deg; }
  .cz-face.cz-stone--plinth { padding: 150px 16px 0; }
  .cz-lamppost { left: -10px; width: 74px; height: min(460px, calc(var(--frame) * 0.62)); }
  .cz-glow--post { width: 420px; height: 420px; }
  .cz-closing { font-size: 32px; }
  .cz-btn { letter-spacing: 0.18em; }
}
`;
