// Safari: a paper-cut storybook savanna, driven through in a jeep as the guest scrolls; each stop's
// animal tells the guest its part in a speech bubble, and the reply is a safari pass. Sizes follow
// the page's own width (container units), never the window's; nothing is fixed to the window (the
// diorama is a sticky frame inside the page).
const GRAIN = "url(/event-templates/safari/grain.png)";
export const SAFARI_CSS = `
.sf-root { --ink: #3b2614; --coral: #e0633f; --coralDark: #b5482a; --frame: 100svh;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: var(--ink);
  font-family: var(--sf-sans); -webkit-font-smoothing: antialiased; background: #f5e6cd; }
.sf-root *, .sf-root *::before, .sf-root *::after { box-sizing: border-box; }
.sf-root p, .sf-root h1, .sf-root h2, .sf-root h3 { margin: 0; }
.sf-paper { background-color: #fffaf0; background-image: ${GRAIN}; background-size: 256px; background-blend-mode: multiply; }

/* the diorama: a sticky frame behind the words */
.sf-stage { position: sticky; top: 0; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); z-index: 0; overflow: hidden; pointer-events: none;
  background: linear-gradient(180deg, #cfe5e6 0%, #e7eedc 38%, #f7e7cf 62%); }
.sf-stage::before { content: ""; position: absolute; inset: 0; background: ${GRAIN}; background-size: 512px; mix-blend-mode: multiply; opacity: 0.32; }
.sf-world { position: relative; z-index: 2; }
.sf-layer { position: absolute; left: 0; will-change: transform; }
.sf-layer canvas { display: block; }
.sf-prop { position: absolute; left: 0; bottom: 0; will-change: transform; }
.sf-prop, .sf-jeep, .sf-sun, .sf-cloud { filter: drop-shadow(0 0 7px rgba(88, 56, 22, 0.28)) drop-shadow(0 3px 2px rgba(88, 56, 22, 0.18)); }
.sf-prop svg, .sf-jeep svg, .sf-sun svg, .sf-cloud svg { display: block; width: 100%; height: auto; overflow: visible; }
.sf-jeep { position: absolute; bottom: 0; right: 0; }
.sf-ride { will-change: transform; }
.sf-sun { position: absolute; width: 150px; right: 14cqw; top: 9%; z-index: 0; }
.sf-cloud { position: absolute; left: 0; will-change: transform; z-index: 0; }

/* the puppets' idle motion, each joint turning about its pin (moving pages only) */
@keyframes sf-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
@keyframes sf-swish { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(9deg); } }
@keyframes sf-twitch { 0%, 80%, 100% { transform: rotate(0); } 86% { transform: rotate(-14deg); } 92% { transform: rotate(4deg); } }
@keyframes sf-flap { 0%, 100% { transform: scaleX(1); } 45% { transform: scaleX(0.82) skewY(-3deg); } }
@keyframes sf-trunk { 0%, 100% { transform: rotate(0); } 40% { transform: rotate(10deg); } 60% { transform: rotate(-4deg); } }
@keyframes sf-graze { 0%, 18%, 100% { transform: rotate(0); } 34%, 62% { transform: rotate(-26deg); } 48% { transform: rotate(-23deg); } }
@keyframes sf-tilt { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-9deg); } 60% { transform: rotate(5deg); } }
@keyframes sf-flutter { from { transform: skewY(-6deg) scaleX(1); } to { transform: skewY(5deg) scaleX(0.9); } }
@keyframes sf-nod { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(6deg); } }
@keyframes sf-turn { to { transform: rotate(360deg); } }
.sf-motion .blink { animation: sf-blink 4.6s infinite; }
.sf-motion .sf-prop:nth-child(2n) .blink { animation-delay: 1.7s; }
.sf-motion .tail { animation: sf-swish 2.6s ease-in-out infinite; }
.sf-motion .ear { animation: sf-twitch 5.2s ease-in-out infinite; }
.sf-motion .elephant .ear { animation: sf-flap 3.2s ease-in-out infinite; }
.sf-motion .elephant .trunk { animation: sf-trunk 4s ease-in-out infinite; }
.sf-motion .zebra .neck { animation: sf-graze 6s ease-in-out infinite; }
.sf-motion .lion .head { animation: sf-tilt 5s ease-in-out infinite; }
.sf-motion .jeep .flag { animation: sf-flutter 0.9s ease-in-out infinite alternate; }
.sf-motion .giraffe .head { animation: sf-nod 5.5s ease-in-out infinite; }
.sf-motion .sun .rays { animation: sf-turn 90s linear infinite; }
/* the signature: the giraffe leans down to read the name */
.sf-hero-giraffe .neck, .sf-hero-giraffe .head { transition: transform 2.4s cubic-bezier(.34, 1.3, .5, 1); }
.sf-lean .sf-hero-giraffe .neck { transform: rotate(-40deg); }
.sf-lean .sf-hero-giraffe .head { animation: none !important; transform: rotate(18deg); }

/* ---- the first screen: the name in cut-paper letters, a ribbon, a tag, a ticket button */
.sf-hero { position: relative; height: var(--frame); }
.sf-title { position: absolute; left: 33%; top: 9svh; translate: -50% 0; width: min(640px, 60cqw); text-align: center; }
.sf-tag { display: inline-block; padding: 7px 16px 6px; border-radius: 4px; font: 700 12px var(--sf-sans); letter-spacing: 0.24em; text-transform: uppercase; color: var(--coralDark); rotate: -2deg; filter: drop-shadow(0 2px 3px rgba(88, 56, 22, 0.25)); }
.sf-letters { font-family: var(--sf-display); font-weight: 700; font-variation-settings: "SOFT" 100, "opsz" 144; font-size: var(--name-size, clamp(96px, 12cqw, 176px)); line-height: 1.02; margin-top: 12px !important; display: flex; justify-content: center; flex-wrap: wrap; column-gap: 0.02em; }
/* each letter cut from its own sheet: a paper margin round it, a shadow, a tilt */
.sf-letters .sf-l { display: inline-block; color: var(--c); rotate: var(--r); translate: 0 var(--y);
  text-shadow: 3px 0 0 #fffaf0, -3px 0 0 #fffaf0, 0 3px 0 #fffaf0, 0 -3px 0 #fffaf0, 2.5px 2.5px 0 #fffaf0, -2.5px 2.5px 0 #fffaf0, 2.5px -2.5px 0 #fffaf0, -2.5px -2.5px 0 #fffaf0, 6px 0 0 #fffaf0, -6px 0 0 #fffaf0, 0 6px 0 #fffaf0, 0 -6px 0 #fffaf0, 4.5px 4.5px 0 #fffaf0, -4.5px 4.5px 0 #fffaf0, 4.5px -4.5px 0 #fffaf0, -4.5px -4.5px 0 #fffaf0, 0 9px 10px rgba(88, 56, 22, 0.35);
  transition: translate 0.7s cubic-bezier(.34, 1.6, .5, 1), opacity 0.4s; }
.sf-letters .sf-gap { display: inline-block; width: 0.28em; }
.sf-intro .sf-letters .sf-l { translate: 0 -40px; opacity: 0; }
.sf-ribbonwrap { filter: drop-shadow(0 3px 3px rgba(88, 56, 22, 0.28)); }
.sf-ribbon { display: inline-block; margin-top: 4px !important; padding: 9px 36px 10px; background: var(--coral); color: #fff7ea; font-family: var(--sf-display); font-style: italic; font-weight: 500; font-variation-settings: "SOFT" 100; font-size: clamp(24px, 2.6cqw, 32px); line-height: 1;
  clip-path: polygon(0 0, 100% 0, calc(100% - 14px) 50%, 100% 100%, 0 100%, 14px 50%); }
.sf-when { margin-top: 16px !important; font-size: 16px; font-weight: 700; line-height: 1.5; text-wrap: balance; }
.sf-when span { white-space: nowrap; }
.sf-reply { margin-top: 18px; display: inline-flex; align-items: center; min-height: 50px; padding: 0 26px; border: 0; border-radius: 10px; color: var(--ink); font: 700 12px var(--sf-sans); letter-spacing: 0.22em; text-transform: uppercase; cursor: pointer; outline: 2px dashed rgba(59, 38, 20, 0.35); outline-offset: -7px; filter: drop-shadow(0 3px 3px rgba(88, 56, 22, 0.25)); }
.sf-intro .sf-title > :not(.sf-letters) { opacity: 0; translate: 0 10px; }
.sf-title > * { transition: opacity 0.8s ease 0.5s, translate 0.8s ease 0.5s; }

/* ---- the stops: the animal tells the guest, in a paper speech bubble above it. Every bubble
   pauses in the same place (its dock, near the top: sticky for its hold); the gap before each
   stop, a frame long, is the drive, so one bubble is on screen at a time. savanna.ts sets the
   dock (the bubble's top) and stretches the tail down to the animal. */
.sf-stop { position: relative; padding-top: var(--frame); }
.sf-hero + .sf-stop { padding-top: calc(var(--frame) * 0.5); }
.sf-dock { position: relative; }
.sf-hold { height: calc(var(--frame) * 0.42); }
.sf-say { position: sticky; top: 7svh; width: min(470px, 40cqw); margin-left: calc(var(--at, 0.4) * 100cqw - min(470px, 40cqw) / 2); filter: drop-shadow(0 3px 3px rgba(88, 56, 22, 0.22)) drop-shadow(0 12px 18px rgba(88, 56, 22, 0.14)); }
.sf-bubble { position: relative; padding: 34px 32px 26px; border-radius: 30px; text-align: center; background-color: var(--tint); }
.sf-bubble::after { content: ""; position: absolute; left: var(--tail, 50%); top: calc(100% - 1px); width: 46px; height: var(--tailh, 30px); margin-left: -10px; background: inherit; clip-path: polygon(0 0, 100% 0, 14% 100%); }
.sf-tab { position: absolute; left: 50%; top: -15px; translate: -50% 0; rotate: -2deg; padding: 6px 14px 5px; border-radius: 4px; background: var(--coral); color: #fff7ea; font: 700 11px var(--sf-sans); letter-spacing: 0.24em; text-transform: uppercase; white-space: nowrap; }
.sf-h2 { font-family: var(--sf-display); font-weight: 700; font-variation-settings: "SOFT" 100, "opsz" 144; font-size: clamp(40px, 4cqw, 56px); line-height: 1; text-wrap: balance; }
.sf-addr { font-size: 15.5px; margin-top: 8px !important; }
.sf-legs { margin-top: 16px; text-align: left; }
.sf-legs > div { display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 12px; padding: 10px 0; border-top: 1.5px dashed rgba(59, 38, 20, 0.25); align-items: baseline; }
.sf-legs b { font-weight: 800; font-size: 14.5px; white-space: nowrap; color: var(--coralDark); }
.sf-legs span { font-size: 16.5px; line-height: 1.4; }
.sf-legs em { display: block; font-style: normal; font-size: 14px; opacity: 0.75; margin-top: 2px; }
.sf-p { font-family: var(--sf-display); font-weight: 450; font-variation-settings: "SOFT" 100; font-size: clamp(22px, 2.2cqw, 28px); line-height: 1.3; margin-top: 12px !important; text-wrap: balance; }
.sf-faq { padding: 12px 0; border-top: 1.5px dashed rgba(59, 38, 20, 0.25); text-align: left; }
.sf-faq:first-of-type { margin-top: 14px; }
.sf-faq b { display: block; font-weight: 800; font-size: 16px; }
.sf-faq span { display: block; font-size: 15px; line-height: 1.45; opacity: 0.85; margin-top: 2px; }
.sf-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 16px; }
.sf-btn { display: inline-flex; align-items: center; min-height: 44px; padding: 0 20px; border-radius: 999px; border: 0; background: var(--coral); color: #fff7ea; font: 700 11px var(--sf-sans); letter-spacing: 0.2em; text-transform: uppercase; text-decoration: none; cursor: pointer; box-shadow: 0 3px 0 var(--coralDark); }
.sf-gifts { margin-top: 16px; text-align: left; }

/* ---- the reply: a safari pass, notched at its sides under the header, a perforation */
.sf-last { position: relative; min-height: var(--frame); padding: calc(var(--frame) * 0.95) 0 10svh; }
.sf-passwrap { width: min(460px, 40cqw); margin-left: calc(0.34 * 100cqw - min(460px, 40cqw) / 2); filter: drop-shadow(0 3px 3px rgba(88, 56, 22, 0.22)) drop-shadow(0 16px 22px rgba(88, 56, 22, 0.16)); }
.sf-pass { border-radius: 16px; text-align: center; overflow: hidden;
  -webkit-mask: radial-gradient(circle 13px at 0 94px, transparent 12.5px, #000 13px) left / 51% 100% no-repeat, radial-gradient(circle 13px at 100% 94px, transparent 12.5px, #000 13px) right / 51% 100% no-repeat;
  mask: radial-gradient(circle 13px at 0 94px, transparent 12.5px, #000 13px) left / 51% 100% no-repeat, radial-gradient(circle 13px at 100% 94px, transparent 12.5px, #000 13px) right / 51% 100% no-repeat; }
.sf-pass .sf-head { height: 94px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: var(--coral); color: #fff7ea; padding: 0 20px; }
.sf-pass .sf-head b { font-family: var(--sf-display); font-weight: 700; font-variation-settings: "SOFT" 100; font-size: 30px; line-height: 1; }
.sf-pass .sf-head span { font: 700 11px var(--sf-sans); letter-spacing: 0.26em; text-transform: uppercase; margin-top: 7px; opacity: 0.9; }
.sf-pass .sf-body { position: relative; padding: 24px 28px 26px; }
.sf-pass .sf-body::before { content: ""; position: absolute; left: 18px; right: 18px; top: 0; height: 2px; background: linear-gradient(90deg, rgba(59,38,20,0.28) 50%, transparent 50%) 0 0 / 12px 2px repeat-x; }
.sf-pass h2 { font-family: var(--sf-display); font-weight: 700; font-variation-settings: "SOFT" 100, "opsz" 144; font-size: 36px; line-height: 1.05; text-wrap: balance; }
.sf-by { font: 700 11px var(--sf-sans); letter-spacing: 0.2em; text-transform: uppercase; color: var(--coralDark); margin-top: 8px !important; text-wrap: balance; }
.sf-small { font-size: 14.5px; line-height: 1.5; color: #6b5440; margin-top: 10px !important; }
.sf-form { text-align: left; }
.sf-form label { display: block; font: 700 11px var(--sf-sans); letter-spacing: 0.18em; text-transform: uppercase; color: #7a5a3e; margin-top: 16px; }
.sf-field { display: block; width: 100%; font: 17px var(--sf-sans); padding: 13px 14px; border: 0; border-radius: 12px; background: #fff; color: var(--ink); margin-top: 8px; box-shadow: inset 0 0 0 1.5px rgba(59, 38, 20, 0.18); letter-spacing: 0; text-transform: none; }
textarea.sf-field { resize: vertical; min-height: 88px; }
.sf-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.sf-pill { min-height: 50px; padding: 0 8px; border: 0; border-radius: 999px; font: 700 15px var(--sf-sans); background: #fff; color: var(--ink); box-shadow: inset 0 0 0 1.5px rgba(59, 38, 20, 0.25); cursor: pointer; }
.sf-pill.is-on { background: var(--ink); color: #fff7ea; box-shadow: none; }
.sf-seats { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; font: 700 11px var(--sf-sans); letter-spacing: 0.18em; text-transform: uppercase; color: #7a5a3e; }
.sf-seats__ctrl { display: inline-flex; align-items: center; gap: 14px; font-size: 18px; color: var(--ink); letter-spacing: 0; }
.sf-seats__ctrl button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: #fff; box-shadow: inset 0 0 0 1.5px rgba(59, 38, 20, 0.25); font-size: 20px; color: var(--ink); cursor: pointer; }
.sf-seats__ctrl button:disabled { opacity: 0.4; }
.sf-link { display: inline-block; margin-top: 8px; padding: 6px 0; border: 0; background: none; color: #7a5a3e; font: 13px var(--sf-sans); text-decoration: underline; cursor: pointer; }
.sf-error { color: #b3261e; font-size: 14px; margin-top: 14px !important; }
.sf-send { margin-top: 18px; width: 100%; min-height: 54px; border: 0; border-radius: 999px; background: var(--coral); color: #fff7ea; font: 700 12px var(--sf-sans); letter-spacing: 0.22em; text-transform: uppercase; cursor: pointer; box-shadow: 0 3px 0 var(--coralDark); }
.sf-send:disabled { opacity: 0.7; cursor: default; }
.sf-again { margin-top: 18px; min-height: 44px; padding: 0 20px; border-radius: 999px; border: 0; box-shadow: inset 0 0 0 1.5px rgba(59, 38, 20, 0.3); background: #fff; color: var(--ink); font: 700 11px var(--sf-sans); letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; }
.sf-maker { margin-top: 18px !important; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7a5a3e; }
.sf-maker a, .sf-maker b { color: var(--ink); font-weight: 700; }

.sf-gallery { --frame: 75cqw; }
.sf-gallery .sf-title { top: 7cqw; }
@media (prefers-reduced-motion: reduce) { .sf-root *, .sf-root *::before, .sf-root *::after { animation: none !important; transition: none !important; } }

/* ---- phones: everything centred over the scene */
@container (max-width: 700px) {
  .sf-title { left: 50%; top: 6svh; width: calc(100cqw - 32px); }
  .sf-letters { font-size: var(--name-size-m, clamp(84px, 26cqw, 120px)); }
  .sf-ribbon { font-size: 23px; padding: 8px 30px 9px; }
  .sf-when { font-size: 15px; margin-top: 12px !important; }
  .sf-reply { margin-top: 14px; min-height: 46px; }
  .sf-hold { height: calc(var(--frame) * 0.34); }
  .sf-say, .sf-passwrap { width: calc(100cqw - 32px); margin-left: 16px; }
  .sf-bubble { padding: 30px 22px 22px; border-radius: 26px; }
  .sf-h2 { font-size: 40px; }
  .sf-legs > div { grid-template-columns: 72px minmax(0, 1fr); gap: 10px; padding: 9px 0; } .sf-legs b { font-size: 13.5px; } .sf-legs span { font-size: 15.5px; }
  .sf-last { padding: calc(var(--frame) * 0.95) 0 44svh; }
  .sf-pass .sf-body { padding: 20px 20px 22px; } .sf-pass h2 { font-size: 32px; }
  .sf-sun { width: 84px; right: -22px; top: -22px; }
}
`;
