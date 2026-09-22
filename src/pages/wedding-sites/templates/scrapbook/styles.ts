// All Scrapbook CSS lives here as one injected stylesheet rather than
// inline styles, because this template needs real responsive behaviour
// (layered collages that must un-stack on small widths) which inline
// styles can't express.
//
// Sizing uses CONTAINER query units (cqw) and @container breakpoints,
// not vw/media queries, on purpose: the builder renders this template
// inside a scaled 1024px-wide preview canvas, so viewport units would
// report the browser window instead of the template's own width and the
// preview would not match the published page. Container units make the
// template respond to its own box in both places.

export const SCRAPBOOK_CSS = `
.sb-root{
  container: sb / inline-size;
  --sb-cream:#f4efe3;
  --sb-noise:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  color:var(--sb-ink);
  overflow-x:hidden;
}
.sb-root *{box-sizing:border-box;}

/* ---------- sections + paper texture ---------- */
/* overflow:hidden here was clipping rotated/absolutely-positioned
   collage children (cards, flowers) whenever their real rendered size
   exceeded the section's own box — exactly the cropping bug this
   template shipped with. Horizontal containment is handled once, at
   the page level (.sb-root), so sections don't need to clip at all;
   each collage is sized to actually contain its own composition
   instead (see .sb-collage and each section's --ar). */
.sb-sec{position:relative;width:100%;padding:clamp(52px,7.4cqw,108px) clamp(18px,5cqw,72px);
  scroll-margin-top:clamp(12px,2cqw,24px);}
.sb-sec--red{background-color:var(--sb-ink);color:var(--sb-cream);}
.sb-sec--paper{background-color:var(--sb-paper);color:var(--sb-ink);}
.sb-tex{position:absolute;inset:0;pointer-events:none;background-image:var(--sb-noise);background-size:140px 140px;opacity:.13;}
.sb-sec--red .sb-tex{opacity:.17;}
.sb-weave{position:absolute;inset:0;pointer-events:none;
  background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.020) 0 1px,transparent 1px 3px),
                   repeating-linear-gradient(0deg,rgba(255,255,255,.022) 0 1px,transparent 1px 3px);}
.sb-wrap{position:relative;z-index:1;max-width:1024px;margin:0 auto;}

/* ---------- typography ---------- */
.sb-eyebrow{font-family:var(--sb-body);text-transform:uppercase;letter-spacing:.3em;font-size:clamp(9px,1.15cqw,12px);margin:0;opacity:.85;}
.sb-script{font-family:var(--sb-display);font-weight:400;line-height:1.04;margin:0;}
.sb-script--xl{font-size:clamp(2rem,6.8cqw,4.2rem);overflow-wrap:break-word;}
.sb-script--lg{font-size:clamp(1.85rem,5.4cqw,3.3rem);}
.sb-script--md{font-size:clamp(1.35rem,3.1cqw,2.05rem);}
.sb-body{font-family:var(--sb-body);font-size:clamp(12.5px,1.5cqw,15px);line-height:1.78;margin:0;}
.sb-body + .sb-body{margin-top:1em;}
.sb-label{font-family:var(--sb-body);text-transform:uppercase;letter-spacing:.14em;font-size:clamp(10px,1.28cqw,13px);font-weight:600;margin:0;}
.sb-serif{font-family:var(--sb-body);font-size:clamp(12px,1.45cqw,15px);line-height:1.7;margin:0;}

/* ---------- layout helpers ---------- */
.sb-split{display:grid;gap:clamp(30px,4.2cqw,60px);}
@container sb (min-width:820px){
  .sb-split{grid-template-columns:var(--cols,1fr 1fr);align-items:var(--align,center);}
}
.sb-cols{display:grid;gap:clamp(28px,3.6cqw,48px);grid-template-columns:1fr;text-align:center;}
@container sb (min-width:720px){
  .sb-cols{grid-template-columns:repeat(auto-fit,minmax(200px,1fr));}
}
.sb-stack{display:flex;flex-direction:column;gap:clamp(24px,3.2cqw,40px);}

/* ---------- collage canvas ---------- */
.sb-collage{position:relative;display:flex;flex-direction:column;align-items:center;gap:clamp(24px,3.2cqw,36px);}
.sb-collage__item{width:min(100%,320px);max-width:100%;position:relative;}
/* Stacked (narrow) view: decorations are accents, not full-width images. */
.sb-collage__item--decor{width:min(36%,120px);}
.sb-collage__item--filler{display:none;}
@container sb (min-width:860px){
  .sb-collage{display:block;aspect-ratio:var(--ar,1024/700);}
  .sb-collage__item{position:absolute;left:var(--x);top:var(--y);width:var(--w);margin:0;}
  .sb-collage__item--filler{display:block;}
}

/* ---------- polaroid ---------- */
.sb-pol{margin:0;position:relative;max-width:100%;transform:rotate(var(--rot,0deg));}
.sb-pol__frame{background:var(--sb-cream);padding:3.4% 3.4% 11%;
  box-shadow:0 10px 24px rgba(0,0,0,.22),0 2px 5px rgba(0,0,0,.14);}
.sb-pol--print .sb-pol__frame{padding:4.2%;}
.sb-pol__win{overflow:hidden;background:rgba(60,45,35,.14);aspect-ratio:var(--ar,4/5);}
.sb-pol__win img{width:100%;height:100%;object-fit:cover;display:block;}
.sb-pol__tape{position:absolute;top:-4%;left:50%;width:36%;max-width:120px;
  transform:translateX(-50%) rotate(var(--tape-rot,-3deg));pointer-events:none;user-select:none;}
.sb-pol__cap{font-family:var(--sb-display);font-size:clamp(1rem,1.9cqw,1.3rem);text-align:center;
  color:#5d4a3c;margin:2% 0 0;}

/* ---------- stationery card ---------- */
.sb-card{position:relative;max-width:100%;background:var(--sb-ink);color:var(--sb-cream);
  padding:clamp(24px,3.6cqw,42px) clamp(18px,3cqw,34px);transform:rotate(var(--rot,0deg));
  box-shadow:0 12px 28px rgba(0,0,0,.24);text-align:center;}
.sb-card::after{content:"";position:absolute;inset:clamp(6px,.95cqw,11px);
  border:1px solid rgba(244,239,227,.40);pointer-events:none;}
.sb-card--paper{background:var(--sb-cream);color:var(--sb-ink);}
.sb-card--paper::after{border-color:rgba(0,0,0,.30);}


/* ---------- editor-only affordances (never published) ---------- */
.sb-hint{display:inline-block;align-self:flex-start;font-family:var(--sb-body);
  font-size:clamp(10.5px,1.2cqw,12.5px);letter-spacing:.07em;opacity:.45;
  border-bottom:1px dashed currentColor;padding-bottom:2px;}
.sb-pol__win--empty{display:flex;align-items:center;justify-content:center;
  background:rgba(90,70,50,.07);border:1px solid rgba(90,70,50,.14);}
.sb-pol__win--empty span{font-family:var(--sb-body);font-size:clamp(9.5px,1.1cqw,11.5px);
  letter-spacing:.09em;text-transform:uppercase;color:#8a7864;opacity:.7;}

/* ---------- decorative ---------- */
.sb-decor{display:block;pointer-events:none;user-select:none;}
.sb-flourish{display:block;margin:clamp(10px,1.6cqw,18px) auto;opacity:.75;}

/* ---------- hero ---------- */
.sb-hero__inner{text-align:center;position:relative;}
.sb-hero__names{margin-top:clamp(6px,1cqw,12px);position:relative;z-index:1;}
.sb-hero__photo{position:relative;z-index:2;width:min(37%,330px);margin:clamp(-18px,-1.3cqw,-6px) auto 0;}
.sb-hero__nav{display:flex;justify-content:center;gap:clamp(28px,6cqw,64px);margin-top:clamp(22px,3cqw,34px);}
@container sb (min-width:820px){
  .sb-hero__nav{position:absolute;top:58%;left:0;right:0;justify-content:space-between;margin:0;padding:0 clamp(8px,2cqw,28px);}
  /* With no hero photo there's nothing for the links to flank, so they
     return to normal flow instead of floating over the type. */
  .sb-hero--nophoto .sb-hero__nav{position:static;justify-content:center;margin-top:clamp(22px,3cqw,34px);}
}
.sb-hero__nav a{font-family:var(--sb-body);text-transform:uppercase;letter-spacing:.16em;
  font-size:clamp(10px,1.3cqw,13px);color:inherit;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:3px;}
.sb-hero__tagline{margin-top:clamp(26px,3.4cqw,44px);}
@container sb (max-width:819px){
  /* Names wrap to two lines here, so the photo sits below them instead
     of overlapping into the second line. */
  .sb-hero__photo{width:min(64%,260px);margin-top:clamp(10px,2cqw,18px);}
}

/* ---------- story photos ---------- */
.sb-story__photos{position:relative;min-height:clamp(260px,34cqw,400px);}
.sb-story__photos .sb-pol{position:absolute;}
/* Deliberately unequal: the reference's two photos differ in size and
   angle, so they must not read as one duplicated component. */
.sb-story__photos .sb-pol:nth-child(1){top:0;left:0;width:60%;}
.sb-story__photos .sb-pol:nth-child(2){bottom:0;right:2%;width:52%;}
@container sb (max-width:819px){
  .sb-story__photos{min-height:0;display:flex;gap:16px;justify-content:center;}
  .sb-story__photos .sb-pol{position:static;width:46%;}
}

/* ---------- faq ---------- */
.sb-faq__item + .sb-faq__item{margin-top:clamp(20px,2.6cqw,30px);}
.sb-faq__q{margin-bottom:6px;}

/* ---------- registry / text links ---------- */
.sb-links{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(14px,2.4cqw,30px);margin-top:clamp(22px,3cqw,34px);}
.sb-links a{font-family:var(--sb-body);text-transform:uppercase;letter-spacing:.14em;
  font-size:clamp(10px,1.28cqw,13px);color:inherit;text-decoration:none;
  border-bottom:1px solid currentColor;padding-bottom:4px;}

/* ---------- key people ---------- */
.sb-people{display:grid;gap:clamp(20px,2.8cqw,34px);grid-template-columns:repeat(2,1fr);}
@container sb (min-width:720px){.sb-people{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));}}
.sb-people .sb-pol{width:100%;}
.sb-people__role{font-family:var(--sb-body);font-size:clamp(9.5px,1.15cqw,12px);
  text-transform:uppercase;letter-spacing:.12em;opacity:.7;text-align:center;margin:2px 0 0;}

/* ---------- gallery ---------- */
.sb-gallery{display:grid;gap:clamp(16px,2.4cqw,30px);grid-template-columns:repeat(2,1fr);}
@container sb (min-width:720px){.sb-gallery{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));}}

/* ---------- rsvp button + dialog ---------- */
.sb-respond{font-family:var(--sb-body);text-transform:uppercase;letter-spacing:.18em;
  font-size:clamp(10px,1.28cqw,13px);font-weight:600;color:inherit;background:none;
  border:1px solid currentColor;padding:10px 22px;cursor:pointer;margin-top:14px;}
.sb-respond:hover{background:rgba(244,239,227,.12);}
.sb-dialog{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;
  padding:20px;background:rgba(30,12,12,.55);}
.sb-dialog__panel{position:relative;width:min(440px,100%);max-height:88vh;overflow-y:auto;
  background:#f6f1e6;color:var(--sb-ink);padding:34px 30px 30px;
  box-shadow:0 24px 60px rgba(0,0,0,.35);}
.sb-dialog__panel::after{content:"";position:absolute;inset:9px;border:1px solid rgba(0,0,0,.25);pointer-events:none;}
.sb-dialog__close{position:absolute;top:12px;right:14px;background:none;border:none;font-size:20px;
  line-height:1;cursor:pointer;color:inherit;opacity:.6;z-index:1;}
.sb-field{display:block;width:100%;font-family:var(--sb-body);font-size:14px;color:inherit;
  background:#fffdf8;border:1px solid rgba(0,0,0,.28);padding:11px 13px;margin-top:10px;border-radius:0;}
.sb-field:focus{outline:none;border-color:var(--sb-ink);}
.sb-submit{width:100%;margin-top:16px;font-family:var(--sb-body);text-transform:uppercase;
  letter-spacing:.16em;font-size:12px;font-weight:700;color:var(--sb-cream);background:var(--sb-ink);
  border:none;padding:13px 18px;cursor:pointer;}
.sb-submit[disabled]{opacity:.6;cursor:default;}

/* ---------- footer ---------- */
.sb-footer{background:var(--sb-ink);color:var(--sb-cream);text-align:center;padding:22px 16px;}
.sb-footer a{color:inherit;font-weight:700;}

@media (prefers-reduced-motion:reduce){.sb-root *{transition:none!important;animation:none!important;}}
`;
