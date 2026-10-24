// Lacquer Door's styles. Every size follows the page's own width (container units), so the
// builder's 390px preview, the gallery card and a phone lay out alike. The door is sized by
// --dw (its width) and everything on it scales with that. The opening (.lq-play → .lq-go)
// is transform/opacity/colour only; everywhere else the page rests still.

export const LACQUER_CSS = `
.lq-root{container-type:inline-size;position:relative;overflow-x:clip;color:var(--lq-ink);font-family:var(--lq-body);font-optical-sizing:auto;
  background-color:var(--lq-bg);background-image:var(--lq-grain);background-blend-mode:multiply;
  --cin:#B3352B;--lac:#5E1915;--gold:#B08D4A;--paper:#F5EEE2;--ink0:#221A16;--acc:var(--cin);--rule:rgba(176,141,74,.6);--goldtext:#8a6a2e}
.lq-dark{--acc:#D4B06A;--rule:rgba(212,176,106,.45);--goldtext:#D4B06A;background-blend-mode:normal;background-image:none}
.lq-root *,.lq-root *::before,.lq-root *::after{box-sizing:border-box}
.lq-root a{color:inherit}
.lq-zh{font-family:var(--lq-zh);font-style:normal;font-synthesis:none;letter-spacing:.02em}
.lq-hint{opacity:.55}

/* ---- the door ---- */
.lq-hero{position:relative;overflow:clip;padding:clamp(28px,6cqw,64px) 0 0;--dw:min(92cqw,700px);--post:calc(var(--dw) * .045)}
.lq-gallery .lq-hero{--dw:min(92cqw,44cqw);padding-top:3.6cqw}
.lq-gallery .lq-floor{height:12cqw}
.lq-portal{position:relative;z-index:1;width:var(--dw);margin:0 auto}
.lq-lintel{position:relative;display:flex;justify-content:center;align-items:center;gap:calc(var(--dw) * .34);height:calc(var(--dw) * .055);margin:0 calc(var(--dw) * -.05);background:var(--lac);
  box-shadow:0 calc(var(--dw) * .012) calc(var(--dw) * .02) calc(var(--dw) * -.01) rgba(30,8,4,.45)}
.lq-lintel::before{content:"";position:absolute;inset:22% 1.6%;border-top:1px solid var(--gold);border-bottom:1px solid var(--gold)}
.lq-pin{position:relative;width:calc(var(--dw) * .036);aspect-ratio:1;border-radius:50%;background:var(--cin);box-shadow:0 0 0 1px var(--gold),inset 0 0 0 calc(var(--dw) * .008) var(--cin),inset 0 0 0 calc(var(--dw) * .008 + 1px) var(--gold)}
.lq-frame{position:relative;background:var(--lac);padding:0 var(--post)}
.lq-frame::before,.lq-frame::after{content:"";position:absolute;top:0;bottom:0;width:1px;background:var(--gold);opacity:.7}
.lq-frame::before{left:calc(var(--post) * .35)}
.lq-frame::after{right:calc(var(--post) * .35)}
.lq-transom{display:grid;grid-template-columns:1fr auto 1fr;gap:calc(var(--dw) * .03);padding:calc(var(--dw) * .03) 0}
.lq-transom__lattice{display:block;background:#EADBC0 var(--lq-lattice-sq) center/calc(var(--dw) * .055) calc(var(--dw) * .055) round;box-shadow:0 0 0 1px var(--gold)}
.lq-moon{display:grid;place-items:center;width:calc(var(--dw) * .17);aspect-ratio:1;border-radius:50%;background-color:#F3E6CF;
  box-shadow:0 0 0 calc(var(--dw) * .009) var(--cin),0 0 0 calc(var(--dw) * .009 + 1px) var(--gold),inset 0 0 0 calc(var(--dw) * .011) #F3E6CF,inset 0 0 0 calc(var(--dw) * .011 + 1px) rgba(176,141,74,.75)}
.lq-moon__xi{font-size:calc(var(--dw) * .1);line-height:1;color:var(--cin);font-weight:700;letter-spacing:0;translate:0 2%}
.lq-opening{position:relative;display:grid;overflow:hidden;min-height:calc(var(--dw) * 1.04);perspective:calc(var(--dw) * 3.2);perspective-origin:50% 46%;box-shadow:0 0 0 1px var(--gold)}
.lq-inside{position:relative;display:grid;justify-items:center;align-content:center;padding:calc(var(--dw) * .085) 12.5% calc(var(--dw) * .08);text-align:center;color:var(--ink0);
  background-color:#F4E8D3;background-image:radial-gradient(72% 52% at 50% 36%,rgba(255,250,238,.95),rgba(255,248,234,0) 72%),var(--lq-grain);background-blend-mode:normal,multiply}
.lq-inside__depth{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 calc(var(--dw) * .035) calc(var(--dw) * .05) calc(var(--dw) * -.025) rgba(60,20,10,.4),inset 0 0 calc(var(--dw) * .14) rgba(110,50,25,.16)}

/* a leaf: lattice, waist with its ring, carved skirt; hinged at the outer edge, resting open */
.lq-leaf{position:absolute;top:0;bottom:0;width:50%;display:flex;flex-direction:column;gap:calc(var(--dw) * .016);padding:calc(var(--dw) * .024);background:var(--cin);pointer-events:none;--open:84deg}
.lq-leaf::before{content:"";position:absolute;inset:calc(var(--dw) * .009);border:1px solid var(--gold);pointer-events:none}
.lq-leaf--l{left:0;transform-origin:0 50%;transform:rotateY(var(--open));box-shadow:inset -1px 0 0 var(--lac)}
.lq-leaf--r{right:0;transform-origin:100% 50%;transform:rotateY(calc(var(--open) * -1));box-shadow:inset 1px 0 0 var(--lac)}
.lq-leaf__lattice{position:relative;display:block;flex:1 1 auto;min-height:calc(var(--dw) * .34);background:#EEDFC4 var(--lq-lattice) center/calc(var(--dw) * .066) calc(var(--dw) * .092) round;
  box-shadow:0 0 0 calc(var(--dw) * .007) var(--lac),0 0 0 calc(var(--dw) * .007 + 1px) var(--gold)}
.lq-leaf__waist{position:relative;display:grid;place-items:center;flex:none;height:calc(var(--dw) * .058)}
.lq-leaf__cartouche{display:block;width:74%;height:58%;border:1px solid var(--gold);border-radius:999px;background:rgba(94,25,21,.4)}
.lq-ring{position:absolute;top:50%;width:calc(var(--dw) * .058);height:auto;translate:0 -25%;overflow:visible}
.lq-leaf--l .lq-ring{right:calc(var(--dw) * -.006)}
.lq-leaf--r .lq-ring{left:calc(var(--dw) * -.006)}
.lq-ring__swing{transform-box:view-box;transform-origin:20px 15px}
.lq-leaf__skirt{display:block;flex:none;height:calc(var(--dw) * .24)}
.lq-skirt{display:block;width:100%;height:100%}
.lq-leaf__foot{display:block;flex:none;height:calc(var(--dw) * .018);background:var(--lac);box-shadow:inset 0 1px 0 var(--gold)}
.lq-leaf__shade{position:absolute;inset:0;background:#1d0806;opacity:.32;pointer-events:none}
.lq-seam{position:absolute;z-index:3;top:0;bottom:0;left:50%;width:2px;margin-left:-1px;background:#FFF3D6;opacity:0;pointer-events:none;
  box-shadow:0 0 calc(var(--dw) * .02) calc(var(--dw) * .005) rgba(255,222,160,.9),0 0 calc(var(--dw) * .09) calc(var(--dw) * .01) rgba(255,206,130,.45)}
.lq-sill{position:relative;height:calc(var(--dw) * .045);margin:0 calc(var(--dw) * -.035);background:var(--lac);box-shadow:inset 0 1px 0 var(--gold),0 calc(var(--dw) * .02) calc(var(--dw) * .03) calc(var(--dw) * -.02) rgba(30,8,4,.5)}
.lq-sill::after{content:"";position:absolute;left:1.4%;right:1.4%;bottom:28%;border-top:1px solid var(--gold);opacity:.7}
.lq-floor{position:relative;display:block;height:clamp(44px,9cqw,96px);background:linear-gradient(180deg,color-mix(in srgb,var(--lq-ink) 8%,var(--lq-bg)),var(--lq-bg))}
.lq-spill{position:absolute;left:50%;top:0;width:calc(var(--dw) * 1.12);height:100%;translate:-50% 0;clip-path:polygon(9% 0,91% 0,100% 100%,0 100%);
  background:linear-gradient(180deg,rgba(255,230,180,.55),rgba(255,230,180,0))}
.lq-dark .lq-spill{background:linear-gradient(180deg,rgba(255,214,150,.34),rgba(255,214,150,0))}
.lq-dusk{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;background:radial-gradient(70% 60% at 50% 52%,rgba(24,8,5,.18),rgba(24,8,5,.6))}

/* inside the door */
.lq-hz{margin:0 0 calc(var(--dw) * .018);font-size:calc(var(--dw) * .118);line-height:1.08;letter-spacing:.16em;padding-left:.16em;color:var(--cin);font-weight:600;white-space:nowrap}
.lq-hline{margin:0 0 calc(var(--dw) * .036);font:500 max(12px,calc(var(--dw) * .024))/1.35 var(--lq-body);letter-spacing:.24em;text-transform:uppercase;color:#6e5646}
.lq-names{margin:0;display:flex;justify-content:center;align-items:flex-start;font-weight:400}
.lq-name{display:flex;align-items:flex-start;min-width:0}
.lq-name__col{display:grid;justify-items:center;gap:calc(var(--dw) * .014);min-width:0}
.lq-name__en{display:block;font-family:var(--lq-display);font-size:max(25px,calc(var(--dw) * .076));font-weight:500;line-height:1.04;letter-spacing:.004em;text-wrap:balance}
.lq-name__zh{display:block;font-size:max(22px,calc(var(--dw) * .066));line-height:1.15;letter-spacing:.08em;padding-left:.08em;color:var(--cin);font-weight:600;white-space:nowrap}
.lq-amp{display:block;margin:0 max(10px,calc(var(--dw) * .04));font-family:var(--lq-display);font-style:italic;font-size:max(20px,calc(var(--dw) * .058));line-height:1.3;color:var(--goldtext)}
.lq-knot{display:block;width:clamp(96px,12cqw,132px);height:auto;color:var(--gold)}
.lq-inside__knot{width:max(90px,calc(var(--dw) * .22));margin:calc(var(--dw) * .045) auto calc(var(--dw) * .03)}
.lq-date{margin:0;max-width:24ch;font-family:var(--lq-display);font-size:max(18px,calc(var(--dw) * .037));font-weight:500;line-height:1.35;text-wrap:balance}
.lq-lunar{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:.2em .7em;margin:calc(var(--dw) * .014) 0 0;font-size:max(16px,calc(var(--dw) * .032))}
.lq-lunar__k{font-size:.78em;letter-spacing:.14em;color:var(--cin)}
.lq-lunar__v{letter-spacing:.08em;white-space:nowrap}
.lq-count{display:flex;justify-content:center;align-items:flex-start;gap:max(10px,calc(var(--dw) * .045));margin:calc(var(--dw) * .05) 0 0}
.lq-count__cell{display:grid;justify-items:center;gap:4px;min-width:2.4ch}
.lq-count__n{font-family:var(--lq-display);font-size:max(24px,calc(var(--dw) * .054));font-weight:500;line-height:1;font-variant-numeric:lining-nums tabular-nums}
.lq-count__l{font-size:max(10px,calc(var(--dw) * .017));letter-spacing:.1em;text-transform:uppercase;color:#6e5646}
.lq-count__sep{display:none}
.lq-inside .lq-btn{margin-top:calc(var(--dw) * .055)}

/* ---- buttons ---- */
.lq-btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 34px;border:0;border-radius:1px;background:var(--cin);color:var(--paper);
  font:600 17px/1.1 var(--lq-body);letter-spacing:.08em;text-decoration:none;cursor:pointer;box-shadow:inset 0 0 0 4px var(--cin),inset 0 0 0 5px rgba(232,204,146,.75);transition:background-color .25s,box-shadow .25s}
.lq-btn:hover{background:var(--lac);box-shadow:inset 0 0 0 4px var(--lac),inset 0 0 0 5px rgba(232,204,146,.75)}
.lq-btn--line{background:transparent;color:var(--lq-ink);box-shadow:inset 0 0 0 1px var(--rule)}
.lq-btn--line:hover{background:var(--cin);color:var(--paper);box-shadow:inset 0 0 0 1px var(--cin)}
.lq-btn--block{width:100%}
.lq-btn:disabled{opacity:.6;cursor:not-allowed}
.lq-btn:focus-visible,.lq-choice__opt:focus-visible,.lq-step button:focus-visible,.lq-link:focus-visible,.lq-venue__map:focus-visible{outline:2px solid var(--gold);outline-offset:3px}

/* ---- the page ---- */
.lq-main{position:relative;padding-bottom:clamp(88px,12cqw,150px)}
.lq-sec{position:relative;max-width:1040px;margin:0 auto;padding:clamp(76px,10cqw,128px) 16px 0}
.lq-narrow{max-width:700px;text-align:center}
.lq-head{display:grid;justify-items:center;gap:clamp(10px,1.3cqw,14px);margin:0 0 clamp(30px,4cqw,48px);text-align:center}
.lq-head__zh{font-size:clamp(42px,6.4cqw,72px);line-height:1;letter-spacing:.2em;padding-left:.2em;color:var(--acc);font-weight:600;white-space:nowrap}
.lq-head__knot{width:clamp(96px,11cqw,124px)}
.lq-head__en{margin:0;font:600 clamp(14px,1.4cqw,16px)/1.35 var(--lq-body);letter-spacing:.26em;text-transform:uppercase;color:var(--lq-ink)}
.lq-eyebrow{margin:0 0 8px;font:600 clamp(13px,1.3cqw,14px)/1.35 var(--lq-body);letter-spacing:.22em;text-transform:uppercase;color:var(--lq-muted)}
.lq-text{margin:0 0 14px;font-size:clamp(19px,1.9cqw,21px);line-height:1.62;text-wrap:pretty}
.lq-text--lead{font-family:var(--lq-display);font-size:clamp(24px,2.7cqw,31px);line-height:1.42}
.lq-small{margin:6px 0;font-size:15px;line-height:1.5;color:var(--lq-muted)}
.lq-corners{position:absolute;inset:var(--ci,18px);pointer-events:none;color:var(--gold)}
.lq-corner{position:absolute;width:var(--cs,22px);height:var(--cs,22px)}
.lq-corner--tl{top:0;left:0}
.lq-corner--tr{top:0;right:0;transform:scaleX(-1)}
.lq-corner--bl{bottom:0;left:0;transform:scaleY(-1)}
.lq-corner--br{bottom:0;right:0;transform:scale(-1,-1)}
/* builder only (shared/siteEdit) */
.lq-add{margin-top:14px}
.lq-add--center{display:flex;width:max-content;max-width:100%;margin:26px auto 0}
.lq-add--small{min-height:32px;padding:4px 12px;margin-top:10px;font-size:.78em}

/* the invitation: a paper card in a cinnabar double rule */
.lq-invite{max-width:780px}
.lq-invite__card,.lq-card{position:relative;text-align:center;color:var(--ink0);--lq-ink:#221A16;--lq-muted:#6b5a4c;--acc:var(--cin);--rule:rgba(176,141,74,.6);--goldtext:#8a6a2e;--b:clamp(9px,1.3cqw,13px);
  background-color:#FBF6EC;background-image:var(--lq-grain);background-blend-mode:multiply;
  box-shadow:inset 0 0 0 var(--b) #FBF6EC,inset 0 0 0 calc(var(--b) + 2px) var(--cin),inset 0 0 0 calc(var(--b) + 6px) #FBF6EC,inset 0 0 0 calc(var(--b) + 7px) var(--gold),0 26px 50px -30px rgba(40,12,6,.5)}
.lq-invite__card{padding:clamp(56px,7.5cqw,84px) clamp(30px,6cqw,76px)}
.lq-invite__card .lq-corners,.lq-card .lq-corners{--ci:calc(var(--b) + 13px)}
.lq-invite__zh{margin:0 0 12px;font-size:clamp(36px,5.6cqw,60px);line-height:1.1;letter-spacing:.14em;padding-left:.14em;color:var(--cin);font-weight:600;white-space:nowrap}
.lq-parents{position:relative;display:grid;gap:22px;margin:clamp(20px,3cqw,30px) auto 0;max-width:600px}
.lq-parents__side{display:grid;justify-items:center;align-content:start}
.lq-parents__t{margin:0 0 6px;font:600 13px/1.35 var(--lq-body);letter-spacing:.2em;text-transform:uppercase;color:var(--lq-muted)}
.lq-parents__n{margin:0;font-family:var(--lq-display);font-size:clamp(21px,2.3cqw,25px);font-weight:500;line-height:1.35;text-wrap:balance}
@container (min-width:440px){.lq-parents{grid-template-columns:1fr 1fr;gap:0}.lq-parents__side{padding:0 clamp(10px,2.4cqw,26px)}.lq-parents__side+.lq-parents__side{border-left:1px solid var(--rule)}.lq-parents--one{grid-template-columns:1fr}}
.lq-invite__line{margin:clamp(26px,3.4cqw,36px) auto 0;max-width:22ch;font-family:var(--lq-display);font-style:italic;font-size:clamp(25px,3.3cqw,38px);line-height:1.32;text-wrap:balance}

/* where: two plaques */
.lq-venues{display:grid;gap:64px;max-width:940px;text-align:center}
@container (min-width:700px){.lq-venues{grid-template-columns:1fr 1fr;gap:0}.lq-venue+.lq-venue{border-left:1px solid var(--rule)}}
.lq-venue{display:grid;justify-items:center;align-content:start;padding:0 clamp(12px,3cqw,40px)}
.lq-mark{display:block;width:46px;height:46px;margin:0 0 16px;color:var(--gold)}
.lq-plaque{margin:0 0 16px;padding:7px 12px 7px 16px;background:var(--cin);color:var(--paper);box-shadow:inset 0 0 0 3px var(--cin),inset 0 0 0 4px rgba(232,204,146,.8)}
.lq-plaque .lq-zh{display:block;font-size:clamp(22px,2.6cqw,28px);line-height:1.2;letter-spacing:.32em;font-weight:600}
.lq-venue__name{margin:4px 0 10px;font-family:var(--lq-display);font-weight:500;font-size:clamp(31px,3.6cqw,42px);line-height:1.12;text-wrap:balance}
.lq-venue__addr{margin:0 0 6px;max-width:30ch;font-size:19px;line-height:1.5;color:var(--lq-muted)}
.lq-venue__time{margin:0 0 4px;font-style:italic;font-size:20px}
.lq-venue__map{display:inline-flex;align-items:center;min-height:44px;font:600 16px var(--lq-body);text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px}

/* the order of the day: a tiered betrothal box */
.lq-day{max-width:760px}
.lq-box{position:relative;width:min(100%,600px);margin:0 auto;filter:drop-shadow(0 26px 22px rgba(40,10,6,.22))}
.lq-dark .lq-box{filter:drop-shadow(0 26px 26px rgba(0,0,0,.45))}
.lq-lid,.lq-base{display:block;width:100%;height:auto}
.lq-lid{margin-bottom:-1px}
.lq-base{margin-top:-1px}
.lq-tiers{list-style:none;margin:0 9.67%;padding:0}
.lq-tier{position:relative;padding:calc(var(--rail) + clamp(6px,1cqw,9px)) clamp(6px,1cqw,9px) clamp(6px,1cqw,9px);background:var(--cin);--rail:clamp(7px,1.1cqw,10px)}
.lq-tier::before{content:"";position:absolute;left:-2.4%;right:-2.4%;top:0;height:var(--rail);background:var(--lac);box-shadow:inset 0 1px 0 var(--gold),inset 0 -1px 0 var(--gold)}
.lq-tier__face{display:grid;justify-items:center;gap:5px;padding:clamp(18px,2.6cqw,28px) 14px;border:1px solid rgba(222,190,128,.7);color:var(--paper);text-align:center}
.lq-tier__t{font:600 clamp(13px,1.3cqw,14px)/1.2 var(--lq-body);letter-spacing:.2em;text-transform:uppercase;color:rgba(245,238,226,.85)}
.lq-tier__zh{display:block;margin:2px 0;font-size:clamp(32px,4.4cqw,46px);line-height:1.15;letter-spacing:.18em;padding-left:.18em;font-weight:600;white-space:nowrap}
.lq-tier__desc{display:block;font-style:italic;font-size:18px;line-height:1.4;opacity:.92}
.lq-tier__en{display:block;font-family:var(--lq-display);font-size:clamp(21px,2.3cqw,25px);font-weight:500;line-height:1.3;text-wrap:balance}

/* elders & family: the front of a lacquer gift box, one panel for each group */
.lq-elders{max-width:900px}
.lq-chest{position:relative;display:grid;gap:clamp(8px,1.2cqw,12px);max-width:860px;margin:clamp(14px,2cqw,20px) auto 0;padding:clamp(12px,1.8cqw,18px);background:var(--lac);
  box-shadow:inset 0 0 0 1px var(--gold),0 30px 50px -30px rgba(40,10,6,.55)}
.lq-chest::before{content:"";position:absolute;left:-1.6%;right:-1.6%;bottom:100%;height:clamp(10px,1.5cqw,15px);background:var(--lac);box-shadow:inset 0 1px 0 var(--gold),inset 0 -1px 0 var(--gold)}
.lq-chest__brass{position:absolute;inset:0;pointer-events:none}
.lq-chest__brass .lq-corners{--ci:-5px;--cs:clamp(24px,3cqw,32px);color:#C9A45E}
.lq-chest__brass .lq-corner path{stroke-width:2.2}
@container (min-width:620px){.lq-chest{grid-template-columns:1fr 1fr}.lq-chest>.lq-panel:last-child:nth-child(even){grid-column:1/-1}.lq-chest--one{max-width:540px}}
.lq-panel{position:relative;padding:clamp(30px,4cqw,44px) 18px;text-align:center;background:var(--cin);color:var(--paper);
  box-shadow:inset 0 0 0 clamp(7px,1cqw,10px) var(--cin),inset 0 0 0 calc(clamp(7px,1cqw,10px) + 1px) rgba(222,190,128,.8)}
.lq-panel__t{margin:0 0 12px;font:600 13px/1.35 var(--lq-body);letter-spacing:.2em;text-transform:uppercase;color:rgba(245,238,226,.85)}
.lq-panel__names{list-style:none;margin:0;padding:0;font-family:var(--lq-display);font-size:clamp(21px,2.3cqw,25px);font-weight:500;line-height:1.5}
.lq-panel .site-add{color:var(--paper)}

/* what to wear: silk on a lacquer tray */
.lq-tray{display:inline-flex;flex-wrap:wrap;justify-content:center;gap:clamp(8px,1.2cqw,12px);padding:clamp(10px,1.4cqw,14px);margin-top:20px;background:var(--lac);box-shadow:inset 0 0 0 1px var(--gold)}
.lq-silk{display:block;width:clamp(50px,7cqw,72px);aspect-ratio:1;background-color:var(--c);background-image:linear-gradient(135deg,rgba(255,255,255,.2),rgba(255,255,255,0) 48%,rgba(0,0,0,.08));box-shadow:0 0 0 1px rgba(214,182,120,.7)}

/* photos, each in a lacquer frame */
.lq-frames{display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(10px,1.6cqw,18px);max-width:980px;margin:0 auto;--n:2}
@container (min-width:700px){.lq-frames{--n:3}.lq-frames--2,.lq-frames--4{--n:2;max-width:760px}}
.lq-frames--1{--n:1;max-width:460px}
.lq-frame-photo{position:relative;width:calc((100% - (var(--n) - 1) * clamp(10px,1.6cqw,18px)) / var(--n));aspect-ratio:4/5;padding:clamp(6px,.9cqw,9px);background:var(--lac);box-shadow:inset 0 0 0 1px var(--gold)}
.lq-frame-photo__img{position:relative;width:100%;height:100%;overflow:hidden;box-shadow:0 0 0 1px var(--gold)}
.lq-frame-photo .photo-slot--empty{display:grid;place-items:center;background:#EADBC0;color:var(--lac)}
.lq-root .photo-slot__label{display:grid;justify-items:center;gap:8px;padding:0 12px;font:600 14px/1.3 var(--lq-body);letter-spacing:.04em;text-align:center}

/* ang pao & gifts */
.lq-angpao{display:block;width:42px;height:auto;margin:0 auto 20px}
.lq-links{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:10px 0}

/* good to know */
.lq-know__grid{display:grid;gap:10px clamp(32px,5cqw,64px);max-width:900px;margin:0 auto;text-align:center}
@container (min-width:760px){.lq-know__grid{grid-template-columns:1fr 1fr}.lq-know__grid>.lq-item:last-child:nth-child(odd){grid-column:1/-1;justify-self:center;max-width:440px}}
.lq-item{margin:0 0 26px}
.lq-item__q{margin:0 0 6px;font-family:var(--lq-display);font-size:clamp(23px,2.5cqw,27px);font-weight:500;line-height:1.3;text-wrap:balance}

/* the reply card */
.lq-rsvp-wrap{max-width:660px}
.lq-card{width:min(100%,600px);margin:0 auto;padding:clamp(54px,7cqw,76px) clamp(28px,5.5cqw,60px)}
.lq-card__zh{margin:0 0 8px;font-size:clamp(32px,4.6cqw,48px);line-height:1.1;letter-spacing:.2em;padding-left:.2em;color:var(--cin);font-weight:600;white-space:nowrap}
.lq-card__title{margin:0 0 12px;font:600 15px/1.35 var(--lq-body);letter-spacing:.26em;text-transform:uppercase}
.lq-seats{margin:4px auto 6px;max-width:26ch;text-wrap:balance;font-family:var(--lq-display);font-style:italic;font-size:clamp(22px,2.4cqw,26px);line-height:1.4}
.lq-form{position:relative;display:grid;gap:20px;margin-top:24px;text-align:left}
.lq-form label,.lq-party__label{display:block;margin-bottom:4px;font-size:16px;color:var(--lq-muted)}
.lq-field{width:100%;padding:10px 2px;border:0;border-bottom:1px solid rgba(34,26,22,.35);border-radius:0;background:transparent;color:var(--lq-ink);font:400 19px/1.4 var(--lq-body);outline:none}
.lq-field:focus{border-bottom-color:var(--cin)}
textarea.lq-field{padding:10px 12px;border:1px solid rgba(34,26,22,.25);resize:vertical}
select.lq-field{appearance:auto}
.lq-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.lq-choice__opt{min-height:54px;padding:0 8px;border:1px solid rgba(34,26,22,.3);border-radius:1px;background:transparent;color:var(--lq-ink);font:600 17px/1.2 var(--lq-body);letter-spacing:.02em;cursor:pointer;transition:background-color .25s,color .25s,border-color .25s}
.lq-choice__opt.is-picked{background:var(--cin);border-color:var(--cin);color:var(--paper)}
.lq-party{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px}
.lq-party__label{margin:0}
.lq-step{display:inline-flex;align-items:center;border:1px solid rgba(34,26,22,.3)}
.lq-step button{width:48px;height:48px;border:0;background:transparent;color:var(--lq-ink);font:400 24px/1 var(--lq-body);cursor:pointer}
.lq-step button:disabled{opacity:.3;cursor:default}
.lq-step output{min-width:2.6ch;text-align:center;font:500 24px/1 var(--lq-display);font-variant-numeric:lining-nums tabular-nums}
.lq-link{min-height:44px;padding:6px 0;border:0;background:none;color:var(--lq-ink);font:16px var(--lq-body);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.lq-error{margin:0;color:#9b2c2c}
.lq-done{display:grid;justify-items:center;gap:4px}
.lq-done .lq-btn{margin-top:16px}

/* the lacquer base */
.lq-foot{position:relative;display:grid;justify-items:center;gap:6px;padding:calc(clamp(18px,2.6cqw,26px) + clamp(52px,7cqw,84px)) 16px clamp(36px,5cqw,56px);text-align:center;background:var(--lac);color:var(--paper)}
.lq-foot__lattice{position:absolute;left:0;right:0;top:0;height:clamp(18px,2.6cqw,26px);background:#EADBC0 var(--lq-lattice-sq) center/clamp(18px,2.6cqw,26px) clamp(18px,2.6cqw,26px) round;box-shadow:inset 0 -1px 0 var(--gold),0 1px 0 var(--lac),0 2px 0 var(--gold)}
.lq-foot__line{margin:0;font-family:var(--lq-display);font-size:clamp(23px,2.8cqw,30px);font-weight:500;letter-spacing:.06em}
.lq-mixed{font-family:var(--lq-display),var(--lq-zh);font-style:normal;font-synthesis:none}
.lq-mono{margin:4px 0 0;font-family:var(--lq-display);font-style:italic;font-size:clamp(34px,4.4cqw,48px);line-height:1.2;color:#E3C88E}
.lq-foot__knot{margin-top:10px;color:#C9A45E}
.lq-credit{margin:22px 0 0;font-size:14px;opacity:.8}

/* ---- the opening: closed, lit from behind → the doors swing in, light spills onto the step ---- */
.lq-play .lq-leaf{will-change:transform}
.lq-play .lq-leaf--l,.lq-play .lq-leaf--r{transform:none}
.lq-play .lq-leaf__shade{opacity:0}
.lq-play .lq-leaf__lattice,.lq-play .lq-transom__lattice{background-color:#FFEFCB}
.lq-play .lq-moon{background-color:#FFF2D4}
.lq-play .lq-seam{opacity:1}
.lq-play .lq-dusk{opacity:1}
.lq-play .lq-spill{opacity:0}
.lq-play .lq-rise{opacity:0}
.lq-play.lq-go .lq-leaf--l{animation:lq-open-l 3.1s cubic-bezier(.52,.02,.2,1) .5s both}
.lq-play.lq-go .lq-leaf--r{animation:lq-open-r 3.1s cubic-bezier(.52,.02,.2,1) .5s both}
.lq-play.lq-go .lq-leaf__shade{animation:lq-shade 3.1s ease .5s both}
.lq-play.lq-go .lq-leaf__lattice{animation:lq-unlit 2.8s ease .8s both}
.lq-play.lq-go .lq-transom__lattice{animation:lq-unlit-t 3.2s ease 1.2s both}
.lq-play.lq-go .lq-moon{animation:lq-unlit-m 3.2s ease 1.2s both}
.lq-play.lq-go .lq-seam{animation:lq-seam 1.3s ease .45s both}
.lq-play.lq-go .lq-dusk{animation:lq-fade 2.8s ease .9s both}
.lq-play.lq-go .lq-spill{animation:lq-spill 3.4s ease .8s both}
.lq-play.lq-go .lq-ring__swing{animation:lq-sway 2.6s ease-in-out .7s both}
.lq-play.lq-go .lq-rise{animation:lq-rise 1.3s cubic-bezier(.2,.7,.2,1) var(--d,2.2s) both}
@keyframes lq-open-l{0%{transform:rotateY(0deg)}11%{transform:rotateY(2.6deg)}19%{transform:rotateY(3deg)}100%{transform:rotateY(84deg)}}
@keyframes lq-open-r{0%{transform:rotateY(0deg)}11%{transform:rotateY(-2.6deg)}19%{transform:rotateY(-3deg)}100%{transform:rotateY(-84deg)}}
@keyframes lq-shade{0%,15%{opacity:0}100%{opacity:.32}}
@keyframes lq-unlit{from{background-color:#FFEFCB}to{background-color:#EEDFC4}}
@keyframes lq-unlit-t{from{background-color:#FFEFCB}to{background-color:#EADBC0}}
@keyframes lq-unlit-m{from{background-color:#FFF2D4}to{background-color:#F3E6CF}}
@keyframes lq-seam{0%{opacity:1;transform:scaleX(1)}35%{opacity:1;transform:scaleX(4)}100%{opacity:0;transform:scaleX(30)}}
@keyframes lq-fade{to{opacity:0}}
@keyframes lq-spill{0%{opacity:0}45%{opacity:1}100%{opacity:1}}
@keyframes lq-sway{0%{transform:rotate(0)}22%{transform:rotate(10deg)}46%{transform:rotate(-6deg)}70%{transform:rotate(3deg)}100%{transform:rotate(0)}}
@keyframes lq-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

/* scroll reveals (only where useReveal turns them on; the site's own [data-reveal] rule must not hide them) */
.lq-root [data-reveal]{opacity:1;transform:none;transition:none;will-change:auto}
.rv-on [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity 1.2s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .14s),transform 1.2s cubic-bezier(.2,.7,.2,1) calc(var(--i,0) * .14s)}
.rv-on [data-reveal].is-in{opacity:1;transform:none}
.rv-on .lq-box .lq-tier{opacity:0;transition:opacity 1s ease calc(var(--i,0) * .18s + .35s)}
.rv-on .lq-box.is-in .lq-tier{opacity:1}
.rv-on .lq-chest .lq-panel{opacity:0;transition:opacity 1s ease calc(var(--i,0) * .16s + .3s)}
.rv-on .lq-chest.is-in .lq-panel{opacity:1}

@media (prefers-reduced-motion:reduce){.lq-root *,.lq-root *::before,.lq-root *::after{animation:none!important;transition:none!important}}
`;
