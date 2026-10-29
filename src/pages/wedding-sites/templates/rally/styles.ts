// Rally: a pickleball court in real 3D under floodlights, with a sports broadcast's graphics
// over it (the score bug, the ball tracker, the line call) and the sections as lower-third
// cards. Sizes follow the page's own width (container units), never the window's; nothing is
// fixed to the window (the court and its HUD are a sticky frame inside the page).
export const RALLY_CSS = `
.ra-root { --frame: 100svh; --glass: rgba(8, 15, 26, 0.72); --line: rgba(255, 255, 255, 0.14); --optic: #e3ef5a; --ink: #f6f4ee; --muted: rgba(236, 240, 246, 0.74); --navy: #0b1522;
  position: relative; container-type: inline-size; overflow: clip; isolation: isolate; color: var(--ink);
  font-family: var(--ra-sans); -webkit-font-smoothing: antialiased; background: #1b2230; }
.ra-root *, .ra-root *::before, .ra-root *::after { box-sizing: border-box; }
.ra-root p, .ra-root h1, .ra-root h2, .ra-root ul { margin: 0; }
.ra-stage { position: sticky; top: 0; display: block; width: 100%; height: var(--frame); margin-bottom: calc(var(--frame) * -1); z-index: 0; overflow: hidden; pointer-events: none;
  background: linear-gradient(#2a3f66, #d9875a 62%, #3a2a24 62%); }
.ra-gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
/* the lens: a soft vignette, a little more at the bottom where the words sit */
.ra-grade { position: absolute; inset: 0; background: radial-gradient(ellipse 120% 90% at 55% 40%, transparent 55%, rgba(4, 8, 16, 0.42)), linear-gradient(transparent 62%, rgba(4, 8, 16, 0.28)); }
.ra-world { position: relative; z-index: 2; }
.ra-hud { position: absolute; inset: 0; transition: opacity 1s; }
.ra-motion:not(.ra-lit) .ra-hud { opacity: 0; }

/* ---- the score bug */
.ra-bug { position: absolute; left: 28px; top: 24px; min-width: 250px; max-width: calc(100% - 420px); background: var(--glass); border: 1px solid var(--line); border-radius: 4px;
  -webkit-backdrop-filter: blur(12px) saturate(1.2); backdrop-filter: blur(12px) saturate(1.2); box-shadow: 0 12px 30px -14px rgba(0, 0, 0, 0.6); overflow: hidden; }
.ra-bug__top { display: flex; align-items: center; gap: 10px; padding: 10px 12px 8px 14px; }
.ra-ball { flex: none; width: 11px; height: 11px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #f7ff9e, var(--optic) 45%, #9cab18); box-shadow: 0 0 10px rgba(227, 239, 90, 0.6); }
.ra-bug__top b { flex: 1; min-width: 0; font: 700 19px/1 var(--ra-disp); font-stretch: 80%; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ra-bug__top span { flex: none; font: 800 22px/1 var(--ra-disp); font-stretch: 85%; font-variant-numeric: tabular-nums; letter-spacing: 0.02em; transition: color 0.4s; }
.ra-bug__top span.is-won { color: var(--optic); }
.ra-bug__low { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 12px 8px 14px; border-top: 1px solid var(--line); font: 600 11px/1 var(--ra-disp); letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); }
.ra-ticks { display: inline-flex; gap: 4px; }
.ra-ticks i { width: 9px; height: 4px; border-radius: 1px; background: rgba(255, 255, 255, 0.2); transition: background 0.3s; }
.ra-ticks i.is-on { background: var(--optic); }

/* ---- the ball tracker: the shot's speed, spin and height over the net */
.ra-track { position: absolute; right: 28px; top: 24px; display: flex; gap: 2px; background: var(--glass); border: 1px solid var(--line); border-radius: 4px; padding: 9px 6px;
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.ra-track p { display: grid; grid-template-columns: auto auto; align-items: baseline; column-gap: 4px; padding: 0 10px; min-width: 76px; }
.ra-track p + p { border-left: 1px solid var(--line); }
.ra-track span { grid-column: 1 / -1; font: 600 10px/1.2 var(--ra-disp); letter-spacing: 0.22em; text-transform: uppercase; color: var(--muted); }
.ra-track b { font: 700 24px/1.1 var(--ra-disp); font-stretch: 85%; font-variant-numeric: tabular-nums; }
.ra-track em { font: 500 11px var(--ra-sans); font-style: normal; color: var(--muted); }

/* ---- the line call, pinned over the ring on the court */
.ra-tag { position: absolute; left: 0; top: 0; width: 0; height: 0; opacity: 0; transition: opacity 0.35s; }
.ra-tag b { position: absolute; left: 0; bottom: 34px; translate: -50% 0; display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 3px; background: rgba(246, 244, 238, 0.94); color: var(--navy);
  font: 800 13px/1.2 var(--ra-disp); letter-spacing: 0.22em; text-transform: uppercase; white-space: nowrap; box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.5); }
.ra-tag::after { content: ""; position: absolute; left: -0.5px; bottom: 6px; width: 1px; height: 28px; background: linear-gradient(rgba(246, 244, 238, 0.9), rgba(246, 244, 238, 0.1)); }
.ra-tag i { position: absolute; left: 0; bottom: 64px; translate: -50% 0; font: 600 10px var(--ra-disp); font-style: normal; letter-spacing: 0.22em; text-transform: uppercase; white-space: nowrap; color: var(--ink); text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7); }

/* ---- the title: the host's name over the court, the score called above */
.ra-title { position: relative; height: var(--frame); }
/* a soft shade behind the name, so it reads over the bright court */
.ra-title::before { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 70%; background: radial-gradient(ellipse 70% 75% at 18% 92%, rgba(4, 10, 20, 0.55), transparent 70%); pointer-events: none; }
.ra-hero { position: absolute; left: 56px; bottom: calc(var(--frame) * 0.11); max-width: min(760px, 62cqw); text-shadow: 0 2px 24px rgba(0, 0, 0, 0.35); }
.ra-kick { font: 600 15px/1.2 var(--ra-disp); letter-spacing: 0.32em; text-transform: uppercase; color: var(--optic); }
.ra-name { margin-top: 10px !important; font: italic 900 var(--name-size) / 0.84 var(--ra-disp); font-stretch: 72%; letter-spacing: -0.005em; text-transform: uppercase; text-wrap: balance; color: #fff; }
.ra-age { margin-top: 8px !important; font: italic 700 clamp(26px, 3.1cqw, 44px) / 1.05 var(--ra-disp); font-stretch: 78%; letter-spacing: 0.01em; text-transform: uppercase; }
.ra-meta { margin-top: 20px !important; font: 500 16px/1.5 var(--ra-sans); letter-spacing: 0.02em; color: rgba(255, 255, 255, 0.9); text-wrap: balance; }
.ra-meta span { white-space: nowrap; }
.ra-meta .ra-where { white-space: normal; }
.ra-where i { font-style: normal; }
.ra-hint { position: absolute; left: 50%; bottom: calc(var(--frame) * 0.04); translate: -50% 0; display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 6px; border: 0; background: none; cursor: pointer;
  font: 600 13px var(--ra-disp); letter-spacing: 0.28em; text-transform: uppercase; color: rgba(255, 255, 255, 0.88); text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6); white-space: nowrap; }
.ra-hint i { width: 9px; height: 9px; border-radius: 50%; background: var(--optic); box-shadow: 0 0 10px rgba(227, 239, 90, 0.7); }
.ra-motion .ra-hint i { animation: ra-bounce 1.3s cubic-bezier(.4, 0, .6, 1) infinite; }
@keyframes ra-bounce { 0%, 100% { translate: 0 -7px; } 50% { translate: 0 4px; scale: 1.15 0.85; } }
.ra-motion .ra-hero > *, .ra-motion .ra-hint { opacity: 0; translate: 0 22px; transition: opacity 0.9s, translate 1.1s cubic-bezier(.2, .8, .2, 1); }
.ra-motion .ra-hint { translate: -50% 12px; }
.ra-motion.ra-lit .ra-hero > * { opacity: 1; translate: 0 0; }
.ra-motion.ra-lit .ra-hint { opacity: 1; translate: -50% 0; transition-delay: 0.9s; }
.ra-motion.ra-lit .ra-hero > :nth-child(2) { transition-delay: 0.12s; }
.ra-motion.ra-lit .ra-hero > :nth-child(3) { transition-delay: 0.28s; }
.ra-motion.ra-lit .ra-hero > :nth-child(4) { transition-delay: 0.42s; }

/* ---- the shots: every card pauses in the same place (its dock: the bottom-left corner; the
   bottom edge on a phone). The card is sticky for its hold, then scrolls away; the gap before
   each stop, a frame long, is the shot. rally.ts measures the dock and sets the card's top. */
.ra-stop { position: relative; padding-top: var(--frame); }
.ra-dock { position: relative; }
.ra-card { position: sticky; top: 300px; width: min(450px, 36cqw); margin: 0 auto 0 32px; padding: 20px 26px 22px; background: var(--glass); border: 1px solid var(--line); border-radius: 4px;
  -webkit-backdrop-filter: blur(14px) saturate(1.2); backdrop-filter: blur(14px) saturate(1.2); box-shadow: 0 18px 44px -18px rgba(0, 0, 0, 0.7); }
.ra-hold { height: calc(var(--frame) * 0.55); }
.ra-shot { display: flex; align-items: baseline; gap: 10px; font: 700 12px/1.3 var(--ra-disp); letter-spacing: 0.22em; text-transform: uppercase; }
.ra-shot b { color: var(--optic); white-space: nowrap; }
.ra-shot span { color: var(--muted); }
.ra-h2 { margin-top: 8px !important; font: 800 46px/0.94 var(--ra-disp); font-stretch: 76%; letter-spacing: 0.005em; text-transform: uppercase; text-wrap: balance; }
.ra-when { margin-top: 10px !important; font: 600 19px/1.3 var(--ra-disp); font-stretch: 90%; }
.ra-when span { white-space: nowrap; }
.ra-line { margin-top: 6px !important; font-size: 16px; line-height: 1.45; color: var(--muted); }
.ra-line b { color: var(--ink); font-weight: 600; }
.ra-links { margin-top: 4px; }
.ra-sched { margin-top: 14px; }
.ra-sched > div { display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 12px; align-items: baseline; padding: 10px 0; border-top: 1px solid var(--line); font-size: 16px; line-height: 1.4; }
.ra-sched b { font: 700 15px var(--ra-disp); font-variant-numeric: tabular-nums; letter-spacing: 0.04em; color: var(--optic); white-space: nowrap; }
.ra-sched em { display: block; font-style: normal; font-size: 15px; color: var(--muted); }
.ra-p { margin-top: 12px !important; font-size: 17px; line-height: 1.55; text-wrap: pretty; }
.ra-pre { white-space: pre-line; }
.ra-bring { list-style: none; padding: 0; margin-top: 12px !important; display: grid; gap: 2px; }
.ra-bring li { display: flex; align-items: baseline; gap: 12px; padding: 8px 0; border-top: 1px solid var(--line); font-size: 17px; line-height: 1.4; }
.ra-bring li::before { content: ""; flex: none; width: 9px; height: 9px; border-radius: 50%; background: var(--optic); translate: 0 -1px; }
.ra-faq { padding: 11px 0; border-top: 1px solid var(--line); }
.ra-faq:first-of-type { margin-top: 12px; }
.ra-faq b { display: block; font-weight: 600; font-size: 16px; line-height: 1.4; }
.ra-faq span { display: block; margin-top: 2px; font-size: 15px; line-height: 1.5; color: var(--muted); }
.ra-btns { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.ra-btn { display: inline-flex; align-items: center; min-height: 46px; padding: 0 18px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.06); color: var(--ink);
  font: 700 13px var(--ra-disp); letter-spacing: 0.18em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
.ra-gifts { margin-top: 14px; }

/* ---- the reply: make the call */
.ra-final { padding-bottom: 24px; }
/* the reply is wider on a wide frame, its scorecard in two columns, so it docks clear of the HUD */
.ra-final .ra-card { width: min(660px, 50cqw); }
.ra-cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 20px; }
.ra-motion .ra-cols { animation: ra-open 0.6s cubic-bezier(.2, .8, .2, 1) both; }
@keyframes ra-open { from { opacity: 0; translate: 0 10px; } }
.ra-small { margin-top: 8px !important; font-size: 15px; line-height: 1.5; color: var(--muted); }
.ra-won { color: var(--optic); }
.ra-calls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.ra-callbtn { display: grid; justify-items: start; gap: 2px; min-height: 78px; padding: 10px 16px 12px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.28); background: rgba(255, 255, 255, 0.05); color: var(--ink); text-align: left; cursor: pointer; transition: background 0.2s, color 0.2s, border-color 0.2s; }
.ra-callbtn b { font: italic 900 36px/1 var(--ra-disp); font-stretch: 75%; letter-spacing: 0.02em; text-transform: uppercase; }
.ra-callbtn span { font-size: 15px; color: var(--muted); transition: color 0.2s; }
.ra-callbtn.is-on { background: var(--optic); border-color: var(--optic); color: var(--navy); }
.ra-callbtn.is-out.is-on { background: #f2efe6; border-color: #f2efe6; }
.ra-callbtn.is-on span { color: rgba(11, 21, 34, 0.75); }
.ra-form label { display: block; margin-top: 16px; font: 600 12px var(--ra-disp); letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
.ra-field { display: block; width: 100%; margin-top: 8px; padding: 13px 14px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.07); color: #fff; font: 16px var(--ra-sans); letter-spacing: 0; text-transform: none; }
.ra-field::placeholder { color: rgba(236, 240, 246, 0.45); }
.ra-field:focus { outline: 2px solid var(--optic); outline-offset: 1px; }
.ra-sign { font: italic 600 21px var(--ra-disp); font-stretch: 85%; padding: 10px 14px; }
textarea.ra-field { resize: vertical; min-height: 84px; }
.ra-link { display: inline-block; margin-top: 6px; min-height: 36px; padding: 6px 0; border: 0; background: none; color: var(--muted); font: 14px var(--ra-sans); text-decoration: underline; cursor: pointer; }
.ra-seats { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; font: 600 12px var(--ra-disp); letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
.ra-seats__ctrl { display: inline-flex; align-items: center; gap: 14px; font: 700 22px var(--ra-disp); color: #fff; letter-spacing: 0; }
.ra-seats__ctrl button { width: 44px; height: 44px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.28); background: rgba(255, 255, 255, 0.06); color: #fff; font-size: 20px; cursor: pointer; }
.ra-seats__ctrl button:disabled { opacity: 0.4; }
.ra-error { margin-top: 12px !important; color: #ffab95; font-size: 15px; }
.ra-send { width: 100%; margin-top: 18px; min-height: 54px; border: 0; border-radius: 3px; background: var(--optic); color: var(--navy); font: 800 15px var(--ra-disp); letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; }
.ra-send:disabled { opacity: 0.7; cursor: default; }
.ra-again { margin-top: 16px; min-height: 44px; padding: 0 18px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.28); background: rgba(255, 255, 255, 0.06); color: #fff; font: 700 12px var(--ra-disp); letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; }
.ra-maker { margin-top: 14px !important; text-align: center; font: 600 11px var(--ra-disp); letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
.ra-maker a, .ra-maker b { color: #fff; font-weight: 700; }

/* ---- the deck (the published page, the design preview): one frame, a card at a time. Every card
   comes up in the same place, its dock (the bottom-left corner; the bottom edge on a phone, over
   the shot strip), and a long one scrolls inside itself. */
.ra-deck { height: var(--frame); }
.ra-deck .ra-world { position: absolute; inset: 0; }
.ra-deck .ra-title { position: absolute; inset: 0; height: auto; transition: opacity 0.4s, visibility 0s 0.4s; }
.ra-deck .ra-title:not(.is-on) { opacity: 0; visibility: hidden; }
.ra-deck .ra-title.is-on { transition: opacity 0.5s 0.1s, visibility 0s; }
.ra-deck .ra-hero { bottom: 120px; }
.ra-deck .ra-stop { position: absolute; left: 32px; bottom: 32px; padding: 0; opacity: 0; visibility: hidden; translate: 0 18px; transition: opacity 0.3s, translate 0.4s, visibility 0s 0.4s; }
.ra-deck .ra-stop.is-on { opacity: 1; visibility: visible; translate: 0 0; transition: opacity 0.45s, translate 0.55s cubic-bezier(.2, .8, .2, 1), visibility 0s; }
.ra-deck .ra-dock { position: static; }
.ra-deck .ra-card { position: relative; top: auto !important; margin: 0; max-height: calc(var(--frame) - 160px); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
.ra-deck .ra-hold { display: none; }

/* the shot strip: back, a marker for every card (tap to jump), the next shot */
.ra-ctrl { position: absolute; right: 28px; bottom: 32px; z-index: 3; display: flex; align-items: center; gap: 8px; padding: 6px; background: var(--glass); border: 1px solid var(--line); border-radius: 4px;
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); box-shadow: 0 12px 30px -14px rgba(0, 0, 0, 0.6); }
.ra-motion .ra-ctrl { opacity: 0; transition: opacity 0.8s 1.2s; }
.ra-motion.ra-lit .ra-ctrl { opacity: 1; }
.ra-pips { list-style: none; display: flex; gap: 4px; padding: 0 4px; margin: 0; }
.ra-pips button { width: 32px; height: 32px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.22); background: transparent; color: var(--muted); font: 700 13px var(--ra-disp); font-variant-numeric: tabular-nums; cursor: pointer; transition: background 0.2s, color 0.2s, border-color 0.2s; }
.ra-pips button.is-done { background: rgba(227, 239, 90, 0.18); border-color: rgba(227, 239, 90, 0.45); color: var(--ink); }
.ra-pips button.is-on { background: var(--optic); border-color: var(--optic); color: var(--navy); }
.ra-prev { width: 44px; height: 44px; border-radius: 3px; border: 1px solid rgba(255, 255, 255, 0.22); background: transparent; color: var(--ink); font: 700 24px/1 var(--ra-disp); cursor: pointer; }
.ra-next { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 18px; border: 0; border-radius: 3px; background: var(--optic); color: var(--navy); font: 800 14px var(--ra-disp); letter-spacing: 0.18em; text-transform: uppercase; white-space: nowrap; cursor: pointer; }
.ra-next i { font-style: normal; font-size: 20px; letter-spacing: 0; line-height: 1; }
.ra-prev:disabled, .ra-next:disabled { opacity: 0.35; cursor: default; }
.ra-motion .ra-next:not(:disabled) i { animation: ra-nudge 1.4s ease-in-out infinite; }
@keyframes ra-nudge { 50% { translate: 4px 0; } }

.ra-gallery { --frame: 75cqw; }
.ra-gallery .ra-hero { bottom: calc(var(--frame) * 0.1); }
@media (prefers-reduced-motion: reduce) { .ra-root *, .ra-root *::before, .ra-root *::after { animation: none !important; transition: none !important; } }

@container (max-width: 700px) {
  .ra-bug { left: 12px; top: 12px; min-width: 0; max-width: calc(100% - 170px); }
  .ra-bug__top { gap: 8px; padding: 8px 10px 7px 11px; }
  .ra-bug__top b { font-size: 16px; }
  .ra-bug__top span { font-size: 18px; }
  .ra-bug__low { padding: 6px 10px 7px 11px; font-size: 10px; letter-spacing: 0.14em; gap: 8px; }
  .ra-ticks i { width: 6px; }
  .ra-track { right: 12px; top: 12px; padding: 7px 2px; }
  .ra-track p { min-width: 0; padding: 0 7px; }
  .ra-track span { font-size: 9px; letter-spacing: 0.14em; }
  .ra-track b { font-size: 17px; }
  .ra-track em { display: none; }
  .ra-hero { left: 20px; right: 20px; max-width: none; bottom: calc(var(--frame) * 0.12); }
  .ra-kick { font-size: 14px; letter-spacing: 0.24em; }
  .ra-shot { font-size: 13px; letter-spacing: 0.18em; }
  .ra-name { font-size: var(--name-size-m); }
  .ra-age { font-size: 26px; }
  .ra-meta { font-size: 15px; margin-top: 14px !important; }
  .ra-meta .ra-where { display: block; }
  .ra-meta .ra-where i { display: none; }
  .ra-card { width: auto; margin: 0 12px; padding: 16px 18px 18px; }
  /* the shot's gap is a frame long, so only one card is on screen at a time */
  .ra-stop { padding-top: calc(var(--frame) * 1.02); }
  .ra-hold { height: calc(var(--frame) * 0.32); }
  .ra-final { padding-bottom: 14px; }
  .ra-final .ra-card { width: auto; }
  .ra-cols { grid-template-columns: minmax(0, 1fr); }
  .ra-h2 { font-size: 36px; }
  .ra-sched > div { grid-template-columns: 70px minmax(0, 1fr); font-size: 15px; }
  .ra-p, .ra-bring li { font-size: 16px; }
  .ra-callbtn { min-height: 70px; }
  .ra-callbtn b { font-size: 30px; }
  .ra-deck .ra-hero { bottom: 92px; }
  .ra-deck .ra-stop { left: 12px; right: 12px; bottom: 74px; }
  .ra-deck .ra-card { max-height: calc(var(--frame) - 74px - 98px); }
  .ra-ctrl { left: 12px; right: 12px; bottom: 12px; justify-content: space-between; padding: 4px; gap: 4px; }
  .ra-pips { gap: 3px; padding: 0; }
  .ra-pips button { width: 26px; height: 32px; font-size: 12px; }
  .ra-next { padding: 0 12px; font-size: 13px; letter-spacing: 0.12em; }
}
`;
