// Safari's paper pieces, as SVG markup: every shape is cut paper (flat colour, a darker cut
// edge, the paper grain laid over it by a filter) and the animals are puppets on pinned joints:
// each joint a group that turns about its pin (a brass split pin shows where it's fastened).
// The idle motion is in styles.ts (.sf-motion only).

const GRAIN = "/event-templates/safari/grain.png";

export const C = {
  ink: "#3b2614",
  sky0: "#f7e7cf", sky1: "#cfe3e6",
  sun: "#f2b33d", sunRay: "#f6c766",
  cloud: "#fffaf0",
  mount: "#b7a3c4", mountDark: "#9e89ae", snow: "#fbf6ee",
  far: "#a9bd84", mid: "#c9b55a", plain: "#e3bf5c", front: "#d9a343", tuft: "#6f8a3a", tuftDark: "#56702c",
  trunk: "#7a4e2d", leaf: "#6f9142", leafDark: "#557634",
  pin: "#c99a3c", pinDark: "#9c7428",
};
// a brass split pin: the fastener at a joint
const pin = (x: number, y: number, r = 3.2) => `<g class="pin"><circle cx="${x}" cy="${y}" r="${r}" fill="${C.pin}" stroke="${C.pinDark}" stroke-width="0.8"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="#f3dc9a"/></g>`;
// paper: a darker cut edge, and the grain over it
export const cut = (d: string, fill: string, edge: string, extra = "") => `<path d="${d}" fill="${fill}" stroke="${edge}" stroke-width="1.1" stroke-linejoin="round" ${extra}/>`;
const eye = (x: number, y: number, r = 4.2, cls = "blink") => `<g class="${cls}" style="transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y}" r="${r}" fill="${C.ink}"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.38}" fill="#fff"/></g>`;
export const defs = (id: string) => `<defs>
  <filter id="${id}-paper" x="-2%" y="-5%" width="104%" height="110%" color-interpolation-filters="sRGB">
    <feImage href="${GRAIN}" x="0" y="0" width="256" height="256" result="g" preserveAspectRatio="none"/>
    <feTile in="g" result="t"/>
    <feBlend in="SourceGraphic" in2="t" mode="multiply" result="m"/>
    <feComposite in="m" in2="SourceGraphic" operator="in"/>
  </filter></defs>`;

// ---- the giraffe: faces left; the neck turns at the shoulder, the head at the top of the neck
export const giraffe = (id: string) => {
  const body = "#eeaf4e", edge = "#b9792a", spot = "#a95f2b", far = "#d49537", muzzle = "#f6d29a";
  const blob = (x: number, y: number, r: number, rot = 0) => `<path d="M${x - r},${y + r * 0.1} C${x - r},${y - r * 0.9} ${x + r * 0.2},${y - r * 1.05} ${x + r},${y - r * 0.35} C${x + r * 1.15},${y + r * 0.5} ${x + r * 0.2},${y + r * 1.05} ${x - r * 0.45},${y + r * 0.85} C${x - r * 0.85},${y + r * 0.7} ${x - r},${y + r * 0.45} ${x - r},${y + r * 0.1}z" fill="${spot}" transform="rotate(${rot} ${x} ${y})"/>`;
  // a leg: tapers to the ankle, a knobbly knee, a dark hoof
  const leg = (x: number, top: number, fill: string) => `<g>${cut(`M${x - 9},${top} C${x - 9},${top + 40} ${x - 7},${top + 60} ${x - 7},${top + 70} C${x - 9},${top + 78} ${x - 8},${top + 86} ${x - 6},${top + 92} L${x - 5},${top + 128} L${x + 6},${top + 128} L${x + 6},${top + 92} C${x + 8},${top + 86} ${x + 9},${top + 78} ${x + 7},${top + 70} C${x + 7},${top + 60} ${x + 9},${top + 40} ${x + 9},${top}z`, fill, edge)}${cut(`M${x - 7},${top + 126} L${x + 8},${top + 126} L${x + 9},${top + 138} L${x - 8},${top + 138}z`, "#5b3a1f", "#3e2714")}</g>`;
  const bodyD = "M78,238 C66,206 84,176 124,172 C160,168 196,176 214,196 C228,212 224,240 204,250 C176,262 112,262 92,256 C84,252 80,246 78,238z";
  const neckD = "M86,214 C80,170 68,120 60,82 C56,64 70,54 84,62 C92,96 108,150 128,196 C118,214 100,222 86,214z";
  return `<svg viewBox="0 0 250 386" class="pup giraffe" data-ground="382">${defs(id)}
  <g filter="url(#${id}-paper)">
    ${leg(184, 242, far)}${leg(104, 242, far)}
    <g class="tail" style="transform-origin:216px 204px"><path d="M216,204 C226,222 228,240 226,262" fill="none" stroke="${edge}" stroke-width="3.5" stroke-linecap="round"/><path d="M226,258 c8,6 6,18 -2,22 c-6,-6 -6,-16 2,-22z" fill="#5b3a1f"/></g>
    ${cut(bodyD, body, edge)}
    <clipPath id="${id}-bc"><path d="${bodyD}"/></clipPath>
    <g clip-path="url(#${id}-bc)">${blob(110, 196, 11, 10)}${blob(140, 190, 10, -20)}${blob(170, 196, 12, 30)}${blob(198, 210, 10)}${blob(124, 226, 11, 40)}${blob(156, 228, 10, -10)}${blob(186, 236, 9, 20)}${blob(96, 236, 8)}${blob(212, 236, 7)}</g>
    ${leg(166, 244, body)}${leg(90, 244, body)}
    <g class="neck" style="transform-origin:100px 214px">
      <path d="M84,62 C94,98 110,150 128,198" fill="none" stroke="#8a4c22" stroke-width="9" stroke-linecap="round"/>
      <path d="M84,62 C94,98 110,150 128,198" fill="none" stroke="#a85f2b" stroke-width="9" stroke-linecap="round" stroke-dasharray="1 7"/>
      ${cut(neckD, body, edge)}
      <clipPath id="${id}-nc"><path d="${neckD}"/></clipPath>
      <g clip-path="url(#${id}-nc)">${blob(74, 96, 7, 20)}${blob(88, 122, 8, -10)}${blob(80, 148, 7, 30)}${blob(100, 166, 8)}${blob(94, 192, 9, 15)}${blob(112, 200, 6)}${blob(68, 120, 5)}</g>
      ${pin(100, 214)}
      <g class="head" style="transform-origin:72px 66px">
        <path d="M66,40 L62,20" stroke="${edge}" stroke-width="5" stroke-linecap="round"/><circle cx="61.5" cy="18" r="5.5" fill="#5b3a1f"/>
        <path d="M80,40 L82,20" stroke="${edge}" stroke-width="5" stroke-linecap="round"/><circle cx="82.5" cy="18" r="5.5" fill="#5b3a1f"/>
        <g class="ear" style="transform-origin:90px 46px">${cut("M88,46 C98,32 114,30 122,36 C116,48 102,54 88,50z", body, edge)}<path d="M94,46 C102,40 110,38 116,39" fill="none" stroke="#e39a86" stroke-width="3.5" stroke-linecap="round"/></g>
        ${cut("M92,58 C94,40 78,32 62,34 C42,36 26,48 20,64 C16,76 24,86 38,88 C58,90 88,82 92,58z", body, edge)}
        ${cut("M34,64 C20,64 14,72 16,80 C20,90 36,92 46,86 C52,80 50,66 34,64z", muzzle, edge)}
        <ellipse cx="24" cy="74" rx="2.4" ry="1.8" fill="${C.ink}"/>
        <path d="M30,84 C34,88 40,88 44,84" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>
        ${eye(58, 54, 5)}
        <path d="M52,48 l-3,-4 M57,47 l-1,-5 M62,48 l1,-5" stroke="${C.ink}" stroke-width="1.4" stroke-linecap="round"/>
        <ellipse cx="64" cy="70" rx="7" ry="4" fill="#ec8e7c" opacity="0.5"/>
        ${blob(78, 52, 4)}${blob(82, 70, 3.5)}
        ${pin(72, 66, 2.8)}
      </g>
    </g>
  </g></svg>`;
};

// ---- the elephant: faces left; the ear flaps at its front edge, the trunk swings at its root
export const elephant = (id: string, tone = "#9aa8b6", edgeTone = "#6f7d8c") => {
  const far = "#8796a6";
  // a leg: a soft column, wider at the foot, three toenails
  const leg = (x: number, w: number, fill: string) => `${cut(`M${x + 2},146 C${x},180 ${x - 2},210 ${x - 3},228 C${x - 3},236 ${x + 2},238 ${x + w / 2},238 C${x + w - 2},238 ${x + w + 3},236 ${x + w + 3},228 C${x + w + 2},210 ${x + w},180 ${x + w - 2},146z`, fill, edgeTone)}${[0.18, 0.5, 0.82].map((k: number) => `<path d="M${x - 3 + (w + 6) * k - 4},236 q4,-6 8,0" fill="#f3ede2" stroke="#d8cfbf" stroke-width="0.8"/>`).join("")}`;
  return `<svg viewBox="0 0 320 240" class="pup elephant" data-ground="240">${defs(id)}
  <g filter="url(#${id}-paper)">
    ${leg(232, 34, far)}${leg(118, 34, far)}
    <g class="tail" style="transform-origin:282px 104px"><path d="M282,104 q14,30 8,62" fill="none" stroke="${edgeTone}" stroke-width="3.5" stroke-linecap="round"/><path d="M286,160 q8,6 4,16 q-8,-2 -8,-12z" fill="#55616e"/></g>
    ${cut("M92,98 q6,-56 92,-60 q92,-2 104,62 q6,46 -22,62 q-40,12 -120,6 q-52,-6 -54,-70z", tone, edgeTone)}
    ${leg(196, 36, tone)}${leg(94, 36, tone)}
    <g class="head" style="transform-origin:96px 92px">
      ${cut("M118,70 q-8,-44 -52,-40 q-40,6 -42,50 q0,34 28,48 q30,10 52,-10 q20,-20 14,-48z", tone, edgeTone)}
      <g class="trunk" style="transform-origin:46px 112px">
        ${cut("M58,110 q-22,10 -24,40 q-2,26 -16,34 q-8,6 -2,12 q10,4 18,-6 q14,-16 14,-40 q2,-22 18,-30z", tone, edgeTone)}
        <path d="M30,140 q6,2 10,-1 M28,152 q6,2 10,-1 M24,164 q6,2 10,-1" fill="none" stroke="${edgeTone}" stroke-width="1.4" stroke-linecap="round"/>
      </g>
      ${cut("M72,114 C70,128 60,136 46,136 C50,130 58,124 64,112z", "#fbf6ee", "#d8cfbf")}
      <g class="ear" style="transform-origin:104px 60px">
        ${cut("M104,48 q46,-22 64,14 q14,34 -6,60 q-22,22 -56,6 q-12,-30 -2,-80z", tone, edgeTone)}
        ${cut("M112,58 q34,-14 46,12 q10,26 -6,44 q-16,14 -40,4 q-8,-24 0,-60z", "#e3a9a6", "#c58c89", 'opacity="0.85"')}
        ${pin(108, 62)}
      </g>
      ${eye(70, 74, 4.6)}
      <path d="M63,67 q6,-4 13,-1" fill="none" stroke="${C.ink}" stroke-width="1.4" stroke-linecap="round"/>
      <ellipse cx="82" cy="94" rx="8" ry="4.5" fill="#e98f7d" opacity="0.45"/>
      ${pin(96, 92)}
    </g>
  </g></svg>`;
};

// ---- the zebra: faces left; head and neck dip to graze, the tail swishes
export const zebra = (id: string) => {
  const w = "#faf6ec", e = "#4a4440", k = "#2c2826";
  const band = (d: string, wd = 6) => `<path d="${d}" fill="none" stroke="${k}" stroke-width="${wd}" stroke-linecap="round"/>`;
  const leg = (x: number, top: number, fill: string) => `<g>${cut(`M${x - 8},${top} C${x - 8},${top + 30} ${x - 6},${top + 50} ${x - 5},${top + 62} L${x - 5},${top + 80} L${x + 6},${top + 80} L${x + 6},${top + 62} C${x + 7},${top + 50} ${x + 8},${top + 30} ${x + 8},${top}z`, fill, e)}<path d="M${x - 7},${top + 22} h15 M${x - 6},${top + 40} h13 M${x - 5},${top + 56} h11" stroke="${k}" stroke-width="4"/>${cut(`M${x - 6},${top + 78} L${x + 7},${top + 78} L${x + 8},${top + 90} L${x - 7},${top + 90}z`, k, k)}</g>`;
  const bodyD = "M70,118 C66,88 92,72 128,72 C170,70 210,74 228,92 C244,110 238,140 214,150 C186,160 116,160 92,154 C78,148 72,136 70,118z";
  const neckD = "M76,124 C66,100 56,76 50,56 C48,44 58,36 70,40 C82,62 98,88 112,108 C104,124 90,130 76,124z";
  return `<svg viewBox="0 0 260 250" class="pup zebra" data-ground="246">${defs(id)}
  <g filter="url(#${id}-paper)">
    ${leg(204, 146, "#e9e3d6")}${leg(106, 146, "#e9e3d6")}
    <g class="tail" style="transform-origin:234px 100px"><path d="M234,100 C244,116 246,134 244,152" fill="none" stroke="${e}" stroke-width="3.5" stroke-linecap="round"/><path d="M244,148 c8,6 6,20 -2,24 c-6,-6 -7,-18 2,-24z" fill="${k}"/></g>
    ${cut(bodyD, w, e)}
    <clipPath id="${id}-zb"><path d="${bodyD}"/></clipPath>
    <g clip-path="url(#${id}-zb)">${band("M112,70 C104,100 106,130 116,160")}${band("M134,68 C128,100 130,130 140,162")}${band("M156,68 C152,100 154,130 162,162")}${band("M178,70 C176,100 178,128 186,160")}${band("M200,74 C200,98 204,124 212,154")}${band("M222,84 C224,104 228,122 236,140", 5)}${band("M94,80 C86,104 86,128 92,156", 5)}${band("M120,150 C150,140 190,140 226,148", 4)}</g>
    ${leg(188, 148, w)}${leg(90, 148, w)}
    <g class="neck" style="transform-origin:96px 120px">
      <path d="M54,46 C64,70 82,100 102,116" fill="none" stroke="${k}" stroke-width="12" stroke-linecap="round"/>
      <path d="M54,46 C64,70 82,100 102,116" fill="none" stroke="${w}" stroke-width="12" stroke-linecap="butt" stroke-dasharray="3 5"/>
      ${cut(neckD, w, e)}
      <clipPath id="${id}-zn"><path d="${neckD}"/></clipPath>
      <g clip-path="url(#${id}-zn)">${band("M50,66 C62,62 72,58 80,52", 5)}${band("M56,82 C70,78 82,72 90,66", 5)}${band("M64,98 C78,94 92,88 100,82", 5)}${band("M72,114 C86,110 100,104 108,98", 5)}</g>
      ${pin(96, 120)}
      <g class="head" style="transform-origin:58px 50px">
        <g class="ear" style="transform-origin:64px 34px">${cut("M60,36 C58,22 62,12 70,8 C76,18 74,30 66,38z", w, e)}<path d="M64,32 C64,24 66,18 69,14" stroke="#e3a9a6" stroke-width="2.5" stroke-linecap="round"/></g>
        ${cut("M70,44 C66,32 52,30 42,36 C30,44 18,62 12,76 C8,86 14,94 24,94 C36,94 48,82 58,70 C66,62 72,54 70,44z", w, e)}
        <clipPath id="${id}-zh"><path d="M70,44 C66,32 52,30 42,36 C30,44 18,62 12,76 C8,86 14,94 24,94 C36,94 48,82 58,70 C66,62 72,54 70,44z"/></clipPath>
        <g clip-path="url(#${id}-zh)">${band("M46,34 C50,44 56,50 64,54", 4.5)}${band("M36,44 C42,54 50,60 58,64", 4.5)}${band("M28,56 C34,64 40,70 48,74", 4)}</g>
        ${cut("M20,74 C10,76 6,86 10,92 C16,98 28,96 32,88 C34,80 28,72 20,74z", "#4b4542", k)}
        <ellipse cx="14" cy="84" rx="2" ry="1.6" fill="#f3eadb"/>
        ${eye(48, 48, 4.4)}
        <path d="M43,43 l-3,-3 M47,42 l-1,-4" stroke="${C.ink}" stroke-width="1.3" stroke-linecap="round"/>
        <ellipse cx="40" cy="62" rx="6" ry="3.4" fill="#ec8e7c" opacity="0.5"/>
        ${pin(58, 50, 2.6)}
      </g>
    </g>
  </g></svg>`;
};

// ---- the lion cub: sits facing left; the head tilts, the tail flicks
export const lion = (id: string) => {
  const fur = "#e0a24d", e = "#a8682a", mane = "#c2742e", light = "#f4cf8e";
  return `<svg viewBox="0 0 230 220" class="pup lion" data-ground="220">${defs(id)}
  <g filter="url(#${id}-paper)">
    <g class="tail" style="transform-origin:176px 196px"><path d="M176,196 q40,6 40,-30 q0,-18 -12,-24" fill="none" stroke="${e}" stroke-width="5" stroke-linecap="round"/><path d="M196,136 q14,-6 18,8 q-6,10 -18,4z" fill="#7a3f1c"/></g>
    ${cut("M92,214 C84,170 96,132 128,126 C168,120 196,150 194,186 C192,208 178,216 160,216z", fur, e)}
    ${cut("M150,216 C134,214 128,196 136,178 C146,160 176,160 186,180 C194,198 184,216 166,216z", "#d8963f", e)}
    ${cut("M150,216 C150,206 158,202 168,204 C176,206 178,214 174,216z", light, e)}
    ${cut("M92,216 L92,168 C92,160 98,156 104,156 C110,156 114,160 114,168 L114,212 C114,216 96,218 92,216z", fur, e)}
    ${cut("M90,216 C90,208 96,204 104,206 C112,206 116,212 114,216z", light, e)}
    ${cut("M114,216 L114,170 C114,162 120,158 126,158 C132,158 136,162 136,170 L136,214 C136,218 118,218 114,216z", fur, e)}
    ${cut("M112,216 C112,208 118,204 126,206 C134,206 138,212 136,216z", light, e)}
    <path d="M97,216 v-5 M103,216 v-5 M119,216 v-5 M125,216 v-5" stroke="${e}" stroke-width="1.5" stroke-linecap="round"/>
    ${cut("M104,150 C110,138 124,134 134,140 C140,150 136,168 124,172 C112,174 102,164 104,150z", light, e, 'opacity="0.9"')}
    <g class="head" style="transform-origin:116px 120px">
      ${cut("M150,86 q4,-46 -40,-50 q-46,-2 -52,42 q-4,40 36,50 q52,8 56,-42z", mane, "#8f4f1f")}
      <g class="ear" style="transform-origin:86px 44px">${cut("M74,50 q-4,-20 12,-22 q14,0 12,16z", fur, e)}<circle cx="86" cy="38" r="5" fill="#f2b9a0"/></g>
      ${cut("M140,52 q-2,-18 14,-18 q14,4 8,22z", fur, e)}
      ${cut("M140,90 q2,-38 -34,-40 q-36,0 -40,34 q-2,32 30,38 q42,4 44,-32z", fur, e)}
      ${cut("M84,96 q-14,0 -16,12 q0,14 18,14 q14,-2 16,-14 q0,-12 -18,-12z", light, e)}
      <path d="M76,96 q6,-6 12,0 q-2,6 -6,7 q-4,-1 -6,-7z" fill="#6b3b1e"/>
      <path d="M82,104 v6 M82,110 q-6,6 -10,1 M82,110 q6,6 10,1" fill="none" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round"/>
      ${eye(96, 76, 4.6)}${eye(122, 78, 4.2)}
      <ellipse cx="108" cy="98" rx="7" ry="4" fill="#e98f7d" opacity="0.55"/>
      ${pin(116, 120)}
    </g>
  </g></svg>`;
};

// ---- the jeep: faces left; wheels turn on their pins, a pennant on the aerial waves
export const jeep = (id: string, flag = "5") => {
  const body = "#6f8447", edge = "#4c5d2e", trim = "#efe1bf", dark = "#3a3a36";
  const wheel = (cx: number, cy: number, cls: string) => `<g class="wheel ${cls}" style="transform-origin:${cx}px ${cy}px">
      <circle cx="${cx}" cy="${cy}" r="40" fill="${dark}" stroke="#25251f" stroke-width="1.2"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<rect x="${cx - 4}" y="${cy - 42}" width="8" height="7" rx="1.5" fill="#25251f" transform="rotate(${(a * 180) / Math.PI} ${cx} ${cy})"/>`; }).join("")}
      <circle cx="${cx}" cy="${cy}" r="21" fill="${trim}" stroke="#c9b98f" stroke-width="1.2"/>
      ${[0, 72, 144, 216, 288].map((d: number) => `<circle cx="${cx}" cy="${cy - 13}" r="3" fill="#c9b98f" transform="rotate(${d} ${cx} ${cy})"/>`).join("")}
      ${pin(cx, cy, 5)}</g>`;
  return `<svg viewBox="0 0 420 240" class="pup jeep" data-ground="232">${defs(id)}
  <g filter="url(#${id}-paper)">
    <g class="aerial" style="transform-origin:318px 74px">
      <path d="M318,74 L322,6" stroke="${dark}" stroke-width="2.2" stroke-linecap="round"/>
      <g class="flag" style="transform-origin:322px 10px">${cut("M322,8 L362,18 L322,30z", "#e0633f", "#b5482a")}<text x="334" y="23" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="11" fill="#fff5e6">${flag}</text></g>
    </g>
    ${cut("M150,92 L176,40 L184,40 L162,92z", dark, "#25251f")}
    ${cut("M246,92 L250,46 q2,-6 8,-6 L330,40 q8,0 8,8 L340,92z", "none", "none", 'opacity="0"')}
    <path d="M252,92 L256,48 L334,46 L338,92" fill="none" stroke="${dark}" stroke-width="7" stroke-linejoin="round"/>
    ${cut("M394,92 q22,0 22,34 q0,34 -22,34z", dark, "#25251f")}
    ${cut("M20,126 q0,-18 18,-22 L96,96 L150,92 L392,92 q12,0 12,12 L404,164 q0,12 -12,12 L28,176 q-10,0 -10,-10z", body, edge)}
    ${cut("M38,128 L392,128 L392,138 L36,138z", trim, "#cbbb93")}
    <path d="M186,96 L186,170 M300,96 L300,170" stroke="${edge}" stroke-width="1.4"/>
    <path d="M200,112 h22" stroke="${edge}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="34" cy="116" r="9" fill="#ffe08a" stroke="#c9a54a" stroke-width="1.2"/>
    ${cut("M8,164 L60,164 L60,178 L8,178z", dark, "#25251f")}
    ${cut("M48,176 q4,-52 54,-52 q50,0 54,52z", body, edge)}
    ${cut("M248,176 q4,-52 54,-52 q50,0 54,52z", body, edge)}
    ${wheel(102, 190, "f")}${wheel(302, 190, "r")}
  </g></svg>`;
};

// ---- an acacia: a forked trunk under flat, layered crowns
export const acacia = (id: string) => `<svg viewBox="0 0 220 200" class="acacia" data-ground="200">${defs(id)}
  <g filter="url(#${id}-paper)">
    ${cut("M104,200 L108,120 L72,72 L80,68 L112,108 L140,64 L148,68 L118,124 L116,200z", C.trunk, "#5a371c")}
    ${cut("M18,70 q10,-24 60,-26 q40,-14 80,-4 q50,4 56,26 q-20,12 -96,10 q-80,2 -100,-6z", C.leafDark, "#40591f")}
    ${cut("M30,56 q14,-20 60,-22 q30,-12 70,0 q34,6 36,20 q-26,10 -84,8 q-60,2 -82,-6z", C.leaf, "#4f6c2b")}
    ${cut("M62,40 q14,-14 46,-14 q32,-2 44,12 q-20,8 -46,6 q-30,2 -44,-4z", "#86a653", "#5f7d34")}
  </g></svg>`;

// ---- sky pieces
export const cloud = (id: string) => `<svg viewBox="0 0 200 80" class="cloud">${defs(id)}<g filter="url(#${id}-paper)">${cut("M14,70 q-12,-20 10,-28 q4,-24 34,-20 q14,-22 44,-10 q26,-12 40,10 q30,0 30,26 q10,10 0,22z", C.cloud, "#e8dcc6")}</g></svg>`;
export const sun = (id: string) => `<svg viewBox="0 0 200 200" class="sun">${defs(id)}<g filter="url(#${id}-paper)">
    <g class="rays" style="transform-origin:100px 100px">${Array.from({ length: 14 }, (_, i) => `<path d="M100,8 L110,40 L90,40z" fill="${C.sunRay}" stroke="#e3a93a" stroke-width="1" transform="rotate(${i * (360 / 14)} 100 100)"/>`).join("")}</g>
    <circle cx="100" cy="100" r="56" fill="${C.sun}" stroke="#d99a2a" stroke-width="1.2"/>
    <circle cx="100" cy="100" r="44" fill="#f5c04f" opacity="0.7"/></g></svg>`;

