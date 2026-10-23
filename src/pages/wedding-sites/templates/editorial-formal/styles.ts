// Editorial Formal's styles. Colours and fonts are the palette/pairing's (CSS variables set
// by the template); everything here is layout, type and motion. Phones first.
export const EF_CSS = `
.ef{background:var(--ef-bg);color:var(--ef-ink);font-family:var(--ef-body);min-height:100svh;overflow-x:clip;container-type:inline-size;-webkit-font-smoothing:antialiased}
.ef *{box-sizing:border-box}
.ef p,.ef li{text-wrap:pretty}
.ef h1,.ef h2{text-wrap:balance}
.ef-kicker{margin:0;font-size:11.5px;font-weight:600;letter-spacing:.28em;text-transform:uppercase;color:var(--ef-text2)}
.ef-small{font-size:14px;color:var(--ef-text2)}
.ef-dot{display:inline-block;width:4px;height:4px;margin:0 .7em;border-radius:50%;background:currentColor;opacity:.5;vertical-align:middle}

/* hero */
.ef-hero{position:relative;display:grid;justify-items:center;gap:30px;padding:clamp(40px,8cqw,88px) 22px clamp(56px,9cqw,96px);text-align:center;
  background:radial-gradient(130% 80% at 50% 0%,color-mix(in srgb,var(--ef-ink) 5%,transparent),transparent 65%)}
.ef-hero__photo{width:min(78cqw,380px)}
.ef-arch{position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;border-radius:999px 999px 18px 18px;
  box-shadow:0 40px 80px -46px color-mix(in srgb,var(--ef-ink) 60%,transparent);outline:1px solid color-mix(in srgb,var(--ef-muted) 45%,transparent);outline-offset:10px}
.ef-arch img{animation:ef-drift 24s ease-in-out infinite alternate}
@keyframes ef-drift{from{transform:scale(1.04)}to{transform:scale(1.14) translateY(-2%)}}
.ef-arch--date{display:grid;place-content:center;justify-items:center;background:color-mix(in srgb,var(--ef-ink) 6%,var(--ef-bg))}
.ef-arch--date span{font-family:var(--ef-display);font-size:clamp(5rem,26cqw,9rem);line-height:1;font-weight:600}
.ef-arch--date small{margin-top:6px;font-size:13px;letter-spacing:.3em;text-transform:uppercase;color:var(--ef-text2)}
.ef-hero__photo{animation:ef-rise 1.2s cubic-bezier(.2,.8,.2,1) both}
.ef-hero__photo .ef-arch{animation:ef-unveil 1.4s cubic-bezier(.65,0,.2,1) .1s both}
@keyframes ef-unveil{from{clip-path:inset(100% 0 0 0 round 999px 999px 18px 18px)}to{clip-path:inset(0 0 0 0 round 999px 999px 18px 18px)}}
@keyframes ef-rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
.ef-hero__words{display:grid;justify-items:center;gap:16px;max-width:620px}
.ef-names{margin:0;font-family:var(--ef-display);font-weight:500;font-size:clamp(2.6rem,11cqw,5.2rem);line-height:1.02;letter-spacing:-.01em}
.ef-names__row{display:block}
.ef-names__n{display:inline-block;animation:ef-rise 1s cubic-bezier(.2,.8,.2,1) both}
.ef-amp{display:block;margin:.08em 0;font-style:italic;font-size:.55em;color:var(--ef-text2);animation:ef-rise 1s ease .5s both}
.ef-in{animation:ef-rise .9s cubic-bezier(.2,.8,.2,1) both}
.ef-when{margin:6px 0 0;font-size:13px;font-weight:600;letter-spacing:.22em;text-transform:uppercase}
.ef-where{margin:0;font-family:var(--ef-display);font-style:italic;font-size:clamp(1.15rem,3.5cqw,1.4rem);color:var(--ef-text2)}
.ef-count{display:flex;align-items:flex-start;justify-content:center;gap:clamp(10px,3cqw,22px);margin-top:10px}
.ef-count__cell{display:grid;justify-items:center;min-width:52px}
.ef-count__n{font-family:var(--ef-display);font-size:clamp(1.7rem,6cqw,2.4rem);line-height:1;font-variant-numeric:tabular-nums}
.ef-count__l{margin-top:6px;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--ef-text2)}
.ef-count__sep{font-family:var(--ef-display);font-size:1.6rem;line-height:1.1;opacity:.35}
.ef-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 34px;margin-top:8px;border:1px solid var(--ef-ink);border-radius:999px;
  background:var(--ef-ink);color:var(--ef-bg);font-family:var(--ef-body);font-size:13px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:background .3s,color .3s}
.ef-btn:hover{background:transparent;color:var(--ef-ink)}
.ef-btn--block{width:100%;margin-top:6px}
@container (min-width:860px){
  .ef-hero--split{grid-template-columns:1fr 1fr;align-items:center;gap:64px;max-width:1120px;margin:0 auto;text-align:left;justify-items:start;padding-left:40px;padding-right:40px}
  .ef-hero--split .ef-hero__photo{justify-self:center;width:min(100%,420px)}
  .ef-hero--split .ef-hero__words{justify-items:start}
  .ef-hero--split .ef-count{justify-content:flex-start}
  .ef-hero--split .ef-amp{text-align:left}
}

/* sections */
.ef-sec{padding:clamp(64px,10cqw,112px) 22px}
.ef-sec--tint{background:color-mix(in srgb,var(--ef-ink) 4%,var(--ef-bg))}
.ef-title{display:grid;justify-items:center;gap:10px;margin:0 auto clamp(30px,5cqw,48px);text-align:center}
.ef-title h2,.ef-rsvp__h{margin:0;font-family:var(--ef-display);font-weight:500;font-size:clamp(2rem,7cqw,3rem);line-height:1.1}
.ef-orn{width:96px;height:12px;fill:none;stroke:var(--ef-muted);stroke-width:1}
.ef-orn path:last-child{fill:var(--ef-bg)}
.ef-title.is-in .ef-orn path:first-child,.ef-rsvp.is-in .ef-orn path:first-child{animation:ef-draw 1.2s ease .2s both}
@keyframes ef-draw{from{stroke-dasharray:0 120}to{stroke-dasharray:120 0}}

/* story */
.ef-story{display:grid;gap:44px;max-width:1040px;margin:0 auto}
.ef-story__photos{position:relative;width:min(100%,420px);margin:0 auto;aspect-ratio:5/6}
.ef-story__photos.is-empty{display:none}
.ef-story__a{position:absolute;left:0;top:0;width:76%;aspect-ratio:4/5;overflow:hidden;border-radius:4px;box-shadow:0 30px 60px -36px color-mix(in srgb,var(--ef-ink) 55%,transparent)}
.ef-story__b{position:absolute;right:0;bottom:0;width:48%;aspect-ratio:4/5;overflow:hidden;border-radius:4px;border:8px solid var(--ef-bg);box-shadow:0 30px 60px -30px color-mix(in srgb,var(--ef-ink) 60%,transparent);transform:rotate(3deg)}
.ef-story__text{max-width:560px;margin:0 auto;text-align:left}
.ef-story__text .ef-title{justify-items:start;text-align:left;margin-bottom:24px}
.ef-story__text p:not(.ef-kicker){margin:0 0 18px;font-size:17px;line-height:1.85}
/* the first paragraph leads, a little larger (no drop cap: it looks broken beside a short paragraph) */
.ef-story__text p.ef-lede{font-size:clamp(18px,2.2cqw,20px);line-height:1.7;color:var(--ef-ink)}
@container (min-width:860px){.ef-story{grid-template-columns:1fr 1fr;align-items:center;gap:72px}}
.ef-people{max-width:880px;margin:72px auto 0;text-align:center}
.ef-people ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:28px 18px;margin:26px 0 0;padding:0;list-style:none}
.ef-people li{display:grid;justify-items:center;gap:4px}
.ef-people b{font-family:var(--ef-display);font-size:1.3rem;font-weight:500}
.ef-people span{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--ef-text2)}
.ef-people__photo{width:86px;height:86px;margin-bottom:8px;overflow:hidden;border-radius:50%}

/* timeline */
.ef-timeline{position:relative;max-width:560px;margin:0 auto;padding:0;list-style:none}
/* phones: dot and line on the left, the time above each item; wider: time | dot | item */
.ef-timeline::before{content:"";position:absolute;left:5px;top:8px;bottom:8px;width:1px;background:color-mix(in srgb,var(--ef-muted) 60%,transparent);transform-origin:top;transform:scaleY(0);transition:transform 1.6s cubic-bezier(.6,0,.2,1)}
.ef-timeline.is-in::before{transform:none}
.ef-timeline li{position:relative;display:grid;grid-template-columns:11px 1fr;grid-template-areas:"dot time" "dot body";column-gap:20px;row-gap:4px;align-items:start;padding:0 0 30px}
.ef-timeline time{grid-area:time;font-size:12.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ef-text2)}
.ef-timeline li>div{grid-area:body;min-width:0}
.ef-timeline__dot{grid-area:dot;width:11px;height:11px;margin-top:4px;border-radius:50%;border:1px solid var(--ef-ink);background:var(--ef-bg);transform:scale(0);transition:transform .5s cubic-bezier(.3,1.6,.5,1) .3s}
@container (min-width:640px){
  .ef-timeline{max-width:640px}
  .ef-timeline::before{left:175px}
  .ef-timeline li{grid-template-columns:150px 11px 1fr;grid-template-areas:"time dot body";column-gap:20px}
  .ef-timeline time{padding-top:5px;text-align:right;color:var(--ef-ink)}
  .ef-timeline__dot{margin-top:9px}
}
.ef-timeline li.is-in .ef-timeline__dot,.ef--editor .ef-timeline__dot{transform:none}
.ef-timeline b{display:block;font-family:var(--ef-display);font-size:1.35rem;font-weight:500;line-height:1.2}
.ef-timeline p{margin:4px 0 0;font-size:15px;line-height:1.6;color:var(--ef-text2)}

/* venue, travel */
.ef-venue{max-width:560px;margin:0 auto;text-align:center}
.ef-venue__photo{aspect-ratio:16/9;margin-bottom:24px;overflow:hidden;border-radius:6px}
.ef-venue__name{margin:0;font-family:var(--ef-display);font-size:clamp(1.6rem,5cqw,2.2rem)}
.ef-venue__addr{margin:6px 0 0;font-size:16px;color:var(--ef-text2)}
.ef-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;max-width:960px;margin:0 auto}
.ef-card{display:grid;gap:6px;align-content:start;padding:26px 24px;border:1px solid color-mix(in srgb,var(--ef-muted) 40%,transparent);border-radius:6px;background:var(--ef-bg)}
.ef-card b{font-family:var(--ef-display);font-size:1.3rem;font-weight:500}
.ef-card p{margin:0;font-size:15px;line-height:1.6}
.ef-link{display:inline-flex;align-items:center;min-height:44px;color:var(--ef-ink);font-size:14px;font-weight:600}

/* gallery: masonry columns, each photo at its own shape (no gaps) */
.ef-sec--wide{padding-left:12px;padding-right:12px}
.ef-gallery{columns:2;column-gap:10px;max-width:1120px;margin:0 auto}
.ef-gallery__item{position:relative;margin:0 0 10px;overflow:hidden;border-radius:4px;break-inside:avoid}
.ef-gallery__img{width:100%;height:100%}
.ef-gallery__img img{transition:transform 1.4s cubic-bezier(.2,.8,.2,1)}
.ef-gallery__item:hover .ef-gallery__img img{transform:scale(1.05)}
.ef-gallery figcaption{position:absolute;left:0;right:0;bottom:0;padding:24px 14px 10px;background:linear-gradient(transparent,rgba(0,0,0,.5));color:#fff;font-size:13px}
@container (min-width:860px){.ef-gallery{max-width:880px;column-gap:14px}.ef-gallery--many{columns:3;max-width:1120px}.ef-gallery__item{margin-bottom:14px}}

/* gifts, faq */
.ef-center{max-width:560px;margin:0 auto;text-align:center}
.ef-pills{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.ef-pill{display:inline-flex;align-items:center;min-height:46px;padding:0 24px;border:1px solid color-mix(in srgb,var(--ef-ink) 35%,transparent);border-radius:999px;color:var(--ef-ink);font-size:14px;font-weight:600;text-decoration:none;transition:background .25s,color .25s}
.ef-pill:hover{background:var(--ef-ink);color:var(--ef-bg)}
.ef-faq{max-width:640px;margin:0 auto}
.ef-faq details{border-top:1px solid color-mix(in srgb,var(--ef-muted) 40%,transparent)}
.ef-faq details:last-child{border-bottom:1px solid color-mix(in srgb,var(--ef-muted) 40%,transparent)}
.ef-faq summary{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:60px;padding:14px 0;list-style:none;cursor:pointer;font-family:var(--ef-display);font-size:1.2rem}
.ef-faq summary::-webkit-details-marker{display:none}
.ef-faq__plus{position:relative;flex:none;width:14px;height:14px}
.ef-faq__plus::before,.ef-faq__plus::after{content:"";position:absolute;left:0;top:50%;width:14px;height:1px;background:currentColor;transition:transform .3s}
.ef-faq__plus::after{transform:rotate(90deg)}
.ef-faq details[open] .ef-faq__plus::after{transform:rotate(0)}
.ef-faq details p{margin:0 0 18px;font-size:16px;line-height:1.75;color:var(--ef-text2)}

/* rsvp */
.ef-rsvp{position:relative;max-width:520px;margin:0 auto;padding:clamp(34px,7cqw,52px) clamp(22px,6cqw,46px);border:1px solid color-mix(in srgb,var(--ef-muted) 55%,transparent);background:var(--ef-bg);text-align:center;
  box-shadow:0 40px 90px -60px color-mix(in srgb,var(--ef-ink) 50%,transparent)}
.ef-rsvp>.ef-orn{margin:12px auto 26px;display:block}
.ef-rsvp__corner{position:absolute;width:26px;height:26px;border:1px solid var(--ef-ink)}
.ef-rsvp__corner--tl{left:10px;top:10px;border-right:0;border-bottom:0}
.ef-rsvp__corner--br{right:10px;bottom:10px;border-left:0;border-top:0}
.ef-field{width:100%;min-height:50px;padding:12px 16px;border:1px solid color-mix(in srgb,var(--ef-muted) 60%,transparent);border-radius:4px;background:#fff;color:var(--ef-ink);font-family:var(--ef-body)}
.ef-field:focus{outline:2px solid var(--ef-ink);outline-offset:1px}
.ef-choice{cursor:pointer;font-weight:500}
.ef-choice.is-on{background:var(--ef-ink);border-color:var(--ef-ink);color:var(--ef-bg)}

/* builder: the "+ Add" items under a section */
.ef-adds{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:22px}

/* footer */
.ef-foot{padding:46px 22px 34px;background:var(--ef-ink);color:var(--ef-bg);text-align:center}
.ef-foot__names{margin:0 0 10px;font-family:var(--ef-display);font-size:clamp(1.6rem,5cqw,2.2rem)}
.ef-foot__credit{margin:0;font-size:13px;opacity:.85}

/* scroll reveals (shared/reveal.tsx adds .rv-on to the root, .is-in as things arrive) */
.rv-on [data-reveal]{opacity:0;transform:translateY(24px);transition:opacity .9s ease,transform 1s cubic-bezier(.2,.8,.2,1)}
.rv-on [data-reveal].is-in{opacity:1;transform:none}

/* photo placeholders (builder only) */
.photo-slot--empty{display:grid;place-items:center;background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--ef-ink) 5%,var(--ef-bg)) 0 12px,color-mix(in srgb,var(--ef-ink) 8%,var(--ef-bg)) 12px 24px);color:var(--ef-text2)}
.photo-slot__label{display:grid;justify-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.06em}

@media (prefers-reduced-motion:reduce){.ef *{animation:none!important;transition:none!important}}
`;
