import { useEffect, type RefObject } from "react";

/**
 * Poolside's water: a pool seen from above, drawn on the GPU (WebGL).
 *  - White mosaic tiles on the floor, seen through moving water (refracted), with sunlight
 *    caustics dancing on them; light turquoise water; sky in the wave slopes; a sun sparkle.
 *    Wave normals: three.js `waternormals.jpg` (MIT), shared with Riviera.
 *  - It belongs to the page: scrolling moves it with the deck, pixel for pixel.
 *  - Whatever floats (elements marked `data-float`) stirs small ripples around itself; on the
 *    opening, one ring spreads out from the name (`data-ripple`).
 *  - Kept light: at most 30 frames a second, drawn at no more than 1.25× pixels, and only while
 *    the pool is on screen and the tab is visible. `animate` false (builder, gallery card,
 *    reduced motion): one still frame, redrawn when the page scrolls or resizes. No WebGL: the
 *    canvas goes and the page's own water colour shows.
 */

const MAX = 6;
const VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }";

const FS = `
precision highp float;
uniform sampler2D uN; uniform vec2 uRes; uniform float uT; uniform float uScroll; uniform float uK;
uniform vec4 uRect[${MAX}]; uniform int uCount; uniform vec3 uRip;
vec3 N(vec2 uv){ return texture2D(uN, uv).rgb * 2. - 1.; }
float caustic(vec2 uv, float t){
  vec2 p = mod(uv * 6.2831, 6.2831) - 250.;
  vec2 i = p; float c = 1.; float inten = .005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1. - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 14.);
}
vec3 floorAt(vec2 q){
  vec2 tile = q * 34.;
  vec2 g = abs(fract(tile) - 0.5);
  float grout = smoothstep(0.43, 0.49, max(g.x, g.y));
  float jitter = fract(sin(dot(floor(tile), vec2(12.9, 78.2))) * 43758.5) * 0.06;
  return mix(vec3(0.93, 0.97, 0.98) - jitter, vec3(0.70, 0.84, 0.87), grout * 0.6);
}
float sdBox(vec2 p, vec2 c, vec2 h){ vec2 d = abs(p - c) - h; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 p = fc / uRes.y;
  vec2 world = p + vec2(0., -uScroll);
  float t = uT;
  float ring = 0.;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uCount) break;
    vec4 R = uRect[i];
    float d = sdBox(fc, R.xy + R.zw * 0.5, R.zw * 0.36);
    if (d > 0.) ring += sin(d / (7. * uK) - t * 2.6) * exp(-d / (30. * uK)) * 0.7;
  }
  float age = t - uRip.z;
  if (uRip.z > 0. && age > 0. && age < 6.) {
    float dd = abs(length(fc - uRip.xy) - age * 260. * uK);
    ring += sin(dd / (6. * uK)) * exp(-dd / (16. * uK)) * (1. - age / 6.) * 2.6;
  }
  vec3 n = N(world * 1.1 + vec2(t * 0.012, t * 0.008)) + N(world * 2.6 + vec2(-t * 0.01, t * 0.014)) * 0.6;
  n.xy += vec2(ring * 0.9, ring * 0.6);
  n = normalize(vec3(n.xy * 0.9, n.z + 1.2));
  vec2 fq = world + n.xy * 0.012;
  vec3 floorC = floorAt(fq);
  float caus = clamp(caustic(fq * 1.6 + vec2(0.0, t * 0.01), t * 0.5) * 0.75 + caustic(fq * 2.3 - vec2(t * 0.008, 0.0), t * 0.43 + 3.) * 0.6, 0., 1.6);
  floorC += vec3(0.9, 1.0, 1.0) * caus * 0.7;
  vec3 water = mix(vec3(0.42, 0.82, 0.86), vec3(0.16, 0.62, 0.74), clamp(0.3 + 0.25 * sin(world.y * 0.8), 0., 1.));
  vec3 col = floorC * water * 1.05;
  float fres = 0.02 + 0.98 * pow(1. - clamp(n.z, 0., 1.), 4.);
  col = mix(col, vec3(0.85, 0.95, 1.0), clamp(fres * 1.2, 0., 0.25));
  vec3 sun = normalize(vec3(-0.35, 0.45, 0.82));
  float nh = max(dot(n, normalize(sun + vec3(0., 0., 1.))), 0.);
  col += vec3(1.) * min(pow(nh, 900.) * 2.2, 0.9);
  gl_FragColor = vec4(col, 1.);
}`;

export function usePoolWater(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  rootRef: RefObject<HTMLElement | null>,
  { animate, ripple, waves }: { animate: boolean; ripple: boolean; waves: string },
) {
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
    const uRes = U("uRes"), uT = U("uT"), uScroll = U("uScroll"), uK = U("uK"), uRect = U("uRect"), uCount = U("uCount"), uRip = U("uRip");
    gl.uniform1i(U("uN"), 0);

    const rects = new Float32Array(MAX * 4);
    let ready = false;
    let raf = 0;
    let visible = true;
    let last = -1e9;
    let ripStart = 0;
    const t0 = performance.now();

    const size = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 1.25);
      cv.width = Math.max(1, Math.round(r.width * d));
      cv.height = Math.max(1, Math.round(r.height * d));
      gl.viewport(0, 0, cv.width, cv.height);
    };

    const draw = (now: number) => {
      if (!ready) return;
      const c = cv.getBoundingClientRect();
      const k = c.width ? cv.width / c.width : 1;
      const page = root.getBoundingClientRect();
      const scrolled = c.top - page.top;
      const t = animate ? (now - t0) / 1000 : 12;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uK, k);
      gl.uniform1f(uT, t);
      gl.uniform1f(uScroll, (scrolled * k) / cv.height);
      // the floats on screen
      let n = 0;
      if (animate) {
        for (const el of root.querySelectorAll<HTMLElement>("[data-float]")) {
          if (n >= MAX) break;
          const r = el.getBoundingClientRect();
          if (r.bottom < c.top - 60 || r.top > c.bottom + 60 || !r.width) continue;
          rects.set([(r.left - c.left) * k, cv.height - (r.bottom - c.top) * k, r.width * k, r.height * k], n * 4);
          n++;
        }
      }
      gl.uniform4fv(uRect, rects);
      gl.uniform1i(uCount, n);
      const hero = ripple ? root.querySelector("[data-ripple]")?.getBoundingClientRect() : null;
      if (hero) gl.uniform3f(uRip, (hero.left - c.left + hero.width / 2) * k, cv.height - (hero.top - c.top + hero.height * 0.32) * k, ripStart);
      else gl.uniform3f(uRip, 0, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      // 30 frames a second is plenty for water
      if (now - last >= 32) {
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

    let tex: WebGLTexture | null = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      ready = true;
      ripStart = ripple ? (performance.now() - t0) / 1000 + 0.6 : 0;
      size();
      kick();
    };
    img.src = waves;

    size();
    const ro = new ResizeObserver(() => {
      size();
      kick();
    });
    ro.observe(cv);
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
      if (!animate) kick();
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll, { capture: true });
      // Free what this effect made but keep the context (a remount reuses the canvas).
      img.onload = null;
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [canvasRef, rootRef, animate, ripple, waves]);
}
