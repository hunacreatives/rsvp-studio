// Letterpress: a stationery suite on a linen table seen from above. Sizes follow the page's own
// width and the frame's height (container units and --u, the size of an inch on the table);
// nothing is fixed to the window (the table is a sticky frame inside the page).
const A = "/event-templates/letterpress";
export const LETTERPRESS_CSS = `
/* the sizes are set on the root's children: only they can query the root (the container) */
.lp-root > * { --u: min(calc(var(--frame) / 9.4), 6.9cqw, 96px); --shift: calc(var(--u) * 1.35); --fs: clamp(15px, calc(var(--u) * 0.168), 17.5px); --fs-l: clamp(12.5px, calc(var(--u) * 0.13), 13.5px); }
.lp-root { --frame: 100svh;
  --ink: var(--lp-ink, #243049); --cotton: #f7f2e7; --navy: #25314b; --fog: #8b9db0;
  --foilg: linear-gradient(100deg, #6c4f22 0%, #b38e48 13%, #e6cf8c 22%, #fff4d2 27%, #caa65d 35%, #7c5c28 50%, #b18d47 62%, #efdc9e 71%, #a07b3c 84%, #6c4f22 100%);
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: var(--ink);
  font-family: var(--lp-body); -webkit-font-smoothing: antialiased; background: #bcb2a5; }
.lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; }
.lp-root p, .lp-root h1, .lp-root h2, .lp-root ol { margin: 0; }

/* ---- the table: linen on a sticky frame, moved one for one with the pieces (table.ts) */
.lp-stage { position: sticky; top: 0; height: var(--frame); margin-bottom: calc(var(--frame) * -1); z-index: 0; overflow: clip; pointer-events: none; }
.lp-table { position: absolute; left: 0; right: 0; top: 0; height: calc(var(--frame) * 2); background-repeat: repeat; background-size: 1344px 960px; will-change: transform; }
/* the window, to the upper left: a broad pool of light falling across, a soft fall-off away from it */
.lp-window { position: absolute; inset: 0;
  background:
    radial-gradient(120% 95% at 0% 0%, rgba(255,248,234,0.26), rgba(255,248,234,0.08) 42%, rgba(255,248,234,0) 64%),
    linear-gradient(112deg, rgba(255,250,240,0) 52%, rgba(46,32,18,0.07) 64%, rgba(46,32,18,0) 72%),
    linear-gradient(180deg, rgba(40,28,16,0) 55%, rgba(40,28,16,0.10) 100%),
    linear-gradient(90deg, rgba(40,28,16,0) 60%, rgba(40,28,16,0.12) 100%); }
.lp-world { position: relative; z-index: 1; }

/* ---- stops: every piece pauses in the same place (its vignette is sticky for the hold) */
.lp-stop { position: relative; padding-top: calc(var(--frame) * 0.8); }
.lp-stop--invite { padding-top: 0; }
.lp-dock { position: relative; }
.lp-vig { position: sticky; top: 0; min-height: var(--frame); display: grid; place-items: center; padding: calc(var(--u) * 0.7) 0; }
.lp-hold { height: calc(var(--frame) * 0.35); }
.lp-piece { position: relative; translate: var(--shift) 0; }
.lp-prop { position: absolute; display: block; max-width: none; pointer-events: none; user-select: none; height: auto; }

/* ---- cotton paper: the relief laid over its colour, a deckled edge, a shadow on the linen */
/* the contact shadow follows the torn edge (a drop shadow of the masked sheet); the long soft
   shadow is a box under the opaque middle of the sheet, so no edge of it shows through the deckle */
.lp-paper { position: relative; isolation: isolate; rotate: var(--rot, 0deg); filter: drop-shadow(0.6px 1.2px 0.9px rgba(46,34,22,0.36)); }
.lp-shade { position: absolute; inset: 18px; z-index: -1; border-radius: 6px;
  box-shadow: 6px 12px 18px rgba(46,34,22,0.22), 18px 30px 46px rgba(46,34,22,0.2); }
.lp-sheet { position: relative; min-height: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(var(--u) * 0.16);
  padding: calc(var(--u) * 0.66) calc(var(--u) * 0.56); text-align: center;
  background: url(${A}/paper.webp) 0 0 / 512px 512px, linear-gradient(118deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 42%, rgba(80,58,34,0.05)), var(--cotton);
  background-blend-mode: hard-light, normal, normal;
  -webkit-mask-box-image: url(${A}/deckle.webp) 32 / 16px round; }
.lp-card { width: calc(var(--u) * 5); min-height: calc(var(--u) * 7); }
.lp-card--invite { --rot: 0.7deg; z-index: 6; }
.lp-card--day { --rot: -0.9deg; }
.lp-card--dress { --rot: 0.8deg; }
.lp-card--stay { --rot: -0.6deg; }
.lp-card--note { --rot: 1.4deg; width: calc(var(--u) * 4.4); min-height: calc(var(--u) * 5.8); z-index: 2; }
.lp-card--fold { --rot: -0.5deg; width: calc(var(--u) * 9.2); min-height: calc(var(--u) * 5.6); }
.lp-card--reply { --rot: -0.8deg; z-index: 2; }

/* ---- print: letterpress ink pressed into the cotton, gold foil that catches the window */
.lp-press { color: color-mix(in srgb, var(--ink) 94%, transparent); text-shadow: 0 1px 0 rgba(255,255,255,0.72), 0 -0.5px 0 rgba(40,30,18,0.14); }
.lp-foil { background: var(--foilg); background-size: 260% 100%; background-position: calc(50% + var(--sheen, 0) * 110%) 50%; }
.lp-mono.lp-foil, .lp-foil-text { -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; caret-color: #8a6a2f;
  filter: drop-shadow(0.4px 0.7px 0 rgba(255,255,255,0.55)) drop-shadow(-0.2px -0.3px 0 rgba(70,48,14,0.4)); }
.lp-rule { display: block; position: relative; width: calc(var(--u) * 1.15); height: 1.5px; margin: calc(var(--u) * 0.06) auto; }
.lp-rule::after { content: ""; position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; translate: -50% -50%; rotate: 45deg; background: inherit; background-size: 1600% 100%; box-shadow: 0 0 0 3px var(--cotton); }
.lp-label { font: 400 var(--fs-l) / 1.45 var(--lp-body); letter-spacing: 0.24em; text-transform: uppercase; text-wrap: balance; }
.lp-label--soft { opacity: 0.78; }
.lp-h2 { font: 400 clamp(32px, calc(var(--u) * 0.5), 50px) / 1.04 var(--lp-display); letter-spacing: 0.005em; text-wrap: balance; }
.lp-p { font: 400 var(--fs) / 1.55 var(--lp-body); text-wrap: pretty; }
.lp-small { font: 400 15px / 1.5 var(--lp-body); opacity: 0.8; }
.lp-italic { font: italic 400 var(--fs) / 1.5 var(--lp-body); text-wrap: balance; max-width: calc(var(--u) * 3.7); }
.lp-italic--small { font-size: calc(var(--fs) * 0.94); opacity: 0.86; }

/* the invitation */
.lp-card--invite .lp-sheet { gap: calc(var(--u) * 0.15); }
.lp-mono { display: flex; align-items: baseline; justify-content: center; gap: 0.08em; font: italic 400 calc(var(--u) * 0.44) / 1 var(--lp-display); padding: 0.08em 0.2em; margin-bottom: calc(var(--u) * 0.08); }
.lp-mono em { font: italic 400 0.5em var(--lp-body); }
.lp-names { font: 400 calc(var(--u) * var(--lp-names, 0.62)) / 0.98 var(--lp-display); letter-spacing: 0.005em; margin: calc(var(--u) * 0.06) 0 calc(var(--u) * 0.04); text-wrap: balance; }
.lp-names > span { display: block; }
.lp-name { display: block; }
.lp-amp { display: block; font: 400 0.52em / 1.15 "Mrs Saint Delafield", var(--lp-display); letter-spacing: 0; margin: 0.06em 0 0.02em; }
.lp-date { font: 400 var(--fs) / 1.5 var(--lp-body); letter-spacing: 0.02em; text-wrap: balance; }
.lp-date > span { display: block; }
.lp-date > span:nth-child(2) { font-style: italic; }
.lp-time { margin-top: 0.15em; }
.lp-where { font: 400 var(--fs-l) / 1.55 var(--lp-body); letter-spacing: 0.22em; text-transform: uppercase; text-wrap: balance; margin-top: calc(var(--u) * 0.06); }
.lp-where > span { display: block; }
.lp-where__town { opacity: 0.78; letter-spacing: 0.18em; }

/* the program */
.lp-program { list-style: none; padding: 0; width: 100%; margin-top: calc(var(--u) * 0.08) !important; display: grid; gap: calc(var(--u) * 0.2); }
.lp-program li { display: grid; gap: 2px; }
.lp-program__time { font: 400 var(--fs-l) / 1.3 var(--lp-body); letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.82; }
.lp-program__what b { display: block; font: 400 calc(var(--fs) * 1.32) / 1.2 var(--lp-display); }
.lp-program__what em { display: block; font: italic 400 calc(var(--fs) * 0.95) / 1.4 var(--lp-body); opacity: 0.85; }

/* attire, and the colours as fabric */
.lp-card--dress .lp-p { max-width: calc(var(--u) * 3.8); }
.lp-strip { margin-top: calc(var(--u) * 0.16); display: grid; justify-items: center; gap: calc(var(--u) * 0.14); }
.lp-swatches { display: flex; justify-content: center; }
.lp-swatch { display: block; width: calc(var(--u) * 0.78); height: calc(var(--u) * 1.06); margin: 0 calc(var(--u) * -0.1);
  background: url(${A}/weave.webp) 0 0 / 300px 300px, var(--c); background-blend-mode: hard-light, normal;
  filter: drop-shadow(1px 2px 1.5px rgba(46,34,22,0.32)); }
.lp-swatch--silk { background: linear-gradient(125deg, rgba(255,255,255,0.0) 20%, rgba(255,255,255,0.28) 42%, rgba(255,255,255,0.0) 60%, rgba(0,0,0,0.10) 90%), var(--c); }

/* the venue: vellum over a map card */
.lp-vellum-set { position: relative; width: calc(var(--u) * 5); }
.lp-mapcard { position: absolute; inset: 0; translate: calc(var(--u) * -0.62) calc(var(--u) * 0.5); }
.lp-card--map { --rot: -2.4deg; width: 100%; height: 100%; min-height: 0; }
.lp-card--map .lp-sheet { height: 100%; padding: calc(var(--u) * 0.3); }
.lp-map { width: 100%; height: 100%; color: var(--ink); }
.lp-vellum { position: relative; z-index: 1; rotate: 1.2deg; min-height: calc(var(--u) * 7); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(var(--u) * 0.16);
  padding: calc(var(--u) * 0.9) calc(var(--u) * 0.56) calc(var(--u) * 0.6); text-align: center; color: var(--ink);
  /* frosted vellum: the map behind it only a soft shadow under the type, clear where it peeks out */
  background: linear-gradient(125deg, rgba(255,255,255,0.34), rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.24)), rgba(247,246,240,0.84);
  -webkit-backdrop-filter: blur(6px) saturate(0.5) brightness(1.06); backdrop-filter: blur(6px) saturate(0.5) brightness(1.06);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.45), 0 0.5px 1px rgba(46,34,22,0.14), 4px 8px 16px rgba(46,34,22,0.12); }
.lp-vellum .lp-vellum__seal { position: absolute; top: calc(var(--u) * -0.42); left: 50%; width: calc(var(--u) * 1.15); height: calc(var(--u) * 1.15); translate: -47% 0; }
.lp-venue { font: 400 clamp(26px, calc(var(--u) * 0.36), 36px) / 1.15 var(--lp-display); text-wrap: balance; }
.lp-links { margin-top: calc(var(--u) * 0.04); }

/* where to stay */
.lp-part { display: grid; gap: calc(var(--u) * 0.16); justify-items: center; width: 100%; }
.lp-list { display: grid; gap: calc(var(--u) * 0.2); width: 100%; }
.lp-item { display: grid; gap: 3px; justify-items: center; }
.lp-item__name { font: 400 calc(var(--fs) * 1.32) / 1.2 var(--lp-display); }
.lp-travel { margin-top: calc(var(--u) * 0.3); padding-top: calc(var(--u) * 0.26); border-top: 1px solid color-mix(in srgb, var(--ink) 22%, transparent); width: 100%; display: grid; gap: calc(var(--u) * 0.14); }
.lp-travel .lp-h2 { font-size: clamp(26px, calc(var(--u) * 0.36), 36px); }
.lp-a { color: inherit; font: 400 var(--fs-l) var(--lp-body); letter-spacing: 0.2em; text-transform: uppercase; text-underline-offset: 4px; display: inline-flex; align-items: center; min-height: 44px; }

/* gifts */
.lp-btns { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 4px; }
.lp-sign { font: 400 clamp(24px, calc(var(--u) * 0.36), 34px) / 1.2 "Mrs Saint Delafield", var(--lp-display); color: var(--ink); margin-top: calc(var(--u) * 0.06) !important; }

/* the folded card: two panels, a valley fold down the middle */
.lp-card--fold .lp-sheet { display: flex; text-align: left; padding: calc(var(--u) * 0.6) calc(var(--u) * 0.62); }
.lp-faqs { width: 100%; display: grid; grid-template-columns: 1fr 1fr; column-gap: calc(var(--u) * 1.2); align-content: center; }
.lp-faqs .lp-fold__head { grid-column: 1; grid-row: 1; }
.lp-faqs .site-add { grid-column: 2; }
.lp-crease { position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background: linear-gradient(90deg, rgba(70,50,30,0) 36%, rgba(70,50,30,0.06) 49.5%, rgba(70,50,30,0.13) 50%, rgba(255,255,255,0.45) 50.25%, rgba(255,255,255,0.1) 52%, rgba(255,255,255,0) 62%); }
.lp-fold__head { break-inside: avoid; display: grid; gap: calc(var(--u) * 0.12); justify-items: start; margin-bottom: calc(var(--u) * 0.2); }
.lp-fold__head .lp-rule { margin: calc(var(--u) * 0.04) 0; }
.lp-faq { break-inside: avoid; display: grid; gap: 4px; padding-bottom: calc(var(--u) * 0.22); }
.lp-faq b { font: 400 calc(var(--fs) * 1.18) / 1.25 var(--lp-display); }

/* buttons and the reply */
.lp-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 22px; border: 1px solid var(--ink); background: var(--ink); color: var(--cotton);
  font: 400 var(--fs-l) / 1 var(--lp-body); letter-spacing: 0.24em; text-transform: uppercase; text-decoration: none; cursor: pointer; border-radius: 1px; }
.lp-btn--line { background: transparent; color: var(--ink); }
.lp-btn:disabled { opacity: 0.7; cursor: default; }
.lp-reply { width: 100%; display: grid; gap: calc(var(--u) * 0.16); justify-items: center; }
.lp-form { width: 100%; display: grid; gap: calc(var(--u) * 0.14); }
.lp-choices { display: grid; gap: 6px; justify-items: stretch; margin-top: 4px; }
.lp-choice { display: flex; align-items: center; justify-content: center; gap: 12px; min-height: 48px; padding: 0 12px; border: 0; background: none; color: var(--ink); cursor: pointer;
  font: italic 400 calc(var(--fs) * 1.08) / 1.2 var(--lp-body); }
.lp-choice i { flex: none; width: 16px; height: 16px; border-radius: 50%; border: 1.3px solid var(--ink); box-shadow: inset 0 0 0 3px var(--cotton); }
.lp-choice.is-on i { background: var(--ink); }
.lp-choice.is-on { text-decoration: underline; text-underline-offset: 5px; text-decoration-thickness: 1px; }
.lp-fields { display: grid; gap: 10px; width: 100%; text-align: left; }
.lp-line { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: end; gap: 12px; min-height: 48px; border-bottom: 1px solid color-mix(in srgb, var(--ink) 45%, transparent); }
.lp-line > span { font: 400 var(--fs-l) / 1 var(--lp-body); letter-spacing: 0.2em; text-transform: uppercase; padding-bottom: 12px; white-space: nowrap; }
.lp-line--note { grid-template-columns: 1fr; gap: 4px; padding-top: 6px; }
.lp-line--note > span { padding-bottom: 0; }
.lp-field { width: 100%; border: 0; background: transparent; color: var(--ink); font: 400 16px / 1.4 var(--lp-body); padding: 10px 0 8px; outline: none; resize: none; }
.lp-field:focus-visible { box-shadow: 0 1px 0 0 var(--ink); }
.lp-field--box { border: 1px solid color-mix(in srgb, var(--ink) 35%, transparent); padding: 10px 12px; background: rgba(255,255,255,0.35); margin-top: 6px; }
.lp-qlabel { display: block; margin-top: 6px; }
.lp-link { justify-self: start; border: 0; background: none; padding: 8px 0; color: var(--ink); opacity: 0.8; font: italic 400 15px var(--lp-body); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; min-height: 44px; }
.lp-count { display: grid; gap: 8px; justify-items: center; margin-top: 6px; }
.lp-counts { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.lp-n { width: 44px; height: 44px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--ink) 40%, transparent); background: transparent; color: var(--ink); font: 400 17px var(--lp-display); cursor: pointer; }
.lp-n.is-on { background: var(--ink); color: var(--cotton); border-color: var(--ink); }
.lp-error { color: #8c2f24; font: 400 15px / 1.4 var(--lp-body); }
.lp-form .lp-btn { width: 100%; margin-top: 6px; }
.lp-maker { margin-top: calc(var(--u) * 0.22) !important; font: 400 13px / 1.6 var(--lp-body); letter-spacing: 0.06em; opacity: 0.72; text-align: center; text-wrap: balance; }
.lp-endnote { padding: 40px 16px; display: grid; place-items: center; }

/* ---- the envelope */
.lp-env { position: absolute; z-index: 3; width: calc(var(--u) * 5.3); height: calc(var(--u) * 7.6); left: calc(var(--u) * -4.15); top: calc(50% - var(--u) * 4.1); rotate: -5deg; perspective: calc(var(--u) * 22); }
.lp-env__shade { position: absolute; inset: 5px; border-radius: 3px; box-shadow: 0 1px 2px rgba(30,22,14,0.4), 4px 7px 10px rgba(30,22,14,0.22), 16px 26px 40px rgba(30,22,14,0.2); }
.lp-env__body { position: absolute; inset: 0; border-radius: 2px; overflow: hidden;
  background: url(${A}/paper.webp) 0 0 / 512px 512px, linear-gradient(118deg, rgba(255,255,255,0.08), rgba(255,255,255,0) 45%, rgba(0,0,0,0.14)), var(--navy); background-blend-mode: hard-light, normal, normal; }
.lp-env__seams { position: absolute; inset: 0; width: 100%; height: 100%; }
.lp-flapshadow { position: absolute; top: 0; right: 0; width: 58%; height: 100%; background: rgba(6,10,20,0.5); filter: blur(3px); translate: 3px 4px; }
.lp-openshadow { position: absolute; top: 0; left: 100%; width: 58%; height: 100%; background: rgba(30,22,14,0.32); filter: blur(7px); translate: 6px 8px; opacity: 0; }
.lp-flap { position: absolute; top: 0; right: 0; width: 58%; height: 100%; transform-origin: 100% 50%; transform-style: preserve-3d; z-index: 2; }
.lp-flap__front, .lp-flap__back { position: absolute; inset: 0; -webkit-backface-visibility: hidden; backface-visibility: hidden; }
.lp-flap__front { background: url(${A}/paper.webp) 40px 20px / 512px 512px, linear-gradient(100deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.10)), var(--navy); background-blend-mode: hard-light, normal, normal; }
.lp-flap__back { transform: rotateY(180deg); background: url(${A}/paper.webp) 0 0 / 512px 512px, var(--navy); background-blend-mode: hard-light, normal; }
.lp-flap__liner { position: absolute; top: calc(var(--u) * 0.16); bottom: calc(var(--u) * 0.16); left: 0; right: calc(var(--u) * 0.2); background: url(${A}/liner.webp) center / cover; }
.lp-seal-wrap { position: absolute; width: calc(var(--u) * 1.5); height: calc(var(--u) * 1.5); left: calc(46% - var(--u) * 0.7); top: calc(50% - var(--u) * 0.7); }
.lp-flap .lp-seal-wrap { left: calc(7% - var(--u) * 0.7); transform: translateZ(1px); -webkit-backface-visibility: hidden; backface-visibility: hidden; }
.lp-seal { display: block; width: 100%; height: 100%; }
.lp-seal-a { clip-path: polygon(51% 0, 100% 0, 100% 100%, 49% 100%, 52% 82%, 47.5% 63%, 52.5% 46%, 48.5% 29%, 52% 13%); -webkit-backface-visibility: hidden; backface-visibility: hidden; }
.lp-seal-b { clip-path: polygon(0 0, 51% 0, 52% 13%, 48.5% 29%, 52.5% 46%, 47.5% 63%, 52% 82%, 49% 100%, 0 100%); }
.lp-open .lp-flap { transform: rotateY(180deg); }
.lp-open .lp-flapshadow { opacity: 0; }
.lp-open .lp-openshadow { opacity: 1; }
.lp-open .lp-seal-b { translate: -2px 1px; rotate: -4deg; }
/* sealed: the flap carries the whole seal; it splits along the crack on the tap */
.lp-sealed .lp-seal-a { clip-path: none; }

/* small envelopes, open, their flaps lying flat */
.lp-senv { position: absolute; z-index: 1; width: calc(var(--u) * 4.9); height: calc(var(--u) * 3.5); }
.lp-senv__shade { position: absolute; inset: 4px; box-shadow: 0 1px 1.5px rgba(30,22,14,0.32), 3px 5px 9px rgba(30,22,14,0.18), 12px 20px 32px rgba(30,22,14,0.16); }
.lp-senv__shade::after { content: ""; position: absolute; left: 6%; right: 6%; bottom: 100%; height: 150%; box-shadow: 4px 6px 14px rgba(30,22,14,0.14); clip-path: polygon(0 100%, 50% 0, 100% 100%); }
.lp-senv__body, .lp-senv__flap { position: absolute; background: url(${A}/paper.webp) 0 0 / 512px 512px, linear-gradient(118deg, rgba(255,255,255,0.10), rgba(255,255,255,0) 45%, rgba(0,0,0,0.1)), var(--paper, var(--fog)); background-blend-mode: hard-light, normal, normal; }
.lp-senv__body { inset: 0; }
.lp-senv__flap { left: 0; right: 0; bottom: 100%; height: 72%; margin-bottom: -1px; }
.lp-senv__liner { position: absolute; inset: 0; background: url(${A}/liner.webp) center / 140% auto; }
.lp-senv--gift { --paper: #8c9eb1; left: calc(var(--u) * -2.6); top: calc(50% + var(--u) * 0.9); rotate: -10deg; }
.lp-senv--reply { --paper: #f2ece0; left: calc(var(--u) * -4.2); top: calc(var(--u) * 1.4); rotate: 7deg; }
.lp-senv--reply .lp-senv__liner { background-size: 160% auto; }
.lp-senv__stamp { position: absolute; right: calc(var(--u) * 0.28); top: calc(var(--u) * 0.28); }
.lp-senv__to { position: absolute; left: 30%; right: 12%; top: 46%; display: grid; gap: 2px; font: italic 400 calc(var(--fs) * 0.98) / 1.3 var(--lp-body); color: var(--ink); text-shadow: 0 1px 0 rgba(255,255,255,0.6); }
.lp-senv__to span:last-child { font-style: normal; font-size: var(--fs-l); letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.8; }
.lp-stamp { position: relative; width: calc(var(--u) * 0.86); height: calc(var(--u) * 1.06); padding: 7px; rotate: 3deg; background: #f6f0e2;
  -webkit-mask: conic-gradient(#000 0 0) content-box, radial-gradient(circle 2.6px, #0000 96%, #000) -4px -4px / 8px 8px round; -webkit-mask-composite: source-over;
  mask: conic-gradient(#000 0 0) content-box, radial-gradient(circle 2.6px, #0000 96%, #000) -4px -4px / 8px 8px round; mask-composite: add;
  filter: drop-shadow(0.5px 1px 0.8px rgba(30,22,14,0.3)); }
.lp-stamp__pic { position: absolute; inset: 7px; background-color: #e9e1d0; background-size: 220% auto; background-position: 50% 6%; box-shadow: inset 0 0 0 1px rgba(36,48,73,0.25); }
.lp-stamp b { position: absolute; right: 9px; bottom: 8px; font: 400 11px var(--lp-display); color: #f6f0e2; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }

/* ---- the props round each piece (desktop) */
.lp-p-ribbon { width: calc(var(--u) * 15.6); left: calc(var(--u) * -10.6); top: calc(var(--u) * -2.2); z-index: 0; }
.lp-p-limonium { width: calc(var(--u) * 5.2); right: calc(var(--u) * -4.3); top: calc(var(--u) * -2.2); rotate: 14deg; z-index: 5; }
.lp-p-rings { width: calc(var(--u) * 1.95); left: calc(var(--u) * -4.6); bottom: calc(var(--u) * -0.7); z-index: 4; }
.lp-p-pen { width: calc(var(--u) * 5.3); left: calc(var(--u) * -6.3); top: calc(var(--u) * 0.6); }
.lp-p-grass { width: calc(var(--u) * 6.2); right: calc(var(--u) * -5.6); bottom: calc(var(--u) * -2.2); rotate: -8deg; }
.lp-p-tail { width: calc(var(--u) * 9); left: calc(var(--u) * -9.6); top: 46%; rotate: -14deg; }
.lp-p-thistle { height: calc(var(--u) * 5.4); right: calc(var(--u) * -3.4); top: calc(var(--u) * -1.6); rotate: 24deg; z-index: 3; }
.lp-p-rose { height: calc(var(--u) * 6.2); left: calc(var(--u) * -4.4); top: calc(var(--u) * 0.2); rotate: -22deg; }
.lp-p-limonium2 { width: calc(var(--u) * 5); left: calc(var(--u) * -5.4); bottom: calc(var(--u) * -0.8); rotate: 196deg; }
.lp-p-loose { width: calc(var(--u) * 1.2); height: calc(var(--u) * 1.2); right: calc(var(--u) * -2.1); top: calc(var(--u) * 0.9); rotate: 18deg; }
.lp-p-tail2 { width: calc(var(--u) * 7.6); right: calc(var(--u) * -7.4); top: calc(var(--u) * -0.8); rotate: 16deg; }
.lp-p-thistle2 { height: calc(var(--u) * 4.6); right: calc(var(--u) * -2.6); bottom: calc(var(--u) * -1.6); rotate: -32deg; z-index: 3; }
.lp-p-pen2 { width: calc(var(--u) * 5); left: calc(var(--u) * -2.6); bottom: calc(var(--u) * -3.3); rotate: 6deg; }
.lp-p-grass2 { width: calc(var(--u) * 5.6); right: calc(var(--u) * -3.4); top: calc(var(--u) * -2.6); rotate: 168deg; }
.lp-p-rings2 { width: calc(var(--u) * 1.8); right: calc(var(--u) * -2.6); bottom: calc(var(--u) * 0.5); }
.lp-p-rose2 { height: calc(var(--u) * 5.2); right: calc(var(--u) * -3.4); top: calc(var(--u) * -0.9); rotate: 18deg; }

/* ---- the opening */
.lp-prompt { position: absolute; left: 16px; right: 16px; top: calc(var(--frame) * 0.95); translate: 0 -100%; display: grid; gap: 8px; justify-items: center; text-align: center; transition: opacity 0.5s; z-index: 8; pointer-events: none; }
.lp-prompt__names { font: italic 400 clamp(20px, calc(var(--u) * 0.26), 26px) / 1.2 var(--lp-body); color: var(--ink); text-shadow: 0 1px 0 rgba(255,255,255,0.35); }
.lp-prompt__go { font: 400 13px / 1 var(--lp-body); letter-spacing: 0.32em; text-transform: uppercase; color: var(--ink); opacity: 0.86; }
.lp-prompt__go::after { content: ""; display: block; width: 44px; height: 1px; margin: 12px auto 0; background: currentColor; opacity: 0.6; }
.lp-root:not(.lp-sealed) .lp-prompt { opacity: 0; visibility: hidden; transition: opacity 0.5s, visibility 0s 0.5s; }
.lp-opening .lp-prompt { opacity: 0; }
.lp-sealed:not(.lp-armed) .lp-vig--invite .lp-piece { visibility: hidden; }
.lp-cue { position: absolute; left: 50%; bottom: 2.6%; translate: -50% 0; z-index: 8; display: grid; justify-items: center; gap: 8px; font: 400 13px / 1 var(--lp-body); letter-spacing: 0.3em; text-transform: uppercase; color: var(--ink); opacity: 0.92; white-space: nowrap; }
.lp-cue i { width: 1px; height: 26px; background: currentColor; opacity: 0.6; }
.lp-sealed .lp-cue { opacity: 0; }
.lp-boot.lp-open .lp-cue { animation: lp-in 0.9s 0.1s both; }
@keyframes lp-in { from { opacity: 0; translate: -50% 6px; } }

.lp-gallery { --frame: 75cqw; }
.lp-gallery .lp-vig { padding: 0; }
.lp-editor .lp-hold { height: calc(var(--frame) * 0.12); }
.lp-editor .lp-stop:not(.lp-stop--invite) { padding-top: calc(var(--frame) * 0.12); }
@media (prefers-reduced-motion: reduce) { .lp-root *, .lp-root *::before, .lp-root *::after { animation: none !important; transition: none !important; } }

/* ---- the phone: the piece fills the width, the props peek in from the edges */
@container (max-width: 700px) {
  .lp-root > * { --u: min(calc((100cqw - 34px) / 5), calc(var(--frame) / 9.2)); --shift: 0px; --fs: clamp(15px, calc(var(--u) * 0.225), 17px); --fs-l: 13px; }
  .lp-vig { padding: calc(var(--u) * 0.9) 0; }
  .lp-stop { padding-top: calc(var(--frame) * 0.9); }
  .lp-stop--invite { padding-top: 0; }
  .lp-sheet { padding: calc(var(--u) * 0.62) calc(var(--u) * 0.42); gap: 10px; }
  .lp-h2 { font-size: clamp(32px, calc(var(--u) * 0.5), 40px); }
  .lp-names { font-size: calc(var(--u) * var(--lp-names, 0.62) * 1.12); }
  .lp-italic { max-width: none; }
  .lp-card--note { width: calc(var(--u) * 4.8); }
  .lp-card--fold { width: calc(var(--u) * 5); min-height: calc(var(--u) * 7); }
  .lp-card--fold .lp-sheet { text-align: center; }
  .lp-faqs { grid-template-columns: 1fr; }
  .lp-faqs > * { grid-column: 1 !important; grid-row: auto !important; }
  .lp-fold__head { justify-items: center; }
  .lp-fold__head .lp-rule { margin: calc(var(--u) * 0.04) auto; }
  .lp-crease { background: linear-gradient(180deg, rgba(70,50,30,0) 40%, rgba(70,50,30,0.05) 49.6%, rgba(70,50,30,0.11) 50%, rgba(255,255,255,0.4) 50.2%, rgba(255,255,255,0) 58%); }
  .lp-env { width: calc(var(--u) * 5.4); height: calc(var(--u) * 8.5); left: calc(var(--u) * -0.5); top: calc(50% - var(--u) * 4.45); rotate: -6deg; }
  .lp-p-ribbon { width: calc(var(--u) * 12); left: calc(var(--u) * -5.2); top: calc(var(--u) * -2.6); rotate: 14deg; }
  .lp-p-limonium { width: calc(var(--u) * 3.6); right: calc(var(--u) * -1.7); top: calc(var(--u) * -1.9); }
  .lp-p-rings { width: calc(var(--u) * 1.5); left: calc(var(--u) * -0.5); bottom: calc(var(--u) * -1.05); z-index: 7; }
  .lp-p-pen { width: calc(var(--u) * 4.2); left: calc(var(--u) * -2.7); top: calc(var(--u) * -1.9); }
  .lp-p-grass { width: calc(var(--u) * 4.6); right: calc(var(--u) * -2.4); bottom: calc(var(--u) * -1.8); }
  .lp-p-tail { width: calc(var(--u) * 6.6); left: calc(var(--u) * -3.4); top: calc(var(--u) * -1.5); rotate: -10deg; }
  .lp-p-thistle { height: calc(var(--u) * 3.8); right: calc(var(--u) * -1.5); top: auto; bottom: calc(var(--u) * -1.8); rotate: -150deg; }
  .lp-p-rose { height: calc(var(--u) * 4.4); left: calc(var(--u) * -1.7); top: calc(var(--u) * -2.2); rotate: -48deg; }
  .lp-p-limonium2 { width: calc(var(--u) * 3.6); left: calc(var(--u) * -1.9); bottom: calc(var(--u) * -1.9); }
  .lp-p-loose { right: calc(var(--u) * -0.4); top: calc(var(--u) * -0.75); }
  .lp-senv--gift { left: calc(var(--u) * -1.2); top: auto; bottom: calc(var(--u) * -1.6); rotate: -8deg; }
  .lp-p-tail2 { width: calc(var(--u) * 6); right: calc(var(--u) * -3.2); top: calc(var(--u) * -1.6); }
  .lp-p-thistle2 { height: calc(var(--u) * 3.6); right: calc(var(--u) * -1.5); bottom: calc(var(--u) * -1.9); }
  .lp-p-pen2 { width: calc(var(--u) * 4.2); left: calc(var(--u) * -1.6); bottom: calc(var(--u) * -2.6); }
  .lp-p-grass2 { width: calc(var(--u) * 4.4); right: calc(var(--u) * -2.2); top: calc(var(--u) * -2); }
  .lp-senv--reply { left: calc(var(--u) * -1.1); top: calc(var(--u) * -2.4); rotate: 6deg; }
  .lp-p-rings2 { width: calc(var(--u) * 1.4); right: calc(var(--u) * -0.5); bottom: calc(var(--u) * -1.1); z-index: 3; }
  .lp-p-rose2 { height: calc(var(--u) * 3.8); right: calc(var(--u) * -1.5); top: calc(var(--u) * -1.6); }
  .lp-prompt { top: calc(var(--frame) * 0.96); }
  .lp-label { letter-spacing: 0.18em; }
}
`;
