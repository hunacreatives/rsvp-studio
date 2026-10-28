// Level Up: a low-poly island in real 3D, flown over quest by quest as the guest scrolls, with a
// game's HUD over it. Sizes follow the page's own width (container units), never the window's;
// nothing is fixed to the window (the world, the HUD and the confetti are a sticky frame inside
// the page).
export const LEVELUP_CSS = `
.lu-root { --frame: 100svh; --glass: rgba(10, 22, 40, 0.74); --line: rgba(140, 230, 255, 0.35); --cyan: #7ff0ff; --lime: #c6ff5e; --gold: #ffd24a; --navy: #0a1628;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: #eaf6ff;
  font-family: var(--lu-sans); -webkit-font-smoothing: antialiased; background: #dfeaf3; }
.lu-root *, .lu-root *::before, .lu-root *::after { box-sizing: border-box; }
.lu-root p, .lu-root h1, .lu-root h2, .lu-root h3 { margin: 0; }
.lu-stage { position: sticky; top: 0; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); z-index: 0; overflow: hidden; pointer-events: none; }
.lu-gl, .lu-burst { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.lu-burst { z-index: 3; }
.lu-world { position: relative; z-index: 2; }

/* ---- the HUD over the world */
.lu-hud { position: absolute; inset: 0; z-index: 2; transition: opacity 0.8s; }
.lu-booting .lu-hud { opacity: 0; }
.lu-frame { position: relative; background: var(--glass); border: 1px solid var(--line); border-radius: 14px; -webkit-backdrop-filter: blur(10px) saturate(1.2); backdrop-filter: blur(10px) saturate(1.2); box-shadow: 0 10px 30px -12px rgba(0, 10, 30, 0.6); }
/* corner brackets: the game-UI signature */
.lu-frame::before, .lu-frame::after { content: ""; position: absolute; width: 14px; height: 14px; border: 2px solid var(--cyan); pointer-events: none; }
.lu-frame::before { left: -1px; top: -1px; border-right: 0; border-bottom: 0; border-top-left-radius: 14px; }
.lu-frame::after { right: -1px; bottom: -1px; border-left: 0; border-top: 0; border-bottom-right-radius: 14px; }
.lu-player { position: absolute; left: 22px; top: 20px; display: flex; align-items: center; gap: 12px; padding: 10px 16px 10px 10px; max-width: calc(100% - 230px); }
.lu-avatar { flex: none; width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; font: 700 22px var(--lu-hud); color: var(--navy); background: linear-gradient(140deg, var(--cyan), var(--lime)); }
.lu-pname { font: 700 16px var(--lu-hud); letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lu-lv { display: inline-block; margin-left: 8px; padding: 1px 7px; border-radius: 6px; font: 700 11px var(--lu-hud); letter-spacing: 0.1em; color: var(--navy); background: var(--gold); vertical-align: 2px; }
.lu-xp { margin-top: 6px; width: 170px; max-width: 100%; height: 8px; border-radius: 6px; background: rgba(255,255,255,0.14); overflow: hidden; }
.lu-xp i { display: block; height: 100%; width: 0; border-radius: 6px; background: linear-gradient(90deg, var(--lime), var(--cyan)); box-shadow: 0 0 10px rgba(127,240,255,0.8); }
.lu-xpl { margin-top: 3px !important; font: 600 10px var(--lu-hud); letter-spacing: 0.14em; color: rgba(234,246,255,0.7); }
.lu-mapbox { position: absolute; right: 22px; top: 20px; width: 168px; height: 168px; border-radius: 50%; padding: 6px; }
.lu-mapbox.lu-frame { border-radius: 50%; } .lu-mapbox.lu-frame::before, .lu-mapbox.lu-frame::after { display: none; }
.lu-mapbox canvas { width: 100%; height: 100%; border-radius: 50%; display: block; }
.lu-mapbox b { position: absolute; left: 50%; bottom: -10px; translate: -50% 0; padding: 2px 9px; border-radius: 6px; background: var(--glass); border: 1px solid var(--line); font: 700 10px var(--lu-hud); letter-spacing: 0.16em; white-space: nowrap; text-transform: uppercase; }

/* ---- the title screen: the first section */
.lu-title { position: relative; height: var(--frame); display: grid; place-items: center; text-align: center; padding: 0 20px;
  background: radial-gradient(ellipse at 50% 55%, rgba(6, 14, 30, 0.12), rgba(6, 14, 30, 0.5)); transition: opacity 0.9s; }
.lu-started .lu-title > * { opacity: 0; transition: opacity 0.9s; pointer-events: none; }
.lu-kick { font: 700 13px var(--lu-hud); letter-spacing: 0.4em; text-transform: uppercase; color: var(--cyan); text-shadow: 0 0 12px rgba(127,240,255,0.8), 0 1px 4px rgba(0,0,0,0.5); }
.lu-logo { font: italic 700 var(--name-size, clamp(86px, 15cqw, 210px)) / 0.92 var(--lu-hud); letter-spacing: 0.02em; text-transform: uppercase; margin-top: 10px !important; text-wrap: balance;
  color: #fff; -webkit-text-stroke: 3px var(--navy); paint-order: stroke fill;
  text-shadow: 0 6px 0 var(--navy), 0 0 30px rgba(127,240,255,0.65), 0 0 80px rgba(127,240,255,0.35); }
.lu-level { display: inline-flex; align-items: center; gap: 10px; margin-top: 18px !important; padding: 8px 20px; border-radius: 10px; font: 700 20px var(--lu-hud); letter-spacing: 0.24em; text-transform: uppercase; color: var(--navy); background: var(--gold); box-shadow: 0 5px 0 #b38a10, 0 14px 30px -10px rgba(0,0,0,0.5); }
.lu-start { display: block; margin: 44px auto 0; padding: 0; border: 0; background: none; cursor: pointer; font: 700 18px var(--lu-hud); letter-spacing: 0.34em; text-transform: uppercase; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
.lu-motion .lu-start > span:last-child { animation: lu-blink 1.1s steps(2, start) infinite; }
.lu-start .lu-btn { display: inline-grid; place-items: center; width: 30px; height: 30px; margin-right: 12px; border-radius: 50%; background: var(--lime); color: var(--navy); font-size: 15px; letter-spacing: 0; vertical-align: 1px; text-shadow: none; }
@keyframes lu-blink { 50% { opacity: 0.25; } }
.lu-meta { position: absolute; left: 16px; right: 16px; bottom: 6svh; font: 600 13px var(--lu-hud); letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.88); text-shadow: 0 1px 6px rgba(0,0,0,0.55); text-wrap: balance; }
.lu-meta span { white-space: nowrap; }

/* ---- the quests: a card each, under the map (a sheet at the bottom on a phone) */
.lu-stop { position: relative; min-height: calc(var(--frame) * 1.05); }
.lu-quest { position: absolute; right: 22px; top: 214px; width: min(400px, 36cqw); padding: 22px 24px 20px; }
.lu-qhead { display: flex; align-items: center; justify-content: space-between; gap: 12px; font: 700 12px var(--lu-hud); letter-spacing: 0.24em; text-transform: uppercase; color: var(--cyan); }
.lu-qhead span:last-child { color: rgba(234,246,255,0.6); letter-spacing: 0.14em; text-align: right; }
.lu-h2 { font: 700 34px / 1.05 var(--lu-hud); margin-top: 10px !important; letter-spacing: 0.01em; text-wrap: balance; }
.lu-qline { font-size: 14px; color: rgba(234,246,255,0.78); margin-top: 6px !important; }
.lu-obj { margin-top: 14px; display: grid; gap: 9px; }
.lu-obj > div { display: grid; grid-template-columns: 18px 70px minmax(0, 1fr); gap: 10px; align-items: baseline; font-size: 15px; line-height: 1.4; }
.lu-obj > div::before { content: ""; width: 12px; height: 12px; border: 2px solid var(--cyan); border-radius: 3px; translate: 0 1px; }
.lu-obj b { font: 700 13px var(--lu-hud); letter-spacing: 0.06em; color: var(--lime); white-space: nowrap; }
.lu-obj em { display: block; font-style: normal; font-size: 13px; color: rgba(234,246,255,0.65); }
.lu-p { font-size: 16px; line-height: 1.5; margin-top: 12px !important; }
.lu-tip { padding: 11px 0; border-top: 1px solid rgba(140,230,255,0.18); }
.lu-tip:first-of-type { margin-top: 12px; }
.lu-tip b { display: block; font-weight: 700; font-size: 15px; }
.lu-tip span { display: block; font-size: 14px; line-height: 1.45; color: rgba(234,246,255,0.75); margin-top: 2px; }
.lu-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
.lu-btn2 { display: inline-flex; align-items: center; min-height: 44px; padding: 0 18px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,0.08); color: #fff; font: 700 12px var(--lu-hud); letter-spacing: 0.14em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
.lu-gifts { margin-top: 14px; }

/* ---- the final quest: the reply, a game dialog */
/* the form grows with the host's questions: the card is in the flow, so the page grows with it */
.lu-final .lu-quest { position: relative; top: auto; right: auto; width: min(440px, 40cqw); margin: 214px 22px 0 auto; }
.lu-final { padding-bottom: 60px; }
.lu-small { font-size: 14px; line-height: 1.5; color: rgba(234,246,255,0.78); margin-top: 8px !important; }
.lu-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.lu-act { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 50px; padding: 0 8px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,0.06); color: #fff; font: 700 14px var(--lu-hud); letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; }
.lu-act i { flex: none; display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-style: normal; font-size: 12px; color: var(--navy); }
.lu-act.a i { background: var(--lime); } .lu-act.b i { background: #ff7a6b; }
.lu-act.is-on { background: linear-gradient(140deg, rgba(198,255,94,0.25), rgba(127,240,255,0.2)); border-color: var(--lime); }
.lu-form label { display: block; margin-top: 16px; font: 700 11px var(--lu-hud); letter-spacing: 0.2em; text-transform: uppercase; color: rgba(234,246,255,0.72); }
.lu-field { display: block; width: 100%; margin-top: 8px; padding: 13px 14px; border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,0.08); color: #fff; font: 16px var(--lu-sans); letter-spacing: 0; text-transform: none; }
.lu-field::placeholder { color: rgba(234,246,255,0.45); }
textarea.lu-field { resize: vertical; min-height: 84px; }
.lu-seats { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; font: 700 11px var(--lu-hud); letter-spacing: 0.2em; text-transform: uppercase; color: rgba(234,246,255,0.72); }
.lu-seats__ctrl { display: inline-flex; align-items: center; gap: 14px; font-size: 18px; color: #fff; letter-spacing: 0; }
.lu-seats__ctrl button { width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,0.08); color: #fff; font-size: 20px; cursor: pointer; }
.lu-seats__ctrl button:disabled { opacity: 0.4; }
.lu-link { display: inline-block; margin-top: 8px; padding: 6px 0; border: 0; background: none; color: rgba(234,246,255,0.75); font: 13px var(--lu-sans); text-decoration: underline; cursor: pointer; }
.lu-error { color: #ff9a8c; font-size: 14px; margin-top: 12px !important; }
.lu-send { width: 100%; margin-top: 16px; min-height: 52px; border: 0; border-radius: 12px; background: linear-gradient(90deg, var(--lime), var(--cyan)); color: var(--navy); font: 700 14px var(--lu-hud); letter-spacing: 0.22em; text-transform: uppercase; cursor: pointer; box-shadow: 0 0 22px rgba(127,240,255,0.45); }
.lu-send:disabled { opacity: 0.7; cursor: default; }
.lu-ach { display: flex; align-items: center; gap: 14px; margin-top: 14px; }
.lu-ach .lu-star { flex: none; width: 52px; height: 52px; border-radius: 12px; display: grid; place-items: center; background: var(--gold); color: var(--navy); font: 700 24px var(--lu-hud); box-shadow: 0 0 24px rgba(255,210,74,0.6); }
.lu-ach b { display: block; font: 700 18px var(--lu-hud); letter-spacing: 0.06em; color: var(--lime); }
.lu-again { margin-top: 16px; min-height: 44px; padding: 0 18px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,0.06); color: #fff; font: 700 11px var(--lu-hud); letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; }
.lu-maker { margin-top: 14px !important; text-align: center; font: 600 10px var(--lu-hud); letter-spacing: 0.2em; text-transform: uppercase; color: rgba(234,246,255,0.58); }
.lu-maker a, .lu-maker b { color: #fff; font-weight: 700; }

.lu-gallery { --frame: 75cqw; }
@media (prefers-reduced-motion: reduce) { .lu-root *, .lu-root *::before, .lu-root *::after { animation: none !important; transition: none !important; } }

@container (max-width: 700px) {
  .lu-player { left: 12px; top: 12px; padding: 8px 12px 8px 8px; gap: 10px; max-width: calc(100% - 128px); }
  .lu-avatar { width: 38px; height: 38px; font-size: 18px; }
  .lu-pname { font-size: 14px; } .lu-xp { width: 120px; }
  .lu-mapbox { right: 12px; top: 12px; width: 92px; height: 92px; padding: 4px; } .lu-mapbox b { display: none; }
  /* the section runs 5% past the frame: the sheet sits on the frame's bottom edge */
  .lu-quest, .lu-final .lu-quest { left: 12px; right: 12px; width: auto; top: auto; bottom: calc(var(--frame) * 0.05 + 12px); padding: 18px 18px 16px; }
  .lu-final .lu-quest { position: relative; left: auto; right: auto; bottom: auto; margin: calc(var(--frame) * 0.14) 12px 0; }
  .lu-final { padding-bottom: calc(var(--frame) * 0.08); }
  .lu-h2 { font-size: 28px; }
  .lu-obj > div { grid-template-columns: 16px 64px minmax(0, 1fr); font-size: 14.5px; }
  .lu-logo { -webkit-text-stroke: 2px var(--navy); font-size: var(--name-size-m, clamp(64px, 22cqw, 120px)); }
  .lu-start { font-size: 15px; }
}
`;
