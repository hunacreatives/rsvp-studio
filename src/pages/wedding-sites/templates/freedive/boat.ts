// The Blue's bangka, drawn side-on at the waterline: a slender hull with yellow and orange
// bands, bamboo outriggers on curved katig struts, a tarp canopy, tyre fenders, an engine box.
// Ids are prefixed per page so two boats on one page (the design gallery) don't share them.
export const boatSvg = (u: string) => `<svg viewBox="0 0 1400 600" aria-hidden="true"><defs>
<linearGradient id="${u}-hull" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse" y1="420" y2="520">
<stop offset="0" stop-color="#fbfcfb"/><stop offset=".35" stop-color="#eef2f1"/><stop offset=".75" stop-color="#cdd7d9"/><stop offset="1" stop-color="#9fb0b5"/>
</linearGradient>
<linearGradient id="${u}-sheen" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/>
</linearGradient>
<linearGradient id="${u}-belly" x1="0" y1="470" x2="0" y2="520" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#2a6f86"/><stop offset="1" stop-color="#123f52"/>
</linearGradient>
<linearGradient id="${u}-grime" x1="0" y1="440" x2="0" y2="472" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#6d7a5a" stop-opacity="0"/><stop offset="1" stop-color="#5d6a48" stop-opacity=".55"/>
</linearGradient>
<linearGradient id="${u}-yel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd24d"/><stop offset="1" stop-color="#e3ad21"/></linearGradient>
<linearGradient id="${u}-org" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f07a3c"/><stop offset="1" stop-color="#c9521f"/></linearGradient>
<linearGradient id="${u}-bamboo" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#f1d79d"/><stop offset=".3" stop-color="#dcb26a"/><stop offset=".75" stop-color="#b98a45"/><stop offset="1" stop-color="#8f6630"/>
</linearGradient>
<linearGradient id="${u}-strut" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#fbf7f1"/><stop offset=".6" stop-color="#e7dccd"/><stop offset="1" stop-color="#bfae98"/>
</linearGradient>
<linearGradient id="${u}-tarp" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#79c6e8"/><stop offset=".6" stop-color="#4aa2cf"/><stop offset="1" stop-color="#2f7fae"/>
</linearGradient>
<linearGradient id="${u}-post" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a87443"/><stop offset=".5" stop-color="#c79361"/><stop offset="1" stop-color="#7d532e"/></linearGradient>
<radialGradient id="${u}-tyre" cx=".5" cy=".5" r=".5"><stop offset=".45" stop-color="#1d2124" stop-opacity="0"/><stop offset=".47" stop-color="#2b3034"/><stop offset=".8" stop-color="#1a1d20"/><stop offset="1" stop-color="#0d0f10"/></radialGradient>
<filter id="${u}-grain" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0"/>
<feComposite in2="SourceGraphic" operator="in"/>
</filter>
<clipPath id="${u}-hullclip"><path d="M40 300 C 90 330 150 380 230 420 L 330 478 C 520 520 980 522 1240 500 C 1300 494 1338 470 1356 430 L 1364 392 L 1200 396 L 300 396 C 210 392 120 356 40 300 Z"/></clipPath>
</defs>
<rect x="150" y="488" width="1120" height="14" rx="7" fill="url(#${u}-bamboo)" opacity=".5"/>
<path d="M40 300 C 90 330 150 380 230 420 L 330 478 C 520 520 980 522 1240 500 C 1300 494 1338 470 1356 430 L 1364 392 L 1200 396 L 300 396 C 210 392 120 356 40 300 Z" fill="url(#${u}-hull)"/>
<g clip-path="url(#${u}-hullclip)">
<rect x="0" y="428" width="1400" height="20" fill="url(#${u}-sheen)" opacity=".7"/>
<rect x="0" y="424" width="1400" height="14" fill="#203038" opacity=".16"/>
<rect x="0" y="440" width="1400" height="32" fill="url(#${u}-grime)"/>
<path d="M150 472 L 1400 472 L 1400 600 L 150 600 Z" fill="url(#${u}-belly)"/>
<path d="M200 446 L 1356 444 M240 462 L 1340 460" stroke="#7f8f92" stroke-width="1.2" opacity=".35"/>
<path d="M334 432 q2 14 -1 28 M806 430 q2 14 -1 26 M1244 430 q2 12 -1 24" stroke="#9a5a2e" stroke-width="3" opacity=".25" stroke-linecap="round"/>
<path d="M346 400 C 320 430 300 462 292 480" stroke="#1b2a30" stroke-width="16" opacity=".12" fill="none"/>
<path d="M816 400 C 800 430 792 462 790 480" stroke="#1b2a30" stroke-width="16" opacity=".12" fill="none"/>
<path d="M1256 400 C 1240 430 1236 462 1236 480" stroke="#1b2a30" stroke-width="16" opacity=".12" fill="none"/>
<rect x="0" y="380" width="1400" height="160" filter="url(#${u}-grain)" fill="#000"/>
</g>
<path d="M40 300 C 120 356 210 392 300 396 L 1364 392 L 1362 406 L 300 410 C 205 406 112 368 34 312 Z" fill="url(#${u}-yel)"/>
<path d="M34 312 C 112 368 205 406 300 410 L 1362 406 L 1360 420 L 300 424 C 200 420 104 380 30 324 Z" fill="url(#${u}-org)"/>
<path d="M40 300 C 120 356 210 392 300 396 L 1364 392" stroke="#fff" stroke-opacity=".55" stroke-width="1.5" fill="none"/>
<path d="M40 300 C 24 288 18 262 30 240 C 34 232 44 232 46 240 C 40 258 44 280 58 296 Z" fill="url(#${u}-yel)"/>
<path d="M1356 392 C 1364 368 1372 350 1384 338 C 1390 334 1396 340 1392 346 C 1382 362 1376 380 1372 396 Z" fill="url(#${u}-org)"/>
<g>
<path d="M520 398 L 520 420 M1010 398 L 1010 420" stroke="#6b5a45" stroke-width="2.5"/>
<ellipse cx="520" cy="438" rx="22" ry="20" fill="url(#${u}-tyre)"/>
<ellipse cx="1010" cy="436" rx="22" ry="20" fill="url(#${u}-tyre)"/>
<path d="M504 430 a18 16 0 0 1 22 -10 M994 428 a18 16 0 0 1 22 -10" stroke="#5a6266" stroke-width="2" fill="none" opacity=".7"/>
</g>
<rect x="270" y="372" width="1060" height="12" rx="6" fill="url(#${u}-bamboo)"/>
<rect x="320" y="358" width="900" height="10" rx="5" fill="url(#${u}-bamboo)" opacity=".92"/>
<path d="M380 372 v12 M520 372 v12 M660 372 v12 M800 372 v12 M940 372 v12 M1080 372 v12 M1220 372 v12 M450 358 v10 M610 358 v10 M770 358 v10 M930 358 v10 M1090 358 v10" stroke="#8a6232" stroke-width="2.5" opacity=".6"/>
<rect x="1218" y="330" width="86" height="42" rx="5" fill="#3e6b7d"/>
<rect x="1218" y="330" width="86" height="8" rx="4" fill="#5d8a9b"/>
<rect x="1286" y="296" width="9" height="36" fill="#4a4f52"/>
<rect x="1283" y="292" width="15" height="7" rx="2" fill="#2d3134"/>
<path d="M552 372 L 1120 372 L 1108 358 L 562 358 Z" fill="#1e3e4c" opacity=".18"/>
<g>
<rect x="560" y="216" width="9" height="158" fill="url(#${u}-post)"/>
<rect x="740" y="216" width="9" height="158" fill="url(#${u}-post)"/>
<rect x="920" y="216" width="9" height="158" fill="url(#${u}-post)"/>
<rect x="1100" y="216" width="9" height="158" fill="url(#${u}-post)"/>
<path d="M528 204 L 1142 204 L 1142 220 Q 1048 232 945 222 Q 845 232 745 222 Q 645 232 528 220 Z" fill="url(#${u}-tarp)"/>
<path d="M528 204 L 1142 204" stroke="#a9dcf2" stroke-width="2"/>
<path d="M528 220 Q 645 232 745 222 Q 845 232 945 222 Q 1048 232 1142 220" stroke="#235f84" stroke-width="2.5" fill="none"/>
<path d="M565 222 l -10 -18 M1104 222 l 10 -18" stroke="#6b5a45" stroke-width="1.5"/>
</g>
<rect x="430" y="96" width="9" height="282" fill="url(#${u}-post)"/>
<path d="M439 100 Q 482 104 520 116 Q 482 126 439 132 Z" fill="url(#${u}-org)"/>
<circle cx="434" cy="94" r="7" fill="url(#${u}-yel)"/>
<path d="M434 100 L 240 392 M434 100 L 720 210" stroke="#6f604f" stroke-width="2" opacity=".6"/>
<path d="M70 318 C 40 360 18 420 6 520" stroke="#4d4335" stroke-width="3.5" fill="none" opacity=".85"/>
<g fill="none" stroke="url(#${u}-strut)" stroke-width="14" stroke-linecap="round">
<path d="M330 384 C 300 420 270 470 262 506"/>
<path d="M800 384 C 780 420 770 470 768 506"/>
<path d="M1240 384 C 1220 420 1214 470 1214 506"/>
</g>
<g fill="none" stroke="#a99a87" stroke-width="3" stroke-linecap="round" opacity=".55">
<path d="M336 390 C 308 424 280 472 272 504"/>
<path d="M806 390 C 788 424 778 472 776 504"/>
<path d="M1246 390 C 1228 424 1222 472 1222 504"/>
</g>
<path d="M254 498 h18 M760 498 h18 M1206 498 h18" stroke="#6b5a45" stroke-width="4" opacity=".7"/>
<rect x="120" y="496" width="1180" height="22" rx="11" fill="url(#${u}-bamboo)"/>
<path d="M130 500 L 1290 500" stroke="#fff3d8" stroke-width="2" opacity=".55"/>
<g stroke="#7d5628" stroke-width="3" opacity=".6"><path d="M240 497 v20 M410 497 v20 M580 497 v20 M750 497 v20 M920 497 v20 M1090 497 v20 M1240 497 v20"/></g></svg>`;
