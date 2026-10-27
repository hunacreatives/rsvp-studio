// Poolside: a resort pool seen from above, the whole page long. Sizes follow the page's own
// width (container units), never the window's. Anything that moves only moves by transform,
// on its own layer (will-change), so its shadow is drawn once and the motion stays smooth.
export const POOLSIDE_CSS = `
.ps-root { --pool: min(780px, calc(100cqw - 64px)); --top: 150px; --foot: var(--ps-end, 600px); --cope: 26px;
  --ink: #0e3555; --coral: #e8483a; --deck-ink: #5d4a42;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: var(--ink);
  font-family: var(--ps-sans); -webkit-font-smoothing: antialiased; background: #6fc7d6; }
.ps-root *, .ps-root *::before, .ps-root *::after { box-sizing: border-box; }
.ps-root p, .ps-root h1, .ps-root h2, .ps-root h3 { margin: 0; }
.ps-water-gl { position: sticky; top: 0; display: block; width: 100%; height: 100svh; margin-bottom: -100svh; z-index: 0; pointer-events: none; }
.ps-hint { opacity: 0.6; font-style: italic; }

/* the deck: warm peach tiles, white grout, sunlit at one corner; the pool cut out of it */
.ps-deck { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.75) 2px, transparent 2px) 0 0 / 54px 54px,
    linear-gradient(0deg, rgba(255,255,255,0.75) 2px, transparent 2px) 0 0 / 54px 54px,
    radial-gradient(120% 40% at 20% 0%, #ffd9bf 0%, transparent 60%),
    linear-gradient(160deg, #f9c3a8 0%, #f4ab93 45%, #ee9c8a 100%);
  -webkit-mask: linear-gradient(#000 0 0), linear-gradient(#000 0 0) 50% var(--top) / var(--pool) calc(100% - var(--top) - var(--foot)) no-repeat;
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0), linear-gradient(#000 0 0) 50% var(--top) / var(--pool) calc(100% - var(--top) - var(--foot)) no-repeat;
  mask-composite: exclude; }
.ps-rim { position: absolute; z-index: 1; pointer-events: none; top: var(--top); bottom: var(--foot); left: calc(50% - var(--pool) / 2); width: var(--pool); box-shadow: inset 0 0 26px rgba(0, 50, 90, 0.3), inset 0 0 5px rgba(0, 50, 90, 0.26); }
.ps-cope { position: absolute; z-index: 3; pointer-events: none; top: calc(var(--top) - var(--cope) / 2); bottom: calc(var(--foot) - var(--cope) / 2); left: calc(50% - var(--pool) / 2 - var(--cope) / 2); width: calc(var(--pool) + var(--cope));
  border: var(--cope) solid #fbeee3; border-radius: 30px;
  box-shadow: inset 0 0 0 1px rgba(160, 110, 80, 0.15), 0 0 0 1px rgba(160, 110, 80, 0.15), 0 6px 14px rgba(140, 70, 40, 0.18), inset 0 6px 10px rgba(0, 50, 90, 0.16); }
.ps-cope::before { content: ""; position: absolute; inset: calc(var(--cope) * -1); border-radius: 30px; pointer-events: none; padding: var(--cope);
  background: repeating-linear-gradient(90deg, transparent 0 72px, rgba(170, 120, 90, 0.22) 72px 74px), repeating-linear-gradient(0deg, transparent 0 72px, rgba(170, 120, 90, 0.22) 72px 74px);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }

/* props */
.ps-p { position: absolute; display: block; z-index: 2; pointer-events: none; filter: drop-shadow(8px 12px 8px rgba(120, 50, 30, 0.26)); }
.ps-p svg { display: block; width: 100%; height: auto; overflow: visible; }
.ps-p--in { filter: drop-shadow(10px 18px 10px rgba(0, 60, 80, 0.16)); transform: rotate(var(--r, 0deg)); }
.ps-p--leaf { z-index: 6; filter: drop-shadow(14px 20px 14px rgba(20, 40, 20, 0.3)); rotate: var(--r, 0deg); transform-origin: 0 50%; }
.ps-motion .ps-p--in { will-change: transform; animation: ps-drift 12s ease-in-out infinite; }
.ps-motion .ps-p--leaf { will-change: transform; animation: ps-sway 9s ease-in-out infinite; }
@keyframes ps-drift { 0%, 100% { transform: translate(0, 0) rotate(var(--r, 0deg)); } 50% { transform: translate(-8px, 7px) rotate(calc(var(--r, 0deg) + 10deg)); } }
@keyframes ps-sway { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(2.5deg); } }

/* what's written on the water */
.ps-water { position: relative; z-index: 4; width: var(--pool); margin: 0 auto; padding: calc(var(--top) + 90px) 40px 120px; text-align: center; }
.ps-water section { position: relative; }
.ps-sec { padding-top: 190px; }
.ps-k { font: 600 14px var(--ps-sans); letter-spacing: 0.32em; text-transform: uppercase; text-wrap: balance; }
.ps-name, .ps-h2 { font-family: var(--ps-display); font-weight: 400; text-shadow: 8px 16px 12px rgba(0, 70, 90, 0.22); }
.ps-name { font-size: clamp(84px, 17cqw, 196px); line-height: 0.9; margin-top: 20px !important; letter-spacing: -0.01em; text-wrap: balance; }
.ps-turns { font-family: var(--ps-display); font-style: italic; font-size: clamp(30px, 4.4cqw, 48px); margin-top: 6px !important; color: var(--coral); text-shadow: 6px 12px 10px rgba(0, 70, 90, 0.18); }
.ps-when { font: 500 18px var(--ps-sans); letter-spacing: 0.06em; margin-top: 24px !important; text-wrap: balance; }
.ps-when span { white-space: nowrap; }
.ps-btn { display: inline-flex; align-items: center; gap: 12px; margin-top: 30px; min-height: 50px; padding: 0 28px; border: 0; border-radius: 999px; background: var(--ink); color: #fff; font: 600 12px var(--ps-sans); letter-spacing: 0.24em; text-transform: uppercase; text-decoration: none; box-shadow: 6px 12px 18px rgba(0, 40, 80, 0.24); cursor: pointer; }
.ps-btn i { width: 18px; height: 2px; background: #ff8a7d; }
.ps-btn--line { background: rgba(255,255,255,0.85); color: var(--ink); box-shadow: none; }
.ps-h2 { font-size: clamp(44px, 7cqw, 76px); line-height: 1; margin-top: 16px !important; text-wrap: balance; }
.ps-addr { font: 500 17px var(--ps-sans); margin-top: 12px !important; }
.ps-legs { max-width: 520px; margin: 26px auto 0; text-align: left; }
.ps-legs > div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 16px; align-items: baseline; padding: 11px 0; border-top: 1px solid rgba(14, 53, 85, 0.22); }
.ps-legs b { font-family: var(--ps-display); font-weight: 400; font-size: 28px; white-space: nowrap; }
.ps-legs span { font: 500 18px var(--ps-sans); line-height: 1.4; }
.ps-legs em { display: block; font-style: normal; font-weight: 400; font-size: 15.5px; margin-top: 2px; }
.ps-note { font-family: var(--ps-display); font-size: clamp(26px, 3.4cqw, 36px); line-height: 1.3; max-width: 22ch; margin: 18px auto 0 !important; text-shadow: 6px 12px 10px rgba(0, 70, 90, 0.18); text-wrap: balance; }
.ps-faq { max-width: 560px; margin: 0 auto; text-align: left; padding: 16px 0; border-top: 1px solid rgba(14, 53, 85, 0.22); }
.ps-faq:first-of-type { margin-top: 20px; }
.ps-faq b { display: block; font: 600 18px var(--ps-sans); }
.ps-faq span { display: block; font: 500 16.5px var(--ps-sans); line-height: 1.5; margin-top: 4px; }
.ps-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 20px; }
.ps-gifts { max-width: 520px; margin: 20px auto 0; text-align: left; }

/* floats in the water, in the gaps between sections */
.ps-f1 { width: 104px; right: 18px; top: -64px; --r: 10deg; }
.ps-f2 { width: 78px; left: -4px; top: 150px; animation-duration: 10s !important; }
.ps-fm { width: 96px; left: 7%; top: 0; --r: 90deg; animation-duration: 15s !important; }
.ps-fr { width: 92px; right: -8px; top: 40px; --r: -30deg; animation-duration: 14s !important; }
.ps-fb { width: 62px; right: 10%; top: 60px; animation-duration: 11s !important; }

/* the far deck: the reply, on a big beach towel */
.ps-end { position: relative; z-index: 4; display: grid; place-items: center; padding: 90px 20px 90px; }
.ps-towel { position: relative; width: min(600px, 100%); text-align: center; padding: 70px 48px 56px; border-radius: 6px; color: var(--ink);
  background:
    repeating-linear-gradient(90deg, rgba(255,255,255,0) 0 3px, rgba(200,170,150,0.06) 3px 4px),
    linear-gradient(180deg, #ff7a6b 0 22px, #fffaf3 22px 30px, #ff7a6b 30px 38px, transparent 38px calc(100% - 38px), #ff7a6b calc(100% - 38px) calc(100% - 30px), #fffaf3 calc(100% - 30px) calc(100% - 22px), #ff7a6b calc(100% - 22px)),
    #fffaf3;
  box-shadow: 10px 16px 20px rgba(140, 60, 40, 0.28), 0 0 0 1px rgba(160, 110, 80, 0.12); }
.ps-towel::before, .ps-towel::after { content: ""; position: absolute; left: 6px; right: 6px; height: 10px; background: repeating-linear-gradient(90deg, #ff7a6b 0 3px, transparent 3px 7px); }
.ps-towel::before { top: -9px; } .ps-towel::after { bottom: -9px; }
.ps-towel .ps-k { font-size: 12px; letter-spacing: 0.3em; color: #c2412f; }
.ps-towel h2 { font-family: var(--ps-display); font-weight: 400; font-size: 46px; line-height: 1.05; margin-top: 10px !important; text-wrap: balance; }
.ps-towel .ps-small { font-size: 14px; line-height: 1.5; color: var(--deck-ink); margin-top: 10px !important; }
.ps-form { text-align: left; }
.ps-form label { display: block; font: 600 11px var(--ps-sans); letter-spacing: 0.2em; text-transform: uppercase; color: var(--deck-ink); margin-top: 22px; }
.ps-field { display: block; width: 100%; font: 17px var(--ps-sans); padding: 14px 16px; border: 0; border-radius: 12px; background: #fff; color: var(--ink); margin-top: 8px; box-shadow: inset 0 0 0 1.5px rgba(14, 53, 85, 0.18); letter-spacing: 0; text-transform: none; }
textarea.ps-field { resize: vertical; min-height: 90px; }
.ps-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
.ps-pill { min-height: 50px; padding: 0 8px; border: 0; border-radius: 999px; font: 15px var(--ps-sans); background: #fff; color: var(--ink); box-shadow: inset 0 0 0 1.5px rgba(14, 53, 85, 0.25); cursor: pointer; }
.ps-pill.is-on { background: var(--ink); color: #fff; box-shadow: none; }
.ps-seats { display: flex; align-items: center; justify-content: space-between; margin-top: 22px; font: 600 11px var(--ps-sans); letter-spacing: 0.2em; text-transform: uppercase; color: var(--deck-ink); }
.ps-seats__ctrl { display: inline-flex; align-items: center; gap: 14px; font-size: 18px; color: var(--ink); letter-spacing: 0; }
.ps-seats__ctrl button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: #fff; box-shadow: inset 0 0 0 1.5px rgba(14, 53, 85, 0.25); font-size: 20px; color: var(--ink); cursor: pointer; }
.ps-seats__ctrl button:disabled { opacity: 0.4; }
.ps-link { display: inline-block; margin-top: 8px; padding: 6px 0; border: 0; background: none; color: var(--deck-ink); font: 13px var(--ps-sans); text-decoration: underline; cursor: pointer; }
.ps-error { color: #b3261e; font-size: 14px; margin-top: 14px !important; }
.ps-send { margin-top: 24px; width: 100%; min-height: 54px; border: 0; border-radius: 999px; background: #ff6b5e; color: #fff; font: 600 12px var(--ps-sans); letter-spacing: 0.26em; text-transform: uppercase; box-shadow: 0 10px 18px rgba(200, 70, 50, 0.3); cursor: pointer; }
.ps-send:disabled { opacity: 0.7; cursor: default; }
.ps-maker { margin-top: 26px !important; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--deck-ink); }
.ps-maker a, .ps-maker b { color: var(--ink); font-weight: 600; }

.ps-gallery .ps-water { padding-top: calc(var(--top) + 60px); }

@container (max-width: 1000px) { .ps-wide { display: none; } }
@container (max-width: 700px) {
  .ps-root { --top: 110px; --cope: 18px; }
  .ps-end { padding: 70px 16px 70px; }
  .ps-water { padding: calc(var(--top) + 60px) 18px 90px; }
  .ps-sec { padding-top: 160px; }
  .ps-legs > div { grid-template-columns: 80px minmax(0, 1fr); gap: 12px; }
  .ps-legs b { font-size: 22px; } .ps-legs span { font-size: 16px; }
  .ps-towel { padding: 60px 22px 48px; }
  .ps-towel h2 { font-size: 38px; }
  .ps-f1 { width: 70px; right: 2px; top: -120px; }
  .ps-f2 { width: 50px; left: 4px; top: auto; bottom: -96px; }
  .ps-fm { width: 58px; left: auto; right: 6%; top: 18px; --r: -70deg; }
  .ps-fr { width: 62px; right: auto; left: 2px; top: 34px; }
  .ps-fb { width: 46px; right: 12%; top: 30px; }
}
@media (prefers-reduced-motion: reduce) { .ps-root *, .ps-root *::before { animation: none !important; } }
`;
