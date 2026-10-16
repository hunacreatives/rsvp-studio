// Promenade's stylesheet (the shared envelope/seal bring STATIONERY_CSS).
// .pm-motion gates all motion; .pm-opening plays the seal + flap opening.

export const PROMENADE_CSS = `
.pm-root{position:relative;container-type:inline-size;overflow-x:clip;min-height:100%;background:var(--pm-cream);color:var(--pm-ink);font-family:var(--pm-sans);-webkit-font-smoothing:antialiased;}
.pm-root *{box-sizing:border-box;}
.pm-root p,.pm-root li,.pm-root h1,.pm-root h2{text-wrap:pretty;}
.pm-script{font-family:var(--pm-script);font-weight:400;line-height:1.1;margin:0;}
.pm-hint{opacity:.5;font-style:italic;font-size:14px;margin:6px 0;}
.pm-coming{border:1px dashed color-mix(in srgb,var(--pm-gold) 60%,transparent);border-radius:10px;padding:10px 14px;display:inline-block;}

/* ---------- The envelope (opening) ---------- */
.pm-intro{position:relative;height:100svh;min-height:560px;overflow:hidden;background:#f2ede3;cursor:pointer;perspective:1600px;}
.pm-intro__env{position:absolute;inset:0;}
.pm-intro__flap{transform-origin:50% 0;z-index:3;}
.pm-intro__pocket{z-index:2;}
.pm-intro__paper{position:absolute;inset:0;z-index:4;pointer-events:none;background-image:var(--emboss);background-size:300px 300px;mix-blend-mode:multiply;opacity:.75;}
.pm-intro__seal{position:absolute;left:50%;top:55.5%;z-index:5;width:clamp(120px,30cqw,190px);padding:0;border:none;background:none;transform:translate(-50%,-50%);cursor:pointer;}
.pm-seal-photo{position:relative;display:block;}
.pm-seal-photo img{display:block;width:100%;height:auto;}
.pm-seal-photo span{position:absolute;inset:0;display:grid;place-items:center;font-family:Cinzel,Georgia,serif;font-weight:600;font-size:clamp(16px,4.4cqw,26px);color:#8a6422;text-shadow:-1px -1px 0 rgba(255,240,200,.7),1px 1px 1px rgba(60,40,10,.6);}
.pm-skip{position:absolute;left:50%;bottom:max(28px,5svh);z-index:5;min-height:40px;padding:0 20px;border:1px solid rgba(75,64,54,.35);border-radius:999px;background:rgba(255,255,255,.55);backdrop-filter:blur(4px);transform:translateX(-50%);font-family:var(--pm-sans);font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#6d6156;cursor:pointer;}

/* ---------- The hero ---------- */
.pm-hero{position:relative;display:grid;place-items:center;min-height:100svh;overflow:hidden;background:#3f3a33;color:#fff;text-align:center;}
.pm-hero__img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.pm-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(30,25,20,.25) 0%,rgba(30,25,20,.42) 45%,rgba(30,25,20,.55) 100%);pointer-events:none;}
.pm-hero--plain{background:linear-gradient(180deg,#f6e6df 0%,#f8efe4 55%,#eef0e4 100%);color:var(--pm-ink);}
.pm-hero--plain::after{display:none;}
.pm-hero--plain .pm-hero__text{align-self:start;margin-top:22svh;}
.pm-hero--plain .pm-hero__arrow{display:none;}
.pm-hero__text{position:relative;z-index:1;padding:0 22px;max-width:760px;}
.pm-hero__kicker{margin:0 0 14px;font-size:clamp(12px,2.8cqw,15px);font-weight:500;letter-spacing:.3em;text-transform:uppercase;}
.pm-hero__names{margin:0;font-family:var(--pm-serif);font-weight:500;font-size:clamp(46px,12cqw,96px);line-height:1.05;letter-spacing:-.005em;}
.pm-hero__line{margin:16px 0 0;font-size:clamp(15px,3.4cqw,19px);opacity:.95;}
.pm-hero__date{margin:10px 0 0;font-size:clamp(12px,2.8cqw,14px);letter-spacing:.2em;text-transform:uppercase;opacity:.9;}
.pm-hero__arrow{display:block;margin-top:clamp(40px,10svh,80px);font-size:26px;opacity:.85;}

/* ---------- Sections ---------- */
.pm-sec{position:relative;padding:clamp(56px,10cqw,96px) 20px;text-align:center;}
.pm-sec--white{background:#fffdf9;}
.pm-sec__in{width:min(100%,560px);margin:0 auto;}
.pm-sec__title{margin:0 0 10px;font-size:clamp(42px,9.6cqw,62px);color:var(--pm-ink);}
.pm-sec__sub{margin:0 0 20px;font-size:15px;color:color-mix(in srgb,var(--pm-ink) 75%,transparent);}
.pm-text{margin:.4em auto;max-width:32em;font-size:clamp(15px,3.3cqw,17px);line-height:1.7;color:color-mix(in srgb,var(--pm-ink) 88%,transparent);}
.pm-text--left{text-align:left;margin-left:0;}
.pm-text--small{font-size:14px;margin:2px 0;}
.pm-text--soft{opacity:.75;font-style:italic;}
.pm-painting{display:block;height:auto;}
.pm-dress{display:block;width:min(92%,440px);height:auto;margin:0 auto 18px;}

.pm-count{display:flex;justify-content:center;align-items:flex-start;gap:clamp(8px,2.6cqw,18px);margin:22px 0 4px;font-variant-numeric:tabular-nums;}
.pm-count__cell{display:grid;justify-items:center;min-width:3ch;}
.pm-count__n{font-family:var(--pm-script);font-size:clamp(40px,9cqw,56px);line-height:1;color:var(--pm-gold);}
.pm-count__l{margin-top:6px;font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;opacity:.75;}
.pm-count__sep{display:none;}

.pm-story{list-style:none;margin:10px auto 0;padding:0 0 0 26px;max-width:480px;text-align:left;border-left:1.5px solid color-mix(in srgb,var(--pm-gold) 70%,transparent);}
.pm-story li{position:relative;padding:0 0 26px 6px;}
.pm-story__dot{position:absolute;left:-34px;top:4px;width:14px;height:14px;border-radius:50%;background:var(--pm-gold);box-shadow:0 0 0 4px var(--pm-cream);}
.pm-story__year{margin:0;font-size:12px;font-weight:600;letter-spacing:.18em;color:var(--pm-gold);}
.pm-story__title{font-size:clamp(26px,5.4cqw,32px);margin:2px 0 4px;}

.pm-carousel{position:relative;}
.pm-carousel__track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border-radius:6px;}
.pm-carousel__track::-webkit-scrollbar{display:none;}
.pm-carousel__slide{flex:0 0 100%;scroll-snap-align:center;aspect-ratio:4/5;}
.pm-carousel__slide img{width:100%;height:100%;object-fit:cover;display:block;}
.pm-carousel__dots{display:flex;justify-content:center;gap:6px;margin-top:12px;}
.pm-carousel__dots button{width:8px;height:8px;padding:0;border:none;border-radius:999px;background:color-mix(in srgb,var(--pm-ink) 25%,transparent);cursor:pointer;transition:width .25s;}
.pm-carousel__dots button.is-on{width:22px;background:var(--pm-ink);}

.pm-program{list-style:none;margin:6px auto 0;padding:0;max-width:440px;text-align:left;position:relative;}
.pm-program::before{content:"";position:absolute;left:6px;top:8px;bottom:8px;width:1.5px;background:color-mix(in srgb,var(--pm-gold) 50%,transparent);}
.pm-program li{position:relative;display:grid;grid-template-columns:22px 86px 1fr;align-items:baseline;gap:8px;padding:11px 0;}
.pm-program__dot{width:13px;height:13px;border-radius:50%;background:#fffdf9;border:1.5px solid color-mix(in srgb,var(--pm-gold) 70%,transparent);align-self:center;}
.pm-program li.is-first .pm-program__dot{background:var(--pm-gold);border-color:var(--pm-gold);}
.pm-program__time{font-size:13px;font-weight:600;letter-spacing:.06em;color:var(--pm-gold);}
.pm-program__what{font-size:16px;}
.pm-program__what em{display:block;font-size:14px;opacity:.7;}

.pm-swatches{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;margin-top:18px;}
.pm-swatches span{display:grid;justify-items:center;gap:6px;}
.pm-swatches i{width:52px;height:52px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.08),0 6px 12px -8px rgba(0,0,0,.4);}
.pm-swatches b{font-size:10px;font-weight:500;letter-spacing:.06em;opacity:.7;}
.pm-venue__name{margin:0;font-family:var(--pm-serif);font-size:clamp(22px,5cqw,28px);}
.pm-stays{display:grid;gap:12px;margin-top:16px;text-align:left;}
.pm-stay{padding:16px 18px;border-radius:12px;background:#fffdf9;border:1px solid color-mix(in srgb,var(--pm-gold) 30%,transparent);}
.pm-stay__name{margin:0 0 2px;font-weight:600;}
.pm-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:6px 0 12px;}
.pm-faqs{text-align:left;}
.pm-faqs details{border-bottom:1px solid color-mix(in srgb,var(--pm-gold) 50%,transparent);}
.pm-faqs summary{display:flex;justify-content:space-between;gap:12px;padding:16px 2px;font-size:16px;cursor:pointer;list-style:none;}
.pm-faqs summary::-webkit-details-marker{display:none;}
.pm-faqs summary::after{content:"+";color:var(--pm-gold);font-size:20px;line-height:1;}
.pm-faqs details[open] summary::after{content:"–";}
.pm-faqs details p{margin:0 0 16px;}

/* RSVP */
.pm-form{display:grid;gap:16px;max-width:440px;margin:10px auto 0;text-align:left;}
.pm-label{display:block;margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;opacity:.8;}
.pm-pills{display:flex;flex-wrap:wrap;gap:8px;}
.pm-pill{min-height:44px;padding:0 22px;border:1px solid color-mix(in srgb,var(--pm-gold) 80%,transparent);border-radius:999px;background:#fffdf9;font-family:var(--pm-sans);font-size:14px;color:var(--pm-ink);cursor:pointer;transition:background .2s,color .2s;}
.pm-pill--n{width:44px;padding:0;}
.pm-pill.is-picked{background:var(--pm-ink);border-color:var(--pm-ink);color:#fff;}
.pm-field{display:block;width:100%;min-height:50px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--pm-gold) 55%,transparent);border-radius:10px;background:#fffdf9;font:inherit;font-size:16px;color:var(--pm-ink);}
.pm-field:focus{outline:none;border-color:var(--pm-ink);}
textarea.pm-field{resize:vertical;min-height:96px;}
.pm-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 28px;border:none;border-radius:999px;background:var(--pm-ink);color:#fff;font-family:var(--pm-sans);font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;cursor:pointer;}
.pm-btn--line{background:transparent;color:var(--pm-ink);border:1px solid var(--pm-ink);}
.pm-btn--wide{width:100%;}
.pm-btn:disabled{opacity:.6;cursor:default;}
.pm-link{display:inline-flex;align-items:center;min-height:40px;padding:0;border:none;background:none;font:inherit;font-size:14px;color:inherit;opacity:.8;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}
.pm-error{margin:0;color:#9b1c1c;font-size:14px;}
.pm-thanks{position:relative;display:grid;justify-items:center;gap:6px;}
.pm-thanks__big{margin:0;font-family:var(--pm-serif);font-size:clamp(30px,7cqw,40px);}
.pm-confetti{position:absolute;left:50%;top:0;pointer-events:none;z-index:5;}
.pm-confetti span{position:absolute;left:0;top:0;border-radius:1px;animation:pm-fall 2.4s cubic-bezier(.3,.1,.5,1) both;}

.pm-footer{background:#fffdf9;border-top:1px solid color-mix(in srgb,var(--pm-gold) 30%,transparent);text-align:center;padding:22px 16px;font-size:13px;}
.pm-footer p{margin:0;}

/* ---------- Illustrations (line art until the watercolours arrive) ---------- */
.pm-art{position:relative;width:fit-content;max-width:100%;margin:0 auto 18px;}
.pm-art--clock .pm-line,.pm-art--clock .pm-painting{width:min(60vw,240px);}
.pm-art--garland .pm-line,.pm-art--garland .pm-painting{width:min(92vw,520px);}
.pm-art--venue .pm-line,.pm-art--venue .pm-painting{width:min(66vw,280px);}
.pm-art--stay .pm-line,.pm-art--stay .pm-painting{width:min(50vw,200px);}
.pm-line{display:block;height:auto;overflow:visible;}
.pm-hero__art{position:absolute;inset:0;width:100%;height:100%;}

/* ---------- The designers' brief (?brief=1): numbered pins with pop-up bubbles ---------- */
.pm-pin{position:absolute;right:-6px;top:-6px;z-index:8;}
.pm-pin__dot{display:grid;place-items:center;width:30px;height:30px;padding:0;border:2px solid #fff;border-radius:50%;background:var(--pm-gold);color:#fff;font-family:var(--pm-sans);font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px -4px rgba(60,40,10,.55);animation:pm-pulse 2.2s ease-out infinite;}
.pm-pin.is-open .pm-pin__dot{animation:none;background:var(--pm-ink);}
.pm-pin__bubble{position:absolute;right:0;top:38px;display:grid;gap:6px;width:min(300px,78vw);padding:14px 16px 16px;border-radius:14px;background:#fff;color:var(--pm-ink);text-align:left;font-family:var(--pm-sans);font-size:13px;line-height:1.5;box-shadow:0 18px 40px -16px rgba(40,30,20,.45),0 0 0 1px rgba(194,160,106,.35);}
.pm-pin__bubble::before{content:"";position:absolute;right:10px;top:-6px;width:12px;height:12px;background:#fff;transform:rotate(45deg);box-shadow:-1px -1px 0 rgba(194,160,106,.35);}
.pm-pin__file{justify-self:start;padding:2px 9px;border-radius:999px;background:var(--pm-ink);color:#fff;font-size:11px;font-weight:600;letter-spacing:.04em;}
.pm-pin__bubble strong{font-size:15px;}
.pm-pin__size{color:var(--pm-gold);font-weight:600;font-size:12px;}
.pm-pin__notes{display:grid;gap:4px;}
.pm-pin__notes span::before{content:"· ";color:var(--pm-gold);font-weight:700;}
.pm-pin__swatches{display:flex;gap:5px;margin-top:2px;}
.pm-pin__swatches i{width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.12);}
.pm-dock{position:sticky;bottom:14px;z-index:20;display:flex;flex-direction:column;align-items:flex-end;gap:10px;width:min(calc(100% - 28px),560px);margin:-60px auto 0;pointer-events:none;}
.pm-dock__btn{pointer-events:auto;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:none;border-radius:999px;background:var(--pm-ink);color:#fff;font-family:var(--pm-sans);font-size:13px;font-weight:600;letter-spacing:.04em;cursor:pointer;box-shadow:0 12px 26px -10px rgba(40,30,20,.6);}
.pm-dock__dot{width:9px;height:9px;border-radius:50%;background:var(--pm-gold);box-shadow:0 0 0 3px rgba(194,160,106,.35);}
.pm-dock__panel{pointer-events:auto;position:relative;width:100%;max-height:70svh;overflow:auto;padding:20px 20px 18px;border-radius:16px;background:#fff;text-align:left;font-size:14px;line-height:1.55;box-shadow:0 24px 50px -18px rgba(40,30,20,.5),0 0 0 1px rgba(194,160,106,.35);}
.pm-dock__panel p{margin:6px 0;}
.pm-dock__kicker{margin:0!important;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--pm-gold);}
.pm-dock__title{margin:2px 0 8px!important;font-family:var(--pm-serif);font-size:22px;}
.pm-dock__close{position:absolute;right:10px;top:8px;width:36px;height:36px;border:none;background:none;font-size:22px;color:var(--pm-ink);cursor:pointer;}
.pm-dock__palette{display:flex;flex-wrap:wrap;gap:6px 14px;margin:6px 0 8px;}
.pm-dock__palette span{display:inline-flex;align-items:center;gap:7px;font-size:13px;}
.pm-dock__palette i{width:18px;height:18px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.12);}
.pm-dock__palette b{font-weight:500;opacity:.55;font-size:12px;}
@keyframes pm-pulse{0%{box-shadow:0 4px 12px -4px rgba(60,40,10,.55),0 0 0 0 rgba(194,160,106,.6)}70%{box-shadow:0 4px 12px -4px rgba(60,40,10,.55),0 0 0 12px rgba(194,160,106,0)}100%{box-shadow:0 4px 12px -4px rgba(60,40,10,.55),0 0 0 0 rgba(194,160,106,0)}}

/* ---------- Motion ---------- */
.pm-motion .pm-sec{opacity:0;transform:translateY(22px);transition:opacity .8s ease,transform .9s cubic-bezier(.2,.8,.2,1);}
.pm-motion .pm-sec.is-on{opacity:1;transform:none;}
.pm-motion .pm-site{animation:pm-fade .8s ease both;}
.pm-motion .pm-hero__arrow{animation:pm-bob 2s ease-in-out infinite;}
.pm-motion .pm-intro__seal{animation:pm-breathe 2.4s ease-in-out infinite;}
.pm-opening .pm-intro__seal{animation:pm-seal-off .6s cubic-bezier(.5,0,.7,.4) both;}
.pm-opening .pm-intro__flap{animation:pm-flap 1s cubic-bezier(.45,0,.3,1) .35s both;}
.pm-opening .pm-skip{opacity:0;transition:opacity .3s;}
.pm-opening .pm-intro{animation:pm-out .5s ease 1.2s both;}

@keyframes pm-breathe{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.04)}}
@keyframes pm-seal-off{30%{transform:translate(-50%,-50%) scale(1.12) rotate(-6deg)}100%{opacity:0;transform:translate(-50%,-50%) scale(.8) rotate(8deg)}}
@keyframes pm-flap{0%{transform:rotateX(0);z-index:3}48%{z-index:3}52%{z-index:1}100%{transform:rotateX(180deg);z-index:1;opacity:.4}}
@keyframes pm-out{to{opacity:0;transform:scale(1.04)}}
@keyframes pm-fade{from{opacity:0}to{opacity:1}}
@keyframes pm-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
@keyframes pm-fall{0%{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:1}100%{transform:translate(var(--x),var(--y)) rotate(var(--r));opacity:0}}
`;
