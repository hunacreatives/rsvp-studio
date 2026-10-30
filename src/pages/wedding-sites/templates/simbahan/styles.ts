// Simbahan: an old stone church drawn live (WebGL, on a sticky frame inside the page), the
// couple's names over its doors, and a page of a church programme at each stop down the aisle:
// heavy cotton stock with gilt edges, set in black and rubric red like a missal, a silk ribbon
// marker laid across it. Sizes follow the page's width (container units), never the window's;
// nothing is fixed to the window.

const svg = (body: string, w: number, h: number) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;
// cotton stock: a fine, even tooth
const GRAIN = svg(
  `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' seed='7'/><feColorMatrix values='0 0 0 0 .34  0 0 0 0 .27  0 0 0 0 .18  0 0 0 -0.95 .58'/></filter><rect width='100%' height='100%' filter='url(#g)'/>`,
  240,
  240,
);
export const SIMBAHAN_CSS = `
.sb-root { --frame: 100svh; --sb-red: #8a2116; --paper: #f8f1e2; --soft: color-mix(in srgb, var(--sb-ink) 72%, #8a7257); --rule: rgba(74, 46, 24, 0.2); --cream: #f8eedb;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: var(--sb-ink);
  font-family: var(--sb-text); -webkit-font-smoothing: antialiased; background: #f6efe0; }
.sb-root *, .sb-root *::before, .sb-root *::after { box-sizing: border-box; }
.sb-root p, .sb-root h1, .sb-root h2, .sb-root h3, .sb-root ol, .sb-root ul { margin: 0; }
.sb-stage { position: sticky; top: 0; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); z-index: 0; overflow: hidden; pointer-events: none;
  background: #f6efe0; }
.sb-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.sb-shade { position: absolute; inset: 0; }
.sb-world { position: relative; }

/* ---- the doors: the names over them, in the light that comes out */
.sb-door { position: relative; height: var(--frame); }
.sb-door::before { content: ""; position: absolute; inset: 0; pointer-events: none;
  /* a soft clearing of bare paper behind the title, as a painter leaves room for the lettering */
  background: radial-gradient(ellipse 40% 26% at 50% 31%, rgba(247, 240, 225, 0.72), rgba(247, 240, 225, 0.38) 55%, rgba(247, 240, 225, 0) 80%); }
.sb-words { position: absolute; left: 50%; top: 31%; width: min(92cqw, 1040px); translate: -50% -50%; text-align: center;
  color: #2b1d14; text-shadow: 0 0 2px rgba(250, 244, 230, 0.9), 0 0 18px rgba(250, 244, 230, 0.85); }
.sb-kick { font: 500 13px/1.4 var(--sb-text); letter-spacing: 0.4em; text-transform: uppercase; padding-left: 0.4em; color: var(--sb-red); }
.sb-names { margin-top: 16px !important; font-family: var(--sb-display); font-weight: 400; font-size: var(--sb-name); line-height: 1.04; letter-spacing: 0.05em; text-wrap: balance;
  /* room inside the box for the opening's blur */
  padding: 0.08em 0.1em 0.12em; margin-bottom: -0.12em !important; }
.sb-names span { white-space: nowrap; }
.sb-names em { display: inline-block; margin: 0 0.06em; font: italic 400 0.82em/1 var(--sb-text); letter-spacing: 0; color: #a0582a; translate: 0 -0.02em; }
.sb-date { margin-top: 20px !important; font: italic 400 clamp(21px, 1.9cqw, 26px)/1.35 var(--sb-text); text-wrap: balance; padding-bottom: 0.1em; }
.sb-at { margin-top: 10px !important; font: 500 13px/1.6 var(--sb-text); letter-spacing: 0.26em; text-transform: uppercase; color: #5a3f2c; text-wrap: balance; padding-left: 0.26em; }
.sb-at span { white-space: nowrap; }
.sb-walkon { position: absolute; left: 50%; bottom: 3.5svh; translate: -50% 0; display: grid; justify-items: center; gap: 8px; font: 500 12px var(--sb-text); letter-spacing: 0.36em; text-transform: uppercase; padding-left: 0.36em;
  color: #3a281b; text-shadow: 0 0 10px rgba(250, 244, 230, 0.95); white-space: nowrap; }
.sb-walkon i { width: 1px; height: 34px; background: linear-gradient(#3a281b, rgba(58, 40, 27, 0)); }
.sb-motion .sb-walkon i { animation: sb-line 2.6s ease-in-out infinite; transform-origin: 50% 0; }
@keyframes sb-line { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
/* the opening: the words come up in the light as the doors open */
.sb-intro .sb-words > *, .sb-intro .sb-walkon, .sb-intro .sb-door::before { opacity: 0; transition: opacity 1.8s ease, filter 2s ease, translate 2.4s cubic-bezier(.2, .7, .2, 1); }
.sb-intro .sb-words > * { filter: blur(7px); translate: 0 8px; }
.sb-intro.sb-named .sb-words > *, .sb-intro.sb-named .sb-walkon, .sb-intro.sb-named .sb-door::before { opacity: 1; filter: blur(0); translate: 0 0; }
.sb-intro.sb-named .sb-words > :nth-child(1) { transition-delay: 0s; }
.sb-intro.sb-named .sb-words > :nth-child(2) { transition-delay: 0.3s; }
.sb-intro.sb-named .sb-words > :nth-child(n+3) { transition-delay: 1.1s; }
.sb-intro.sb-named .sb-walkon { transition-delay: 3.2s; }

/* ---- the stops: a page of the programme each, every one pausing in the same place (its dock:
   high on the right; the bottom edge on a phone; aisle.ts sets its top). The gap before each
   is the walk to the next stop. */
.sb-stop { position: relative; padding-top: var(--frame); }
.sb-stop:last-child { padding-bottom: 2px; }
.sb-dock { position: relative; }
.sb-card { position: sticky; top: 90px; width: min(456px, 36cqw); margin: 0 6.5cqw 0 auto; isolation: isolate; transform: perspective(1800px) rotateY(-6deg) rotateX(1.2deg); transform-origin: 100% 50%; }
.sb-hold { height: calc(var(--frame) * 0.5); }
.sb-paper { position: relative; padding: 38px 50px 34px; border-radius: 1px; text-align: center;
  background: ${GRAIN}, linear-gradient(126deg, #fffaf0 0%, var(--paper) 42%, #ece0c8 100%);
  background-size: 240px 240px, 100% 100%;
  /* the stock's thickness, its gilt edge, and its shadow in the church's low light */
  box-shadow: 1px 1px 0 #e2cc97, 2px 2px 0 #c9a45c, 3px 3px 0 #9c7a3a, 0 0 0 0.5px rgba(150, 112, 50, 0.6),
    10px 16px 30px -8px rgba(60, 40, 50, 0.42), 2px 4px 8px rgba(60, 40, 40, 0.25); }
/* a fine rule pressed blind into the stock, and the church's light falling across it */
.sb-paper::before, .sb-paper::after { content: ""; position: absolute; pointer-events: none; }
.sb-paper::before { inset: 15px; border: 1px solid rgba(70, 40, 18, 0.16); box-shadow: 1px 1px 0 rgba(255, 255, 255, 0.75), inset 1px 1px 0 rgba(255, 255, 255, 0.55); }
.sb-paper::after { inset: 0; z-index: 1; mix-blend-mode: multiply;
  background: radial-gradient(ellipse 120% 90% at 8% 0%, rgba(255, 236, 200, 0) 35%, rgba(150, 100, 50, 0.05) 70%, rgba(90, 55, 25, 0.12) 100%); }
.sb-paper > * { position: relative; z-index: 2; }
.sb-paper > .sb-ribbon { position: absolute; z-index: 3; }
/* the silk ribbon marker laid across the page */
.sb-ribbon { position: absolute; z-index: 2; right: 24px; top: -14px; bottom: -48px; width: 15px;
  background: linear-gradient(90deg, #5e100c, #9b2a1f 38%, #b8463a 50%, #8a2016 64%, #5a0f0b);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 11px), 0 100%);
  filter: drop-shadow(1px 2px 1.5px rgba(10, 4, 2, 0.45)); }
.sb-ribbon::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 3px); }
.sb-rubric { display: flex; align-items: baseline; justify-content: center; gap: 10px; font: italic 400 16px/1.35 var(--sb-text); color: var(--sb-red); text-wrap: balance; }
.sb-num { font: 400 13px/1 var(--sb-display); letter-spacing: 0.14em; }
.sb-num::after { content: "·"; margin-left: 10px; font: 400 15px var(--sb-text); }
.sb-h2 { margin-top: 14px !important; font: 400 clamp(30px, 2.7cqw, 38px)/1.1 var(--sb-display); letter-spacing: 0.07em; text-wrap: balance; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6); padding: 0 0.1em; }
.sb-orn { display: block; width: 132px; height: 14px; margin: 12px auto 0; color: var(--sb-red); }
.sb-h3 { font: 500 12px/1.4 var(--sb-text); letter-spacing: 0.28em; text-transform: uppercase; color: var(--sb-red); padding-left: 0.28em; }
.sb-p { margin-top: 16px !important; font: 400 18px/1.58 var(--sb-text); text-wrap: pretty; }
.sb-small { margin-top: 4px !important; font-size: 15px; line-height: 1.5; color: var(--soft); text-wrap: pretty; }
.sb-hint { margin-top: 14px !important; font-size: 15px; font-style: italic; opacity: 0.65; }
.sb-part { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--rule); }
.sb-link { display: inline-flex; align-items: center; min-height: 44px; padding: 0; border: 0; background: none; font: inherit; font-size: 15px; color: inherit; text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1px; cursor: pointer; }
.sb-link--red { color: var(--sb-red); font-weight: 600; }
.sb-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 14px; }
.sb-add { margin-top: 10px; }

.sb-story { text-align: left; margin-top: 4px; }
.sb-story .sb-p { font-size: 17.5px; }
.sb-story .sb-p + .sb-p { margin-top: 12px !important; text-indent: 1.4em; }
/* the first letter rubricated, as in a missal */
.sb-drop::first-letter { float: left; font: 400 3.5em/0.84 var(--sb-display); color: var(--sb-red); margin: 0.08em 0.1em 0 0; padding-top: 0.04em; }

.sb-venues { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 20px; text-align: left; }
.sb-venue { display: grid; align-content: start; gap: 2px; }
.sb-venue .sb-h3 { padding-left: 0; }
.sb-venue > div { margin-top: -6px; }
.sb-time { margin-top: 6px !important; font: italic 400 16px/1.35 var(--sb-text); color: var(--soft); }
.sb-venue__name { margin-top: 4px !important; font: 400 19px/1.25 var(--sb-text); font-weight: 600; text-wrap: balance; }
.sb-program { list-style: none; padding: 0; margin-top: 10px !important; text-align: left; }
.sb-program li { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 12px; align-items: baseline; padding: 7px 0; border-bottom: 1px dotted rgba(74, 46, 24, 0.3); }
.sb-program li:last-child { border-bottom: 0; }
.sb-program__time { font: italic 400 16px var(--sb-text); color: var(--sb-red); white-space: nowrap; }
.sb-program__what { font-size: 16px; line-height: 1.42; }
.sb-program__what em { display: block; font-size: 15px; color: var(--soft); }

.sb-parents { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
.sb-group__t { font: 500 12px/1.4 var(--sb-text); letter-spacing: 0.24em; text-transform: uppercase; color: var(--sb-red); padding-left: 0.24em; text-wrap: balance; }
.sb-people { list-style: none; padding: 0; margin-top: 6px !important; display: grid; gap: 2px; font-size: 16px; line-height: 1.4; }
.sb-people--cols { grid-template-columns: 1fr 1fr; column-gap: 16px; }
.sb-principal .sb-people { margin-top: 10px !important; }
.sb-party { margin-top: 18px; display: grid; gap: 16px; }
.sb-row { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 12px; }
.sb-row + .sb-row { padding-top: 14px; border-top: 1px solid var(--rule); }
.sb-row--secondary .sb-people, .sb-row--little .sb-people, .sb-row--party .sb-people { font-size: 15px; }

.sb-p--wear { text-align: left; }
.sb-swatches { display: flex; justify-content: center; gap: 14px; margin-top: 18px; }
.sb-swatches i { width: 30px; height: 30px; border-radius: 50%; box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2), 0 0 0 3px var(--paper), 0 0 0 4px #c9a45c; }

.sb-row1 { display: grid; gap: 1px; padding: 5px 0; }
.sb-row1 b { font: 600 18px/1.3 var(--sb-text); }
.sb-row1 span { font-size: 15px; line-height: 1.5; color: var(--soft); }
.sb-row1 .sb-link { justify-self: center; min-height: 36px; }
.sb-gifts { margin-top: 12px; text-align: left; }
.sb-faqs { text-align: left; margin-top: 6px; }
.sb-faqs details { border-bottom: 1px solid var(--rule); }
.sb-faqs details:last-child { border-bottom: 0; }
.sb-faqs summary { display: flex; justify-content: space-between; gap: 12px; min-height: 44px; align-items: center; font: 600 16.5px/1.3 var(--sb-text); cursor: pointer; list-style: none; }
.sb-faqs summary::-webkit-details-marker { display: none; }
.sb-faqs summary::after { content: "+"; font: 400 22px var(--sb-text); color: var(--sb-red); }
.sb-faqs details[open] summary::after { content: "–"; }
.sb-faqs details .sb-small { margin: 0 0 12px !important; }

/* ---- the reply, at the altar: an engraved reply card */
.sb-form { display: grid; gap: 14px; margin-top: 18px; text-align: left; }
.sb-replyby { text-align: center; font: italic 400 16px/1.4 var(--sb-text); color: var(--soft); }
.sb-choices { display: grid; gap: 4px; }
.sb-choice { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 50px; padding: 0 6px; border: 0; border-bottom: 1px solid var(--rule); background: none; text-align: left; font: italic 400 20px var(--sb-text); color: var(--sb-ink); cursor: pointer; }
.sb-choice i { flex: none; width: 20px; height: 20px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--sb-ink) 55%, transparent); position: relative; }
.sb-choice i::after { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: var(--sb-red); transform: scale(0); transition: transform 0.25s cubic-bezier(.3, 1.4, .5, 1); }
.sb-choice.is-picked { color: var(--sb-red); }
.sb-choice.is-picked i { border-color: var(--sb-red); }
.sb-choice.is-picked i::after { transform: scale(1); }
.sb-root .sb-open { display: grid; gap: 14px; animation: sb-open 0.5s cubic-bezier(.2, .8, .2, 1) both; }
@keyframes sb-open { from { opacity: 0; transform: translateY(8px); } }
.sb-label { display: block; margin: 0 0 2px; font: 500 12px var(--sb-text); letter-spacing: 0.22em; text-transform: uppercase; color: var(--soft); }
.sb-field { display: block; width: 100%; min-height: 46px; padding: 8px 2px; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--sb-ink) 40%, transparent); border-radius: 0; background: transparent; font: 400 17px var(--sb-text); color: var(--sb-ink); }
.sb-field:focus { outline: none; border-bottom-color: var(--sb-red); box-shadow: 0 1px 0 var(--sb-red); }
.sb-field::placeholder { color: color-mix(in srgb, var(--sb-ink) 40%, transparent); font-style: italic; }
textarea.sb-field { resize: vertical; min-height: 84px; }
.sb-counts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.sb-count { position: relative; width: 44px; height: 44px; border: 0; background: none; font: 400 20px var(--sb-text); font-variant-numeric: oldstyle-nums; color: var(--sb-ink); cursor: pointer; }
/* the number a guest picks is ringed by hand, in red ink */
.sb-count::after { content: ""; position: absolute; inset: 5px 4px 4px 5px; border: 1.6px solid var(--sb-red); border-radius: 52% 46% 55% 44% / 48% 55% 45% 52%; rotate: -8deg; opacity: 0; transform: scale(0.7); transition: opacity 0.2s, transform 0.3s cubic-bezier(.3, 1.4, .5, 1); }
.sb-count.is-picked { color: var(--sb-red); }
.sb-count.is-picked::after { opacity: 1; transform: scale(1); }
.sb-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; padding: 0 26px; border: 0; border-radius: 0; color: #fbf3e4; font: 500 13px var(--sb-text); letter-spacing: 0.26em; text-transform: uppercase; text-decoration: none; cursor: pointer;
  /* an inked block, printed: the ink a little uneven, the stock's tooth showing through */
  background: ${GRAIN}, linear-gradient(100deg, #7f1d13, var(--sb-red) 40%, #7a1c12); background-size: 240px 240px, 100% 100%; background-blend-mode: soft-light, normal; }
.sb-form > .sb-open > .sb-btn { width: 100%; margin-top: 4px; }
.sb-btn--line { background: transparent; color: var(--sb-red); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sb-red) 60%, transparent); }
.sb-btn:disabled { opacity: 0.6; cursor: default; }
.sb-error { color: #9b1c1c; font-size: 15px; }
.sb-thanks { display: grid; justify-items: center; gap: 6px; margin-top: 14px; }
.sb-thanks__big { font: italic 400 30px var(--sb-text); color: var(--sb-red); }
.sb-thanks .sb-btn { margin-top: 10px; }
.sb-maker { text-wrap: balance; margin-top: 20px !important; padding-top: 14px; border-top: 1px solid var(--rule); font-size: 13px; letter-spacing: 0.03em; color: var(--soft); }
.sb-maker--end { position: relative; margin: 0 auto 18px !important; width: max-content; max-width: calc(100% - 32px); padding: 8px 14px !important; border: 0 !important; background: rgba(248, 241, 226, 0.92); }

.sb-gallery { --frame: 75cqw; }
.sb-gallery .sb-words { top: 30%; }
.sb-gallery .sb-door::before { background: radial-gradient(ellipse 50% 24% at 50% 30%, rgba(247, 240, 225, 0.86), rgba(247, 240, 225, 0.5) 55%, rgba(247, 240, 225, 0) 82%); }
.sb-nogl .sb-stage { background: radial-gradient(ellipse at 50% 45%, #f3e3c4, #d9c7a8 72%); }
@media (prefers-reduced-motion: reduce) { .sb-root *, .sb-root *::before, .sb-root *::after { animation: none !important; transition: none !important; } }

/* ---- a phone: the church above, the page on the bottom edge */
@container (max-width: 700px) {
  .sb-words { top: 29%; width: calc(100% - 32px); }
  .sb-door::before { background: radial-gradient(ellipse 72% 30% at 50% 29%, rgba(247, 240, 225, 0.78), rgba(247, 240, 225, 0.4) 60%, rgba(247, 240, 225, 0) 85%); }
  .sb-kick { font-size: 13px; letter-spacing: 0.3em; padding-left: 0.3em; }
  .sb-names { font-size: var(--sb-name-m); margin-top: 12px !important; line-height: 1.08; }
  .sb-names em { display: block; margin: 0.06em 0 0.04em; font-size: 0.7em; }
  .sb-date { font-size: 21px; margin-top: 14px !important; }
  .sb-at { font-size: 13px; letter-spacing: 0.18em; padding-left: 0.18em; }
  .sb-at i { display: block; height: 0; overflow: hidden; }
  .sb-walkon { font-size: 13px; letter-spacing: 0.3em; }
  .sb-card { width: auto; margin: 0 12px; transform: none; }
  .sb-paper { padding: 32px 30px 28px; }
  .sb-paper::before { inset: 10px; }
  .sb-paper::after { inset: 13px; }
  .sb-ribbon { right: 16px; top: -10px; bottom: auto; height: 96px; width: 13px; }
  .sb-stop { padding-top: calc(var(--frame) * 1.02); }
  .sb-hold { height: calc(var(--frame) * 0.34); }
  .sb-h2 { font-size: 28px; }
  .sb-rubric { font-size: 16px; }
  .sb-num { font-size: 13px; }
  .sb-p, .sb-story .sb-p { font-size: 17px; }
  .sb-venues { grid-template-columns: 1fr; gap: 14px; }
  .sb-program li { grid-template-columns: 76px minmax(0, 1fr); }
  .sb-program__what, .sb-people, .sb-row--secondary .sb-people, .sb-row--little .sb-people, .sb-row--party .sb-people { font-size: 15px; }
  .sb-h3, .sb-group__t, .sb-label { font-size: 13px; letter-spacing: 0.18em; }
  .sb-row { grid-template-columns: repeat(min(var(--n), 2), minmax(0, 1fr)); }
  .sb-row--secondary { grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 8px; }
  .sb-people--cols { grid-template-columns: 1fr; }
  .sb-btn { font-size: 13px; letter-spacing: 0.18em; }
  .sb-maker { font-size: 15px; }
}
`;
