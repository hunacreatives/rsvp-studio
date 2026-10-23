// In Bloom. The hero is the "gel-at-30" design (~/angelica-birthday-website), ported 1:1 from its
// Tailwind classes. Breakpoints are the reference's sm/md/lg/xl (640/768/
// 1024/1280) but as CONTAINER queries on .cn-root, so the builder's scaled
// preview (a 1024px or 390px canvas) renders exactly what guests will see.
// Colours come from the theme (Blush & Sage = the reference's #C0606E rose
// and #8B9A6E sage), so Look & Feel can recolour it.

export const CINEMATIC_CSS = `
.cn-root{
  container: cn / inline-size;
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  overflow-x: clip;
  isolation: isolate;
  font-family: var(--cn-sans);
  color: var(--cn-sage);
  /* The sage, deepened only for the lines guests must read (date, venue, form labels). */
  --cn-sage-strong: color-mix(in srgb, var(--cn-sage) 72%, #000);
  -webkit-font-smoothing: antialiased;
}
.cn-root *{box-sizing:border-box;}
.cn-root img{display:block;max-width:100%;height:auto;}
.cn-root ::selection{background:#F8D7DA;color:#3A3A3A;}

/* ---------- the fixed background (AnimatedBackground.tsx) ---------- */
/* position:sticky, not fixed: the builder previews templates inside a
   transform:scale() canvas, which would trap a fixed layer (see the
   decision log). margin-bottom:-100vh keeps it out of the flow; it must
   stay the FIRST child of .cn-root. */
.cn-bg{position:sticky;top:0;left:0;width:100%;height:100vh;margin-bottom:-100vh;z-index:0;pointer-events:none;overflow:hidden;flex-shrink:0;}
.cn-bg__image{position:absolute;inset:0;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover;}
.cn-bg__video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;}
@container cn (max-width: 767.98px){
  .cn-bg--video .cn-bg__image{display:none;}
  .cn-bg--video .cn-bg__video{display:block;}
}
.cn-bg__vignette{position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(150,120,130,.08) 60%, rgba(120,90,100,.15) 100%);}
.cn-bg__glow{position:absolute;top:50%;left:50%;width:600px;height:600px;border-radius:9999px;filter:blur(40px);
  transform:translate(-50%,-55%);animation:cn-glow 8s ease-in-out infinite;
  background:radial-gradient(circle, rgba(255,230,240,.35) 0%, rgba(255,220,230,.15) 40%, transparent 70%);}
.cn-bg__blob{position:absolute;border-radius:9999px;}
.cn-bg__blob--a{top:-5rem;left:-5rem;width:20rem;height:20rem;filter:blur(60px);animation:cn-very-slow 15s ease-in-out infinite;
  background:radial-gradient(circle, rgba(255,200,215,.12) 0%, transparent 70%);}
.cn-bg__blob--b{bottom:-5rem;right:-5rem;width:24rem;height:24rem;filter:blur(60px);animation:cn-very-slow-rev 18s ease-in-out infinite;
  background:radial-gradient(circle, rgba(255,235,220,.1) 0%, transparent 70%);}
.cn-bg__blob--c{top:30%;right:10%;width:16rem;height:16rem;filter:blur(50px);animation:cn-drift 12s ease-in-out infinite;
  background:radial-gradient(circle, rgba(240,255,240,.08) 0%, transparent 70%);}
.cn-bg__canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.8;}

@keyframes cn-glow{0%,100%{opacity:.6;transform:translate(-50%,-55%) scale(1);}50%{opacity:1;transform:translate(-50%,-55%) scale(1.1);}}
@keyframes cn-very-slow{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(15px,-10px) scale(1.02);}66%{transform:translate(-10px,8px) scale(.98);}}
@keyframes cn-very-slow-rev{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(-12px,10px) scale(1.01);}66%{transform:translate(8px,-6px) scale(.99);}}
@keyframes cn-drift{0%,100%{transform:translate(0,0);}50%{transform:translate(20px,-15px);}}
@keyframes cn-float{0%,100%{transform:translateY(0) rotate(0deg);}50%{transform:translateY(-20px) rotate(3deg);}}

/* ---------- reveal (CinematicContent's staged timers) ---------- */
.cn-in{transition-property:opacity,transform;transition-timing-function:ease-out;}
.cn-in:not(.is-on){opacity:0;}
.cn-in.is-on{opacity:1;transform:none!important;}

/* ---------- main content ---------- */
.cn-main{position:relative;z-index:10;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;align-items:center;padding:4rem 1rem;}
.cn-col{max-width:520px;width:100%;text-align:center;}

.cn-headline{font-family:var(--cn-script);font-weight:400;color:var(--cn-rose);margin:0;line-height:1.15;
  font-size:2.25rem;text-shadow:0 2px 20px rgba(192,96,110,.15);filter:drop-shadow(0 1px 1px rgb(0 0 0 / .05));}
.cn-headline span{display:block;}
.cn-headline--nowrap span{white-space:nowrap;}
.cn-headline--wrap{text-wrap:balance;}

.cn-photos{display:flex;flex-direction:row;align-items:center;justify-content:center;margin-top:4rem;}
.cn-photos.cn-in:not(.is-on){transform:translateY(1.5rem);}
.cn-pol{position:relative;transition:all .5s;}
.cn-pol--right{margin-left:-2.5rem;}
.cn-pol--left{transform:rotate(-2deg);}
.cn-pol--right{transform:rotate(2deg);}
.cn-pol--left:hover,.cn-pol--right:hover{transform:rotate(0deg) translateY(-10px) scale(1.05);}
.cn-pol__hat{transform:rotate(-12deg);}
.cn-pol--left:hover .cn-pol__hat{transform:rotate(-12deg) scale(1.15);}
.cn-pol__heart{transform:rotate(8deg);}
.cn-pol--right:hover .cn-pol__heart{transform:rotate(8deg) scale(1.2);}
.cn-pol__frame{position:relative;z-index:1;width:16rem;filter:drop-shadow(0 10px 8px rgb(0 0 0 / .04)) drop-shadow(0 4px 3px rgb(0 0 0 / .1));}
.cn-pol__window{position:absolute;inset:0;z-index:0;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;}
.cn-pol__photo{position:absolute;overflow:hidden;background:#d9d6d2;}
.cn-pol__photo img{width:100%!important;height:100%!important;max-width:none!important;object-fit:cover;filter:grayscale(1);}
.cn-pol__empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-family:var(--cn-hand);font-size:1.1rem;color:#8a8580;}
.cn-pol__hat{position:absolute;top:-.75rem;right:40%;z-index:20;width:4rem;height:5rem;transition:transform .5s;}
.cn-pol__heart{position:absolute;bottom:-.25rem;right:1.5rem;z-index:20;width:3.5rem;height:3.5rem;transition:transform .5s;}
.cn-pol__hat img,.cn-pol__heart img{width:100%!important;height:100%!important;object-fit:contain;}
.cn-pol__hat img{filter:drop-shadow(0 4px 3px rgb(0 0 0 / .07)) drop-shadow(0 2px 2px rgb(0 0 0 / .06));}
.cn-pol__heart img{filter:drop-shadow(0 1px 1px rgb(0 0 0 / .05));}

.cn-doodles{position:relative;width:100%;max-width:24rem;margin:1.25rem auto 0;height:1.5rem;}
.cn-doodles svg{position:absolute;}
.cn-doodles svg:first-child{left:12%;top:0;animation:cn-float 8s ease-in-out infinite;}
.cn-doodles svg:last-child{right:18%;top:.25rem;animation:cn-float 6s ease-in-out infinite;}

.cn-message{margin-top:2.5rem;}
.cn-message.cn-in:not(.is-on){transform:translateY(1.5rem);}
.cn-hand{font-family:var(--cn-hand);color:var(--cn-sage);margin:0 auto;}
.cn-hand--note{font-size:1.25rem;line-height:1.5;max-width:460px;transform:rotate(-.5deg);text-shadow:0 1px 8px rgba(139,154,110,.1);}
.cn-hand--note + .cn-hand--note{margin-top:.75em;}
.cn-details{margin-top:2rem;display:flex;flex-direction:column;gap:.25rem;}
.cn-details.cn-in:not(.is-on){transform:translateY(1.25rem);}
.cn-hand--date{font-size:1.5rem;line-height:1.25;color:var(--cn-sage-strong);transform:rotate(-.3deg);text-shadow:0 1px 10px rgba(139,154,110,.1);}
.cn-hand--venue{font-size:1.25rem;line-height:1.25;color:var(--cn-sage-strong);transform:rotate(.3deg);text-shadow:0 1px 10px rgba(139,154,110,.1);}
.cn-hand--venue a{color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px;text-decoration-color:color-mix(in srgb, currentColor 35%, transparent);}
/* margin-bottom only matters when the page content outgrows one screen (most phones):
   it stops the Dress Code note, pulled up by its -6rem margin, landing on the divider. */
.cn-divider{margin-top:2.5rem;margin-bottom:3rem;display:flex;justify-content:center;}
.cn-divider>div{display:flex;align-items:center;gap:.75rem;}
.cn-divider i{display:block;width:2.5rem;height:1px;background:color-mix(in srgb, #C9A0A0 50%, transparent);}
.cn-hint{opacity:.45;font-style:italic;}

/* ---------- RSVP (RSVP.tsx) ---------- */
.cn-rsvp{position:relative;width:100%;padding:1.5rem .5rem;z-index:10;}
.cn-rsvp__fade{position:absolute;bottom:0;left:0;right:0;height:10rem;pointer-events:none;z-index:0;
  background:linear-gradient(to top, #fff, rgba(255,255,255,.9), transparent);}
.cn-rsvp__inner{position:relative;z-index:10;max-width:480px;margin:0 auto;transition:opacity 2s ease-out, transform 2s ease-out;}
.cn-rsvp__inner:not(.is-on){opacity:0;transform:translateY(2rem);}
.cn-dress{margin-top:-6rem;margin-bottom:2.5rem;text-align:center;transition:opacity 1.5s ease-out, transform 1.5s ease-out;}
.cn-dress:not(.is-on){opacity:0;transform:translateY(1.25rem);}
.cn-script{font-family:var(--cn-script);font-weight:400;color:var(--cn-rose);margin:0;}
.cn-dress .cn-script{font-size:1.125rem;line-height:1.75rem;color:var(--cn-sage);margin-bottom:.5rem;}
.cn-dress .cn-hand--note{padding:0 2rem;max-width:460px;}

.cn-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.875rem 2rem;border-radius:9999px;
  background:rgba(255,255,255,.4);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
  border:1px solid color-mix(in srgb, #D4727A 20%, transparent);color:var(--cn-rose);
  font-family:var(--cn-hand);font-size:1.25rem;line-height:1.75rem;box-shadow:0 4px 24px rgba(0,0,0,.08);
  transition:all .5s;cursor:pointer;white-space:nowrap;}
.cn-btn:hover{background:rgba(255,255,255,.6);box-shadow:0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);}
.cn-btn:focus-visible,.cn-close:focus-visible{outline:2px solid var(--cn-rose);outline-offset:2px;}

.cn-card{background:rgba(255,255,255,.3);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-radius:1rem;
  border:1px solid rgba(255,255,255,.4);box-shadow:0 4px 24px rgba(0,0,0,.08);}
.cn-card--form{padding:1rem;transform:rotate(-.3deg);scroll-margin-top:16px;}
.cn-card--done{padding:1.5rem;text-align:center;}
.cn-card h3{font-family:var(--cn-script);font-weight:400;color:var(--cn-rose);margin:0;font-size:1.5rem;line-height:2rem;}
.cn-card--form h3{text-align:center;margin-bottom:.25rem;text-shadow:0 1px 8px rgba(192,96,110,.1);}
.cn-card__sub{font-family:var(--cn-hand);font-size:1.125rem;line-height:1.75rem;color:var(--cn-sage);text-align:center;margin:0 0 2rem;}
.cn-form{display:flex;flex-direction:column;gap:1.25rem;text-align:left;transform:rotate(.3deg);}
.cn-form label{font-family:var(--cn-hand);font-size:1rem;line-height:1.5rem;color:var(--cn-sage-strong);display:block;margin-bottom:.375rem;}
.cn-field{width:100%;padding:.75rem 1rem;border-radius:.75rem;background:rgba(255,255,255,.5);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
  border:1px solid color-mix(in srgb, #D4727A 15%, transparent);font-family:var(--cn-sans);font-size:16px;line-height:1.25rem;color:#3A3A3A;
  transition:all .15s;outline:none;}
.cn-field::placeholder{color:#a3a8ae;}
.cn-field:focus{border-color:color-mix(in srgb, #D4727A 40%, transparent);box-shadow:0 0 0 2px color-mix(in srgb, #D4727A 10%, transparent);}
select.cn-field{cursor:pointer;}
textarea.cn-field{resize:none;}
.cn-count{font-family:var(--cn-sans);font-size:.75rem;line-height:1rem;color:#a3a8ae;text-align:right;margin:.25rem 0 0;}
.cn-error{font-family:var(--cn-hand);font-size:1.1rem;color:var(--cn-rose);margin:0;text-align:center;}
.cn-actions{display:flex;flex-direction:column;gap:.75rem;padding-top:.5rem;}
.cn-actions .cn-btn{flex:1;padding:.75rem 2rem;background:rgba(255,255,255,.5);}
.cn-actions .cn-btn:hover{background:rgba(255,255,255,.7);}
.cn-actions .cn-btn:disabled{opacity:.6;cursor:default;}
.cn-close{padding:.75rem 2rem;border-radius:9999px;font-family:var(--cn-sans);font-size:.875rem;line-height:1.25rem;color:#5A5A5A;
  border:1px solid #F4A6A3;background:transparent;transition:all .15s;cursor:pointer;white-space:nowrap;}
.cn-close:hover{background:rgba(255,255,255,.4);}
.cn-done{display:flex;flex-direction:column;align-items:center;gap:1rem;}
.cn-done p{font-family:var(--cn-hand);font-size:1.125rem;line-height:1.75rem;color:var(--cn-sage);margin:0;}
.cn-done .cn-close{border:none;padding:0;margin-top:.5rem;color:#C9A0A0;}
.cn-done .cn-close:hover{background:none;color:#E8A0A0;}

.cn-sign{margin-top:3.5rem;text-align:center;}
.cn-sign p:first-child{font-family:var(--cn-hand);font-size:.875rem;line-height:1.25rem;color:color-mix(in srgb, var(--cn-sage) 60%, transparent);margin:0;}
.cn-sign p:last-child{font-family:var(--cn-script);font-size:1.5rem;line-height:2rem;color:var(--cn-rose);margin:.25rem 0 0;text-shadow:0 1px 10px rgba(192,96,110,.12);}

/* ---------- In Bloom: the garden party, on cream paper ---------- */
/* The hero's watercolor melts into paper; everything after sits on it. */
.cn-paper{position:relative;z-index:10;width:100%;padding:4rem 0 3rem;--cn-paper:#fbf7f2;
  background:linear-gradient(to bottom, transparent 0, var(--cn-paper) 9rem, var(--cn-paper) 100%);}
/* the paper's grain, only where it's paper (it fades in with the cream) */
.cn-paper::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:var(--grain);mix-blend-mode:multiply;opacity:.3;
  -webkit-mask-image:linear-gradient(to bottom, transparent 4rem, #000 12rem);mask-image:linear-gradient(to bottom, transparent 4rem, #000 12rem);}
.cn-paper .cn-rsvp{padding:0;}
.cn-paper .cn-rsvp__fade{display:none;}
.cn-paper .cn-card{background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none;border-color:color-mix(in srgb, var(--cn-sage) 18%, transparent);box-shadow:0 18px 40px -26px rgba(80,60,50,.4);}
.cn-paper .cn-btn{background:#fff;}
/* Each section spans the page (its blooms sit at the page's edges); its words stay in a column. */
.cn-sec{position:relative;width:100%;padding:4.5rem 0 0;text-align:center;}
.cn-sec__in{position:relative;z-index:1;max-width:640px;margin:0 auto;padding:0 1.5rem;}
.cn-sec--wide .cn-sec__in{max-width:980px;}
@container cn (max-width: 640px){.cn-sec__in{padding:0 1.75rem;}}
.cn-sec--rsvp{padding-top:5rem;}
.cn-sec__title{position:relative;z-index:1;margin:0 0 1.75rem;font-family:var(--cn-script);font-weight:400;color:var(--cn-rose);font-size:clamp(1.9rem,6.5cqw,2.8rem);line-height:1.2;text-wrap:balance;}
.cn-sec .cn-hand--note{position:relative;z-index:1;}
.cn-body{position:relative;z-index:1;margin:0 auto;max-width:480px;font-family:var(--cn-sans);font-size:15.5px;line-height:1.7;color:color-mix(in srgb, var(--cn-sage) 55%, #3a3a3a);text-wrap:pretty;}

/* the evening: tented place cards */
.cn-cards{position:relative;z-index:1;list-style:none;margin:0 auto;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:1rem;}
.cn-place{position:relative;width:calc(50% - .5rem);max-width:180px;padding:1.6rem 1rem 1.3rem;background:#fff;border-radius:3px;transform:rotate(var(--tilt,0deg));
  box-shadow:0 1px 0 rgba(0,0,0,.04),0 14px 22px -16px rgba(80,60,50,.45);display:flex;flex-direction:column;gap:.15rem;}
/* the fold of a tented card */
.cn-place::before{content:"";position:absolute;left:0;right:0;top:0;height:.7rem;border-radius:3px 3px 0 0;background:linear-gradient(to bottom, color-mix(in srgb, var(--cn-sage) 14%, #fff), #fff);}
.cn-place__time{font-family:var(--cn-hand);font-size:2rem;line-height:1.1;color:var(--cn-rose);}
.cn-place__what{font-family:var(--cn-sans);font-size:15px;font-weight:600;line-height:1.35;color:var(--cn-sage-strong);}
.cn-place__note{font-family:var(--cn-sans);font-size:13px;line-height:1.45;color:color-mix(in srgb, var(--cn-sage) 60%, #555);}

/* what to wear: the motif as watercolor petals */
.cn-petals{position:relative;z-index:1;display:flex;justify-content:center;gap:.9rem;margin-top:1.6rem;}
.cn-petal{display:block;width:44px;height:58px;border-radius:50% 50% 50% 50% / 62% 62% 38% 38%;transform:rotate(calc(-12deg + var(--i,0) * 9deg));
  background:radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--c) 55%, #fff) 0%, var(--c) 58%, color-mix(in srgb, var(--c) 82%, #000) 100%);
  opacity:.92;box-shadow:inset 0 -6px 10px -6px rgba(0,0,0,.18);filter:saturate(.9);}

/* the polaroid wall, pinned with washi tape */
.cn-wall{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,1fr);gap:1.4rem 1rem;max-width:880px;margin:0 auto;}
@container cn (min-width: 768px){.cn-wall{grid-template-columns:repeat(3,1fr);gap:2.2rem 1.6rem;}}
.cn-snap{position:relative;margin:0;padding:.55rem .55rem 1.9rem;background:#fff;transform:rotate(var(--tilt,0deg));box-shadow:0 2px 3px rgba(0,0,0,.06),0 18px 26px -18px rgba(80,60,50,.5);}
.cn-snap img{display:block;width:100%!important;height:auto!important;aspect-ratio:4/5;object-fit:cover;}
.cn-tape{position:absolute;top:-.7rem;left:50%;width:4.6rem;height:1.35rem;translate:-50% 0;rotate:-4deg;opacity:.78;
  clip-path:polygon(0 8%,6% 0,12% 10%,18% 0,24% 8%,30% 0,36% 9%,42% 0,48% 8%,54% 0,60% 10%,66% 0,72% 8%,78% 0,84% 9%,90% 0,96% 8%,100% 0,100% 92%,94% 100%,88% 90%,82% 100%,76% 92%,70% 100%,64% 91%,58% 100%,52% 92%,46% 100%,40% 90%,34% 100%,28% 92%,22% 100%,16% 91%,10% 100%,4% 92%,0 100%);}
.cn-tape--0{background:#f3c9d1;}
.cn-tape--1{background:#cfe0c2;rotate:5deg;}
.cn-tape--2{background:#f6e2b0;rotate:-8deg;}

.cn-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:14px 0 4px;}
.cn-btn--small{font-size:1.05rem;padding:.6rem 1.4rem;}
.cn-faqs{position:relative;z-index:1;display:grid;gap:1.5rem;text-align:left;max-width:520px;margin:0 auto;}
.cn-faq__q{margin:0 0 .25rem;font-family:var(--cn-hand);font-size:1.45rem;line-height:1.2;color:var(--cn-rose);}
.cn-faq .cn-body{margin:0;}

/* the blooms tucked at each section's edge */
.cn-bloom{position:absolute;z-index:0;height:auto;pointer-events:none;max-width:none!important;opacity:.95;}
.cn-bloom--l{left:-1.5%;transform-origin:0% 100%;transform:rotate(var(--turn,0deg));}
.cn-bloom--r{right:-1.5%;transform-origin:100% 100%;transform:rotate(var(--turn,0deg));}
/* Phones: tucked further off the edge and behind a softer wash, so they never sit on the words. */
@container cn (max-width: 640px){.cn-bloom--l{left:-22%;}.cn-bloom--r{right:-22%;}.cn-bloom{--bo:.6;opacity:.6;}}

/* reveals (useReveal adds .rv-on to .cn-paper and .is-in to each section). The site's own
   [data-reveal] rule must not hide them. */
.cn-root [data-reveal]{opacity:1;transform:none;transition:none;will-change:auto;}
.rv-on .cn-sec__title,.rv-on .cn-sec .cn-body,.rv-on .cn-sec .cn-hand--note{opacity:0;transform:translateY(14px);transition:opacity 1.1s ease-out,transform 1.1s cubic-bezier(.2,.7,.2,1);}
.rv-on .is-in .cn-sec__title,.rv-on .is-in .cn-body,.rv-on .is-in .cn-hand--note{opacity:1;transform:none;}
.rv-on .cn-place,.rv-on .cn-snap{opacity:0;transform:translateY(-22px) rotate(calc(var(--tilt,0deg) * -2));transition:opacity .8s ease-out calc(.25s + var(--i,0) * .12s),transform 1.1s cubic-bezier(.3,1.35,.5,1) calc(.25s + var(--i,0) * .12s);}
.rv-on .is-in .cn-place,.rv-on .is-in .cn-snap{opacity:1;transform:rotate(var(--tilt,0deg));}
.rv-on .cn-petal{opacity:0;scale:.3;transition:opacity .9s ease-out calc(.35s + var(--i,0) * .12s),scale 1.1s cubic-bezier(.3,1.5,.5,1) calc(.35s + var(--i,0) * .12s);}
.rv-on .is-in .cn-petal{opacity:.92;scale:1;}
/* the signature: each bloom opens out from its stem, then sways in the breeze */
.rv-on .cn-bloom{opacity:0;scale:.35;rotate:-28deg;transition:opacity 1.4s ease-out var(--bd,0s),scale 2.2s cubic-bezier(.2,.8,.25,1) var(--bd,0s),rotate 2.2s cubic-bezier(.2,.8,.25,1) var(--bd,0s);}
.rv-on .cn-bloom--r{rotate:28deg;}
.rv-on .is-in .cn-bloom{opacity:var(--bo,.95);scale:1;rotate:0deg;animation:cn-sway 7s ease-in-out calc(2.2s + var(--bd,0s)) infinite alternate;}
@keyframes cn-sway{from{rotate:0deg;}to{rotate:-3deg;}}

/* ---------- footer (Footer.tsx) ---------- */
.cn-footer{position:relative;z-index:10;width:100%;padding:1.25rem 1rem;text-align:center;background:color-mix(in srgb, var(--cn-sage) 76%, #000);}
.cn-footer p{font-family:var(--cn-sans);font-size:.875rem;line-height:1.25rem;color:#fff;margin:0;}

/* ---------- sm / md / lg / xl ---------- */
@container cn (min-width: 640px){
  .cn-headline{font-size:3.75rem;}
  .cn-pol--right{margin-left:-3rem;}
  .cn-pol__frame{width:18rem;}
  .cn-hand--note{font-size:1.5rem;}
  .cn-hand--date{font-size:1.875rem;}
  .cn-hand--venue{font-size:1.5rem;}
  .cn-dress .cn-hand--note{padding:0;}
  .cn-card--form{padding:1.5rem;}
  .cn-card--done{padding:2rem;}
  .cn-actions{flex-direction:row;}
}
@container cn (min-width: 768px){
  .cn-main{padding:5rem 1rem;}
  .cn-headline{font-size:4.5rem;}
  .cn-photos{margin-top:5rem;}
  .cn-pol--right{margin-left:0;}
  .cn-pol__frame{width:20rem;}
  .cn-pol__hat{width:6rem;height:8rem;}
  .cn-pol__heart{width:72px;height:72px;}
  .cn-message{margin-top:3.5rem;}
  .cn-hand--note{font-size:26px;}
  .cn-details{margin-top:2.5rem;}
  .cn-hand--date{font-size:2.25rem;}
  .cn-hand--venue{font-size:1.875rem;}
  .cn-rsvp{padding:2.5rem 1rem;}
  .cn-rsvp__fade{height:14rem;}
  .cn-dress{margin-top:-7rem;}
  .cn-dress .cn-script{font-size:1.25rem;}
  .cn-card{border-radius:1.5rem;}
  .cn-card--form{padding:2.5rem;}
  .cn-card--done{padding:3rem;}
  .cn-card h3{font-size:1.875rem;line-height:2.25rem;}
  .cn-sign{margin-top:5rem;}
  .cn-sign p:first-child{font-size:1rem;line-height:1.5rem;}
  .cn-sign p:last-child{font-size:1.875rem;line-height:2.25rem;}
}
@container cn (min-width: 1024px){
  .cn-col{max-width:900px;}
  .cn-headline{font-size:6rem;}
  .cn-pol__frame{width:26rem;}
  .cn-pol__hat{width:7rem;height:9rem;}
  .cn-pol__heart{width:6rem;height:6rem;}
  .cn-hand--note{font-size:1.875rem;max-width:560px;}
  .cn-hand--date{font-size:3rem;}
  .cn-hand--venue{font-size:2.25rem;}
  .cn-dress .cn-hand--note{max-width:560px;}
}
@container cn (min-width: 1280px){
  .cn-headline{font-size:8rem;}
}

/* ---------- intro overlay (rendered on <body>, so viewport media queries) ---------- */
.cn-intro{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;transition:opacity 1.2s ease-out;}
.cn-intro.is-fading{opacity:0;}
.cn-intro .cn-headline{padding:0 1.5rem;text-align:center;}
@media (min-width: 640px){.cn-intro .cn-headline{font-size:3.75rem;}}
@media (min-width: 768px){.cn-intro .cn-headline{font-size:4.5rem;}}
@media (min-width: 1024px){.cn-intro .cn-headline{font-size:6rem;}}

@media (prefers-reduced-motion: reduce){
  .cn-root *,.cn-intro{animation:none!important;transition:none!important;}
  .rv-on .cn-sec__title,.rv-on .cn-body,.rv-on .cn-hand--note,.rv-on .cn-place,.rv-on .cn-snap,.rv-on .cn-petal,.rv-on .cn-bloom{opacity:1!important;transform:none!important;scale:1!important;rotate:0deg!important;}
  .cn-in:not(.is-on),.cn-rsvp__inner:not(.is-on),.cn-dress:not(.is-on){opacity:1;transform:none;}
}
`;
