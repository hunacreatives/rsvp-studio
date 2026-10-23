// Capiz's styles. Sizes follow the page's own width (container units) and, for the window,
// the screen height, so the builder's scaled preview, the gallery card and a phone all lay
// out the same way. The opening (.cz-play → .cz-go) and the walk through the window
// (// allows; everywhere else the page rests still. Motion is transform/opacity only.

export const CAPIZ_CSS = `
.cz-root{container-type:inline-size;position:relative;overflow-x:clip;color:var(--cz-ink);font-family:var(--cz-body);font-optical-sizing:auto;background:var(--cz-bg);
  --brass:#97784a;--light:#f6efe4;--lit-rest:.62}
.cz-dark{--brass:#c9a56a}
.cz-root *,.cz-root *::before,.cz-root *::after{box-sizing:border-box}
.cz-root main{position:relative}
.cz-root a{color:inherit}

/* ---- materials ---- */
.cz-pane{position:relative;display:block;overflow:hidden;border-radius:1px;
  background:var(--cz-flake) var(--x,0) var(--y,0)/130px 130px,radial-gradient(circle at 45% 40%,#efe9de,#d6cbb7 75%,#c4b79f);
  box-shadow:inset 0 0 0 100px rgba(70,50,28,var(--t,0)),inset 0 0 calc(var(--mu,4px) * 1.4 + 1px) rgba(40,24,10,.45)}
/* light through the shell: honey-amber, brightest in the middle of each pane */
.cz-pane::after{content:"";position:absolute;inset:0;opacity:var(--lit-rest);
  background:radial-gradient(100% 90% at 50% 42%,rgba(255,240,200,calc(var(--g,.9) * .3)),rgba(255,230,180,0) 66%),var(--cz-capiz) var(--x,0) var(--y,0)/320px 320px;
  box-shadow:inset 0 0 calc(var(--mu,4px) * 1.6 + 2px) rgba(120,64,16,.5)}

/* ---- the window ----
   The stage is a photo behind a wall. The wall is four half-planes (top, bottom, left, right)
   around the opening, each holding its piece of the narra casing; the capiz sashes sit between
   the photo and the wall, so "parked" means slid under the wall. With the scroll on, --e
   moves the four pieces apart (the opening stays a rectangle and simply grows). */
.cz-scene{position:relative;--w:min(86cqw,50svh,560px);--h:calc(var(--w) * 1.16);--c:calc(var(--w) * .024);--B:clamp(200px,24cqw,250px);--T:clamp(56px,8cqw,96px);
  --sh:calc(var(--T) + var(--h) + var(--B));--mu:max(2.5px,calc(var(--w) * .008))}
@container (min-width:700px){.cz-scene{--w:min(68cqw,60svh,640px);--h:calc(var(--w) * .86)}}
/* the gallery card: the first screen sized to the card (4:3), not the browser window */
@container (min-width:700px){.cz-gallery .cz-scene{--w:44cqw;--T:7cqw;--B:calc(75cqw - var(--T) - var(--h))}}
.cz-scene.is-scroll{height:230svh;--sh:100svh;--T:max(40px,calc((100svh - var(--h) - var(--B)) / 2))}
.cz-stage{position:relative;height:var(--sh);overflow:hidden;background:radial-gradient(80% 70% at 50% 45%,#3a2716,#1a110a 70%)}
.cz-scene.is-scroll .cz-stage{position:sticky;top:0}
/* everything that moves with the scroll gets its own layer, so scrolling only re-composites (no repaint) */
.cz-scene.is-scroll .cz-wall,.cz-scene.is-scroll .cz-sashes,.cz-scene.is-scroll .cz-photo,.cz-scene.is-scroll .cz-stage__words{will-change:transform,opacity}

.cz-photo{position:absolute;z-index:1;left:calc(50cqw - var(--w) / 2);top:var(--T);width:var(--w);height:var(--h);overflow:hidden}
.cz-photo__img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.cz-photo__img--empty{display:grid;place-items:center;background:#e9e1d2;color:#5c4b3a}
.cz-photo__garden{position:absolute;inset:0;background:linear-gradient(180deg,#dfe6d6,#9fb393)}
.cz-photo__day{position:absolute;inset:0;background:#fff4dc;opacity:0;pointer-events:none}
.cz-photo__shade{position:absolute;inset:0;opacity:0;pointer-events:none;
  background:radial-gradient(90% 70% at 50% 55%,rgba(20,12,6,.68),rgba(20,12,6,.36) 70%,rgba(20,12,6,.54)),linear-gradient(180deg,rgba(20,12,6,.3),rgba(20,12,6,.1) 40%,rgba(20,12,6,.5))}

.cz-sashes{position:absolute;z-index:2;left:calc(50cqw - var(--w) / 2);top:var(--T);width:var(--w);height:var(--h);overflow:hidden}
.cz-mover{position:absolute;top:0;bottom:0;width:calc(50% + 2px)}
.cz-mover--l{left:0}
.cz-mover--r{right:0}
.cz-sash{position:absolute;inset:0;padding:calc(var(--w) * .014);
  background-color:#2a180f;background-image:linear-gradient(180deg,rgba(255,226,190,.06),rgba(0,0,0,.35)),var(--cz-wood);background-size:auto,cover;background-position:center}
.cz-sash--l{transform:translateX(-70%);box-shadow:6px 0 14px -4px rgba(0,0,0,.45)}
.cz-sash--r{transform:translateX(70%);box-shadow:-6px 0 14px -4px rgba(0,0,0,.45)}
.cz-sashes__depth{position:absolute;inset:0;z-index:4;pointer-events:none;
  box-shadow:inset 0 calc(var(--w) * .05) calc(var(--w) * .05) calc(var(--w) * -.03) rgba(20,12,6,.55),inset 0 calc(var(--w) * -.02) calc(var(--w) * .03) calc(var(--w) * -.02) rgba(20,12,6,.3)}

.cz-wall{position:absolute;overflow:hidden}
.cz-wall--t{z-index:4;left:0;right:0;top:0;height:var(--T)}
.cz-wall--b{z-index:4;left:0;right:0;top:calc(var(--T) + var(--h));bottom:0}
.cz-wall--l{z-index:3;left:0;top:0;bottom:0;width:calc(50cqw - var(--w) / 2)}
.cz-wall--r{z-index:3;right:0;top:0;bottom:0;width:calc(50cqw - var(--w) / 2)}
.cz-wall__bg{position:absolute;left:0;top:0;width:100cqw;height:var(--sh);
  background-color:color-mix(in srgb,var(--cz-bg) 14%,#1c120a);background-image:radial-gradient(110% 85% at 50% 42%,rgba(255,190,120,.08),rgba(0,0,0,0) 55%,rgba(0,0,0,.45)),var(--cz-plaster);background-size:auto,cover;background-position:center;background-blend-mode:normal,multiply}
.cz-wall--b .cz-wall__bg{top:calc(-1 * (var(--T) + var(--h)))}
.cz-wall--r .cz-wall__bg{left:calc(-50cqw - var(--w) / 2)}
.cz-wall__glow{position:absolute;left:50cqw;top:calc(var(--T) + var(--h) / 2);width:calc(var(--w) * 2.6);height:calc(var(--h) * 2);translate:-50% -50%;pointer-events:none;
  background:radial-gradient(closest-side,rgba(255,196,120,.32),rgba(255,180,100,.09) 55%,transparent)}
.cz-wall--r .cz-wall__glow{left:50cqw}
.cz-motes{position:absolute;inset:0;pointer-events:none}
.cz-mote{position:absolute;width:var(--s);height:var(--s);border-radius:50%;background:rgba(255,240,210,.9);box-shadow:0 0 5px rgba(255,226,170,.8);opacity:0;animation:cz-mote var(--dur) linear var(--del) infinite}
@keyframes cz-mote{0%{opacity:0;transform:translate(0,0)}20%{opacity:.7}80%{opacity:.5}100%{opacity:0;transform:translate(var(--dx),-60px)}}

/* the narra casing, one piece on each part of the wall; it fades as the wall parts */
.cz-case{position:absolute}
.cz-case--t{bottom:0;left:calc(50cqw - var(--w) / 2 - var(--c));width:calc(var(--w) + var(--c) * 2);height:var(--c)}
.cz-case--b{top:0;left:calc(50cqw - var(--w) / 2 - var(--c));width:calc(var(--w) + var(--c) * 2);height:var(--c)}
.cz-case--l{right:0;top:var(--T);height:var(--h);width:var(--c)}
.cz-case--r{left:0;top:var(--T);height:var(--h);width:var(--c)}
.cz-sill{position:absolute;top:var(--c);left:calc(50cqw - var(--w) * .55 - var(--c));width:calc(var(--w) * 1.1 + var(--c) * 2);height:calc(var(--w) * .032);border-radius:2px;
  box-shadow:0 14px 22px -10px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,226,180,.25)}

.cz-wood{background-color:#3a2216;background-image:linear-gradient(180deg,rgba(255,226,190,.1),rgba(0,0,0,.25)),var(--cz-wood);background-size:auto,cover;background-position:center}
.cz-lattice{display:grid;gap:var(--mu,4px);width:100%;height:100%}

/* the opening: closed and lit from behind → the sashes catch, then glide back into the wall */
.cz-play .cz-sash--l,.cz-play .cz-sash--r{transform:none}
.cz-play .cz-sash .cz-pane::after{opacity:1}
.cz-play .cz-photo__day{opacity:.55}
.cz-play .cz-rise{opacity:0}
.cz-play.cz-go .cz-sash--l{animation:cz-open-l 2.8s cubic-bezier(.55,.05,.25,1) .45s both}
.cz-play.cz-go .cz-sash--r{animation:cz-open-r 2.8s cubic-bezier(.55,.05,.25,1) .3s both}
.cz-play.cz-go .cz-sash .cz-pane::after{animation:cz-unlit 2.8s ease .8s both}
.cz-play.cz-go .cz-photo__day{animation:cz-fade 2.6s ease .9s both}
.cz-play.cz-go .cz-rise{animation:cz-rise 1.4s cubic-bezier(.2,.7,.2,1) var(--d,3s) both}
@keyframes cz-open-l{0%{transform:none}14%{transform:translateX(-3%)}22%{transform:translateX(-3.6%)}100%{transform:translateX(-70%)}}
@keyframes cz-open-r{0%{transform:none}14%{transform:translateX(3%)}22%{transform:translateX(3.6%)}100%{transform:translateX(70%)}}
@keyframes cz-unlit{from{opacity:1}to{opacity:var(--lit-rest)}}
@keyframes cz-fade{to{opacity:0}}
@keyframes cz-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

.cz-room__words{position:absolute;left:0;right:0;top:calc(var(--c) + var(--w) * .032 + clamp(22px,3.2cqw,40px));display:grid;justify-items:center;padding:0 16px;text-align:center;color:var(--light)}
.cz-names{margin:0;font-family:var(--cz-display);font-style:italic;font-weight:400;font-size:clamp(48px,8cqw,104px);line-height:1.02;letter-spacing:-.012em;text-wrap:balance;text-shadow:0 2px 30px rgba(20,12,6,.35)}
.cz-name{display:inline-block;white-space:nowrap}
.cz-amp{display:inline-block;font-style:normal;font-size:.56em;margin:0 .26em;vertical-align:.14em;color:#dcbb84}
.cz-room__town{margin:clamp(10px,1.4cqw,16px) 0 0;font-size:clamp(15px,1.5cqw,18px);letter-spacing:.04em;color:rgba(246,239,228,.78)}
.cz-room__words .cz-whisper{color:rgba(246,239,228,.8)}

/* the invitation, arriving on the photo once the wall has parted */
.cz-stage__words{position:absolute;inset:0;z-index:6;display:grid;place-items:center;color:var(--light);pointer-events:none;opacity:var(--t,0);transform:translateY(calc((1 - var(--t,0)) * 26px))}
.cz-scene[data-split] .cz-stage__words{left:50cqw;padding-right:16px;transform:translateX(calc((1 - var(--t,0)) * 30px))}
.cz-scene[data-words] .cz-stage__words{pointer-events:auto}
.cz-stage__words .cz-whisper{color:rgba(246,239,228,.82)}

/* the photo you step into, and the invitation written on it */
.cz-full{position:relative;display:grid;place-items:center;min-height:max(620px,62cqw);overflow:hidden;color:var(--light);background:#1d140d}
.cz-full__photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cz-full__shade{position:absolute;inset:0;background:radial-gradient(90% 70% at 50% 55%,rgba(20,12,6,.66),rgba(20,12,6,.34) 70%,rgba(20,12,6,.52)),linear-gradient(180deg,rgba(20,12,6,.3),rgba(20,12,6,.1) 40%,rgba(20,12,6,.5))}
.cz-full__words{position:relative;z-index:1;display:grid;justify-items:center;max-width:680px;padding:64px 20px;text-align:center}
.cz-full .cz-whisper{color:rgba(246,239,228,.82)}
.cz-parents{display:grid;gap:2px;margin:0 0 6px;font-size:clamp(18px,2cqw,22px);line-height:1.5}
.cz-parents p{margin:0}
.cz-parents__and{display:block;margin:4px 0;font-style:italic;font-size:.82em;opacity:.8}
.cz-full__line{margin:16px 0 22px;max-width:20ch;font-family:var(--cz-display);font-style:italic;font-size:clamp(30px,3.8cqw,48px);line-height:1.22;text-wrap:balance}
.cz-full__date{margin:0;font-style:italic;font-size:clamp(19px,2.1cqw,23px)}
.cz-full__at{margin:6px 0 28px;font-size:clamp(15px,1.6cqw,17px);opacity:.85}
.cz-count{display:flex;justify-content:center;align-items:flex-start;gap:clamp(16px,3cqw,30px);margin:0 0 30px}
.cz-count__cell{display:grid;justify-items:center;gap:6px;min-width:3ch}
.cz-count__n{font-family:var(--cz-display);font-size:clamp(34px,4.4cqw,52px);line-height:1;font-variant-numeric:lining-nums tabular-nums}
.cz-count__l{font-size:14px;font-style:italic;opacity:.75}
.cz-count__sep{display:none}

/* ---- rooms ---- */
.cz-day-room{position:relative;background-color:var(--cz-bg);background-image:var(--cz-plaster);background-size:cover;background-position:center;background-blend-mode:multiply;padding-bottom:clamp(80px,11cqw,140px)}
.cz-night-room{position:relative;padding-bottom:clamp(80px,11cqw,140px);--cz-ink:#f1e7d6;--cz-muted:#c4b298;--cz-bg:#24170e;color:var(--cz-ink);
  background-color:#24170e;background-image:linear-gradient(180deg,rgba(14,8,4,.5),rgba(14,8,4,.25) 40%,rgba(14,8,4,.55)),repeating-linear-gradient(90deg,transparent 0 calc(12.5% - 2px),rgba(0,0,0,.5) calc(12.5% - 2px) calc(12.5% - 1px),rgba(255,220,180,.06) calc(12.5% - 1px) 12.5%),var(--cz-wood-wall);
  background-size:auto,auto,500px 750px;box-shadow:inset 0 24px 32px -20px rgba(0,0,0,.7),inset 0 -24px 32px -20px rgba(0,0,0,.7)}
.cz-sec{position:relative;max-width:1080px;margin:0 auto;padding:clamp(80px,11cqw,140px) 16px 0}
.cz-narrow{max-width:700px;text-align:center}
.cz-title{margin:0 0 clamp(26px,3.4cqw,40px);font-family:var(--cz-display);font-style:italic;font-weight:400;font-size:clamp(42px,6.2cqw,78px);line-height:1.04;letter-spacing:-.014em;text-align:center;text-wrap:balance}
.cz-title--left{text-align:left}
.cz-text{margin:0 0 14px;font-size:clamp(17px,1.7cqw,19px);line-height:1.7;text-wrap:pretty}
.cz-text--lead{font-family:var(--cz-display);font-style:italic;font-size:clamp(22px,2.5cqw,29px);line-height:1.45}
.cz-soft{color:var(--cz-muted)}
.cz-whisper{margin:0 0 10px;font-style:italic;font-size:clamp(16px,1.6cqw,18px);color:var(--cz-muted)}
.cz-small{margin:6px 0;font-size:14px;line-height:1.5;color:var(--cz-muted)}
.cz-hint{opacity:.55}
/* builder only (shared/siteEdit AddItem) */
.cz-add{margin-top:14px}.cz-add--center{display:flex;width:max-content;margin:24px auto 0}.cz-adds{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:24px}.cz-cell .cz-add,.cz-parents .site-add{min-height:32px;padding:4px 12px;margin-top:10px;font-size:.8em}

.cz-btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 32px;border:1px solid var(--cz-ink);border-radius:2px;background:var(--cz-ink);color:var(--cz-bg);font:500 17px/1.1 var(--cz-body);letter-spacing:.02em;text-decoration:none;cursor:pointer;transition:background-color .25s,color .25s}
.cz-btn:hover{background:transparent;color:var(--cz-ink)}
.cz-btn--line{background:transparent;color:var(--cz-ink)}
.cz-btn--line:hover{background:var(--cz-ink);color:var(--cz-bg)}
.cz-btn--light{border-color:var(--light);background:var(--light);color:#2a211b}
.cz-btn--light:hover{background:transparent;color:var(--light)}
.cz-btn--block{width:100%}
.cz-btn:disabled{opacity:.6;cursor:not-allowed}
.cz-btn:focus-visible,.cz-choice__opt:focus-visible,.cz-count-pick__n:focus-visible,.cz-link:focus-visible{outline:2px solid var(--brass);outline-offset:3px}

/* ceremony and reception: two tall windows lit from behind */
.cz-venues{display:grid;gap:clamp(64px,7cqw,80px);max-width:980px;text-align:center}
@container (min-width:700px){.cz-venues{grid-template-columns:1fr 1fr;align-items:end}}
.cz-venue{display:grid;justify-items:center;align-content:end}
.cz-niche{position:relative;width:clamp(150px,19cqw,212px);aspect-ratio:3/5;padding:8px;margin:0 0 30px;--mu:3px;border-radius:2px;
  box-shadow:0 0 0 1px rgba(0,0,0,.22),0 26px 40px -20px rgba(0,0,0,.55),0 0 90px rgba(255,190,110,.3)}
.cz-niche--arch{border-radius:50% 50% 2px 2px/30% 30% 2px 2px}
.cz-niche--arch .cz-lattice{border-radius:50% 50% 0 0/28% 28% 0 0;overflow:hidden}
.cz-niche .cz-pane::after{opacity:1}
.rv-on .cz-venue .cz-pane::after{transition:opacity 2.2s ease .5s}
.rv-on .cz-venue:not(.is-in) .cz-pane::after{opacity:.15}
.cz-venue__name{margin:2px 0 10px;font-family:var(--cz-display);font-weight:400;font-size:clamp(30px,3.4cqw,42px);line-height:1.14;text-wrap:balance}
.cz-venue__addr{margin:0 0 6px;max-width:30ch;font-size:16px;line-height:1.5;color:var(--cz-muted)}
.cz-venue__time{margin:0 0 2px;font-style:italic;font-size:18px}
.cz-venue__map{display:inline-flex;align-items:center;min-height:44px;font:600 15px var(--cz-body);text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px}

/* the story, in deep window recesses */
.cz-story{display:grid;gap:clamp(40px,6cqw,80px);align-items:center}
@container (min-width:760px){.cz-story{grid-template-columns:1.1fr 1fr}}
.cz-story__text{max-width:520px}
.cz-story__photos{display:grid;grid-template-columns:1.35fr 1fr;gap:clamp(14px,2.4cqw,26px);align-items:end}
.cz-recess{position:relative;overflow:hidden;background:color-mix(in srgb,var(--cz-ink) 8%,var(--cz-bg));box-shadow:0 1px 0 rgba(255,255,255,.5),0 0 0 1px rgba(60,40,20,.08)}
.cz-recess::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;box-shadow:inset 0 20px 24px -12px rgba(25,15,6,.55),inset 16px 0 20px -14px rgba(25,15,6,.4),inset -6px -6px 12px -10px rgba(255,255,255,.4)}
.cz-recess--arch{aspect-ratio:3/4.5;border-radius:50% 50% 2px 2px/33% 33% 2px 2px}
.cz-recess--low{aspect-ratio:4/5;margin-bottom:clamp(-40px,-4cqw,-16px)}
.cz-recess.photo-slot--empty{display:grid;place-items:center}
.cz-root .photo-slot__label{display:grid;justify-items:center;gap:8px;padding:0 12px;font:600 13px/1.3 var(--cz-body);letter-spacing:.04em;text-align:center}
.cz-band .photo-slot--empty{display:grid;place-items:center;width:100%;height:100%;min-height:180px;background:#e9e1d2;color:#5c4b3a}

/* the entourage, in a great lit capiz screen */
.cz-ent{max-width:1040px}
.cz-grid{position:relative;display:grid;gap:clamp(5px,.8cqw,8px);padding:clamp(8px,1.2cqw,12px);border-radius:3px;
  box-shadow:0 0 0 1px rgba(0,0,0,.4),0 34px 60px -30px rgba(0,0,0,.85),0 0 140px rgba(255,186,100,.2)}
.cz-grid__flicker{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(60% 55% at 50% 48%,rgba(255,214,150,.12),transparent 72%);opacity:.7}
.cz-motion .cz-grid__flicker{animation:cz-flicker 6s ease-in-out infinite}
@keyframes cz-flicker{0%{opacity:.6}12%{opacity:.9}21%{opacity:.7}34%{opacity:1}47%{opacity:.74}61%{opacity:.95}79%{opacity:.68}100%{opacity:.6}}
.cz-grid__row{display:grid;grid-template-columns:1fr 1fr;gap:inherit}
.cz-grid__row>:only-child,.cz-grid__row>:last-child:nth-child(odd){grid-column:1/-1}
@container (min-width:700px){.cz-grid__row{grid-template-columns:repeat(var(--n),1fr)}.cz-grid__row>:last-child:nth-child(odd){grid-column:auto}.cz-grid__row>:only-child{grid-column:1/-1}}
.cz-cell{position:relative;padding:clamp(22px,3cqw,34px) clamp(12px,2cqw,22px);text-align:center;color:#3b2512;
  background:radial-gradient(105% 90% at 50% 46%,rgba(255,248,226,.74),rgba(255,240,206,.3) 62%,rgba(255,232,190,0)),var(--cz-capiz) var(--x,0) var(--y,0)/420px 420px;
  box-shadow:inset 0 0 28px rgba(120,64,16,.42)}
.cz-cell__t{margin:0 0 10px;font-style:italic;font-size:15px;color:#7a4a1e}
.cz-cell__names{list-style:none;margin:0;padding:0;font-size:clamp(16px,1.6cqw,18px);line-height:1.65}
.cz-cell__names--cols{columns:2;column-gap:36px;max-width:660px;margin:0 auto}
@container (max-width:560px){.cz-cell__names--cols{columns:1}}
.cz-grid__row--principal .cz-cell__t,.cz-grid__row--honour .cz-cell__t{font-size:16px}
.rv-on .cz-grid .cz-cell{opacity:.2;transition:opacity 1.2s ease calc(var(--i,0) * .1s + .3s)}
.rv-on .cz-grid.is-in .cz-cell{opacity:1}

/* the day */
.cz-dayline{list-style:none;margin:0 auto;padding:0;max-width:780px}
.cz-dayline li{position:relative;display:grid;grid-template-columns:minmax(6.4em,30%) 1fr;gap:20px;align-items:baseline;padding:24px 0}
.cz-dayline li::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:color-mix(in srgb,var(--cz-ink) 22%,transparent);transform-origin:left}
.cz-dayline__t{font-family:var(--cz-display);font-size:clamp(24px,2.9cqw,36px);line-height:1.1;font-variant-numeric:lining-nums;white-space:nowrap}
.cz-dayline__w{font-size:clamp(19px,2cqw,22px);line-height:1.45}
.cz-dayline__w em{display:block;margin-top:2px;font-size:16px;color:var(--cz-muted)}

/* what to wear: the motif as tinted capiz */
.cz-motif{display:inline-grid;grid-auto-flow:column;gap:6px;padding:8px;margin-top:16px;border-radius:2px;box-shadow:0 14px 24px -14px rgba(0,0,0,.55)}
.cz-motif__pane{display:block;width:clamp(64px,9cqw,92px);aspect-ratio:1;border-radius:1px;background-color:var(--c);
  background-image:var(--cz-flake),radial-gradient(circle at 45% 40%,rgba(255,255,255,.45),rgba(255,255,255,0) 70%);background-size:130px 130px,auto;box-shadow:inset 0 0 10px rgba(0,0,0,.25)}

/* the photos, edge to edge in a narra lattice, each clearing from capiz as it arrives */
.cz-band{display:grid;grid-template-columns:repeat(2,1fr);grid-auto-flow:row dense;gap:6px;padding:6px;box-shadow:0 0 0 1px rgba(0,0,0,.3)}
@container (min-width:700px){.cz-band{grid-template-columns:repeat(4,1fr);gap:8px;padding:8px}}
.cz-band__pane{position:relative;overflow:hidden;aspect-ratio:4/5;background:#2a1b10}
.cz-band__pane.is-wide-m{grid-column:span 2;aspect-ratio:8/5}
@container (min-width:700px){.cz-band__pane.is-wide-m{grid-column:auto;aspect-ratio:4/5}.cz-band__pane.is-wide-d{grid-column:span 2;aspect-ratio:auto}}
.cz-band__photo{position:absolute;inset:0}
.cz-band__pane::after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 12px 18px -12px rgba(0,0,0,.6)}
.rv-on .cz-band__pane[data-reveal]{opacity:1;transform:none}
.rv-on .cz-band__pane::before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;transition:opacity 1.8s ease calc(var(--i,0) * .16s + .2s);
  background:radial-gradient(110% 95% at 50% 45%,rgba(255,248,226,.7),rgba(255,240,206,.25) 65%,rgba(255,232,190,0)),var(--cz-capiz) var(--x,0) var(--y,0)/420px 420px}
.rv-on .cz-band__pane.is-in::before{opacity:0}
.rv-on .cz-band__pane img{transform:scale(1.08);transition:transform 2.6s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .16s)}
.rv-on .cz-band__pane.is-in img{transform:none}

/* good to know */
.cz-know__grid{display:grid;gap:8px clamp(32px,5cqw,64px);max-width:920px;margin:0 auto}
@container (min-width:760px){.cz-know__grid{grid-template-columns:1fr 1fr}}
.cz-item{margin:0 0 26px}
.cz-item__q{margin:0 0 6px;font-family:var(--cz-display);font-size:clamp(21px,2.3cqw,25px);line-height:1.3}

/* gifts, behind a sliding pane */
.cz-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:6px 0 10px}
.cz-gift{display:grid;justify-items:center;gap:20px;margin:28px auto 0;max-width:380px}
.cz-gift__frame{position:relative;display:grid;width:100%;aspect-ratio:5/4}
.cz-gift__inside{display:grid;place-items:center;padding:18px;background:color-mix(in srgb,var(--cz-ink) 7%,var(--cz-bg));box-shadow:inset 0 12px 18px -10px rgba(0,0,0,.5);transition:opacity .6s ease .35s}
.cz-gift__sash{position:absolute;inset:0;padding:8px;--mu:3px;border-radius:2px;box-shadow:0 16px 26px -12px rgba(0,0,0,.6),0 0 80px rgba(255,186,100,.22);transition:transform 1.3s cubic-bezier(.55,.05,.25,1),opacity .5s ease 1s}
.cz-gift__sash .cz-pane::after{opacity:1}
.cz-gift:not(.is-open) .cz-gift__inside{opacity:0}
.cz-gift.is-open .cz-gift__sash{transform:translateX(calc(100% + 14px));opacity:0}

/* the reply card on the sill, by lamplight */
.cz-rsvp-wrap{max-width:700px}
.cz-lamp{position:absolute;left:50%;top:44%;width:min(1200px,130cqw);aspect-ratio:1.3;translate:-50% -50%;pointer-events:none;background:radial-gradient(closest-side,rgba(255,190,110,.24),rgba(255,180,100,.06) 60%,transparent)}
.cz-rsvp{position:relative}
.cz-card{position:relative;z-index:1;margin:0 auto;width:min(100%,560px);padding:clamp(32px,5cqw,56px) clamp(20px,4.5cqw,48px);text-align:center;border-radius:1px;
  --cz-ink:#2a211b;--cz-bg:#fbf7ee;--cz-muted:#6f6253;color:var(--cz-ink);background-color:var(--cz-bg);background-image:var(--cz-grain);background-blend-mode:multiply;
  box-shadow:0 2px 3px rgba(0,0,0,.15),0 30px 40px -24px rgba(0,0,0,.7),0 0 120px rgba(255,190,110,.15)}
.cz-ledge{position:relative;z-index:0;height:clamp(16px,2cqw,22px);margin:-3px -5% 0;border-radius:2px;box-shadow:0 18px 26px -10px rgba(0,0,0,.7),inset 0 2px 0 rgba(255,226,180,.2)}
.cz-card .cz-title{font-size:clamp(38px,5cqw,56px)}
.cz-seats{font-family:var(--cz-display);font-style:italic;font-size:clamp(20px,2.3cqw,24px);line-height:1.4}
.cz-form{position:relative;display:grid;gap:20px;margin-top:22px;text-align:left}
.cz-form label{display:block;margin-bottom:4px;font-style:italic;font-size:15px;color:var(--cz-muted)}
.cz-field{width:100%;padding:10px 2px;border:0;border-bottom:1px solid rgba(42,33,27,.35);border-radius:0;background:transparent;color:var(--cz-ink);font:400 18px/1.4 var(--cz-body);outline:none}
.cz-field:focus{border-bottom-color:var(--cz-ink)}
textarea.cz-field{padding:10px 12px;border:1px solid rgba(42,33,27,.25);resize:vertical}
.cz-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cz-choice__opt{min-height:54px;padding:0 8px;border:1px solid rgba(42,33,27,.3);border-radius:2px;background:transparent;color:var(--cz-ink);font:italic 400 17px/1.2 var(--cz-body);cursor:pointer;transition:background-color .25s,color .25s}
.cz-choice__opt.is-picked{background:var(--cz-ink);border-color:var(--cz-ink);color:var(--cz-bg)}
.cz-count-pick{display:flex;flex-wrap:wrap;gap:8px}
.cz-count-pick__n{width:48px;height:48px;border:1px solid rgba(42,33,27,.3);border-radius:2px;background:transparent;color:var(--cz-ink);font:400 18px var(--cz-display);cursor:pointer}
.cz-count-pick__n.is-picked{background:var(--cz-ink);color:var(--cz-bg)}
.cz-link{min-height:44px;padding:6px 0;border:0;background:none;color:var(--cz-ink);font:15px var(--cz-body);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.cz-error{margin:0;color:#9b2c2c}
.cz-done{display:grid;justify-items:center;gap:4px}
.cz-done .cz-btn{margin-top:14px}

/* the stone base */
.cz-base{position:relative;display:grid;justify-items:center;gap:4px;padding:clamp(56px,7cqw,88px) 16px clamp(36px,5cqw,56px);text-align:center;
  background-color:color-mix(in srgb,var(--cz-ink) 17%,var(--cz-bg));background-image:var(--cz-stone);background-size:clamp(240px,30cqw,360px) auto;background-blend-mode:multiply;
  box-shadow:inset 0 18px 22px -16px rgba(0,0,0,.5)}
.cz-dark .cz-base{background-color:color-mix(in srgb,var(--cz-ink) 12%,var(--cz-bg))}
.cz-base .cz-whisper{margin:0;color:var(--cz-ink)}
.cz-mono{margin:2px 0 0;font-family:var(--cz-display);font-style:italic;font-size:clamp(34px,4.2cqw,46px);line-height:1.2}
.cz-bloom{display:block;margin-top:10px;fill:none;stroke:var(--brass);stroke-width:1.15}
.cz-bloom circle{fill:var(--brass);stroke:none}
.cz-credit{margin:20px 0 0;font-size:13px;color:var(--cz-ink);opacity:.75}

/* scroll reveals (only where useReveal turns them on; the site's own [data-reveal] rule must not hide them) */
.cz-root [data-reveal]{opacity:1;transform:none;transition:none;will-change:auto}
.rv-on [data-reveal]{opacity:0;transform:translateY(20px);transition:opacity 1.2s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .14s),transform 1.2s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .14s)}
.rv-on [data-reveal].is-in{opacity:1;transform:none}
.rv-on [data-reveal] .cz-recess img{transform:scale(1.08);transition:transform 2.6s cubic-bezier(.2,.7,.2,1)}
.rv-on [data-reveal].is-in .cz-recess img{transform:none}
.rv-on .cz-dayline li::before{transform:scaleX(0);transition:transform 1.4s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .12s + .2s)}
.rv-on .cz-dayline li.is-in::before{transform:none}

@media (prefers-reduced-motion:reduce){.cz-root *,.cz-root *::before,.cz-root *::after{animation:none!important;transition:none!important}}
`;
