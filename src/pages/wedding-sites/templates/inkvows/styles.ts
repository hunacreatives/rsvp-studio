// Ink and vows: one long sheet of heavy cotton paper, close up, in window light; every section
// laid out the same from the top of its screen (so it docks in the same place), the heading
// written by the pen, the rest set like a fine magazine page. Sizes follow the page's width
// (container units) and its screen's height (--frame); nothing is fixed to the window.
const A = "/event-templates/inkvows";
export const INKVOWS_CSS = `
.iv-root { --frame: 100svh;
  --ink: var(--iv-ink, #1b2130); --paper: #f4efe5;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: var(--ink);
  font-family: var(--iv-text); -webkit-font-smoothing: antialiased; background: var(--paper); }
.iv-root > * { --side: max(64px, calc((100cqw - clamp(1240px, 70cqw, 1760px)) / 2)); --top: calc(var(--frame) * 0.25);
  --h2: clamp(72px, min(7.9cqw, calc(var(--frame) * 0.14)), 186px); --fs: clamp(17px, 1.42cqw, 26px); --fk: clamp(12px, 0.9cqw, 16px);
  --nm: clamp(60px, min(calc(12.5cqw * var(--iv-namek, 1)), calc(var(--frame) * 0.15)), 240px); }
.iv-root *, .iv-root *::before, .iv-root *::after { box-sizing: border-box; }
.iv-root p, .iv-root h1, .iv-root h2, .iv-root h3, .iv-root ol, .iv-root ul { margin: 0; }
.iv-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* ---- the sheet: cotton fibres and tooth (512px tile at 2×), the pulp's soft formation over it */
.iv-world { position: relative; z-index: 1;
  background: url(${A}/formation.webp) 0 0 / 1500px 1500px, url(${A}/paper.webp) 0 0 / 512px 512px, var(--paper); }
/* the window: light falling across from the upper left, the far corner a shade darker */
.iv-stage { position: sticky; top: 0; height: var(--frame); margin-bottom: calc(var(--frame) * -1); z-index: 3; pointer-events: none; overflow: clip; }
.iv-light { position: absolute; inset: 0;
  background:
    radial-gradient(130% 95% at 4% 0%, rgba(255,251,242,0.34), rgba(255,251,242,0.1) 38%, rgba(255,251,242,0) 62%),
    radial-gradient(110% 85% at 100% 100%, rgba(58,40,22,0.13), rgba(58,40,22,0) 62%),
    linear-gradient(180deg, rgba(58,40,22,0) 72%, rgba(58,40,22,0.05) 100%); }

/* ---- the pen (pen.tsx): moved by transforms only */
.iv-pen { position: absolute; left: 0; top: 0; width: 0; height: 0; z-index: 2; }
.iv-pen__part { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; will-change: transform; }
.iv-pen__part svg { position: absolute; overflow: visible; display: block; }
.iv-pen__shade svg { fill: rgba(40,27,14,0.5); filter: blur(4px); }

/* ---- written lines: the real text, transparent, and the ink over it */
.iv-ink { position: relative; }
.iv-ink__t { color: transparent; }
.iv-ink__c { position: absolute; left: 0; top: 0; pointer-events: none; }
.iv-ink--edit { color: var(--ink); }

/* ---- every section: a screen of the sheet, laid out from the same line */
.iv-stop { position: relative; min-height: var(--frame); display: grid; align-content: safe center; padding: calc(var(--frame) * 0.1) var(--side); }
.iv-spread { display: grid; grid-template-columns: minmax(0, 6fr) minmax(0, 5fr); column-gap: 6cqw; align-items: center; }
.iv-head { position: relative; display: grid; justify-items: start; gap: 0; }
.iv-body { display: grid; gap: 24px; align-content: start; max-width: calc(var(--fs) * 32); }
/* the reply grows as it's filled in: it keeps its place from the top instead */
.iv-stop--rsvp { align-content: start; padding-top: calc(var(--frame) * 0.2); }
.iv-stop--rsvp .iv-spread { align-items: start; }
/* the pen's flourish under each heading */
.iv-flourish { position: relative; width: calc(var(--h2) * 1.7); height: calc(var(--h2) * 0.3); margin: calc(var(--h2) * -0.04) 0 calc(var(--h2) * 0.1) calc(var(--h2) * 0.06); }
.iv-head .iv-kick { margin-top: 2px; }
.iv-kick { font: 500 var(--fk) / 1.5 var(--iv-text); letter-spacing: 0.26em; text-transform: uppercase; opacity: 0.8; text-wrap: balance; }
.iv-kick--soft { opacity: 0.68; letter-spacing: 0.2em; }
.iv-no { font: italic 400 calc(var(--fk) * 1.2) / 1 var(--iv-text); letter-spacing: 0; text-transform: none; margin-right: 14px; opacity: 0.85; }
.iv-h2 { font: 400 var(--h2) / 1.12 var(--iv-script); letter-spacing: 0; margin-left: -0.06em !important; text-wrap: balance; max-width: 7.4em; }
.iv-h3 { font: 500 var(--fk) / 1.5 var(--iv-text); letter-spacing: 0.24em; text-transform: uppercase; }
.iv-p { font: 400 var(--fs) / 1.62 var(--iv-text); text-wrap: pretty; }
.iv-p--lead { font-size: calc(var(--fs) * 1.1); line-height: 1.55; }
.iv-p--note { font-style: italic; opacity: 0.9; }
.iv-hint { font: italic 400 15px / 1.5 var(--iv-text); opacity: 0.7; }
.iv-done { font: 400 calc(var(--h2) * 0.8) / 1.1 var(--iv-script); }

/* ---- the first screen */
.iv-stop--invite { display: grid; place-items: center; padding: calc(var(--frame) * 0.07) var(--side) calc(var(--frame) * 0.09); }
.iv-invite { display: grid; justify-items: center; text-align: center; gap: calc(var(--frame) * 0.02); }
.iv-invite > .iv-kick--c { margin-top: calc(var(--frame) * -0.004); }
.iv-kick--c { letter-spacing: 0.32em; }
.iv-names-wrap { position: relative; padding: 0.04em 0.5em 0.02em; font-size: var(--nm); }
.iv-names { font: 400 var(--nm) / 1 var(--iv-script); letter-spacing: 0; text-align: center; }
.iv-name { display: block; }
.iv-name__w { display: block; }
.iv-name--0 .iv-name__w { translate: -0.42em 0; }
.iv-name--1 .iv-name__w { translate: 0.42em 0; }
/* the ampersand between the names, on its own line, laid in gold leaf once the names are written */
.iv-amp { display: block; width: max-content; margin: -0.02em auto 0.04em; font: italic 400 0.42em / 1 var(--iv-text); padding: 0.06em 0.14em;
  background: url(${A}/gold.webp) 0 0 / 96px 96px; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0.5px 0.8px 0 rgba(255,255,255,0.6)) drop-shadow(-0.3px -0.4px 0 rgba(90,60,14,0.5)) drop-shadow(0.6px 1.4px 1.2px rgba(70,46,12,0.28));
  transition: opacity 1.2s ease; }
.iv-motion .iv-names-wrap:not(.iv-gilt-on) .iv-amp { opacity: 0; }
.iv-motion .iv-gilt-on .iv-amp { animation: iv-gild 1.8s ease-out both; }
@keyframes iv-gild { from { background-position: -70px 0; } to { background-position: 0 0; } }
.iv-names.iv-ink--edit { font-size: calc(var(--nm) * 0.7); }
.iv-lede { font: italic 400 calc(var(--fs) * 1.12) / 1.5 var(--iv-text); max-width: 30ch; text-wrap: balance; }
.iv-lede--small { font-size: var(--fs); opacity: 0.86; }
.iv-date { font: 400 var(--fs) / 1.6 var(--iv-text); letter-spacing: 0.02em; text-wrap: balance; }
.iv-date > span { display: block; }
.iv-date__y { font-style: italic; }
.iv-where { font: 500 var(--fk) / 1.7 var(--iv-text); letter-spacing: 0.26em; text-transform: uppercase; text-wrap: balance; }
.iv-where > span { display: block; }
.iv-where__town { opacity: 0.72; letter-spacing: 0.2em; }
.iv-cue { position: absolute; left: 50%; bottom: calc(var(--frame) * 0.035); translate: -50% 0; display: grid; justify-items: center; gap: 10px; font: 500 12px / 1 var(--iv-text); letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.8; white-space: nowrap; transition: opacity 0.8s; }
.iv-cue i { width: 1px; height: 28px; background: currentColor; opacity: 0.55; }
.iv-opening .iv-cue { opacity: 0; }

/* gold leaf: flakes caught in the paper, and the gilded initial */
.iv-flecks { position: absolute; inset: 0; pointer-events: none; }
.iv-flecks i { position: absolute; display: block; background: url(${A}/gold.webp) 0 0 / 140px 140px; }
.iv-gilt { float: left; font: 400 4.3em / 0.78 var(--iv-text); margin: 0.1em 0.12em -0.1em -0.02em; padding: 0.04em 0.04em 0 0;
  background: url(${A}/gold.webp) 0 0 / 110px 110px; -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0.5px 0.8px 0 rgba(255,255,255,0.6)) drop-shadow(-0.3px -0.4px 0 rgba(90,60,14,0.5)) drop-shadow(0.6px 1.4px 1.2px rgba(70,46,12,0.28)); }
.iv-story { display: grid; gap: 16px; max-width: 34em; }
.iv-p--first { min-height: 4.2em; }

/* the day */
.iv-program { list-style: none; padding: 0; display: grid; }
.iv-program li { display: grid; grid-template-columns: 6.6em minmax(0, 1fr); column-gap: 22px; align-items: baseline; padding: 14px 0; border-bottom: 1px solid color-mix(in srgb, var(--ink) 13%, transparent); }
.iv-program li:first-child { padding-top: 4px; }
.iv-program__time { font: 500 var(--fk) / 1.4 var(--iv-text); letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.8; font-variant-numeric: tabular-nums; }
.iv-program__what b { display: block; font: 400 calc(var(--fs) * 1.22) / 1.3 var(--iv-text); }
.iv-program__what em { display: block; font: italic 400 calc(var(--fs) * 0.94) / 1.45 var(--iv-text); opacity: 0.82; margin-top: 2px; }

/* the venue */
.iv-venue { display: grid; gap: 12px; justify-items: start; }
.iv-venue__name { font: 400 calc(var(--fs) * 1.75) / 1.15 var(--iv-text); letter-spacing: -0.005em; text-wrap: balance; }
.iv-links { margin-top: 4px; }

/* the entourage */
.iv-ent { columns: 2; column-gap: 40px; }
.iv-group { break-inside: avoid; display: grid; gap: 6px; padding-bottom: 22px; }
.iv-group__t { font: 500 calc(var(--fk) * 0.96) / 1.45 var(--iv-text); letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.74; }
.iv-people { list-style: none; padding: 0; display: grid; gap: 2px; font: 400 calc(var(--fs) * 0.98) / 1.45 var(--iv-text); }

/* attire: the colours painted as little washes, darker where the paint dried at the edge */
.iv-wash { display: grid; gap: 14px; justify-items: start; margin-top: 4px; }
.iv-wash__row { display: flex; flex-wrap: wrap; gap: 10px; }
.iv-wash__row i { display: block; width: 66px; height: 60px; rotate: var(--r); border-radius: 48% 52% 44% 56% / 56% 46% 54% 44%;
  /* a flat wash of paint: even in the middle, a darker edge where it dried, the paper's tooth through it */
  background: url(${A}/paper.webp) 0 0 / 220px 220px, radial-gradient(closest-side, var(--c) 0 82%, color-mix(in srgb, var(--c) 84%, #000) 92%, color-mix(in srgb, var(--c) 55%, transparent) 97%, transparent 100%);
  background-blend-mode: multiply, normal; opacity: 0.88; }

/* where to stay */
.iv-list { display: grid; gap: 18px; }
.iv-list > div:not(.iv-item) { display: grid; gap: 20px; }
.iv-list--travel { padding-top: 20px; border-top: 1px solid color-mix(in srgb, var(--ink) 15%, transparent); }
.iv-item { display: grid; gap: 4px; justify-items: start; }
.iv-item__name { font: 400 calc(var(--fs) * 1.3) / 1.25 var(--iv-text); }
.iv-a { color: inherit; font: 500 var(--fk) var(--iv-text); letter-spacing: 0.2em; text-transform: uppercase; text-underline-offset: 4px; display: inline-flex; align-items: center; min-height: 44px; }

/* gifts */
.iv-btns { display: flex; flex-wrap: wrap; gap: 10px; }
.iv-cash { max-width: 460px; }
.iv-sign { font: italic 400 calc(var(--fs) * 1.12) / 1.4 var(--iv-text); justify-self: start; }

/* good to know */
.iv-faqs { display: grid; grid-template-columns: 1fr 1fr; gap: 26px 36px; }
.iv-faq { display: grid; gap: 6px; align-content: start; }
.iv-faq b { font: 500 calc(var(--fs) * 1.04) / 1.35 var(--iv-text); }
.iv-faq .iv-p { font-size: calc(var(--fs) * 0.94); }

/* the reply, and the wax pressed on it */
.iv-stop--rsvp .iv-body { position: relative; }
/* pressed on the reply, beside the answers */
.iv-seal { position: absolute; right: 2%; top: calc(var(--fk) * 2.4 + 26px); display: block; width: 104px; height: 104px; rotate: -9deg; }
.iv-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 22px; border: 1px solid var(--ink); background: var(--ink); color: var(--paper);
  font: 500 var(--fk) / 1 var(--iv-text); letter-spacing: 0.24em; text-transform: uppercase; text-decoration: none; cursor: pointer; border-radius: 1px; }
.iv-btn--line { background: transparent; color: var(--ink); }
.iv-btn:disabled { opacity: 0.7; cursor: default; }
.iv-reply { width: 100%; max-width: 520px; display: grid; gap: 14px; justify-items: start; }
.iv-form { width: 100%; display: grid; gap: 12px; }
.iv-choices { display: grid; gap: 2px; justify-items: start; }
.iv-choice { display: flex; align-items: center; gap: 14px; min-height: 48px; padding: 0; border: 0; background: none; color: var(--ink); cursor: pointer; font: italic 400 calc(var(--fs) * 1.14) / 1.2 var(--iv-text); }
.iv-choice i { flex: none; width: 17px; height: 17px; border-radius: 50%; border: 1.3px solid var(--ink); box-shadow: inset 0 0 0 3px var(--paper); }
.iv-choice.is-on i { background: var(--ink); }
.iv-choice.is-on { text-decoration: underline; text-underline-offset: 5px; text-decoration-thickness: 1px; }
.iv-fields { display: grid; gap: 10px; width: 100%; }
.iv-line { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: end; gap: 14px; min-height: 50px; border-bottom: 1px solid color-mix(in srgb, var(--ink) 40%, transparent); }
.iv-line > span { font: 500 var(--fk) / 1 var(--iv-text); letter-spacing: 0.2em; text-transform: uppercase; padding-bottom: 13px; white-space: nowrap; opacity: 0.85; }
.iv-line--note { grid-template-columns: 1fr; gap: 4px; padding-top: 6px; }
.iv-line--note > span { padding-bottom: 0; }
.iv-field { width: 100%; border: 0; background: transparent; color: var(--ink); font: 400 17px / 1.4 var(--iv-text); padding: 10px 0 8px; outline: none; resize: none; }
.iv-field:focus-visible { box-shadow: 0 1px 0 0 var(--ink); }
.iv-field--box { border: 1px solid color-mix(in srgb, var(--ink) 32%, transparent); padding: 10px 12px; background: rgba(255,255,255,0.3); margin-top: 6px; }
.iv-qlabel { display: block; margin-top: 6px; }
.iv-link { justify-self: start; border: 0; background: none; padding: 8px 0; color: var(--ink); opacity: 0.8; font: italic 400 15px var(--iv-text); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; min-height: 44px; }
.iv-count { display: grid; gap: 8px; margin-top: 6px; }
.iv-counts { display: flex; flex-wrap: wrap; gap: 6px; }
.iv-n { width: 44px; height: 44px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--ink) 38%, transparent); background: transparent; color: var(--ink); font: 400 17px var(--iv-text); cursor: pointer; }
.iv-n.is-on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.iv-error { color: #8c2f24; font: 400 15px / 1.4 var(--iv-text); }
.iv-form .iv-btn { width: 100%; margin-top: 8px; }
.iv-small { font: 400 15px / 1.5 var(--iv-text); opacity: 0.8; }
.iv-maker { margin-top: 26px !important; font: 400 13px / 1.6 var(--iv-text); letter-spacing: 0.06em; opacity: 0.7; text-wrap: balance; }
.iv-endnote { padding: 40px var(--side); }

.iv-gallery { --frame: 75cqw; }
.iv-editor .iv-stop { min-height: 0; padding-top: 72px; padding-bottom: 72px; }
.iv-editor .iv-stop--invite { min-height: 0; padding-top: 96px; padding-bottom: 96px; }
.iv-editor .iv-cue { position: static; translate: none; margin: 32px auto 0; }
@media (prefers-reduced-motion: reduce) { .iv-root *, .iv-root *::before, .iv-root *::after { animation: none !important; transition: none !important; } }

/* ---- the phone: one column, the heading written across the top of each screen */
@container (max-width: 700px) {
  .iv-root > * { --side: 24px; --h2: clamp(50px, 15cqw, 66px); --fs: 17px; --fk: 12px;
    --nm: clamp(56px, min(calc(31cqw * var(--iv-namek2, 1)), calc(var(--frame) * 0.15)), 150px); }
  /* hot-press cotton at a phone's scale: a finer, softer grain */
  .iv-world { background: linear-gradient(rgba(244,239,229,0.34), rgba(244,239,229,0.34)), url(${A}/formation.webp) 0 0 / 1100px 1100px, url(${A}/paper.webp) 0 0 / 300px 300px, var(--paper); }
  .iv-stop { padding: calc(var(--frame) * 0.09) var(--side) calc(var(--frame) * 0.1); }
  .iv-spread { grid-template-columns: minmax(0, 1fr); }
  .iv-body { padding-top: 22px; max-width: none; }
  .iv-h2 { max-width: none; }
  .iv-flourish { width: calc(var(--h2) * 2); height: calc(var(--h2) * 0.36); }
  .iv-name--0 .iv-name__w { translate: -0.1em 0; }
  .iv-name--1 .iv-name__w { translate: 0.1em 0; }
  .iv-names-wrap { padding-left: 0.2em; padding-right: 0.2em; }
  .iv-invite { gap: calc(var(--frame) * 0.014); }
  .iv-stop--invite { padding: calc(var(--frame) * 0.04) var(--side) calc(var(--frame) * 0.11); }
  .iv-invite .iv-lede { font-size: var(--fs); }
  .iv-invite .iv-date { font-size: calc(var(--fs) * 0.96); line-height: 1.5; }
  .iv-cue { bottom: calc(var(--frame) * 0.025); gap: 8px; }
  .iv-cue i { height: 20px; }
  .iv-stop--rsvp { padding-top: calc(var(--frame) * 0.1); }
  .iv-ent { columns: 1; }
  .iv-faqs { grid-template-columns: 1fr; gap: 22px; }
  .iv-program li { grid-template-columns: 5.6em minmax(0, 1fr); column-gap: 14px; }
  .iv-seal { width: 84px; height: 84px; right: 0; top: calc(22px + var(--fk) * 3.2 + 14px); }
  .iv-kick { letter-spacing: 0.2em; }
}
@container (max-width: 380px) {
  .iv-root > * { --fs: 16px; --h2: clamp(46px, 14.5cqw, 60px); }
  .iv-lede { font-size: var(--fs); }
}
`;
