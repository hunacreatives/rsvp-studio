// Flat Lay: one terracotta court seen from straight above in a low morning sun, the whole page
// long. Every word is ON the court (court-line paint, marker on a coaching board, painted IN/OUT
// boxes). Sizes follow the page's own width (container units), never the window's, so the
// builder's scaled preview and the phone preview lay out like the real thing. Nothing is fixed
// to the window: things in the air (balloons, the net tape) are placed on the court itself from
// a camera 6 m up (court.ts).
const A = "/event-templates/flatlay";

export const FLATLAY_CSS = `
.fl-root { position: relative; container-type: inline-size; overflow: clip; isolation: isolate; background: #b4573b; color: #fff;
  font-family: var(--fl-sans); line-height: normal; -webkit-font-smoothing: antialiased; text-wrap: pretty; }
.fl-root *, .fl-root *::before, .fl-root *::after { box-sizing: border-box; }
:where(.fl-root) :where(p, h1, h2, h3, ol) { margin: 0; }
:where(.fl-root) ol { padding: 0; }
.fl-root img { display: block; max-width: none; }

/* --m: px per metre (about 2.2 m of court across a computer, 1.15 m across a phone) */
.fl-court { --m: calc(100cqw / 2.2); --cl: calc(var(--m) * 0.5); --col: calc(var(--cl) + var(--m) * 0.2);
  position: relative; overflow: clip; }
@container (max-width: 720px) {
  .fl-court { --m: calc(100cqw / 1.15); --cl: calc(var(--m) * 0.05); --col: calc(var(--cl) + 22px); }
}
.fl-surface { position: absolute; inset: 0; background: url(${A}/tile-court.webp) 0 0 / var(--m) var(--m); }
.fl-runoff { position: absolute; left: 0; right: 0; top: 0; height: 0; background: url(${A}/tile-out.webp) 0 0 / var(--m) var(--m); }
.fl-line { position: absolute; background: url(${A}/tile-line.webp) 0 0 / var(--m) var(--m); }
.fl-hline { left: 0; right: 0; top: -100px; height: calc(var(--m) * 0.05); }
.fl-vline { width: calc(var(--m) * 0.05); left: calc(var(--cl) - var(--m) * 0.025); top: 0; height: 0; }
.fl-netshadow { position: absolute; left: 0; right: 0; top: 0; height: 0; z-index: 3; pointer-events: none; }
.fl-netshadow.is-near { background: url(${A}/net-shadow.webp) 0 0 / var(--m) auto repeat-x; }

/* court-line paint: the line tile clipped to the letters (static text only: nothing that moves
   every frame uses it) */
.fl-paint { color: #f5eee2; background: url(${A}/tile-line.webp) 0 0 / 600px 600px;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
/* serif descenders reach below the box that background-clip paints: room for them, given back */
.fl-stencil { padding: 0.06em 0 0.2em; margin-bottom: -0.2em; font-family: var(--fl-display); font-variation-settings: "SOFT" 100, "opsz" 144;
  font-weight: 600; line-height: 0.9; letter-spacing: -0.01em; overflow-wrap: break-word; }
.fl-paint.is-wet { filter: brightness(1.25) drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.6)); }
.fl-paint.is-drying { transition: filter 1.4s ease; will-change: filter; }
/* the opening: one lane of a word, a window sliding open over a copy of it (court.ts intro) */
.fl-lane { position: absolute; z-index: 3; overflow: hidden; pointer-events: none; will-change: transform; }
.fl-lane > * { will-change: transform; }

.fl-stop { position: relative; min-height: 100svh; z-index: 2; }
.fl-stop[data-stop="rsvp"] { padding-bottom: 64px; }
.fl-words { position: relative; z-index: 2; margin-left: var(--col); width: min(1200px, calc(100cqw - var(--col) - 28px)); padding: 15svh 0 10svh; }
.fl-kicker { font-weight: 500; letter-spacing: 0.36em; font-size: clamp(12px, 1.3cqw, 20px); text-transform: uppercase; }
.fl-name { font-size: min(clamp(116px, 20cqw, 380px), var(--fit-d)); margin-top: 0.02em; text-wrap: balance; }
.fl-turns { display: block; padding: 0 0 0.22em; margin: 0.12em 0 -0.22em; font-family: var(--fl-display); font-variation-settings: "SOFT" 100, "opsz" 144;
  font-size: clamp(34px, 6cqw, 114px); line-height: 0.9; font-style: italic; font-weight: 400; letter-spacing: 0; }
.fl-facts { margin-top: 1.5em; font-weight: 500; font-size: clamp(15px, 1.95cqw, 30px); line-height: 1.55; letter-spacing: 0.05em; text-transform: uppercase; }
.fl-facts span { white-space: nowrap; }
.fl-links { margin-top: 14px; transition: opacity 0.8s ease; }
.fl-intro .fl-links { opacity: 0; }
.fl-links a { color: #f5eee2 !important; }
.fl-h2 { font-size: clamp(54px, 6.6cqw, 112px); text-wrap: balance; }
.fl-body { margin-top: 0.7em; font-weight: 500; font-size: clamp(17px, 1.55cqw, 23px); line-height: 1.5; max-width: 26em; white-space: pre-line; }
.fl-body + .fl-body { margin-top: 0.6em; }

.fl-prop { position: absolute; z-index: 1; pointer-events: none; }
.fl-prop img { width: 100%; height: auto; }
.fl-mprops { display: none; position: relative; margin: 4px 0 0 var(--col); width: calc(100cqw - var(--col)); pointer-events: none; z-index: 1; }
.fl-mprops img { position: absolute; height: auto; }

/* the ground (moving shadows) and the air (balloons, the net tape), both laid on the court */
.fl-ground, .fl-air { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
.fl-ground { z-index: 1; }
.fl-air { z-index: 6; }
.fl-ground img, .fl-air img, .fl-str { position: absolute; left: 0; top: 0; transform-origin: 0 0; visibility: hidden; }
.fl-motion .fl-ground img, .fl-motion .fl-air img, .fl-motion .fl-str, .fl-motion .fl-tape { will-change: transform; }
.fl-ground img { opacity: 0.5; -webkit-mask: radial-gradient(closest-side, #000 70%, transparent); mask: radial-gradient(closest-side, #000 70%, transparent); }
.fl-str { width: 1.3px; height: 100px; background: rgba(255, 255, 255, 0.85); }
.fl-ground .fl-str { width: 1.5px; background: rgba(0, 10, 30, 0.28); }
.fl-tape { position: absolute; left: 0; top: 0; z-index: 6; pointer-events: none; transform-origin: 0 0; background: url(${A}/net-top.webp) 0 0 / var(--m) 100% repeat-x; visibility: hidden; }

/* the coaching board (9-sliced), the schedule in marker */
.fl-board { position: relative; width: min(calc(var(--m) * 0.74), calc(100cqw - var(--col) - 18px)); margin-top: 8px;
  border-style: solid; border-color: transparent; border-width: calc(var(--m) * 0.2) calc(var(--m) * 0.045) calc(var(--m) * 0.05);
  border-image: url(${A}/board.webp) 43% 12% 10% fill / calc(var(--m) * 0.2) calc(var(--m) * 0.045) calc(var(--m) * 0.05) stretch;
  padding: 10px 6px 14px; color: #6b2f1d; font-family: "Caveat", cursive; }
.fl-board h3 { font-size: clamp(34px, 3.3cqw, 52px); font-weight: 700; line-height: 1; overflow-wrap: break-word; }
.fl-board ol { list-style: none; margin-top: 10px; }
.fl-board li { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 12px; align-items: baseline; font-size: clamp(23px, 2.1cqw, 32px);
  font-weight: 600; line-height: 1.22; padding: 4px 0 4px 26px; position: relative; overflow-wrap: break-word; }
.fl-board li b { font-weight: 700; color: #b4573b; min-width: 2.6em; }
.fl-board li em { display: block; font-style: normal; font-weight: 600; font-size: 0.74em; opacity: 0.75; line-height: 1.15; }
.fl-board li::before { content: ""; position: absolute; left: -3px; top: 0.3em; width: 26px; height: 26px; background: var(--mag) 30% 30% / contain no-repeat; }
.fl-board .fl-marker { position: absolute; right: -9%; bottom: -16%; width: calc(var(--m) * 0.2); }
.fl-board .site-add { font-family: var(--fl-sans); }

/* the reply: painted IN / OUT boxes and lines to write on */
.fl-form { margin-top: 1.2em; display: grid; gap: 20px; max-width: 560px; position: relative; }
.fl-field { display: grid; gap: 4px; }
.fl-lab, .fl-form label { font-weight: 600; font-size: 13px; letter-spacing: 0.26em; text-transform: uppercase; color: #f5eee2; }
.fl-input, .fl-form input:not([type=checkbox]):not([type=radio]), .fl-form select, .fl-form textarea { width: 100%; background: transparent; border: 0; border-bottom: 6px solid #efe6d6;
  border-image: url(${A}/tile-line.webp) 40 stretch; border-radius: 0; color: #fff; font: 500 clamp(19px, 1.7cqw, 26px) var(--fl-sans); padding: 8px 2px; outline: none; resize: none; letter-spacing: 0; text-transform: none; }
.fl-form select option { color: #222; }
.fl-form ::placeholder { color: rgba(255, 255, 255, 0.42); }
.fl-form input:focus-visible, .fl-form textarea:focus-visible, .fl-form select:focus-visible { background: rgba(255, 255, 255, 0.07); }
.fl-boxes { display: grid; grid-template-columns: 1fr 1fr; height: clamp(130px, 13cqw, 200px); }
.fl-box { position: relative; background: none; border: 0; cursor: pointer; color: inherit; padding: 0; transition: opacity 0.25s; }
.fl-box::before { content: ""; position: absolute; inset: 0; border: 7px solid #efe6d6; border-image: url(${A}/tile-line.webp) 40 stretch; }
.fl-box + .fl-box::before { border-left-width: 0; }
.fl-box b { display: inline-block; padding: 0.05em 0.1em 0.18em; font: italic 500 clamp(46px, 5.4cqw, 84px)/1 var(--fl-display); font-variation-settings: "SOFT" 100; }
.fl-boxes.is-chosen .fl-box[aria-pressed="false"] { opacity: 0.45; }
.fl-box[aria-pressed="true"]::after { content: ""; position: absolute; inset: 7px; background: url(${A}/tile-line.webp) 0 0 / 600px 600px; opacity: 0.2; }
.fl-box[aria-pressed="true"] b { text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 0.18em; }
.fl-box:focus-visible { outline: 2px dashed #f5eee2; outline-offset: 4px; }
.fl-seats { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.fl-seats__ctrl { display: inline-flex; align-items: center; gap: 18px; }
.fl-seats button { width: 46px; height: 46px; border-radius: 999px; border: 3px solid #efe6d6; background: transparent; color: #fff; font: 500 24px/1 var(--fl-sans); cursor: pointer; }
.fl-seats button:disabled { opacity: 0.35; cursor: default; }
.fl-seats output { font: 600 30px var(--fl-display); min-width: 1.2em; text-align: center; }
.fl-send { justify-self: start; font: 600 15px var(--fl-sans); letter-spacing: 0.2em; text-transform: uppercase; color: #8a3f28; background: #f5eee2; border: 0;
  border-radius: 999px; padding: 15px 28px; cursor: pointer; box-shadow: 6px 9px 14px rgba(0, 0, 0, 0.25); }
.fl-send:disabled { cursor: default; opacity: 0.85; }
.fl-small { font-size: 14px; line-height: 1.5; color: rgba(255, 255, 255, 0.85); }
.fl-error { font-size: 15px; font-weight: 600; color: #fff; background: rgba(60, 10, 0, 0.35); padding: 8px 12px; border-radius: 6px; }
.fl-again { margin-top: 22px; background: none; border: 0; padding: 0; color: #f5eee2; font: 600 13px var(--fl-sans); letter-spacing: 0.22em; text-transform: uppercase; text-decoration: underline; text-underline-offset: 5px; cursor: pointer; }
.fl-thanks { font-size: clamp(56px, 8cqw, 130px); }

.fl-ball, .fl-bshadow { position: absolute; left: 0; top: 0; z-index: 4; pointer-events: none; visibility: hidden; }
.fl-ball { width: calc(var(--m) * 0.098); height: calc(var(--m) * 0.098); background-size: 100% 100%; transform-origin: 50% 50%; }
.fl-bshadow { transform-origin: 0 0; }
.fl-bshadow img { width: 100%; height: auto; }
.fl-ball.is-on, .fl-bshadow.is-on { visibility: visible; }
.fl-motion .fl-ball, .fl-motion .fl-bshadow { will-change: transform; }

.fl-player { position: absolute; left: 0; top: 0; z-index: 4; pointer-events: none; opacity: 0.72; height: auto; transform-origin: 0 0; }
.fl-robot { position: absolute; left: 0; top: 0; z-index: 4; pointer-events: none; will-change: transform; }

.fl-shade { position: absolute; left: 0; top: 0; z-index: 5; pointer-events: none; opacity: 0.55; mix-blend-mode: multiply;
  -webkit-mask: radial-gradient(closest-side, #000 62%, transparent); mask: radial-gradient(closest-side, #000 62%, transparent); }
.fl-shade img { width: 100%; height: auto; transform-origin: 30% 20%; }
.fl-motion .fl-shade img { animation: fl-sway 9s ease-in-out infinite alternate; }
@keyframes fl-sway { from { transform: rotate(-1.4deg); } to { transform: rotate(1.6deg) translate(1%, 0.6%); } }

.fl-roller { position: absolute; width: 0; height: 0; z-index: 1; pointer-events: none; visibility: hidden; }
.fl-roller.is-on { visibility: visible; }
.fl-roller .fl-rb { position: absolute; left: 0; top: 0; background-size: 100% 100%; }
.fl-roller .fl-rs { position: absolute; left: 0; top: 0; }
.fl-motion .fl-roller .fl-rb, .fl-motion .fl-roller .fl-rs { will-change: transform; }

/* the opening: the words stay hidden until the line painter has painted them */
.fl-intro [data-fl-paint] { clip-path: inset(0 0 100% 0); }

.fl-credit { position: relative; z-index: 2; text-align: center; font-size: 12px; letter-spacing: 0.08em; padding: 24px 16px 6px; color: rgba(255, 255, 255, 0.75); }
.fl-credit a { color: inherit; }
.fl-hidden { position: relative; z-index: 2; background: rgba(255, 255, 255, 0.92); }
.fl-root .site-add { color: #6b2f1d; }

.fl-gallery .fl-stop { min-height: 75cqw; }
.fl-gallery .fl-words { padding-top: 9cqw; }

.fl-m { display: none !important; }
@container (max-width: 720px) {
  .fl-d { display: none !important; }
  .fl-m { display: block !important; }
  .fl-mprops { display: block; }
  /* one stop per screen: the words and their props, centred */
  .fl-stop { display: flex; flex-direction: column; justify-content: center; }
  .fl-words { padding: 10svh 0 2svh; }
  .fl-board { width: calc(100cqw - var(--col) - 14px); }
  .fl-kicker { font-size: 13px; letter-spacing: 0.3em; }
  .fl-name { font-size: min(34cqw, var(--fit-p)); }
  .fl-turns { font-size: 10.2cqw; }
  .fl-facts { font-size: 17px; line-height: 1.6; }
  .fl-h2 { font-size: 12.6cqw; }
  .fl-body { font-size: 19.5px; line-height: 1.55; }
  .fl-board h3 { font-size: 40px; }
  .fl-board li { font-size: 22.5px; gap: 10px; }
  .fl-lab, .fl-form label { font-size: 14px; }
  .fl-input, .fl-form input:not([type=checkbox]):not([type=radio]), .fl-form select, .fl-form textarea { font-size: 21px; }
  .fl-box b { font-size: 60px; }
  .fl-send { font-size: 16px; padding: 16px 30px; }
  .fl-credit { font-size: 13px; }
  .fl-gallery .fl-stop { min-height: 133cqw; }
}
@media (prefers-reduced-motion: reduce) { .fl-shade img { animation: none !important; } }
`;
