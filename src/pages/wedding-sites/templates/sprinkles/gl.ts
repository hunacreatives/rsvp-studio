/**
 * Sprinkles' renderer: WebGL2 as a flat 2D sprite renderer. Every sprinkle is one instance of a
 * single quad; its shape is worked out per pixel as a capsule's distance field (a dot is a capsule
 * with no length), so the edges stay crisp at any size and there is no texture to load. Two draws
 * a frame, whatever the count: the small shadows each sprinkle casts on the icing, then the
 * sprinkles, with a soft light from the top left (metallic colours catch more of it).
 * Instances: x, y, angle, half the straight length, radius, colour (sample.ts's STRIDE).
 */

const VS = `#version 300 es
layout(location=0) in vec2 corner;
layout(location=1) in vec4 a0;
layout(location=2) in vec2 a1;
uniform vec2 res;
uniform vec2 off;
uniform float grow;
out vec2 lp;
out vec2 ll;
out float hl;
out float rad;
flat out int ci;
void main() {
  hl = a0.w;
  rad = a1.x + grow;
  vec2 half_ = vec2(hl + rad + 1.5, rad + 1.5);
  lp = corner * half_;
  float c = cos(a0.z), s = sin(a0.z);
  vec2 p = a0.xy + off + vec2(c * lp.x - s * lp.y, s * lp.x + c * lp.y);
  // the light (from the top left of the screen), in the sprinkle's own frame
  vec2 L = normalize(vec2(-0.45, -0.9));
  ll = vec2(c * L.x + s * L.y, -s * L.x + c * L.y);
  vec2 q = p / res * 2.0 - 1.0;
  gl_Position = vec4(q.x, -q.y, 0.0, 1.0);
  ci = int(a1.y + 0.5);
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 lp;
in vec2 ll;
in float hl;
in float rad;
flat in int ci;
uniform vec4 pal[8];
uniform float px;
uniform float soft;
uniform vec4 shade;
uniform int shadowPass;
out vec4 o;
void main() {
  vec2 q = vec2(max(abs(lp.x) - hl, 0.0), lp.y);
  float d = length(q) - rad;
  float a = clamp(0.5 - d / (px * soft), 0.0, 1.0);
  if (a <= 0.0) discard;
  if (shadowPass == 1) { o = vec4(shade.rgb * shade.a, shade.a) * a; return; }
  vec4 p = pal[ci];
  vec2 n = vec2(sign(lp.x) * max(abs(lp.x) - hl, 0.0), lp.y) / max(rad, 0.001);
  float lam = dot(n, ll);
  vec3 c = p.rgb * (0.93 + 0.1 * lam);
  float h = 1.0 - smoothstep(0.0, 0.6, length(n - ll * 0.55));
  c = mix(c, vec3(1.0), h * (0.16 + 0.42 * p.a));
  c *= 1.0 - 0.1 * smoothstep(0.35, 1.0, -lam) * (1.0 + p.a);
  o = vec4(c * a, a);
}`;

export type SprinkleGL = {
  resize(w: number, h: number, dpr: number): void;
  draw(inst: Float32Array, count: number, pal: Float32Array, shadow: [number, number, number, number], scale: number): void;
  clear(): void;
  dispose(): void;
};

export function createSprinkleGL(canvas: HTMLCanvasElement): SprinkleGL | null {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const g = gl;
  const sh = (type: number, src: string) => {
    const s = g.createShader(type)!;
    g.shaderSource(s, src);
    g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) { console.warn(g.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(g.VERTEX_SHADER, VS), fs = sh(g.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const prog = g.createProgram()!;
  g.attachShader(prog, vs);
  g.attachShader(prog, fs);
  g.linkProgram(prog);
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) { console.warn(g.getProgramInfoLog(prog)); return null; }
  const U = (n: string) => g.getUniformLocation(prog, n);
  const u = { res: U("res"), off: U("off"), grow: U("grow"), pal: U("pal"), px: U("px"), soft: U("soft"), shade: U("shade"), shadowPass: U("shadowPass") };

  const vao = g.createVertexArray();
  g.bindVertexArray(vao);
  const quad = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, quad);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
  g.enableVertexAttribArray(0);
  g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
  const inst = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, inst);
  let cap = 0;
  g.enableVertexAttribArray(1);
  g.vertexAttribPointer(1, 4, g.FLOAT, false, 24, 0);
  g.vertexAttribDivisor(1, 1);
  g.enableVertexAttribArray(2);
  g.vertexAttribPointer(2, 2, g.FLOAT, false, 24, 16);
  g.vertexAttribDivisor(2, 1);
  g.bindVertexArray(null);

  let W = 1, H = 1, D = 1;
  return {
    resize(w, h, dpr) {
      W = Math.max(1, w); H = Math.max(1, h); D = dpr;
      const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    },
    clear() {
      g.viewport(0, 0, canvas.width, canvas.height);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
    },
    draw(data, count, pal, shadow, scale) {
      g.viewport(0, 0, canvas.width, canvas.height);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      if (!count) return;
      g.useProgram(prog);
      g.bindVertexArray(vao);
      g.bindBuffer(g.ARRAY_BUFFER, inst);
      const bytes = count * 24;
      if (bytes > cap) { cap = Math.max(bytes, cap * 2); g.bufferData(g.ARRAY_BUFFER, cap, g.DYNAMIC_DRAW); }
      g.bufferSubData(g.ARRAY_BUFFER, 0, data, 0, count * 6);
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      g.uniform2f(u.res, W, H);
      g.uniform4fv(u.pal, pal);
      g.uniform1f(u.px, 1 / D);
      g.uniform4f(u.shade, shadow[0] / 255, shadow[1] / 255, shadow[2] / 255, shadow[3]);
      // the shadows: a touch down and to the right, a little bigger and soft
      g.uniform1i(u.shadowPass, 1);
      g.uniform2f(u.off, 0.5 * scale, 1.3 * scale);
      g.uniform1f(u.grow, 0.35 * scale);
      g.uniform1f(u.soft, 1 + 2.2 * scale * D);
      g.drawArraysInstanced(g.TRIANGLE_STRIP, 0, 4, count);
      g.uniform1i(u.shadowPass, 0);
      g.uniform2f(u.off, 0, 0);
      g.uniform1f(u.grow, 0);
      g.uniform1f(u.soft, 1);
      g.drawArraysInstanced(g.TRIANGLE_STRIP, 0, 4, count);
      g.bindVertexArray(null);
    },
    dispose() {
      g.deleteBuffer(quad);
      g.deleteBuffer(inst);
      g.deleteVertexArray(vao);
      g.deleteProgram(prog);
      g.deleteShader(vs);
      g.deleteShader(fs);
    },
  };
}
