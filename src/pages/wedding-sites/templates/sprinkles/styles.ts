// Sprinkles: a real cake. The first screen is its top, from above (a canvas, cake.ts); then each
// section is a layer of its cut face (a sponge texture tiled by the browser, the band above it on
// a canvas), the outer buttercream coat down each side, the table behind. Words are plain and
// crisp; the headings are sprinkles (the sticky canvas over everything, never in the way of a
// tap). Sizes follow the page's own width (container units), never the window's.

export const SPRINKLES_CSS = `
.sp-root { --frame: 100svh; --side: max(56px, calc((100cqw - 1180px) / 2)); --coat: 22px; --band: calc(var(--frame) * 0.2); --cap: 260px; --base: 150px;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate;
  background: var(--sp-table) var(--sp-tile-table); color: var(--sp-ink); font-family: var(--sp-body); -webkit-font-smoothing: antialiased; }
.sp-root *, .sp-root *::before, .sp-root *::after { box-sizing: border-box; }
.sp-root p, .sp-root h1, .sp-root h2 { margin: 0; }

.sp-stage { position: sticky; top: 0; z-index: 5; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); pointer-events: none; }
.sp-view { position: absolute; left: 0; top: 0; display: block; }

/* ---- every section a screen */
.sp-sec { position: relative; z-index: 1; min-height: var(--frame); display: flex; flex-direction: column; justify-content: center; }
.sp-in { position: relative; z-index: 3; width: min(1000px, calc(100cqw - 2 * var(--side) - 2 * var(--coat) - 120px)); margin: 0 auto; }

/* the heading: the words are there but unseen; the sprinkles are drawn over them */
.sp-h { position: relative; }
.sp-h__t { font: 800 var(--hs, 120px) / 0.92 var(--sp-display); letter-spacing: 0; color: transparent; text-wrap: balance; overflow-wrap: break-word; }
.sp-h__c { position: absolute; left: -40px; top: -40px; pointer-events: none; }
.sp-editor .sp-h__t { caret-color: var(--sp-ink); }
.sp-editor .sp-h:focus-within .sp-h__t { color: color-mix(in srgb, var(--sp-ink) 55%, transparent); }
.sp-editor .sp-h:focus-within .sp-h__c { opacity: 0.25; }

/* ---- the top of the cake */
.sp-open { padding: 0; }
.sp-top { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.sp-top__c { position: absolute; left: 0; top: 0; display: block; }
.sp-open .sp-in { text-align: center; padding: 3svh 0 4svh; }
.sp-toprow { display: flex; justify-content: center; align-items: flex-end; gap: 44px; margin-bottom: 26px; }
.sp-candle { position: relative; flex: none; cursor: pointer; touch-action: auto; }
.sp-still .sp-candle { cursor: default; }
.sp-candle canvas { position: absolute; display: block; pointer-events: none; }
.sp-kick { font: 600 14px/1.3 var(--sp-body); letter-spacing: 0.18em; text-transform: uppercase; color: var(--sp-muted); }
.sp-h--name { margin-top: 18px; }
.sp-h--name .sp-h__t { line-height: 0.9; }
.sp-name { display: block; font-size: var(--ns); }
.sp-age { display: block; font-size: calc(var(--ns) * 0.56); margin-top: 0.06em; }
.sp-meta { margin-top: 30px !important; font: 500 19px/1.55 var(--sp-body); text-wrap: balance; }
.sp-meta span { display: inline-block; white-space: nowrap; }
.sp-meta span + span::before { content: "·"; margin: 0 0.6em; color: var(--sp-muted); }
.sp-meta .sp-meta__at { display: block; }
.sp-meta .sp-meta__at::before { content: none; }
.sp-cue { position: absolute; z-index: 3; left: 50%; bottom: max(18px, 2.4svh); translate: -50% 0; display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 12px; border: 0; background: none; cursor: pointer;
  color: var(--sp-muted); font: 600 13px/1 var(--sp-body); letter-spacing: 0.16em; text-transform: uppercase; white-space: nowrap; }
.sp-cue svg { width: 13px; height: 13px; }
.sp-motion.sp-opened .sp-cue svg { animation: sp-bob 1.6s ease-in-out infinite; }
@keyframes sp-bob { 50% { transform: translateY(3px); } }
.sp-boot .sp-meta, .sp-boot .sp-cue { opacity: 0; transition: opacity 0.7s ease; }
.sp-boot.sp-opened .sp-meta, .sp-boot.sp-opened .sp-cue { opacity: 1; }
.sp-boot.sp-opened .sp-cue { transition-delay: 0.25s; }

/* ---- an edible photo print, pressed into the icing */
.sp-print { position: relative; flex: none; width: var(--pw, 200px); aspect-ratio: 1; rotate: var(--rot, 0deg); }
.sp-print__deco { position: absolute; z-index: 3; left: -40%; top: -40%; width: 180%; height: 180%; pointer-events: none; overflow: visible; }
.sp-print__img { position: absolute; inset: 0; z-index: 1; border-radius: 50%; overflow: hidden; background: var(--sp-frost-lo); }
.sp-print__img img { filter: saturate(0.9) contrast(0.95) brightness(1.03); }
.sp-print::after { content: ""; position: absolute; inset: 0; z-index: 2; border-radius: 50%; pointer-events: none;
  box-shadow: inset 3px 4px 10px rgba(40, 10, 5, 0.35), inset -2px -2px 5px rgba(255, 255, 255, 0.3); }
.sp-print .photo-slot--empty { display: grid; place-items: center; text-align: center; font: 600 13px/1.3 var(--sp-body); color: var(--sp-ink); background: color-mix(in srgb, var(--sp-frost-lo) 60%, transparent); }
.sp-print .photo-slot__label { display: grid; justify-items: center; gap: 4px; padding: 10px; }
.sp-print--hero { --pw: 150px; --rot: -4deg; }

/* ---- the layers of the cut cake */
.sp-layer { padding: calc(var(--band) / 2 + 28px) 0 calc(var(--band) / 2 + 28px); }
.sp-face { position: absolute; z-index: 0; top: 0; bottom: 0; left: var(--side); right: var(--side);
  background: var(--sp-sponge-a) var(--sp-tile-a); border-inline: var(--coat) solid var(--sp-frost);
  border-image: linear-gradient(90deg, var(--sp-frost-hi), var(--sp-frost) 45%, var(--sp-frost-lo)) 1;
  box-shadow: 14px 0 34px rgba(30, 10, 5, 0.18), -6px 0 24px rgba(30, 10, 5, 0.08); }
.sp-face::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(40, 15, 5, 0.12), transparent 14%, transparent 86%, rgba(40, 15, 5, 0.14)); }
.sp-face--b { background: var(--sp-sponge-b) var(--sp-tile-b); }
.sp-face--cream { background: var(--sp-cream) var(--sp-tile-cream); }
.sp-on-cream { --sp-ink: var(--sp-cream-ink); --sp-muted: var(--sp-cream-muted); color: var(--sp-ink); }
.sp-band { position: absolute; z-index: 2; left: calc(var(--side) + var(--coat)); width: calc(100cqw - 2 * var(--side) - 2 * var(--coat)); pointer-events: none; display: block; }
.sp-band--fill { top: calc(var(--band) / -2); height: var(--band); }
.sp-band--cap { top: 0; height: var(--cap); left: var(--side); width: calc(100cqw - 2 * var(--side)); }
.sp-first { padding-top: calc(var(--cap) * 0.62); }
.sp-band--base { top: 0; height: var(--base); left: var(--side); width: calc(100cqw - 2 * var(--side)); }
.sp-board { padding-top: calc(var(--base) + 30px); padding-bottom: 8svh; justify-content: flex-start; }

.sp-body { margin-top: 40px; }
.sp-lead { font: 600 30px/1.22 var(--sp-body); letter-spacing: -0.01em; text-wrap: balance; }
.sp-lead span { display: inline-block; }
.sp-lead .sp-at::before { content: "·"; margin: 0 0.5em; color: var(--sp-muted); }
.sp-lead--text { font-weight: 500; font-size: 28px; line-height: 1.38; max-width: 32ch; text-wrap: pretty; }
.sp-sub { font-size: 20px; line-height: 1.45; color: var(--sp-muted); margin-top: 8px !important; text-wrap: balance; }
.sp-p { font-size: 19px; line-height: 1.55; margin-top: 20px !important; max-width: 52ch; text-wrap: pretty; }
.sp-p--big { font-size: 25px; line-height: 1.45; font-weight: 500; margin-top: 0 !important; max-width: 34ch; }
.sp-faint { opacity: 0.5; }
.sp-links { margin-top: 24px; }

.sp-plan { display: grid; grid-template-columns: 1fr 1fr; gap: 0 56px; margin-top: 28px; }
.sp-row { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 14px; align-items: baseline; padding: 15px 0 14px; border-top: 1px solid var(--sp-line); }
.sp-row b { font-weight: 600; font-size: 17px; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--sp-muted); }
.sp-row span { font-size: 20px; line-height: 1.35; text-wrap: balance; }
.sp-row em { display: block; font-style: normal; font-size: 16px; color: var(--sp-muted); margin-top: 3px; text-wrap: pretty; }

.sp-faqs { columns: 2; column-gap: 64px; }
.sp-faq { break-inside: avoid; padding: 16px 0 18px; border-top: 1px solid var(--sp-line); }
.sp-faq b { display: block; font-weight: 600; font-size: 20px; line-height: 1.35; text-wrap: balance; }
.sp-faq span { display: block; font-size: 18px; line-height: 1.5; color: var(--sp-muted); margin-top: 5px; text-wrap: pretty; }

.sp-prints { display: flex; flex-wrap: wrap; justify-content: center; gap: 40px 80px; padding: 50px 0 30px; }
.sp-prints .sp-print { --pw: 200px; }
.sp-print--0 { --rot: -3deg; } .sp-print--1 { --rot: 4deg; translate: 0 26px; } .sp-print--2 { --rot: -2deg; } .sp-print--3 { --rot: 5deg; translate: 0 26px; }
.sp-prints.n1 .sp-print { --pw: 260px; }

.sp-btns { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.sp-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 26px; border: 0; border-radius: 999px; background: var(--sp-btn); color: var(--sp-btn-ink);
  font: 600 17px/1.2 var(--sp-body); text-decoration: none; cursor: pointer; transition: transform 0.15s ease; }
.sp-btn:active { transform: scale(0.98); }
.sp-btn--line, .sp-btn--quiet { background: transparent; color: var(--sp-ink); box-shadow: inset 0 0 0 1.5px var(--sp-ink); }
.sp-btn--quiet { margin-top: 24px; }
.sp-gifts { margin-top: 24px; }

/* ---- the reply, on the board */
.sp-reply { max-width: 660px; }
.sp-small { font-size: 16px; line-height: 1.5; color: var(--sp-muted); margin-top: 12px !important; text-wrap: pretty; }
.sp-small--top { margin: 0 0 22px !important; }
.sp-choice { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sp-choice button { min-height: 56px; padding: 0 12px; border: 0; border-radius: 999px; background: var(--sp-field); color: var(--sp-ink); box-shadow: inset 0 0 0 1.5px var(--sp-line);
  font: 600 18px/1.2 var(--sp-body); cursor: pointer; white-space: nowrap; transition: background 0.2s ease, color 0.2s ease; }
.sp-choice button.is-on { background: var(--sp-btn); color: var(--sp-btn-ink); box-shadow: none; }
.sp-form label { display: block; margin-top: 20px; font: 600 13px/1.4 var(--sp-body); letter-spacing: 0.1em; text-transform: uppercase; color: var(--sp-muted); }
.sp-field { display: block; width: 100%; margin-top: 8px; padding: 13px 16px; border: 0; border-radius: 14px; background: var(--sp-field); color: var(--sp-ink);
  font: 18px/1.35 var(--sp-body); letter-spacing: 0; text-transform: none; box-shadow: inset 0 0 0 1px var(--sp-line); }
.sp-field:focus { outline: none; box-shadow: inset 0 0 0 2px var(--sp-ink); }
textarea.sp-field { resize: vertical; min-height: 64px; }
.sp-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.sp-pair > div { min-width: 0; }
.sp-link { display: inline-block; margin-top: 4px; padding: 8px 0; border: 0; background: none; color: var(--sp-muted); font: 15px var(--sp-body); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.sp-seats { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; font: 600 13px var(--sp-body); letter-spacing: 0.1em; text-transform: uppercase; color: var(--sp-muted); }
.sp-seats__ctrl { display: inline-flex; align-items: center; gap: 18px; font: 600 20px var(--sp-body); letter-spacing: 0; color: var(--sp-ink); }
.sp-seats__ctrl button { width: 44px; height: 44px; border: 0; border-radius: 50%; background: var(--sp-field); color: var(--sp-ink); box-shadow: inset 0 0 0 1.5px var(--sp-line); font: 500 22px/1 var(--sp-body); cursor: pointer; }
.sp-seats__ctrl button:disabled { opacity: 0.4; cursor: default; }
.sp-error { color: #b3261e; font-size: 16px; margin-top: 14px !important; }
.sp-chocolate .sp-error { color: #ffb4a8; }
.sp-send { width: 100%; margin-top: 26px; min-height: 58px; font-size: 18px; }
.sp-send:disabled { opacity: 0.75; cursor: default; }
.sp-maker { margin-top: 40px !important; font: 600 12px/1.5 var(--sp-body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--sp-muted); }
.sp-end { position: relative; z-index: 1; padding: 40px 24px 60px; text-align: center; }

.sp-gallery { --frame: 75cqw; }
.sp-gallery .sp-name { font-size: calc(var(--ns) * 1.1); }
.sp-gallery .sp-age { font-size: calc(var(--ns) * 0.62); }
@media (prefers-reduced-motion: reduce) { .sp-root *, .sp-root *::before, .sp-root *::after { animation: none !important; transition: none !important; } }

/* ---- phones: the cake fills the width; one column, every stop composed for the screen */
@container (max-width: 700px) {
  /* (the root is the container, so its own variables are set on its children) */
  .sp-root > * { --side: 0px; --coat: 9px; --band: calc(var(--frame) * 0.21); --cap: 200px; --base: 112px; }
  .sp-in { width: calc(100cqw - 48px); }
  .sp-h__t { font-size: var(--hs-m, 72px); }
  .sp-name { font-size: var(--ns-m); }
  .sp-age { font-size: calc(var(--ns-m) * 0.58); }
  .sp-meta .sp-meta__at { display: block; }
  .sp-meta .sp-meta__at::before { content: none; }
  .sp-meta { font-size: 17px; margin-top: 24px !important; }
  .sp-kick { font-size: 12.5px; }
  .sp-toprow { gap: 30px; margin-bottom: 22px; }
  .sp-print--hero { --pw: 116px; }
  .sp-layer { padding-top: calc(var(--band) / 2 + 22px); padding-bottom: calc(var(--band) / 2 + 22px); }
  .sp-first { padding-top: calc(var(--cap) * 0.66); }
  .sp-board { padding-top: calc(var(--base) + 20px); }
  .sp-body { margin-top: 26px; }
  .sp-plan { grid-template-columns: 1fr; margin-top: 22px; }
  .sp-lead { font-size: 23px; }
  .sp-lead .sp-at { display: block; }
  .sp-lead .sp-at::before { content: none; }
  .sp-lead .sp-at { font-weight: 500; font-size: 19px; color: var(--sp-muted); margin-top: 4px; }
  .sp-lead--text { font-size: 22px; line-height: 1.4; }
  .sp-sub { font-size: 17.5px; }
  .sp-p { font-size: 17.5px; margin-top: 16px !important; }
  .sp-p--big { font-size: 20.5px; margin-top: 0 !important; }
  .sp-row { grid-template-columns: 80px minmax(0, 1fr); gap: 12px; padding: 12px 0 11px; }
  .sp-row b { font-size: 15px; }
  .sp-row span { font-size: 17.5px; }
  .sp-row em { font-size: 15px; }
  .sp-faqs { columns: 1; }
  .sp-faq { padding: 13px 0 14px; }
  .sp-faq b { font-size: 18px; }
  .sp-faq span { font-size: 16px; }
  .sp-prints { gap: 34px 40px; padding: 34px 0 20px; }
  .sp-prints .sp-print { --pw: 128px; }
  .sp-prints.n1 .sp-print { --pw: 200px; }
  .sp-pair { grid-template-columns: 1fr; }
  .sp-choice button { font-size: 16.5px; }
  .sp-field { font-size: 17px; }
}
`;
