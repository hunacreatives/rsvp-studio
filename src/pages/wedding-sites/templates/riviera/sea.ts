import { useEffect, type RefObject } from "react";

/**
 * Riviera's sea: a top-down ocean drawn on the GPU (WebGL), under the yacht.
 *  - Four drifting layers of real wave normals (three.js `waternormals.jpg`, MIT licence) for
 *    the surface; deep-water colour lifted on the swells; the sky only in the wave slopes
 *    (Fresnel); a hard sun sparkle and a soft sheen.
 *  - The sea belongs to the page: scrolling moves it pixel for pixel with the yacht. Time alone
 *    carries it slowly aft, because she's under way.
 *  - Foam made of the same water, from the yacht's position each frame: the bow wave, the wash
 *    down both topsides, the churn from the props and the two arms of the wake.
 *  - `animate` false (the builder, the gallery card, reduced motion): one still frame, redrawn
 *    only when the page scrolls or resizes. No WebGL at all: the canvas goes and the page's own
 *    sea colour shows.
 */

const VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }";

const FS = `
precision highp float;
uniform sampler2D uN; uniform vec2 uRes; uniform float uT; uniform float uFlow;
uniform vec2 uBow; uniform vec2 uStern; uniform float uBeam;
vec3 N(vec2 uv){ return texture2D(uN, uv).rgb * 2. - 1.; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec2 p = gl_FragCoord.xy / uRes.y;
  p.y += uFlow;
  float t = uT;
  vec3 n = N(p * 0.55 + vec2( t * 0.006,  t * 0.010)) * 1.25
         + N(p * 1.30 + vec2(-t * 0.011,  t * 0.007))
         + N(p * 2.90 + vec2( t * 0.015, -t * 0.005)) * 0.7
         + N(p * 6.10 + vec2(-t * 0.020,  t * 0.018)) * 0.35;
  n = normalize(vec3(n.xy * 1.5, n.z + 0.5));
  vec3 eye = vec3(0., 0., 1.);
  vec3 sun = normalize(vec3(-0.38, 0.52, 0.76));

  vec3 deep = vec3(0.012, 0.165, 0.290);
  vec3 mid  = vec3(0.030, 0.330, 0.520);
  float swell = vnoise(p * 1.4 + vec2(t * 0.01, 0.)) * 0.6 + vnoise(p * 3.2 - vec2(0., t * 0.012)) * 0.4;
  float lit = clamp(dot(n, sun) * 0.5 + 0.5, 0., 1.);
  vec3 col = mix(deep, mid, smoothstep(0.35, 0.95, lit) * (0.55 + 0.45 * swell));

  float fres = 0.02 + 0.98 * pow(1. - clamp(dot(n, eye), 0., 1.), 5.);
  vec3 sky = mix(vec3(0.55, 0.74, 0.90), vec3(0.85, 0.92, 0.98), clamp(n.y * 2. + 0.5, 0., 1.));
  col = mix(col, sky, clamp(fres * 1.6, 0., 0.5));

  vec3 h = normalize(sun + eye);
  float nh = max(dot(n, h), 0.);
  float side = smoothstep(0.1, 1.2, gl_FragCoord.y / uRes.y + (1. - gl_FragCoord.x / uRes.x) * 0.5);
  col += vec3(1.0, 0.98, 0.92) * (min(pow(nh, 640.) * 3.2, 1.1) + pow(nh, 40.) * 0.07) * (0.35 + side);

  // Foam, from the same water. Positions are canvas pixels, y up.
  vec2 fc = gl_FragCoord.xy;
  float B = max(uBeam, 1.);
  float g1 = texture2D(uN, p * vec2(2.4, 0.9) + vec2(0., -t * 0.02)).r;
  float g2 = texture2D(uN, p * vec2(6.3, 2.1) + vec2(t * 0.01, -t * 0.03)).g;
  float g3 = texture2D(uN, p * vec2(14., 5.) + vec2(-t * 0.02, -t * 0.05)).r;
  float grain = smoothstep(0.25, 0.85, g1 * 0.5 + g2 * 0.32 + g3 * 0.18);
  float foam = 0.;
  if (uBeam > 1.) {
    // Behind the stern: the props' churn, and the two arms of the V (about 19.5 degrees).
    float d = uStern.y - fc.y; float x = fc.x - uStern.x;
    if (d > 0.) {
      float w = B * (0.20 + d / B * 0.10);
      float wash = exp(-pow(x / w, 2.)) * exp(-d / (B * 2.6));
      float arm = abs(abs(x) - (B * 0.47 + d * 0.354));
      float arms = exp(-pow(arm / (3. + d * 0.035), 2.)) * exp(-d / (B * 4.5));
      foam += smoothstep(0.30, 0.85, grain * 1.15 * wash + wash * 0.35);
      foam += smoothstep(0.25, 0.9, grain * arms * 1.6) * 0.9;
    }
    // The bow wave.
    float db = uBow.y - fc.y; float xb = fc.x - uBow.x;
    if (db > -4.) {
      float spread = abs(abs(xb) - db * 0.62);
      float bw = exp(-pow(spread / (4. + db * 0.05), 2.)) * exp(-max(db, 0.) / (B * 1.4));
      foam += smoothstep(0.2, 0.85, grain * bw * 1.8);
    }
    // The wash down both topsides, fading in behind the bow wave and out into the wake.
    float along = smoothstep(uStern.y - B * 0.25, uStern.y + B * 0.35, fc.y) * (1. - smoothstep(uBow.y - B * 1.2, uBow.y - B * 0.75, fc.y));
    float e = abs(abs(fc.x - uStern.x) - B * 0.5);
    foam += smoothstep(0.35, 0.9, grain * exp(-e / (B * 0.035)) * 1.5) * 0.75 * along;
  }
  col = mix(col, vec3(0.92, 0.96, 0.98), clamp(foam, 0., 1.) * 0.92);

  vec2 q = gl_FragCoord.xy / uRes - 0.5;
  col *= 1. - dot(q, q) * 0.45;
  gl_FragColor = vec4(pow(col, vec3(0.92)), 1.);
}`;

export function useOcean(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  yachtRef: RefObject<HTMLElement | null>,
  pageRef: RefObject<HTMLElement | null>,
  { animate, waves }: { animate: boolean; waves: string },
) {
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
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
    const uRes = U("uRes"), uT = U("uT"), uFlow = U("uFlow"), uBow = U("uBow"), uStern = U("uStern"), uBeam = U("uBeam");
    gl.uniform1i(U("uN"), 0);

    let ready = false;
    let raf = 0;
    let visible = true;
    const t0 = performance.now();

    const size = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(1, Math.round(r.width * d));
      cv.height = Math.max(1, Math.round(r.height * d));
      gl.viewport(0, 0, cv.width, cv.height);
    };

    const draw = (now: number) => {
      if (!ready) return;
      const c = cv.getBoundingClientRect();
      const k = c.width ? cv.width / c.width : 1;
      const page = pageRef.current?.getBoundingClientRect();
      // How far the page has scrolled past the canvas: the sea moves with it.
      const scrolled = page ? c.top - page.top : 0;
      const t = animate ? (now - t0) / 1000 : 12;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, t);
      gl.uniform1f(uFlow, (animate ? t * 0.035 : 0) - (scrolled * k) / cv.height);
      const y = yachtRef.current?.getBoundingClientRect();
      if (y && y.width) {
        gl.uniform2f(uBow, (y.left - c.left + y.width / 2) * k, cv.height - (y.top - c.top + 4) * k);
        gl.uniform2f(uStern, (y.left - c.left + y.width / 2) * k, cv.height - (y.bottom - c.top - 12) * k);
        gl.uniform1f(uBeam, y.width * k);
      } else gl.uniform1f(uBeam, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      draw(now);
      if (animate && visible) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      cancelAnimationFrame(raf);
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
    // Off screen (scrolled past, another tab): stop drawing.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(cv);
    // A still sea still has to follow the page when it scrolls.
    const onScroll = () => {
      if (!animate) kick();
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll, { capture: true });
      // Free what this effect made, but keep the context: the canvas outlives a remount
      // (React runs effects twice in development), and a lost context can't be got back.
      img.onload = null;
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [canvasRef, yachtRef, pageRef, animate, waves]);
}
