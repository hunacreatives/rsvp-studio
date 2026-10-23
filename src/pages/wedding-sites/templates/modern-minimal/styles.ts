// Modern Minimal's styles: a strict grid, heavy sans type, hairline rules, crisp motion.
// Colours and fonts are the palette/pairing's (CSS variables). Phones first.
export const MM_CSS = `
.mm{background:var(--mm-bg);color:var(--mm-ink);font-family:var(--mm-body);min-height:100svh;overflow-x:clip;container-type:inline-size;-webkit-font-smoothing:antialiased}
.mm *{box-sizing:border-box}
.mm p,.mm li{text-wrap:pretty}
.mm h1,.mm h2{text-wrap:balance}
.mm-meta{margin:0;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--mm-text2)}
.mm-small{margin:4px 0 0;font-size:14px;line-height:1.55;color:var(--mm-text2)}
.mm-num{font-size:12px;font-weight:600;letter-spacing:.06em;font-variant-numeric:tabular-nums;color:var(--mm-text2)}

/* hero */
.mm-hero{display:grid;gap:28px;padding:clamp(28px,6cqw,64px) 20px clamp(36px,6cqw,64px);max-width:1280px;margin:0 auto}
.mm-hero__photo{order:-1}
.mm-hero__img{width:100%;aspect-ratio:4/5;overflow:hidden;animation:mm-wipe 1.3s cubic-bezier(.7,0,.2,1) .05s both}
.mm-hero__img img{animation:mm-zoom 2.2s cubic-bezier(.2,.8,.2,1) both}
@keyframes mm-wipe{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0)}}
@keyframes mm-zoom{from{transform:scale(1.18)}to{transform:scale(1)}}
.mm-names{margin:14px 0 0;font-family:var(--mm-body);font-weight:700;font-size:clamp(3rem,15cqw,7.4rem);line-height:.92;letter-spacing:-.045em}
.mm-line{display:block;overflow:hidden;padding-bottom:.06em}
.mm-line>span{display:inline-block;animation:mm-up 1s cubic-bezier(.2,.8,.2,1) both}
@keyframes mm-up{from{transform:translateY(105%)}to{transform:none}}
.mm-amp{font-family:var(--mm-display);font-style:italic;font-weight:400;letter-spacing:0;color:var(--mm-text2)}
.mm-in{animation:mm-fade .9s ease both}
@keyframes mm-fade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.mm-hero__facts{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:30px;padding-top:18px;border-top:1px solid var(--mm-ink)}
.mm-big{margin:6px 0 0;font-size:clamp(1.6rem,6cqw,2.4rem);font-weight:600;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
.mm-big--text{font-size:clamp(1.2rem,4.5cqw,1.6rem);letter-spacing:-.02em;line-height:1.15}
.mm-hero__cta{display:flex;flex-wrap:wrap;align-items:center;gap:18px 28px;margin-top:28px}
.mm-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 28px;border:1px solid var(--mm-ink);background:var(--mm-ink);color:var(--mm-bg);
  font-family:var(--mm-body);font-size:14px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:background .25s,color .25s}
.mm-btn:hover{background:transparent;color:var(--mm-ink)}
.mm-btn span{transition:transform .25s}
.mm-btn:hover span{transform:translateX(4px)}
.mm-btn--block{width:100%;margin-top:4px}
.mm-count{display:flex;align-items:baseline;gap:8px;font-variant-numeric:tabular-nums}
.mm-count__cell{display:flex;align-items:baseline;gap:3px}
.mm-count__n{font-size:20px;font-weight:600;letter-spacing:-.02em}
.mm-count__l{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--mm-text2)}
.mm-count__l::first-letter{font-size:inherit}
.mm-count__sep{display:none}
@container (min-width:900px){
  .mm-hero{grid-template-columns:1.15fr .85fr;align-items:end;gap:56px;padding:56px 40px 64px}
  .mm-hero__photo{order:0}
  .mm-hero__img{aspect-ratio:3/4}
}

/* the scrolling band */
.mm-band{overflow:hidden;border-top:1px solid var(--mm-ink);border-bottom:1px solid var(--mm-ink);padding:14px 0}
.mm-band__track{display:flex;width:max-content;animation:mm-band 38s linear infinite}
.mm-band__track span{white-space:nowrap;font-size:clamp(14px,2.4cqw,18px);font-weight:600;letter-spacing:.04em;text-transform:uppercase}
@keyframes mm-band{to{transform:translateX(-50%)}}

/* numbered sections */
.mm-sec{position:relative;max-width:1280px;margin:0 auto;padding:clamp(48px,8cqw,96px) 20px}
.mm-sec--tint{max-width:none;background:color-mix(in srgb,var(--mm-ink) 4%,var(--mm-bg))}
.mm-sec--tint>*{max-width:1240px;margin-left:auto;margin-right:auto}
.mm-sec__rule{height:1px;background:var(--mm-ink);margin-bottom:22px;transform-origin:left;transform:scaleX(0);transition:transform 1.2s cubic-bezier(.7,0,.2,1)!important;opacity:1!important}
.mm-sec__rule.is-in,.mm--editor .mm-sec__rule{transform:none}
.mm-sec__grid{display:grid;gap:22px}
.mm-sec__label{display:flex;align-items:baseline;gap:14px}
.mm-sec__label h2{margin:0;font-size:clamp(1.9rem,7cqw,3rem);font-weight:700;letter-spacing:-.04em;line-height:1}
@container (min-width:900px){
  .mm-sec{padding-left:40px;padding-right:40px}
  .mm-sec__grid{grid-template-columns:minmax(220px,1fr) 2.2fr;gap:48px}
  .mm-sec__label{flex-direction:column;gap:10px;position:sticky;top:28px;align-self:start}
}
.mm-lede{margin:0 0 22px;font-size:clamp(1.3rem,3.6cqw,1.75rem);font-weight:500;line-height:1.4;letter-spacing:-.015em}
.mm-p{margin:0 0 18px;max-width:62ch;font-size:16.5px;line-height:1.75;color:var(--mm-text2)}
.mm-people{display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin:34px 0 0;padding:0;list-style:none;border-top:1px solid color-mix(in srgb,var(--mm-ink) 25%,transparent)}
.mm-people li{display:grid;gap:2px;padding:16px 12px 16px 0;border-bottom:1px solid color-mix(in srgb,var(--mm-ink) 25%,transparent)}
.mm-people b{font-size:16px;font-weight:600}
.mm-people span{font-size:13px;color:var(--mm-text2)}
.mm-people__photo{width:64px;height:64px;margin-bottom:8px;overflow:hidden}
@container (min-width:900px){.mm-people{grid-template-columns:repeat(4,1fr)}}

/* schedule */
.mm-sched{margin:0;padding:0;list-style:none}
.mm-sched li{display:grid;grid-template-columns:76px 1fr;gap:16px;padding:18px 0;border-bottom:1px solid color-mix(in srgb,var(--mm-ink) 22%,transparent)}
.mm-sched li:first-child{padding-top:0}
.mm-sched time{font-size:clamp(1.15rem,3.4cqw,1.5rem);font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.mm-sched b{display:block;font-size:clamp(1.1rem,3.2cqw,1.35rem);font-weight:600;letter-spacing:-.015em}
.mm-sched p{margin:4px 0 0;font-size:15px;line-height:1.6;color:var(--mm-text2)}

/* venue, travel, gifts */
.mm-venue__photo{aspect-ratio:16/9;margin-bottom:18px;overflow:hidden}
.mm-venue__name{margin:0;font-size:clamp(1.6rem,5cqw,2.4rem);font-weight:700;letter-spacing:-.035em;line-height:1.05}
.mm-list{display:grid;gap:0;border-top:1px solid color-mix(in srgb,var(--mm-ink) 25%,transparent)}
.mm-item{display:grid;gap:4px;padding:20px 0;border-bottom:1px solid color-mix(in srgb,var(--mm-ink) 25%,transparent)}
.mm-item b{font-size:18px;font-weight:600}
.mm-item p{margin:0;font-size:15px;line-height:1.6}
.mm-link{display:inline-flex;align-items:center;min-height:44px;color:var(--mm-ink);font-size:14px;font-weight:600}
@container (min-width:900px){.mm-list{grid-template-columns:1fr 1fr;column-gap:32px}}
.mm-links{display:grid;border-top:1px solid var(--mm-ink)}
.mm-links a{display:flex;align-items:center;justify-content:space-between;min-height:62px;border-bottom:1px solid var(--mm-ink);color:var(--mm-ink);font-size:clamp(1.1rem,3.2cqw,1.35rem);font-weight:600;letter-spacing:-.015em;text-decoration:none;transition:padding .3s}
.mm-links a:hover{padding-left:10px}

/* gallery: a strict grid, uniform tiles, numbered */
.mm-gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.mm-gallery__item{margin:0}
.mm-gallery__img{aspect-ratio:4/5;overflow:hidden}
.mm-gallery__img img{transition:transform 1.2s cubic-bezier(.2,.8,.2,1),filter .6s}
.mm-gallery__item:hover .mm-gallery__img img{transform:scale(1.04)}
.mm-gallery figcaption{margin-top:6px;font-size:12px;color:var(--mm-text2)}
@container (min-width:900px){.mm-gallery{grid-template-columns:repeat(3,1fr);gap:14px}.mm-gallery__item:nth-child(3n+2){transform:translateY(36px)}.rv-on .mm-gallery__item:nth-child(3n+2).is-in{transform:translateY(36px)}}

/* faq */
.mm-faq{border-top:1px solid var(--mm-ink)}
.mm-faq details{border-bottom:1px solid var(--mm-ink)}
.mm-faq summary{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px;padding:14px 0;list-style:none;cursor:pointer;font-size:clamp(1.05rem,3cqw,1.25rem);font-weight:600;letter-spacing:-.01em}
.mm-faq summary::-webkit-details-marker{display:none}
.mm-faq__x{flex:none;font-size:24px;font-weight:300;line-height:1;transition:transform .3s}
.mm-faq details[open] .mm-faq__x{transform:rotate(45deg)}
.mm-faq details p{margin:0 0 20px;max-width:62ch;font-size:16px;line-height:1.7;color:var(--mm-text2)}

/* rsvp */
.mm-rsvp{max-width:560px}
.mm-rsvp__h{margin:0 0 22px;font-size:clamp(1.8rem,6cqw,2.6rem);font-weight:700;letter-spacing:-.04em;line-height:1}
.mm-field{width:100%;min-height:52px;padding:12px 14px;border:0;border-bottom:1px solid var(--mm-ink);border-radius:0;background:transparent;color:var(--mm-ink);font-family:var(--mm-body)}
.mm-field:focus{outline:none;border-bottom-width:2px}
.mm-choice{border:1px solid var(--mm-ink);cursor:pointer;font-weight:600}
.mm-choice.is-on{background:var(--mm-ink);color:var(--mm-bg)}

/* footer */
.mm-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px 24px;padding:24px 20px;background:var(--mm-ink);color:var(--mm-bg);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.mm-foot__credit{flex-basis:100%;font-weight:500;letter-spacing:.04em;opacity:.85}
@container (min-width:900px){.mm-foot{padding:26px 40px}.mm-foot__credit{flex-basis:auto}}

/* scroll reveals (shared/reveal.tsx) */
.rv-on [data-reveal]{opacity:0;transform:translateY(20px);transition:opacity .8s ease,transform .9s cubic-bezier(.2,.8,.2,1)}
.rv-on [data-reveal].is-in{opacity:1;transform:none}

/* photo placeholders (builder only) */
.photo-slot--empty{display:grid;place-items:center;background:repeating-linear-gradient(90deg,color-mix(in srgb,var(--mm-ink) 6%,var(--mm-bg)) 0 1px,transparent 1px 22px),color-mix(in srgb,var(--mm-ink) 3%,var(--mm-bg));color:var(--mm-text2);border:1px dashed color-mix(in srgb,var(--mm-ink) 30%,transparent)}
.photo-slot__label{display:grid;justify-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}

/* builder: the "+ Add" items under a section */
.mm-adds{display:flex;flex-wrap:wrap;gap:12px;margin-top:18px}

@media (prefers-reduced-motion:reduce){.mm *{animation:none!important;transition:none!important}}
`;
