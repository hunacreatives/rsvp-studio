// Rice Paper's styles. Sizes follow the page's own width (container units), so the builder's
// phone preview, the gallery card and a real phone lay out alike. The only motion is the seal
// pressing (.rp-play → .rp-stamp) and the thread drawing (Thread.tsx), plus quiet reveals.

export const RICE_CSS = `
.rp-root{container-type:inline-size;position:relative;overflow-x:clip;color:var(--rp-ink);font-family:var(--rp-body);font-optical-sizing:auto;
  background-color:var(--rp-bg);background-image:var(--rp-fibres);background-size:420px 420px;
  --rp-red:#c8372d;--rp-gold:#b8975a;--rp-blush:#eed8cf;
  --rp-soft:color-mix(in srgb,var(--rp-muted) 68%,var(--rp-ink));
  --rp-line:color-mix(in srgb,var(--rp-ink) 14%,transparent);
  --rp-card:color-mix(in srgb,#fff 58%,var(--rp-bg))}
.rp-root::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:var(--rp-grain);background-size:280px 280px;mix-blend-mode:multiply;opacity:.32}
.rp-root *,.rp-root *::before,.rp-root *::after{box-sizing:border-box}
.rp-root a{color:inherit}
.rp-zh,.rp-root [lang="zh-Hant"]{font-family:var(--rp-zh);font-style:normal;font-synthesis:none;letter-spacing:.02em}

.rp-page{position:relative;z-index:1;--pad:16px;--gut:50px;--spine:31cqw;--inset:clamp(6px,3.4cqw,56px);--space:clamp(96px,13cqw,176px)}
@container (min-width:700px){.rp-page{--pad:max(40px,calc((100cqw - 1120px) / 2));--gut:clamp(120px,16cqw,210px);--spine:var(--gut)}}
.rp-hero,.rp-main,.rp-close{position:relative;z-index:1}

/* ---- the red thread ---- */
.rp-thread{position:absolute;left:0;top:0;z-index:0;pointer-events:none;overflow:visible}
.rp-thread path{fill:none;stroke:var(--rp-red);stroke-opacity:.82;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}
.rp-thread.is-drawing path{opacity:0}

/* ---- the cover ---- */
.rp-hero{display:grid;grid-template-columns:var(--spine) minmax(0,1fr);column-gap:clamp(10px,4cqw,64px);row-gap:44px;align-items:start;padding:clamp(56px,10cqw,140px) var(--pad) 0}
.rp-spine{grid-row:1;display:grid;justify-items:center;gap:clamp(26px,3.4cqw,44px)}
.rp-hero__words{grid-column:2;grid-row:1;min-width:0;padding-top:clamp(2px,1.2cqw,18px)}
.rp-hero__more{grid-column:1 / -1;grid-row:2;padding-left:calc(var(--gut) + var(--inset))}
@container (min-width:700px){.rp-spine{grid-row:1 / span 2}.rp-hero__more{grid-column:2;padding-left:0}.rp-hero{row-gap:clamp(40px,4cqw,56px)}}

.rp-hero__zh{margin:0;writing-mode:vertical-rl;text-orientation:upright;font-weight:400;font-size:17cqw;line-height:1;letter-spacing:.08em;color:var(--rp-ink)}
@container (min-width:700px){.rp-hero__zh{font-size:clamp(84px,9.6cqw,136px)}}

.rp-seal{position:relative;display:block;width:22cqw;aspect-ratio:1}
@container (min-width:700px){.rp-seal{width:clamp(96px,9.4cqw,128px)}}
.rp-seal svg{position:absolute;inset:0;display:block;width:100%;height:100%;overflow:visible}
.rp-seal__bleed{opacity:.16;transform:scale(1.022);filter:blur(2.2px)}
.rp-seal__shadow{position:absolute;inset:4%;border-radius:5%;background:rgba(31,27,24,.6);opacity:0}

.rp-eyebrow{margin:0 0 clamp(14px,2cqw,22px);font-style:italic;font-size:clamp(16px,1.6cqw,19px);line-height:1.4;color:var(--rp-soft)}
.rp-couple{display:grid;justify-items:start}
.rp-names{display:contents}
.rp-host{display:block;margin:0;font-family:var(--rp-display);font-weight:400;font-size:8.4cqw;line-height:1.1;letter-spacing:-.012em;text-wrap:balance}
@container (min-width:700px){.rp-host{font-size:clamp(46px,6cqw,82px);line-height:1.06}}
.rp-host--0{grid-row:1}.rp-name-zh--0{grid-row:2}.rp-host--1{grid-row:3}.rp-name-zh--1{grid-row:4}
.rp-name{display:inline}
.rp-amp{display:block;margin:clamp(16px,2.2cqw,28px) 0 clamp(6px,1cqw,12px);font-style:italic;font-size:.52em;line-height:1;color:var(--rp-gold)}
.rp-name-zh{margin:clamp(8px,.9cqw,12px) 0 0;font-size:clamp(17px,4.6cqw,20px);line-height:1.2;letter-spacing:.16em;color:var(--rp-soft);white-space:nowrap}
@container (min-width:700px){.rp-name-zh{font-size:clamp(20px,1.9cqw,26px)}}
.rp-hint{opacity:.5}

.rp-date{margin:0;font-size:clamp(17px,1.7cqw,20px);line-height:1.5}
.rp-lunar{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:8px 0 0;font-size:clamp(17px,1.7cqw,20px);color:var(--rp-soft)}
.rp-lunar .rp-zh{letter-spacing:.1em;white-space:nowrap}
.rp-lunar__tag{font-size:.76em;color:var(--rp-red)}
.rp-count{display:flex;gap:clamp(18px,3cqw,34px);margin:clamp(28px,3.2cqw,38px) 0 0}
.rp-count__cell{display:grid;gap:6px}
.rp-count__n{font-family:var(--rp-display);font-size:clamp(24px,2.6cqw,32px);line-height:1;font-variant-numeric:lining-nums tabular-nums}
.rp-count__l{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--rp-soft)}
.rp-count__sep{display:none}
.rp-hero__more .rp-btn{margin-top:clamp(30px,3.4cqw,42px)}

/* the press: the stone's shadow comes down, the ink lands and spreads a little, the stone lifts */
.rp-play .rp-seal__ink,.rp-play .rp-seal__bleed,.rp-play .rp-rise{opacity:0}
.rp-stamp .rp-seal__shadow{animation:rp-stone 1.55s cubic-bezier(.45,0,.2,1) .25s both}
.rp-stamp .rp-seal__ink{animation:rp-press 1.3s cubic-bezier(.25,.7,.2,1) 1.02s both}
.rp-stamp .rp-seal__bleed{animation:rp-bleed 2.2s cubic-bezier(.2,.6,.2,1) 1.06s both}
.rp-stamp .rp-rise{animation:rp-rise 1.5s cubic-bezier(.2,.7,.2,1) var(--d,1.6s) both}
.rp-stamp .rp-hero__zh{animation:rp-ink-in 1.6s ease var(--d,0s) both}
@keyframes rp-stone{0%{opacity:0;transform:translate(8%,-18%) scale(1.5);filter:blur(20px)}50%{opacity:.2;transform:translate(.5%,-1%) scale(1.05);filter:blur(7px)}56%{opacity:.16;transform:scale(1.02);filter:blur(6px)}100%{opacity:0;transform:translate(5%,-14%) scale(1.42);filter:blur(24px)}}
@keyframes rp-press{0%{opacity:0;transform:scale(1.035);filter:blur(1.4px)}14%{opacity:.96;transform:scale(.992);filter:blur(.4px)}100%{opacity:1;transform:none;filter:none}}
@keyframes rp-bleed{0%{opacity:0;transform:scale(.985);filter:blur(.8px)}16%{opacity:.42;transform:scale(1);filter:blur(1px)}100%{opacity:.16;transform:scale(1.022);filter:blur(2.2px)}}
@keyframes rp-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes rp-ink-in{from{opacity:0;filter:blur(3px)}to{opacity:1;filter:none}}

/* ---- sections: the label in the margin, the words beside it ---- */
.rp-sec{display:grid;grid-template-columns:var(--gut) minmax(0,1fr);padding:var(--space) var(--pad) 0}
.rp-gut{display:flex;justify-content:center;align-items:flex-start}
.rp-knot{display:block;margin-top:.12em;writing-mode:vertical-rl;text-orientation:upright;font-size:clamp(14px,1.8cqw,22px);line-height:1;letter-spacing:.18em;white-space:nowrap;color:color-mix(in srgb,var(--rp-ink) 78%,transparent)}
.rp-body{min-width:0;max-width:calc(780px + var(--inset));padding-left:var(--inset)}
.rp-h{margin:0 0 clamp(26px,3.4cqw,44px);font-family:var(--rp-display);font-weight:400;font-size:clamp(30px,3.8cqw,46px);line-height:1.12;letter-spacing:-.01em;text-wrap:balance}
.rp-text{margin:0 0 14px;max-width:36em;font-size:clamp(17px,1.6cqw,19px);line-height:1.72;text-wrap:pretty}
.rp-text--lead{font-size:clamp(20px,2.2cqw,26px);line-height:1.55}
.rp-label{margin:0 0 8px;font-style:italic;font-size:clamp(15px,1.4cqw,17px);color:var(--rp-soft)}
.rp-small{margin:6px 0;font-size:14px;line-height:1.5;color:var(--rp-soft)}
.rp-add{margin-top:20px}
.rp-add--sm{min-height:32px;padding:4px 12px;margin-top:8px;font-size:.8em}

/* the invitation */
.rp-families{margin:0 0 clamp(26px,3.2cqw,40px);font-family:var(--rp-zh);font-size:clamp(30px,8.4cqw,40px);line-height:1.2;letter-spacing:.1em;white-space:nowrap}
@container (min-width:700px){.rp-families{font-size:clamp(44px,4.6cqw,62px)}}
.rp-parents{display:grid;gap:2px;margin:0 0 clamp(22px,2.6cqw,30px);font-size:clamp(18px,1.9cqw,22px);line-height:1.55}
.rp-parents p{margin:0}
.rp-parents__and{display:block;margin:4px 0;font-style:italic;font-size:.82em;color:var(--rp-soft)}
.rp-invite__line{margin:0 0 clamp(18px,2cqw,24px);max-width:21em;font-family:var(--rp-display);font-style:italic;font-size:clamp(21px,2.4cqw,30px);line-height:1.45;text-wrap:balance}
.rp-invite__names{margin:0 0 clamp(16px,2cqw,22px);font-family:var(--rp-display);font-size:clamp(20px,2.2cqw,26px);line-height:1.4;text-wrap:balance}
.rp-invite__when{margin:0;max-width:30em;font-size:clamp(16px,1.6cqw,18px);line-height:1.6;color:var(--rp-soft)}

/* where */
.rp-venues__grid{display:grid;gap:clamp(44px,6cqw,72px);max-width:760px}
@container (min-width:760px){.rp-venues__grid{grid-template-columns:1fr 1fr}.rp-venue--second{margin-top:clamp(56px,7cqw,104px)}}
.rp-venue{padding-top:22px;border-top:1px solid var(--rp-line)}
.rp-venue__name{margin:0 0 8px;font-family:var(--rp-display);font-weight:400;font-size:clamp(24px,2.6cqw,32px);line-height:1.2;text-wrap:balance}
.rp-venue__addr{margin:0 0 6px;max-width:28ch;font-size:16px;line-height:1.55;color:var(--rp-soft)}
.rp-venue__time{margin:0 0 4px;font-size:17px;line-height:1.5}
.rp-venue__map{display:inline-flex;align-items:center;min-height:44px;font:600 15px var(--rp-body);text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px}

/* the ceremony, hour by hour */
.rp-day__list{list-style:none;margin:0;padding:0;max-width:720px}
.rp-day__list li{display:grid;grid-template-columns:4.6em minmax(0,1fr) auto;column-gap:clamp(12px,2.6cqw,32px);align-items:baseline;padding:clamp(16px,2cqw,22px) 0;border-top:1px solid var(--rp-line)}
.rp-day__list li:last-child{border-bottom:1px solid var(--rp-line)}
@container (min-width:700px){.rp-day__list li{grid-template-columns:6em minmax(0,1fr) auto}}
.rp-day__t{font-size:15px;color:var(--rp-soft);font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.rp-day__w{font-size:clamp(18px,1.9cqw,21px);line-height:1.4}
.rp-day__zh{font-size:clamp(18px,2cqw,24px);line-height:1.2;letter-spacing:.14em;white-space:nowrap}
.rp-day__note{grid-column:2 / -1;margin-top:2px;font-size:15px;color:var(--rp-soft)}

/* elders and family */
.rp-elders__grid{display:grid;gap:clamp(28px,3.4cqw,40px) clamp(28px,4cqw,56px);max-width:720px}
@container (min-width:520px){.rp-elders__grid{grid-template-columns:1fr 1fr}}
.rp-elder ul{list-style:none;margin:0;padding:0;font-size:clamp(18px,1.9cqw,21px);line-height:1.6}

/* what to wear */
.rp-swatches{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.rp-swatches span{display:block;width:clamp(40px,4.4cqw,52px);aspect-ratio:1;border-radius:1px;background:var(--c);box-shadow:inset 0 0 0 1px rgba(31,27,24,.07)}

/* photos */
.rp-photos__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(8px,1.4cqw,16px);max-width:860px}
.rp-photo{position:relative;overflow:hidden;aspect-ratio:4/5;background:color-mix(in srgb,var(--rp-blush) 55%,var(--rp-bg))}
.rp-photo__img{position:absolute;inset:0}
.rp-photos__grid--1 .rp-photo,.rp-photos__grid--3 .rp-photo:first-child,.rp-photos__grid--5 .rp-photo:first-child{grid-column:1 / -1;aspect-ratio:3/2}
@container (min-width:760px){
  .rp-photos__grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .rp-photos__grid--2,.rp-photos__grid--4{grid-template-columns:repeat(2,minmax(0,1fr))}
  .rp-photos__grid--4 .rp-photo{aspect-ratio:3/2}
  .rp-photos__grid--3 .rp-photo:first-child{grid-column:auto;aspect-ratio:4/5}
  .rp-photos__grid--5 .rp-photo:first-child{grid-column:auto;grid-row:span 2;aspect-ratio:auto}
}
.rp-photo .photo-slot--empty{position:absolute;inset:0;display:grid;place-items:center;color:var(--rp-soft)}
.rp-root .photo-slot__label{display:grid;justify-items:center;gap:8px;padding:0 10px;font:600 13px/1.3 var(--rp-body);text-align:center}

/* ang pao and gifts */
.rp-links{display:flex;flex-wrap:wrap;gap:6px 24px;margin:6px 0}
.rp-link-out{display:inline-flex;align-items:center;min-height:44px;font-size:17px;text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px}
.rp-cash{margin-top:22px}
.rp-cash__inside>div{margin-top:10px!important}

/* good to know */
.rp-know__list{display:grid;gap:clamp(24px,3cqw,36px);max-width:720px}
.rp-q__q{margin:0 0 6px;font-family:var(--rp-display);font-size:clamp(19px,2cqw,22px);line-height:1.35}
.rp-q .rp-text{margin:0}

/* buttons */
.rp-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 30px;border:1px solid var(--rp-red);border-radius:1px;background:var(--rp-red);color:#fbf6ee;font:500 16px/1.1 var(--rp-body);letter-spacing:.05em;text-decoration:none;cursor:pointer;transition:background-color .3s,color .3s}
.rp-btn:hover{background:transparent;color:var(--rp-red)}
.rp-btn--line{background:transparent;color:var(--rp-red)}
.rp-btn--line:hover{background:var(--rp-red);color:#fbf6ee}
.rp-btn--block{width:100%}
.rp-btn:disabled{opacity:.55;cursor:not-allowed}
.rp-btn:focus-visible,.rp-choice__opt:focus-visible,.rp-step button:focus-visible,.rp-link:focus-visible{outline:2px solid var(--rp-red);outline-offset:3px}

/* the reply card, on a blush card beneath */
.rp-cards{position:relative;max-width:540px;margin-top:6px}
.rp-cards__under{position:absolute;inset:0;border-radius:1px;background:color-mix(in srgb,var(--rp-blush) 82%,var(--rp-bg));transform:rotate(-1.8deg) translate(-6px,12px)}
.rp-card{position:relative;padding:clamp(30px,4.6cqw,50px) clamp(22px,4.2cqw,46px);border-radius:1px;background:var(--rp-card);box-shadow:0 1px 2px rgba(31,27,24,.06),0 22px 40px -28px rgba(31,27,24,.35)}
.rp-card::before{content:"";position:absolute;inset:9px;pointer-events:none;border:1px solid color-mix(in srgb,var(--rp-gold) 70%,transparent)}
.rp-seats{margin:0 0 6px;font-family:var(--rp-display);font-style:italic;font-size:clamp(19px,2.1cqw,23px);line-height:1.4}
.rp-form{position:relative;display:grid;gap:20px;margin-top:20px}
.rp-form label,.rp-party__l{display:block;margin:0 0 4px;font-style:italic;font-size:15px;color:var(--rp-soft)}
.rp-field{width:100%;padding:10px 2px;border:0;border-bottom:1px solid color-mix(in srgb,var(--rp-ink) 30%,transparent);border-radius:0;background:transparent;color:var(--rp-ink);font:400 18px/1.4 var(--rp-body);outline:none}
.rp-field:focus{border-bottom-color:var(--rp-red)}
textarea.rp-field{padding:10px 12px;border:1px solid var(--rp-line);resize:vertical}
.rp-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rp-choice__opt{min-height:52px;padding:0 8px;border:1px solid color-mix(in srgb,var(--rp-ink) 24%,transparent);border-radius:1px;background:transparent;color:var(--rp-ink);font:400 17px/1.2 var(--rp-body);cursor:pointer;transition:border-color .25s,color .25s,box-shadow .25s}
.rp-choice__opt.is-picked{border-color:var(--rp-red);color:var(--rp-red);box-shadow:inset 0 0 0 1px var(--rp-red)}
.rp-party{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px}
.rp-step{display:inline-flex;align-items:center;border:1px solid var(--rp-line)}
.rp-step button{width:46px;height:46px;border:0;background:transparent;color:var(--rp-ink);font:400 22px/1 var(--rp-body);cursor:pointer}
.rp-step button:disabled{opacity:.28;cursor:default}
.rp-step output{min-width:2.4em;text-align:center;font:400 20px var(--rp-display);font-variant-numeric:lining-nums tabular-nums}
.rp-link{min-height:44px;padding:6px 0;border:0;background:none;color:var(--rp-soft);font:15px var(--rp-body);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.rp-error{margin:0;color:#9b2c2c}
.rp-done{display:grid;justify-items:start;gap:6px}
.rp-card__t{margin:0 0 4px;font-family:var(--rp-display);font-weight:400;font-size:clamp(26px,3cqw,34px);line-height:1.2}
.rp-done .rp-btn{margin-top:14px}

/* the close: the 囍 at the end of the thread */
.rp-close{display:grid;justify-items:center;padding:clamp(220px,24cqw,300px) 16px clamp(48px,6cqw,72px);text-align:center}
.rp-xi{display:block;width:clamp(64px,8cqw,92px);height:auto;overflow:visible;margin-bottom:clamp(28px,3.2cqw,40px)}
.rp-close__line{margin:0 0 12px;font-size:clamp(18px,1.9cqw,22px);line-height:1.5}
.rp-close__line .rp-zh{letter-spacing:.16em}
.rp-mono{margin:0;font-size:13px;letter-spacing:.32em;text-transform:uppercase;color:var(--rp-soft)}
.rp-credit{margin:32px 0 0;font-size:13px;color:var(--rp-soft)}

/* scroll reveals (only where useReveal turns them on) */
.rp-root [data-reveal]{opacity:1;transform:none;transition:none;will-change:auto}
.rv-on [data-reveal]{opacity:0;transform:translateY(14px);transition:opacity 1.3s cubic-bezier(.2,.7,.2,1),transform 1.3s cubic-bezier(.2,.7,.2,1)}
.rv-on [data-reveal].is-in{opacity:1;transform:none}

@media (prefers-reduced-motion:reduce){.rp-root *,.rp-root *::before,.rp-root *::after{animation:none!important;transition:none!important}}
`;
