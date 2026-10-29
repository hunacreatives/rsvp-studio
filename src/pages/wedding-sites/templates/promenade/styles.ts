// Promenade: an estate garden seen from above (WebGL, on a sticky frame inside the page), the
// couple's names set on the gravel of its forecourt, and a deckled cotton-paper card at each stop,
// laid in the garden's own light. Sizes follow the page's width (container units), never the
// window's; nothing is fixed to the window.

// ---- the deckled edge: four torn strips and the middle, as a mask (any size of card)
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const LEN = 240, D = 7;
function strip(seed: number) {
  const r = rng(seed);
  const raw = Array.from({ length: LEN / 3 + 1 }, () => r());
  raw[raw.length - 1] = raw[0];
  // a soft run of fibres: averaged, then a few deeper nicks
  const ys = raw.map((_, i) => {
    const a = raw[Math.max(0, i - 1)], b = raw[i], c = raw[Math.min(raw.length - 1, i + 1)];
    const v = (a + 2 * b + c) / 4;
    return 1.2 + v * 2.6 + (b > 0.94 ? 1.2 : 0);
  });
  ys[ys.length - 1] = ys[0];
  const pts = ys.map((y, i) => `${i * 3} ${y.toFixed(2)}`).join(" L");
  const fringe = ys.map((y, i) => `${i * 3} ${Math.max(0, y - 0.9 - raw[(i + 7) % raw.length] * 0.9).toFixed(2)}`).join(" L");
  return { pts, fringe };
}
const svg = (body: string, w: number, h: number) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;
const edges = [11, 29, 47, 83].map((seed, k) => {
  const { pts, fringe } = strip(seed);
  const shape = `<path d='M0 ${D} L${fringe} L${LEN} ${D} Z' fill='#000' fill-opacity='.45'/><path d='M0 ${D} L${pts} L${LEN} ${D} Z' fill='#000'/>`;
  // 0 top, 1 bottom, 2 left, 3 right
  if (k === 0) return svg(shape, LEN, D);
  if (k === 1) return svg(`<g transform='translate(0 ${D}) scale(1 -1)'>${shape}</g>`, LEN, D);
  if (k === 2) return svg(`<g transform='translate(0 ${LEN}) rotate(-90)'>${shape}</g>`, D, LEN);
  return svg(`<g transform='translate(${D} 0) rotate(90)'>${shape}</g>`, D, LEN);
});
const DECKLE = `
  -webkit-mask-image: ${edges[0]}, ${edges[1]}, ${edges[2]}, ${edges[3]}, linear-gradient(#000, #000);
  mask-image: ${edges[0]}, ${edges[1]}, ${edges[2]}, ${edges[3]}, linear-gradient(#000, #000);
  -webkit-mask-position: 0 0, 0 100%, 0 0, 100% 0, center; mask-position: 0 0, 0 100%, 0 0, 100% 0, center;
  -webkit-mask-size: ${LEN}px ${D}px, ${LEN}px ${D}px, ${D}px ${LEN}px, ${D}px ${LEN}px, calc(100% - ${2 * D - 2}px) calc(100% - ${2 * D - 2}px);
  mask-size: ${LEN}px ${D}px, ${LEN}px ${D}px, ${D}px ${LEN}px, ${D}px ${LEN}px, calc(100% - ${2 * D - 2}px) calc(100% - ${2 * D - 2}px);
  -webkit-mask-repeat: repeat-x, repeat-x, repeat-y, repeat-y, no-repeat; mask-repeat: repeat-x, repeat-x, repeat-y, repeat-y, no-repeat;`;
// cotton paper: a fine, even tooth
const GRAIN = svg(
  `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 .36  0 0 0 0 .3  0 0 0 0 .22  0 0 0 -0.9 .56'/></filter><rect width='100%' height='100%' filter='url(#g)'/>`,
  260,
  260,
);

export const PROMENADE_CSS = `
.pm-root { --frame: 100svh; --gold-ink: color-mix(in srgb, var(--pm-gold) 62%, #4a3518); --paper: #faf6ee; --soft: color-mix(in srgb, var(--pm-ink) 74%, #8a7a66); --rule: rgba(92, 72, 48, 0.17);
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: var(--pm-ink);
  font-family: var(--pm-sans); -webkit-font-smoothing: antialiased; background: #b9ae95; }
.pm-root *, .pm-root *::before, .pm-root *::after { box-sizing: border-box; }
.pm-root p, .pm-root h1, .pm-root h2, .pm-root h3, .pm-root ol { margin: 0; }
.pm-stage { position: sticky; top: 0; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); z-index: 0; overflow: hidden; pointer-events: none;
  background: radial-gradient(ellipse at 40% 30%, #d8cdb4, #a99d82); }
.pm-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.pm-world { position: relative; }

/* ---- the forecourt: the names set on its gravel, in the garden's own ink (multiplied into it) */
.pm-gate { position: relative; height: var(--frame); }
.pm-words { position: absolute; left: 50%; top: 35%; width: min(90cqw, 980px); translate: -50% -50%; text-align: center; mix-blend-mode: multiply; }
.pm-kick { font: 600 12px/1.4 var(--pm-sans); letter-spacing: 0.44em; text-transform: uppercase; padding-left: 0.44em; }
.pm-names { margin-top: 18px !important; font: 500 clamp(56px, min(8.4cqw, calc(var(--frame) * 0.134)), 132px)/0.96 var(--pm-display); letter-spacing: -0.012em; text-wrap: balance;
  /* room inside the box for the descenders (the g of Diego): the opening's blur clips to the box */
  padding: 0.04em 0.06em 0.2em; margin-bottom: -0.2em !important; }
.pm-rule { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 22px !important; }
.pm-rule i { width: 64px; height: 1px; background: currentColor; opacity: 0.5; }
.pm-rule b { font: italic 500 22px/1 var(--pm-display); letter-spacing: 0.06em; }
.pm-date { margin-top: 18px !important; font: 500 clamp(21px, 1.9cqw, 26px)/1.3 var(--pm-display); letter-spacing: 0.02em; text-wrap: balance; }
.pm-line { margin-top: 6px !important; font: italic 400 clamp(19px, 1.6cqw, 22px)/1.4 var(--pm-display); text-wrap: balance; }
.pm-countwrap { margin-top: 24px; }
.pm-root .pm-count { display: inline-flex; gap: 0; }
.pm-root .pm-count__cell { display: inline-grid; justify-items: center; min-width: 3ch; margin: 0 clamp(10px, 1.4cqw, 18px); }
.pm-root .pm-count__n { font: 500 clamp(28px, 2.6cqw, 34px)/1 var(--pm-display); font-variant-numeric: lining-nums tabular-nums; }
.pm-root .pm-count__l { margin-top: 6px; font: 600 10px var(--pm-sans); letter-spacing: 0.24em; text-transform: uppercase; opacity: 0.8; }
.pm-root .pm-count__sep { display: none; }
.pm-walkon { position: absolute; left: 50%; bottom: 3.5svh; translate: -50% 0; display: grid; justify-items: center; gap: 8px; font: 600 11px var(--pm-sans); letter-spacing: 0.36em; text-transform: uppercase; padding-left: 0.36em;
  color: #fbf6ec; text-shadow: 0 1px 6px rgba(20, 24, 10, 0.55); white-space: nowrap; }
.pm-walkon i { width: 1px; height: 34px; background: linear-gradient(#fbf6ec, rgba(251, 246, 236, 0)); }
.pm-motion .pm-walkon i { animation: pm-line 2.6s ease-in-out infinite; transform-origin: 50% 0; }
@keyframes pm-line { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
/* the opening: the words come up out of the gravel as the camera settles */
.pm-intro .pm-words > *, .pm-intro .pm-walkon { opacity: 0; transition: opacity 1.6s ease, filter 1.8s ease, letter-spacing 2.4s cubic-bezier(.2, .7, .2, 1); filter: blur(6px); }
.pm-intro .pm-names { letter-spacing: 0.06em; }
.pm-intro.pm-named .pm-words > *, .pm-intro.pm-named .pm-walkon { opacity: 1; filter: blur(0); }
.pm-intro.pm-named .pm-names { letter-spacing: -0.012em; }
.pm-intro.pm-named .pm-words > :nth-child(1) { transition-delay: 0s; }
.pm-intro.pm-named .pm-words > :nth-child(2) { transition-delay: 0.25s; }
.pm-intro.pm-named .pm-words > :nth-child(3) { transition-delay: 0.9s; }
.pm-intro.pm-named .pm-words > :nth-child(n+4) { transition-delay: 1.2s; }
.pm-intro.pm-named .pm-walkon { transition-delay: 2s; }

/* ---- the stops: a cotton-paper card each, every one pausing in the same place (its dock: high on
   the right; the bottom edge on a phone; stroll.ts sets its top). The gap before each is the
   walk to the next part of the garden. */
.pm-stop { position: relative; padding-top: var(--frame); }
.pm-stop:last-child { padding-bottom: 2px; }
.pm-dock { position: relative; }
.pm-card { position: sticky; top: 90px; width: min(456px, 36cqw); margin: 0 7.5cqw 0 auto; isolation: isolate; rotate: -0.5deg; }
.pm-stop:nth-of-type(odd) .pm-card { rotate: 0.4deg; }
/* its shadow, from the garden's own low sun (up and to the left): long and soft, and close under it */
.pm-card::before, .pm-card::after { content: ""; position: absolute; z-index: -1; pointer-events: none; border-radius: 4px; }
.pm-card::before { inset: 14px 6px 4px 18px; background: rgba(24, 26, 8, 0.55); filter: blur(18px); translate: 18px 16px; }
.pm-card::after { inset: 5px 3px 3px 5px; background: rgba(24, 22, 8, 0.4); filter: blur(3px); translate: 3px 3px; }
.pm-hold { height: calc(var(--frame) * 0.5); }
.pm-paper { position: relative; padding: 34px 38px 32px; ${DECKLE}
  background: ${GRAIN}, linear-gradient(118deg, #fffcf6 0%, var(--paper) 45%, #f1eadd 100%); background-size: 260px 260px, 100% 100%; }
/* the blind-pressed frame */
.pm-paper::after { content: ""; position: absolute; inset: 13px; border: 1px solid rgba(110, 86, 56, 0.13); box-shadow: 1px 1px 0 rgba(255, 255, 255, 0.75), inset 1px 1px 0 rgba(255, 255, 255, 0.6); pointer-events: none; }
.pm-place { display: flex; align-items: center; gap: 12px; font: 600 11px/1.3 var(--pm-sans); letter-spacing: 0.3em; text-transform: uppercase; color: var(--soft); }
.pm-place i { flex: 0 0 30px; height: 1px; background: currentColor; opacity: 0.45; }
.pm-num { font: 600 24px/1 var(--pm-display); letter-spacing: 0.04em; color: var(--pm-gold);
  background: linear-gradient(160deg, #7a5a28 0%, #c9a866 38%, #85632c 62%, #d4b878 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.pm-h2 { margin-top: 14px !important; font: 500 clamp(38px, 3.2cqw, 46px)/1.02 var(--pm-display); letter-spacing: -0.01em; text-wrap: balance; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55); }
.pm-h3 { font: 600 11px/1.4 var(--pm-sans); letter-spacing: 0.26em; text-transform: uppercase; color: var(--soft); }
.pm-p { margin-top: 14px !important; font: 400 19px/1.55 var(--pm-display); text-wrap: pretty; }
.pm-small { margin-top: 4px !important; font-size: 15px; line-height: 1.55; color: var(--soft); text-wrap: pretty; }
.pm-hint { margin-top: 12px !important; font-size: 15px; font-style: italic; opacity: 0.6; }
.pm-part { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--rule); }
.pm-h2 + .pm-part { margin-top: 18px; }
.pm-row { display: grid; gap: 2px; padding: 8px 0; }
.pm-row b { font: 500 21px/1.2 var(--pm-display); }
.pm-row span { font-size: 15px; line-height: 1.5; color: var(--soft); }
.pm-link { justify-self: start; display: inline-flex; align-items: center; min-height: 44px; padding: 0; border: 0; background: none; font: inherit; font-size: 14px; color: inherit; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.pm-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }

.pm-story { list-style: none; padding: 0; margin-top: 18px !important; display: grid; gap: 16px; }
.pm-story li { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 12px; align-items: baseline; }
.pm-story__year { font: italic 500 21px var(--pm-display); color: var(--gold-ink); }
.pm-story__body { font-size: 15px; line-height: 1.6; color: var(--soft); text-wrap: pretty; }
.pm-story__body b { display: block; margin-bottom: 2px; font: 500 22px/1.2 var(--pm-display); color: var(--pm-ink); }

.pm-venue { margin-top: 12px; }
.pm-venue__name { font: 500 25px/1.2 var(--pm-display); text-wrap: balance; }
.pm-venue__links { margin-top: 4px; }
.pm-program { list-style: none; padding: 0; margin-top: 18px !important; border-top: 1px solid var(--rule); }
.pm-program li { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 12px; align-items: baseline; padding: 9px 0; border-bottom: 1px solid var(--rule); }
.pm-program__time { font: italic 500 18px var(--pm-display); color: var(--gold-ink); white-space: nowrap; }
.pm-program__what { font-size: 15px; line-height: 1.45; }
.pm-program__what em { display: block; font-style: normal; font-size: 14px; color: var(--soft); }

.pm-dress { display: block; width: min(100%, 340px); height: auto; margin: 14px auto 0; }
.pm-swatches { display: flex; gap: 10px; margin-top: 14px; }
.pm-swatches i { width: 26px; height: 26px; border-radius: 50%; box-shadow: 0 0 0 3px var(--paper), 0 0 0 4px var(--rule); }

.pm-faqs details { border-bottom: 1px solid var(--rule); }
.pm-faqs summary { display: flex; justify-content: space-between; gap: 12px; min-height: 48px; align-items: center; font: 500 19px/1.3 var(--pm-display); cursor: pointer; list-style: none; }
.pm-faqs summary::-webkit-details-marker { display: none; }
.pm-faqs summary::after { content: "+"; font: 300 22px var(--pm-sans); color: var(--pm-gold); }
.pm-faqs details[open] summary::after { content: "–"; }
.pm-faqs details .pm-small { margin: 0 0 14px !important; }

.pm-carousel { position: relative; margin-top: 16px; }
.pm-carousel__track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
.pm-carousel__track::-webkit-scrollbar { display: none; }
.pm-carousel__slide { flex: 0 0 100%; scroll-snap-align: center; aspect-ratio: 4 / 5; padding: 0 2px; }
.pm-carousel__slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pm-carousel__dots { display: flex; justify-content: center; gap: 6px; margin-top: 12px; }
.pm-carousel__dots { gap: 0; margin-top: 2px; }
.pm-carousel__dots button { position: relative; width: 26px; height: 44px; padding: 0; border: 0; background: none; cursor: pointer; }
.pm-carousel__dots button::before { content: ""; position: absolute; left: 50%; top: 50%; width: 7px; height: 7px; translate: -50% -50%; border-radius: 999px; background: var(--rule); transition: width 0.25s; }
.pm-carousel__dots button.is-on::before { width: 20px; background: var(--pm-ink); }

/* ---- the reply, at the pavilion */
.pm-form { display: grid; gap: 16px; margin-top: 18px; }
.pm-label { display: block; margin: 0 0 8px; font: 600 11px var(--pm-sans); letter-spacing: 0.22em; text-transform: uppercase; color: var(--soft); }
.pm-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.pm-pill { min-height: 48px; padding: 0 22px; border: 1px solid rgba(70, 54, 40, 0.35); border-radius: 999px; background: rgba(255, 255, 255, 0.35); font: 500 18px var(--pm-display); color: var(--pm-ink); cursor: pointer; transition: background 0.2s, color 0.2s; }
.pm-pill--n { width: 48px; padding: 0; font-family: var(--pm-sans); font-size: 15px; }
.pm-pill.is-picked { background: var(--pm-ink); border-color: var(--pm-ink); color: var(--paper); }
.pm-field { display: block; width: 100%; min-height: 50px; padding: 12px 14px; border: 1px solid rgba(70, 54, 40, 0.25); border-radius: 2px; background: rgba(255, 255, 255, 0.6); font: 16px var(--pm-sans); color: var(--pm-ink); }
.pm-field:focus { outline: none; border-color: var(--pm-ink); }
textarea.pm-field { resize: vertical; min-height: 92px; }
.pm-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; padding: 0 28px; border: 0; border-radius: 999px; background: var(--pm-ink); color: var(--paper); font: 600 12px var(--pm-sans); letter-spacing: 0.22em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
.pm-btn--line { background: transparent; color: var(--pm-ink); box-shadow: inset 0 0 0 1px rgba(70, 54, 40, 0.4); }
.pm-btn--wide { width: 100%; }
.pm-btn:disabled { opacity: 0.6; cursor: default; }
.pm-text { margin: 0; font-size: 15px; line-height: 1.55; color: var(--soft); }
.pm-text--soft { font-style: italic; }
.pm-error { margin: 0; color: #9b1c1c; font-size: 15px; }
.pm-thanks { position: relative; display: grid; justify-items: start; gap: 8px; margin-top: 14px; }
.pm-thanks__big { margin: 0; font: italic 500 34px var(--pm-display); }
.pm-confetti { position: absolute; left: 50%; top: 0; pointer-events: none; z-index: 5; }
.pm-confetti span { position: absolute; left: 0; top: 0; border-radius: 1px; animation: pm-bits 2.4s cubic-bezier(.3, .1, .5, 1) both; }
@keyframes pm-bits { 0% { transform: translate(0, 0) rotate(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(var(--x), var(--y)) rotate(var(--r)); opacity: 0; } }
.pm-root .pm-open { animation: pm-open 0.5s cubic-bezier(.2, .8, .2, 1) both; display: grid; gap: 16px; }
@keyframes pm-open { from { opacity: 0; transform: translateY(8px); } }
.pm-maker--end { position: relative; margin: 0 auto 18px !important; width: max-content; max-width: calc(100% - 32px); padding: 8px 14px !important; border: 0 !important; background: rgba(250, 246, 238, 0.9); }
.pm-maker { text-wrap: balance; margin-top: 18px !important; padding-top: 14px; border-top: 1px solid var(--rule); font-size: 12px; letter-spacing: 0.04em; color: var(--soft); }

.pm-gallery { --frame: 75cqw; }
.pm-gallery .pm-words { top: 27%; }
.pm-gallery .pm-names { font-size: 7.4cqw; }
.pm-nogl .pm-stage { background: radial-gradient(ellipse at 50% 30%, #ddd2b8, #b3a78b); }
@media (prefers-reduced-motion: reduce) { .pm-root *, .pm-root *::before, .pm-root *::after { animation: none !important; transition: none !important; } }

/* ---- a phone: the garden above, the card on the bottom edge */
@container (max-width: 700px) {
  .pm-words { top: 33%; width: calc(100% - 32px); }
  .pm-kick { font-size: 12px; letter-spacing: 0.34em; padding-left: 0.34em; }
  .pm-names { font-size: clamp(50px, 15.5cqw, 78px); margin-top: 14px !important; }
  .pm-rule { margin-top: 16px !important; }
  .pm-date { font-size: 21px; }
  .pm-line { font-size: 19px; }
  .pm-root .pm-count__cell { margin: 0 8px; }
  .pm-root .pm-count__l { font-size: 10px; letter-spacing: 0.18em; }
  .pm-walkon { font-size: 12px; }
  .pm-card { width: auto; margin: 0 12px; rotate: none !important; }
  .pm-card::before { translate: 12px 12px; filter: blur(14px); }
  .pm-paper { padding: 26px 22px 24px; }
  .pm-paper::after { inset: 9px; }
  .pm-place { font-size: 13px; letter-spacing: 0.2em; }
  .pm-stop { padding-top: calc(var(--frame) * 1.02); }
  .pm-hold { height: calc(var(--frame) * 0.34); }
  .pm-h2 { font-size: 36px; }
  .pm-story li { grid-template-columns: 50px minmax(0, 1fr); gap: 10px; }
  .pm-program li { grid-template-columns: 78px minmax(0, 1fr); }
  .pm-program__what em, .pm-link, .pm-maker { font-size: 15px; }
  .pm-label, .pm-h3 { font-size: 13px; letter-spacing: 0.18em; }
  .pm-btn { font-size: 13px; letter-spacing: 0.18em; }
  .pm-pills { gap: 7px; }
  .pm-pill--n { width: 44px; min-height: 44px; }
  .pm-root .pm-count__l { font-size: 11px; letter-spacing: 0.14em; }
}
`;
