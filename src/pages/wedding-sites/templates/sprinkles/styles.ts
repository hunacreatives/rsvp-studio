// Sprinkles: flat frosting, big headings made of sprinkles, and plain crisp type for everything
// else. Sizes follow the page's own width (container units), never the window's. The sprinkles'
// canvas is a sticky frame inside the page, over the words but never in the way of a tap.

export const SPRINKLES_CSS = `
.sp-root { --frame: 100svh; position: relative; container-type: inline-size; overflow: clip; isolation: isolate;
  background: var(--sp-bg); color: var(--sp-ink); font-family: var(--sp-body); -webkit-font-smoothing: antialiased; }
.sp-root *, .sp-root *::before, .sp-root *::after { box-sizing: border-box; }
.sp-root p, .sp-root h1, .sp-root h2 { margin: 0; }

.sp-stage { position: sticky; top: 0; z-index: 3; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); pointer-events: none; }
.sp-view { position: absolute; left: 0; top: 0; display: block; }

/* ---- every section a screen, its heading in the same place */
.sp-sec { position: relative; z-index: 1; min-height: var(--frame); padding: calc(var(--frame) * 0.15) 0 calc(var(--frame) * 0.1); }
.sp-in { position: relative; width: min(1120px, calc(100cqw - 112px)); margin: 0 auto; }

/* the heading: the words are there but unseen; the sprinkles are drawn over them */
.sp-h { position: relative; }
.sp-h__t { font: 800 var(--hs, 120px) / 0.92 var(--sp-display); letter-spacing: 0; color: transparent; text-wrap: balance; overflow-wrap: break-word; }
.sp-h__c { position: absolute; left: -40px; top: -40px; pointer-events: none; }
.sp-editor .sp-h__t { caret-color: var(--sp-ink); }
.sp-editor .sp-h:focus-within .sp-h__t { color: color-mix(in srgb, var(--sp-ink) 55%, transparent); }
.sp-editor .sp-h:focus-within .sp-h__c { opacity: 0.25; }

.sp-body { margin-top: 48px; max-width: 660px; }
.sp-body.is-wide { max-width: none; display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 0 80px; align-items: start; }
.sp-lead { font: 600 30px/1.22 var(--sp-body); letter-spacing: -0.01em; text-wrap: balance; }
.sp-lead--text { font-weight: 500; font-size: 28px; line-height: 1.38; max-width: 32ch; text-wrap: pretty; }
.sp-sub { font-size: 20px; line-height: 1.45; color: var(--sp-muted); margin-top: 8px !important; text-wrap: balance; }
.sp-p { font-size: 19px; line-height: 1.55; margin-top: 20px !important; max-width: 52ch; text-wrap: pretty; }
.sp-p--big { font-size: 25px; line-height: 1.45; font-weight: 500; margin-top: 0 !important; max-width: 34ch; }
.sp-faint { opacity: 0.5; }
.sp-links { margin-top: 24px; }

.sp-plan { border-bottom: 1px solid var(--sp-line); }
.sp-row { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 16px; align-items: baseline; padding: 15px 0 14px; border-top: 1px solid var(--sp-line); }
.sp-row b { font-weight: 600; font-size: 17px; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--sp-muted); }
.sp-row span { font-size: 20px; line-height: 1.35; text-wrap: balance; }
.sp-row em { display: block; font-style: normal; font-size: 16px; color: var(--sp-muted); margin-top: 3px; text-wrap: pretty; }

.sp-faqs { grid-column: 1 / -1; columns: 2; column-gap: 80px; }
.sp-faq { break-inside: avoid; padding: 16px 0 18px; border-top: 1px solid var(--sp-line); }
.sp-faq b { display: block; font-weight: 600; font-size: 20px; line-height: 1.35; text-wrap: balance; }
.sp-faq span { display: block; font-size: 18px; line-height: 1.5; color: var(--sp-muted); margin-top: 5px; text-wrap: pretty; }

.sp-btns { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.sp-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 26px; border: 0; border-radius: 999px; background: var(--sp-btn); color: var(--sp-btn-ink);
  font: 600 17px/1.2 var(--sp-body); text-decoration: none; cursor: pointer; transition: transform 0.15s ease; }
.sp-btn:active { transform: scale(0.98); }
.sp-btn--line, .sp-btn--quiet { background: transparent; color: var(--sp-ink); box-shadow: inset 0 0 0 1.5px var(--sp-ink); }
.sp-btn--quiet { margin-top: 24px; }
.sp-gifts { margin-top: 24px; }

/* ---- the first screen: the name and the age */
.sp-open { display: flex; align-items: center; padding: 0; }
.sp-open .sp-in { text-align: center; padding: calc(var(--frame) * 0.04) 0 calc(var(--frame) * 0.06); }
.sp-kick { font: 600 15px/1.3 var(--sp-body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--sp-muted); }
.sp-h--name { margin-top: 30px; }
.sp-h--name .sp-h__t { line-height: 0.9; }
.sp-name { display: block; font-size: var(--ns); }
.sp-age { display: block; font-size: calc(var(--ns) * 0.56); margin-top: 0.06em; }
.sp-meta { margin-top: 40px !important; font: 500 20px/1.55 var(--sp-body); text-wrap: balance; }
.sp-meta span { display: inline-block; white-space: nowrap; }
.sp-meta span + span::before { content: "·"; margin: 0 0.6em; color: var(--sp-muted); }
.sp-cue { position: absolute; left: 50%; bottom: max(20px, calc(var(--frame) * 0.04)); translate: -50% 0; display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 12px; border: 0; background: none; cursor: pointer;
  color: var(--sp-muted); font: 600 13px/1 var(--sp-body); letter-spacing: 0.16em; text-transform: uppercase; }
.sp-open .sp-in { position: static; }
.sp-cue svg { width: 13px; height: 13px; }
.sp-motion.sp-opened .sp-cue svg { animation: sp-bob 1.6s ease-in-out infinite; }
@keyframes sp-bob { 50% { transform: translateY(3px); } }
.sp-boot .sp-meta, .sp-boot .sp-cue { opacity: 0; translate: 0 10px; transition: opacity 0.7s ease, translate 0.7s cubic-bezier(.2, .7, .2, 1); }
.sp-boot .sp-cue { translate: -50% 10px; }
.sp-boot.sp-opened .sp-meta { opacity: 1; translate: 0 0; }
.sp-boot.sp-opened .sp-cue { opacity: 1; translate: -50% 0; transition-delay: 0.2s; }

/* ---- the reply */
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
.sp-sec--rsvp { padding-bottom: calc(var(--frame) * 0.14); }
.sp-end { position: relative; z-index: 1; padding: 40px 24px 60px; text-align: center; }

.sp-gallery { --frame: 75cqw; }
.sp-gallery .sp-name { font-size: calc(var(--ns) * 1.2); }
.sp-gallery .sp-age { font-size: calc(var(--ns) * 0.67); }
@media (prefers-reduced-motion: reduce) { .sp-root *, .sp-root *::before, .sp-root *::after { animation: none !important; transition: none !important; } }

/* ---- phones: one column, the headings as big as the width allows */
@container (max-width: 700px) {
  .sp-in { width: calc(100cqw - 44px); }
  .sp-sec { padding-top: calc(var(--frame) * 0.12); padding-bottom: calc(var(--frame) * 0.08); }
  .sp-h__t { font-size: var(--hs-m, 72px); }
  .sp-name { font-size: var(--ns-m); }
  .sp-age { font-size: calc(var(--ns-m) * 0.58); }
  .sp-meta .sp-meta__at { display: block; }
  .sp-meta .sp-meta__at::before { content: none; }
  .sp-body { margin-top: 30px; }
  .sp-body.is-wide { display: block; }
  .sp-plan { margin-top: 26px; }
  .sp-lead { font-size: 23px; }
  .sp-lead--text { font-size: 22px; line-height: 1.4; }
  .sp-sub { font-size: 17.5px; }
  .sp-p { font-size: 17.5px; margin-top: 16px !important; }
  .sp-p--big { font-size: 20.5px; margin-top: 0 !important; }
  .sp-row { grid-template-columns: 82px minmax(0, 1fr); gap: 12px; padding: 12px 0 11px; }
  .sp-row b { font-size: 15px; }
  .sp-row span { font-size: 17.5px; }
  .sp-row em { font-size: 15px; }
  .sp-faqs { columns: 1; }
  .sp-faq { padding: 13px 0 14px; }
  .sp-faq b { font-size: 18px; }
  .sp-faq span { font-size: 16px; }
  .sp-kick { font-size: 13px; }
  .sp-h--name { margin-top: 22px; }
  .sp-meta { font-size: 17.5px; margin-top: 30px !important; }
  .sp-pair { grid-template-columns: 1fr; }
  .sp-choice button { font-size: 16.5px; }
  .sp-field { font-size: 17px; }
}
`;
