// Love Letter's stylesheet (the shared stationery pieces bring STATIONERY_CSS).
// .ll-arrive: the envelope's entrance (published page); .ll-opening: the seal
// lifts, the ribbon parts and the envelope slides away. .ll-motion gates all
// motion (off for prefers-reduced-motion).

export const LOVE_LETTER_CSS = `
.ll-root{position:relative;container-type:inline-size;overflow-x:clip;min-height:100%;background:var(--ll-cream);color:var(--ll-olive);font-family:var(--ll-serif);-webkit-font-smoothing:antialiased;}
.ll-root *{box-sizing:border-box;}
.ll-root p,.ll-root li,.ll-root h1,.ll-root h2{text-wrap:pretty;}
.ll-script{font-family:var(--ll-script);font-weight:400;line-height:1.1;margin:0;}
.ll-caps{margin:0;font-family:var(--ll-serif);font-size:clamp(13px,3.1cqw,18px);font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:#efe7d4;}
.ll-caps--ink{color:var(--ll-olive);}
.ll-hint{opacity:.5;font-style:italic;}

/* ---------- Page 1: the envelope ---------- */
.ll-intro{position:relative;min-height:100svh;overflow:hidden;background:var(--ll-olive);color:#f3ecdc;}
.ll-intro::before{content:"";position:absolute;inset:0;background-image:var(--felt);background-size:320px 320px;mix-blend-mode:multiply;opacity:.95;pointer-events:none;}
.ll-intro::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 60% at 50% 32%,rgba(255,250,230,.14),transparent 60%),radial-gradient(150% 120% at 50% 50%,transparent 55%,rgba(0,0,0,.38) 100%);}
.ll-folds{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;}
.ll-intro__top{position:absolute;left:0;right:0;top:15svh;z-index:2;padding:0 20px;text-align:center;}
.ll-intro__names{margin-top:10px;font-size:clamp(46px,12cqw,92px);color:#f6efdf;text-shadow:0 1px 0 rgba(0,0,0,.25);}
.ll-intro__ribbon{position:absolute;left:0;right:0;top:56svh;height:64px;transform:translateY(-50%);z-index:3;}
.ll-ribbon-half{position:absolute;inset:0;}
.ll-ribbon-half--l{clip-path:inset(-20px 50% -20px 0);}
.ll-ribbon-half--r{clip-path:inset(-20px 0 -20px 50%);}
.ll-intro__seal{position:absolute;left:50%;top:50%;width:clamp(110px,22cqw,168px);padding:0;border:none;background:none;transform:translate(-50%,-50%);cursor:pointer;}
.ll-intro__open{position:absolute;left:50%;bottom:12svh;z-index:3;min-height:44px;padding:10px 18px;border:none;background:none;translate:-50% 0;font-size:clamp(14px,3.4cqw,19px);white-space:nowrap;cursor:pointer;}
.ll-intro__open::after{content:"";display:block;width:36px;height:1px;margin:10px auto 0;background:currentColor;opacity:.6;}
.ll-intro__credit{position:absolute;left:0;right:0;bottom:10px;z-index:3;margin:0;text-align:center;font-size:12px;color:#d9d0b8;opacity:.8;}

/* ---------- Page 2: the invitation ---------- */
.ll-inside{position:relative;background:var(--ll-cream);}
.ll-inside::before{content:"";position:absolute;inset:0;background-image:var(--grain);background-size:280px 280px;mix-blend-mode:multiply;opacity:.55;pointer-events:none;}
.ll-topbar{position:relative;z-index:2;padding:14px 16px 0;}
.ll-back{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border:1px solid color-mix(in srgb,var(--ll-olive) 40%,transparent);border-radius:999px;background:transparent;font-family:var(--ll-serif);font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--ll-olive);cursor:pointer;}
.ll-back span{font-size:20px;line-height:1;margin-top:-2px;letter-spacing:0;}
.ll-hero{position:relative;z-index:1;display:flex;justify-content:center;padding:16px 16px 0;}

/* the open envelope with the pieces tucked in */
.ll-stack{position:relative;width:min(100%,470px);aspect-ratio:1/.96;container-type:inline-size;}
.ll-stack__env{position:absolute;left:4%;right:4%;bottom:2%;height:50%;}
.ll-stack__env--back{z-index:1;}
.ll-stack__env--front{z-index:5;}
.ll-stack__namecard{position:absolute;right:6%;top:3%;width:52%;z-index:2;transform:rotate(3deg);}
.ll-namecard{position:relative;padding:5cqw 4cqw 14cqw;text-align:center;color:var(--ll-olive);
  border:2.4cqw solid transparent;background:linear-gradient(var(--st-paper),var(--st-paper)) padding-box,repeating-linear-gradient(90deg,var(--ll-olive) 0 .9cqw,var(--st-paper) .9cqw 1.8cqw) border-box;
  box-shadow:0 1px 1px rgba(30,35,15,.4),0 12px 22px -8px rgba(30,35,15,.4);}
.ll-namecard::after{content:"";position:absolute;inset:0;background-image:var(--grain);background-size:280px;mix-blend-mode:multiply;opacity:.6;pointer-events:none;}
.ll-namecard__kicker{margin:0 0 2.4cqw;font-size:2.4cqw;letter-spacing:.24em;text-transform:uppercase;}
.ll-namecard__name{display:block;font-family:var(--ll-script);font-size:6.6cqw;line-height:1.15;}
.ll-namecard__amp{display:block;font-family:var(--ll-script);font-size:5cqw;line-height:1;opacity:.85;}
.ll-stack__oval{position:absolute;left:7%;top:3%;width:33%;z-index:3;transform:rotate(-7deg);}
.ll-oval{display:block;width:100%;height:auto;overflow:visible;}
.ll-stack__date{position:absolute;left:2%;top:41%;width:38%;aspect-ratio:2.3/1;z-index:6;transform:rotate(-6deg);}
.ll-datecard{position:relative;width:100%;height:100%;display:grid;place-items:center;}
.ll-datecard__sheet{position:absolute;inset:0;overflow:visible;filter:drop-shadow(0 1px 1px rgba(40,10,10,.45)) drop-shadow(0 8px 12px rgba(40,10,10,.3));}
.ll-datecard__text{position:relative;font-family:var(--ll-serif);font-size:6.2cqw;letter-spacing:.06em;color:#f7ecdc;text-shadow:0 1px 0 rgba(0,0,0,.25);}
.ll-stack__seal{position:absolute;left:50%;top:75.8%;width:12%;z-index:6;transform:translate(-50%,-50%);}

.ll-where{position:relative;z-index:1;padding:26px 20px 10px;text-align:center;}
.ll-where__place{margin:8px 0 12px;font-size:clamp(40px,9cqw,64px);color:var(--ll-olive);}
.ll-small-caps{margin:3px 0;font-size:clamp(13px,2.9cqw,15px);letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb,var(--ll-olive) 88%,#000);}
.ll-where__note{margin-top:12px;}
.ll-count{display:flex;justify-content:center;align-items:flex-start;gap:clamp(6px,2cqw,14px);margin:26px 0 4px;font-variant-numeric:tabular-nums;}
.ll-count__cell{display:grid;justify-items:center;min-width:3ch;}
.ll-count__n{font-family:var(--ll-serif);font-size:clamp(28px,6.4cqw,40px);line-height:1;}
.ll-count__l{margin-top:6px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.7;}
.ll-count__sep{font-size:clamp(24px,5cqw,32px);line-height:1;opacity:.45;}
.ll-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 30px;margin-top:20px;border:none;border-radius:999px;background:var(--ll-olive);color:var(--ll-cream);font-family:var(--ll-serif);font-size:14px;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;cursor:pointer;box-shadow:0 10px 20px -12px rgba(40,45,20,.7);}
.ll-btn--line{margin-top:10px;background:transparent;color:var(--ll-olive);border:1px solid var(--ll-olive);box-shadow:none;}
.ll-btn--wide{width:100%;}
.ll-btn:disabled{opacity:.6;cursor:default;}
.ll-link{display:inline-flex;align-items:center;min-height:40px;padding:0;border:none;background:none;font:inherit;font-size:15px;color:inherit;opacity:.8;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}

.ll-blocks{position:relative;z-index:1;width:min(calc(100% - 32px),560px);margin:0 auto;padding:12px 0 54px;display:grid;gap:38px;text-align:center;}
.ll-sprig{display:block;width:120px;height:auto;margin:0 auto 8px;color:var(--ll-olive);}
.ll-block__title{margin:0 0 10px;font-size:clamp(38px,8.4cqw,54px);color:var(--ll-olive);}
.ll-text{margin:.35em auto;max-width:30em;font-size:clamp(17px,3.5cqw,19px);line-height:1.6;color:color-mix(in srgb,var(--ll-olive) 85%,#000);}
.ll-text--soft{opacity:.75;font-style:italic;}
.ll-day{list-style:none;padding:0;margin:6px auto 0;max-width:420px;text-align:left;}
.ll-day li{display:grid;grid-template-columns:96px 1fr;gap:14px;padding:10px 0;border-bottom:1px solid color-mix(in srgb,var(--ll-olive) 18%,transparent);}
.ll-day li:last-child{border-bottom:none;}
.ll-day__time{font-size:13px;letter-spacing:.14em;text-transform:uppercase;padding-top:3px;}
.ll-day__what{font-size:19px;line-height:1.35;}
.ll-day__what em{display:block;font-size:16px;opacity:.75;}
.ll-swatches{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin-top:16px;}
.ll-swatches span{width:52px;height:52px;border-radius:50%;box-shadow:0 0 0 3px var(--ll-cream),0 0 0 4px color-mix(in srgb,var(--ll-olive) 30%,transparent),0 8px 14px -8px rgba(0,0,0,.4);}
.ll-item{margin-top:12px;}
.ll-item__title{margin:0;font-size:clamp(18px,3.6cqw,21px);font-weight:600;}
.ll-item__title a{color:inherit;}
.ll-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:6px 0 12px;}
.ll-closing{margin-top:4px;}

/* the reply card */
.ll-reply{margin-top:4px;}
.ll-reply .st-paper__body{padding:clamp(40px,7cqw,56px) clamp(24px,6cqw,48px);}
.ll-reply::after{content:"";position:absolute;inset:12px;border:1px solid color-mix(in srgb,var(--ll-olive) 35%,transparent);pointer-events:none;}
.ll-form{display:grid;gap:16px;max-width:420px;margin:12px auto 0;text-align:left;}
.ll-form label{display:block;margin-bottom:4px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;}
.ll-field{display:block;width:100%;min-height:46px;padding:8px 2px 4px;border:none;border-bottom:1px solid color-mix(in srgb,var(--ll-olive) 45%,transparent);border-radius:0;background:transparent;font-family:var(--ll-serif);font-style:italic;font-size:20px;color:var(--ll-olive);}
.ll-field::placeholder{color:color-mix(in srgb,var(--ll-olive) 35%,transparent);}
.ll-field:focus{outline:none;border-bottom-color:var(--ll-olive);box-shadow:0 1px 0 var(--ll-olive);}
textarea.ll-field{resize:vertical;min-height:84px;line-height:34px;border-bottom:none;background-image:repeating-linear-gradient(transparent 0 33px,color-mix(in srgb,var(--ll-olive) 30%,transparent) 33px 34px);}
.ll-choice{display:grid;gap:4px;}
.ll-choice__opt{display:flex;align-items:center;gap:12px;min-height:48px;padding:4px 2px;border:none;background:none;font-family:var(--ll-serif);font-style:italic;font-size:21px;color:var(--ll-olive);text-align:left;cursor:pointer;}
.ll-tick{flex:none;position:relative;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--ll-olive);}
.ll-choice__opt.is-picked .ll-tick::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--ll-olive);}
.ll-count2{display:flex;flex-wrap:wrap;gap:6px;}
.ll-count2__n{width:44px;height:44px;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--ll-olive) 50%,transparent);background:transparent;font-family:var(--ll-serif);font-style:italic;font-size:20px;color:var(--ll-olive);cursor:pointer;}
.ll-count2__n.is-picked{background:var(--ll-olive);color:var(--ll-cream);border-color:var(--ll-olive);}
.ll-error{margin:0;color:#9b1c1c;font-size:15px;}
.ll-done{display:grid;justify-items:center;gap:4px;}

/* the photo band with the monogram */
.ll-band{position:relative;display:grid;place-items:center;min-height:clamp(280px,52cqw,440px);overflow:hidden;background:var(--ll-olive);}
.ll-band__bg{position:absolute;inset:0;background-image:var(--band);background-size:cover;background-position:center;filter:saturate(.75) contrast(.95);}
.ll-band__bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(40,45,20,.25),rgba(40,45,20,.55));}
.ll-band__bg--felt{background-image:var(--felt);background-size:320px;mix-blend-mode:multiply;filter:none;}
.ll-band__bg--felt::after{background:radial-gradient(150% 120% at 50% 50%,transparent 50%,rgba(0,0,0,.35) 100%);}
.ll-band__seal{position:relative;width:clamp(100px,18cqw,140px);}
.ll-band__credit{position:absolute;left:0;right:0;bottom:12px;margin:0;text-align:center;font-size:13px;color:#efe7d4;}

/* ---------- Motion ---------- */
.ll-motion .ll-block{opacity:0;transform:translateY(20px);transition:opacity .8s ease,transform .9s cubic-bezier(.2,.8,.2,1);}
.ll-motion .ll-block.is-on{opacity:1;transform:none;}
.ll-motion .ll-inside{animation:ll-enter .8s cubic-bezier(.2,.8,.2,1) both;}
.ll-motion .ll-intro__open{animation:ll-glow 3.2s ease-in-out 2.4s infinite;}
.ll-arrive .ll-in{animation:ll-rise 1s cubic-bezier(.2,.8,.2,1) var(--d,.3s) both;}
.ll-arrive.ll-motion .ll-intro__open{animation:ll-rise 1s cubic-bezier(.2,.8,.2,1) 1.3s both,ll-glow 3.2s ease-in-out 2.6s infinite;}
.ll-arrive .ll-ribbon-half--l{animation:ll-in-l 1.1s cubic-bezier(.2,.8,.2,1) .5s both;}
.ll-arrive .ll-ribbon-half--r{animation:ll-in-r 1.1s cubic-bezier(.2,.8,.2,1) .5s both;}
.ll-arrive .ll-intro__seal{animation:ll-drop .8s cubic-bezier(.2,1.5,.4,1) 1.25s both;}
.ll-arrive .ll-folds{animation:ll-fade 1.2s ease .1s both;}
.ll-opening .ll-intro__seal{animation:ll-seal-off .55s cubic-bezier(.5,0,.7,.4) both;}
.ll-opening .ll-ribbon-half--l{animation:ll-out-l .8s cubic-bezier(.5,0,.3,1) .2s both;}
.ll-opening .ll-ribbon-half--r{animation:ll-out-r .8s cubic-bezier(.5,0,.3,1) .2s both;}
.ll-opening .ll-intro__top,.ll-opening .ll-intro__open,.ll-opening .ll-intro__credit{transition:opacity .4s;opacity:0;}
.ll-opening .ll-intro{animation:ll-away .65s cubic-bezier(.6,0,.4,1) .85s both;}

@keyframes ll-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes ll-fade{from{opacity:0}to{opacity:1}}
@keyframes ll-in-l{from{transform:translateX(-100%)}to{transform:none}}
@keyframes ll-in-r{from{transform:translateX(100%)}to{transform:none}}
@keyframes ll-out-l{to{transform:translateX(-105%)}}
@keyframes ll-out-r{to{transform:translateX(105%)}}
@keyframes ll-drop{from{opacity:0;transform:translate(-50%,-50%) scale(1.6) rotate(-8deg)}to{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0)}}
@keyframes ll-seal-off{to{opacity:0;transform:translate(-50%,-90%) scale(1.15) rotate(6deg)}}
@keyframes ll-away{to{transform:translateY(-100%)}}
@keyframes ll-enter{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes ll-glow{0%,100%{opacity:1}50%{opacity:.55}}
`;
