// The Debut Issue's styles. Sizes follow the page's own width (container units; the cover is
// a container of its own, so its type scales with the cover), so the builder's phone preview,
// the gallery card and a real phone lay out alike. Motion: the cover settling in and the
// magazine opening (.di-stacked → .di-open → .di-turned), plus quiet reveals.

export const DEBUT_ISSUE_CSS = `
.di-root{container-type:inline-size;position:relative;overflow-x:clip;color:var(--di-ink);background:var(--di-bg);font-family:var(--di-body);font-optical-sizing:auto;
  --di-soft:color-mix(in srgb,var(--di-muted) 70%,var(--di-ink));
  --di-line:color-mix(in srgb,var(--di-ink) 14%,transparent);
  --di-paper:color-mix(in srgb,#fff 55%,var(--di-bg));
  --di-card:color-mix(in srgb,#fff 70%,var(--di-bg));
  --di-desk:color-mix(in srgb,var(--di-ink) 5%,var(--di-bg))}
.di-root *,.di-root *::before,.di-root *::after{box-sizing:border-box}
.di-root a{color:inherit}
.di-page{--pad:20px;--pw:100cqw;--space:clamp(72px,12cqw,150px)}
@container (min-width:760px){.di-page{--pad:max(48px,calc((100cqw - 1120px) / 2));--pw:min(44cqw,540px)}.di-stacked .di-page{--pw:min(44cqw,540px,calc((100svh - 150px) * .75))}}
.di-hint{opacity:.55}

/* type, shared */
.di-kicker{margin:0 0 14px;font:600 12px/1.2 var(--di-sans);font-stretch:85%;letter-spacing:.24em;text-transform:uppercase;color:var(--di-spot)}
.di-h{margin:0 0 clamp(28px,4cqw,48px);font-family:var(--di-display);font-weight:600;font-size:clamp(46px,11cqw,112px);line-height:.92;letter-spacing:-.025em;text-wrap:balance}
@container (min-width:760px){.di-h{font-size:clamp(64px,8cqw,112px)}}
.di-text{margin:0 0 1em;font-size:clamp(17px,1.7cqw,19px);line-height:1.62}
.di-small{margin:8px 0 0;font:13px/1.5 var(--di-sans);color:var(--di-soft)}
.di-link{min-height:44px;padding:6px 0;border:0;background:none;color:var(--di-soft);font:500 14px var(--di-sans);text-decoration:underline;text-underline-offset:3px;cursor:pointer}

/* ---- the opening: cover, then the spread ---- */
.di-opening{position:relative;background:var(--di-desk)}
.di-spread{display:flex;flex-direction:column}
.di-spread__right{position:relative;order:1}
.di-letter{order:2}
@container (min-width:760px){
  .di-opening{padding:clamp(40px,5cqw,72px) 0}
  .di-spread{display:grid;grid-template-columns:var(--pw) var(--pw);justify-content:center;align-items:stretch}
  .di-spread--solo{grid-template-columns:var(--pw)}
  .di-letter{order:0}
  .di-pg{box-shadow:0 1px 2px rgba(0,0,0,.06),0 30px 60px -40px rgba(0,0,0,.45)}
  .di-letter{box-shadow:inset -18px 0 24px -22px rgba(0,0,0,.28),0 1px 2px rgba(0,0,0,.06),0 30px 60px -40px rgba(0,0,0,.45)}
  .di-spread__right .di-pg{box-shadow:inset 18px 0 24px -22px rgba(0,0,0,.28),0 1px 2px rgba(0,0,0,.06),0 30px 60px -40px rgba(0,0,0,.45)}
}

/* a page of the spread */
.di-pg{position:relative;display:flex;flex-direction:column;min-height:calc(var(--pw) * 1.333);padding:clamp(28px,7cqw,56px) clamp(22px,6cqw,48px) clamp(20px,4cqw,32px);background:var(--di-paper)}
@container (min-width:760px){.di-pg{padding:clamp(32px,3.6cqw,52px) clamp(28px,3.2cqw,46px) 24px}}
.di-pg__h{margin:0 0 20px;font-family:var(--di-display);font-weight:600;font-size:clamp(34px,9cqw,52px);line-height:1;letter-spacing:-.02em;text-wrap:balance}
@container (min-width:760px){.di-pg__h{font-size:clamp(34px,3.4cqw,46px)}}
.di-pg .di-folio{margin-top:auto}

/* the letter */
.di-letter__body{display:flow-root}
.di-letter__pic{float:right;width:40%;aspect-ratio:3/4;margin:4px 0 12px 18px;overflow:hidden;background:var(--di-desk)}
.di-letter__text .di-text{font-size:clamp(16px,4.3cqw,18px)}
@container (min-width:760px){.di-letter__text .di-text{font-size:clamp(15px,1.36cqw,17px)}}
.di-sign{clear:both;margin:6px 0 22px;font-family:var(--di-display);font-style:italic;font-size:clamp(26px,7cqw,34px);line-height:1}
@container (min-width:760px){.di-sign{font-size:clamp(24px,2.4cqw,32px)}}

/* the contents */
.di-contents__head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 16px;padding-bottom:14px;border-bottom:2px solid var(--di-ink)}
.di-contents__h{margin:0;font-family:var(--di-display);font-weight:600;font-size:clamp(44px,13cqw,64px);line-height:.9;letter-spacing:-.03em}
@container (min-width:760px){.di-contents__h{font-size:clamp(46px,4.6cqw,64px)}}
.di-contents__issue{margin:0;font:600 11px/1.3 var(--di-sans);font-stretch:85%;letter-spacing:.2em;text-transform:uppercase;color:var(--di-soft)}
.di-toc{list-style:none;margin:6px 0 18px;padding:0}
.di-toc li{border-bottom:1px solid var(--di-line)}
.di-toc a{display:grid;grid-template-columns:3.1em minmax(0,1fr);align-items:baseline;gap:12px;padding:clamp(10px,2.6cqw,14px) 0;text-decoration:none}
@container (min-width:760px){.di-toc a{padding:clamp(8px,.85cqw,11px) 0}.di-toc__d{font-size:14px}}
.di-toc__n{font-family:var(--di-display);font-weight:700;font-size:clamp(24px,6.4cqw,30px);line-height:1;color:var(--di-spot);font-variant-numeric:lining-nums tabular-nums}
@container (min-width:760px){.di-toc__n{font-size:clamp(22px,2.2cqw,28px)}}
.di-toc__w{display:grid;gap:3px;min-width:0}
.di-toc__t{font:700 clamp(13px,3.4cqw,15px)/1.25 var(--di-sans);font-stretch:85%;letter-spacing:.12em;text-transform:uppercase}
@container (min-width:760px){.di-toc__t{font-size:clamp(12px,1.12cqw,14px)}}
.di-toc__d{font-style:italic;font-size:clamp(15px,3.9cqw,16px);line-height:1.35;color:var(--di-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.di-toc a:hover .di-toc__t{color:var(--di-spot)}
@container (max-width:519px){.di-toc__d{display:none}.di-toc a{padding:11px 0}}
.di-contents__back{align-self:flex-start;margin-top:auto}

/* ---- the cover ---- */
.di-cover{container:cover / inline-size;position:relative;display:block;color:#fff;background:#141414}
.di-flow .di-cover{width:100%;aspect-ratio:3/4}
@container (min-width:760px){.di-flow .di-cover{width:min(560px,62cqw);margin:0 auto clamp(40px,5cqw,72px);box-shadow:0 2px 4px rgba(0,0,0,.08),0 40px 70px -40px rgba(0,0,0,.55)}}
.di-gallery .di-cover{margin-bottom:0}
.di-stacked .di-cover{position:absolute;inset:0;z-index:3;cursor:pointer;transform-origin:left center;transform-style:preserve-3d;transition:transform 1.3s cubic-bezier(.6,.04,.24,1)}
.di-cover__front{position:absolute;inset:0;overflow:hidden;backface-visibility:hidden}
.di-flow .di-cover__front{position:absolute}
.di-cover__back{position:absolute;inset:0;background:var(--di-paper);transform:rotateY(180deg);backface-visibility:hidden;box-shadow:inset -18px 0 24px -22px rgba(0,0,0,.3)}
.di-cover__photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.di-cover__empty{display:grid;place-items:center;background:color-mix(in srgb,var(--di-ink) 70%,#444);color:#fff}
.di-cover__scrim{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,.42),rgba(0,0,0,0) 34%),linear-gradient(to top,rgba(0,0,0,.72),rgba(0,0,0,.28) 34%,rgba(0,0,0,0) 56%)}
.di-cover--dark{color:#141414}
.di-cover--dark .di-cover__scrim{background:linear-gradient(to bottom,rgba(255,255,255,.55),rgba(255,255,255,0) 34%),linear-gradient(to top,rgba(255,255,255,.7),rgba(255,255,255,0) 46%)}

.di-cover__top{position:absolute;left:0;right:0;top:0;padding:4.2cqw 5cqw 0;text-align:center}
.di-issue{display:flex;justify-content:center;margin:0 0 1cqw;font:600 2.5cqw/1.2 var(--di-sans);font-stretch:85%;letter-spacing:.3em;text-transform:uppercase}
.di-mast{margin:0;font-family:var(--di-display);font-weight:700;font-size:min(28cqw,calc(122cqw / var(--len)));line-height:.82;letter-spacing:-.02em;text-transform:uppercase;text-shadow:0 2px 24px rgba(0,0,0,.18);white-space:nowrap;overflow:hidden}
.di-cover--dark .di-mast{text-shadow:none}

.di-cover__lines{position:absolute;left:5cqw;bottom:16cqw;max-width:52cqw}
.di-headline{margin:0 0 3cqw;font-family:var(--di-display);font-style:italic;font-weight:500;font-size:8cqw;line-height:.95;letter-spacing:-.015em;text-wrap:balance}
.di-line{display:grid;gap:.5cqw;margin:0 0 2.2cqw}
.di-line__k{font:700 2.3cqw/1.2 var(--di-sans);font-stretch:85%;letter-spacing:.24em;text-transform:uppercase;opacity:.9}
.di-line__t{font-family:var(--di-display);font-size:4cqw;line-height:1.1;text-wrap:balance}

.di-sticker{position:absolute;right:5cqw;top:41%;display:grid;place-items:center;align-content:center;width:19cqw;aspect-ratio:1;border-radius:50%;background:var(--di-spot);color:#fff;text-align:center;transform:rotate(-9deg);box-shadow:0 0 0 .7cqw rgba(255,255,255,.9)}
.di-sticker__top,.di-sticker__bottom{font:700 2.1cqw/1.1 var(--di-sans);font-stretch:85%;letter-spacing:.14em;text-transform:uppercase}
.di-sticker__big{font-family:var(--di-display);font-weight:700;font-size:8.4cqw;line-height:.9}

.di-cover__code{position:absolute;right:5cqw;bottom:4.6cqw;padding:1.2cqw 1.4cqw .6cqw;background:#fff;color:#141414}
.di-barcode{display:block;width:17cqw;height:8.4cqw}
.di-cover__open{position:absolute;left:5cqw;bottom:4.6cqw;min-height:44px;padding:0 4.4cqw;border:1px solid currentColor;border-radius:999px;background:rgba(0,0,0,.18);color:inherit;font:600 max(12px,2.6cqw)/1 var(--di-sans);font-stretch:85%;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;backdrop-filter:blur(4px)}
.di-cover__open::after{content:" →"}

/* the opening, where it plays: the closed issue sits in the middle, then opens on its spine */
@container (min-width:760px){
  .di-stacked .di-spread:not(.di-spread--solo){transition:transform 1.3s cubic-bezier(.6,.04,.24,1)}
  .di-stacked:not(.di-open) .di-spread:not(.di-spread--solo){transform:translateX(calc(var(--pw) / -2))}
  .di-stacked .di-opening{perspective:2600px}
}
.di-stacked .di-letter{transition:opacity .5s ease .15s}
@container (min-width:760px){.di-stacked:not(.di-turned) .di-letter{opacity:0}}
.di-stacked.di-open .di-cover{transform:rotateY(-180deg);cursor:default}
.di-stacked.di-turned .di-cover{visibility:hidden}
.di-stacked .di-mast{animation:di-mast 1.2s cubic-bezier(.2,.7,.2,1) .25s both}
.di-stacked .di-issue{animation:di-fade .8s ease .9s both}
.di-stacked .di-headline{animation:di-up .8s cubic-bezier(.2,.7,.2,1) 1s both}
.di-stacked .di-line{animation:di-up .7s cubic-bezier(.2,.7,.2,1) calc(1.2s + var(--i) * .14s) both}
.di-stacked .di-sticker{animation:di-stick .6s cubic-bezier(.3,1.5,.5,1) 1.9s both}
.di-stacked .di-cover__open{animation:di-fade .8s ease 2.4s both}
@keyframes di-mast{from{opacity:0;transform:translateY(-10%);letter-spacing:.06em}to{opacity:1;transform:none;letter-spacing:-.02em}}
@keyframes di-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes di-fade{from{opacity:0}to{opacity:1}}
@keyframes di-stick{from{opacity:0;transform:rotate(-30deg) scale(.6)}to{opacity:1;transform:rotate(-9deg) scale(1)}}

/* ---- a feature: one per spread, with its folio ---- */
.di-feat{position:relative;padding:var(--space) var(--pad) 28px;border-top:1px solid var(--di-line)}
.di-feat__in{max-width:1080px;margin:0 auto}
.di-folio{display:flex;justify-content:space-between;gap:16px;max-width:1080px;margin:clamp(48px,6cqw,72px) auto 0;padding-top:10px;border-top:1px solid var(--di-line);font:600 11px/1.3 var(--di-sans);font-stretch:85%;letter-spacing:.2em;text-transform:uppercase;color:var(--di-soft)}
.di-pg .di-folio{width:100%;margin-bottom:0}
.di-folio span:first-child{color:var(--di-ink);font-variant-numeric:lining-nums tabular-nums}

/* the night */
.di-night .di-feat__in{display:grid;gap:40px}
@container (min-width:760px){.di-night .di-feat__in{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:clamp(40px,6cqw,96px);align-items:center}}
.di-date{display:flex;align-items:flex-end;gap:clamp(14px,3cqw,28px);margin:0 0 24px}
.di-date__day{font-family:var(--di-display);font-weight:700;font-size:clamp(140px,40cqw,300px);line-height:.74;letter-spacing:-.05em;color:var(--di-spot);font-variant-numeric:lining-nums}
@container (min-width:760px){.di-date__day{font-size:clamp(170px,22cqw,300px)}}
.di-date__rest{display:grid;gap:2px;padding-bottom:.4em;font:700 clamp(15px,4cqw,20px)/1.2 var(--di-sans);font-stretch:85%;letter-spacing:.16em;text-transform:uppercase}
@container (min-width:760px){.di-date__rest{font-size:clamp(15px,1.6cqw,20px)}}
.di-date__wd{font-family:var(--di-body);font-style:italic;font-weight:400;letter-spacing:0;text-transform:none;color:var(--di-soft)}
.di-night__time{margin:0 0 28px;font-style:italic;font-size:clamp(19px,2cqw,22px)}
.di-night__venue{margin:0 0 6px;font-family:var(--di-display);font-weight:600;font-size:clamp(30px,8cqw,48px);line-height:1.02;letter-spacing:-.015em;text-wrap:balance}
@container (min-width:760px){.di-night__venue{font-size:clamp(32px,3.6cqw,48px)}}
.di-night__addr{color:var(--di-soft)}
.di-night__pic{position:relative;margin:0;aspect-ratio:3/4;overflow:hidden;background:var(--di-desk)}
.di-night__pic figcaption{position:absolute;left:0;bottom:0;padding:8px 12px;background:var(--di-bg);font:600 11px/1.2 var(--di-sans);font-stretch:85%;letter-spacing:.2em;text-transform:uppercase}
.di-count{display:flex;gap:clamp(18px,4cqw,34px);margin:30px 0 0;padding-top:20px;border-top:1px solid var(--di-line)}
.di-count__cell{display:grid;gap:6px}
.di-count__n{font-family:var(--di-display);font-weight:600;font-size:clamp(28px,7cqw,40px);line-height:1;font-variant-numeric:lining-nums tabular-nums}
@container (min-width:760px){.di-count__n{font-size:clamp(28px,3cqw,40px)}}
.di-count__l{font:600 10.5px/1 var(--di-sans);letter-spacing:.2em;text-transform:uppercase;color:var(--di-soft)}
.di-count__sep{display:none}

/* the program */
.di-run{list-style:none;margin:0;padding:0;border-top:2px solid var(--di-ink)}
.di-run li{display:grid;grid-template-columns:minmax(5.4em,auto) minmax(0,1fr);gap:clamp(16px,4cqw,48px);align-items:baseline;padding:clamp(18px,2.4cqw,26px) 0;border-bottom:1px solid var(--di-line)}
@container (min-width:760px){.di-run li{grid-template-columns:11rem minmax(0,1fr)}}
.di-run__t{font-family:var(--di-display);font-weight:600;font-size:clamp(30px,8cqw,46px);line-height:1;letter-spacing:-.02em;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
@container (min-width:760px){.di-run__t{font-size:clamp(34px,3.6cqw,46px)}}
.di-run__t small{margin-left:.18em;font:700 .32em/1 var(--di-sans);letter-spacing:.14em;color:var(--di-spot)}
.di-run__w{display:grid;gap:6px;min-width:0}
.di-run__l{font:700 clamp(15px,1.6cqw,17px)/1.3 var(--di-sans);font-stretch:85%;letter-spacing:.12em;text-transform:uppercase}
.di-run__d{font-style:italic;font-size:clamp(16px,1.6cqw,18px);line-height:1.45;color:var(--di-soft)}

/* the lists */
.di-lists .di-add--wide{display:block;margin:28px auto}
.di-list__head{display:grid;gap:10px;margin-bottom:clamp(28px,4cqw,44px)}
.di-list__title{display:flex;flex-wrap:wrap;align-items:flex-end;gap:0 .16em;margin:0;font-family:var(--di-display);font-weight:600;font-size:clamp(44px,12cqw,96px);line-height:.9;letter-spacing:-.025em}
@container (min-width:760px){.di-list__title{font-size:clamp(64px,7.6cqw,104px)}}
.di-list__num{font-weight:700;font-size:1.9em;line-height:.74;letter-spacing:-.05em;color:var(--di-spot);font-variant-numeric:lining-nums}
.di-list__word{font-style:italic;font-weight:500;padding-bottom:.04em}
.di-list__deck{margin:0;font:700 13px/1.4 var(--di-sans);font-stretch:85%;letter-spacing:.2em;text-transform:uppercase;color:var(--di-soft)}
.di-names{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,1fr);column-gap:clamp(24px,4cqw,56px);border-top:2px solid var(--di-ink)}
@container (min-width:520px){.di-names{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (min-width:960px){.di-names{grid-template-columns:repeat(3,minmax(0,1fr))}}
.di-names li{display:grid;grid-template-columns:2.4em minmax(0,1fr);align-items:baseline;gap:8px;padding:12px 0;border-bottom:1px solid var(--di-line)}
.di-names__n{font:700 12px/1 var(--di-sans);letter-spacing:.08em;color:var(--di-spot);font-variant-numeric:tabular-nums}
.di-names__p{font-size:clamp(17px,1.7cqw,19px);line-height:1.35}
.di-short{display:grid;gap:clamp(28px,4cqw,44px)}
@container (min-width:760px){.di-short{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}}
.di-short__names{list-style:none;margin:0;padding:0;font-family:var(--di-display);font-weight:500;font-size:clamp(30px,7cqw,46px);line-height:1.1;letter-spacing:-.015em}
@container (min-width:760px){.di-short__names{font-size:clamp(32px,3.4cqw,46px)}}
.di-list + .di-list{border-top:1px solid var(--di-line)}

/* the pictorial: editorial columns, each photo in its own shape */
.di-pics{columns:2;column-gap:clamp(8px,1.6cqw,18px)}
@container (min-width:760px){.di-pics{columns:3}}
.di-pics--few{columns:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:clamp(8px,1.6cqw,18px)}
.di-pic{break-inside:avoid;margin:0 0 clamp(8px,1.6cqw,18px);min-width:0}
.di-pic__img{position:relative;overflow:hidden;background:var(--di-desk)}
.di-pic figcaption{margin-top:8px;font:600 11px/1.4 var(--di-sans);letter-spacing:.14em;text-transform:uppercase;color:var(--di-soft)}

/* what to wear */
.di-dress__text{max-width:860px;margin:0 0 clamp(30px,4cqw,48px);font-family:var(--di-display);font-style:italic;font-size:clamp(26px,6.4cqw,44px);line-height:1.2;letter-spacing:-.01em;text-wrap:pretty}
@container (min-width:760px){.di-dress__text{font-size:clamp(30px,3.4cqw,44px)}}
.di-colours{display:flex;flex-wrap:wrap;gap:clamp(16px,3cqw,32px);list-style:none;margin:0;padding:0}
.di-colours li{display:grid;justify-items:center;gap:10px}
.di-colours__chip{display:block;width:clamp(72px,18cqw,110px);aspect-ratio:1;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
@container (min-width:760px){.di-colours__chip{width:clamp(80px,8cqw,110px)}}
.di-colours__n{font:700 11px/1 var(--di-sans);letter-spacing:.2em;text-transform:uppercase;color:var(--di-soft)}

/* gifts */
.di-gifts .di-feat__in > *,.di-faq .di-feat__in > *,.di-after .di-feat__in > *{max-width:860px}
.di-links{display:flex;flex-wrap:wrap;gap:10px;margin:6px 0 18px}
.di-cash{display:grid;justify-items:start;gap:16px;margin-top:6px}
.di-cash__in{width:100%;max-width:560px}

/* Q&A */
.di-qa{display:grid;border-top:2px solid var(--di-ink)}
.di-qa__item{padding:clamp(18px,2.4cqw,26px) 0;border-bottom:1px solid var(--di-line)}
.di-qa__q,.di-qa__a{display:grid;grid-template-columns:2.2em minmax(0,1fr);margin:0}
.di-qa__q{margin-bottom:8px;font:700 clamp(15px,1.6cqw,17px)/1.4 var(--di-sans);font-stretch:85%;letter-spacing:.06em}
.di-qa__a{font-size:clamp(17px,1.7cqw,19px);line-height:1.55}
.di-qa__q > span:first-child,.di-qa__a > span:first-child{font-family:var(--di-display);font-weight:700;font-size:1.2em;line-height:1.1;color:var(--di-spot)}

/* buttons */
.di-btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 28px;border:1px solid var(--di-ink);border-radius:0;background:var(--di-ink);color:var(--di-bg);font:700 13px/1 var(--di-sans);font-stretch:85%;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:background-color .25s,color .25s}
.di-btn:hover{background:transparent;color:var(--di-ink)}
.di-btn--line{background:transparent;color:var(--di-ink)}
.di-btn--line:hover{background:var(--di-ink);color:var(--di-bg)}
.di-btn--block{width:100%}
.di-btn:disabled{opacity:.55;cursor:not-allowed}
.di-btn:focus-visible,.di-choice__opt:focus-visible,.di-seats button:focus-visible,.di-link:focus-visible,.di-toc a:focus-visible,.di-cover__open:focus-visible{outline:2px solid var(--di-spot);outline-offset:3px}

/* the reply card: a tear-out subscription card */
.di-reply .di-feat__in{max-width:640px}
.di-card{position:relative;padding:clamp(34px,5cqw,52px) clamp(22px,5cqw,48px) clamp(28px,4cqw,44px);background:var(--di-card);box-shadow:0 1px 2px rgba(0,0,0,.06),0 26px 50px -34px rgba(0,0,0,.4)}
.di-card__perf{position:absolute;left:0;right:0;top:12px;border-top:2px dashed color-mix(in srgb,var(--di-ink) 26%,transparent)}
.di-card__perf::before,.di-card__perf::after{content:"";position:absolute;top:-9px;width:16px;height:16px;border-radius:50%;background:var(--di-bg)}
.di-card__perf::before{left:-8px}.di-card__perf::after{right:-8px}
.di-card__head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 16px;padding-bottom:12px;border-bottom:2px solid var(--di-ink)}
.di-card__h{margin:0;font-family:var(--di-display);font-weight:600;font-size:clamp(34px,8cqw,48px);line-height:1;letter-spacing:-.02em}
@container (min-width:760px){.di-card__h{font-size:clamp(36px,3.6cqw,48px)}}
.di-card__seats{margin:0;font:700 12px/1.3 var(--di-sans);letter-spacing:.16em;text-transform:uppercase;color:var(--di-spot)}
.di-form{position:relative;display:grid;gap:20px;margin-top:22px}
.di-form label{display:block;margin:0 0 4px;font:700 11px/1.3 var(--di-sans);letter-spacing:.18em;text-transform:uppercase;color:var(--di-soft)}
.di-field{width:100%;padding:10px 2px;border:0;border-bottom:1px solid color-mix(in srgb,var(--di-ink) 32%,transparent);border-radius:0;background:transparent;color:var(--di-ink);font:400 18px/1.4 var(--di-body);outline:none}
.di-field:focus{border-bottom-color:var(--di-spot)}
textarea.di-field{padding:10px 12px;border:1px solid var(--di-line);resize:vertical}
.di-choice{display:grid;gap:10px}
@container (min-width:520px){.di-choice{grid-template-columns:1fr 1fr}}
.di-choice__opt{display:flex;align-items:center;gap:12px;min-height:52px;padding:0 14px;border:1px solid color-mix(in srgb,var(--di-ink) 24%,transparent);border-radius:0;background:transparent;color:var(--di-ink);font:500 16px/1.2 var(--di-body);text-align:left;cursor:pointer;transition:border-color .2s}
.di-box{position:relative;flex:none;width:20px;height:20px;border:1.5px solid currentColor}
.di-choice__opt.is-picked{border-color:var(--di-ink);box-shadow:inset 0 0 0 1px var(--di-ink)}
.di-choice__opt.is-picked .di-box::after{content:"";position:absolute;left:5px;top:1px;width:6px;height:11px;border:solid var(--di-spot);border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
.di-seats{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;font:700 11px/1.3 var(--di-sans);letter-spacing:.18em;text-transform:uppercase;color:var(--di-soft)}
.di-seats__ctrl{display:inline-flex;align-items:center;border:1px solid var(--di-line);color:var(--di-ink)}
.di-seats button{width:46px;height:46px;border:0;background:transparent;color:var(--di-ink);font:400 22px/1 var(--di-body);cursor:pointer}
.di-seats button:disabled{opacity:.28;cursor:default}
.di-seats output{min-width:2.4em;text-align:center;font:600 20px var(--di-display);font-variant-numeric:lining-nums tabular-nums}
.di-error{margin:0;color:#9b2c2c}
.di-done{display:grid;justify-items:start;gap:8px}
.di-done .di-btn{margin-top:12px}

/* after the night */
.di-after__text{margin:0;font-family:var(--di-display);font-style:italic;font-size:clamp(30px,7cqw,52px);line-height:1.15}

/* the back cover */
.di-back{display:grid;justify-items:center;gap:22px;padding:var(--space) var(--pad) clamp(40px,6cqw,64px);border-top:1px solid var(--di-line);text-align:center}
.di-back__line{margin:0;max-width:16ch;font-family:var(--di-display);font-style:italic;font-weight:500;font-size:clamp(44px,12cqw,104px);line-height:.95;letter-spacing:-.02em;text-wrap:balance}
@container (min-width:760px){.di-back__line{font-size:clamp(56px,7.4cqw,104px)}}
.di-back__mast{margin:0;font:700 13px/1 var(--di-sans);font-stretch:85%;letter-spacing:.42em;text-transform:uppercase;color:var(--di-spot)}
.di-barcode--back{width:120px;height:58px;margin-top:10px;color:var(--di-ink)}
.di-credit{margin:0;font-size:13px;color:var(--di-soft)}

/* the builder's add buttons */
.di-add{margin-top:18px}
.di-add--sm{margin-top:12px}

/* scroll reveals (only where useReveal turns them on) */
.di-root [data-reveal]{opacity:1;transform:none;transition:none;will-change:auto}
.rv-on [data-reveal]{opacity:0;transform:translateY(16px);transition:opacity 1.1s cubic-bezier(.2,.7,.2,1),transform 1.1s cubic-bezier(.2,.7,.2,1)}
.rv-on [data-reveal].is-in{opacity:1;transform:none}

@media (prefers-reduced-motion:reduce){.di-root *,.di-root *::before,.di-root *::after{animation:none!important;transition:none!important}}
`;
