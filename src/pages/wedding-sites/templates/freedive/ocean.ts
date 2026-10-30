import { useEffect, type RefObject } from "react";

/**
 * The Blue's ocean, seen side-on with a level camera, drawn on the GPU (WebGL):
 *  - Above the waterline: the sky (sun high on the right, thin clouds low) and a band of sea
 *    running to a dead-level horizon, its ripples flattened by distance, the sun's glitter on it.
 *  - The waterline: an uneven swell and a thick, bright meniscus.
 *  - Below: the surface's shimmering underside, sun rays fading with depth, marine snow at two
 *    depths, the water going from turquoise to the dark, and sand on the bottom.
 *  Positions come from the page: `[data-surface]` is the waterline, `[data-floor]` the seabed, in
 *  the root's coordinates, so the ocean moves with the page (and with the intro's rise).
 *  Kept light: every frame while the page moves, ≤30 a second at rest, ≤1.25× pixels, only while
 *  on screen and the tab is shown.
 *  `animate` false (builder, gallery card, reduced motion): one still frame, redrawn on scroll.
 */

const VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }";

const FS = `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform float uScroll; uniform float uSurf; uniform float uFloor; uniform float uK;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float snow(vec2 p, float cell, float r){
  vec2 id = floor(p / cell); vec2 f = fract(p / cell);
  vec2 c = vec2(h21(id), h21(id + 9.1)) * 0.8 + 0.1;
  float on = step(0.55, h21(id + 3.7));
  return on * smoothstep(r, r * 0.25, length(f - c) * cell);
}
void main(){
  vec2 fc = gl_FragCoord.xy;
  float K = uK, x = fc.x, t = uT;
  float wy = (uRes.y - fc.y) + uScroll;
  float sw = vn(vec2(x / (220. * K) + t * 0.12, t * 0.05));
  float wave = (9. * sin(x * 0.0085 / K + t * 0.9 + sw * 3.) + 5. * sin(x * 0.019 / K - t * 1.3) + 5. * vn(vec2(x / (34. * K), t * 0.7))) * K * (0.65 + 0.7 * sw);
  float d = wy - (uSurf + wave);
  float H = 70. * K;
  float dh = wy - (uSurf - H);
  vec3 col;
  if (dh < 0.) {
    float h = clamp(-dh / (uSurf - H + 1.), 0., 1.);
    col = mix(vec3(0.74, 0.89, 0.98), vec3(0.12, 0.50, 0.86), pow(h, 0.7));
    vec2 sp = vec2(uRes.x * 0.74, uSurf * 0.16);
    float sd = length(vec2(x, wy) - sp) / uRes.y;
    col += vec3(1.0, 0.96, 0.85) * (exp(-sd * 9.) * 0.55 + exp(-sd * 2.5) * 0.12);
    float cl = vn(vec2(x / (260. * K) + t * 0.01, wy / (40. * K))) * vn(vec2(x / (90. * K) - t * 0.02, wy / (24. * K)));
    col = mix(col, vec3(1.), smoothstep(0.25, 0.6, cl) * smoothstep(0.62, 0.95, 1. - h) * 0.6);
  } else if (d < 0.) {
    float g = clamp(dh / max(H + wave, 1.), 0., 1.);
    float z = mix(18., 1., g);
    float rip = vn(vec2(x / (z * 14. * K) + t * 0.06, (wy * z) / (9. * K) - t * 0.5)) * 0.6 + vn(vec2(x / (z * 5. * K) - t * 0.05, (wy * z) / (4. * K) + t * 0.4)) * 0.4;
    col = mix(vec3(0.10, 0.38, 0.60), vec3(0.28, 0.70, 0.80), pow(g, 1.4));
    col = mix(col, col * 1.2 + vec3(0.04), smoothstep(0.5, 0.8, rip) * 0.55 * smoothstep(0.05, 0.6, g));
    float sunx = abs(x - uRes.x * 0.74) / uRes.x;
    float glint = smoothstep(0.88, 0.97, vn(vec2(x / (z * 3. * K) - t * 0.3, (wy * z) / (2.5 * K) + t)));
    col += vec3(1.0, 0.97, 0.88) * glint * exp(-sunx * 7.) * (1.2 - g);
    col = mix(col, vec3(0.70, 0.84, 0.94), (1. - smoothstep(0., 6. * K, dh)) * 0.7);
    float lens = smoothstep(-12. * K, 0., d);
    col = mix(col, vec3(0.72, 0.93, 0.98), lens * 0.55);
    col = mix(col, vec3(0.05, 0.35, 0.50), smoothstep(-2.5 * K, 0., d) * 0.7);
  } else {
    float depth = clamp(d / max(uFloor - uSurf, 1.), 0., 1.);
    vec3 c0 = vec3(0.16, 0.66, 0.78), c1 = vec3(0.04, 0.42, 0.66), c2 = vec3(0.02, 0.19, 0.40), c3 = vec3(0.008, 0.05, 0.12);
    col = depth < 0.22 ? mix(c0, c1, depth / 0.22) : depth < 0.6 ? mix(c1, c2, (depth - 0.22) / 0.38) : mix(c2, c3, (depth - 0.6) / 0.4);
    float m = exp(-d / (30. * K));
    float band = vn(vec2(x / (70. * K) + t * 0.15, d / (5. * K) - t * 0.9)) * vn(vec2(x / (23. * K) - t * 0.2, d / (3. * K)));
    col = mix(col, vec3(0.30, 0.78, 0.86), m * 0.55);
    col += vec3(0.70, 0.95, 1.0) * m * smoothstep(0.18, 0.5, band) * 0.6;
    col += vec3(0.85, 1.0, 1.0) * exp(-d / (3.5 * K)) * 0.45;
    float u = x / K - d / K * 0.3;
    float r = sin(u * 0.013 + t * 0.25) * sin(u * 0.031 - t * 0.17) * sin(u * 0.0071 + t * 0.09);
    col += vec3(0.55, 0.85, 0.95) * pow(max(r, 0.), 1.6) * 1.4 * exp(-d / (700. * K)) * smoothstep(0., 40. * K, d) * 0.3;
    float s1 = snow(vec2(x, wy - t * 6. * K), 46. * K, 1.8 * K);
    float s2 = snow(vec2(x + 500., wy * 1.18 - t * 9. * K), 90. * K, 2.8 * K);
    col += vec3(0.75, 0.9, 1.0) * (s1 * 0.22 + s2 * 0.3) * (1. - depth * 0.55);
    float sand = wy - (uFloor + 6. * K * sin(x * 0.006 / K) + 3. * K * sin(x * 0.02 / K));
    if (sand > 0.) {
      float ripple = 0.5 + 0.5 * sin(x * 0.05 / K + sin(wy * 0.03 / K) * 2.);
      vec3 sc = mix(vec3(0.10, 0.17, 0.22), vec3(0.16, 0.24, 0.28), ripple) * (0.8 + 0.2 * vn(vec2(x, wy) / (14. * K)));
      col = mix(col, sc, smoothstep(0., 18. * K, sand));
    }
    vec2 q = fc / uRes - 0.5;
    col *= 1. - dot(q, q) * 0.5;
  }
  gl_FragColor = vec4(col, 1.);
}`;

export function useOcean(canvasRef: RefObject<HTMLCanvasElement | null>, rootRef: RefObject<HTMLElement | null>, { animate }: { animate: boolean }) {
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
    const uRes = U("uRes"), uT = U("uT"), uScroll = U("uScroll"), uSurf = U("uSurf"), uFloor = U("uFloor"), uK = U("uK");

    let raf = 0;
    let visible = true;
    let last = -1e9;
    const t0 = performance.now();
    const size = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 1.25);
      cv.width = Math.max(1, Math.round(r.width * d));
      cv.height = Math.max(1, Math.round(r.height * d));
      gl.viewport(0, 0, cv.width, cv.height);
    };
    const draw = (now: number) => {
      const c = cv.getBoundingClientRect();
      const k = c.width ? cv.width / c.width : 1;
      const page = root.getBoundingClientRect();
      const surf = root.querySelector("[data-surface]")?.getBoundingClientRect();
      const floor = root.querySelector("[data-floor]")?.getBoundingClientRect();
      if (!surf || !floor) return;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uK, k);
      gl.uniform1f(uT, animate ? (now - t0) / 1000 : 12);
      gl.uniform1f(uScroll, (c.top - page.top) * k);
      gl.uniform1f(uSurf, (surf.top - page.top) * k);
      gl.uniform1f(uFloor, (floor.top - page.top) * k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    // every frame while the page moves (the water keeps pace with the words), ≤ 30 a second at rest
    let moved = true;
    const loop = (now: number) => {
      if (moved || now - last >= 32) {
        moved = false;
        last = now;
        draw(now);
      }
      if (animate && visible && !document.hidden) raf = requestAnimationFrame(loop);
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
      if (!animate) kick();
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
  }, [canvasRef, rootRef, animate]);
}
