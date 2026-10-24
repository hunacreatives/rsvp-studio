// Porcelain Garden's styles. Every size follows the page's own width (container units), so the
// builder's 390px preview, the gallery card and a phone lay out the same way. Motion: the
// peony draws itself in (.pg-draw) and the handscroll unrolls (.pg-hs--play → .is-open), both
// only where the template turns them on; transform, clip-path, opacity and stroke only.

export const PORCELAIN_CSS = `
.pg-root{container-type:inline-size;position:relative;overflow-x:clip;color:var(--pg-ink);font-family:var(--pg-body);font-size:19px;
  background-color:var(--pg-bg);
  --peony:#E4A3A3;--celadon:#A9BFA8;--gold:#C2A15E;--gold-ink:#88692f;--red:#B5332E;
  --pg-paper:color-mix(in srgb,var(--pg-bg) 30%,#fff);--pg-surface:var(--pg-bg);
  --pg-zh:"Cactus Classical Serif","Noto Serif TC","Songti TC","PMingLiU",serif}
.pg-celadon{--gold-ink:#7a6531;--peony:#E2A5A0}
.pg-root *,.pg-root *::before,.pg-root *::after{box-sizing:border-box}
.pg-root a{color:inherit}
.pg-root main{position:relative}
.pg-zh{font-family:var(--pg-zh);font-style:normal;font-synthesis:none;font-weight:400;letter-spacing:.04em}
.pg-hint{opacity:.5}

/* ---- the drawings ---- */
.pg-art{display:block;overflow:visible}
.pg-art .pg-line{fill:none;stroke:var(--pg-line);stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round}
.pg-art .pg-fine{fill:none;stroke:var(--pg-line);stroke-width:.7;stroke-linecap:round;opacity:.8}
.pg-art .pg-stem{fill:none;stroke:var(--pg-line);stroke-width:1.7;stroke-linecap:round}
.pg-art .pg-stem--fine{stroke-width:.8}
.pg-art .pg-petal{stroke:var(--pg-line);stroke-width:1;stroke-linejoin:round;fill:var(--pg-paper)}
.pg-art .pg-wash-1{fill:color-mix(in srgb,var(--peony) 26%,var(--pg-paper))}
.pg-art .pg-wash-2{fill:color-mix(in srgb,var(--peony) 46%,var(--pg-paper))}
.pg-art .pg-wash-3{fill:color-mix(in srgb,var(--peony) 70%,var(--pg-paper))}
.pg-art .pg-wash-gold{fill:color-mix(in srgb,var(--gold) 50%,var(--pg-paper))}
.pg-art .pg-wash-cobalt{fill:color-mix(in srgb,var(--pg-line) 10%,var(--pg-paper))}
.pg-art .pg-leaf{stroke:var(--pg-line);stroke-width:1;stroke-linejoin:round;fill:color-mix(in srgb,var(--celadon) 50%,var(--pg-paper))}
.pg-art .pg-dot{fill:var(--pg-line)}
.pg-art .pg-gold{fill:none;stroke:var(--gold);stroke-width:1.5}
.pg-plate__body{fill:#fffefb}
.pg-plate__band{fill:none;stroke:color-mix(in srgb,var(--pg-line) 7%,#fffefb)}
.pg-panel{fill:color-mix(in srgb,var(--pg-line) 13%,#fffefb);stroke:var(--pg-line);stroke-width:1}
.pg-panel--alt{fill:color-mix(in srgb,var(--peony) 34%,#fffefb)}

/* the fine double frame of a Chinese panel, with scooped corners (art.tsx Corner) */
.pg-frame{position:relative;background:var(--pg-surface)}
.pg-frame::before{content:"";position:absolute;inset:0;border:1px solid var(--pg-line);pointer-events:none}
.pg-frame::after{content:"";position:absolute;inset:6px;border:1px solid color-mix(in srgb,var(--pg-line) 50%,transparent);pointer-events:none}
.pg-corner{position:absolute;z-index:2;width:30px;height:30px;pointer-events:none}
.pg-corner__mask{fill:var(--pg-surface)}
.pg-corner .pg-fine{opacity:1;stroke:color-mix(in srgb,var(--pg-line) 50%,var(--pg-surface))}
.pg-corner--tl{top:0;left:0}
.pg-corner--tr{top:0;right:0;transform:scaleX(-1)}
.pg-corner--bl{bottom:0;left:0;transform:scaleY(-1)}
.pg-corner--br{bottom:0;right:0;transform:scale(-1,-1)}

/* the cloud-scroll rule under headings and in the footer */
.pg-rule{display:block;width:176px;height:20px;margin-top:18px;background:var(--pg-band) center/40px 20px repeat-x;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent);mask-image:linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)}

/* ---- the hero ---- */
.pg-hero{padding:clamp(10px,2cqw,26px);--pw:min(86cqw,540px)}
.pg-hero__panel{--pg-surface:var(--pg-bg);display:grid;justify-items:center;padding:clamp(64px,8cqw,104px) 16px clamp(56px,7cqw,92px);text-align:center;
  background-image:radial-gradient(60% 46% at 50% 44%,color-mix(in srgb,var(--peony) 14%,transparent),transparent 72%)}
.pg-hero__garden{position:absolute;inset:7px;overflow:hidden;pointer-events:none}
.pg-branch{position:absolute;width:clamp(220px,36cqw,480px);height:auto}
.pg-branch--tl{left:-5%;top:-5%;transform:scaleY(-1);--bd:0s}
.pg-branch--br{right:-5%;bottom:-4%;transform:scaleX(-1);--bd:.6s}
@container (max-width:699px){
  .pg-hero__panel{padding-top:max(96px,26cqw);padding-bottom:max(150px,40cqw)}
  .pg-branch{width:52cqw}
  .pg-branch--tl{left:-20cqw;top:-8cqw}
  .pg-branch--br{right:-16cqw;bottom:-5cqw}
}
.pg-hero__words{position:relative;z-index:1;display:grid;justify-items:center}
.pg-hero__zh{margin:0 -.3em 6px 0;font-size:clamp(40px,6cqw,72px);line-height:1.15;letter-spacing:.3em;color:var(--pg-line);white-space:nowrap}
.pg-hero__zh--xi{margin-right:0;letter-spacing:0;font-size:clamp(60px,8.4cqw,100px);color:var(--red)}
.pg-whisper{margin:0 0 10px;font-family:var(--pg-display);font-style:italic;font-size:clamp(19px,1.9cqw,22px);color:var(--pg-muted)}
.pg-plate-wrap{position:relative;display:grid;place-items:center;width:var(--pw);aspect-ratio:1;margin:6px 0 26px}
.pg-plate-wrap .pg-plate{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 22px 26px color-mix(in srgb,var(--pg-line) 14%,transparent))}
.pg-names{position:relative;display:grid;justify-items:center;margin:0;font-family:var(--pg-display);font-style:italic;font-weight:500;font-size:calc(var(--pw) * .118 * var(--fit,1));line-height:1;letter-spacing:-.005em;color:var(--pg-ink)}
.pg-host{display:grid;justify-items:center}
.pg-host__name{display:block}
.pg-name{display:inline-block;white-space:nowrap}
.pg-name-zh{display:block;margin:.42em -.32em 0 0;font-size:calc(var(--pw) * .04);line-height:1;letter-spacing:.32em;color:var(--pg-line);white-space:nowrap}
.pg-xi{display:block;margin:.32em 0 .3em;font-size:calc(var(--pw) * .074);line-height:1;color:var(--red)}
.pg-amp{display:block;margin:.12em 0 .06em;font-size:.6em;font-style:normal;color:var(--gold-ink)}
.pg-date{margin:0;font-family:var(--pg-display);font-style:italic;font-size:clamp(22px,2.4cqw,28px);line-height:1.3;text-wrap:balance}
.pg-lunar{display:flex;flex-wrap:wrap;justify-content:center;gap:0 .9em;margin:10px 0 0;font-size:clamp(17px,1.7cqw,20px);color:var(--gold-ink)}
.pg-lunar .pg-zh{letter-spacing:.18em;white-space:nowrap}
.pg-at>span{display:inline-block}
.pg-at__dot{margin:0 .55em}
@container (max-width:520px){.pg-at>span{display:block}.pg-at__dot{display:none}}
.pg-at{margin:10px 0 0;text-wrap:balance;font-size:clamp(17px,1.7cqw,19px);color:var(--pg-muted)}
.pg-count{display:flex;justify-content:center;align-items:flex-start;gap:clamp(18px,3cqw,32px);margin:26px 0 30px}
.pg-count__cell{display:grid;justify-items:center;gap:4px;min-width:3ch}
.pg-count__n{font-family:var(--pg-display);font-weight:500;font-size:clamp(34px,4cqw,46px);line-height:1;color:var(--pg-line);font-variant-numeric:lining-nums tabular-nums}
.pg-count__l{font-size:14px;font-style:italic;color:var(--pg-muted)}
.pg-count__sep{display:none}
.pg-hero__words>.pg-btn{margin-top:4px}

/* ---- buttons ---- */
.pg-btn{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 36px;border:1px solid var(--pg-line);border-radius:2px;background:var(--pg-line);color:#fffdf8;
  font:500 18px/1.1 var(--pg-body);letter-spacing:.05em;text-decoration:none;cursor:pointer;box-shadow:inset 0 0 0 3px var(--pg-line),inset 0 0 0 4px rgba(255,253,248,.5);transition:background-color .25s,color .25s,box-shadow .25s}
.pg-btn--red{background:var(--red);border-color:var(--red);box-shadow:inset 0 0 0 3px var(--red),inset 0 0 0 4px rgba(255,236,220,.55)}
.pg-btn--red:hover{background:#9c2a26;box-shadow:inset 0 0 0 3px #9c2a26,inset 0 0 0 4px rgba(255,236,220,.55)}
.pg-btn--line{background:transparent;color:var(--pg-line);box-shadow:none}
.pg-btn--line:hover{background:var(--pg-line);color:#fffdf8}
.pg-btn--block{width:100%}
.pg-btn:disabled{opacity:.6;cursor:not-allowed}
.pg-btn:focus-visible,.pg-choice__opt:focus-visible,.pg-party__ctrl button:focus-visible,.pg-link:focus-visible{outline:2px solid var(--gold);outline-offset:3px}

/* ---- sections ---- */
.pg-sec{position:relative;max-width:1080px;margin:0 auto;padding:clamp(80px,10cqw,128px) 16px 0}
.pg-narrow{max-width:720px;text-align:center}
.pg-head{display:grid;justify-items:center;margin:0 0 clamp(28px,3.6cqw,44px);text-align:center}
.pg-kicker{margin:0 -.44em 10px 0;font-size:clamp(15px,1.5cqw,17px);letter-spacing:.44em;color:var(--gold-ink);white-space:nowrap}
.pg-title{margin:0;font-family:var(--pg-display);font-style:italic;font-weight:400;font-size:clamp(40px,5.4cqw,66px);line-height:1.06;letter-spacing:-.01em;text-wrap:balance}
.pg-text{margin:0 0 14px;font-size:clamp(19px,1.9cqw,21px);line-height:1.62;text-wrap:pretty}
.pg-text--lead{font-family:var(--pg-display);font-style:italic;font-size:clamp(24px,2.7cqw,31px);line-height:1.42}
.pg-small{margin:8px 0 0;font-size:15px;line-height:1.5;color:var(--pg-muted)}
.pg-add{margin-top:14px}
.pg-add--center{display:flex;width:max-content;max-width:100%;margin:26px auto 0}
.pg-add--small{min-height:32px;padding:4px 12px;margin:8px auto 0;font-size:.8em}

/* the invitation */
.pg-invite{padding-top:clamp(64px,8cqw,104px)}
.pg-families{margin:0 -.26em 16px 0;font-size:clamp(32px,4.4cqw,50px);line-height:1.2;letter-spacing:.26em;color:var(--pg-line)}
.pg-parents{display:grid;gap:2px;margin:14px 0 0;font-size:clamp(21px,2.2cqw,25px);line-height:1.45}
.pg-parents p{margin:0}
.pg-parents__and{display:block;margin:6px 0;font-family:var(--pg-display);font-style:italic;font-size:.82em;color:var(--pg-muted)}
.pg-invite__line{margin:26px auto 0;max-width:24ch;font-family:var(--pg-display);font-style:italic;font-size:clamp(27px,3.2cqw,38px);line-height:1.3;text-wrap:balance}
.pg-ducks{width:min(100%,470px);height:auto;margin:clamp(28px,4cqw,44px) auto 0}

/* where */
.pg-venues{display:grid;gap:clamp(20px,3cqw,32px);max-width:1000px}
@container (min-width:720px){.pg-venues{grid-template-columns:1fr 1fr}}
.pg-venue{--pg-surface:var(--pg-paper);display:grid;justify-items:center;align-content:start;padding:clamp(40px,5cqw,56px) 26px clamp(30px,4cqw,44px);text-align:center}
.pg-icon{width:112px;height:auto;margin:0 0 18px}
.pg-venue .pg-kicker{margin-bottom:4px}
.pg-venue .pg-whisper{margin-bottom:8px}
.pg-venue__name{margin:0 0 8px;font-family:var(--pg-display);font-weight:500;font-size:clamp(29px,3.1cqw,37px);line-height:1.14;text-wrap:balance}
.pg-venue__addr{margin:0 0 6px;max-width:30ch;font-size:18px;line-height:1.5;color:var(--pg-muted)}
.pg-venue__time{margin:0 0 2px;font-family:var(--pg-display);font-style:italic;font-size:20px}
.pg-venue__map{display:inline-flex;align-items:center;min-height:44px;font:600 16px var(--pg-body);color:var(--pg-line);text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px}

/* the note */
.pg-story__sprig{margin:22px auto 0}

/* ---- the handscroll ---- */
.pg-hs{position:relative;width:min(100%,1060px);margin:0 auto;padding:0 var(--rw);--rw:clamp(16px,2.2cqw,24px)}
.pg-hs__paper{position:relative;padding:clamp(12px,1.6cqw,18px) clamp(14px,3.2cqw,46px);background:var(--pg-brocade);background-size:18px 18px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 22px 30px -22px rgba(20,30,60,.45)}
.pg-hs__sheet{position:relative;padding:clamp(30px,4cqw,50px) clamp(10px,2.4cqw,32px);background-color:#fffcf4;background-image:var(--pg-grain);background-size:280px;background-blend-mode:multiply;
  box-shadow:0 0 0 1px var(--gold),0 0 0 4px #fffcf4,0 0 0 5px color-mix(in srgb,var(--gold) 60%,transparent)}
.pg-hs__roller{position:absolute;top:-8px;bottom:-8px;width:var(--rw);border-radius:5px;z-index:2;
  background:linear-gradient(90deg,#2c1a11,#5e3a26 22%,#9a6a46 46%,#b88560 54%,#6a432b 76%,#2a180f);box-shadow:0 14px 18px -10px rgba(0,0,0,.45)}
.pg-hs__roller::before,.pg-hs__roller::after{content:"";position:absolute;left:50%;width:calc(var(--rw) * .82);height:16px;translate:-50% 0;border-radius:40%;
  background:radial-gradient(70% 60% at 40% 35%,#e5eee2,#a9bfa8 55%,#6f8c76);box-shadow:0 0 0 1px rgba(40,60,50,.25)}
.pg-hs__roller::before{top:-12px}
.pg-hs__roller::after{bottom:-12px}
.pg-hs__roller--l{left:0}
.pg-hs__roller--r{right:0}
.pg-hs__tie{display:none}
.pg-hs__list{list-style:none;margin:0;padding:0;display:grid}
.pg-hs__item{position:relative;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"zh time" "zh label";column-gap:18px;row-gap:2px;align-items:center;padding:20px 4px}
.pg-hs__item+.pg-hs__item{border-top:1px solid color-mix(in srgb,var(--pg-line) 16%,transparent)}
.pg-hs__time{grid-area:time;font-family:var(--pg-display);font-weight:500;font-size:clamp(18px,1.8cqw,21px);letter-spacing:.04em;color:var(--gold-ink);font-variant-numeric:lining-nums;white-space:nowrap}
.pg-hs__zh{grid-area:zh;min-width:1.2em;font-size:clamp(26px,2.8cqw,36px);line-height:1.2;color:var(--pg-line)}
.pg-hs__zh.is-vertical{writing-mode:vertical-rl;text-orientation:upright;letter-spacing:.24em;line-height:1}
.pg-hs__label{grid-area:label;font-family:var(--pg-display);font-style:italic;font-size:clamp(21px,2cqw,24px);line-height:1.3;text-wrap:balance}
@container (min-width:720px){
  .pg-hs__list{grid-template-columns:repeat(var(--cols,4),minmax(0,1fr));grid-auto-rows:auto minmax(4.6em,auto) auto;row-gap:16px}
  .pg-hs__item{grid-row:span 3;grid-template-columns:none;grid-template-rows:subgrid;grid-template-areas:"time" "zh" "label";row-gap:16px;justify-items:center;align-items:center;padding:8px clamp(10px,1.6cqw,20px);text-align:center}
  .pg-hs__item+.pg-hs__item{border-top:0}
  .pg-hs__item::before{content:"";position:absolute;left:0;top:10%;bottom:10%;width:1px;background:color-mix(in srgb,var(--pg-line) 18%,transparent)}
  .pg-hs__item:first-child::before,.pg-hs__item:nth-child(6n+1)::before{display:none}
  .pg-hs__item:nth-child(n+7){margin-top:28px}
  .pg-hs__label{max-width:13ch;align-self:start}
}
/* the unrolling: closed, the rollers sit together in the middle with a silk tie round them */
.pg-hs--play .pg-hs__paper{clip-path:inset(-30px calc(50% - 1px) -40px calc(50% - 1px))}
.pg-hs--play .pg-hs__roller--l{transform:translateX(var(--hw,0px))}
.pg-hs--play .pg-hs__roller--r{transform:translateX(calc(-1 * var(--hw,0px)))}
.pg-hs--play .pg-hs__tie{display:block;position:absolute;z-index:3;left:50%;top:50%;width:calc(var(--rw) * 2 + 12px);height:18px;translate:-50% -50%;border-radius:2px;
  background:color-mix(in srgb,var(--peony) 80%,#fff);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(120,40,40,.2),0 0 0 1px color-mix(in srgb,var(--gold) 70%,transparent)}
.pg-hs--play .pg-hs__item{opacity:0}
.pg-hs--play.is-open .pg-hs__paper{clip-path:inset(-30px 0 -40px 0);transition:clip-path 2.6s cubic-bezier(.62,0,.24,1) .55s}
.pg-hs--play.is-open .pg-hs__roller{transform:none;transition:transform 2.6s cubic-bezier(.62,0,.24,1) .55s}
.pg-hs--play.is-open .pg-hs__tie{opacity:0;transform:scaleY(.2);transition:opacity .45s ease,transform .45s ease}
.pg-hs--play.is-open .pg-hs__item{opacity:1;transition:opacity 1.1s ease calc(1.2s + var(--i,0) * .2s)}

/* elders & family */
.pg-elders__grid{display:grid;gap:30px;max-width:820px;margin:0 auto}
@container (min-width:640px){.pg-elders__grid{grid-template-columns:1fr 1fr;gap:34px 0}.pg-elder:nth-child(even){border-left:1px solid color-mix(in srgb,var(--pg-line) 18%,transparent)}.pg-elders__grid>:last-child:nth-child(odd){grid-column:1/-1}}
.pg-elder{padding:6px 18px;text-align:center}
.pg-elder__t{margin:0 0 8px;font-family:var(--pg-display);font-style:italic;font-size:19px;color:var(--pg-muted)}
.pg-elder__names{list-style:none;margin:0;padding:0;font-size:clamp(21px,2.1cqw,24px);line-height:1.5}
@container (max-width:639px){.pg-elder+.pg-elder::before{content:"";display:block;width:40px;height:20px;margin:0 auto 26px;background:var(--pg-band) center/40px 20px repeat-x;opacity:.7}}

/* what to wear */
.pg-dishes{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(10px,2cqw,18px);margin-top:24px}
.pg-dish{width:clamp(58px,8cqw,78px);height:auto;filter:drop-shadow(0 8px 8px color-mix(in srgb,var(--pg-line) 14%,transparent))}

/* photos, in moon-gate and arched frames */
.pg-photos__grid{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(22px,3cqw,36px) clamp(16px,2.6cqw,32px);max-width:980px;margin:0 auto;align-items:center}
@container (min-width:720px){.pg-photos__grid{grid-template-columns:repeat(3,1fr)}}
.pg-photos__grid--1{grid-template-columns:min(100%,420px);justify-content:center}
.pg-gate{position:relative;aspect-ratio:4/5;border-radius:50% 50% 3px 3px/38% 38% 3px 3px}
.pg-gate--1{aspect-ratio:1;border-radius:50%}
.pg-gate__photo{position:absolute;inset:0;overflow:hidden;border-radius:inherit;background:color-mix(in srgb,var(--pg-line) 6%,var(--pg-paper))}
.pg-gate::after{content:"";position:absolute;inset:-7px;border:1px solid color-mix(in srgb,var(--pg-line) 55%,transparent);border-radius:inherit;pointer-events:none}
.pg-gate .photo-slot--empty{display:grid;place-items:center;color:var(--pg-line)}
.pg-root .photo-slot__label{display:grid;justify-items:center;gap:8px;padding:0 12px;font:600 13px/1.3 var(--pg-body);letter-spacing:.04em;text-align:center}
.rv-on .pg-gate img{transform:scale(1.06);transition:transform 2.4s cubic-bezier(.2,.7,.2,1)}
.rv-on .pg-gate.is-in img{transform:none}

/* ang pao & gifts */
.pg-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:18px 0 6px}

/* good to know */
.pg-know__grid{display:grid;gap:6px clamp(32px,5cqw,64px);max-width:920px;margin:0 auto}
@container (min-width:760px){.pg-know__grid{grid-template-columns:1fr 1fr}}
.pg-item{margin:0 0 24px}
.pg-item__cloud{width:44px;height:22px;margin:0 0 8px}
.pg-item__q{margin:0 0 6px;font-family:var(--pg-display);font-weight:500;font-size:clamp(24px,2.5cqw,28px);line-height:1.25}

/* the reply card */
.pg-rsvp-wrap{max-width:660px}
.pg-card{--pg-surface:var(--pg-paper);padding:clamp(44px,6cqw,66px) clamp(22px,5cqw,56px);text-align:center}
.pg-card .pg-title{font-size:clamp(40px,5cqw,56px)}
.pg-seats{margin:12px 0 0;font-family:var(--pg-display);font-style:italic;font-size:clamp(21px,2.3cqw,25px);line-height:1.4}
.pg-form{position:relative;display:grid;gap:22px;margin-top:28px;text-align:left}
.pg-form label,.pg-party__label{display:block;margin-bottom:4px;font-family:var(--pg-display);font-style:italic;font-size:18px;color:var(--pg-muted)}
.pg-field{width:100%;padding:10px 2px;border:0;border-bottom:1px solid color-mix(in srgb,var(--pg-line) 40%,transparent);border-radius:0;background:transparent;color:var(--pg-ink);font:400 19px/1.4 var(--pg-body);outline:none}
.pg-field:focus{border-bottom-color:var(--pg-line)}
textarea.pg-field{padding:10px 12px;border:1px solid color-mix(in srgb,var(--pg-line) 30%,transparent);resize:vertical}
.pg-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pg-choice__opt{min-height:56px;padding:0 8px;border:1px solid color-mix(in srgb,var(--pg-line) 45%,transparent);border-radius:2px;background:transparent;color:var(--pg-line);font:italic 500 19px/1.2 var(--pg-display);cursor:pointer;transition:background-color .25s,color .25s}
.pg-choice__opt.is-picked{background:var(--pg-line);border-color:var(--pg-line);color:#fffdf8}
.pg-party{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px}
.pg-party__label{margin:0}
.pg-party__ctrl{display:inline-flex;align-items:center;border:1px solid color-mix(in srgb,var(--pg-line) 40%,transparent);border-radius:999px}
.pg-party__ctrl button{width:46px;height:46px;border:0;border-radius:999px;background:transparent;color:var(--pg-line);font:400 24px/1 var(--pg-body);cursor:pointer}
.pg-party__ctrl button:disabled{opacity:.3;cursor:default}
.pg-party__ctrl output{min-width:2.2ch;text-align:center;font:500 23px var(--pg-display);font-variant-numeric:lining-nums}
.pg-link{min-height:44px;padding:6px 0;border:0;background:none;color:var(--pg-line);font:16px var(--pg-body);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.pg-error{margin:0;color:#9b2c2c}
.pg-done{display:grid;justify-items:center;gap:6px}
.pg-done .pg-btn{margin-top:14px}

/* closing */
.pg-foot{display:grid;justify-items:center;gap:8px;padding:clamp(88px,11cqw,140px) 16px clamp(40px,5cqw,60px);text-align:center}
.pg-foot__line{margin:10px 0 14px;font-family:var(--pg-display);font-style:italic;font-size:clamp(25px,2.8cqw,32px)}
.pg-foot__line .pg-zh{color:var(--pg-line);letter-spacing:.12em}
.pg-foot__plate{position:relative;display:grid;place-items:center;width:clamp(150px,18cqw,190px);aspect-ratio:1}
.pg-foot__plate .pg-plate{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 12px 14px color-mix(in srgb,var(--pg-line) 12%,transparent))}
.pg-mono{position:relative;margin:0;font-family:var(--pg-display);font-style:italic;font-weight:500;font-size:clamp(28px,3.2cqw,36px);color:var(--pg-line);white-space:nowrap}
.pg-credit{margin:22px 0 0;font-size:14px;opacity:.75}

/* ---- the opening: the peony draws itself in, then its washes bloom; the words follow ---- */
.pg-draw .pg-branch path{stroke-dasharray:1 1;stroke-dashoffset:1;animation:pg-stroke var(--sl,1.8s) cubic-bezier(.45,0,.25,1) calc(var(--sd,.3s) + var(--bd,0s)) forwards}
.pg-draw .pg-branch .pg-stem{--sd:.15s;--sl:2s}
.pg-draw .pg-branch .pg-leaf{--sd:.9s}
.pg-draw .pg-branch .pg-petal{--sd:1.3s}
.pg-draw .pg-branch .pg-fine{--sd:1.7s;--sl:1.2s}
.pg-draw .pg-branch .pg-leaf,.pg-draw .pg-branch .pg-petal{fill-opacity:0;animation:pg-stroke var(--sl,1.8s) cubic-bezier(.45,0,.25,1) calc(var(--sd) + var(--bd,0s)) forwards,pg-fill 1.6s ease calc(var(--sd) + var(--bd,0s) + 1.3s) forwards}
.pg-draw .pg-branch .pg-dot{opacity:0;animation:pg-fade .8s ease calc(2.6s + var(--bd,0s)) forwards}
.pg-draw .pg-hero__words>*{animation:pg-rise 1.3s cubic-bezier(.2,.7,.2,1) both}
.pg-draw .pg-hero__words>:nth-child(1){animation-delay:.2s}
.pg-draw .pg-hero__words>:nth-child(2){animation-delay:.4s}
.pg-draw .pg-hero__words>:nth-child(3){animation-delay:.55s}
.pg-draw .pg-hero__words>:nth-child(n+4){animation-delay:1.1s}
@keyframes pg-stroke{to{stroke-dashoffset:0}}
@keyframes pg-fill{to{fill-opacity:1}}
@keyframes pg-fade{to{opacity:1}}
@keyframes pg-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

/* scroll reveals (only where useReveal turns them on) */
.pg-root [data-reveal]{opacity:1;transform:none;transition:none;will-change:auto}
.rv-on [data-reveal]{opacity:0;transform:translateY(16px);transition:opacity 1.1s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .14s),transform 1.1s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .14s)}
.rv-on [data-reveal].is-in{opacity:1;transform:none}

/* Always a little alive (.pg-alive): slow, quiet, and only on the published page / preview.
   Individual transform properties (rotate/translate) so they add to each piece's own transform. */
.pg-alive .pg-branch{animation:pg-sway 9s ease-in-out infinite}
.pg-alive .pg-branch--tl{animation-delay:-2s}
.pg-alive .pg-branch--br{animation-duration:11s}
.pg-alive.pg-draw .pg-branch{animation-delay:3s}
@keyframes pg-sway{0%,100%{rotate:0deg}50%{rotate:1.2deg}}
.pg-alive .pg-plate-wrap .pg-plate{animation:pg-turn 120s linear infinite}
@keyframes pg-turn{to{rotate:360deg}}
.pg-alive .pg-bob{transform-box:fill-box;transform-origin:50% 100%;animation:pg-bob 4.6s ease-in-out infinite}
.pg-alive .pg-bob--2{animation-duration:5.2s;animation-delay:-1.4s}
@keyframes pg-bob{0%,100%{translate:0 0;rotate:0deg}50%{translate:0 2.5px;rotate:-1.2deg}}
.pg-alive .pg-ripple{animation:pg-ripple 6s ease-in-out infinite}
.pg-alive .pg-ripple--2{animation-duration:7.5s;animation-direction:alternate-reverse}
@keyframes pg-ripple{0%,100%{translate:0 0}50%{translate:6px 0}}
.pg-petals{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.pg-fall{position:absolute;top:-6%;width:calc(clamp(10px,1.6cqw,18px) * var(--ps,1));animation:pg-fall linear infinite;opacity:0}
.pg-fall__petal{display:block;width:100%;height:auto;animation:pg-flutter 3.2s ease-in-out infinite}
.pg-fall__petal path{fill:color-mix(in srgb,var(--pg-peony,#e4a3a3) 70%,transparent);stroke:var(--pg-line);stroke-width:.6}
@keyframes pg-fall{0%{top:-6%;translate:0 0;opacity:0}8%{opacity:.85}50%{translate:-28px 0}92%{opacity:.85}100%{top:104%;translate:18px 0;opacity:0}}
@keyframes pg-flutter{0%,100%{rotate:-25deg;scale:1 1}50%{rotate:35deg;scale:.75 1}}
@media (prefers-reduced-motion:reduce){.pg-root *,.pg-root *::before,.pg-root *::after{animation:none!important;transition:none!important}}
`;
