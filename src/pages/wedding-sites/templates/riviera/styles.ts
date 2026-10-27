// Riviera: one yacht seen from above, the whole page long, on a drawn sea. Sizes follow the
// page's own width (container units), never the window's, so the builder's scaled preview and
// the phone preview lay out like the real thing.
export const RIVIERA_CSS = `
.rv-root { --beam: min(600px, calc(100cqw - 30px)); --white: #fff; --deck: #fbfbf9; --shade: #cdd6dd; --chrome: #b5bfc8;
  --cushion: #e7e1d7; --seam: #d2c9bb; --glass: #2a333e; --ink: #1b2a38; --ink-2: #5a6876; --gold: #a98450;
  --rv-teak: url("/event-templates/riviera/teak.jpg") 0 0 / 110px auto repeat;
  position: relative; container-type: inline-size; overflow-x: clip; isolation: isolate; color: var(--ink);
  font-family: var(--rv-sans); -webkit-font-smoothing: antialiased;
  background: radial-gradient(70% 40% at 50% 20%, #2a86bd, transparent 75%), linear-gradient(180deg, #17679c, #0c4a77); }
.rv-root *, .rv-root *::before, .rv-root *::after { box-sizing: border-box; }
.rv-root p, .rv-root h1, .rv-root h2, .rv-root h3 { margin: 0; }
.rv-sea { position: sticky; top: 0; display: block; width: 100%; height: 100svh; margin-bottom: -100svh; z-index: 0; pointer-events: none; }
.rv-voyage { position: relative; z-index: 1; padding: 54px 0 0; }
.rv-label { font-family: var(--rv-sans); font-size: 11px; font-weight: 500; letter-spacing: 0.26em; text-transform: uppercase; }
.rv-gold { color: var(--gold); }
.rv-root h1, .rv-root h2, .rv-note, .rv-date { text-wrap: balance; }
.rv-hint { opacity: 0.55; font-style: italic; }

/* The yacht: a bow and stern of fixed shape, and a middle that grows with the sections. */
.rv-yacht { position: relative; width: var(--beam); margin: 0 auto; filter: drop-shadow(16px 28px 16px rgba(2, 24, 44, 0.42)); }
.rv-play .rv-yacht { animation: rv-sail-in 4.2s cubic-bezier(0.16, 0.7, 0.2, 1) both; }
@keyframes rv-sail-in { from { transform: translateY(105svh); } to { transform: none; } }
.rv-bow, .rv-stern { display: block; width: 100%; height: auto; }
.rv-bow { margin-bottom: -2px; }
.rv-mid { position: relative; display: flow-root; padding: 0 10.5% 30px;
  background: linear-gradient(90deg, #c3ccd4 0%, #f4f7f9 0.4%, #9aa6b1 0.75%, #e8edf1 1.05%, #eef2f5 1.4%, #fff 3%, #fff 4.9%, #d9dfe4 5.33%, var(--deck) 5.6%, var(--deck) 94.4%, #d9dfe4 94.67%, #fff 95.1%, #fff 97%, #eef2f5 98.6%, #e8edf1 98.95%, #9aa6b1 99.25%, #f4f7f9 99.6%, #c3ccd4 100%); }
/* the guard rails, on stanchions */
.rv-mid::before, .rv-mid::after { content: ""; position: absolute; top: 0; bottom: 0; width: 7px; pointer-events: none;
  background: linear-gradient(90deg, transparent 2px, var(--chrome) 2px 4px, transparent 4px), repeating-linear-gradient(180deg, transparent 0 66px, var(--chrome) 66px 72px);
  background-size: 100% 100%, 3px 100%; background-repeat: no-repeat; background-position: 0 0, 2px 0; }
.rv-mid::before { left: calc(7% - 3px); } .rv-mid::after { right: calc(7% - 3px); }

.rv-zone { position: relative; }
.rv-zone + .rv-zone { margin-top: 22px; }

/* The sun pad on the foredeck: the names. Its top follows the bow. */
.rv-sunpad { margin-top: -205px; padding: 118px 9% 50px; text-align: center; border-radius: 50% 50% 16px 16px / 190px 190px 16px 16px;
  background: repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.025) 0 1px, transparent 1px 3px), radial-gradient(110% 70% at 50% 30%, #f3eee6, var(--cushion));
  box-shadow: inset 0 0 0 3px #efe9df, inset 0 0 0 4px #d8cfbf, inset 0 -14px 24px rgba(120, 100, 80, 0.16), 0 0 0 5px #f2f4f6, 0 6px 12px -6px rgba(60, 50, 40, 0.35); }
.rv-names { font-family: var(--rv-display); font-weight: 400; font-size: clamp(44px, 8.6cqw, 74px); line-height: 1.02; margin: 18px 0 16px !important; color: var(--ink); }
.rv-names em { font-style: italic; color: var(--gold); }
.rv-date { font-family: var(--rv-display); font-size: 19px; color: var(--ink-2); }
.rv-reply { margin-top: 26px; display: inline-flex; align-items: center; gap: 12px; min-height: 46px; padding: 0 24px; border: 0; border-radius: 3px; background: var(--ink); color: #fff; font: 500 11px var(--rv-sans); letter-spacing: 0.24em; text-transform: uppercase; cursor: pointer; }
.rv-reply i { width: 20px; height: 1px; background: var(--gold); }
.rv-prop { position: absolute; z-index: 2; pointer-events: none; filter: drop-shadow(5px 8px 5px rgba(30, 20, 10, 0.38)); }
.rv-prop--hat { width: 26%; right: -4%; bottom: -8%; rotate: 14deg; }
.rv-prop--shades { width: 16%; left: 3%; bottom: 2%; rotate: -22deg; }
.rv-prop--glasses { width: 26%; right: 3%; top: -18px; rotate: 8deg; }

/* The deckhouse: a curved windscreen (times), the hardtop (the invitation), dark side windows. */
.rv-house { margin-top: 30px; }
.rv-house::before, .rv-house::after { content: ""; position: absolute; top: 40px; bottom: 30px; width: 10px; border-radius: 6px; background: linear-gradient(180deg, #3b4652, #1f2731); }
.rv-house::before { left: -6.5%; } .rv-house::after { right: -6.5%; }
.rv-screen { padding: 58px 7% 30px; text-align: center; color: #f3f6f8; border-radius: 50% 50% 0 0 / 52px 52px 0 0;
  background: linear-gradient(118deg, rgba(255,255,255,0) 32%, rgba(255,255,255,0.13) 44%, rgba(255,255,255,0) 54%), linear-gradient(180deg, #3d4957, var(--glass));
  box-shadow: inset 0 0 0 4px #e9edf0, inset 0 0 0 5px #c4cdd5; }
.rv-screen--only { border-radius: 50% 50% 22px 22px / 52px 52px 22px 22px; }
.rv-times { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); margin-top: 18px; }
.rv-times > div + div { border-left: 1px solid rgba(255,255,255,0.16); }
.rv-k { font-size: 9.5px; letter-spacing: 0.24em; text-transform: uppercase; color: #c6d0da; }
.rv-v { font-family: var(--rv-display); font-size: 24px; margin-top: 6px !important; }
.rv-roof { padding: 46px 9% 44px; text-align: center; border-radius: 0 0 22px 22px; background: linear-gradient(180deg, #ffffff, #f2f5f7); box-shadow: inset 0 0 0 1px #e1e6ea, 0 10px 18px -12px rgba(30, 50, 70, 0.4); }
.rv-roof--only { border-radius: 22px; }
.rv-note { font-family: var(--rv-display); font-size: 21px; line-height: 1.55; max-width: 30ch; margin: 16px auto 0 !important; }
.rv-note + .rv-note { margin-top: 14px !important; }
.rv-sunroof { display: block; width: 52%; height: 10px; margin: 28px auto 0; border-radius: 6px; background: linear-gradient(180deg, #4a5663, #2a333e); box-shadow: 0 0 0 3px #e6ebef; }

/* Teak: the cockpit (white seating around it) and the aft deck. */
.rv-cockpit { border-radius: 14px 14px 10px 10px; padding: 30px 26px 36px; border: 18px solid #fff; border-top-width: 14px; background: var(--rv-teak);
  box-shadow: inset 0 8px 18px rgba(40, 20, 5, 0.32), 0 0 0 1px #dfe5ea; }
.rv-cockpit::before { content: ""; position: absolute; inset: -18px -18px auto; height: 14px; border-radius: 14px 14px 0 0; background: repeating-linear-gradient(90deg, var(--cushion) 0 calc(33.33% - 2px), var(--seam) calc(33.33% - 2px) 33.33%); opacity: 0.9; }
.rv-aft { border-radius: 10px; padding: 34px 26px 38px; background: var(--rv-teak); box-shadow: inset 0 0 0 5px #f3f5f7, inset 0 8px 18px rgba(40, 20, 5, 0.22); }
.rv-cleat { position: absolute; width: 30px; height: 11px; border-radius: 6px; background: linear-gradient(180deg, #fcfdfd, #aab5bf); box-shadow: 0 2px 3px rgba(0,0,0,0.28); }
.rv-plate { background: #fbf8f2; border-radius: 6px; padding: 26px 24px; text-align: center; box-shadow: 0 12px 24px -12px rgba(30, 15, 5, 0.65); }
.rv-plate + .rv-plate { margin-top: 18px; }
.rv-h2 { font-family: var(--rv-display); font-weight: 400; font-size: 31px; line-height: 1.15; margin-top: 10px !important; }
.rv-text { font-family: var(--rv-display); font-size: 18px; line-height: 1.6; margin-top: 12px !important; color: var(--ink); }
.rv-small { font-size: 13.5px; line-height: 1.55; color: var(--ink-2); margin-top: 10px !important; }
.rv-addr { font-size: 15px; color: var(--ink-2); margin-top: 6px !important; }
.rv-legs { margin-top: 16px; }
.rv-legs > div { display: grid; grid-template-columns: 84px minmax(0,1fr); gap: 12px; padding: 12px 0; border-top: 1px solid #e8e1d4; text-align: left; }
.rv-legs b { font-family: var(--rv-display); font-weight: 500; font-size: 17px; color: var(--gold); white-space: nowrap; }
.rv-legs span { font-size: 15px; line-height: 1.5; }
.rv-legs em { display: block; font-style: normal; font-size: 13.5px; color: var(--ink-2); margin-top: 2px; }
.rv-faq { text-align: left; padding: 14px 0; border-top: 1px solid #e8e1d4; }
.rv-faq:first-of-type { margin-top: 12px; }
.rv-faq b { display: block; font-weight: 500; font-size: 15.5px; }
.rv-faq span { display: block; font-size: 15px; line-height: 1.55; color: var(--ink-2); margin-top: 4px; }
.rv-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 16px; }
.rv-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 22px; border-radius: 3px; border: 1px solid var(--ink); background: transparent; color: var(--ink); font: 500 11px var(--rv-sans); letter-spacing: 0.22em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
.rv-btn--solid { background: var(--ink); color: #fff; width: 100%; margin-top: 22px; }
.rv-btn:disabled { opacity: 0.6; cursor: default; }

/* The reply card */
.rv-form { text-align: left; margin-top: 8px; }
.rv-form label { display: block; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-2); margin-top: 16px; }
.rv-field { display: block; width: 100%; font: 16px var(--rv-sans); padding: 13px 14px; border: 1px solid #ddd3c3; border-radius: 4px; background: #fff; color: var(--ink); margin-top: 8px; letter-spacing: 0; text-transform: none; }
textarea.rv-field { resize: vertical; min-height: 96px; }
.rv-pills { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
.rv-pill { min-height: 48px; padding: 0 8px; border: 1px solid #ddd3c3; border-radius: 4px; background: #fff; color: var(--ink); font: 15px var(--rv-sans); cursor: pointer; }
.rv-pill.is-on { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
.rv-seats { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-2); }
.rv-seats__ctrl { display: inline-flex; align-items: center; gap: 14px; font-size: 18px; color: var(--ink); letter-spacing: 0; }
.rv-seats__ctrl button { width: 44px; height: 44px; border-radius: 50%; border: 1px solid #ddd3c3; background: #fff; font-size: 20px; color: var(--ink); cursor: pointer; }
.rv-seats__ctrl button:disabled { opacity: 0.4; }
.rv-link { display: inline-block; margin-top: 8px; padding: 6px 0; border: 0; background: none; color: var(--ink-2); font: 13px var(--rv-sans); text-decoration: underline; cursor: pointer; }
.rv-error { color: #b3261e; font-size: 14px; margin-top: 14px !important; }

/* the maker's mark, lettered on the stern deck */
.rv-maker { margin-top: 34px !important; text-align: center; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-2); }
.rv-maker a, .rv-maker b { color: var(--ink); font-weight: 500; }

/* the stern flag, streaming aft over the wake */
.rv-ensign { position: absolute; left: 50%; bottom: -50px; width: 58px; height: 38px; translate: -50% 0; z-index: 3; pointer-events: none; }
.rv-ensign i { position: absolute; inset: 0; display: grid; place-items: center; background: #13233a; border-radius: 1px; transform-origin: 50% 0; box-shadow: 3px 5px 6px rgba(0,0,0,0.3); font: 500 10px var(--rv-sans); font-style: normal; letter-spacing: 0.2em; color: #d9bd86; }
.rv-ensign b { position: absolute; left: 50%; top: -14px; width: 3px; height: 16px; translate: -50% 0; background: linear-gradient(90deg, #f3f6f8, #9aa6b1); border-radius: 2px; }
.rv-motion .rv-ensign i { animation: rv-flutter 1.4s ease-in-out infinite alternate; }
@keyframes rv-flutter { from { transform: skewX(4deg) scaleY(1); } to { transform: skewX(-5deg) scaleY(0.94); } }
.rv-wake-room { height: 360px; }

/* The gallery card: the first screen only. */
.rv-gallery .rv-voyage { padding-top: 34px; }

@container (max-width: 700px) {
  .rv-mid { padding: 0 9.5% 24px; }
  .rv-sunpad { margin-top: -118px; padding: 92px 8% 38px; border-radius: 50% 50% 14px 14px / 116px 116px 14px 14px; }
  .rv-screen { padding-top: 46px; }
  .rv-v { font-size: 19px; }
  .rv-cockpit { padding: 22px 14px 26px; border-width: 12px; }
  .rv-cockpit::before { inset: -12px -12px auto; height: 10px; }
  .rv-aft { padding: 22px 14px 26px; }
  .rv-plate { padding: 22px 16px; }
  .rv-note { font-size: 19px; }
  .rv-legs > div { grid-template-columns: 72px minmax(0,1fr); gap: 10px; }
  .rv-legs b { font-size: 15.5px; }
  .rv-wake-room { height: 260px; }
}
@media (prefers-reduced-motion: reduce) {
  .rv-root *, .rv-root *::before, .rv-root *::after { animation: none !important; }
}
`;
