// Calado's styles. Sizes follow the page's own width (container units), so the builder's
// scaled preview, the gallery card and a phone lay out the same way. The opening
// (.cl-play) and the scroll reveals (.rv-on) run only where CaladoTemplate allows; everywhere
// else the page rests finished. Motion is transform/opacity only.

export const CALADO_CSS = `
.cl-root{container-type:inline-size;position:relative;overflow-x:clip;color:var(--cl-ink);font-family:var(--cl-serif);font-size:18px;font-weight:450;
  /* secondary text: the palette's muted, deepened enough to read on cloth (4.5:1 or better) */
  --cl-soft:color-mix(in srgb, var(--cl-muted) 55%, var(--cl-ink));
  background-color:var(--cl-bg);background-image:var(--cl-linen);background-size:640px 640px;background-blend-mode:multiply;}
.cl-root *,.cl-root *::before,.cl-root *::after{box-sizing:border-box;}
.cl-root a:not(.cl-btn){color:inherit;}
.cl-root p,.cl-root li{text-wrap:pretty;}
.cl-root h1,.cl-root h2,.cl-root h3{text-wrap:balance;}

/* ---- the hoop ---- */
.cl-hero{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100svh;padding:clamp(32px,6cqw,72px) 12px clamp(40px,6cqw,72px);--hs:min(92cqw,60svh,600px);}
.cl-gallery .cl-hero{min-height:0;padding-top:4cqw;padding-bottom:3cqw;--hs:52cqw;}
.cl-hoop{position:relative;width:var(--hs);aspect-ratio:1;filter:drop-shadow(0 calc(var(--hs) * .03) calc(var(--hs) * .03) rgba(60,44,26,.22));}
/* the cotton inside: a touch brighter and tauter than the cloth around it, lit from the top left */
.cl-hoop__cloth{position:absolute;inset:5.5%;border-radius:50%;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 9%;text-align:center;
  background-color:color-mix(in srgb, var(--cl-bg) 70%, #fff);background-image:radial-gradient(90% 80% at 30% 22%, rgba(255,255,255,.55), rgba(255,255,255,0) 60%),var(--cl-linen-full);background-size:auto,420px 420px;background-blend-mode:normal,multiply;
  box-shadow:inset 0 0 calc(var(--hs) * .04) rgba(70,50,30,.18),inset 0 calc(var(--hs) * .012) calc(var(--hs) * .02) rgba(70,50,30,.16);}
/* beech rings: the inner one, and the outer one with the clasp; grain by a slow conic band */
.cl-hoop__ring{position:absolute;border-radius:50%;pointer-events:none;
  background:conic-gradient(from 20deg,#d8b98a,#e7cfa5 12%,#caa472 23%,#dfc293 37%,#c69c66 52%,#e5cb9f 64%,#cfac7b 78%,#e2c696 90%,#d8b98a);}
.cl-hoop__ring--inner{inset:4.2%;-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 2.4%),#000 calc(100% - 2.3%));mask:radial-gradient(closest-side,transparent calc(100% - 2.4%),#000 calc(100% - 2.3%));filter:brightness(.92);}
.cl-hoop__ring--outer{inset:0;-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 4.6%),#000 calc(100% - 4.5%));mask:radial-gradient(closest-side,transparent calc(100% - 4.6%),#000 calc(100% - 4.5%));
  box-shadow:inset 0 0 0 1px rgba(120,84,40,.25);}
.cl-hoop__ring--outer::after{content:"";position:absolute;inset:0;border-radius:50%;background:linear-gradient(160deg,rgba(255,255,255,.35),rgba(255,255,255,0) 40%,rgba(80,50,20,.18) 100%);}
.cl-hoop__clasp{position:absolute;left:50%;top:-3.2%;width:9%;height:7%;translate:-50% 0;border-radius:3px;
  background:linear-gradient(180deg,#e3c77f,#b6913d 55%,#8f6e27);box-shadow:0 2px 3px rgba(60,40,10,.35),inset 0 1px 0 rgba(255,255,255,.5);}
.cl-hoop__clasp i{position:absolute;top:22%;width:24%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f4e2a8,#9c7a2e 70%);box-shadow:inset 0 0 0 1px rgba(80,55,15,.4);}
.cl-hoop__clasp i:first-child{left:12%;}.cl-hoop__clasp i:last-child{right:12%;}

.cl-eyebrow{margin:0 0 calc(var(--hs) * .015);font-style:italic;font-size:max(15px,calc(var(--hs) * .037));color:var(--cl-soft);letter-spacing:.01em;}
.cl-name{display:block;width:100%;height:auto;overflow:visible;}
.cl-name__text{font-family:var(--cl-script);}
.cl-thread{fill:var(--cl-thread);}
.cl-thread__hi{fill:color-mix(in srgb, var(--cl-thread) 55%, #fff);}
.cl-thread__lo{fill:color-mix(in srgb, var(--cl-thread) 70%, #12202c);}
.cl-name__text{stroke-width:4.2px;stroke-linejoin:round;}
.cl-name__edge{font-family:var(--cl-script);fill:none;stroke:color-mix(in srgb, var(--cl-thread) 58%, #102030);stroke-width:6.4px;stroke-linejoin:round;}
.cl-running{fill:none;stroke:var(--cl-thread);stroke-width:4;stroke-linecap:round;stroke-dasharray:15 11;}
.cl-name-hint{font-family:var(--cl-script);font-size:calc(var(--hs) * .12);margin:0;}

/* the opening: set the hoop down, stitch the name, then the day */
@keyframes cl-set{from{opacity:0;transform:scale(1.03) translateY(-10px);}to{opacity:1;transform:none;}}
@keyframes cl-sweep{from{transform:scaleX(0);}to{transform:scaleX(1);}}
@keyframes cl-needle{0%{opacity:0;transform:translateX(var(--x0));}8%{opacity:1;}92%{opacity:1;}100%{opacity:0;transform:translateX(var(--x1)) translateY(-14px);}}
@keyframes cl-rise{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;}}
.cl-sweep{transform-box:fill-box;transform-origin:left center;}
.cl-play .cl-hoop{animation:cl-set 1.2s cubic-bezier(.2,.7,.2,1) both;}
.cl-play .cl-sweep{transform:scaleX(0);animation-name:cl-sweep;animation-timing-function:cubic-bezier(.45,.05,.4,1);animation-fill-mode:both;}
.cl-needle{opacity:0;}
.cl-play .cl-needle{animation-name:cl-needle;animation-timing-function:cubic-bezier(.45,.05,.4,1);animation-fill-mode:both;}
.cl-needle__steel{fill:#b9bec4;stroke:#7c838b;stroke-width:.6;}
.cl-needle__eye{fill:#f4efe5;}
.cl-needle__thread{fill:none;stroke:var(--cl-thread);stroke-width:2.2;stroke-linecap:round;}
.cl-play .cl-eyebrow{animation:cl-rise 1s ease .5s both;}
.cl-play .cl-hero__words{animation:cl-rise 1.2s ease var(--words-at,6.2s) both;}

.cl-hero__words{display:grid;justify-items:center;gap:6px;margin-top:clamp(24px,3.5cqw,40px);text-align:center;}
.cl-hero__date{margin:0;font-size:clamp(18px,2cqw,21px);}
.cl-hero__kind{display:block;font-style:italic;font-size:.9em;color:var(--cl-soft);margin-bottom:2px;}
.cl-hero__when{display:block;white-space:nowrap;}
.cl-hero__town{display:block;margin-top:2px;font-size:.86em;color:var(--cl-soft);}
.cl-hero__parents{margin:6px 0 0;font-style:italic;color:var(--cl-soft);}
.cl-hero__btn{margin-top:18px;}

/* ---- type ---- */
.cl-sec{position:relative;max-width:1000px;margin:0 auto;padding:clamp(56px,10cqw,120px) 20px 0;}
.cl-narrow{max-width:640px;text-align:center;}
.cl-sec--wide{max-width:1080px;}
.cl-title{margin:0 0 clamp(20px,3.6cqw,40px);font-family:var(--cl-serif);font-weight:400;font-size:clamp(34px,4.6cqw,50px);line-height:1.1;text-align:center;letter-spacing:-.005em;}
.cl-title--small{font-size:clamp(28px,3.6cqw,38px);margin-bottom:14px;}
.cl-text{margin:0 0 14px;font-size:clamp(17px,1.8cqw,19px);line-height:1.7;}
.cl-text--lead{font-style:italic;font-size:clamp(21px,2.5cqw,26px);line-height:1.5;}
.cl-small{margin:6px 0;font-size:15.5px;line-height:1.5;color:var(--cl-soft);}
.cl-kicker{margin:0 0 8px;font-style:italic;font-size:17px;color:var(--cl-soft);}
.cl-hint{opacity:.7;}
.cl-sec__mark{display:block;margin:0 auto 18px;}
/* a cross-stitch: two short threads crossing */
.cl-x{position:relative;display:inline-block;width:12px;height:12px;}
.cl-x::before,.cl-x::after{content:"";position:absolute;left:50%;top:50%;width:14px;height:2.2px;border-radius:2px;background:var(--cl-thread);translate:-50% -50%;}
.cl-x::before{rotate:45deg;}.cl-x::after{rotate:-45deg;}

.cl-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 28px;border:1px solid var(--cl-ink);border-radius:999px;background:var(--cl-ink);color:var(--cl-bg);font:500 16.5px/1.1 var(--cl-serif);letter-spacing:.02em;text-decoration:none;cursor:pointer;transition:background-color .25s,color .25s;}
.cl-btn:hover{background:transparent;color:var(--cl-ink);}
.cl-btn--line{background:transparent;color:var(--cl-ink);}
.cl-btn--line:hover{background:var(--cl-ink);color:var(--cl-bg);}
.cl-btn--block{width:100%;}
.cl-btn:disabled{opacity:.6;cursor:not-allowed;}
.cl-btn:focus-visible,.cl-choice__opt:focus-visible,.cl-step button:focus-visible,.cl-mini:focus-visible,.cl-link:focus-visible{outline:2px solid var(--cl-thread);outline-offset:3px;}

/* ---- ceremony + celebration, joined by a running stitch ---- */
.cl-places{display:grid;gap:24px;text-align:center;justify-items:center;}
@container (min-width:720px){.cl-places{grid-template-columns:1fr auto 1fr;align-items:center;gap:28px;}}
.cl-place{max-width:340px;}
.cl-place__name{margin:0 0 8px;font-weight:400;font-size:clamp(26px,3cqw,34px);line-height:1.2;}
.cl-place__addr{margin:0 0 4px;font-size:17px;color:var(--cl-soft);line-height:1.5;}
.cl-place__time{margin:0 0 4px;font-style:italic;}
.cl-place__map{display:inline-flex;align-items:center;min-height:44px;font-weight:600;font-size:15px;text-decoration:underline;text-underline-offset:4px;}
.cl-places__stitch{display:block;width:2px;height:44px;background:repeating-linear-gradient(to bottom,var(--cl-thread) 0 10px,transparent 10px 18px);opacity:.8;}
@container (min-width:720px){.cl-places__stitch{width:110px;height:2px;background:repeating-linear-gradient(to right,var(--cl-thread) 0 10px,transparent 10px 18px);}}

/* ---- the godparents' sampler ---- */
.cl-sampler{position:relative;max-width:860px;margin:0 auto;padding:clamp(34px,5cqw,56px) clamp(18px,4cqw,48px);text-align:center;
  background:color-mix(in srgb, var(--cl-bg) 55%, #fff);border-radius:4px;box-shadow:0 18px 40px -30px rgba(60,44,26,.5);}
/* the running-stitch border */
.cl-sampler::before{content:"";position:absolute;inset:12px;border-radius:2px;pointer-events:none;
  background:
    repeating-linear-gradient(to right,var(--cl-thread) 0 9px,transparent 9px 16px) top/100% 2px no-repeat,
    repeating-linear-gradient(to right,var(--cl-thread) 0 9px,transparent 9px 16px) bottom/100% 2px no-repeat,
    repeating-linear-gradient(to bottom,var(--cl-thread) 0 9px,transparent 9px 16px) left/2px 100% no-repeat,
    repeating-linear-gradient(to bottom,var(--cl-thread) 0 9px,transparent 9px 16px) right/2px 100% no-repeat;opacity:.75;}
/* Ninongs | Ninangs side by side, phones included (a long list stays one short scroll) */
.cl-sampler__pair{display:grid;grid-template-columns:1fr auto 1fr;gap:clamp(12px,3cqw,28px);}
.cl-sampler__pair.is-one{grid-template-columns:1fr;}
.cl-sampler__seam{display:block;width:2px;background:repeating-linear-gradient(to bottom,var(--cl-thread) 0 9px,transparent 9px 16px);opacity:.55;}
@container (max-width:339px){.cl-sampler__pair{grid-template-columns:1fr;}.cl-sampler__seam{display:none;}}
@container (max-width:520px){.cl-sampler{padding:30px 18px;}.cl-sampler::before{inset:9px;}.cl-sampler ul{font-size:16px;line-height:1.4;gap:6px;}.cl-sampler li{overflow-wrap:anywhere;}}
.cl-sampler ul{list-style:none;margin:0;padding:0;display:grid;gap:4px;font-size:clamp(17px,1.8cqw,19px);line-height:1.5;}
.cl-sampler__group{margin-top:28px;}
.cl-sampler__list{columns:2;column-gap:32px;display:block!important;}
@container (max-width:520px){.cl-sampler__list{columns:1;}}
.cl-sampler__initials{margin:30px 0 0;font-family:var(--cl-script);font-size:34px;color:var(--cl-thread);}

/* ---- the program: a running-stitch timeline ---- */
.cl-program{position:relative;list-style:none;margin:0 auto;padding:0 0 0 0;max-width:520px;text-align:left;}
.cl-program::before{content:"";position:absolute;left:6.4em;top:8px;bottom:8px;width:2px;background:repeating-linear-gradient(to bottom,var(--cl-thread) 0 9px,transparent 9px 16px);opacity:.7;}
.cl-program li{position:relative;display:grid;grid-template-columns:6.4em 1fr;gap:26px;padding:14px 0;}
.cl-program li::after{content:"";position:absolute;left:calc(6.4em - 4px);top:22px;width:10px;height:10px;border-radius:50%;background:var(--cl-bg);box-shadow:inset 0 0 0 2px var(--cl-thread);}
.cl-program__t{font-size:17px;color:var(--cl-ink);font-variant-numeric:lining-nums;white-space:nowrap;text-align:right;padding-right:10px;}
.cl-program__w{font-size:19px;line-height:1.45;}
.cl-program__w em{display:block;font-size:16.5px;color:var(--cl-soft);}

/* ---- twelve months, a wall of small hoops ---- */
.cl-wall{list-style:none;margin:0 auto;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:28px 18px;align-items:center;justify-items:center;}
@container (min-width:720px){.cl-wall{grid-template-columns:repeat(4,1fr);gap:40px 28px;}}
.cl-wall__item{display:grid;justify-items:center;gap:10px;width:100%;}
.cl-mini{position:relative;display:block;width:var(--ms,82%);aspect-ratio:1;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;filter:drop-shadow(0 8px 10px rgba(60,44,26,.22));}
.cl-wall__item .cl-mini{--ms:88%;}
.cl-mini img{position:absolute;inset:7%;width:86%;height:86%;border-radius:50%;object-fit:cover;}
.cl-mini__ring{position:absolute;inset:0;border-radius:50%;z-index:1;
  background:conic-gradient(from 40deg,#d8b98a,#e7cfa5 15%,#caa472 30%,#dfc293 48%,#c69c66 63%,#e5cb9f 80%,#d8b98a);
  -webkit-mask:radial-gradient(closest-side,transparent calc(100% - 8%),#000 calc(100% - 7.6%));mask:radial-gradient(closest-side,transparent calc(100% - 8%),#000 calc(100% - 7.6%));}
@container (max-width:719px){
  .cl-wall{grid-template-columns:repeat(3,1fr);gap:20px 10px;}
  .cl-wall__item .cl-mini{--ms:100%;}
  .cl-wall__item{gap:6px;}
}
.cl-wall__cap{font-family:var(--cl-script);font-size:clamp(19px,2.4cqw,28px);color:color-mix(in srgb, var(--cl-thread) 55%, #102030);line-height:1;}
.cl-zoom{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;align-content:center;gap:14px;padding:24px;background:rgba(30,26,20,.82);cursor:zoom-out;}
.cl-zoom img{max-width:min(92vw,900px);max-height:78vh;border-radius:6px;box-shadow:0 20px 50px rgba(0,0,0,.4);}
.cl-zoom p{margin:0;font-family:var(--cl-script);font-size:30px;color:#f6efe3;}

/* ---- what to wear: floss skeins ---- */
.cl-skeins{display:flex;flex-wrap:wrap;justify-content:center;gap:18px 26px;margin-top:22px;}
.cl-skein{position:relative;display:inline-flex;align-items:center;height:44px;rotate:calc(-6deg + var(--i,0) * 4deg);}
.cl-skein__loop{display:block;width:44px;height:30px;border-radius:50%;
  background:repeating-linear-gradient(100deg,var(--c) 0 2px,color-mix(in srgb, var(--c) 78%, #000) 2px 3px,color-mix(in srgb, var(--c) 70%, #fff) 3px 4px);box-shadow:inset 0 -4px 6px rgba(0,0,0,.14);}
.cl-skein__loop--l{margin-right:-6px;}.cl-skein__loop--r{margin-left:-6px;}
.cl-skein__band{position:relative;z-index:1;width:24px;height:36px;border-radius:2px;background:#f7f1e6;box-shadow:0 1px 2px rgba(0,0,0,.18),inset 0 0 0 1px rgba(0,0,0,.05);}
.cl-skein__band::after{content:"";position:absolute;left:5px;right:5px;top:9px;height:3px;border-radius:2px;background:var(--c);opacity:.8;}

/* ---- cards: livestream, gifts, reply ---- */
.cl-card{position:relative;margin:0 auto;padding:clamp(28px,5cqw,50px) clamp(18px,4.5cqw,44px);border-radius:4px;background:color-mix(in srgb, var(--cl-bg) 45%, #fff);box-shadow:0 18px 40px -30px rgba(60,44,26,.55);}
.cl-card::before{content:"";position:absolute;inset:10px;border-radius:2px;pointer-events:none;
  background:
    repeating-linear-gradient(to right,var(--cl-thread) 0 8px,transparent 8px 14px) top/100% 1.6px no-repeat,
    repeating-linear-gradient(to right,var(--cl-thread) 0 8px,transparent 8px 14px) bottom/100% 1.6px no-repeat,
    repeating-linear-gradient(to bottom,var(--cl-thread) 0 8px,transparent 8px 14px) left/1.6px 100% no-repeat,
    repeating-linear-gradient(to bottom,var(--cl-thread) 0 8px,transparent 8px 14px) right/1.6px 100% no-repeat;opacity:.55;}
.cl-stream{text-align:center;}
.cl-stream__local{display:block;margin-top:2px;font-style:italic;color:var(--cl-soft);font-size:.92em;}
.cl-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:6px 0 14px;}
.cl-gifts{max-width:520px;margin:10px auto 0;}
.cl-faq{text-align:left;margin:0 0 22px;}
.cl-faq__q{margin:0 0 4px;font-size:clamp(20px,2.2cqw,23px);}

.cl-rsvp{text-align:center;}
.cl-seats{font-style:italic;font-size:clamp(19px,2.1cqw,22px);}
.cl-form{position:relative;display:grid;gap:20px;margin-top:22px;text-align:left;}
.cl-form label{display:block;margin-bottom:4px;font-style:italic;font-size:16.5px;color:var(--cl-soft);}
.cl-field{width:100%;padding:10px 2px;border:0;border-bottom:1px solid color-mix(in srgb, var(--cl-ink) 30%, transparent);border-radius:0;background:transparent;color:var(--cl-ink);font:400 18px/1.4 var(--cl-serif);outline:none;}
.cl-field:focus{border-bottom-color:var(--cl-thread);}
textarea.cl-field{padding:10px 12px;border:1px solid color-mix(in srgb, var(--cl-ink) 22%, transparent);border-radius:4px;resize:vertical;}
.cl-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.cl-choice__opt{min-height:52px;padding:0 8px;border:1px solid color-mix(in srgb, var(--cl-ink) 28%, transparent);border-radius:999px;background:transparent;color:var(--cl-ink);font:400 17px/1.2 var(--cl-serif);cursor:pointer;transition:background-color .25s,color .25s;}
.cl-choice__opt.is-picked{background:var(--cl-ink);border-color:var(--cl-ink);color:var(--cl-bg);}
.cl-steps{display:grid;gap:12px;}
@container (min-width:520px){.cl-steps{grid-template-columns:1fr 1fr;}}
.cl-step{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:999px;border:1px solid color-mix(in srgb, var(--cl-ink) 18%, transparent);}
.cl-step__label{font-size:17px;}
.cl-step__ctrl{display:flex;align-items:center;gap:6px;}
.cl-step__ctrl output{min-width:2ch;text-align:center;font-size:19px;font-variant-numeric:tabular-nums;}
.cl-step button{width:40px;height:40px;border-radius:50%;border:1px solid color-mix(in srgb, var(--cl-ink) 26%, transparent);background:transparent;color:var(--cl-ink);font:400 20px/1 var(--cl-serif);cursor:pointer;}
.cl-step button:disabled{opacity:.35;cursor:default;}
.cl-link{min-height:44px;padding:6px 0;border:0;background:none;color:var(--cl-ink);font:15px var(--cl-serif);text-decoration:underline;text-underline-offset:3px;cursor:pointer;}
.cl-error{margin:0;color:#9b2c2c;}
.cl-done{display:grid;justify-items:center;gap:4px;}
.cl-done .cl-btn{margin-top:14px;}

.cl-foot{display:grid;justify-items:center;gap:2px;padding:clamp(60px,10cqw,120px) 16px clamp(32px,5cqw,52px);text-align:center;}
.cl-foot__thanks{margin:0;font-style:italic;font-size:clamp(20px,2.2cqw,24px);}
.cl-foot__initials{margin:6px 0 0;font-family:var(--cl-script);font-size:40px;line-height:1;color:var(--cl-thread);}
.cl-credit{margin:22px 0 0;font-size:14px;color:var(--cl-soft);}

/* ---- scroll reveals (only where useReveal turns them on; the site's own [data-reveal] rule must not hide them) ---- */
.cl-root [data-reveal]{opacity:1;transform:none;transition:none;will-change:auto;}
.rv-on [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity 1.1s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .12s),transform 1.1s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .12s);}
.rv-on [data-reveal].is-in{opacity:1;transform:none;}
.rv-on .cl-sampler li{opacity:0;transition:opacity .9s ease calc(.25s + var(--i,0) * .18s);}
.rv-on .cl-sampler.is-in li{opacity:1;}
.rv-on .cl-wall__item .cl-mini{transform:scale(.94);transition:transform 1.2s cubic-bezier(.2,.8,.3,1) calc(var(--i,0) * .12s);}
.rv-on .cl-wall__item.is-in .cl-mini{transform:none;}

@media (prefers-reduced-motion:reduce){.cl-root *,.cl-root *::before,.cl-root *::after{animation:none!important;transition:none!important;}}
`;
