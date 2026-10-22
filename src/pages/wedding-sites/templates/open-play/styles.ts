// Open Play's styles: a court from above. --op-court is the playing surface (the palette's
// background), --op-line its lines and text (the palette's ink), --op-out the area around it.
// The ball is always optic yellow. Container units, so the scaled builder preview matches.
export const OP_CSS = `
.op{--op-ball:#d8ee4c;--op-card:#ffffff;--op-ink-on-card:#14213a;position:relative;min-height:100svh;padding:clamp(18px,5cqw,56px) clamp(10px,3cqw,40px) 0;overflow-x:clip;container-type:inline-size;
  background:var(--op-out);background-image:radial-gradient(color-mix(in srgb,#fff 6%,transparent) 1px,transparent 1.4px);background-size:7px 7px;color:var(--op-line);font-family:var(--op-body);-webkit-font-smoothing:antialiased}
.op *{box-sizing:border-box}
.op p,.op li{text-wrap:pretty}
.op h1,.op h2{text-wrap:balance}
/* the gallery card: the court fills the card (rendered at galleryWidth), no window-tall page */
.op--gallery{min-height:0}
.op--gallery .op-hero{min-height:330px}
.op--gallery .op-count,.op--gallery .op-session__cta,.op--gallery .op-chips{display:none}
.op--night{--op-card:#162036;--op-ink-on-card:#f3efe4}
.op-mono{font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;letter-spacing:.02em;font-variant-numeric:tabular-nums}
.op-label{margin:0;font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--op-text2)}
.op-text{margin:0;font-size:clamp(15px,3.6cqw,17px);line-height:1.6}
.op-text--lg{font-size:clamp(17px,4.4cqw,21px);line-height:1.55}
.op-small{margin:6px 0 0;font-size:14px;line-height:1.5;color:var(--op-text2)}
.op-hint{margin:8px 0 0;font-size:14px;font-style:italic;opacity:.7}
.op-h2{margin:0 0 18px;font-family:var(--op-display);font-weight:700;font-size:clamp(1.9rem,8.5cqw,3rem);line-height:.95;letter-spacing:.005em;text-transform:uppercase}
.op-in{animation:op-rise .8s cubic-bezier(.2,.8,.2,1) both}
@keyframes op-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

/* the court: a surface with painted side lines; zones stack inside */
.op-court{position:relative;width:min(100%,760px);margin:0 auto;background:var(--op-court);
  background-image:radial-gradient(color-mix(in srgb,#fff 5%,transparent) .8px,transparent 1px);background-size:5px 5px;
  outline:clamp(3px,.8cqw,5px) solid var(--op-line);outline-offset:calc(clamp(3px,.8cqw,5px) * -1);box-shadow:0 30px 70px -40px rgba(0,0,0,.55);animation:op-court .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes op-court{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
.op-zone{position:relative;padding:clamp(22px,6cqw,48px) clamp(18px,5cqw,44px)}

/* hero: two service boxes */
.op-hero{display:grid;grid-template-columns:1fr 1fr;gap:0;padding:0;min-height:clamp(260px,62cqw,460px)}
.op-box--photo{padding:clamp(10px,2.4cqw,18px)}
.op-photo{width:100%;height:100%;min-height:200px;overflow:hidden}
.op-photo img{animation:op-zoom 1.8s cubic-bezier(.2,.8,.2,1) both}
@keyframes op-zoom{from{transform:scale(1.15)}to{transform:none}}
.op-photo--ball{display:grid;place-items:center}
.op-box--words{position:relative;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:clamp(14px,4cqw,34px)}
.op-headline{margin:0;font-family:var(--op-display);font-weight:800;font-size:clamp(2.3rem,11.5cqw,5rem);line-height:.88;letter-spacing:-.005em;text-transform:uppercase}
.op-headline__l{display:block;animation:op-rise .8s cubic-bezier(.2,.8,.2,1) both}
.op-center{position:absolute;background:var(--op-line)}
.op-center--v{left:50%;top:0;bottom:0;width:clamp(2px,.55cqw,4px);margin-left:calc(clamp(2px,.55cqw,4px) / -2);transform-origin:top;transform:scaleY(0);transition:transform 1s cubic-bezier(.7,0,.2,1)!important;opacity:1!important}
.op-center--v.is-in,.op--editor .op-center--v{transform:none}
.op-hero>.op-center--v{transform:none;animation:op-vline 1s cubic-bezier(.7,0,.2,1) .2s both}
@keyframes op-vline{from{transform:scaleY(0)}to{transform:none}}
/* a ball drops into the box and bounces to rest */
.op-drop{position:absolute;right:clamp(10px,3cqw,26px);bottom:clamp(10px,3cqw,26px);animation:op-drop 1.6s cubic-bezier(.3,0,.3,1) .9s both}
.op-drop .op-ball{display:block;animation:op-squash 1.6s ease .9s both}
@keyframes op-drop{0%{transform:translateY(-260px);opacity:0}8%{opacity:1}35%{transform:none}55%{transform:translateY(-60px)}72%{transform:none}84%{transform:translateY(-16px)}100%{transform:none}}
@keyframes op-squash{0%,33%{transform:none}36%{transform:scale(1.15,.8)}42%{transform:none}70%{transform:none}73%{transform:scale(1.08,.9)}78%{transform:none}}

/* the session card: like an open-play booking */
.op-session-zone{padding-top:0}
.op-session{display:grid;gap:8px;padding:clamp(18px,4.5cqw,28px);border-radius:16px;background:var(--op-card);color:var(--op-ink-on-card);box-shadow:0 20px 40px -26px rgba(0,0,0,.6)}
.op-session__top{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:color-mix(in srgb,var(--op-ink-on-card) 70%,transparent)}
.op-session__name{margin:2px 0 0;font-family:var(--op-display);font-weight:700;font-size:clamp(1.6rem,7cqw,2.3rem);line-height:1;text-transform:uppercase}
.op-session__addr{margin:0;color:color-mix(in srgb,var(--op-ink-on-card) 65%,transparent)}
.op-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.op-chip{display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border-radius:999px;background:color-mix(in srgb,var(--op-ink-on-card) 8%,transparent);font-size:13px;font-weight:600}
.op-count{display:flex;gap:14px;margin-top:8px}
.op-count__cell{display:grid}
.op-count__n{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:clamp(1.3rem,5cqw,1.7rem);font-weight:600;line-height:1}
.op-count__l{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;opacity:.6}
.op-count__sep{display:none}
.op-session__cta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin-top:10px}
.op-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 26px;border:2px solid var(--op-ball);border-radius:999px;background:var(--op-ball);color:#14213a;
  font-family:var(--op-display);font-size:17px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:transform .2s,box-shadow .2s}
.op-btn:hover{transform:translateY(-2px);box-shadow:0 10px 20px -10px rgba(0,0,0,.5)}
.op-btn:disabled{opacity:.55;transform:none;cursor:default}
.op-btn--line{background:transparent;color:inherit;border-color:currentColor}
.op-btn--block{width:100%}

/* message */
.op-message{display:grid;gap:14px;max-width:620px}

/* court lines with a ball arcing over */
.op-line{position:relative;height:clamp(3px,.8cqw,5px);opacity:1!important;transform:none!important}
.op-line__paint{position:absolute;inset:0;background:var(--op-line);transform-origin:left;transform:scaleX(0);transition:transform 1.1s cubic-bezier(.7,0,.2,1)}
.op-line.is-in .op-line__paint,.op--editor .op-line__paint{transform:none}
.op-line__label{position:absolute;right:14px;top:10px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.6}
.op-arc{position:absolute;left:4%;bottom:6px;width:24px;height:24px;opacity:0;pointer-events:none}
.op-line.is-in .op-arc{animation:op-arcx 1.25s linear .35s both}
.op-line.is-in .op-arc__y{animation:op-arcy 1.25s ease .35s both}
.op-arc__y{display:block}
@keyframes op-arcx{0%{opacity:1;left:4%}100%{opacity:1;left:88%}}
@keyframes op-arcy{0%{transform:translateY(0)}45%{transform:translateY(-58px)}82%{transform:translateY(0) scale(1)}86%{transform:translateY(0) scale(1.2,.78)}92%{transform:translateY(-8px)}100%{transform:translateY(0)}}

/* the kitchen: a lightly tinted zone */
.op-kitchen{background:color-mix(in srgb,var(--op-ball) 9%,transparent)}
.op-rules{display:grid;gap:10px;margin:0 0 18px;padding:0;list-style:none}
.op-rules li{display:grid;grid-template-columns:30px 1fr;gap:10px;font-size:clamp(15px,3.8cqw,17px);line-height:1.5}
.op-rules .op-mono{font-size:13px;opacity:.7;padding-top:2px}
.op-faq details{border-top:1px solid color-mix(in srgb,var(--op-line) 30%,transparent)}
.op-faq details:last-child{border-bottom:1px solid color-mix(in srgb,var(--op-line) 30%,transparent)}
.op-faq summary{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:56px;list-style:none;cursor:pointer;font-size:16px;font-weight:600}
.op-faq summary::-webkit-details-marker{display:none}
.op-faq summary span{font-size:22px;font-weight:400;transition:transform .3s}
.op-faq details[open] summary span{transform:rotate(45deg)}
.op-faq details p{margin:0 0 16px;font-size:15px;line-height:1.65;color:var(--op-text2)}

/* the net: drops in with a little spring, posts past the side lines */
.op-net{position:relative;height:clamp(26px,6cqw,40px);margin:0 calc(clamp(10px,3cqw,40px) * -1 - 8px);opacity:0;transform:translateY(-26px)}
.rv-on .op-net.is-in,.op--editor .op-net{animation:op-net .9s cubic-bezier(.3,1.6,.5,1) both}
:not(.rv-on)>.op-court .op-net{opacity:1;transform:none}
@keyframes op-net{from{opacity:0;transform:translateY(-26px)}to{opacity:1;transform:none}}
.op-net__mesh{position:absolute;left:8px;right:8px;top:6px;bottom:0;background:repeating-linear-gradient(90deg,rgba(10,15,25,.75) 0 1.4px,transparent 1.4px 7px),repeating-linear-gradient(0deg,rgba(10,15,25,.75) 0 1.4px,transparent 1.4px 7px);background-color:rgba(10,15,25,.25)}
.op-net__tape{position:absolute;left:8px;right:8px;top:0;height:7px;background:#f7f7f2;box-shadow:0 2px 4px rgba(0,0,0,.25)}
.op-net__post{position:absolute;top:-6px;bottom:-4px;width:10px;border-radius:3px;background:#1d2433}
.op-net__post--l{left:0}
.op-net__post--r{right:0}

/* far side */
.op-rounds{display:grid;margin:0;padding:0;list-style:none;border-top:1px solid color-mix(in srgb,var(--op-line) 30%,transparent)}
.op-rounds li{display:grid;grid-template-columns:44px 74px 1fr;gap:10px;align-items:baseline;padding:14px 0;border-bottom:1px solid color-mix(in srgb,var(--op-line) 30%,transparent)}
.op-rounds__r{font-size:12px;color:var(--op-ball)}
.op--night .op-rounds__r,.op-court .op-rounds__r{color:var(--op-ball)}
.op-rounds__t{font-size:14px}
.op-rounds__what b{display:block;font-family:var(--op-display);font-size:clamp(1.2rem,5cqw,1.5rem);font-weight:700;text-transform:uppercase;line-height:1.05}
.op-rounds__what span{display:block;margin-top:3px;font-size:14px;line-height:1.5;color:var(--op-text2)}
.op-food{margin:16px 0 0;font-family:var(--op-display);font-size:clamp(1.3rem,5.5cqw,1.7rem);font-weight:700;text-transform:uppercase;color:var(--op-ball)}
.op-boxes{display:grid;grid-template-columns:1fr;gap:26px}
.op-boxes>.op-center--v{display:none}
@container (min-width:520px){.op-boxes{grid-template-columns:1fr 1fr;gap:0}.op-boxes>.op-box{padding-right:clamp(14px,3cqw,30px)}.op-boxes>.op-box:last-child{padding-left:clamp(14px,3cqw,30px)}.op-boxes>.op-center--v{display:block}}
.op-box{position:relative}
.op-box .op-label{margin-bottom:10px}
.op-swatches{display:flex;gap:8px;margin-top:12px}
.op-swatches span{width:30px;height:30px;border-radius:50%;box-shadow:0 0 0 2px var(--op-line)}
.op-bring{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.op-bring li{display:flex;align-items:center;gap:10px;font-size:clamp(15px,3.8cqw,17px)}
.op-gallery{display:grid;grid-template-columns:1fr 1fr;gap:clamp(8px,2cqw,14px)}
.op-gallery__item{aspect-ratio:4/5;overflow:hidden;border:clamp(3px,.8cqw,5px) solid var(--op-line)}
.op-gallery__item .op-photo{min-height:0}
.op-gallery__item img{transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}
.op-gallery__item:hover img{transform:scale(1.05)}
.op-giftlinks{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px}

/* the far baseline: paddle rack + RSVP */
.op-roster{display:grid;gap:clamp(26px,6cqw,40px)}
.op-rack__head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:10px}
.op-rack__count{font-size:13px}
.op-rack__bar{height:8px;border-radius:4px;background:color-mix(in srgb,var(--op-line) 85%,transparent);box-shadow:0 3px 0 rgba(0,0,0,.18)}
.op-rack__track{overflow-x:auto;overflow-y:hidden;scrollbar-width:none;margin:0 -4px;padding:0 4px 14px}
.op-rack__track::-webkit-scrollbar{display:none}
.op-rack__inner{width:max-content;min-width:100%}
.op-rack__row{display:flex;flex-wrap:nowrap;align-items:flex-start;gap:clamp(4px,1.5cqw,10px);margin:-4px 0 0;padding:0 6px;list-style:none}
.op-rack__slot{flex:none;width:clamp(32px,9.5cqw,54px);transform-origin:top center;animation:op-hang 3.6s ease-in-out infinite alternate;animation-delay:calc(var(--i,0) * -.37s)}
.rv-on .op-rack:not(.is-in) .op-rack__slot{opacity:0;transform:translateY(-40px)}
.rv-on .op-rack.is-in .op-rack__slot:not(.op-rack__slot--empty){animation:op-slide .7s cubic-bezier(.3,1.5,.5,1) both,op-hang 3.6s ease-in-out .8s infinite alternate;animation-delay:calc(var(--i,0) * .08s),calc(var(--i,0) * -.37s)}
.op-rack__slot.is-new{animation:op-slide .8s cubic-bezier(.3,1.6,.5,1) both!important}
@keyframes op-slide{from{opacity:0;transform:translateY(-120%)}to{opacity:1;transform:none}}
@keyframes op-hang{from{transform:rotate(-1.5deg)}to{transform:rotate(1.5deg)}}
.op-rack__slot--empty{opacity:.35;animation:none}
.op-rack__more{align-self:center;padding:0 6px;font-size:15px}
.op-paddle{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 6px 6px rgba(0,0,0,.25))}
.op-paddle__face{stroke:none}
.op-tone-0{fill:var(--op-ball)}.op-tone-1{fill:#f6f5ef}.op-tone-2{fill:#ef7a5a}.op-tone-3{fill:#7fc6e8}
.op-paddle__edge{fill:none;stroke:#1d2433;stroke-width:3}
.op-paddle__logo{fill:none;stroke:#1d2433;stroke-width:2;opacity:.35}
.op-paddle__throat{fill:#1d2433}
.op-paddle__grip{fill:#2a3142}
.op-paddle__name{fill:#fff;font-family:var(--op-display);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.op-paddle--empty .op-paddle__face{fill:transparent;stroke:var(--op-line);stroke-width:2;stroke-dasharray:5 5}
.op-paddle--empty .op-paddle__edge,.op-paddle--empty .op-paddle__throat,.op-paddle--empty .op-paddle__grip{fill:none;stroke:var(--op-line);stroke-dasharray:4 4;stroke-width:1.5}

.op-rsvp{position:relative;padding:clamp(20px,5cqw,34px);border-radius:18px;background:var(--op-card);color:var(--op-ink-on-card)}
.op-rsvp .op-label{color:color-mix(in srgb,var(--op-ink-on-card) 60%,transparent)}
.op-rsvp .op-h2{margin:4px 0 18px}
.op-rsvp .op-small{color:color-mix(in srgb,var(--op-ink-on-card) 65%,transparent)}
.op-form{display:grid;gap:14px}
.op-form label{display:block;margin-bottom:6px;font-size:14px;font-weight:600}
.op-field{width:100%;min-height:50px;padding:12px 14px;border:1.5px solid color-mix(in srgb,var(--op-ink-on-card) 25%,transparent);border-radius:12px;background:transparent;color:var(--op-ink-on-card);font:inherit;font-size:16px}
.op-field:focus{outline:2px solid var(--op-ball);outline-offset:1px;border-color:var(--op-ink-on-card)}
.op-choice{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.op-choice__opt{min-height:56px;border:1.5px solid color-mix(in srgb,var(--op-ink-on-card) 25%,transparent);border-radius:12px;background:transparent;color:var(--op-ink-on-card);font-family:var(--op-display);font-size:18px;font-weight:700;text-transform:uppercase;cursor:pointer}
.op-choice__opt.is-picked{background:var(--op-ball);border-color:var(--op-ball);color:#14213a}
.op-count{flex-wrap:wrap}
.op-count__n:is(button){width:46px;height:46px;border:1.5px solid color-mix(in srgb,var(--op-ink-on-card) 25%,transparent);border-radius:50%;background:transparent;color:var(--op-ink-on-card);font-size:16px;cursor:pointer}
.op-count__n.is-picked{background:var(--op-ball);border-color:var(--op-ball);color:#14213a}
.op-link{display:inline-flex;align-items:center;min-height:40px;padding:0;border:0;background:none;color:inherit;font-size:14px;text-decoration:underline;cursor:pointer;opacity:.75}
.op-error{margin:0;color:#c2412d;font-weight:600}
.op-done{display:grid;justify-items:start;gap:8px}

.op-foot{padding:22px 16px 28px;text-align:center;font-size:13px;color:#fff;opacity:.88}

/* reveals (shared/reveal.ts) */
.rv-on [data-reveal]:not(.op-line):not(.op-net):not(.op-center){opacity:0;transform:translateY(18px);transition:opacity .7s ease,transform .8s cubic-bezier(.2,.8,.2,1)}
.rv-on [data-reveal].is-in:not(.op-line):not(.op-net):not(.op-center){opacity:1;transform:none}

/* balls */
.op-ball{display:inline-block;flex:none;overflow:visible}
.op-ball__body{fill:var(--op-ball);stroke:rgba(20,33,58,.35);stroke-width:1.2}
.op-ball__hole{fill:rgba(20,33,58,.28)}

/* photo placeholders (builder) */
.op .photo-slot--empty{display:grid;place-items:center;width:100%;height:100%;min-height:160px;background:repeating-linear-gradient(45deg,color-mix(in srgb,var(--op-line) 10%,transparent) 0 10px,transparent 10px 20px);color:var(--op-line)}
.op .photo-slot__label{display:grid;justify-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}

@container (max-width:460px){.op-hero{grid-template-columns:1.05fr 1fr}.op-headline{font-size:clamp(1.9rem,11cqw,2.6rem)}.op-rounds li{grid-template-columns:36px 66px 1fr}}
@media (prefers-reduced-motion:reduce){.op *,.op{animation:none!important;transition:none!important}.op-net{opacity:1;transform:none}.op-line__paint,.op-center--v{transform:none}}
`;
