// Scrapbook's styles: a linen keepsake album. Colours and fonts are the palette/pairing's
// (CSS variables set by the template). The display font is the handwritten/script accent and
// the names; the body font carries headings and text. Phones first.
export const SB_CSS = `
.sb{position:relative;isolation:isolate;color:var(--sb-ink);font-family:var(--sb-body);min-height:100svh;overflow-x:clip;container-type:inline-size;-webkit-font-smoothing:antialiased;
  background-color:var(--sb-bg);background-image:var(--sb-grain);background-blend-mode:multiply;background-size:280px}
/* faint paper fibres over everything (soft, not woven) */
.sb::before{content:"";position:absolute;inset:0;z-index:-1;background-image:var(--sb-fibres);background-size:420px;opacity:.18;pointer-events:none}
.sb *{box-sizing:border-box}
.sb p,.sb li{text-wrap:pretty}
.sb h1,.sb h2{text-wrap:balance}
.sb-hand{margin:0;font-family:var(--sb-display);font-size:clamp(1.35rem,5vw,1.9rem);line-height:1.15;color:var(--sb-ink)}
.sb-small{font-size:14px;color:var(--sb-text2)}

/* the cover */
.sb-cover{display:grid;gap:30px;max-width:1180px;margin:0 auto;padding:clamp(40px,8vw,90px) 22px clamp(56px,9vw,110px)}
.sb-cover__words{display:grid;justify-items:center;gap:14px;text-align:center}
.sb-names{margin:0;font-family:var(--sb-display);font-weight:400;font-size:clamp(3.6rem,17vw,7.2rem);line-height:.95;color:var(--sb-ink)}
.sb-names__n{display:block;animation:sb-ink 1.2s cubic-bezier(.2,.8,.2,1) both}
.sb-names em{display:block;margin:.02em 0;font-style:normal;font-size:.5em;color:var(--sb-text2)}
@keyframes sb-ink{from{opacity:0;filter:blur(6px);transform:translateY(14px)}to{opacity:1;filter:none;transform:none}}
.sb-cover__line{margin:0;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--sb-text2)}
.sb-in{animation:sb-rise .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes sb-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}

/* the ticket stub */
.sb-ticket{display:flex;max-width:100%;margin-top:10px;filter:drop-shadow(0 14px 18px rgba(60,20,10,.18));transform:rotate(-1.5deg)}
.sb-ticket__main,.sb-ticket__stub{background:#fbf7ee;background-image:var(--sb-grain);background-blend-mode:multiply}
.sb-ticket__main{display:grid;gap:4px;min-width:0;padding:14px clamp(14px,4vw,22px);border-radius:8px 0 0 8px;border:1px solid color-mix(in srgb,var(--sb-ink) 25%,transparent);border-right:2px dashed color-mix(in srgb,var(--sb-ink) 35%,transparent);text-align:left}
.sb-ticket__k{overflow-wrap:anywhere;font-size:10.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--sb-text2)}
.sb-ticket__d{font-size:clamp(1.3rem,5vw,1.7rem);font-weight:600;letter-spacing:.06em;font-variant-numeric:tabular-nums}
.sb-ticket__stub{display:grid;flex:none;place-content:center;justify-items:center;min-width:64px;padding:10px 12px;border-radius:0 8px 8px 0;border:1px solid color-mix(in srgb,var(--sb-ink) 25%,transparent);border-left:0;background-color:var(--sb-ink);color:var(--sb-bg)}
.sb-ticket__stub span{font-size:11px;font-weight:600;letter-spacing:.2em}
.sb-ticket__stub b{font-size:1.9rem;line-height:1;font-weight:600}
.sb-count{display:flex;gap:16px;justify-content:center;margin-top:4px}
.sb-count__cell{display:grid;justify-items:center}
.sb-count__n{font-family:var(--sb-body);font-size:clamp(1.5rem,5.5vw,2rem);font-weight:500;line-height:1;font-variant-numeric:tabular-nums}
.sb-count__l{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--sb-text2)}
.sb-count__sep{display:none}
.sb-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 30px;margin-top:6px;border:1px solid var(--sb-ink);border-radius:999px;background:var(--sb-ink);color:var(--sb-bg);
  font-family:var(--sb-body);font-size:13px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:background .3s,color .3s}
.sb-btn:hover{background:transparent;color:var(--sb-ink)}
.sb-btn--block{width:100%;margin-top:6px}

/* the cover collage */
.sb-cover__collage{position:relative;width:min(100%,520px);margin:0 auto;aspect-ratio:1/1}
.sb-print.sb-cover__p1{position:absolute;left:2%;top:3%;width:58%}
.sb-print.sb-cover__p2{position:absolute;right:0;top:26%;width:44%;z-index:2}
.sb-cover__note{position:absolute;left:6%;bottom:0;width:46%;z-index:3;--tilt:-3deg}
.sb-cover__note .st-paper__body{padding:16px 18px}
.sb-cover__note-d{margin:4px 0 0;font-size:12px;font-weight:600;letter-spacing:.22em;color:var(--sb-text2)}
.sb-cover__sprig{position:absolute;right:6%;top:-4%;width:24%;z-index:0}
.sb-drop{animation:sb-drop 1.1s cubic-bezier(.2,.9,.25,1.05) both}
@keyframes sb-drop{from{opacity:0;transform:translateY(-36px) rotate(calc(var(--tilt,0deg) + 8deg)) scale(1.06)}to{opacity:1;transform:rotate(var(--tilt,0deg))}}
@media (min-width:900px){
  .sb-cover{grid-template-columns:1fr 1.05fr;align-items:center;gap:40px;padding-left:40px;padding-right:40px}
  .sb-cover__words{justify-items:start;text-align:left}
  .sb-names em{margin-left:.6em}
  .sb-count{justify-content:flex-start}
}

/* prints, tape, corners */
.sb-print{position:relative;margin:0;padding:10px 10px 12px;background:#fdfaf3;background-image:var(--sb-grain);background-blend-mode:multiply;transform:rotate(var(--tilt,0deg));
  box-shadow:0 1px 1px rgba(40,15,5,.25),0 16px 30px -14px rgba(40,15,5,.45),0 40px 60px -40px rgba(40,15,5,.35)}
.sb-print__photo{overflow:hidden;background:#e9e2d4}
.sb-print__img{width:100%;height:100%}
.sb-print__img img{filter:saturate(.92) contrast(1.02) sepia(.06)}
.sb-print figcaption{margin-top:8px;font-family:var(--sb-display);font-size:1.15rem;text-align:center}
.sb-tape{position:absolute;z-index:2;width:38%;height:26px;background:color-mix(in srgb,var(--sb-ink) 14%,#f2e6cf);opacity:.86;
  background-image:repeating-linear-gradient(90deg,transparent 0 8px,rgba(255,255,255,.22) 8px 10px);
  clip-path:polygon(0 8%,4% 0,9% 10%,14% 0,20% 8%,80% 6%,86% 0,91% 9%,96% 0,100% 10%,100% 92%,95% 100%,90% 90%,84% 100%,78% 92%,22% 94%,16% 100%,10% 90%,5% 100%,0 92%);
  box-shadow:0 1px 2px rgba(0,0,0,.08)}
.sb-tape--top{left:31%;top:-12px;transform:rotate(-3deg)}
.sb-tape--tl{left:-6%;top:6px;transform:rotate(-38deg)}
.sb-tape--tr{right:-6%;top:6px;transform:rotate(38deg)}
.sb-corner{position:absolute;z-index:2;width:28px;height:28px;background:color-mix(in srgb,var(--sb-ink) 82%,#000)}
.sb-corner--tl{left:2px;top:2px;clip-path:polygon(0 0,100% 0,0 100%)}
.sb-corner--tr{right:2px;top:2px;clip-path:polygon(0 0,100% 0,100% 100%)}
.sb-corner--bl{left:2px;bottom:2px;clip-path:polygon(0 0,100% 100%,0 100%)}
.sb-corner--br{right:2px;bottom:2px;clip-path:polygon(100% 0,100% 100%,0 100%)}
/* dropping onto the page as it scrolls in */
.rv-on .sb-print[data-reveal]{opacity:0;transform:translateY(-30px) rotate(calc(var(--tilt,0deg) + 7deg)) scale(1.05);transition:opacity .6s ease,transform 1s cubic-bezier(.2,.9,.25,1.08)}
.rv-on .sb-print[data-reveal].is-in{opacity:1;transform:rotate(var(--tilt,0deg))}
.sb-print .sb-tape{transition:opacity .4s ease .5s}
.rv-on .sb-print[data-reveal]:not(.is-in) .sb-tape{opacity:0}

/* sprigs: drawn in, leaf by leaf */
.sb-sprig{display:block;overflow:visible}
.sb-sprig__stem{fill:none;stroke:var(--sb-ink);stroke-width:1.4;stroke-linecap:round;stroke-dasharray:240;animation:sb-stem 2.2s ease .2s both;opacity:.7}
.sb-sprig__leaf{fill:color-mix(in srgb,var(--sb-ink) 22%,transparent);stroke:var(--sb-ink);stroke-width:.9;opacity:0;transform-box:fill-box;transform-origin:left bottom;animation:sb-leaf .7s ease both}
.sb-sprig__bud{fill:var(--sb-ink);opacity:.75}
@keyframes sb-stem{from{stroke-dashoffset:240}to{stroke-dashoffset:0}}
@keyframes sb-leaf{from{opacity:0;transform:scale(.3)}to{opacity:.85;transform:none}}

/* pages */
.sb-page{max-width:1120px;margin:0 auto;padding:clamp(60px,10vw,110px) 22px}
.sb-page--deep{max-width:none;background-color:color-mix(in srgb,var(--sb-ink) 6%,var(--sb-bg));background-image:var(--sb-grain);background-blend-mode:multiply}
.sb-page--deep>*{max-width:1120px;margin-left:auto;margin-right:auto}
.sb-head{display:grid;justify-items:center;gap:2px;margin-bottom:clamp(30px,5vw,48px);text-align:center}
.sb-head h2{margin:0;font-family:var(--sb-body);font-weight:500;font-size:clamp(2.1rem,8vw,3.4rem);line-height:1;letter-spacing:-.01em}

/* story */
.sb-story{display:grid;gap:40px}
.sb-story__prints{position:relative;width:min(100%,460px);margin:0 auto;aspect-ratio:1/1}
.sb-story__prints>.sb-print:first-child{position:absolute;left:0;top:0;width:62%}
.sb-story__p2{position:absolute!important;right:0;bottom:0;width:52%;z-index:2}
.sb-story__sprig{position:absolute;left:-4%;bottom:-6%;width:26%;z-index:3}
.sb-story__text .sb-head{justify-items:start;text-align:left}
.sb-letter{--tilt:.8deg}
.sb-letter .st-paper__body{padding:clamp(28px,6cqw,44px);text-align:left}
.sb-letter p{margin:0 0 16px;font-size:17px;line-height:1.8}
.sb-sign{margin-top:6px;text-align:right}
@media (min-width:900px){.sb-story{grid-template-columns:1fr 1fr;align-items:center;gap:64px}}
.sb-people{margin:64px auto 0;text-align:center}
.sb-people ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:22px;margin:20px 0 0;padding:0;list-style:none}
.sb-people li{display:grid;justify-items:center;gap:2px}
.sb-people b{font-size:1.15rem;font-weight:600}
.sb-people span{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--sb-text2)}
.sb-people__photo{width:84px;height:84px;margin-bottom:8px;overflow:hidden;border-radius:50%;border:4px solid #fdfaf3}

/* the day: cards pinned along a thread */
.sb-day{position:relative;display:grid;gap:22px;max-width:640px;margin:0 auto;padding:0;list-style:none}
.sb-day::before{content:"";position:absolute;left:20px;top:10px;bottom:10px;border-left:1.5px dashed color-mix(in srgb,var(--sb-ink) 40%,transparent)}
.sb-day li{position:relative;display:grid;gap:2px;margin-left:44px;padding:18px 20px;background:#fdfaf3;background-image:var(--sb-grain);background-blend-mode:multiply;transform:rotate(var(--tilt,0deg));
  box-shadow:0 1px 1px rgba(40,15,5,.2),0 14px 26px -16px rgba(40,15,5,.4)}
.sb-day__pin{position:absolute;left:-31px;top:24px;width:14px;height:14px;border-radius:50%;background:var(--sb-ink);box-shadow:0 0 0 4px color-mix(in srgb,var(--sb-ink) 18%,transparent)}
.sb-day time{font-family:var(--sb-body);font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--sb-text2)}
.sb-day b{font-size:1.25rem;font-weight:600}
.sb-day p{margin:2px 0 0;font-size:15px;line-height:1.6;color:var(--sb-text2)}

/* the postcard */
.sb-postcard{display:grid;max-width:880px;margin:0 auto;background:#fdfaf3;background-image:var(--sb-grain);background-blend-mode:multiply;transform:rotate(-.8deg);
  box-shadow:0 1px 1px rgba(40,15,5,.2),0 24px 40px -22px rgba(40,15,5,.45)}
.sb-postcard__photo{aspect-ratio:4/3;margin:12px 12px 0;overflow:hidden}
.sb-postcard__back{position:relative;padding:24px 24px 28px;background-image:repeating-linear-gradient(transparent 0 33px,color-mix(in srgb,var(--sb-ink) 16%,transparent) 33px 34px);background-position:0 60px}
.sb-postcard__name{margin:0;padding-right:96px;font-size:clamp(1.5rem,5vw,2rem);font-weight:600;line-height:1.1}
.sb-postcard__addr{margin:8px 0 0;padding-right:96px;font-size:16px;color:var(--sb-text2)}
.sb-stamp{position:absolute;right:20px;top:20px;display:grid;place-items:center;width:62px;height:76px;padding:5px;background:radial-gradient(circle at 50% 50%,#fff 0 0) padding-box;
  -webkit-mask:radial-gradient(circle 4px at 4px 4px,transparent 98%,#000) -4px -4px/8px 8px;mask:radial-gradient(circle 4px at 4px 4px,transparent 98%,#000) -4px -4px/8px 8px;background-color:#fdfaf3}
.sb-stamp span{display:grid;place-items:center;width:100%;height:100%;background:var(--sb-ink);color:var(--sb-bg);font-size:13px;font-weight:700;letter-spacing:.08em}
.sb-postmark{position:absolute;right:54px;top:62px;display:grid;place-items:center;width:84px;height:84px;border:1.5px solid color-mix(in srgb,var(--sb-ink) 55%,transparent);border-radius:50%;
  font-size:9.5px;font-weight:700;letter-spacing:.08em;color:color-mix(in srgb,var(--sb-ink) 70%,transparent);transform:rotate(-14deg);pointer-events:none}
@media (min-width:900px){.sb-postcard{grid-template-columns:1.1fr 1fr}.sb-postcard__photo{margin:12px 0 12px 12px}.sb-postcard__back{display:flex;flex-direction:column;justify-content:center;padding:36px}}

/* index cards */
.sb-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:22px}
.sb-index{position:relative;display:grid;gap:6px;align-content:start;padding:26px 22px 22px;background:#fdfaf3;background-image:repeating-linear-gradient(transparent 0 27px,color-mix(in srgb,#4a7fb0 18%,transparent) 27px 28px),var(--sb-grain);
  background-position:0 62px,0 0;background-blend-mode:normal,multiply;transform:rotate(var(--tilt,0deg));box-shadow:0 1px 1px rgba(40,15,5,.2),0 16px 28px -18px rgba(40,15,5,.4)}
.sb-index .sb-hand{font-size:1.3rem}
.sb-index b{font-size:1.2rem;font-weight:600}
.sb-index p{margin:0;font-size:15px;line-height:1.75}
.sb-link{display:inline-flex;align-items:center;min-height:44px;color:var(--sb-ink);font-weight:600;font-size:14px}

/* the album */
.sb-album{display:grid;grid-template-columns:repeat(2,1fr);gap:28px 18px;align-items:start}
.sb-album__p:nth-child(even){margin-top:24px}
.sb-album--two{max-width:760px;margin:0 auto}
@media (min-width:900px){.sb-album:not(.sb-album--two){grid-template-columns:repeat(3,1fr);gap:44px 36px}.sb-album:not(.sb-album--two) .sb-album__p:nth-child(even){margin-top:0}.sb-album:not(.sb-album--two) .sb-album__p:nth-child(3n+2){margin-top:46px}.sb-album--two{gap:44px 40px}}

/* gifts */
.sb-gifts{max-width:640px;margin:0 auto;text-align:center}
.sb-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:18px}
.sb-giftag{position:relative;display:inline-flex;align-items:center;gap:12px;min-height:54px;padding:0 26px 0 22px;background:#fdfaf3;background-image:var(--sb-grain);background-blend-mode:multiply;color:var(--sb-ink);font-weight:600;text-decoration:none;
  clip-path:polygon(14px 0,100% 0,100% 100%,14px 100%,0 50%);transform:rotate(var(--tilt,0deg));filter:drop-shadow(0 8px 10px rgba(40,15,5,.18));transition:transform .3s}
.sb-giftag:hover{transform:rotate(0) translateY(-2px)}
.sb-giftag__hole{width:9px;height:9px;border-radius:50%;background:var(--sb-bg);box-shadow:inset 0 1px 2px rgba(0,0,0,.25)}

/* questions on notebook paper */
.sb-notebook{position:relative;max-width:720px;margin:0 auto;padding:22px 22px 22px 52px;background:#fdfcf8;
  background-image:linear-gradient(90deg,transparent 36px,color-mix(in srgb,#c0392b 45%,transparent) 36px 37.5px,transparent 37.5px),repeating-linear-gradient(transparent 0 31px,color-mix(in srgb,#4a7fb0 20%,transparent) 31px 32px);
  box-shadow:0 1px 1px rgba(40,15,5,.15),0 24px 40px -26px rgba(40,15,5,.4);transform:rotate(.4deg)}
.sb-notebook details{border-bottom:1px solid transparent}
.sb-notebook summary{display:flex;justify-content:space-between;gap:14px;min-height:56px;align-items:center;list-style:none;cursor:pointer;font-family:var(--sb-body);font-style:italic;font-weight:600;font-size:clamp(1.1rem,4vw,1.3rem)}
.sb-notebook summary::-webkit-details-marker{display:none}
.sb-notebook summary span{flex:none;font-family:var(--sb-body);font-size:22px;font-weight:300;transition:transform .3s}
.sb-notebook details[open] summary span{transform:rotate(45deg)}
.sb-notebook p{margin:0 0 14px;font-size:16px;line-height:2;color:var(--sb-text2)}

/* rsvp */
.sb-rsvp{position:relative;max-width:540px;margin:0 auto}
.sb-rsvp__sprig{position:absolute;right:-6%;top:-12%;width:22%;z-index:3}
.sb-rsvp__card{--tilt:-.6deg}
.sb-rsvp__card .st-paper__body{padding:clamp(30px,7cqw,48px) clamp(22px,6cqw,42px)}
.sb-rsvp__h{margin:2px 0 24px;font-family:var(--sb-body);font-weight:500;font-size:clamp(1.9rem,7vw,2.6rem);line-height:1.05}
.sb-field{width:100%;min-height:50px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--sb-ink) 30%,transparent);border-radius:6px;background:rgba(255,255,255,.65);color:var(--sb-ink);font-family:var(--sb-body)}
.sb-field:focus{outline:2px solid var(--sb-ink);outline-offset:1px}
.sb-choice{cursor:pointer;font-weight:600}
.sb-choice.is-on{background:var(--sb-ink);border-color:var(--sb-ink);color:var(--sb-bg)}

/* footer */
.sb-foot{padding:50px 22px 36px;text-align:center;background:var(--sb-ink);color:var(--sb-bg)}
.sb-foot .sb-hand{color:var(--sb-bg);opacity:.8}
.sb-foot__names{margin:4px 0 14px;font-family:var(--sb-display);font-size:clamp(2.2rem,8vw,3.2rem);line-height:1}
.sb-foot__credit{margin:0;font-size:13px;opacity:.85}

/* reveals (shared/reveal.ts) */
.rv-on [data-reveal]:not(.sb-print){opacity:0;transform:translateY(22px) rotate(var(--tilt,0deg));transition:opacity .9s ease,transform 1s cubic-bezier(.2,.8,.2,1)}
.rv-on [data-reveal]:not(.sb-print).is-in{opacity:1;transform:rotate(var(--tilt,0deg))}

/* photo placeholders (builder only) */
.photo-slot--empty{display:grid;place-items:center;width:100%;height:100%;min-height:120px;background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--sb-ink) 6%,#efe6d6) 0 12px,color-mix(in srgb,var(--sb-ink) 10%,#efe6d6) 12px 24px);color:var(--sb-text2)}
.photo-slot__label{display:grid;justify-items:center;gap:8px;font-size:13px;font-weight:600}

@media (prefers-reduced-motion:reduce){.sb *{animation:none!important;transition:none!important}}
`;
