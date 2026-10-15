// The Debut template's stylesheet. The envelope "stage" is its own container,
// so the card scales like a printed card (cqw = 1% of the envelope's width).
// Motion lives under .db-motion (off for prefers-reduced-motion); the envelope
// states are .db-env-sealed / .db-env-opening / .db-env-open.

export const DEBUT_CSS = `
.db-root{position:relative;container-type:inline-size;overflow-x:clip;min-height:100%;color:var(--db-wine);font-family:var(--db-serif);-webkit-font-smoothing:antialiased;
  --db-gold-lt:color-mix(in srgb,var(--db-gold) 62%,#fff);
  background:radial-gradient(120% 70% at 50% 25%,color-mix(in srgb,var(--db-wine) 94%,#fff) 0%,color-mix(in srgb,var(--db-wine) 88%,#000) 55%,color-mix(in srgb,var(--db-wine) 62%,#000) 100%);}
.db-root *{box-sizing:border-box;}
/* Velvet: a fine pile over the wine, with soft sheens like crushed velvet */
.db-velvet{position:absolute;inset:0;z-index:0;pointer-events:none;mix-blend-mode:soft-light;opacity:.75;background-size:240px 240px,1100px 1100px;}
.db-velvet::after{content:"";position:absolute;inset:0;background:radial-gradient(40% 30% at 18% 22%,rgba(255,180,200,.16),transparent 70%),radial-gradient(45% 35% at 82% 58%,rgba(255,170,190,.12),transparent 70%),radial-gradient(35% 25% at 40% 88%,rgba(255,190,210,.1),transparent 70%);}
.db-sky{position:sticky;top:0;height:100svh;margin-bottom:-100svh;overflow:hidden;pointer-events:none;z-index:1;}
.db-sky__petal{position:absolute;top:-8%;opacity:.32;filter:blur(1px);will-change:transform;}
.db-sky--still .db-sky__petal{opacity:.4;}
.db-intro,.db-inside{position:relative;z-index:2;}
.db-root p,.db-root li,.db-root h1,.db-root h2{text-wrap:pretty;}
.db-script{font-family:var(--db-script);font-weight:400;line-height:1.05;margin:0;color:var(--db-wine);}
.db-caps{font-family:var(--db-caps);font-weight:500;text-transform:uppercase;margin:0;color:var(--db-wine);}
.db-caps-sm{margin:0;font-family:var(--db-caps);font-size:clamp(11px,2.5cqw,15px);letter-spacing:.14em;text-transform:uppercase;color:var(--db-wine);}
.db-hint{opacity:.5;font-style:italic;}


/* Art */
.db-ofrule{display:flex;align-items:center;justify-content:center;gap:10px;margin:clamp(4px,1cqw,10px) auto;width:min(66%,300px);}
.db-ofrule__line{flex:1;height:1px;background:currentColor;opacity:.7;}
.db-ofrule__dot{width:4px;height:4px;border-radius:50%;background:currentColor;}
.db-ofrule__word{font-family:var(--db-caps);font-size:clamp(11px,2.3cqw,14px);letter-spacing:.2em;text-transform:uppercase;}

/* ---------- Page 1: the invitation in its envelope ---------- */
.db-intro{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:min(4svh,36px) 0 min(2svh,16px);}
.db-stage{position:relative;container-type:inline-size;width:min(100%,600px);perspective:1600px;clip-path:inset(-100vh -100vw 2px -100vw);}
.db-card-wrap{position:relative;z-index:1;width:90%;margin:0 auto;}
/* Room for the envelope below the card (in the stage's own cqw: a child of the stage). */
.db-stage__below{height:26cqw;}
.db-card .st-paper__body{padding:9cqw 8cqw 17cqw;}
.db-card__kicker{font-size:clamp(26px,6cqw,38px);margin-bottom:clamp(14px,3.4cqw,24px);}
.db-card__big{font-size:clamp(18px,4.6cqw,29px);font-weight:500;letter-spacing:.22em;line-height:1.15;margin:clamp(6px,1.4cqw,10px) 0 0;padding-left:.22em;}
.db-of{margin:clamp(10px,2.4cqw,16px) 0 clamp(2px,.6cqw,6px);font-family:var(--db-serif);font-style:italic;font-size:clamp(16px,3.4cqw,21px);}
.db-card__name{font-size:clamp(38px,10.4cqw,66px);line-height:1.12;margin:clamp(4px,1.2cqw,10px) 0 0;text-wrap:balance;}
.db-card__flourish{margin-top:clamp(8px,2cqw,14px);}
.db-details{display:grid;gap:clamp(10px,2.6cqw,18px);margin-top:clamp(8px,2cqw,14px);}
.db-detail p{margin:0;font-size:clamp(15px,3cqw,19px);line-height:1.4;}
.db-detail__label{display:flex!important;align-items:center;justify-content:center;gap:8px;margin-bottom:3px!important;font-family:var(--db-caps);font-size:clamp(11px,2.2cqw,14px)!important;letter-spacing:.2em;text-transform:uppercase;}
.db-detail__rule{display:block;width:44px;height:1px;margin:5px auto 6px;background:currentColor;opacity:.55;}
.db-detail__strong{font-weight:600;font-size:clamp(17px,3.4cqw,21px)!important;}
.db-card__close{margin-top:clamp(12px,3cqw,22px);}
.db-card__close p{margin:4px 0 0;font-style:italic;font-size:clamp(15px,3cqw,19px);}
.db-card__heart{display:flex;align-items:center;justify-content:center;gap:8px;font-size:11px;}
.db-card__heart i{display:block;width:40px;height:1px;background:currentColor;opacity:.6;}
/* The envelope: back panel (behind the card), front pocket, top flap, and the seal on top */
.db-env{position:absolute;left:0;right:0;bottom:-1px;height:calc(62cqw + 1px);pointer-events:none;}
.db-env--back{z-index:0;}
.db-pocket{z-index:2;}
.db-env--flap{z-index:3;display:none;transform-origin:50% 0;backface-visibility:visible;}
.db-env-sealed .db-env--flap,.db-env-opening .db-env--flap{display:block;}
.db-env--ui{z-index:4;}
.db-seal-btn{position:absolute;left:50%;top:55.5%;width:clamp(92px,22cqw,136px);padding:0;border:none;background:none;transform:translate(-50%,-50%);cursor:default;pointer-events:auto;}
.db-env-sealed .db-seal-btn{cursor:pointer;}
.db-tap{position:absolute;left:0;right:0;top:-17cqw;margin:0;text-align:center;font-family:var(--db-script);font-size:clamp(28px,7cqw,42px);color:var(--db-gold-lt);opacity:0;pointer-events:none;}
.db-env-sealed .db-tap{opacity:1;}
.db-pocket__go{position:absolute;left:50%;top:calc(55.5% + 13cqw);transform:translateX(-50%);pointer-events:auto;}
.db-env-sealed .db-pocket__go,.db-env-opening .db-pocket__go{opacity:0;pointer-events:none;}
.db-intro__credit{position:relative;z-index:3;margin:clamp(6px,1.4cqw,12px) 0 0;font-size:12px;color:var(--db-gold-lt);opacity:.85;text-align:center;}

/* Buttons */
.db-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 30px;border-radius:2px;font-family:var(--db-caps);font-size:13px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;white-space:nowrap;cursor:pointer;transition:background .2s,color .2s,transform .15s;}
.db-pocket__go{background:transparent;color:var(--db-gold-lt);border:1.5px solid var(--db-gold);}
.db-pocket__go:hover{background:color-mix(in srgb,var(--db-gold) 18%,transparent);}
.db-btn--solid{background:var(--db-wine);color:var(--db-ivory);border:1px solid var(--db-gold);}
.db-btn--solid:hover{background:var(--db-wine-3);}
.db-btn--solid:disabled{opacity:.6;cursor:default;}
.db-btn--line{background:transparent;color:var(--db-wine);border:1.5px solid var(--db-wine);}
.db-btn--wide{width:100%;min-height:56px;margin-top:6px;}
.db-link{display:inline-flex;align-items:center;min-height:40px;padding:0;border:none;background:none;font:inherit;font-size:15px;color:inherit;opacity:.8;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}

/* ---------- Page 2: the debut page ---------- */
.db-inside{position:relative;}
.db-topbar{display:flex;padding:clamp(10px,2.4cqw,22px) clamp(12px,3cqw,32px) 0;}
.db-back{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:1.5px solid var(--db-gold);border-radius:2px;background:transparent;font-family:var(--db-caps);font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--db-gold-lt);cursor:pointer;}
.db-back span{font-size:20px;line-height:1;margin-top:-2px;letter-spacing:0;}
.db-col{width:min(calc(100% - 28px),680px);margin:clamp(14px,3cqw,28px) auto 0;padding-bottom:clamp(48px,9cqw,90px);display:grid;gap:clamp(18px,3.4cqw,30px);}
/* The pieces on the table: not lined up like app cards — offset, overlapping a little */
.db-col>.db-sec:nth-of-type(odd){margin-left:-2%;margin-right:2%;}
.db-col>.db-sec:nth-of-type(even){margin-left:3%;margin-right:-1%;}
.db-col>.db-sec+.db-sec{margin-top:-10px;}
.db-pair{display:grid;grid-template-columns:1.25fr 1fr;gap:18px;align-items:start;}
.db-pair>.db-sec--dress{margin-top:36px;margin-left:-26px;}
.db-pair>:only-child{grid-column:1/-1;}
@container (max-width:620px){
  .db-pair{grid-template-columns:1fr;}
  .db-pair>.db-sec--dress{margin:-14px 6% 0 10%;}
}
.db-sec--small{width:78%;justify-self:end;}
.db-sec--dress .st-paper__body,.db-sec--small .st-paper__body{padding:clamp(30px,5cqw,40px) clamp(20px,4cqw,30px);}
.db-head{position:relative;margin-bottom:clamp(36px,6cqw,52px);}
.db-head .st-paper__body{padding-bottom:clamp(64px,11cqw,84px);}
.db-head__name{font-size:clamp(46px,10cqw,72px);margin-top:8px;}
.db-head__line{margin:0;font-size:clamp(16px,3.4cqw,20px);line-height:1.6;}
.db-head__seal{position:absolute;left:50%;bottom:clamp(-46px,-6cqw,-38px);width:clamp(84px,15cqw,110px);transform:translateX(-50%);}
.db-sec__icon{display:flex;justify-content:center;margin-bottom:4px;color:var(--db-gold);}
.db-sec__title{font-size:clamp(40px,8.6cqw,58px);}
.db-sec__flourish{width:min(62%,240px);}
.db-text{margin:.4em auto;max-width:30em;font-size:clamp(17px,3.5cqw,20px);line-height:1.6;}
.db-small{margin:6px 0 0;font-size:15px;font-style:italic;opacity:.8;}
.db-program{list-style:none;padding:0;margin:8px auto 0;max-width:440px;text-align:left;}
.db-program li{display:grid;grid-template-columns:90px 14px 1fr;gap:12px;align-items:baseline;padding:10px 0;border-bottom:1px solid color-mix(in srgb,var(--db-gold) 45%,transparent);}
.db-program li:last-child{border-bottom:none;}
.db-program .st-rosette{color:var(--db-gold);align-self:center;}
.db-program__time{font-family:var(--db-caps);font-size:13px;letter-spacing:.1em;}
.db-program__what{font-size:19px;line-height:1.35;}
.db-program__what em{display:block;font-size:16px;opacity:.75;}
.db-swatches{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;margin-top:16px;}
.db-swatch{width:58px;height:58px;border-radius:50%;box-shadow:0 0 0 3px var(--db-ivory),0 0 0 4px color-mix(in srgb,var(--db-gold) 70%,transparent),0 8px 14px -8px rgba(0,0,0,.45);}
.db-names{list-style:none;padding:0;margin:10px auto 0;max-width:420px;display:grid;gap:2px 28px;text-align:left;}
.db-names--two{grid-template-columns:1fr 1fr;max-width:520px;}
.db-names li{display:flex;align-items:baseline;gap:10px;padding:6px 0;font-size:clamp(16px,3.3cqw,19px);border-bottom:1px dotted color-mix(in srgb,var(--db-gold) 55%,transparent);}
.db-names__n{mix-blend-mode:multiply;flex:none;width:22px;font-family:var(--db-caps);font-size:12px;color:var(--db-gold);text-align:right;}
@container (max-width:520px){.db-names--two{grid-template-columns:1fr;}}
.db-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:6px 0 14px;}
.db-faqs{display:grid;gap:4px;}
.db-faqs__q{margin:14px 0 0;font-size:clamp(18px,3.6cqw,21px);font-weight:600;}

/* RSVP */
.db-rsvp{position:relative;}
.db-form{display:grid;gap:16px;max-width:440px;margin:16px auto 0;text-align:left;}
.db-form label{display:block;margin-bottom:6px;font-family:var(--db-caps);font-size:12px;letter-spacing:.14em;text-transform:uppercase;}
/* The reply card: printed writing lines and tick circles, filled in "ink" */
.db-reply .st-paper__body{padding:clamp(44px,7cqw,60px) clamp(28px,6cqw,56px);}
.db-reply .st-paper__sheet{outline:none;}
.db-reply::after{content:"";position:absolute;inset:12px;border:1px solid color-mix(in srgb,var(--db-gold) 70%,transparent);outline:1px solid color-mix(in srgb,var(--db-gold) 40%,transparent);outline-offset:-5px;pointer-events:none;}
.db-field{display:block;width:100%;min-height:46px;padding:8px 2px 4px;border:none;border-bottom:1px solid color-mix(in srgb,var(--db-wine) 45%,transparent);border-radius:0;background:transparent;font-family:var(--db-serif);font-style:italic;font-size:21px;color:var(--db-wine);}
.db-field::placeholder{color:color-mix(in srgb,var(--db-wine) 35%,transparent);}
.db-field:focus{outline:none;border-bottom-color:var(--db-wine);box-shadow:0 1px 0 var(--db-wine);}
select.db-field{appearance:auto;}
textarea.db-field{resize:vertical;min-height:84px;background-image:repeating-linear-gradient(transparent 0 33px,color-mix(in srgb,var(--db-wine) 30%,transparent) 33px 34px);line-height:34px;border-bottom:none;}
.db-choice{display:grid;gap:4px;}
.db-choice__opt{display:flex;align-items:center;gap:12px;min-height:48px;padding:4px 2px;border:none;background:none;font-family:var(--db-serif);font-style:italic;font-size:21px;color:var(--db-wine);text-align:left;cursor:pointer;}
.db-tick{flex:none;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--db-wine);position:relative;}
.db-choice__opt.is-picked .db-tick::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--db-wine);}
.db-count{display:flex;flex-wrap:wrap;gap:6px;}
.db-count__n{width:44px;height:44px;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--db-wine) 55%,transparent);background:transparent;font-family:var(--db-serif);font-style:italic;font-size:20px;color:var(--db-wine);cursor:pointer;}
.db-count__n.is-picked{background:var(--db-wine);color:var(--db-ivory);border-color:var(--db-wine);}
.db-error{margin:0;color:#a3122a;font-size:15px;}
.db-done{display:grid;justify-items:center;gap:4px;}
.db-petals{position:absolute;left:50%;top:0;z-index:5;pointer-events:none;}
.db-petals span{position:absolute;left:0;top:0;animation:db-fall 2.6s cubic-bezier(.3,.1,.5,1) both;}

.db-footer{background:var(--db-wine-3);color:var(--db-gold-lt);text-align:center;padding:22px 16px;font-size:14px;letter-spacing:.02em;}
.db-footer p{margin:0;}

/* ---------- Motion ---------- */
.db-motion.db-env-sealed .db-card-wrap{transform:translateY(100%);}
.db-motion.db-env-opening .db-card-wrap{transform:none;transition:transform 1.7s cubic-bezier(.2,.75,.25,1) 1s;}
.db-motion.db-env-opening .db-env--flap{animation:db-flap 1.1s cubic-bezier(.45,0,.3,1) .35s both;}
.db-motion.db-env-sealed .db-stage{transform:translateY(-32%) scale(1.1);transform-origin:50% 84%;}
.db-motion.db-env-opening .db-stage{transform-origin:50% 84%;transition:transform 1.6s cubic-bezier(.4,0,.2,1) .8s;}
.db-motion.db-env-opening .db-tap{opacity:0;transition:opacity .3s;}
.db-motion.db-env-sealed .db-seal-btn{animation:db-breathe 2.2s ease-in-out infinite;}
.db-motion.db-env-opening .db-seal-btn{animation:db-crack .7s cubic-bezier(.3,1.6,.5,1) both;}
.db-motion.db-env-sealed .db-rise{opacity:0;}
.db-motion.db-env-opening .db-rise{animation:db-rise .9s cubic-bezier(.2,.8,.2,1) calc(var(--d,1s) + .9s) both;}
.db-motion.db-env-opening .db-pocket__go{transition:opacity .6s ease 2.9s;}
.db-motion .db-sec{opacity:0;transform:translateY(26px);transition:opacity .8s ease,transform .9s cubic-bezier(.2,.8,.2,1);}
.db-motion .db-sec.is-on{opacity:1;transform:none;}
.db-motion .db-names li{opacity:0;transform:translateY(8px);transition:opacity .5s ease,transform .5s ease;transition-delay:calc(var(--i,0) * 55ms + .2s);}
.db-motion .db-sec.is-on .db-names li{opacity:1;transform:none;}
.db-motion .db-inside{animation:db-enter .7s cubic-bezier(.2,.8,.2,1) both;}
.db-turning .db-stage{animation:db-out .6s cubic-bezier(.6,0,.4,1) both;}

@keyframes db-breathe{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.05)}}
@keyframes db-crack{0%{transform:translate(-50%,-50%) scale(1) rotate(0)}40%{transform:translate(-50%,-50%) scale(1.16) rotate(-8deg)}100%{transform:translate(-50%,-50%) scale(1) rotate(0)}}
.db-motion .db-sky:not(.db-sky--still) .db-sky__petal{animation-name:db-petal;animation-timing-function:linear;animation-iteration-count:infinite;}
@keyframes db-petal{0%{transform:translate(0,-10svh) rotate(var(--r1)) rotateX(0)}25%{transform:translate(var(--sway),26svh) rotate(calc(var(--r1) + 60deg)) rotateX(55deg)}50%{transform:translate(0,56svh) rotate(calc(var(--r1) + 120deg)) rotateX(0)}75%{transform:translate(calc(var(--sway) * -1),86svh) rotate(calc(var(--r1) + 170deg)) rotateX(-50deg)}100%{transform:translate(0,130svh) rotate(var(--r2)) rotateX(0)}}
@keyframes db-flap{0%{transform:rotateX(0);z-index:3;opacity:1}48%{z-index:3}52%{z-index:0}75%{opacity:1}100%{transform:rotateX(180deg);z-index:0;opacity:0}}
@keyframes db-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes db-enter{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes db-out{to{opacity:0;transform:translateY(-4%) scale(.96)}}
@keyframes db-fall{0%{transform:translate(0,0) rotate(0) scale(.6);opacity:0}10%{opacity:1}100%{transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(1);opacity:0}}
`;
