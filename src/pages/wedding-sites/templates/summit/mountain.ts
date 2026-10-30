import { useEffect, type RefObject } from "react";

/**
 * Summit's mountains, drawn on the GPU (WebGL), with a level camera that rises as the guest
 * scrolls (uAlt: 0 at the foot of the page, 1 at the summit):
 *  - Five ridges from far to near and the hero peak nearest, all Philippine rainforest: packed
 *    tree crowns (a dome each, small ones filling the gaps, shadow between) over spurs and
 *    gullies running down each face, a fringe of crowns on every crest, lit by a sun on the
 *    right. Each further ridge paler and bluer, the haze thicker down in the valleys.
 *  - Valley fog pooled between the ridges, drifting slowly (each layer its own way).
 *  - A cloud deck at a fixed altitude: overhead while below it, a white-out while passing
 *    through, a sea of clouds below once above it.
 *  - Night → dawn → day, from the intro (sky.dawn, then sky.morning) and the climb; faint shafts
 *    of light in the haze.
 *  The altitude comes from the page: how far the sticky canvas has travelled down the root.
 *  Kept light: drawn only when the climb or the sky changes (every frame while the page moves,
 *  nothing while it rests), ≤1.25× pixels, only while on screen and the tab is shown.
 *  `animate` false (builder, gallery card, reduced motion): one still frame, redrawn on scroll.
 */

export type Sky = { dawn: number; morning: number };

const VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }";

const FS = `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform float uAlt; uniform float uDawn; uniform float uHeroX; uniform float uMorning;
float h11(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h11(i), h11(i + 1.), f); }
float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm2(vec2 p){ float s = 0., a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn2(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; } return s; }
// a ridge line (1D) and rock relief (2D), both ridged so crests are sharp and gullies cut in
float ridge1(float x){ float s = 0., a = 0.55; for (int i = 0; i < 6; i++) { float r = 1. - abs(vn1(x) * 2. - 1.); float n = mix(vn1(x), r * r, i < 2 ? 0.35 : 0.6); s += a * n; x = x * 2.07 + 3.1; a *= 0.48; } return s; }
// the rock: sharp broken ridges, a little drawn out downhill
float relief(vec2 p){ float s = 0., a = 0.42; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  p = p * vec2(1.9, 1.5) + vec2(fbm2(p * 1.3) * 0.35, 0.);
  for (int i = 0; i < 6; i++) { float n = 1. - abs(vn2(p) * 2. - 1.); s += a * n * n; p = m * p; a *= 0.55; } return s * 1.15; }

vec3 skyCol(float v, float day, float dawn){
  vec3 nTop = vec3(0.015, 0.03, 0.08), nHor = vec3(0.06, 0.09, 0.18);
  vec3 dTop = vec3(0.10, 0.17, 0.33), dHor = vec3(0.93, 0.72, 0.62);
  vec3 yTop = vec3(0.17, 0.36, 0.64), yHor = vec3(0.80, 0.87, 0.93);
  vec3 top = mix(mix(nTop, dTop, dawn), yTop, day), hor = mix(mix(nHor, dHor, dawn), yHor, day);
  return mix(hor, top, pow(clamp(v, 0., 1.), 0.75));
}

// the forest: tree crowns packed over the land. Each crown a dome (jittered cells), the tallest
// winning where they overlap, smaller understory crowns filling the gaps between; what's left
// between them is shadow.
vec4 crownCell(vec2 p, float seed){
  vec2 i = floor(p), f = fract(p);
  vec4 best = vec4(0., 0., 0., 0.5);
  for (int yy = -1; yy <= 1; yy++) for (int xx = -1; xx <= 1; xx++) {
    vec2 g = vec2(float(xx), float(yy)), id = i + g + seed * 31.7;
    vec2 dv = f - g - (vec2(h21(id), h21(id + 17.3)) * 0.8 + 0.1);
    dv += (vec2(vn2(p * 3.1 + id), vn2(p * 3.1 - id + 4.)) - 0.5) * 0.42;
    dv.y *= 1.12;
    float r = (0.42 + 0.42 * h21(id + 5.1)) * mix(0.8, 1.2, vn2(id * 0.21));
    float q = r * r - dot(dv, dv);
    if (q > 0.) { float hgt = sqrt(q) + h21(id + 9.7) * 0.3;
      if (hgt > best.x) best = vec4(hgt, dv / r, h21(id + 3.3)); }
  }
  return best;
}
vec4 canopy(vec2 p){
  vec4 a = crownCell(p, 0.);
  vec4 b = crownCell(p * 1.85 + 4.7, 1.);
  b.x = b.x / 1.85 + 0.1;
  return a.x >= b.x ? a : b;
}
// the crest seen against the sky: a fringe of crowns, not a clean line
float treeline(float x){ float i = floor(x), f = fract(x), b = 0.;
  for (int k = -1; k <= 1; k++) { float g = float(k); float d = f - g - (h11(i + g) * 0.8 + 0.1); float r = 0.45 + 0.35 * h11(i + g + 7.);
    float q = r * r - d * d; if (q > 0.) b = max(b, sqrt(q) + 0.35 * h11(i + g + 3.)); }
  return b; }
// the land under the trees: spurs and gullies running down the face, drawn out downhill
float spur(vec2 q){ float s = 0., a = 0.5; q += vec2(vn2(q * 0.6) * 0.9, 0.);
  for (int i = 0; i < 4; i++) { float w = vn2(q) * 2. - 1.; float n = 1. - sqrt(w * w + 0.003); s += a * n * n; q = q * 2.03 + vec2(3.1, 1.7); a *= 0.5; } return s; }

// where a point sits among the spurs: they run down the face, leaning the way it turns
vec2 spurQ(vec2 p, float below, float fx, float fy, float slant){
  return vec2(p.x * fx + below * fx * 0.35 * slant, below * fy);
}
// the spurs' height and slope at p, for a face leaning one way
vec3 spurs(vec2 p, float below, float fx, float fy, float sl, float e){
  float s0 = spur(spurQ(p, below, fx, fy, sl));
  float sx = spur(spurQ(p + vec2(e, 0.), below, fx, fy, sl));
  float sy = spur(spurQ(p + vec2(0., e), below - e, fx, fy, sl));
  return vec3(s0, vec2(sx - s0, sy - s0) / e);
}
// one forested face. p: layer coordinates (move with the ridge), below: depth under the crest,
// cs: crown size, fx/fy: spur spacing across and down, tilt: which way the whole face turns.
// On a lone peak (peakX set) the two flanks lean opposite ways, blended where they meet.
vec3 shadeForest(vec2 p, float below, float cs, float fx, float fy, float tilt, float peakX, vec3 sun, float light, vec3 skyc){
  float px = 1. / uRes.y;
  float e = 2.5 * px;
  vec3 sp;
  if (peakX > -50.) {
    float w = smoothstep(-0.1, 0.1, p.x - peakX);
    sp = mix(spurs(p, below, fx, fy, -1., e), spurs(p + vec2(1.7, 0.), below, fx, fy, 1., e), w);
  } else sp = spurs(p, below, fx, fy, clamp(tilt * 1.6, -1., 1.), e);
  // far off, the gullies soften into the haze
  float s0 = sp.x; vec2 gm = sp.yz * mix(0.4, 1., smoothstep(0.003, 0.009, cs));
  vec3 nm = normalize(vec3(-gm.x * 0.075 + tilt, -gm.y * 0.05 + 0.2, 1.));
  // crowns, faded to their average where they get smaller than a few pixels
      cs *= mix(0.68, 1., smoothstep(0.5, 1.3, uRes.x / uRes.y)); // a phone's tall screen: smaller trees
  vec4 cn = canopy(p / cs);
  float detail = smoothstep(0.45, 0.16, px / cs);
  vec3 nc = vec3(cn.y, cn.z, sqrt(max(1. - dot(cn.yz, cn.yz), 0.)));
  float ao = mix(0.62, mix(0.18, 1., smoothstep(0., 0.85, cn.x)), detail);
  vec3 n = normalize(nm + vec3(nc.xy * 0.7, nc.z - 1.) * detail);
  vec3 L = normalize(vec3(0.72, 0.5, 0.48));
  float dif = max(dot(n, L), 0.);
  float gully = mix(0.32, 1.1, smoothstep(0.12, 0.7, s0));
  // crowns differ: deep greens mostly, a yellow-green flush here and there, the odd brown one
  float id = mix(0.5, cn.w, detail);
  float patch = vn2(p / cs * 0.11 + 7.);
  vec3 alb = mix(vec3(0.045, 0.10, 0.055), vec3(0.11, 0.19, 0.085), clamp(id * 0.8 + patch * 0.4 - 0.1, 0., 1.));
  alb = mix(alb, vec3(0.17, 0.22, 0.09), step(0.92, id) * detail * 0.6);
  alb = mix(alb, vec3(0.14, 0.11, 0.07), step(0.975, id) * detail * 0.5);
  vec3 amb = mix(vec3(0.30, 0.40, 0.52), skyc, 0.35) * (0.55 + 0.45 * n.y);
  vec3 c = alb * (sun * dif * 1.9 * light * gully + amb * mix(0.16, 0.55, light) * mix(0.7, 1., gully)) * ao;
  // sunlit crown tops: a soft yellow-green sheen
  c += vec3(0.30, 0.36, 0.14) * pow(dif, 4.) * light * gully * smoothstep(0.3, 0.9, cn.x) * detail * 0.35;
  return c;
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  float v = fc.y / uRes.y, x = fc.x / uRes.y, W = uRes.x / uRes.y, t = uT, alt = uAlt;
  float dawn = clamp(uDawn, 0., 1.);
  float dawnC = smoothstep(0.1, 0.9, dawn);
  float day = max(clamp(alt * 1.3, 0., 1.), uMorning * 0.45) * step(0.999, dawn);
  vec3 sun = mix(vec3(1.0, 0.62, 0.48), vec3(1.0, 0.95, 0.88), day);
  float light = mix(0.06, 1.0, smoothstep(0.2, 0.95, dawn));
  float glow = smoothstep(0.25, 0.6, dawn) * (1. - smoothstep(0., 0.6, day));
  vec2 sunP = vec2(W * 0.80, mix(0.40, 0.84, day) - (1. - dawn) * 0.35);
  float hzn = 0.52;
  float fogT = t * 0.015;

  vec3 col = skyCol((v - hzn + 0.08) / (1. - hzn + 0.08), day, dawnC);
  float sd = length(vec2(x, v) - sunP);
  col += sun * (smoothstep(0.024, 0.012, sd) * 0.55 + exp(-sd * 12.) * 0.38 + exp(-sd * 3.5) * 0.14) * smoothstep(0.4, 1., dawn);
  vec2 sg = floor(fc / 3.);
  col += vec3(0.8, 0.85, 1.) * step(0.9968, h21(sg)) * (0.5 + 0.5 * sin(t * 2. + h21(sg + 7.) * 40.)) * (1. - smoothstep(0.1, 0.55, dawn)) * smoothstep(hzn, hzn + 0.2, v);
  // high thin cloud in the sky
  float cir = fbm2(vec2(x * 1.2 + t * 0.004, v * 6.));
  col = mix(col, mix(col, sun * 1.05, 0.5), smoothstep(0.55, 0.8, cir) * smoothstep(hzn + 0.08, hzn + 0.3, v) * 0.35 * dawnC);
  vec3 haze = mix(skyCol(0.04, day, dawnC), vec3(0.62, 0.72, 0.74), 0.25 * day);
  vec3 fogC = mix(haze, vec3(0.94, 0.95, 0.97), 0.35 + 0.5 * day) * mix(0.3, 1., light);

  float deck = 0.74, dz = deck - alt;

  // what's nearest at this pixel: the hero peak, else ridges near to far
  float cx = uHeroX * W;
  float top = mix(0.99, 0.30, alt);
  float dxh = x - cx;
  float sl = dxh < 0. ? 0.62 : 0.85;
  // a real summit's profile: steep near the top and easing out (concave), not a dome; a shoulder
  // and a false summit on the long ridge, a notch, and broken ground the further from the top
  float ad = sqrt(dxh * dxh + 0.0045);
  float heroCrest = top - (pow(ad, 0.92) - 0.0835) * sl
                    + (ridge1(x * 2.1 + 41.) - 0.45) * 0.15 * smoothstep(0.03, 0.35, abs(dxh))
                    + 0.045 * exp(-pow((dxh + 0.34) / 0.09, 2.)) + 0.06 * exp(-pow((dxh - 0.36) / 0.12, 2.))
                    - 0.03 * exp(-pow((dxh - 0.19) / 0.035, 2.));
  heroCrest += (treeline(x / 0.007) * 0.8 - 0.35) * 0.007;
  int hit = -1; float crestHit = 0.;
  if (v < heroCrest) { hit = 5; crestHit = heroCrest; }
  float crests[5];
  for (int i = 4; i >= 0; i--) {
    float fi = float(i), dist = 1. - fi / 4.;
    float par = mix(0.25, 1.35, 1. - dist);
    float base = hzn + mix(0.09, -0.06, 1. - dist) - alt * par * 0.55;
    float cs = mix(0.0032, 0.0105, 1. - dist);
    float c = base + mix(0.19, 0.28, 1. - dist) * (ridge1(x * mix(1.1, 2.6, 1. - dist) + fi * 13.7) - 0.35) + (treeline(x / cs + fi * 7.) * 0.8 - 0.35) * cs;
    crests[i] = c;
    if (hit < 0 && v < c) { hit = i; crestHit = c; }
  }

  // the haze between here and there: bluer and paler with distance, brighter toward the sun,
  // and thicker down in the valleys
  float sunSide = exp(-length(vec2(x, v) - sunP) * 1.6);
  vec3 hazeL = mix(mix(haze, vec3(0.50, 0.61, 0.70) * mix(0.25, 1., light), 0.45), mix(haze, sun, 0.5) * 1.05, sunSide * 0.5 * light);
  if (hit == 5) {
    float below = heroCrest - v;
    col = shadeForest(vec2(x, v - top), below, 0.0085, 5.0, 2.6, mix(-0.45, 0.6, smoothstep(-0.22, 0.22, dxh)), cx, sun, light, haze);
    col = mix(col, hazeL, clamp(0.06 * (1. - alt) + below * 0.10, 0., 0.5));
  } else if (hit >= 0) {
    float fi = float(hit), dist = 1. - fi / 4.;
    float par = mix(0.25, 1.35, 1. - dist);
    float base = hzn + mix(0.09, -0.06, 1. - dist) - alt * par * 0.55;
    float e = 0.03; // sampled wide, so the face's tilt changes smoothly (no stripes)
    float fr = mix(1.1, 2.6, 1. - dist);
    float sl = (ridge1((x + e) * fr + fi * 13.7) - ridge1((x - e) * fr + fi * 13.7)) / (2. * e) * 0.25;
    float below = crestHit - v;
    col = shadeForest(vec2(x + fi * 3.1, v - base), below, mix(0.0032, 0.0105, 1. - dist), mix(9., 4.5, 1. - dist), mix(5., 2.4, 1. - dist), clamp(-sl * 0.7, -0.6, 0.6), -99., sun, light, haze);
    float aer = 1. - exp(-(dist * mix(1.05, 1.35, day) + below * mix(0.7, 2.6, dist)));
    col = mix(col, hazeL, clamp(aer, 0., 0.88));
  }
  // light through the haze: faint shafts falling from the sun
  {
    vec2 d = vec2(x, v) - sunP;
    float ang = atan(d.x, -d.y);
    float rays = vn1(ang * 8. + t * 0.03) * vn1(ang * 3.5 - t * 0.02 + 5.);
    float hz = hit < 0 ? 0. : hit == 5 ? 0.15 : 1. - float(hit) / 4. * 0.7;
    col += sun * smoothstep(0.2, 0.6, rays) * 0.05 * hz * light * day * smoothstep(1.2, 0.15, length(d));
  }

  // valley fog, in front of the ridges nearer than what's drawn, each drifting its own way
  for (int i = 0; i < 5; i++) {
    float fi = float(i), dist = 1. - fi / 4.;
    if (hit != 5 && fi < float(hit)) continue;
    if (hit == 5 && fi < 3.) continue;
    float onHero = hit == 5 ? 0.45 : 1.;
    float base = hzn + mix(0.09, -0.06, 1. - dist) - alt * mix(0.25, 1.35, 1. - dist) * 0.55;
    vec2 q = vec2(x * (2.0 + fi * 0.4) + fogT * (mod(fi, 2.) * 2. - 1.) * (1. + fi * 0.6), v * 6.5 - fi * 3.);
    q += vec2(fbm2(q * 0.7 + t * 0.01), 0.) * 0.8; // curl it a little
    float n = fbm2(q);
    float a = smoothstep(-0.10, 0.12, base - 0.06 - v + (n - 0.5) * 0.22) * smoothstep(0.38, 0.74, n + 0.1) * mix(0.5, 0.85, dist) * onHero;
    col = mix(col, fogC * (0.92 + 0.12 * n), clamp(a, 0., 1.) * mix(0.9, 0.5, smoothstep(0.5, 1., alt)));
    if (i == 2) {
      // the cloud deck sits between the second and third ridges
      float edge = hzn + dz * 1.6;
      vec2 cq = vec2(x * 2.6 + fogT * 3., v * 7.);
      cq += vec2(fbm2(cq * 0.8 - t * 0.012), fbm2(cq * 0.8 + 3.)) * 0.9;
      float billow = fbm2(cq);
      vec3 lit = mix(vec3(0.70, 0.75, 0.84), vec3(1.0, 0.99, 0.96), smoothstep(0.35, 0.75, billow)) * mix(vec3(0.75, 0.8, 0.92), sun, 0.55);
      lit *= mix(0.3, 1., light);
      if (dz < 0.) {
        float topL = edge + (billow - 0.5) * 0.07;
        float a2 = smoothstep(topL + 0.015, topL - 0.04, v);
        col = mix(col, lit, a2 * (hit == 5 ? 0. : 1.));
        col = mix(col, lit, a2 * (hit == 5 ? smoothstep(heroCrest - 0.02, heroCrest - 0.35, v) * 0.0 : 0.));
      } else {
        float a2 = smoothstep(edge - 0.04, edge + 0.05, v + (billow - 0.5) * 0.06);
        col = mix(col, lit * 0.8, a2 * 0.94);
      }
    }
  }
  // the hero peak rises out of the cloud sea: cloud lapping its lower slopes
  if (dz < 0. && hit == 5) {
    float edge = hzn + dz * 1.6;
    vec2 cq = vec2(x * 2.6 + fogT * 3., v * 7.);
    cq += vec2(fbm2(cq * 0.8 - t * 0.012), fbm2(cq * 0.8 + 3.)) * 0.9;
    float billow = fbm2(cq);
    vec3 lit = mix(vec3(0.70, 0.75, 0.84), vec3(1.0, 0.99, 0.96), smoothstep(0.35, 0.75, billow)) * mix(vec3(0.75, 0.8, 0.92), sun, 0.55);
    float a3 = smoothstep(edge - 0.06, edge - 0.16, v + (billow - 0.5) * 0.08);
    col = mix(col, lit, a3);
  }

  {
    vec2 q = vec2(x * 1.6 + t * 0.012, v * 4.5 - t * 0.006);
    q += vec2(fbm2(q * 0.7 + 5.), 0.) * 0.9;
    float n = fbm2(q);
    float bank = smoothstep(0.34, 0.0, v + (n - 0.5) * 0.16) * smoothstep(0.3, 0.7, n + 0.2);
    col = mix(col, fogC * (0.95 + 0.1 * n), clamp(bank, 0., 1.) * 0.82 * (1. - smoothstep(0.55, 0.72, alt)));
  }
  // passing through the cloud: a white-out, rolling
  float through = exp(-pow(dz / 0.045, 2.));
  float wisps = fbm2(vec2(x * 2.5 + t * 0.06, v * 2.5 - t * 0.09));
  col = mix(col, vec3(0.92, 0.93, 0.95) * mix(0.4, 1., light), clamp(through * (0.72 + 0.4 * wisps), 0., 0.97));

  // a gentle film grade: lifted blacks, a soft vignette
  col = pow(max(col, 0.), vec3(0.95));
  col = col * 0.96 + 0.02;
  vec2 qv = fc / uRes - 0.5;
  col *= 1. - dot(qv, qv) * 0.35;
  gl_FragColor = vec4(col, 1.);
}`;

export function useMountain(canvasRef: RefObject<HTMLCanvasElement | null>, rootRef: RefObject<HTMLElement | null>, skyRef: RefObject<Sky>, { animate }: { animate: boolean }) {
  useEffect(() => {
    const cv = canvasRef.current;
    const root = rootRef.current;
    if (!cv || !root) return;
    const gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) {
      cv.style.display = "none";
      return;
    }
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      cv.style.display = "none";
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (name: string) => gl.getUniformLocation(prog, name);
    const uRes = U("uRes"), uT = U("uT"), uAlt = U("uAlt"), uDawn = U("uDawn"), uMorning = U("uMorning"), uHeroX = U("uHeroX");

    let raf = 0;
    let visible = true;
    let last = -1e9;
    let clock = 0, prevNow = 0;
    const size = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 1.25);
      cv.width = Math.max(1, Math.round(r.width * d));
      cv.height = Math.max(1, Math.round(r.height * d));
      gl.viewport(0, 0, cv.width, cv.height);
    };
    const draw = (now: number) => {
      const c = cv.getBoundingClientRect();
      const page = root.getBoundingClientRect();
      const sky = skyRef.current ?? { dawn: 1, morning: 1 };
      gl.uniform2f(uRes, cv.width, cv.height);
      // the scene's own clock runs only while it's drawn, so the fog doesn't leap on after a rest
      clock += prevNow ? Math.min(0.05, (now - prevNow) / 1000) : 0;
      prevNow = now;
      gl.uniform1f(uT, animate ? clock : 20);
      gl.uniform1f(uAlt, climbOf(c, page));
      gl.uniform1f(uDawn, sky.dawn);
      gl.uniform1f(uMorning, sky.morning);
      gl.uniform1f(uHeroX, heroX(c.width));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    // drawn when something it shows has changed: the climb (every frame while the page moves, so
    // the mountain keeps pace with the words) and the sky while it lightens; nothing while still
    let moved = true, lastSky = "";
    const loop = (now: number) => {
      raf = 0;
      const sky = skyRef.current ?? { dawn: 1, morning: 1 };
      const sk = `${sky.dawn.toFixed(4)}|${sky.morning.toFixed(4)}`;
      if (moved || sk !== lastSky || last < 0) {
        moved = false;
        lastSky = sk;
        last = now;
        draw(now);
      }
      if (animate && visible && !document.hidden && (sky.dawn < 1 || sky.morning < 1)) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      cancelAnimationFrame(raf);
      last = -1e9;
      raf = requestAnimationFrame(loop);
    };
    size();
    kick();
    const ro = new ResizeObserver(() => {
      size();
      kick();
    });
    ro.observe(cv);
    ro.observe(root);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(cv);
    const onVisibility = () => {
      if (!document.hidden) kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onScroll = () => {
      moved = true;
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll, { capture: true });
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [canvasRef, rootRef, skyRef, animate]);
}

/** How far up the climb the camera is: how far the sticky frame has travelled down the page. */
export function climbOf(frame: DOMRect, page: DOMRect) {
  return Math.min(1, Math.max(0, (frame.top - page.top) / Math.max(1, page.height - frame.height)));
}
/** Where the hero peak stands across the frame (a fraction of its width). */
export const heroX = (w: number) => (w < 700 ? 0.62 : 0.66);
/** The hero peak's crest at `x` px across a w×h frame, at climb `alt`, in px from the top: its
 *  profile as the shader draws it near the summit (the post and the climber stand on it). */
export function crestAt(x: number, w: number, h: number, alt: number) {
  const cx = heroX(w) * w;
  const top = (1 - (0.99 + (0.3 - 0.99) * alt)) * h;
  const d = (x - cx) / h;
  return top + (Math.pow(Math.sqrt(d * d + 0.0045), 0.92) - 0.0835) * (d < 0 ? 0.62 : 0.85) * h;
}
