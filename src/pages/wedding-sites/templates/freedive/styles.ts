// The Blue: a level camera at the waterline, then down the dive line to the bottom plate.
// Sizes follow the page's own width (container units), never the window's; nothing is fixed to
// the window (the depth gauge, the bubbles and the lens droplets are sticky inside the page).
export const FREEDIVE_CSS = `
.fd-root { --surf: 58%; --sf: 0.58; --line-x: 26%; --ink: #0b2a40;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: #fff;
  font-family: var(--fd-sans); -webkit-font-smoothing: antialiased; background: #0b4a72; }
.fd-root *, .fd-root *::before, .fd-root *::after { box-sizing: border-box; }
.fd-root p, .fd-root h1, .fd-root h2, .fd-root h3 { margin: 0; }
.fd-gl, .fd-overlay { position: sticky; top: 0; display: block; width: 100%; height: 100svh; margin-bottom: -100svh; pointer-events: none; }
.fd-gl { z-index: 0; }
.fd-overlay { z-index: 8; overflow: hidden; }
.fd-world { position: relative; z-index: 1; }
.fd-k { font: 600 12px var(--fd-sans); letter-spacing: 0.3em; text-transform: uppercase; }
.fd-hint { opacity: 0.6; font-style: italic; }

/* the surface: sky above, sea below, the camera level with the water */
.fd-surface { position: relative; height: 100svh; }
.fd-waterline { position: absolute; left: 0; right: 0; top: var(--surf); height: 0; }
.fd-sky { position: absolute; left: 0; width: 56%; top: 0; height: var(--surf); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 24px 4svh; text-shadow: 0 2px 16px rgba(0, 40, 90, 0.35); z-index: 3; }
.fd-sky h1 { font-family: var(--fd-display); font-weight: 400; font-size: clamp(84px, 15cqw, 210px); line-height: 0.85; margin-top: 14px !important; letter-spacing: -0.01em; text-wrap: balance; }
.fd-turns { font-family: var(--fd-display); font-style: italic; font-size: clamp(28px, 3.6cqw, 46px); margin-top: 2px !important; }
.fd-when { margin-top: 16px !important; font-size: 15px; letter-spacing: 0.05em; text-wrap: balance; }
.fd-when span { white-space: nowrap; }
.fd-reply { margin-top: 22px; display: inline-flex; align-items: center; gap: 12px; min-height: 46px; padding: 0 24px; border: 1px solid rgba(255,255,255,0.75); border-radius: 999px; background: rgba(255,255,255,0.12); color: #fff; font: 600 11px var(--fd-sans); letter-spacing: 0.26em; text-transform: uppercase; cursor: pointer; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }

/* the bangka, side-on at the waterline */
.fd-boat { position: absolute; right: -5cqw; width: 64cqw; aspect-ratio: 1400 / 600; bottom: calc(100% - var(--surf) + 26px - 64cqw * 600 / 1400 * 0.156); z-index: 2; }
.fd-boat svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.fd-boat .fd-hull { position: absolute; inset: 0; z-index: 0; clip-path: inset(0 0 15.6% 0); transform-origin: 50% 83%; }
.fd-boat .fd-contact { position: absolute; left: 6%; right: 4%; top: 83.6%; height: 7%; z-index: 1; border-radius: 50%; filter: blur(1.5px);
  background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 30%, rgba(0, 40, 60, 0.28) 45%, transparent); }
.fd-buoy { position: absolute; left: calc(var(--line-x) - 15px); top: calc(var(--surf) - 20px); width: 30px; height: 22px; border-radius: 50% 50% 46% 46%; z-index: 3;
  background: radial-gradient(circle at 35% 30%, #ffb38a, #ff6a2e 55%, #c94412); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.fd-motion .fd-hull { animation: fd-rock 6s ease-in-out infinite; }
.fd-motion .fd-buoy { animation: fd-bob 3.2s ease-in-out infinite; }
@keyframes fd-rock { 0%, 100% { transform: rotate(-0.4deg) translateY(0); } 50% { transform: rotate(0.5deg) translateY(2px); } }
@keyframes fd-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

/* the descent: the dive line from the buoy to the bottom plate, the diver held in view on it */
.fd-descent { position: relative; }
.fd-line { position: absolute; left: var(--line-x); top: calc(-100svh * (1 - var(--sf)) + 4px); bottom: 330px; width: 2px; margin-left: -1px; z-index: 1;
  background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(220,240,255,0.55) 40%, rgba(200,230,255,0.3)); }
.fd-diverlane { position: absolute; left: var(--line-x); top: -30svh; bottom: 250px; width: 0; z-index: 2; }
.fd-diver { position: sticky; top: 26svh; display: block; max-width: none; height: auto; width: min(64px, 4.6cqw); margin-left: calc(min(64px, 4.6cqw) * -0.47); }

.fd-depths { position: relative; z-index: 3; margin-left: 40%; width: min(560px, 52%); padding: 18svh 0 0; }
.fd-stop { min-height: 78svh; display: flex; flex-direction: column; justify-content: center; }
.fd-depth { display: flex; align-items: center; gap: 12px; font: 500 13px var(--fd-mono); letter-spacing: 0.08em; opacity: 0.85; }
.fd-depth i { display: block; width: 40px; height: 1px; background: rgba(255,255,255,0.6); }
.fd-h2 { font-family: var(--fd-display); font-weight: 400; font-size: clamp(46px, 5.4cqw, 74px); line-height: 1; margin-top: 16px !important; text-wrap: balance; }
.fd-addr { font-size: 16px; margin-top: 10px !important; opacity: 0.9; }
.fd-legs { margin-top: 22px; }
.fd-legs > div { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 16px; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.2); align-items: baseline; }
.fd-legs b { font: 500 15px var(--fd-mono); letter-spacing: 0.02em; white-space: nowrap; }
.fd-legs span { font-size: 17px; line-height: 1.45; }
.fd-legs em { display: block; font-style: normal; font-size: 14.5px; opacity: 0.75; margin-top: 2px; }
.fd-p { font-family: var(--fd-display); font-size: clamp(26px, 2.8cqw, 34px); line-height: 1.3; margin-top: 16px !important; max-width: 24ch; text-wrap: balance; }
.fd-faq { padding: 14px 0; border-top: 1px solid rgba(255,255,255,0.2); }
.fd-faq:first-of-type { margin-top: 18px; }
.fd-faq b { display: block; font-weight: 600; font-size: 16.5px; }
.fd-faq span { display: block; font-size: 15.5px; line-height: 1.5; opacity: 0.85; margin-top: 4px; }
.fd-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.fd-btn { display: inline-flex; align-items: center; min-height: 44px; padding: 0 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.7); color: #fff; background: transparent; font: 600 11px var(--fd-sans); letter-spacing: 0.22em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
.fd-gifts { margin-top: 18px; max-width: 480px; }

/* the bottom plate at full depth: the reply */
.fd-bottom { position: relative; z-index: 3; padding: 0 20px 170px; display: grid; place-items: center; }
.fd-plate { position: relative; width: min(560px, 100%); margin-left: 22%; background: rgba(240, 248, 252, 0.95); color: var(--ink); border-radius: 6px; padding: 40px 38px 36px; text-align: center; box-shadow: 0 30px 60px -30px rgba(0,0,0,0.7); }
.fd-plate::before { content: ""; position: absolute; right: 100%; top: 40px; width: var(--stub, 120px); height: 2px; background: rgba(220,240,255,0.55); }
.fd-tags { display: flex; justify-content: center; gap: 8px; margin-bottom: 22px; }
.fd-tags i { width: 18px; height: 26px; border-radius: 3px; background: #ff6a2e; box-shadow: inset 0 -6px 0 rgba(0,0,0,0.12); }
.fd-tags i:nth-child(2) { background: #ffd23f; } .fd-tags i:nth-child(3) { background: #2ec4b6; }
.fd-plate .fd-k { color: #2a6f97; }
.fd-plate h2 { font-family: var(--fd-display); font-weight: 400; font-size: 46px; line-height: 1.05; margin-top: 10px !important; text-wrap: balance; }
.fd-small { font-size: 14px; line-height: 1.5; color: #4a6577; margin-top: 10px !important; }
.fd-form { text-align: left; }
.fd-form label { display: block; font: 600 11px var(--fd-sans); letter-spacing: 0.2em; text-transform: uppercase; color: #4a6577; margin-top: 20px; }
.fd-field { display: block; width: 100%; font: 17px var(--fd-sans); padding: 13px 14px; border: 0; border-radius: 10px; background: #fff; color: var(--ink); margin-top: 8px; box-shadow: inset 0 0 0 1.5px rgba(11, 42, 64, 0.18); letter-spacing: 0; text-transform: none; }
textarea.fd-field { resize: vertical; min-height: 90px; }
.fd-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 22px; }
.fd-pill { min-height: 50px; padding: 0 8px; border: 0; border-radius: 999px; font: 15px var(--fd-sans); background: #fff; color: var(--ink); box-shadow: inset 0 0 0 1.5px rgba(11, 42, 64, 0.25); cursor: pointer; }
.fd-pill.is-on { background: var(--ink); color: #fff; box-shadow: none; }
.fd-seats { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; font: 600 11px var(--fd-sans); letter-spacing: 0.2em; text-transform: uppercase; color: #4a6577; }
.fd-seats__ctrl { display: inline-flex; align-items: center; gap: 14px; font-size: 18px; color: var(--ink); letter-spacing: 0; }
.fd-seats__ctrl button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: #fff; box-shadow: inset 0 0 0 1.5px rgba(11, 42, 64, 0.25); font-size: 20px; color: var(--ink); cursor: pointer; }
.fd-seats__ctrl button:disabled { opacity: 0.4; }
.fd-link { display: inline-block; margin-top: 8px; padding: 6px 0; border: 0; background: none; color: #4a6577; font: 13px var(--fd-sans); text-decoration: underline; cursor: pointer; }
.fd-error { color: #b3261e; font-size: 14px; margin-top: 14px !important; }
.fd-send { margin-top: 22px; width: 100%; min-height: 54px; border: 0; border-radius: 999px; background: var(--ink); color: #fff; font: 600 12px var(--fd-sans); letter-spacing: 0.26em; text-transform: uppercase; cursor: pointer; }
.fd-send:disabled { opacity: 0.7; cursor: default; }
.fd-again { margin-top: 18px; min-height: 44px; padding: 0 20px; border-radius: 999px; border: 0; box-shadow: inset 0 0 0 1.5px rgba(11, 42, 64, 0.3); background: #fff; color: var(--ink); font: 600 11px var(--fd-sans); letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; }
.fd-maker { margin-top: 24px !important; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #4a6577; }
.fd-maker a, .fd-maker b { color: var(--ink); font-weight: 600; }
.fd-floor { position: absolute; left: 0; right: 0; bottom: 60px; height: 0; }

/* the depth gauge, at the edge of the frame */
.fd-gaugelane { position: absolute; right: 28px; top: 0; bottom: 0; width: 120px; z-index: 6; pointer-events: none; }
.fd-gauge { position: sticky; top: calc(50svh - 90px); display: flex; align-items: center; justify-content: flex-end; gap: 12px; opacity: 0; transition: opacity 0.6s; }
.fd-gauge.is-on { opacity: 1; }
.fd-track { width: 2px; height: 180px; background: rgba(255,255,255,0.22); position: relative; overflow: hidden; border-radius: 2px; }
.fd-fill { position: absolute; inset: 0; background: #fff; transform-origin: 50% 0; transform: scaleY(0); }
.fd-read { text-align: right; text-shadow: 0 1px 8px rgba(0,30,60,0.5); }
.fd-read b { display: block; font: 500 30px var(--fd-mono); line-height: 1; white-space: nowrap; }
.fd-read b span { font: inherit; letter-spacing: 0; text-transform: none; opacity: 1; }
.fd-read > span { display: block; font: 600 10px var(--fd-sans); letter-spacing: 0.26em; text-transform: uppercase; opacity: 0.85; }

/* the intro: rising through the blue, bubbles going with you, droplets on the lens after */
.fd-intro .fd-sky > *, .fd-intro .fd-depths, .fd-intro .fd-diverlane, .fd-intro .fd-line, .fd-intro .fd-buoy, .fd-intro .fd-gauge { opacity: 0 !important; }
.fd-sky > *, .fd-depths, .fd-diverlane, .fd-line, .fd-buoy { transition: opacity 1.1s ease; }
.fd-arrived .fd-sky > * { animation: fd-rise 1.4s cubic-bezier(.2,.7,.2,1) both; }
.fd-arrived .fd-sky > *:nth-child(2) { animation-delay: .12s; } .fd-arrived .fd-sky > *:nth-child(3) { animation-delay: .24s; } .fd-arrived .fd-sky > *:nth-child(n+4) { animation-delay: .36s; }
@keyframes fd-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
.fd-bubbles { position: absolute; inset: 0; transition: opacity .8s; }
.fd-arrived .fd-bubbles { opacity: 0; }
.fd-bubbles i { position: absolute; bottom: -40px; border-radius: 50%; animation: fd-up linear infinite;
  background: radial-gradient(circle at 32% 30%, rgba(255,255,255,0.95) 0 12%, rgba(255,255,255,0.18) 30%, rgba(200,235,255,0.06) 62%, rgba(255,255,255,0.55) 72%, transparent 76%); }
@keyframes fd-up { from { transform: translate(0, 0); } 50% { transform: translate(var(--sway), -55svh); } to { transform: translate(0, -115svh); } }
.fd-lens { position: absolute; inset: 0; opacity: 0; }
.fd-wet .fd-lens { opacity: 1; }
.fd-lens i { position: absolute; border-radius: 48% 48% 50% 50% / 44% 44% 56% 56%; opacity: 0;
  -webkit-backdrop-filter: blur(2.5px) saturate(1.25) brightness(1.08); backdrop-filter: blur(2.5px) saturate(1.25) brightness(1.08);
  background: radial-gradient(circle at 34% 28%, rgba(255,255,255,0.85) 0 8%, rgba(255,255,255,0) 22%), radial-gradient(circle at 60% 78%, rgba(255,255,255,0.25), rgba(255,255,255,0) 45%);
  box-shadow: inset 0 -2px 3px rgba(0, 40, 70, 0.25), 0 1px 2px rgba(0, 30, 60, 0.15); }
.fd-wet .fd-lens i { animation: fd-drip ease-in forwards; }
@keyframes fd-drip { 0% { opacity: 0; transform: translateY(0) scale(1); } 12% { opacity: 1; } 70% { opacity: 0.85; } 100% { opacity: 0; transform: translateY(var(--fall)) scale(0.92, 1.08); } }

.fd-gallery .fd-surface { height: 75cqw; }
.fd-gallery .fd-line { top: calc(-75cqw * (1 - var(--sf)) + 4px); }

@container (max-width: 700px) {
  .fd-root { --surf: 54%; --sf: 0.54; --line-x: 14%; }
  .fd-sky { width: 100%; justify-content: flex-start; padding: 12svh 20px 0; }
  .fd-boat { width: 112cqw; right: -46cqw; bottom: calc(100% - var(--surf) + 16px - 112cqw * 600 / 1400 * 0.156); }
  .fd-buoy { left: calc(var(--line-x) - 13px); top: calc(var(--surf) - 12px); width: 26px; height: 19px; }
  .fd-line { bottom: 350px; }
  .fd-diver { width: 38px; margin-left: calc(38px * -0.47); }
  .fd-depths { margin-left: 26%; width: 68%; }
  .fd-stop { min-height: 72svh; }
  .fd-legs > div { grid-template-columns: 78px minmax(0, 1fr); gap: 10px; }
  .fd-legs b { font-size: 13.5px; } .fd-legs span { font-size: 15.5px; }
  .fd-bottom { padding: 0 14px 150px; }
  .fd-plate { margin-left: 20%; width: 80%; padding: 32px 18px 30px; }
  .fd-plate h2 { font-size: 36px; }
  .fd-gaugelane { right: 12px; }
  .fd-gauge { top: calc(100svh - 76px); flex-direction: row-reverse; }
  .fd-read { padding: 8px 12px; border-radius: 12px; background: rgba(4, 30, 52, 0.45); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
  .fd-track { display: none; }
  .fd-read b { font-size: 22px; }
}
@media (prefers-reduced-motion: reduce) { .fd-root *, .fd-root *::before { animation: none !important; } }
`;
