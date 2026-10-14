// The Pickleball template's stylesheet. Sizes use cqw (the template is its own
// container), so the builder's scaled preview and real phones match.
// Motion lives under .pb-motion (off for prefers-reduced-motion), the one-time
// opening under .pb-opening (published page only), the page turn under .pb-turning.

export const PICKLEBALL_CSS = `
.pb-root{position:relative;container-type:inline-size;overflow-x:clip;min-height:100%;background:var(--pb-cream);color:var(--pb-ink);font-family:var(--pb-sans);-webkit-font-smoothing:antialiased;}
.pb-root *{box-sizing:border-box;}
.pb-root p,.pb-root li,.pb-root h1,.pb-root h2{text-wrap:pretty;}
.pb-stripes{position:absolute;inset:0;z-index:0;-webkit-mask-image:url(/event-templates/pickleball/stripes-mask.webp);mask-image:url(/event-templates/pickleball/stripes-mask.webp);-webkit-mask-size:clamp(700px,100cqw,1400px) auto;mask-size:clamp(700px,100cqw,1400px) auto;-webkit-mask-repeat:repeat;mask-repeat:repeat;}
.pb-intro,.pb-inside{position:relative;z-index:2;}

/* Art */
.pb-frame{position:absolute;inset:0;pointer-events:none;}
.pb-frame svg{display:block;overflow:visible;}
.pb-ball{display:block;overflow:visible;}
.pb-sticker{display:block;height:auto;pointer-events:none;user-select:none;filter:drop-shadow(0 8px 10px rgba(60,30,40,.12));}
.pb-sparkle{width:34px;height:34px;opacity:.85;}
.pb-script{font-family:var(--pb-script);font-weight:400;line-height:1;color:var(--pb-ink);margin:0;}
.pb-hint{opacity:.5;font-style:italic;}

/* ---------- Page 1: the intro card ---------- */
.pb-intro{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:min(clamp(28px,6cqw,64px),3svh) clamp(14px,4cqw,48px) min(clamp(14px,3cqw,28px),2svh);}
.pb-card{position:relative;z-index:2;width:min(100%,640px);padding:min(clamp(40px,9cqw,84px),5.2svh) clamp(28px,7.5cqw,76px) min(clamp(48px,10cqw,90px),5.6svh);text-align:center;}
.pb-card__body{position:relative;}
.pb-crest{position:relative;width:min(clamp(210px,50cqw,320px),22svh);margin:0 auto clamp(6px,1.6cqw,16px);padding-top:min(clamp(44px,11cqw,74px),6svh);}
.pb-crest.pb-crest--sm{width:clamp(120px,26cqw,160px);padding-top:clamp(34px,8cqw,46px);margin-bottom:10px;}
.pb-crest--sm .pb-crest__ball{width:clamp(34px,8cqw,44px);}
.pb-crest__paddles{display:block;width:100%;height:auto;overflow:visible;}
.pb-paddle{transform-box:view-box;transform-origin:150px 214px;}
.pb-paddle--l{transform:rotate(-34deg);}
.pb-paddle--r{transform:rotate(34deg);}
.pb-crest__ball{position:absolute;left:50%;top:0;width:min(clamp(56px,14cqw,82px),6.6svh);transform:translateX(-50%);}
.pb-crest__ball .pb-ball{width:100%;height:auto;}
.pb-arc{width:min(clamp(210px,46cqw,310px),32svh);margin:0 auto -2px;}
.pb-arctext{display:block;width:100%;height:auto;overflow:visible;}
.pb-arctext text{font-family:var(--pb-sans);font-size:30px;font-weight:500;letter-spacing:.06em;fill:var(--pb-ink);}
.pb-arctext--arch text{font-size:25px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;}
.pb-headline{font-size:min(clamp(66px,17.5cqw,138px),9.2svh);margin:0 0 clamp(14px,3cqw,26px);letter-spacing:-.005em;}
.pb-headline span{display:block;}
.pb-headline span+span{margin-top:-.08em;}
.pb-line{margin:0;font-size:min(clamp(15px,3.5cqw,23px),2.4svh);font-weight:500;letter-spacing:.07em;}
.pb-name{margin:.45em 0 .5em;font-size:min(clamp(25px,6.4cqw,46px),4.4svh);font-weight:500;letter-spacing:.14em;text-transform:uppercase;line-height:1.15;}
.pb-facts p{margin:0;font-size:min(clamp(16px,3.6cqw,23px),2.5svh);font-weight:500;letter-spacing:.05em;line-height:1.65;}
.pb-facts--sm p{font-size:clamp(15px,3.2cqw,19px);}
.pb-intro__go{margin-top:min(clamp(18px,3.6cqw,28px),2.4svh);min-width:220px;min-height:56px;font-size:15px;}
.pb-intro__arrow{font-size:22px;line-height:1;margin-top:-2px;letter-spacing:0;}
.pb-intro__credit{position:relative;z-index:2;margin:clamp(10px,2cqw,18px) 0 0;font-size:12px;opacity:.7;text-align:center;}

/* Sparkles around the card */
.pb-stickers{position:absolute;inset:0;z-index:1;pointer-events:none;}
.pb-st{position:absolute;}
.pb-st--spark1{right:max(16%,calc(50% - 380px));top:18%;}
.pb-st--spark2{left:max(14%,calc(50% - 390px));top:62%;width:24px;height:24px;}
@container (max-width:760px){
  .pb-st--spark1{right:16px;top:2%;width:24px;height:24px;}
  .pb-st--spark2{display:none;}
}

/* ---------- Page 2: inside (Claudy-style: one tall arch) ---------- */
.pb-serif{font-family:var(--pb-serif);color:var(--pb-ink);line-height:1.04;margin:0;}
.pb-topbar{position:relative;z-index:4;display:flex;padding:clamp(10px,2.4cqw,22px) clamp(12px,3cqw,32px) 0;}
.pb-back{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:1.5px solid var(--pb-line);border-radius:999px;background:var(--pb-paper);font-family:var(--pb-sans);font-size:14px;font-weight:600;letter-spacing:.04em;color:var(--pb-ink);cursor:pointer;}
.pb-back span{font-size:20px;line-height:1;margin-top:-2px;}
.pb-arch{--ap:clamp(16px,4.5cqw,56px);--aw:min(calc(100cqw - 2 * clamp(18px,6cqw,72px)),720px);position:relative;z-index:2;width:var(--aw);margin:clamp(10px,2.4cqw,24px) auto clamp(44px,8cqw,84px);padding:0 var(--ap) clamp(28px,6cqw,56px);text-align:center;background:var(--pb-paper);border:2px solid var(--pb-line);border-radius:calc(var(--aw) / 2) calc(var(--aw) / 2) 30px 30px;box-shadow:0 40px 70px -50px rgba(70,40,40,.45);}
.pb-arch__text{margin:0 calc(-1 * var(--ap));}
.pb-arch__text .pb-arctext--arch text{font-family:var(--pb-serif);font-weight:800;font-size:27px;letter-spacing:.09em;}
.pb-arch .pb-crest--sm{margin-top:calc(var(--aw) * -0.26);}
.pb-eyebrow{margin:16px 0 12px;font-family:var(--pb-sans);font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--pb-soft);}
.pb-eyebrow--soft{margin-top:4px;}
.pb-arch__title{font-weight:800;font-size:clamp(40px,10cqw,78px);margin:0 0 10px;letter-spacing:-.012em;}
.pb-grad{font-style:italic;background:linear-gradient(95deg,var(--pb-soft),var(--pb-pink) 70%);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.04em;}
.pb-arch__facts{margin:14px 0 6px;}
.pb-arch__facts p{margin:0;font-size:clamp(13px,2.7cqw,15px);font-weight:500;letter-spacing:.18em;text-transform:uppercase;line-height:2.1;color:var(--pb-soft);}
.pb-rule{width:min(62%,380px);border:0;border-top:1.5px solid color-mix(in srgb,var(--pb-ink) 16%,transparent);margin:clamp(20px,4cqw,32px) auto clamp(26px,5cqw,40px);}
.pb-cards{display:grid;gap:clamp(18px,3.4cqw,28px);}
.pb-arch__stickers{position:absolute;inset:0;z-index:3;pointer-events:none;}
.pb-as{position:absolute;}
.pb-as--1{width:clamp(80px,13cqw,150px);right:-11%;top:7%;transform:rotate(6deg);}
.pb-as--2{width:clamp(80px,13cqw,150px);left:-12%;top:12%;transform:rotate(-14deg);}
.pb-as--3{width:clamp(100px,16cqw,190px);left:-17%;top:25%;}
.pb-as--4{width:clamp(60px,9cqw,104px);right:-9%;top:31%;transform:rotate(10deg);}
.pb-as--5{width:clamp(90px,14cqw,160px);left:-14%;top:43%;transform:rotate(-6deg);}
.pb-as--6{width:clamp(70px,10cqw,120px);right:-10%;top:49%;transform:rotate(-4deg);}
.pb-as--7{width:clamp(80px,12cqw,140px);left:-12%;top:62%;transform:rotate(-5deg);}
.pb-as--8{width:clamp(48px,7cqw,80px);right:-7%;top:68%;transform:rotate(14deg);}
.pb-as--9{width:clamp(90px,14cqw,160px);right:-13%;top:83%;transform:rotate(8deg);}
@container (max-width:760px){
  .pb-arch{--aw:calc(100cqw - 40px);}
  .pb-as--1{width:66px;right:-34px;}
  .pb-as--2{width:66px;left:-34px;}
  .pb-as--3{width:84px;left:-46px;}
  .pb-as--4{width:44px;right:-24px;}
  .pb-as--5{width:72px;left:-38px;}
  .pb-as--6{width:54px;right:-30px;}
  .pb-as--7{width:64px;left:-34px;}
  .pb-as--8{width:34px;right:-18px;}
  .pb-as--9{width:70px;right:-38px;}
}

/* Buttons */
.pb-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:0 30px;border-radius:999px;font-family:var(--pb-sans);font-size:14px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .2s;}
.pb-btn--solid{background:var(--pb-ink);color:var(--pb-cream);border:none;box-shadow:0 5px 0 color-mix(in srgb,var(--pb-ink) 62%,#000);}
.pb-btn--solid:hover{transform:translateY(-2px);box-shadow:0 7px 0 color-mix(in srgb,var(--pb-ink) 62%,#000);}
.pb-btn--solid:active{transform:translateY(4px);box-shadow:0 1px 0 color-mix(in srgb,var(--pb-ink) 62%,#000);}
.pb-btn--solid:disabled{opacity:.6;cursor:default;transform:none;}
.pb-btn--line{background:transparent;color:var(--pb-ink);border:2px solid var(--pb-ink);}
.pb-btn--line:hover{background:color-mix(in srgb,var(--pb-ink) 8%,transparent);}
.pb-btn--wide{width:100%;min-height:56px;margin-top:4px;}
.pb-link{display:inline-flex;align-items:center;min-height:40px;padding:0;margin-top:2px;border:none;background:none;font:inherit;font-size:14px;color:inherit;opacity:.8;text-decoration:underline;text-underline-offset:3px;cursor:pointer;}

/* Cards inside the arch */
.pb-c{position:relative;background:#fff;border:1px solid color-mix(in srgb,var(--pb-ink) 7%,transparent);border-radius:26px;padding:clamp(28px,6cqw,46px) clamp(20px,5cqw,42px);box-shadow:0 18px 34px -26px rgba(60,40,40,.4);}
.pb-c__title{font-style:italic;font-weight:800;font-size:clamp(30px,6.8cqw,46px);margin:0 0 12px;}
.pb-kicker{margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--pb-soft);}
.pb-text{margin:.4em auto;max-width:30em;font-size:clamp(15px,3.1cqw,18px);line-height:1.7;color:color-mix(in srgb,var(--pb-ink) 82%,#fff);}
.pb-small{margin:6px 0 0;font-size:14px;color:var(--pb-soft);}
.pb-plan{list-style:none;padding:0;margin:6px auto 0;max-width:440px;text-align:left;}
.pb-plan li{display:grid;grid-template-columns:84px 16px 1fr;gap:12px;align-items:start;padding:12px 0;border-bottom:1.5px dashed color-mix(in srgb,var(--pb-ink) 18%,transparent);}
.pb-plan li:last-child{border-bottom:none;}
.pb-plan__time{font-weight:600;font-size:15px;letter-spacing:.04em;padding-top:1px;}
.pb-plan__dot{width:14px;height:14px;margin-top:4px;border-radius:50%;background:var(--pb-pink);box-shadow:0 0 0 2px var(--pb-paper),0 0 0 3.5px var(--pb-line);}
.pb-plan__what strong{display:block;font-size:17px;font-weight:600;}
.pb-plan__what span{display:block;margin-top:2px;font-size:15px;color:var(--pb-soft);line-height:1.5;}
.pb-swatches{display:flex;flex-wrap:wrap;justify-content:center;gap:22px;margin-top:20px;}
.pb-swatch{width:64px;height:64px;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--pb-ink) 18%,transparent);box-shadow:0 8px 16px -10px rgba(0,0,0,.4);}
.pb-bring{list-style:none;padding:0;margin:6px auto 0;max-width:380px;text-align:left;}
.pb-bring li{display:flex;align-items:center;gap:14px;padding:8px 0;font-size:clamp(15px,3.2cqw,18px);font-weight:500;}
.pb-bring__tick{flex:none;display:grid;place-items:center;width:28px;height:28px;border:1.5px solid var(--pb-line);border-radius:8px;background:var(--pb-paper);color:var(--pb-ink);}
.pb-bring__tick svg{width:18px;height:18px;}
.pb-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:4px 0 14px;}
.pb-faqs{display:grid;gap:4px;}
.pb-faqs__q{margin:14px 0 0;font-size:clamp(16px,3.3cqw,19px);font-weight:600;}

/* RSVP */
.pb-form{position:relative;display:grid;gap:16px;max-width:440px;margin:18px auto 0;text-align:left;}
.pb-form label{display:block;margin-bottom:6px;font-size:14px;font-weight:600;letter-spacing:.03em;}
.pb-field{display:block;width:100%;min-height:52px;padding:12px 16px;border:2px solid color-mix(in srgb,var(--pb-ink) 32%,transparent);border-radius:16px;background:#fff;font:inherit;font-size:16px;color:var(--pb-ink);transition:border-color .15s,box-shadow .15s;}
.pb-field:focus{outline:none;border-color:var(--pb-ink);box-shadow:0 0 0 4px color-mix(in srgb,var(--pb-pink) 70%,transparent);}
textarea.pb-field{resize:vertical;min-height:96px;}
.pb-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.pb-choice__opt{display:flex;align-items:center;justify-content:center;gap:10px;min-height:70px;padding:10px 12px;border:2px solid color-mix(in srgb,var(--pb-ink) 32%,transparent);border-radius:18px;background:#fff;font-family:var(--pb-sans);font-size:16px;font-weight:600;line-height:1.25;color:var(--pb-ink);cursor:pointer;transition:background .2s,color .2s,border-color .2s,transform .15s;}
.pb-choice__opt:active{transform:scale(.97);}
.pb-choice__opt.is-picked{background:var(--pb-ink);border-color:var(--pb-ink);color:var(--pb-cream);}
.pb-choice__opt.is-picked .pb-ball>circle{fill:var(--pb-pink);}
.pb-count{display:flex;flex-wrap:wrap;gap:8px;}
.pb-count__n{width:50px;height:50px;border-radius:50%;border:2px solid color-mix(in srgb,var(--pb-ink) 32%,transparent);background:#fff;font-family:var(--pb-sans);font-size:18px;font-weight:600;color:var(--pb-ink);cursor:pointer;transition:background .2s,color .2s,transform .15s;}
.pb-count__n.is-picked{background:var(--pb-ink);border-color:var(--pb-ink);color:var(--pb-cream);}
.pb-error{margin:0;color:#b3261e;font-size:14px;font-weight:500;}
.pb-done{display:grid;justify-items:center;gap:6px;}
.pb-done__ball{width:96px;margin-bottom:6px;}
.pb-burst{position:absolute;left:50%;top:38%;z-index:5;pointer-events:none;}
.pb-burst span{position:absolute;left:0;top:0;animation:pb-burst 1.6s cubic-bezier(.15,.7,.3,1) both;}

@container (max-width:460px){
  .pb-plan li{grid-template-columns:72px 16px 1fr;gap:10px;}
  .pb-btn{padding:0 24px;}
}

/* Footer */
.pb-footer{position:relative;z-index:2;background:var(--pb-ink);color:var(--pb-cream);text-align:center;padding:22px 16px;font-size:14px;letter-spacing:.02em;}
.pb-footer p{margin:0;}

/* ---------- Motion (off for prefers-reduced-motion) ---------- */
.pb-motion .pb-bob{animation:pb-bob 2.4s cubic-bezier(.45,0,.55,1) infinite;}
.pb-motion .pb-ball__holes{animation:pb-spin 9s linear infinite;}
.pb-motion .pb-as{animation:pb-float 8s ease-in-out infinite;}
.pb-motion .pb-as:nth-child(2n){animation-duration:9.5s;animation-delay:-3s;}
.pb-motion .pb-as:nth-child(3n){animation-duration:7s;animation-delay:-5s;}
.pb-motion .pb-st--spark1,.pb-motion .pb-st--spark2{animation:pb-twinkle 3.2s ease-in-out infinite;}
.pb-motion .pb-st--spark2{animation-delay:-1.6s;}
.pb-motion .pb-c{opacity:0;transform:translateY(26px);transition:opacity .8s ease,transform .9s cubic-bezier(.2,.8,.2,1);}
.pb-motion .pb-c.is-on{opacity:1;transform:none;}
.pb-motion .pb-bring li{opacity:0;transform:translateX(-10px);transition:opacity .5s ease,transform .5s ease;}
.pb-motion .pb-c.is-on .pb-bring li{opacity:1;transform:none;}
.pb-motion .pb-c.is-on .pb-bring li:nth-child(2){transition-delay:.08s;}
.pb-motion .pb-c.is-on .pb-bring li:nth-child(3){transition-delay:.16s;}
.pb-motion .pb-c.is-on .pb-bring li:nth-child(4){transition-delay:.24s;}
.pb-motion .pb-c.is-on .pb-bring li:nth-child(5){transition-delay:.32s;}
.pb-motion .pb-c.is-on .pb-bring li:nth-child(n+6){transition-delay:.4s;}
.pb-motion .pb-done__ball{animation:pb-pop .8s cubic-bezier(.2,1.6,.4,1) both;}
.pb-motion .pb-intro__go{animation:pb-nudge 4s ease-in-out 4s infinite;}
.pb-motion .pb-intro__arrow{display:inline-block;animation:pb-arrow 1.6s ease-in-out infinite;}
.pb-motion .pb-inside{animation:pb-enter .7s cubic-bezier(.2,.8,.2,1) both;}
.pb-motion .pb-arch{animation:pb-rise .9s cubic-bezier(.2,.8,.2,1) .1s both;}

/* ---------- The page turn (card → inside) ---------- */
.pb-turning .pb-card{animation:pb-card-out .65s cubic-bezier(.6,0,.4,1) both;}
.pb-turning .pb-st{animation:pb-st-out .6s ease-in both !important;}
.pb-turning .pb-intro__credit{opacity:0;transition:opacity .3s;}

/* ---------- The opening (published page only, once) ---------- */
.pb-opening .pb-stripes{animation:pb-paint 1.1s cubic-bezier(.6,.05,.3,1) both;}
.pb-opening .pb-card>.pb-frame .pb-frame__path{stroke-dasharray:1;stroke-dashoffset:1;animation:pb-draw 1.5s cubic-bezier(.6,.1,.3,1) .45s forwards;}
.pb-opening .pb-crest__ball{animation:pb-serve 1.35s cubic-bezier(.3,.6,.4,1) .15s both;}
.pb-opening .pb-paddle--l{animation:pb-swing-l .95s cubic-bezier(.2,1.45,.4,1) 1.05s both;}
.pb-opening .pb-paddle--r{animation:pb-swing-r .95s cubic-bezier(.2,1.45,.4,1) 1.15s both;}
.pb-opening .pb-rise{animation:pb-rise .85s cubic-bezier(.2,.8,.2,1) var(--d,1.6s) both;}
.pb-opening .pb-st{animation:pb-st-in .7s cubic-bezier(.2,1.5,.4,1) 3s both;}
.pb-opening .pb-intro__credit{animation:pb-fade 1s ease 3s both;}

@keyframes pb-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes pb-spin{to{transform:rotate(360deg)}}
@keyframes pb-float{0%,100%{translate:0 0;rotate:0deg}33%{translate:6px -14px;rotate:5deg}66%{translate:-5px -5px;rotate:-4deg}}
@keyframes pb-twinkle{0%,100%{transform:scale(1) rotate(0);opacity:.85}50%{transform:scale(.55) rotate(45deg);opacity:.4}}
@keyframes pb-rally{from{offset-distance:0%}to{offset-distance:100%}}
@keyframes pb-pop{0%{transform:scale(0) rotate(-120deg)}100%{transform:scale(1) rotate(0)}}
@keyframes pb-nudge{0%,88%,100%{transform:none}92%{transform:translateY(-4px) rotate(-2deg)}96%{transform:translateY(0) rotate(2deg)}}
@keyframes pb-arrow{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}
@keyframes pb-burst{0%{transform:translate(0,0) rotate(0) scale(.3);opacity:1}65%{opacity:1}100%{transform:translate(var(--dx),calc(var(--dy) + 160px)) rotate(var(--rot)) scale(1);opacity:0}}
@keyframes pb-paint{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes pb-draw{to{stroke-dashoffset:0}}
@keyframes pb-serve{0%{transform:translate(-50%,0) translate(-46cqw,62cqw) scale(.55);opacity:0}12%{opacity:1}55%{transform:translate(-50%,0) translate(-14cqw,-16cqw) scale(1)}78%{transform:translate(-50%,0) translate(0,0) scale(1.06,.92)}88%{transform:translate(-50%,0) translate(0,-14px) scale(.97,1.04)}100%{transform:translate(-50%,0) translate(0,0) scale(1)}}
@keyframes pb-swing-l{from{transform:rotate(-110deg);opacity:0}to{transform:rotate(-34deg);opacity:1}}
@keyframes pb-swing-r{from{transform:rotate(110deg);opacity:0}to{transform:rotate(34deg);opacity:1}}
@keyframes pb-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes pb-fade{from{opacity:0}to{opacity:1}}
@keyframes pb-st-in{from{opacity:0;scale:.4}to{opacity:1;scale:1}}
@keyframes pb-st-out{to{opacity:0;scale:.6}}
@keyframes pb-card-out{0%{transform:none;opacity:1}100%{transform:translateY(-6%) scale(.94);opacity:0}}
@keyframes pb-enter{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
`;
