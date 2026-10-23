// Under Glass's styles. Sizes follow the page's own width (container units), so the builder's
// scaled preview, the gallery card and a phone lay out the same way. The opening (.ug-play →
// .ug-go) and the scroll reveals (.rv-on) run only where UnderGlassTemplate allows. Motion is
// transform/opacity (the three hero prints' shadows ease flat once).

// The back of a photo: the paper maker's name printed faintly across it (generic, no brand).
const WATERMARK = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='230' height='130'><text x='18' y='76' transform='rotate(-22 115 65)' font-family='Arial, sans-serif' font-size='12' letter-spacing='4' fill='#000' fill-opacity='.075'>PHOTO PAPER</text></svg>")}")`;

/**
 * A torn paper edge, as a clip-path: points every 2.5% along each side, pushed in by a few
 * pixels (a slow wave plus fibre-sized jitter), so the tear looks the same on a small slip and a
 * large note. Deterministic per seed.
 */
function tear(seed: number, depth = 4.5): string {
  const r = (n: number) => {
    const x = Math.sin((seed + 1) * 78.233 + n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const off = (i: number, side: number) => {
    const wave = (Math.sin(i * 0.7 + side * 2 + seed) + 1) / 2;
    return (depth * (0.35 + 0.4 * wave + 0.45 * r(i + side * 101))).toFixed(1);
  };
  const N = 40;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) pts.push(`${((i / N) * 100).toFixed(1)}% ${off(i, 0)}px`);
  for (let i = 1; i <= N; i++) pts.push(`calc(100% - ${off(i, 1)}px) ${((i / N) * 100).toFixed(1)}%`);
  for (let i = N - 1; i >= 0; i--) pts.push(`${((i / N) * 100).toFixed(1)}% calc(100% - ${off(i, 2)}px)`);
  for (let i = N - 1; i >= 1; i--) pts.push(`${off(i, 3)}px ${((i / N) * 100).toFixed(1)}%`);
  return `polygon(${pts.join(",")})`;
}
const TEAR_A = tear(1);
const TEAR_B = tear(2);
const TEAR_C = tear(3, 5.5);
const TEAR_SLIP = tear(4, 3);
// The torn rim: the paler fibres just outside the tear (a shallower, different tear).
const RIM_A = tear(11, 2.4);
const RIM_C = tear(13, 3);

export const UNDER_GLASS_CSS = `
.ug-root{container-type:inline-size;position:relative;overflow-x:clip;color:var(--ug-ink);font-family:var(--ug-serif);font-size:18px;font-weight:450;
  /* the whole page is the table (text always sits on paper on it) */
  background-color:#3a2216;background-image:linear-gradient(90deg,rgba(0,0,0,.28),rgba(0,0,0,0) 18%,rgba(0,0,0,0) 82%,rgba(0,0,0,.28)),var(--ug-wood);background-size:auto,1600px auto;background-repeat:no-repeat,repeat;
  --ug-paper:#fdfaf3;
  --ug-soft:color-mix(in srgb, var(--ug-muted) 55%, var(--ug-ink));
  --ug-hand:"Caveat", "Segoe Print", cursive;--ug-type:"Courier Prime", "Courier New", monospace;}
.ug-root *,.ug-root *::before,.ug-root *::after{box-sizing:border-box;}
.ug-root a:not(.ug-btn){color:inherit;}
.ug-root p,.ug-root li{text-wrap:pretty;}
.ug-root h1,.ug-root h2,.ug-root h3{text-wrap:balance;}

/* the foil, by milestone */
.ug-metal--gold{--ug-foil:linear-gradient(160deg,#8a6420 0%,#d8b45c 28%,#f4e2a6 42%,#b8883a 58%,#e9cc83 76%,#8f6a24 100%);--ug-accent:#8f6a24;}
.ug-metal--silver{--ug-foil:linear-gradient(160deg,#6f7478 0%,#c9ced2 28%,#f3f5f6 42%,#9aa1a6 58%,#dde1e4 76%,#70777c 100%);--ug-accent:#5f666b;}
.ug-metal--ruby{--ug-foil:linear-gradient(160deg,#5e0f1c 0%,#a8273a 28%,#e06a7a 42%,#8e1b2d 58%,#c9465a 76%,#5e0f1c 100%);--ug-accent:#8e1b2d;}
.ug-metal--sapphire{--ug-foil:linear-gradient(160deg,#102a5c 0%,#2f5fae 28%,#8fb3ea 42%,#244c96 58%,#5f8fd6 76%,#102a5c 100%);--ug-accent:#244c96;}
.ug-metal--pearl{--ug-foil:linear-gradient(160deg,#8f8576 0%,#d9d0c2 28%,#fffaf2 42%,#b9ae9e 58%,#e9e1d4 76%,#8f8576 100%);--ug-accent:#7f7566;}
.ug-metal--diamond{--ug-foil:linear-gradient(160deg,#6f8796 0%,#c4d7e2 28%,#ffffff 42%,#9ab3c2 58%,#e0ecf3 76%,#6f8796 100%);--ug-accent:#5b7383;}
.ug-foil{background:var(--ug-foil);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 1px 0 rgba(255,255,255,.7)) drop-shadow(0 2px 2px rgba(60,40,10,.22));}

/* ---- the table, under one sheet of glass ---- */
.ug-page{position:relative;overflow:clip;padding-bottom:clamp(30px,5cqw,60px);}
.ug-sheet{position:absolute;inset:0;z-index:30;pointer-events:none;background:linear-gradient(180deg,rgba(214,236,226,.06),rgba(214,236,226,.025) 30%,rgba(214,236,226,.04));box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);}
.ug-sheet .ug-glass__sheen{height:min(100svh,900px);bottom:auto;}
/* sunlight through the windows along the table: lit panes (the frame is the unlit gap between
   them), soft-edged, falling at the afternoon's angle, brighter near the window and fading away
   from it. Screen-blended so it lightens the wood and the paper the way light does. */
.ug-win{position:absolute;z-index:29;pointer-events:none;mix-blend-mode:screen;transform-origin:0 0;
  -webkit-mask-image:linear-gradient(170deg,#000 0%,rgba(0,0,0,.85) 45%,transparent 100%);mask-image:linear-gradient(170deg,#000 0%,rgba(0,0,0,.85) 45%,transparent 100%);}
.ug-win__panes{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:6% 7%;width:100%;height:100%;filter:blur(5px);}
.ug-win__panes i{display:block;border-radius:2px;background:linear-gradient(165deg,rgba(255,224,170,.62),rgba(255,206,140,.34) 70%,rgba(255,200,130,.26));}
.ug-win--hero{left:2%;top:-6%;width:min(42cqw,560px);height:118%;transform:skewX(-20deg) rotate(-4deg);opacity:.62;}
.ug-win--years{right:-4%;top:-2%;width:min(38cqw,500px);height:min(76cqw,980px);transform:skewX(-20deg) rotate(-4deg);opacity:.45;}
.ug-win--wall{left:-6%;top:4%;width:min(36cqw,470px);height:min(64cqw,820px);transform:skewX(-20deg) rotate(-4deg);opacity:.42;}
@container (max-width:699px){
  .ug-win--hero{width:70cqw;height:105%;left:-8%;}
  .ug-win--years{width:66cqw;height:120cqw;right:-26%;}
  .ug-win--wall{width:62cqw;height:110cqw;left:-24%;}
}
.ug-gallery .ug-win--years,.ug-gallery .ug-win--wall{display:none;}
/* the first screen: three prints in a row on the table, the card below. Each side print is
   sized from its shape (similar weight whatever its proportions), centred on the portrait's
   middle and tucked a little under it, mirrored (UnderGlassTemplate sets --w/--t per print). */
.ug-hero{position:relative;}
.ug-table{--u:min(1cqw,13.8px);position:relative;height:max(420px,calc(var(--th,52) * var(--u)));}
@container (max-width:699px){.ug-table{--u:1cqw;height:calc(var(--thm,132) * 1cqw);}}
.ug-table__prints{position:absolute;inset:0;}
.ug-table__hint{position:absolute;left:50%;top:40%;width:min(80%,520px);translate:-50% -50%;margin:0;padding:16px 20px;background:#fbf7ee;border-radius:4px;text-align:center;color:var(--ug-ink);}

.ug-pw{position:absolute;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3)) drop-shadow(0 6px 8px rgba(0,0,0,.28));}
.ug-pw.ug-hp{top:calc(var(--t) * var(--u));width:calc(var(--w) * var(--u));transform:translateX(var(--x,0)) rotate(var(--r,0deg));}
.ug-hp--0{--x:-50%;--r:-2deg;left:50%;z-index:3;}
.ug-hp--1{--r:4deg;left:calc(50% - (var(--pw) / 2 - 0.6 + var(--w)) * var(--u));z-index:2;}
.ug-hp--2{--r:-4deg;left:calc(50% + (var(--pw) / 2 - 0.6) * var(--u));z-index:2;}
@container (max-width:699px){
  .ug-pw.ug-hp{top:calc(var(--tm) * 1cqw);width:calc(var(--wm) * 1cqw);}
  .ug-hp--0{left:55%;}
  .ug-hp--2{z-index:4;}
  .ug-hp--1{left:1cqw;}
  .ug-hp--2{left:auto;right:1cqw;}
}

.ug-pw--tap{display:block;padding:0;border:0;background:none;cursor:zoom-in;-webkit-tap-highlight-color:transparent;transition:filter .3s ease;}
.ug-pw--tap:hover{filter:drop-shadow(0 2px 2px rgba(0,0,0,.3)) drop-shadow(0 14px 14px rgba(0,0,0,.34));}
.ug-pw--tap:focus-visible{outline:2px solid #f3e3b5;outline-offset:4px;}
.ug-pw--tap .ug-print{display:block;}
/* a print, in the look of its era */
.ug-print{margin:0;background:#fbf9f4;}
.ug-print__photo{position:relative;display:block;overflow:hidden;background:#d8d2c6;}
.ug-print__photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.ug-print--deckle{padding:7%;background:#f1ebde;}
.ug-print--seventies{padding:6%;border-radius:7px;background:#fdfcf8;}
.ug-print--seventies .ug-print__photo{border-radius:3px;}
.ug-print--gloss{padding:0;border-radius:3px;}
.ug-print--gloss .ug-print__photo{border-radius:3px;}
.ug-print--gloss .ug-print__photo::after{content:"";position:absolute;inset:0;background:linear-gradient(125deg,rgba(255,255,255,.22),rgba(255,255,255,0) 35%,rgba(255,255,255,0) 70%,rgba(255,255,255,.08));pointer-events:none;}
.ug-print--modern{padding:3.5%;background:#fff;}
.ug-stamp{position:absolute;right:6%;bottom:5%;font:600 clamp(10px,1.1cqw,13px)/1 ui-monospace,Menlo,monospace;letter-spacing:.06em;color:#ff8a2b;text-shadow:0 0 1px rgba(255,120,30,.6);}

/* the glass: a faint tint, a green edge where it starts, one reflection */
.ug-glass{position:absolute;inset:0;z-index:4;pointer-events:none;background:linear-gradient(180deg,rgba(214,236,226,.07),rgba(214,236,226,.03));box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);}
.ug-glass__edge{position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#6f9a89,#b9d6ca 38%,#86ad9e 62%,#6f9a89);box-shadow:0 1px 0 rgba(255,255,255,.35),0 2px 6px rgba(0,0,0,.25);}
.ug-glass__sheen{position:absolute;top:0;bottom:0;left:-30%;width:42%;background:linear-gradient(105deg,rgba(255,255,255,0),rgba(255,255,255,.1) 45%,rgba(255,255,255,0) 70%);transform:skewX(-12deg);opacity:0;}
.ug-play.ug-go .ug-glass__sheen{opacity:.9;}

/* the opening: prints curled and lifted, the glass slides in, they press flat, the card slips under */
.ug-play .ug-sheet{transform:translateY(100svh);}
.ug-play .ug-hp{filter:drop-shadow(0 2px 2px rgba(0,0,0,.25)) drop-shadow(0 22px 18px rgba(0,0,0,.42));}
.ug-play .ug-pw.ug-hp{transform:translateX(var(--x,0)) rotate(calc(var(--r,0deg) * 1.35)) translateY(-8px) scale(1.025);}
.ug-play .ug-hero__card{opacity:0;transform:translateY(26px) rotate(.5deg);}
.ug-play.ug-go .ug-sheet{transform:none;transition:transform 1.8s cubic-bezier(.3,.6,.2,1) .2s;}
.ug-play.ug-go .ug-hp{filter:drop-shadow(0 1px 1px rgba(0,0,0,.3)) drop-shadow(0 6px 8px rgba(0,0,0,.28));transition:transform 1s cubic-bezier(.3,.7,.3,1) 1.55s,filter 1s ease 1.55s;}
.ug-play.ug-go .ug-pw.ug-hp{transform:translateX(var(--x,0)) rotate(var(--r,0deg));}
.ug-play.ug-go .ug-hero__card{opacity:1;transform:rotate(.5deg);transition:opacity 1.2s ease 2.3s,transform 1.4s cubic-bezier(.2,.7,.2,1) 2.3s;}
@keyframes ug-sheen{from{transform:translateX(0) skewX(-12deg);}to{transform:translateX(330%) skewX(-12deg);}}
.ug-play.ug-go .ug-sheet .ug-glass__sheen{animation:ug-sheen 2.6s ease-in-out 1.9s both;}

/* the printed card with the name and the number */
.ug-card{position:relative;background:#fdfaf3;background-image:var(--ug-grain);background-blend-mode:multiply;border-radius:2px;box-shadow:0 2px 3px rgba(0,0,0,.1),0 24px 40px -26px rgba(40,24,10,.55);}
.ug-hero__card{z-index:5;width:min(560px,88cqw);margin:-11cqw auto 0;padding:clamp(28px,4cqw,44px) clamp(20px,4cqw,44px);text-align:center;transform:rotate(.5deg);}
@container (max-width:699px){.ug-hero__card{margin-top:-20cqw;}}
.ug-gallery .ug-hero__card{margin-top:-14cqw;}
.ug-greet{margin:0 0 6px;font-style:italic;font-size:17px;color:var(--ug-soft);}
.ug-name{margin:0;font-family:var(--ug-display);font-style:italic;font-weight:400;font-size:clamp(40px,6cqw,70px);line-height:1.05;letter-spacing:-.01em;}
.ug-num{display:flex;align-items:baseline;justify-content:center;gap:14px;margin:4px 0 2px;}
.ug-num .ug-foil{font-family:var(--ug-display);font-weight:700;font-size:clamp(96px,14cqw,168px);line-height:.95;letter-spacing:-.02em;}
.ug-num__small{min-width:3.2em;font-style:italic;font-size:clamp(19px,2.2cqw,24px);color:var(--ug-soft);}
.ug-num__small:first-child{text-align:right;}.ug-num__small:last-child{text-align:left;}
.ug-hero__when{display:grid;gap:2px;margin:10px 0 18px;font-size:18px;}

/* ---- type ---- */
.ug-sec{position:relative;max-width:1000px;margin:0 auto;padding:clamp(56px,9cqw,110px) 20px 0;}
.ug-narrow{max-width:660px;text-align:center;}
.ug-sec--wide{max-width:1100px;}
/* a section's title: a printed label laid on the table */
.ug-title{width:fit-content;max-width:100%;margin:0 auto clamp(22px,3.4cqw,36px);padding:12px clamp(20px,3cqw,30px) 14px;font-family:var(--ug-display);font-weight:400;font-size:clamp(30px,4.2cqw,46px);line-height:1.1;text-align:center;
  background:var(--ug-paper);background-image:var(--ug-grain);background-blend-mode:multiply;box-shadow:0 2px 3px rgba(0,0,0,.16),0 14px 22px -16px rgba(0,0,0,.5);transform:rotate(-.6deg);}
.ug-title--small,.ug-title--in,.ug-card .ug-title,.ug-reply .ug-title,.ug-paper .ug-title{width:auto;padding:0;background:none;box-shadow:none;transform:none;}
.ug-title--small{font-size:clamp(28px,3.4cqw,36px);margin-bottom:16px;}
.ug-paper{position:relative;background:var(--ug-paper);background-image:var(--ug-grain);background-blend-mode:multiply;border-radius:2px;padding:clamp(24px,4cqw,40px) clamp(20px,4cqw,40px);box-shadow:0 2px 3px rgba(0,0,0,.14),0 22px 34px -24px rgba(0,0,0,.6);}
.ug-paper--slim{padding:18px 22px;}
.ug-sec.ug-paper{width:calc(100% - 40px);margin:clamp(56px,9cqw,110px) auto 0;}
.ug-note{transform:rotate(.4deg);}
.ug-tag{display:table;margin:0 auto;padding:8px 16px;background:var(--ug-paper);box-shadow:0 2px 3px rgba(0,0,0,.18);}
.ug-tip{display:table;margin:-12px auto 4px;padding:3px 14px 5px;font-size:22px;color:#2a211c;background:var(--ug-paper);transform:rotate(1.4deg);box-shadow:0 1px 2px rgba(0,0,0,.2),0 8px 12px -8px rgba(0,0,0,.4);}
.ug-btn.ug-btn--paper{border-color:transparent;background:var(--ug-paper);color:#2a211c;box-shadow:0 2px 3px rgba(0,0,0,.2),0 10px 16px -10px rgba(0,0,0,.5);}
.ug-btn.ug-btn--paper:hover{background:#fff;color:#2a211c;}
.ug-text{margin:0 0 14px;font-size:clamp(17px,1.8cqw,19px);line-height:1.7;}
.ug-text--lead{font-style:italic;font-size:clamp(21px,2.5cqw,25px);line-height:1.5;}
.ug-small{margin:6px 0;font-size:15.5px;line-height:1.5;color:var(--ug-soft);}
.ug-soft{color:var(--ug-soft);}
.ug-kicker{margin:0 0 8px;font-style:italic;font-size:17px;color:var(--ug-soft);}
.ug-hand{font-family:var(--ug-hand);font-weight:500;}
.ug-hint{opacity:.7;}
.ug-note__from{margin:10px 0 0;font-size:26px;}

.ug-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 28px;border:1px solid var(--ug-ink);border-radius:999px;background:var(--ug-ink);color:var(--ug-bg);font:500 16.5px/1.1 var(--ug-serif);letter-spacing:.02em;text-decoration:none;cursor:pointer;transition:background-color .25s,color .25s;}
.ug-btn:hover{background:transparent;color:var(--ug-ink);}
.ug-btn--line{background:transparent;color:var(--ug-ink);}
.ug-btn--line:hover{background:var(--ug-ink);color:var(--ug-bg);}
.ug-btn--block{width:100%;}
.ug-btn:disabled{opacity:.6;cursor:not-allowed;}
.ug-btn:focus-visible,.ug-choice__opt:focus-visible,.ug-seats button:focus-visible,.ug-link:focus-visible{outline:2px solid var(--ug-accent);outline-offset:3px;}

/* ---- the Mass and the celebration ---- */
.ug-places{display:grid;gap:22px;justify-items:center;}
@container (min-width:720px){.ug-places{grid-template-columns:1fr 1fr;align-items:stretch;gap:32px;}}
.ug-place{width:100%;max-width:420px;padding:clamp(26px,3.6cqw,38px) 24px;text-align:center;background:#fffdf8;border-radius:3px;box-shadow:0 2px 3px rgba(0,0,0,.08),0 20px 34px -24px rgba(40,24,10,.5);transform:rotate(-.6deg);}
.ug-place + .ug-place{transform:rotate(.7deg);}
.ug-place--holy{border-radius:12px;background:#fbf5e8;box-shadow:inset 0 0 0 9px #fbf5e8,inset 0 0 0 10px color-mix(in srgb, var(--ug-accent) 55%, transparent),0 2px 3px rgba(0,0,0,.08),0 20px 34px -24px rgba(40,24,10,.5);}
.ug-place__name{margin:0 0 8px;font-family:var(--ug-display);font-weight:400;font-size:clamp(25px,2.8cqw,32px);line-height:1.2;}
.ug-place__addr{margin:0 0 4px;font-size:17px;color:var(--ug-soft);line-height:1.5;}
.ug-place__time{margin:0 0 4px;font-style:italic;}
.ug-place__map{display:inline-flex;align-items:center;min-height:44px;font-weight:600;font-size:15px;text-decoration:underline;text-underline-offset:4px;}

/* ---- the decades, each a small tabletop under glass ---- */
/* the decades, two across; a decade with several prints takes the whole row */
.ug-years{display:grid;grid-template-columns:1fr 1fr;gap:clamp(34px,5cqw,56px) clamp(14px,3cqw,32px);max-width:1040px;margin:0 auto;align-items:start;}
.ug-decade{min-width:0;}
.ug-decade[data-n="2"],.ug-decade[data-n="3"]{grid-column:1/-1;}
.ug-decade__slip{position:relative;z-index:6;display:inline-block;margin:0 0 -16px clamp(14px,3cqw,28px);padding:4px 16px 6px;font-size:clamp(26px,3cqw,32px);line-height:1;background:#fffdf8;transform:rotate(-2deg);box-shadow:0 1px 2px rgba(0,0,0,.15),0 8px 12px -8px rgba(0,0,0,.35);}
.ug-decade__table{position:relative;display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:clamp(20px,3cqw,34px) clamp(14px,2.6cqw,30px);padding:clamp(30px,4cqw,44px) clamp(8px,2cqw,24px) 0;}
.ug-decade__item{display:grid;justify-items:center;gap:10px;width:clamp(140px,19cqw,230px);transform:rotate(var(--tilt,0deg));}
.ug-decade[data-n="1"] .ug-decade__item{width:min(72%,260px);}
@container (max-width:699px){.ug-decade__item{width:40cqw;}.ug-decade[data-n="1"] .ug-decade__item{width:84%;}.ug-decade__table{padding:26px 4px 0;}.ug-decade__slip{font-size:24px;margin-left:6px;}}
.ug-decade__item .ug-pw{position:relative;width:100%;}
.ug-slip{margin:0;padding:2px 10px 4px;font-size:clamp(19px,2.1cqw,22px);line-height:1.15;text-align:center;color:#2a211c;background:#fffdf8;transform:rotate(calc(var(--tilt,0deg) * -1.4));box-shadow:0 1px 2px rgba(0,0,0,.18);max-width:100%;}

/* ---- the program, typed on a folded card ---- */
.ug-typed{position:relative;margin:0 auto;max-width:560px;padding:clamp(28px,4cqw,40px) clamp(20px,4cqw,36px);text-align:left;font-family:var(--ug-type);font-size:16.5px;line-height:1.55;font-weight:400;
  background:#fffcf3;box-shadow:0 2px 3px rgba(0,0,0,.08),0 22px 34px -26px rgba(40,24,10,.55);transform:rotate(-.5deg);}
.ug-typed::after{content:"";position:absolute;left:0;right:0;top:50%;height:10px;translate:0 -50%;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.05) 48%,rgba(255,255,255,.6) 52%,rgba(0,0,0,0));}
.ug-typed ol{list-style:none;margin:0;padding:0;display:grid;gap:12px;}
.ug-typed li{display:grid;grid-template-columns:6.4em 1fr;gap:14px;}
.ug-typed__t{white-space:nowrap;}
.ug-typed__w em{display:block;font-style:normal;color:var(--ug-soft);font-size:15px;}

/* ---- the entourage ---- */
.ug-ent{display:grid;gap:22px 36px;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));text-align:center;}
.ug-ent__p{margin:2px 0;font-size:18px;line-height:1.45;}

/* ---- what to wear: fabric swatches with pinked edges ---- */
.ug-swatches{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin-top:20px;}
.ug-swatch{display:block;width:clamp(64px,9cqw,84px);aspect-ratio:1;transform:rotate(var(--tilt,0deg));background-color:var(--c);background-image:var(--ug-weave);background-size:220px 220px;background-blend-mode:multiply;filter:drop-shadow(0 4px 5px rgba(0,0,0,.2));
  clip-path:polygon(0 6%,6% 0,12% 6%,18% 0,24% 6%,30% 0,36% 6%,42% 0,48% 6%,54% 0,60% 6%,66% 0,72% 6%,78% 0,84% 6%,90% 0,96% 6%,100% 0,94% 6%,100% 12%,94% 18%,100% 24%,94% 30%,100% 36%,94% 42%,100% 48%,94% 54%,100% 60%,94% 66%,100% 72%,94% 78%,100% 84%,94% 90%,100% 96%,94% 100%,88% 94%,82% 100%,76% 94%,70% 100%,64% 94%,58% 100%,52% 94%,46% 100%,40% 94%,34% 100%,28% 94%,22% 100%,16% 94%,10% 100%,4% 94%,0 100%,6% 94%,0 88%,6% 82%,0 76%,6% 70%,0 64%,6% 58%,0 52%,6% 46%,0 40%,6% 34%,0 28%,6% 22%,0 16%,6% 10%);}

/* ---- the message wall: letters on mixed paper ---- */
.ug-letters{list-style:none;margin:0 auto;padding:0;columns:1;column-gap:24px;max-width:1040px;}
@container (min-width:620px){.ug-letters{columns:2;}}
@container (min-width:960px){.ug-letters{columns:3;}}
.ug-letter{break-inside:avoid;margin:0 0 24px;padding:22px 22px 18px;transform:rotate(var(--tilt,0deg));box-shadow:0 2px 3px rgba(0,0,0,.08),0 18px 28px -22px rgba(40,24,10,.55);}
.ug-letter__text{margin:0;font-family:var(--ug-hand);font-weight:500;font-size:23px;line-height:1.3;color:#2a211c;white-space:pre-line;}
.ug-letter__from{margin:10px 0 0;font-family:var(--ug-hand);font-weight:600;font-size:23px;text-align:right;color:color-mix(in srgb, var(--ug-accent) 70%, #2a211c);}
.ug-letter__from::before{content:"— ";}
.ug-letter--airmail{border:8px solid transparent;background:linear-gradient(#fbfaf6,#fbfaf6) padding-box,repeating-linear-gradient(135deg,#c8443c 0 10px,#fbfaf6 10px 15px,#2f5aa6 15px 25px,#fbfaf6 25px 30px) border-box;}
.ug-letter--pad{padding:30px 20px 16px 44px;background:#fffef8;background-image:linear-gradient(90deg,transparent 30px,rgba(214,96,96,.55) 30px 31px,transparent 31px),repeating-linear-gradient(180deg,transparent 0 29px,#c3d3e4 29px 30px);background-position:0 0,0 22px;}
.ug-letter--pad .ug-letter__text,.ug-letter--pad .ug-letter__from{line-height:30px;}
.ug-letter--card{background:#f6eee1;background-image:linear-gradient(90deg,rgba(0,0,0,.07),rgba(0,0,0,0) 14px);border-radius:2px;}

/* ---- livestream: the time where family is ---- */
.ug-stream{padding:clamp(28px,4cqw,44px) clamp(18px,4cqw,40px);text-align:center;}
.ug-zones{list-style:none;margin:0 auto 22px;padding:0;max-width:380px;text-align:left;}
.ug-zones li{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid color-mix(in srgb, var(--ug-ink) 12%, transparent);font-size:17px;}
.ug-zones li.is-mine{font-weight:600;}
.ug-zones em{font-weight:400;color:var(--ug-soft);}

.ug-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:6px 0 14px;}
.ug-gifts{max-width:520px;margin:10px auto 0;}
.ug-faq{text-align:left;margin:0 0 16px;}
.ug-faq.ug-paper{padding:18px 22px;}
.ug-faq:nth-child(even){transform:rotate(-.4deg);}.ug-faq:nth-child(odd){transform:rotate(.3deg);}
.ug-faq__q{margin:0 0 4px;font-size:clamp(20px,2.2cqw,23px);font-family:var(--ug-display);}

/* ---- the reply card ---- */
.ug-reply{position:relative;margin:0 auto;padding:clamp(28px,5cqw,50px) clamp(18px,4.5cqw,44px);background:#fffdf8;background-image:var(--ug-grain);background-blend-mode:multiply;border-radius:2px;box-shadow:0 2px 3px rgba(0,0,0,.1),0 26px 40px -28px rgba(40,24,10,.6);text-align:center;}
.ug-reply__seats{font-style:italic;font-size:clamp(19px,2.1cqw,22px);}
.ug-form{position:relative;display:grid;gap:20px;margin-top:22px;text-align:left;}
.ug-form label{display:block;margin-bottom:4px;font-style:italic;font-size:16.5px;color:var(--ug-soft);}
.ug-field{width:100%;padding:10px 2px;border:0;border-bottom:1px solid color-mix(in srgb, var(--ug-ink) 30%, transparent);border-radius:0;background:transparent;color:var(--ug-ink);font:400 18px/1.4 var(--ug-serif);outline:none;}
.ug-field:focus{border-bottom-color:var(--ug-accent);}
textarea.ug-field{padding:10px 12px;border:1px solid color-mix(in srgb, var(--ug-ink) 22%, transparent);border-radius:3px;resize:vertical;}
.ug-share{display:flex!important;align-items:center;gap:10px;min-height:44px;margin:8px 0 0!important;font-style:normal!important;font-size:16px!important;color:var(--ug-ink)!important;cursor:pointer;}
.ug-share input{width:20px;height:20px;accent-color:var(--ug-ink);flex:none;}
.ug-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.ug-choice__opt{min-height:52px;padding:0 8px;border:1px solid color-mix(in srgb, var(--ug-ink) 28%, transparent);border-radius:999px;background:transparent;color:var(--ug-ink);font:400 17px/1.2 var(--ug-serif);cursor:pointer;transition:background-color .25s,color .25s;}
.ug-choice__opt.is-picked{background:var(--ug-ink);border-color:var(--ug-ink);color:var(--ug-bg);}
.ug-seats{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:999px;border:1px solid color-mix(in srgb, var(--ug-ink) 18%, transparent);font-size:17px;}
.ug-seats__ctrl{display:flex;align-items:center;gap:6px;}
.ug-seats__ctrl output{min-width:2ch;text-align:center;font-size:19px;font-variant-numeric:tabular-nums;}
.ug-seats button{width:40px;height:40px;border-radius:50%;border:1px solid color-mix(in srgb, var(--ug-ink) 26%, transparent);background:transparent;color:var(--ug-ink);font:400 20px/1 var(--ug-serif);cursor:pointer;}
.ug-seats button:disabled{opacity:.35;cursor:default;}
.ug-link{min-height:44px;padding:6px 0;border:0;background:none;color:var(--ug-ink);font:15px var(--ug-serif);text-decoration:underline;text-underline-offset:3px;cursor:pointer;}
.ug-error{margin:0;color:#9b2c2c;}
.ug-done{display:grid;justify-items:center;gap:4px;}
.ug-done .ug-btn{margin-top:14px;}

.ug-foot{display:grid;justify-items:center;gap:2px;width:min(520px,calc(100% - 40px));margin:clamp(60px,10cqw,110px) auto 0;padding:30px 24px 26px;text-align:center;transform:rotate(-.5deg);}
.ug-foot__thanks{margin:0;font-style:italic;font-size:clamp(20px,2.2cqw,24px);}
.ug-foot__name{margin:6px 0 0;font-family:var(--ug-display);font-style:italic;font-size:clamp(30px,3.6cqw,40px);}
.ug-credit{margin:22px 0 0;font-size:14px;color:var(--ug-soft);}

/* ---- torn paper: the slips, labels and notes the text is written on. The paper is a torn
   layer behind the text (::before), and the shadow follows the tear (filter on the element). */
.ug-title:not(.ug-title--small):not(.ug-title--in),.ug-paper,.ug-tip,.ug-tag,.ug-slip,.ug-decade__slip{position:relative;z-index:1;isolation:isolate;background:none!important;box-shadow:none!important;
  filter:drop-shadow(0 1px 1px rgba(0,0,0,.28)) drop-shadow(0 10px 12px rgba(0,0,0,.3));}
.ug-card .ug-title,.ug-reply .ug-title,.ug-paper .ug-title{filter:none;}
.ug-title:not(.ug-title--small):not(.ug-title--in)::before,.ug-paper::before,.ug-tip::before,.ug-tag::before,.ug-slip::before,.ug-decade__slip::before{content:"";position:absolute;inset:0;z-index:-1;
  background-color:var(--ug-paper);background-image:var(--ug-grain);background-blend-mode:multiply;clip-path:${TEAR_A};}
.ug-card .ug-title::before,.ug-reply .ug-title::before,.ug-paper .ug-title::before{content:none;}
.ug-paper::before{clip-path:${TEAR_C};}
.ug-faq:nth-child(even)::before{clip-path:${TEAR_B};}
.ug-tip::before,.ug-tag::before,.ug-slip::before,.ug-decade__slip::before{clip-path:${TEAR_SLIP};}
.ug-decade__item:nth-child(even) .ug-slip::before{clip-path:${TEAR_B};}
/* the paler fibres a tear exposes, just outside the edge (larger pieces only) */
.ug-title:not(.ug-title--small):not(.ug-title--in)::after,.ug-paper::after{content:"";position:absolute;inset:-1.5px;z-index:-2;background:#fffdf6;clip-path:${RIM_A};opacity:.9;}
.ug-paper::after{clip-path:${RIM_C};}
.ug-card .ug-title::after,.ug-reply .ug-title::after,.ug-paper .ug-title::after{content:none;}
/* a little more room inside, so the words never sit on the tear */
.ug-slip{padding:4px 13px 6px;}
.ug-decade__slip{padding:6px 19px 8px;}

/* ---- a print lifted off the table and turned over ---- */
.ug-root.ug-flip{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(14,8,4,.84);container-type:normal;overflow:hidden;}
.ug-flip.is-motion{animation:ug-dim .35s ease both;}
@keyframes ug-dim{from{background-color:rgba(18,11,6,0);}}
.ug-flip__stage{display:grid;justify-items:center;gap:20px;perspective:1800px;}
.ug-flip.is-motion .ug-flip__stage{animation:ug-lift .65s cubic-bezier(.2,.7,.2,1) both;}
@keyframes ug-lift{from{opacity:0;transform:translateY(34px) scale(.86) rotate(-3deg);}to{opacity:1;transform:none;}}
.ug-flip__card{position:relative;display:block;padding:0;border:0;background:none;cursor:pointer;width:min(86vw,440px,calc(68vh * var(--ar,1)));transform-style:preserve-3d;transition:transform .95s cubic-bezier(.35,.65,.2,1);-webkit-tap-highlight-color:transparent;}
.ug-flip__card.is-turned{transform:rotateY(180deg);}
.ug-flip__face{display:block;backface-visibility:hidden;-webkit-backface-visibility:hidden;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35)) drop-shadow(0 30px 34px rgba(0,0,0,.45));}
.ug-flip__front .ug-print{width:100%;}
.ug-flip__back{position:absolute;inset:0;transform:rotateY(180deg);display:flex;flex-direction:column;justify-content:center;padding:14% 12%;text-align:left;
  background-color:#f3eee3;background-image:${WATERMARK},radial-gradient(120% 90% at 30% 20%,rgba(255,255,255,.5),rgba(255,255,255,0) 60%),linear-gradient(180deg,rgba(120,100,70,0),rgba(120,100,70,.06));background-size:230px 130px,auto,auto;border-radius:3px;}
.ug-flip__hand{display:block;font-family:var(--ug-hand);font-weight:600;font-size:clamp(23px,5.6vw,32px);line-height:1.28;color:#22325a;transform:rotate(-2deg);white-space:pre-line;}
.ug-flip__hand--none{color:#8a8579;font-weight:500;}
.ug-flip__year{position:absolute;right:10%;bottom:8%;font-family:var(--ug-hand);font-size:24px;color:#8a8579;transform:rotate(-4deg);}
.ug-flip__bar{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:0;}

/* ---- scroll reveals (only where useReveal turns them on; the site's own [data-reveal] rule must not hide them) ---- */
.ug-root [data-reveal]{opacity:1;transform:none;transition:none;will-change:auto;}
.rv-on [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity 1.1s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .12s),transform 1.1s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .12s);}
.rv-on [data-reveal].is-in{opacity:1;transform:none;}
.rv-on .ug-letter[data-reveal]{transform:rotate(var(--tilt,0deg)) translateY(18px);}
.rv-on .ug-letter[data-reveal].is-in{transform:rotate(var(--tilt,0deg));}
.rv-on .ug-place[data-reveal].is-in{transform:rotate(-.6deg);}
.rv-on .ug-place + .ug-place[data-reveal].is-in{transform:rotate(.7deg);}
.rv-on .ug-typed[data-reveal].is-in{transform:rotate(-.5deg);}
/* each decade's prints settle onto the table in turn */
.rv-on .ug-decade .ug-decade__item{opacity:0;transform:rotate(calc(var(--tilt,0deg) * 1.8)) translateY(-14px);transition:opacity .9s ease calc(.2s + var(--i,0) * .14s),transform 1.1s cubic-bezier(.25,.8,.3,1) calc(.2s + var(--i,0) * .14s);}
.rv-on .ug-decade.is-in .ug-decade__item{opacity:1;transform:rotate(var(--tilt,0deg));}

@media (prefers-reduced-motion:reduce){.ug-root *,.ug-root *::before,.ug-root *::after{animation:none!important;transition:none!important;}}
`;
