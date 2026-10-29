// Summit: a level camera rising up a Philippine mountain as the guest scrolls, to the reply at
// the top. Sizes follow the page's own width (container units), never the window's; nothing is
// fixed to the window (the scene, the mist, the marker, the climber and the altimeter are
// sticky inside the page).
export const SUMMIT_CSS = `
.sm-root { --ink: #17222f; --frame: 100svh;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: #fff;
  font-family: var(--sm-sans); -webkit-font-smoothing: antialiased; background: #0a1220; }
.sm-root *, .sm-root *::before, .sm-root *::after { box-sizing: border-box; }
.sm-root p, .sm-root h1, .sm-root h2, .sm-root h3 { margin: 0; }
.sm-gl, .sm-stage { position: sticky; top: 0; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); pointer-events: none; }
.sm-gl { z-index: 0; }
.sm-stage { z-index: 1; overflow: hidden; }
.sm-world { position: relative; z-index: 2; }
.sm-k { font: 600 12px var(--sm-sans); letter-spacing: 0.32em; text-transform: uppercase; }
.sm-shadow { text-shadow: 0 2px 18px rgba(5, 15, 35, 0.45), 0 1px 3px rgba(5, 15, 35, 0.3); }

/* the mist over the words: edgeless soft layers drifting apart */
.sm-mist { position: absolute; inset: 0; overflow: hidden; opacity: var(--mist, 0.5); transition: opacity 1.6s ease;
  -webkit-mask-image: radial-gradient(ellipse 100% 100% at 50% 50%, #000 0%, rgba(0,0,0,0.5) 50%, transparent 100%); mask-image: radial-gradient(ellipse 100% 100% at 50% 50%, #000 0%, rgba(0,0,0,0.5) 50%, transparent 100%); }
.sm-mist i { position: absolute; inset: -55% -50%; }
.sm-mist .a { background: radial-gradient(16% 10% at 14% 64%, rgba(255,255,255,0.45), transparent 65%), radial-gradient(18% 9% at 46% 74%, rgba(255,255,255,0.38), transparent 66%), radial-gradient(15% 11% at 74% 66%, rgba(255,255,255,0.42), transparent 65%), radial-gradient(17% 10% at 90% 78%, rgba(255,255,255,0.36), transparent 66%); }
.sm-mist .b { background: radial-gradient(18% 10% at 26% 70%, rgba(255,255,255,0.36), transparent 66%), radial-gradient(16% 11% at 60% 80%, rgba(255,255,255,0.34), transparent 66%), radial-gradient(17% 10% at 84% 62%, rgba(255,255,255,0.34), transparent 66%); }
.sm-motion .sm-mist .a { animation: sm-driftA 34s ease-in-out infinite alternate; }
.sm-motion .sm-mist .b { animation: sm-driftB 46s ease-in-out infinite alternate; }
@keyframes sm-driftA { from { transform: translate3d(-24%, 2%, 0); } to { transform: translate3d(24%, -2%, 0); } }
@keyframes sm-driftB { from { transform: translate3d(22%, -3%, 0); } to { transform: translate3d(-26%, 3%, 0); } }

/* the summit marker and the climber, standing on the peak at the end of the climb */
.sm-post { position: absolute; left: 0; top: 0; width: 52px; opacity: 0; transition: opacity 1s; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35)); }
.sm-post svg { display: block; width: 100%; height: auto; overflow: visible; }
.sm-climber { position: absolute; left: 0; top: 0; height: 44px; width: auto; max-width: none; opacity: 0; translate: 0 6px; transition: opacity 1.2s ease, translate 1.2s ease; filter: drop-shadow(0 0 1px rgba(255,255,255,0.4)); }
.sm-top .sm-post { opacity: 1; }
.sm-top .sm-climber.is-on { opacity: 1; translate: 0 0; }

/* the first screen: the name in the sky, left of the peak */
.sm-hero { position: relative; height: var(--frame); display: flex; align-items: flex-start; }
.sm-words { position: relative; width: 52%; padding: 15svh 0 0 8cqw; }
.sm-words h1 { font-family: var(--sm-display); font-weight: 400; font-size: clamp(96px, 14cqw, 200px); line-height: 0.85; margin-top: 18px !important; letter-spacing: -0.01em; text-wrap: balance; }
.sm-turns { font-family: var(--sm-display); font-style: italic; font-size: clamp(30px, 3.6cqw, 46px); margin-top: 4px !important; }
.sm-when { margin-top: 18px !important; font-size: 15px; letter-spacing: 0.05em; opacity: 0.92; text-wrap: balance; }
.sm-when span { white-space: nowrap; }
.sm-reply { margin-top: 26px; display: inline-flex; align-items: center; min-height: 46px; padding: 0 24px; border: 1px solid rgba(255,255,255,0.7); border-radius: 999px; background: rgba(255,255,255,0.1); color: #fff; font: 600 11px var(--sm-sans); letter-spacing: 0.26em; text-transform: uppercase; cursor: pointer; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }

/* the camps on the way up */
.sm-camp { position: relative; min-height: 105svh; display: flex; align-items: center; padding: 0 8cqw; }
.sm-in { position: relative; width: min(520px, 46%); }
.sm-in::before, .sm-words::before { content: ""; position: absolute; inset: -18% -30% -18% -40%; z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, rgba(6, 16, 34, 0.66), rgba(6, 16, 34, 0.32) 55%, transparent); filter: blur(14px); }
.sm-alt { display: flex; align-items: center; gap: 12px; font: 500 13px var(--sm-mono); letter-spacing: 0.08em; opacity: 0.9; }
.sm-alt i { display: block; width: 40px; height: 1px; background: rgba(255,255,255,0.7); }
.sm-h2 { font-family: var(--sm-display); font-weight: 400; font-size: clamp(50px, 5.6cqw, 82px); line-height: 1; margin-top: 14px !important; text-wrap: balance; }
.sm-addr { font-size: 16px; margin-top: 10px !important; opacity: 0.92; }
.sm-legs { margin-top: 22px; }
.sm-legs > div { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 16px; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.25); align-items: baseline; }
.sm-legs b { font: 500 15px var(--sm-mono); white-space: nowrap; }
.sm-legs span { font-size: 17px; line-height: 1.45; }
.sm-legs em { display: block; font-style: normal; font-size: 14.5px; opacity: 0.8; margin-top: 2px; }
.sm-p { font-family: var(--sm-display); font-size: clamp(27px, 2.8cqw, 36px); line-height: 1.3; margin-top: 16px !important; max-width: 24ch; text-wrap: balance; }
.sm-faq { padding: 14px 0; border-top: 1px solid rgba(255,255,255,0.25); }
.sm-faq:first-of-type { margin-top: 18px; }
.sm-faq b { display: block; font-weight: 600; font-size: 16.5px; }
.sm-faq span { display: block; font-size: 15.5px; line-height: 1.5; opacity: 0.88; margin-top: 4px; }
.sm-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.sm-btn { display: inline-flex; align-items: center; min-height: 44px; padding: 0 20px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.7); color: #fff; background: transparent; font: 600 11px var(--sm-sans); letter-spacing: 0.22em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
.sm-gifts { margin-top: 18px; max-width: 480px; }
.sm-cloud { height: 130svh; }

/* the summit: the reply, beside the marker */
.sm-summit { position: relative; min-height: var(--frame); display: flex; align-items: center; justify-content: flex-start; padding: 6svh 8cqw 8svh; }
.sm-card { position: relative; width: min(520px, 100%); background: rgba(250, 251, 253, 0.9); color: var(--ink); border-radius: 6px; padding: 38px 36px 34px; text-align: center; box-shadow: 0 30px 70px -34px rgba(0,10,30,0.65); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.sm-card .sm-k { color: #7a5a36; text-wrap: balance; }
.sm-card .sm-k span { white-space: nowrap; }
.sm-card h2 { font-family: var(--sm-display); font-weight: 400; font-size: 48px; line-height: 1.05; margin-top: 10px !important; text-wrap: balance; }
.sm-small { font-size: 14px; line-height: 1.5; color: #55606c; margin-top: 10px !important; }
.sm-form { text-align: left; }
.sm-form label { display: block; font: 600 11px var(--sm-sans); letter-spacing: 0.2em; text-transform: uppercase; color: #55606c; margin-top: 20px; }
.sm-field { display: block; width: 100%; font: 17px var(--sm-sans); padding: 13px 14px; border: 0; border-radius: 10px; background: #fff; color: var(--ink); margin-top: 8px; box-shadow: inset 0 0 0 1.5px rgba(23, 34, 47, 0.18); letter-spacing: 0; text-transform: none; }
textarea.sm-field { resize: vertical; min-height: 90px; }
.sm-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 22px; }
.sm-root .sm-open { animation: sm-open 0.5s cubic-bezier(.2, .8, .2, 1) both; }
@keyframes sm-open { from { opacity: 0; transform: translateY(8px); } }
.sm-pill { min-height: 50px; padding: 0 8px; border: 0; border-radius: 999px; font: 15px var(--sm-sans); background: #fff; color: var(--ink); box-shadow: inset 0 0 0 1.5px rgba(23, 34, 47, 0.25); cursor: pointer; }
.sm-pill.is-on { background: var(--ink); color: #fff; box-shadow: none; }
.sm-seats { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; font: 600 11px var(--sm-sans); letter-spacing: 0.2em; text-transform: uppercase; color: #55606c; }
.sm-seats__ctrl { display: inline-flex; align-items: center; gap: 14px; font-size: 18px; color: var(--ink); letter-spacing: 0; }
.sm-seats__ctrl button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: #fff; box-shadow: inset 0 0 0 1.5px rgba(23, 34, 47, 0.25); font-size: 20px; color: var(--ink); cursor: pointer; }
.sm-seats__ctrl button:disabled { opacity: 0.4; }
.sm-link { display: inline-block; margin-top: 8px; padding: 6px 0; border: 0; background: none; color: #55606c; font: 13px var(--sm-sans); text-decoration: underline; cursor: pointer; }
.sm-error { color: #b3261e; font-size: 14px; margin-top: 14px !important; }
.sm-send { margin-top: 22px; width: 100%; min-height: 54px; border: 0; border-radius: 999px; background: var(--ink); color: #fff; font: 600 12px var(--sm-sans); letter-spacing: 0.26em; text-transform: uppercase; cursor: pointer; }
.sm-send:disabled { opacity: 0.7; cursor: default; }
.sm-again { margin-top: 18px; min-height: 44px; padding: 0 20px; border-radius: 999px; border: 0; box-shadow: inset 0 0 0 1.5px rgba(23, 34, 47, 0.3); background: #fff; color: var(--ink); font: 600 11px var(--sm-sans); letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; }
.sm-maker { margin-top: 22px !important; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #55606c; }
.sm-maker a, .sm-maker b { color: var(--ink); font-weight: 600; }

/* the altimeter, at the edge of the frame */
.sm-gaugelane { position: absolute; right: 28px; top: 0; bottom: 0; width: 140px; z-index: 6; pointer-events: none; }
.sm-gauge { position: sticky; top: calc(var(--frame) / 2 - 90px); display: flex; align-items: center; justify-content: flex-end; gap: 12px; transition: opacity 0.6s; }
.sm-track { width: 2px; height: 180px; background: rgba(255,255,255,0.25); position: relative; overflow: hidden; border-radius: 2px; }
.sm-fill { position: absolute; inset: 0; background: #fff; transform-origin: 50% 100%; transform: scaleY(0); }
.sm-read { text-align: right; text-shadow: 0 1px 8px rgba(5, 15, 35, 0.5); }
.sm-read b { display: block; font: 500 28px var(--sm-mono); line-height: 1; white-space: nowrap; }
.sm-read b span { font: inherit; letter-spacing: 0; text-transform: none; opacity: 1; }
.sm-read > span { display: block; font: 600 10px var(--sm-sans); letter-spacing: 0.26em; text-transform: uppercase; opacity: 0.85; }

/* the intro: night to dawn at the foot of the mountain, the light reaching the summit first */
.sm-intro .sm-words > *, .sm-intro .sm-gauge, .sm-intro .sm-mist { opacity: 0 !important; }
.sm-words > * { transition: opacity 1.2s ease, transform 1.2s cubic-bezier(.2,.7,.2,1); }
.sm-intro .sm-words > * { transform: translateY(16px); }
.sm-words > *:nth-child(2) { transition-delay: .15s; } .sm-words > *:nth-child(3) { transition-delay: .3s; } .sm-words > *:nth-child(n+4) { transition-delay: .45s; }

.sm-gallery { --frame: 75cqw; }
.sm-gallery .sm-words { padding-top: 11cqw; }

@container (max-width: 700px) {
  .sm-words { width: 100%; padding: 12svh 22px 0; }
  .sm-camp { padding: 0 22px; } .sm-in { width: 82%; }
  .sm-legs > div { grid-template-columns: 78px minmax(0, 1fr); gap: 10px; } .sm-legs b { font-size: 13.5px; } .sm-legs span { font-size: 15.5px; }
  /* the card above, the summit kept clear below it at the end of the climb */
  .sm-summit { padding: 6svh 16px calc(var(--frame) * 0.4); align-items: flex-start; }
  .sm-card { padding: 30px 20px 28px; } .sm-card h2 { font-size: 38px; }
  .sm-gaugelane { right: 12px; }
  .sm-gauge { top: calc(var(--frame) - 76px); flex-direction: row-reverse; } .sm-track { display: none; }
  .sm-read { padding: 8px 12px; border-radius: 12px; background: rgba(5,15,35,0.4); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
  .sm-read b { font-size: 20px; }
  .sm-post { width: 36px; } .sm-climber { height: 30px; }
  /* the reply's form is open: the altitude would sit on its fields */
  .sm-gaugelane:has(~ * .sm-open), .sm-root:has(.sm-open) .sm-gauge { opacity: 0 !important; transition: opacity .3s; }
}
@media (prefers-reduced-motion: reduce) { .sm-root *, .sm-root *::before { animation: none !important; transition: none !important; } }
`;
