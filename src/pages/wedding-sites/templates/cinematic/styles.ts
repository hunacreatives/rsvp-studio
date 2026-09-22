// Injected stylesheet, matching the pattern used by the Scrapbook
// template (see its styles.ts) — this archetype needs real animation
// keyframes and a fixed-position background stack that inline styles
// can't express cleanly.
//
// Sizing uses cqw/container queries for the same reason as Scrapbook:
// the builder previews this template inside a scaled canvas, and
// viewport units would measure the browser window instead.

export const CINEMATIC_CSS = `
.cn-root{
  container: cn / inline-size;
  position: relative;
  color: var(--cn-ink);
  overflow-x: hidden;
  isolation: isolate;
}
.cn-root *{box-sizing:border-box;}

/* ---------- fixed atmospheric background stack ---------- */
/* position:sticky (not fixed) on purpose: the builder wraps this
   template in a transform:scale() preview canvas (see
   PreviewCanvas.tsx), and a CSS transform makes its box the containing
   block for any position:fixed/absolute descendant — so a fixed
   full-viewport background either got blown up to the transformed
   box's full scrollable-page height (using inset:0) or, sized with
   vw/vh instead, got pinned to the very top of that same oversized box
   and scrolled away after one viewport height, leaving a plain void
   below (both tried and rejected — see decision log). Sticky is exempt
   from that rule entirely: its containing block is the nearest
   scrolling ancestor, not affected by transformed ancestors, and that
   scrolling ancestor correctly resolves to the real document on the
   published page AND to PreviewCanvas's own scrollable pane in the
   builder. margin-bottom:-100vh cancels the space this element would
   otherwise reserve in normal flow, so it sits behind every section
   instead of pushing them down by its own height. Must stay the FIRST
   child of .cn-root for that trick to work. */
.cn-bg{position:sticky;top:0;left:0;width:100%;height:100vh;margin-bottom:-100vh;z-index:0;pointer-events:none;}
.cn-bg__image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.cn-bg__video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;}
@container cn (max-width:640px){
  .cn-bg__image{display:none;}
  .cn-bg__video{display:block;}
}
.cn-bg__vignette{position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(150,120,130,.08) 60%, rgba(120,90,100,.15) 100%);}
.cn-bg__glow{position:absolute;top:50%;left:50%;width:600px;height:600px;border-radius:999px;
  transform:translate(-50%,-55%);filter:blur(40px);animation:cn-glow-pulse 8s ease-in-out infinite;
  background:radial-gradient(circle, rgba(255,230,240,.35) 0%, rgba(255,220,230,.15) 40%, transparent 70%);}
.cn-bg__blob{position:absolute;border-radius:999px;filter:blur(60px);}
.cn-bg__canvas{position:absolute;inset:0;opacity:.8;}

@keyframes cn-glow-pulse{0%,100%{opacity:.7;}50%{opacity:1;}}
@keyframes cn-float-slow{0%,100%{transform:translateY(0);}50%{transform:translateY(-14px);}}
@keyframes cn-float-very-slow{0%,100%{transform:translate(0,0);}50%{transform:translate(10px,-16px);}}

/* ---------- intro overlay ---------- */
.cn-intro{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;
  background:var(--cn-bg-color);transition:opacity 1.2s ease-out;}
.cn-intro--hidden{opacity:0;pointer-events:none;}

/* ---------- staged reveal ---------- */
.cn-reveal{opacity:0;transform:translateY(28px);transition:opacity 1.6s ease-out, transform 1.6s ease-out;}
.cn-reveal--in{opacity:1;transform:translateY(0);}
@media (prefers-reduced-motion: reduce){
  .cn-reveal{opacity:1!important;transform:none!important;transition:none!important;}
  .cn-intro{display:none!important;}
}

/* ---------- typography ---------- */
.cn-script{font-family:var(--cn-display);font-weight:400;line-height:1.15;margin:0;
  text-shadow:0 2px 20px rgba(192,96,110,.15);color:var(--cn-ink);}
.cn-script--xl{font-size:clamp(2.4rem,11cqw,5.5rem);}
.cn-script--lg{font-size:clamp(1.6rem,6cqw,2.4rem);}
.cn-hand{font-family:var(--cn-body);color:var(--cn-muted);margin:0;}
.cn-hand--lg{font-size:clamp(1.3rem,4.6cqw,2.4rem);line-height:1.35;}
.cn-hand--md{font-size:clamp(1.1rem,3.4cqw,1.7rem);line-height:1.3;}
.cn-hand--sm{font-size:clamp(.95rem,2.4cqw,1.15rem);}
.cn-eyebrow{font-family:var(--cn-body);color:var(--cn-muted);opacity:.6;font-size:clamp(.8rem,2cqw,.95rem);margin:0;}

/* ---------- hero ---------- */
.cn-hero{position:relative;z-index:10;min-height:100vh;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;padding:clamp(56px,9cqw,96px) clamp(16px,4cqw,32px);}
.cn-hero__wrap{width:min(900px,94%);}

.cn-photos{display:flex;flex-direction:row;align-items:center;justify-content:center;
  gap:0;margin-top:clamp(48px,7cqw,80px);}
.cn-photo{position:relative;transition:transform .5s ease;}
.cn-photo--left{transform:rotate(-2deg);}
.cn-photo--right{transform:rotate(2deg);margin-left:clamp(-40px,-4cqw,-16px);}
.cn-photo:hover{transform:translateY(-10px) scale(1.05) rotate(0deg);}
.cn-photo__img{width:clamp(180px,26cqw,340px);display:block;border-radius:3px;
  box-shadow:0 20px 40px rgba(0,0,0,.18);}
.cn-photo__frame{background:#fff;padding:3.5% 3.5% 12%;border-radius:3px;
  box-shadow:0 20px 40px rgba(0,0,0,.18);}
.cn-photo__win{overflow:hidden;aspect-ratio:4/5;background:rgba(0,0,0,.06);}
.cn-photo__win img{width:100%;height:100%;object-fit:cover;display:block;}
.cn-sticker{position:absolute;pointer-events:none;user-select:none;filter:drop-shadow(0 4px 10px rgba(0,0,0,.12));}
.cn-sticker--hat{top:-8%;right:38%;width:clamp(56px,9cqw,110px);transform:rotate(-12deg);}
.cn-sticker--heart{bottom:-2%;right:2%;width:clamp(44px,7cqw,88px);transform:rotate(8deg);}

.cn-doodles{position:relative;width:100%;max-width:340px;margin:20px auto 0;height:24px;}
.cn-doodle{position:absolute;top:0;animation:cn-float-slow 6s ease-in-out infinite;}
.cn-doodle--a{left:12%;}
.cn-doodle--b{right:18%;top:4px;animation-duration:8s;}

.cn-divider{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:clamp(32px,4cqw,44px);}
.cn-divider__line{width:40px;height:1px;background:var(--cn-ink);opacity:.3;}

/* ---------- generic content sections (schedule/travel/registry/faq) ---------- */
.cn-sec{position:relative;z-index:10;padding:clamp(40px,6cqw,72px) clamp(16px,4cqw,32px);}
.cn-sec__inner{width:min(720px,94%);margin:0 auto;text-align:center;}
.cn-card{background:rgba(255,255,255,.4);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.5);border-radius:20px;padding:clamp(20px,3.4cqw,32px);
  box-shadow:0 4px 24px rgba(0,0,0,.06);text-align:left;}
.cn-card + .cn-card{margin-top:16px;}
.cn-card__title{font-family:var(--cn-display);font-size:clamp(1.15rem,2.6cqw,1.5rem);color:var(--cn-ink);margin:0 0 6px;}
.cn-card__body{font-family:var(--cn-body);font-size:clamp(.95rem,2cqw,1.1rem);color:var(--cn-muted);margin:0;line-height:1.5;}
.cn-grid{display:grid;gap:16px;grid-template-columns:1fr;}
@container cn (min-width:640px){.cn-grid--cols3{grid-template-columns:repeat(3,1fr);}}

/* ---------- RSVP glass card ---------- */
.cn-rsvp{position:relative;z-index:10;width:100%;padding:24px 8px 40px;}
.cn-rsvp__fade{position:absolute;bottom:0;left:0;right:0;height:160px;pointer-events:none;
  background:linear-gradient(to top, var(--cn-bg-color), rgba(255,255,255,0) 100%);}
.cn-rsvp__inner{position:relative;z-index:1;width:min(480px,94%);margin:0 auto;}
.cn-rsvp__card{background:rgba(255,255,255,.3);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.4);border-radius:24px;padding:clamp(28px,5cqw,48px);text-align:center;
  box-shadow:0 4px 24px rgba(0,0,0,.08);}
.cn-field{display:block;width:100%;font-family:var(--cn-body);font-size:1.1rem;color:var(--cn-ink);
  background:rgba(255,255,255,.6);border:1px solid rgba(0,0,0,.1);border-radius:14px;
  padding:12px 16px;margin-top:10px;}
.cn-field:focus{outline:none;border-color:var(--cn-ink);}
.cn-submit{width:100%;margin-top:14px;font-family:var(--cn-body);font-size:1.15rem;font-weight:600;
  color:#fff;background:var(--cn-ink);border:none;border-radius:999px;padding:13px 20px;cursor:pointer;
  box-shadow:0 4px 16px rgba(0,0,0,.12);}
.cn-submit[disabled]{opacity:.6;cursor:default;}
.cn-signature{margin-top:clamp(40px,6cqw,72px);text-align:center;}

/* ---------- editor-only affordances (never published) ---------- */
.cn-hint{display:inline-block;font-family:var(--cn-body);font-size:clamp(.85rem,2cqw,1rem);
  opacity:.55;border-bottom:1px dashed currentColor;padding-bottom:2px;}
.cn-hint-block{display:block;margin-top:20px;}
.cn-photo__win--empty{display:flex;align-items:center;justify-content:center;
  aspect-ratio:1/1;width:clamp(180px,26cqw,340px);border-radius:3px;
  background:rgba(0,0,0,.05);border:1px dashed rgba(0,0,0,.18);}
.cn-photo__win--empty span{font-family:var(--cn-body);font-size:clamp(.85rem,2cqw,1rem);
  color:var(--cn-muted);opacity:.8;}

/* ---------- footer ---------- */
.cn-footer{position:relative;z-index:10;width:100%;padding:18px 16px;text-align:center;background:var(--cn-muted);}
.cn-footer p{font-family:var(--cn-body-plain);font-size:.85rem;color:#fff;margin:0;}
.cn-footer a{color:#fff;font-weight:700;}
`;
