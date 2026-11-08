// The Paddle Case. The scene is the still at its own pixel size (3240 × 2160), moved by one
// transform (the camera); each surface is a fixed box of design px laid onto its object by an
// affine. Inside a surface every size is `N * var(--u)`, where --u is 1px × --fit: the words
// shrink to fit their face (scene.ts fitSurface). Nothing is fixed to the window: the stage is
// sticky inside the page and its frame is the page's (100svh; the card's 4:3 on the gallery).

const u = (n: number) => `calc(${n} * var(--u))`;

export const PADDLECASE_CSS = `
.pc-root { --frame: 100svh; position: relative; container-type: inline-size; overflow: clip; isolation: isolate;
  background: #5e3519; -webkit-font-smoothing: antialiased; }
.pc-root *, .pc-root *::before, .pc-root *::after { box-sizing: border-box; }
.pc-root p, .pc-root h1, .pc-root h2, .pc-root ol, .pc-root li { margin: 0; padding: 0; }
.pc-gallery { --frame: calc(75cqw + 4px); }
.pc-gallery .pc-stage { margin-bottom: 0; }
.pc-stage { position: sticky; top: 0; z-index: 1; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); overflow: hidden;
  background: radial-gradient(120% 90% at 50% 45%, #74431f, #4e2b14); }
.pc-track > section { height: var(--frame); }
.pc-scene { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.pc-moving .pc-scene { will-change: transform; }
.pc-still { display: block; width: 100%; height: 100%; max-width: none; user-select: none; -webkit-user-drag: none; pointer-events: none; }
.pc-cv { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0; visibility: hidden; transition: opacity .25s ease, visibility 0s linear .3s; }
.pc-intro .pc-cv { opacity: 1; visibility: visible; transition: none; }
.pc-intro .pc-still { visibility: hidden; }

/* a surface: its face, at its own size (set inline), laid onto its object */
.pc-surf { position: absolute; left: 0; top: 0; transform-origin: 0 0; overflow: hidden; --u: calc(var(--fit, 1) * 1px); transition: opacity .6s ease; }
.pc-intro .pc-surf:not(.pc-wear) { opacity: .01; transition: none; }
.pc-in { width: 100%; }

/* gold foil, pressed in: a still metallic gradient clipped to the letters (never animated) */
.pc-foil { background: linear-gradient(115deg, #8a6a2f 0%, #f3dc9a 22%, #b8903f 40%, #fff1c4 52%, #a37c35 68%, #e9cd84 84%, #8a6a2f 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 -1px 0 rgba(0,0,0,.35)) drop-shadow(0 1px 0 rgba(255,235,190,.25)); }

/* the leather patch: the name */
.pc-title { display: flex; align-items: center; padding: 30px 44px; text-align: center; font-family: var(--pc-display); }
.pc-title .k { display: block; font: 600 ${u(34)}/1.2 var(--pc-sans); letter-spacing: .5em; padding-left: .5em; text-transform: uppercase; }
.pc-title .n { display: block; font-weight: 700; font-size: ${u(230)}; line-height: .9; margin-top: ${u(18)}; padding-bottom: .08em; text-wrap: balance; overflow-wrap: anywhere; }
.pc-title .t { display: block; font-style: italic; font-weight: 500; font-size: ${u(70)}; line-height: 1; margin-top: ${u(6)}; padding-bottom: .1em; }
.pc-title .d { display: block; font: 500 ${u(31)}/1.5 var(--pc-sans); letter-spacing: .22em; text-transform: uppercase; margin-top: ${u(24)}; }
.pc-title .d > span { display: block; text-wrap: balance; }
.pc-title .nw { white-space: nowrap; }

/* the paddle face: the initials, stamped */
.pc-paddle { display: flex; align-items: center; padding: 60px 40px; text-align: center; }
.pc-paddle .mono { display: block; font: 600 ${u(360)}/1 var(--pc-display); letter-spacing: -.02em; padding-bottom: .06em; white-space: nowrap; }
.pc-paddle .rule { display: block; width: ${u(180)}; height: ${u(6)}; margin: ${u(30)} auto ${u(22)}; background: linear-gradient(115deg, #8a6a2f, #f3dc9a 30%, #b8903f 55%, #e9cd84 80%, #8a6a2f); box-shadow: 0 -1px 0 rgba(0,0,0,.35); }
.pc-paddle .yr { display: block; font: 600 ${u(40)}/1.2 var(--pc-sans); letter-spacing: .6em; padding-left: .6em; }

/* the hang tag: the host's note, handwritten */
.pc-message { padding: 150px 50px 40px; color: #3a2a20; font: 600 ${u(62)}/1.16 "Caveat", cursive; }
.pc-message .hole { position: absolute; left: 50%; top: 52px; width: 54px; height: 54px; margin-left: -27px; border-radius: 50%; box-shadow: inset 0 2px 5px rgba(0,0,0,.45); background: rgba(0,0,0,.18); }
.pc-message p + p { margin-top: ${u(20)}; }
.pc-message .sig { display: block; text-align: right; margin-top: ${u(26)}; font-weight: 700; color: #8a3a22; }

/* the tournament card: the day, printed */
.pc-schedule { padding: 150px 60px 50px; color: #2b241e; font-family: var(--pc-sans); }
.pc-schedule .h { display: block; font: 600 ${u(30)}/1.2 var(--pc-sans); letter-spacing: .42em; padding-left: .42em; text-transform: uppercase; color: #8a6a2f; text-align: center; }
.pc-schedule .ht { display: block; font: 600 ${u(96)}/1 var(--pc-display); text-align: center; margin-top: ${u(16)}; text-wrap: balance; }
.pc-schedule ol { list-style: none; margin-top: ${u(32)}; border-top: ${u(2)} solid #c9b48a; }
.pc-schedule li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: ${u(22)}; padding: ${u(18)} 0; border-bottom: ${u(2)} solid #ddd0b4; font-size: ${u(40)}; line-height: 1.2; align-items: baseline; }
.pc-schedule li b { font-weight: 600; color: #8a6a2f; white-space: nowrap; font-size: ${u(34)}; }
.pc-schedule li em { display: block; font-style: normal; font-size: ${u(28)}; color: #6b5d50; margin-top: ${u(4)}; }
.pc-schedule .where { margin-top: ${u(24)}; font: 500 ${u(28)}/1.35 var(--pc-sans); color: #4a3f35; text-align: center; }
.pc-schedule .where b { font-weight: 600; color: #2b241e; }
.pc-schedule .links { margin-top: ${u(8)}; }
.pc-schedule .links a { font-size: ${u(26)} !important; color: #8a6a2f !important; }

/* the packing label */
.pc-bring { display: flex; align-items: center; padding: 30px 50px; color: #2b241e; font-family: var(--pc-sans); }
.pc-bring .pc-in { display: flex; align-items: center; gap: ${u(40)}; }
.pc-bring .h { flex: none; font: 600 ${u(30)}/1.2 var(--pc-sans); letter-spacing: .4em; text-transform: uppercase; color: #8a6a2f; }
.pc-bring .l { flex: 1 1 auto; min-width: 0; font: 500 ${u(36)}/1.35 var(--pc-sans); }

/* the towel: what to wear, embroidered */
.pc-wear { padding: 120px 40px; text-align: center; color: #7d5a2c; font-family: var(--pc-sans); text-shadow: 0 1.5px 0 rgba(60,40,15,.35), 0 -1px 0 rgba(255,248,232,.55); }
.pc-wear .h { display: block; font: 600 ${u(30)}/1.2 var(--pc-sans); letter-spacing: .5em; padding-left: .5em; text-transform: uppercase; }
.pc-wear .i { display: block; font: italic 600 ${u(58)}/1.25 var(--pc-display); margin-top: ${u(30)}; text-wrap: balance; }
.pc-wear .i + .i { margin-top: ${u(6)}; }

/* the scorecard: the reply */
.pc-rsvp { padding: 150px 52px 40px; color: #2b241e; font-family: "Special Elite", ui-monospace, monospace; }
.pc-rsvp .h { display: block; font-size: ${u(40)}; letter-spacing: .14em; text-align: center; text-transform: uppercase; line-height: 1.15; }
.pc-rsvp .sub { font-size: ${u(26)}; text-align: center; margin-top: ${u(10)}; color: #6b5d50; line-height: 1.35; }
.pc-rsvp .small { font-size: ${u(24)}; color: #6b5d50; margin-top: ${u(12)}; line-height: 1.35; text-align: center; }
.pc-rsvp label { display: block; margin-top: ${u(24)}; font-size: ${u(29)}; color: #6b5d50; line-height: 1.2; }
.pc-rsvp .line { display: block; width: 100%; background: transparent; border: 0; border-bottom: ${u(3)} dotted #9d8f80; border-radius: 0; outline: none; font: 700 ${u(52)}/1.15 "Caveat", cursive; color: #1d3a7a; padding: ${u(2)} ${u(4)} 0; resize: none; -webkit-appearance: none; appearance: none; }
.pc-rsvp textarea.line { height: auto; }
.pc-rsvp .line:focus-visible { border-bottom-color: #1d3a7a; border-bottom-style: solid; }
.pc-rsvp .yn { display: grid; grid-template-columns: 1fr 1fr; gap: ${u(26)}; margin-top: ${u(28)}; }
.pc-rsvp .yn button { font: 400 ${u(34)} "Special Elite", ui-monospace, monospace; color: #2b241e; background: transparent; border: ${u(3)} solid #2b241e; border-radius: 0; padding: ${u(20)} 0; cursor: pointer; position: relative; }
.pc-rsvp .yn button[aria-pressed="true"]::after { content: "✓"; position: absolute; right: ${u(14)}; top: ${u(-18)}; font: 700 ${u(90)}/1 "Caveat", cursive; color: #1d3a7a; }
.pc-rsvp .yn button[aria-pressed="false"].dim { opacity: .45; }
.pc-rsvp .seats { display: flex; align-items: center; justify-content: space-between; margin-top: ${u(24)}; font-size: ${u(26)}; color: #6b5d50; }
.pc-rsvp .seats span:last-child { display: inline-flex; align-items: center; gap: ${u(18)}; }
.pc-rsvp .seats button { width: ${u(54)}; height: ${u(54)}; border: ${u(3)} solid #2b241e; background: transparent; border-radius: 50%; font: 400 ${u(34)}/1 "Special Elite", monospace; color: #2b241e; cursor: pointer; padding: 0; }
.pc-rsvp .seats button:disabled { opacity: .35; cursor: default; }
.pc-rsvp .seats output { font: 700 ${u(56)}/1 "Caveat", cursive; color: #1d3a7a; min-width: ${u(30)}; text-align: center; }
.pc-rsvp .err { margin-top: ${u(16)}; font-size: ${u(24)}; color: #a4352a; text-align: center; line-height: 1.3; }
.pc-rsvp .send { display: block; margin: ${u(34)} auto 0; font: 400 ${u(34)} "Special Elite", ui-monospace, monospace; letter-spacing: .3em; padding: ${u(16)} ${u(30)} ${u(16)} ${u(42)}; color: #a4352a; border: ${u(5)} double #a4352a; background: transparent; transform: rotate(-4deg); cursor: pointer; text-transform: uppercase; }
.pc-rsvp .send:disabled { opacity: .6; cursor: default; }
.pc-rsvp .done { font: 700 ${u(80)}/1.1 "Caveat", cursive; color: #1d3a7a; text-align: center; margin-top: ${u(90)}; text-wrap: balance; }
.pc-rsvp .again { display: block; margin: ${u(30)} auto 0; background: none; border: 0; font: 400 ${u(24)} "Special Elite", monospace; color: #2b241e; text-decoration: underline; cursor: pointer; }
.pc-rsvp .made { margin-top: ${u(30)}; font: 500 ${u(19)}/1.4 var(--pc-sans); letter-spacing: .04em; color: #8a7d70; text-align: center; }
.pc-rsvp .made a { color: inherit; }
.pc-rsvp button:focus-visible, .pc-schedule a:focus-visible { outline: ${u(3)} solid #1d3a7a; outline-offset: ${u(4)}; }

/* the stage's own small print */
.pc-hint { position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%); font: 500 12px var(--pc-sans); letter-spacing: .24em; text-transform: uppercase; color: rgba(255,240,220,.78); transition: opacity .5s; pointer-events: none; text-shadow: 0 1px 6px rgba(0,0,0,.4); }
.pc-intro .pc-hint, .pc-moved .pc-hint { opacity: 0; }
.pc-credit { position: absolute; left: 0; right: 0; bottom: 10px; text-align: center; font: 500 11px var(--pc-sans); letter-spacing: .06em; color: rgba(255,240,220,.72); opacity: 0; transition: opacity .5s; pointer-events: none; text-shadow: 0 1px 6px rgba(0,0,0,.5); }
.pc-end .pc-credit { opacity: 1; pointer-events: auto; }
.pc-credit a { color: inherit; }

@media (prefers-reduced-motion: reduce) { .pc-surf, .pc-cv, .pc-hint, .pc-credit { transition: none; } }
`;
