(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // ../../../rsvp-studio/src/pages/wedding-sites/templates/inkvows/strokes.ts
  function flourish(ctx, [x, y, w, h], k) {
    const n = 220, L = [], R = [];
    const r = h * 0.34, mid = y + h * 0.62;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let px = x + w * t, py = mid - h * 0.16 * Math.sin(Math.PI * 2 * t);
      const a = (t - 0.44) / 0.14;
      if (a > 0 && a < 1) {
        const e = a * a * (3 - 2 * a), th = e * Math.PI * 2;
        px += Math.sin(th) * r * 1.15 + w * 0.14 * (e - a);
        py -= (1 - Math.cos(th)) * r;
      }
      pts.push([px, py]);
    }
    const hair = Math.max(0.5, h * 0.035), thick = h * 0.17;
    for (let i = 0; i <= n; i++) {
      const p = pts[Math.max(0, i - 1)], q = pts[Math.min(n, i + 1)];
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      const t = i / n, taper = Math.min(1, t / 0.12, (1 - t) / 0.16);
      const down = Math.max(0, dy / l);
      const hw = (hair + (thick - hair) * Math.pow(down, 1.4) * Math.min(1, taper * 1.3)) * 0.5 * Math.max(0.25, taper);
      const nx = -dy / l, ny = dx / l;
      L.push([(pts[i][0] + nx * hw) * k, (pts[i][1] + ny * hw) * k]);
      R.push([(pts[i][0] - nx * hw) * k, (pts[i][1] - ny * hw) * k]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (const p of L) ctx.lineTo(p[0], p[1]);
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fill("nonzero");
  }
  function thin(img, w, h) {
    let cand = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (img[y * w + x]) cand.push(y * w + x);
    const del = [];
    for (let changed = true; changed; ) {
      changed = false;
      for (let pass = 0; pass < 2; pass++) {
        del.length = 0;
        for (const i of cand) {
          if (!img[i]) continue;
          const p2 = img[i - w], p3 = img[i - w + 1], p4 = img[i + 1], p5 = img[i + w + 1], p6 = img[i + w], p7 = img[i + w - 1], p8 = img[i - 1], p9 = img[i - w - 1];
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const A = +(!p2 && !!p3) + +(!p3 && !!p4) + +(!p4 && !!p5) + +(!p5 && !!p6) + +(!p6 && !!p7) + +(!p7 && !!p8) + +(!p8 && !!p9) + +(!p9 && !!p2);
          if (A !== 1) continue;
          if (pass === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
          del.push(i);
        }
        for (const i of del) img[i] = 0;
        if (del.length) changed = true;
      }
      cand = cand.filter((i) => img[i]);
    }
    for (const i of cand) {
      let m = 0, n = 0;
      for (let k = 0; k < 8; k++) if (img[i + DY[k] * w + DX[k]]) {
        m |= 1 << k;
        n++;
      }
      if (n >= 2 && GROUPS[m] === 1) img[i] = 0;
    }
    return cand.filter((i) => img[i]);
  }
  function distance(bin, w, h) {
    const d = new Float32Array(w * h);
    const BIG = 1e6;
    for (let i = 0; i < w * h; i++) d[i] = bin[i] ? BIG : 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], d[i - 1] + 3, d[i - w] + 3, d[i - w - 1] + 4, d[i - w + 1] + 4);
    }
    for (let y = h - 2; y > 0; y--) for (let x = w - 2; x > 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], d[i + 1] + 3, d[i + w] + 3, d[i + w + 1] + 4, d[i + w - 1] + 4);
    }
    for (let i = 0; i < w * h; i++) d[i] /= 3;
    return d;
  }
  function graph(sk, pixels, w) {
    const count = (i) => {
      let n = 0;
      for (let k = 0; k < 8; k++) if (sk[i + DY[k] * w + DX[k]]) n++;
      return n;
    };
    const nodeOf = /* @__PURE__ */ new Map();
    const nodes = [];
    const isNode = (i) => {
      const c = count(i);
      return c !== 2;
    };
    for (const i of pixels) {
      if (nodeOf.has(i) || !isNode(i)) continue;
      const id = nodes.length, pix = [], st = [i];
      nodeOf.set(i, id);
      while (st.length) {
        const p = st.pop();
        pix.push(p);
        for (let k = 0; k < 8; k++) {
          const q = p + DY[k] * w + DX[k];
          if (sk[q] && !nodeOf.has(q) && isNode(q)) {
            nodeOf.set(q, id);
            st.push(q);
          }
        }
      }
      let sx = 0, sy = 0;
      for (const p of pix) {
        sx += p % w;
        sy += p / w | 0;
      }
      nodes.push({ pix, x: sx / pix.length, y: sy / pix.length, edges: [] });
    }
    const edgeOf = /* @__PURE__ */ new Map();
    const edges = [];
    const step = (a, b) => Math.abs(a - b) === 1 || Math.abs(a - b) === w ? 1 : Math.SQRT2;
    const walk = (start, first, startNode) => {
      const px = [start, first];
      let prev = start, cur = first, end = -1;
      edgeOf.set(first, edges.length);
      for (let guard = 0; guard < 1e5; guard++) {
        let next = -1;
        for (let k = 0; k < 8; k++) {
          const q = cur + DY[k] * w + DX[k];
          if (!sk[q] || q === prev || px[px.length - 2] === q) continue;
          if (nodeOf.has(q)) {
            if (q !== start || px.length > 3) {
              next = q;
              break;
            }
            continue;
          }
          if (!edgeOf.has(q)) {
            next = q;
          }
        }
        if (next < 0) break;
        px.push(next);
        if (nodeOf.has(next)) {
          end = nodeOf.get(next);
          break;
        }
        edgeOf.set(next, edges.length);
        prev = cur;
        cur = next;
      }
      if (end < 0) {
        const last = px[px.length - 1];
        end = nodes.length;
        nodeOf.set(last, end);
        nodes.push({ pix: [last], x: last % w, y: last / w | 0, edges: [] });
      }
      let len = 0;
      for (let i = 1; i < px.length; i++) len += step(px[i - 1], px[i]);
      const id = edges.length;
      edges.push({ a: startNode, b: end, px, len });
      nodes[startNode].edges.push(id);
      if (end !== startNode) nodes[end].edges.push(id);
      else nodes[end].edges.push(id);
    };
    for (let n = 0; n < nodes.length; n++) {
      for (const p of [...nodes[n].pix]) {
        for (let k = 0; k < 8; k++) {
          const q = p + DY[k] * w + DX[k];
          if (sk[q] && !nodeOf.has(q) && !edgeOf.has(q)) walk(p, q, n);
        }
      }
    }
    for (const i of pixels) {
      if (!sk[i] || nodeOf.has(i) || edgeOf.has(i)) continue;
      const id = nodes.length;
      nodeOf.set(i, id);
      nodes.push({ pix: [i], x: i % w, y: i / w | 0, edges: [] });
      for (let k = 0; k < 8; k++) {
        const q = i + DY[k] * w + DX[k];
        if (sk[q] && !nodeOf.has(q) && !edgeOf.has(q)) {
          walk(i, q, id);
          break;
        }
      }
    }
    return { nodes, edges, nodeOf };
  }
  function rasterize(layout, { speed = 6, maxDur = 3, dpr = 1 }) {
    const { w: cssW, h: cssH, runs, em } = layout;
    if (cssW < 4 || cssH < 4 || !runs.length) return null;
    let S = Math.max(1, Math.min(2, dpr));
    S = Math.min(S, 4096 / cssW, 4096 / cssH, Math.sqrt(7e6 / (cssW * cssH)));
    const dW = Math.max(1, Math.round(cssW * S)), dH = Math.max(1, Math.round(cssH * S));
    const glyph = document.createElement("canvas");
    glyph.width = dW;
    glyph.height = dH;
    const gc = glyph.getContext("2d");
    if (!gc) return null;
    const set = (c, k, o) => {
      c.fillStyle = "#fff";
      c.textBaseline = "alphabetic";
      for (const r of runs) {
        if (r.shape === "flourish") {
          c.save();
          c.translate(o, o);
          flourish(c, r.box, k);
          c.restore();
          continue;
        }
        c.font = font(r, k);
        c.fillText(r.text, r.x * k + o, r.baseline * k + o);
      }
    };
    set(gc, S, 0);
    let ws = Math.min(4, Math.max(0.5, 120 / em));
    ws = Math.min(ws, Math.sqrt(16e5 / (cssW * cssH)));
    const wW = Math.max(3, Math.round(cssW * ws)) + 2, wH = Math.max(3, Math.round(cssH * ws)) + 2;
    const wc = document.createElement("canvas");
    wc.width = wW;
    wc.height = wH;
    const wx = wc.getContext("2d", { willReadFrequently: true });
    if (!wx) return null;
    set(wx, ws, 1);
    const img = wx.getImageData(0, 0, wW, wH).data;
    const alpha = new Uint8Array(wW * wH);
    for (let i = 0; i < alpha.length; i++) alpha[i] = img[i * 4 + 3];
    return { raster: { cssW, cssH, S, dW, dH, glyph, ws, wW, wH }, input: { alpha, wW, wH, ws, em, boxes: runs.map((r) => r.box), speed, maxDur } };
  }
  function analyse({ alpha, wW, wH, ws, em, boxes, speed, maxDur }) {
    const N = wW * wH;
    const a = new Float32Array(N), bin = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      a[i] = alpha[i] / 255;
    }
    for (let y = 1; y < wH - 1; y++) for (let x = 1; x < wW - 1; x++) {
      const i = y * wW + x;
      bin[i] = a[i] > 0.3 ? 1 : 0;
    }
    const dist = distance(bin, wW, wH);
    const sk = new Uint8Array(bin);
    let pixels = thin(sk, wW, wH);
    const emW = em * ws;
    let g = graph(sk, pixels, wW);
    for (let pass = 0; pass < 2; pass++) {
      let cut = false;
      for (const e of g.edges) {
        const na = g.nodes[e.a], nb = g.nodes[e.b];
        const da = na.edges.length, db = nb.edges.length;
        const end = da === 1 && db >= 3 ? 0 : db === 1 && da >= 3 ? 1 : -1;
        if (end < 0) continue;
        const j = end === 0 ? nb : na;
        const rj = dist[j.pix[0]] || 1;
        if (e.len < Math.max(3, 1.5 * rj)) {
          const jn = end === 0 ? e.b : e.a;
          for (const p of e.px) if (g.nodeOf.get(p) !== jn) sk[p] = 0;
          cut = true;
        }
      }
      if (!cut) break;
      pixels = pixels.filter((i) => sk[i]);
      g = graph(sk, pixels, wW);
    }
    const { nodes, edges } = g;
    if (!edges.length && !nodes.length) return null;
    const comp = new Int32Array(nodes.length).fill(-1);
    const pieces = [];
    for (let n = 0; n < nodes.length; n++) {
      if (comp[n] >= 0) continue;
      const id = pieces.length, st = [n], ns = [], es = /* @__PURE__ */ new Set();
      comp[n] = id;
      while (st.length) {
        const m = st.pop();
        ns.push(m);
        for (const e of nodes[m].edges) {
          es.add(e);
          const o = edges[e].a === m ? edges[e].b : edges[e].a;
          if (comp[o] < 0) {
            comp[o] = id;
            st.push(o);
          }
        }
      }
      let minX = 1e9, maxX = -1e9, sx = 0, sy = 0, cnt = 0, len = 0;
      for (const e of es) {
        len += edges[e].len;
        for (const p of edges[e].px) {
          const x = p % wW;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          sx += x;
          sy += p / wW | 0;
          cnt++;
        }
      }
      for (const m of ns) for (const p of nodes[m].pix) {
        const x = p % wW;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        sx += x;
        sy += p / wW | 0;
        cnt++;
      }
      const cx = (sx / cnt - 1) / ws, cy = (sy / cnt - 1) / ws;
      let run = 0, best = 1e9;
      boxes.forEach(([bx, by, bw, bh], k) => {
        const dx = Math.max(bx - cx, 0, cx - bx - bw), dy = Math.max(by - cy, 0, cy - by - bh);
        const d = dx + dy * 1.5;
        if (d < best) {
          best = d;
          run = k;
        }
      });
      pieces.push({ nodes: ns, edges: [...es], minX, maxX, cx, cy, len, run });
    }
    const small = (p) => p.len < emW * 0.22;
    const order = [];
    for (let r = 0; r < boxes.length; r++) {
      const big = pieces.map((p, i) => i).filter((i) => pieces[i].run === r && !small(pieces[i])).sort((p, q) => pieces[p].minX - pieces[q].minX);
      const dots = pieces.map((p, i) => i).filter((i) => pieces[i].run === r && small(pieces[i]));
      const after = /* @__PURE__ */ new Map();
      for (const d of dots) {
        const cx = pieces[d].cx * ws;
        let host = -1;
        for (const b of big) if (pieces[b].minX <= cx + 2) host = b;
        if (host < 0) host = big[0] ?? -1;
        if (!after.has(host)) after.set(host, []);
        after.get(host).push(d);
      }
      if (after.has(-1)) order.push(...after.get(-1));
      for (const b of big) {
        order.push(b);
        for (const d of (after.get(b) ?? []).sort((p, q) => pieces[p].cx - pieces[q].cx)) order.push(d);
      }
    }
    const strokes = [];
    const done = new Uint8Array(edges.length);
    const xy = (p) => [p % wW, p / wW | 0];
    const dirAt = (e, from) => {
      const px = e.a === from ? e.px : [...e.px].reverse();
      const k = Math.min(px.length - 1, 7);
      const [x0, y0] = xy(px[0]), [x1, y1] = xy(px[k]);
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      return [(x1 - x0) / l, (y1 - y0) / l];
    };
    const endDir = (px) => {
      const k = Math.max(0, px.length - 8);
      const [x0, y0] = xy(px[k]), [x1, y1] = xy(px[px.length - 1]);
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      return [(x1 - x0) / l, (y1 - y0) / l];
    };
    for (const pi of order) {
      const P = pieces[pi];
      const left = new Set(P.edges);
      if (!left.size) {
        strokes.push([{ px: nodes[P.nodes[0]].pix.slice(0, 1), kind: 0 }]);
        continue;
      }
      const ends = P.nodes.filter((n) => nodes[n].edges.length === 1);
      const pickStart = (cands) => cands.reduce((b, n) => nodes[n].x + nodes[n].y * 0.15 < nodes[b].x + nodes[b].y * 0.15 ? n : b, cands[0]);
      let cur = pickStart(ends.length ? ends : P.nodes);
      let dir = null;
      let stroke = [];
      while (left.size) {
        const out = nodes[cur].edges.filter((e) => left.has(e));
        if (out.length) {
          let best = out[0], bs = -1e9;
          for (const e2 of out) {
            const d = dirAt(edges[e2], cur);
            const s = dir ? d[0] * dir[0] + d[1] * dir[1] : d[0] * 0.8 - d[1] * 0.2;
            if (s > bs) {
              bs = s;
              best = e2;
            }
          }
          const e = edges[best];
          const px = e.a === cur ? e.px : [...e.px].reverse();
          stroke.push({ px, kind: 0 });
          left.delete(best);
          done[best] = 1;
          dir = endDir(px);
          cur = e.a === cur ? e.b : e.a;
          continue;
        }
        const want = new Set(P.nodes.filter((n) => nodes[n].edges.some((e) => left.has(e))));
        const dd2 = /* @__PURE__ */ new Map([[cur, 0]]), via = /* @__PURE__ */ new Map();
        const q = [cur];
        let found = -1;
        while (q.length) {
          q.sort((m2, n) => dd2.get(m2) - dd2.get(n));
          const m = q.shift();
          if (want.has(m)) {
            found = m;
            break;
          }
          if (dd2.get(m) > emW * 0.5) break;
          for (const e of nodes[m].edges) {
            if (left.has(e)) continue;
            const o = edges[e].a === m ? edges[e].b : edges[e].a;
            const nd = dd2.get(m) + edges[e].len;
            if (nd < (dd2.get(o) ?? 1e9)) {
              dd2.set(o, nd);
              via.set(o, e);
              q.push(o);
            }
          }
        }
        if (found >= 0) {
          const chain = [];
          for (let n = found; n !== cur; ) {
            const e = edges[via.get(n)];
            const o = e.a === n ? e.b : e.a;
            chain.unshift(e.a === o ? e.px : [...e.px].reverse());
            n = o;
          }
          for (const px of chain) stroke.push({ px, kind: 1 });
          dir = chain.length ? endDir(chain[chain.length - 1]) : dir;
          cur = found;
          continue;
        }
        strokes.push(stroke);
        stroke = [];
        const from = nodes[cur];
        cur = [...want].reduce((b, n) => Math.hypot(nodes[n].x - from.x, nodes[n].y - from.y) < Math.hypot(nodes[b].x - from.x, nodes[b].y - from.y) ? n : b, [...want][0]);
        dir = null;
      }
      if (stroke.length) strokes.push(stroke);
    }
    const tau = new Float32Array(N).fill(-1);
    const path = [];
    let t = 0;
    const thick = (p) => Math.min(1, Math.max(0, ((dist[p] || 0.5) / emW - 0.012) / 0.04));
    const toCss = (v) => (v - 1) / ws;
    let lastXY = null;
    const lifts = [];
    for (const st of strokes) {
      const seq2 = [];
      for (const m of st) for (let i = 0; i < m.px.length; i++) if (!seq2.length || seq2[seq2.length - 1].p !== m.px[i]) seq2.push({ p: m.px[i], kind: m.kind });
      if (!seq2.length) continue;
      const xs = seq2.map((s) => s.p % wW), ys = seq2.map((s) => s.p / wW | 0);
      const sx = xs.map((_, i) => {
        let v = 0, wsum = 0;
        for (let k = -4; k <= 4; k++) {
          const j = Math.min(xs.length - 1, Math.max(0, i + k)), ww = Math.exp(-(k * k) / 6);
          v += xs[j] * ww;
          wsum += ww;
        }
        return v / wsum;
      });
      const sy = ys.map((_, i) => {
        let v = 0, wsum = 0;
        for (let k = -4; k <= 4; k++) {
          const j = Math.min(ys.length - 1, Math.max(0, i + k)), ww = Math.exp(-(k * k) / 6);
          v += ys[j] * ww;
          wsum += ww;
        }
        return v / wsum;
      });
      const first = [toCss(sx[0]), toCss(sy[0])];
      if (lastXY) {
        const dx = first[0] - lastXY[0], dy = first[1] - lastXY[1];
        const dl = Math.hypot(dx, dy) / em;
        const lt = 0.1 + 0.07 * Math.min(4, dl);
        const n = 8;
        for (let k = 1; k < n; k++) {
          const f = k / n, e = f * f * (3 - 2 * f);
          path.push(lastXY[0] + dx * e, lastXY[1] + dy * e, t + lt * f, 0.45 * Math.sin(Math.PI * f) * Math.min(1, 0.4 + dl), 0);
        }
        lifts.push(lt);
        t += lt;
      } else t += 0.04;
      for (let i = 0; i < seq2.length; i++) {
        const p = seq2[i].p;
        if (i > 0) {
          const q = seq2[i - 1].p;
          const ds = (Math.abs(p - q) === 1 || Math.abs(p - q) === wW ? 1 : Math.SQRT2) / emW;
          const a0 = Math.max(0, i - 5), a1 = Math.min(seq2.length - 1, i + 5);
          const v1x = sx[i] - sx[a0], v1y = sy[i] - sy[a0], v2x = sx[a1] - sx[i], v2y = sy[a1] - sy[i];
          const l1 = Math.hypot(v1x, v1y) || 1, l2 = Math.hypot(v2x, v2y) || 1;
          const turn = Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (l1 * l2))));
          const press = thick(p);
          let v = (1.3 - 0.62 * press) / (1 + 0.9 * turn);
          if (seq2[i].kind === 1) v *= 2.4;
          t += ds / (v * speed);
        }
        if (tau[p] < 0 && seq2[i].kind === 0) tau[p] = t;
        if (i % 2 === 0 || i === seq2.length - 1) path.push(toCss(sx[i]), toCss(sy[i]), t, 0, thick(p));
      }
      lastXY = [toCss(sx[sx.length - 1]), toCss(sy[sy.length - 1])];
    }
    for (const n of nodes) {
      let tt = -1;
      for (const p of n.pix) if (tau[p] >= 0) tt = tt < 0 ? tau[p] : Math.min(tt, tau[p]);
      if (tt < 0) for (const p of n.pix) for (let k = 0; k < 8; k++) {
        const q = p + DY[k] * wW + DX[k];
        if (tau[q] >= 0) tt = tt < 0 ? tau[q] : Math.min(tt, tau[q]);
      }
      for (const p of n.pix) if (tau[p] < 0 && tt >= 0) tau[p] = tt;
    }
    let dur = t + 0.02;
    if (dur > maxDur) {
      const k = maxDur / dur;
      for (let i = 0; i < N; i++) if (tau[i] >= 0) tau[i] *= k;
      for (let i = 2; i < path.length; i += 5) path[i] *= k;
      dur = maxDur;
    }
    const region = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (a[i] > 0.015) region[i] = 1;
    for (let pass = 0; pass < 3; pass++) {
      const r0 = region.slice();
      for (let y = 1; y < wH - 1; y++) for (let x = 1; x < wW - 1; x++) {
        const i = y * wW + x;
        if (r0[i]) continue;
        if (r0[i - 1] || r0[i + 1] || r0[i - wW] || r0[i + wW]) region[i] = 1;
      }
    }
    const dd = new Int32Array(N).fill(1 << 30), seed = new Int32Array(N).fill(-1);
    const buckets = [];
    const push = (d, i) => {
      (buckets[d] ?? (buckets[d] = [])).push(i);
    };
    for (let i = 0; i < N; i++) if (tau[i] >= 0 && sk[i]) {
      dd[i] = 0;
      seed[i] = i;
      push(0, i);
    }
    const W5 = [7, 5, 7, 5, 7, 5, 7, 5];
    for (let d = 0; d < buckets.length; d++) {
      const b = buckets[d];
      if (!b) continue;
      for (let k = 0; k < b.length; k++) {
        const i = b[k];
        if (dd[i] !== d) continue;
        const x = i % wW, y = i / wW | 0;
        if (x < 1 || y < 1 || x >= wW - 1 || y >= wH - 1) continue;
        for (let n = 0; n < 8; n++) {
          const j = i + DY[n] * wW + DX[n];
          if (!region[j]) continue;
          const nd = d + W5[n];
          if (nd < dd[j]) {
            dd[j] = nd;
            seed[j] = seed[i];
            push(nd, j);
          }
        }
      }
      buckets[d] = [];
    }
    const time = new Uint8Array(N * 4);
    for (let i = 0; i < N; i++) {
      const o = i * 4;
      time[o + 3] = 255;
      const s = seed[i];
      if (s < 0 || !region[i]) {
        time[o] = 255;
        time[o + 1] = 255;
        time[o + 2] = 255;
        continue;
      }
      const q = Math.min(65e3, Math.round(tau[s] / dur * 65e3));
      time[o] = q >> 8;
      time[o + 1] = q & 255;
      const r = Math.max(0.8, dist[s] || 0.8);
      time[o + 2] = Math.min(254, Math.round(dd[i] / 5 / r * 100));
    }
    for (let i = 0; i < N; i++) if (a[i] > 0.05 && seed[i] < 0) {
      const o = i * 4;
      time[o] = 65e3 >> 8;
      time[o + 1] = 65e3 & 255;
      time[o + 2] = 50;
    }
    const rb = Math.max(1, Math.round(emW * 0.016));
    let sa = a;
    for (let pass = 0; pass < 2; pass++) {
      const tmp = new Float32Array(N), out = new Float32Array(N);
      for (let y = 0; y < wH; y++) {
        let acc = 0;
        const row = y * wW;
        for (let x = -rb; x <= rb; x++) acc += sa[row + Math.min(wW - 1, Math.max(0, x))];
        for (let x = 0; x < wW; x++) {
          tmp[row + x] = acc / (2 * rb + 1);
          acc += sa[row + Math.min(wW - 1, x + rb + 1)] - sa[row + Math.max(0, x - rb)];
        }
      }
      for (let x = 0; x < wW; x++) {
        let acc = 0;
        for (let y = -rb; y <= rb; y++) acc += tmp[Math.min(wH - 1, Math.max(0, y)) * wW + x];
        for (let y = 0; y < wH; y++) {
          out[y * wW + x] = acc / (2 * rb + 1);
          acc += tmp[Math.min(wH - 1, y + rb + 1) * wW + x] - tmp[Math.max(0, y - rb) * wW + x];
        }
      }
      sa = out;
    }
    const soft = new Uint8Array(N);
    for (let i = 0; i < N; i++) soft[i] = Math.round(Math.min(1, sa[i]) * 255);
    void lifts;
    return { time, soft, path: new Float32Array(path), dur };
  }
  var font, DX, DY, GROUPS;
  var init_strokes = __esm({
    "../../../rsvp-studio/src/pages/wedding-sites/templates/inkvows/strokes.ts"() {
      font = (r, k) => `${r.style} ${r.weight} ${(r.size * k).toFixed(2)}px ${r.family}`;
      DX = [-1, 0, 1, 1, 1, 0, -1, -1];
      DY = [-1, -1, -1, 0, 1, 1, 1, 0];
      GROUPS = (() => {
        const t = new Uint8Array(256);
        for (let m = 0; m < 256; m++) {
          const seen = new Array(8).fill(false);
          let g = 0;
          for (let i = 0; i < 8; i++) {
            if (!(m & 1 << i) || seen[i]) continue;
            g++;
            const st = [i];
            seen[i] = true;
            while (st.length) {
              const a = st.pop();
              for (let j = 0; j < 8; j++) {
                if (seen[j] || !(m & 1 << j)) continue;
                if (Math.max(Math.abs(DX[a] - DX[j]), Math.abs(DY[a] - DY[j])) === 1) {
                  seen[j] = true;
                  st.push(j);
                }
              }
            }
          }
          t[m] = g;
        }
        return t;
      })();
    }
  });

  // ../../../rsvp-studio/src/pages/wedding-sites/templates/inkvows/ink.ts
  function analyseOff(input) {
    if (worker === void 0) {
      try {
        worker = new Worker(new URL("./strokes.worker.ts", import_meta.url), { type: "module" });
        worker.onmessage = (e) => {
          const cb = waiting.get(e.data.id);
          waiting.delete(e.data.id);
          cb?.(e.data.out);
        };
        worker.onerror = () => {
          worker = null;
          for (const cb of waiting.values()) cb(null);
          waiting.clear();
        };
      } catch {
        worker = null;
      }
    }
    if (!worker) return new Promise((r) => setTimeout(() => r(analyse(input)), 0));
    const id = ++seq;
    return new Promise((r) => {
      waiting.set(id, r);
      worker.postMessage({ id, input }, [input.alpha.buffer]);
    });
  }
  function makeGL() {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 16;
    const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(pr, n);
    const u = { G: U("uG"), T: U("uT"), B: U("uB"), Ws: U("uWs"), Tx: U("uTx"), Css: U("uCss"), Now: U("uNow"), Dur: U("uDur"), Seed: U("uSeed"), Ink: U("uInk"), Wet: U("uWet") };
    gl.uniform1i(u.G, 0);
    gl.uniform1i(u.T, 1);
    gl.uniform1i(u.B, 2);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    return { gl, cv, u };
  }
  function texture(g, unit, nearest, src) {
    const { gl } = g;
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    const f = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if ("w" in src) {
      const fmt = src.lum ? gl.LUMINANCE : gl.RGBA;
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt, src.w, src.h, 0, fmt, gl.UNSIGNED_BYTE, src.data);
    } else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    return t;
  }
  function measure(el) {
    if (el.dataset.ivShape === "flourish") {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 2) return null;
      const p = r.height * 0.6;
      const pad2 = [p, p, p, p];
      const layout2 = { w: r.width + 2 * p, h: r.height + 2 * p, em: r.height * 2.4, runs: [{ text: "", x: p, baseline: 0, style: "normal", weight: "400", size: r.height, family: "serif", box: [p, p, r.width, r.height], shape: "flourish" }] };
      return { layout: layout2, pad: pad2, key: `f${Math.round(r.width)}x${Math.round(r.height)}` };
    }
    const holder = el.querySelector("[data-iv-text]") ?? el;
    const er = holder.getBoundingClientRect();
    if (er.width < 2 || er.height < 2) return null;
    const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
    const pieces = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if ((n.textContent ?? "").trim() && n.parentElement && !n.parentElement.closest("[data-iv-skip]")) pieces.push({ node: n, cs: getComputedStyle(n.parentElement) });
    if (!pieces.length) return null;
    const em = Math.max(...pieces.map((p) => parseFloat(p.cs.fontSize) || 16));
    const pad = [em * 0.62, em * 0.5, em * 0.78, em * 0.5];
    const ox = er.left - pad[3], oy = er.top - pad[0];
    const runs = [];
    const range = document.createRange();
    const mc = document.createElement("canvas").getContext("2d");
    for (const { node, cs } of pieces) {
      const text = node.textContent ?? "";
      const size = parseFloat(cs.fontSize) || 16;
      const f = { style: cs.fontStyle || "normal", weight: cs.fontWeight || "400", size, family: cs.fontFamily };
      mc.font = `${f.style} ${f.weight} ${size}px ${f.family}`;
      const m = mc.measureText("Hg");
      const asc = m.fontBoundingBoxAscent ?? size * 0.8, desc = m.fontBoundingBoxDescent ?? size * 0.25;
      const words = [...text.matchAll(/\S+/g)];
      let cur = null;
      const flush = () => {
        if (!cur) return;
        const r = cur.r;
        const baseline = r.top + (r.height - (asc + desc)) / 2 + asc - oy;
        runs.push({ text: text.slice(cur.s, cur.e), x: cur.left - ox, baseline, ...f, box: [cur.left - ox, r.top - oy, r.right - cur.left, r.height] });
        cur = null;
      };
      for (const w of words) {
        const s = w.index ?? 0, e = s + w[0].length;
        range.setStart(node, s);
        range.setEnd(node, e);
        const r = range.getClientRects()[0];
        if (!r) continue;
        if (cur && Math.abs(r.top - cur.top) < size * 0.3) {
          cur.e = e;
          cur.r = new DOMRect(cur.left, Math.min(cur.r.top, r.top), r.right - cur.left, Math.max(cur.r.height, r.height));
        } else {
          flush();
          cur = { s, e, top: r.top, left: r.left, r: new DOMRect(r.left, r.top, r.width, r.height) };
        }
      }
      flush();
    }
    const layout = { w: er.width + pad[1] + pad[3], h: er.height + pad[0] + pad[2], runs, em };
    const key = `${Math.round(layout.w)}x${Math.round(layout.h)}|${runs.map((r) => `${r.text}@${r.x.toFixed(1)},${r.baseline.toFixed(1)},${r.size}`).join("|")}`;
    return { layout, pad, key };
  }
  function createInker({ ink, wet, pen, stage }) {
    const g = makeGL();
    const INK = hex(ink), WET = hex(wet);
    const jobs = /* @__PURE__ */ new Map();
    let raf = 0, last = 0, rate = 1, alive = true;
    let penX = -1, penY = -1, penH = 1, penShown = false, penScale = 1;
    let queue = [];
    let leg = null;
    let leaving = null;
    let onQueueDone = null;
    const dpr = () => Math.min(2, window.devicePixelRatio || 1);
    const release = (j) => {
      if (j.tex && g) {
        g.gl.deleteTexture(j.tex.g);
        g.gl.deleteTexture(j.tex.t);
        g.gl.deleteTexture(j.tex.b);
      }
      j.tex = null;
    };
    const place = (j, m) => {
      const [pt, , , pl] = m.pad;
      const c = j.canvas;
      c.style.left = `${-pl}px`;
      c.style.top = `${-pt}px`;
      c.style.width = `${m.layout.w}px`;
      c.style.height = `${m.layout.h}px`;
      if (j.prep) {
        c.width = j.prep.dW;
        c.height = j.prep.dH;
      }
    };
    const prep = (j) => {
      const m = measure(j.el);
      if (!m) return Promise.resolve(null);
      if (j.prep && j.key === m.key) return Promise.resolve(j.prep);
      if (j.pending && j.pending.key === m.key) return j.pending.ready;
      const t0 = performance.now();
      const r = rasterize(m.layout, { speed: j.speed, maxDur: j.maxDur, dpr: dpr() });
      j.ms = performance.now() - t0;
      j.em = m.layout.em;
      if (!r) return Promise.resolve(null);
      const ready2 = analyseOff(r.input).then((an) => {
        if (!alive || j.pending?.ready !== ready2) return j.prep;
        j.pending = null;
        release(j);
        j.key = m.key;
        j.prep = an ? { ...r.raster, ...an } : null;
        place(j, m);
        return j.prep;
      });
      j.pending = { key: m.key, ready: ready2 };
      return ready2;
    };
    const ready = (j) => {
      const m = measure(j.el);
      return !!(j.prep && m && j.key === m.key);
    };
    const upload = (j) => {
      if (!g || !j.prep || j.tex) return;
      const P = j.prep;
      j.tex = {
        g: texture(g, 0, false, P.glyph),
        t: texture(g, 1, true, { w: P.wW, h: P.wH, data: P.time }),
        b: texture(g, 2, false, { w: P.wW, h: P.wH, data: P.soft, lum: true })
      };
    };
    const draw = (j, now) => {
      const P = j.prep;
      const ctx = j.canvas.getContext("2d");
      if (!P || !ctx) return;
      if (!g) {
        ctx.clearRect(0, 0, P.dW, P.dH);
        ctx.drawImage(P.glyph, 0, 0);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = ink;
        ctx.fillRect(0, 0, P.dW, P.dH);
        ctx.globalCompositeOperation = "source-over";
        return;
      }
      upload(j);
      const { gl, cv, u } = g;
      if (cv.width < P.dW || cv.height < P.dH) {
        cv.width = Math.max(cv.width, P.dW);
        cv.height = Math.max(cv.height, P.dH);
      }
      gl.viewport(0, 0, P.dW, P.dH);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, j.tex.g);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, j.tex.t);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, j.tex.b);
      gl.uniform4f(u.Ws, P.cssW * P.ws / P.wW, P.cssH * P.ws / P.wH, 1 / P.wW, 1 / P.wH);
      gl.uniform2f(u.Tx, 1 / P.wW, 1 / P.wH);
      gl.uniform2f(u.Css, P.cssW, P.cssH);
      gl.uniform1f(u.Now, now);
      gl.uniform1f(u.Dur, P.dur);
      gl.uniform1f(u.Seed, j.key.length * 37.1 % 100);
      gl.uniform3f(u.Ink, INK[0], INK[1], INK[2]);
      gl.uniform3f(u.Wet, WET[0], WET[1], WET[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      ctx.clearRect(0, 0, P.dW, P.dH);
      ctx.drawImage(cv, 0, cv.height - P.dH, P.dW, P.dH, 0, 0, P.dW, P.dH);
    };
    const dryNow = (j) => {
      j.state = "dry";
      const paint = () => {
        if (!alive || j.state !== "dry" || !j.prep) return;
        draw(j, 1e4);
        release(j);
      };
      if (ready(j)) paint();
      else void prep(j).then(paint);
    };
    const away = () => {
      const s = stage();
      const W = s?.clientWidth ?? window.innerWidth, H = s?.clientHeight ?? window.innerHeight;
      return [W + 90, H * 0.18];
    };
    const onPath = (j, t) => {
      const P = j.prep, a = P.path, n = a.length / 5;
      const cr = j.canvas.getBoundingClientRect(), sr = stage()?.getBoundingClientRect();
      const ox = cr.left - (sr?.left ?? 0), oy = cr.top - (sr?.top ?? 0);
      if (!n) return [ox, oy, 0, 0];
      let lo = 0, hi = n - 1;
      if (t <= a[2]) return [ox + a[0], oy + a[1], a[3], a[4]];
      if (t >= a[(n - 1) * 5 + 2]) {
        const k2 = (n - 1) * 5;
        return [ox + a[k2], oy + a[k2 + 1], a[k2 + 3], 0];
      }
      while (hi - lo > 1) {
        const m = lo + hi >> 1;
        if (a[m * 5 + 2] <= t) lo = m;
        else hi = m;
      }
      const i = lo * 5, k = hi * 5, f = (t - a[i + 2]) / Math.max(1e-6, a[k + 2] - a[i + 2]);
      return [ox + a[i] + (a[k] - a[i]) * f, oy + a[i + 1] + (a[k + 1] - a[i + 1]) * f, a[i + 3] + (a[k + 3] - a[i + 3]) * f, a[i + 4] + (a[k + 4] - a[i + 4]) * f];
    };
    let wob = 0;
    const pose = (x, y, h, press) => {
      penX = x;
      penY = y;
      penH = h;
      pen()?.set({ x, y, angle: 33 + Math.sin(wob * 1.1) * 1.6 + Math.sin(wob * 2.9 + 1) * 0.5, height: h, press, shown: penShown, scale: penScale });
    };
    const ease = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const next = () => {
      const j = queue.shift();
      if (!j) {
        leg = null;
        if (penShown) leaving = { t: 0, from: [penX, penY, penH] };
        const cb = onQueueDone;
        onQueueDone = null;
        cb?.();
        return;
      }
      if (!ready(j)) {
        leg = { job: j, phase: "wait", t: 0, from: [penX, penY, penH], T: 0 };
        void prep(j).then((P) => {
          if (!alive || leg?.job !== j) return;
          if (!P) {
            j.state = "dry";
            next();
            kick();
            return;
          }
          start(j);
          kick();
        });
        return;
      }
      start(j);
    };
    const start = (j) => {
      j.state = "writing";
      j.clock = 0;
      upload(j);
      draw(j, -1);
      const s0 = onPath(j, 0);
      if (!penShown) penScale = Math.min(1.3, Math.max(0.5, j.em * 86e-4));
      if (!penShown) {
        const [ax, ay] = away();
        penX = ax;
        penY = ay;
        penH = 1;
        penShown = true;
      }
      const d = Math.hypot(s0[0] - penX, s0[1] - penY);
      leg = { job: j, phase: "travel", t: 0, from: [penX, penY, penH], T: 0.26 + 0.24 * Math.min(1, d / 700) };
      leaving = null;
    };
    const frame = (now) => {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(0.05, last ? (now - last) / 1e3 : 0.016) * rate;
      last = now;
      wob += dt;
      if (leg) {
        const j = leg.job;
        leg.t += dt;
        if (leg.phase === "wait") {
        } else if (leg.phase === "travel") {
          const k = Math.min(1, leg.t / leg.T), e = ease(k);
          const [tx, ty] = onPath(j, 0);
          const h = leg.from[2] * (1 - e) + 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * Math.min(1, leg.from[2] + 0.3) * (1 - e);
          pose(leg.from[0] + (tx - leg.from[0]) * e, leg.from[1] + (ty - leg.from[1]) * e, Math.max(0, h * (1 - e * e) + (1 - k) * 0.02), 0);
          if (k >= 1) {
            leg.phase = "write";
            leg.t = 0;
          }
        } else {
          j.clock += dt;
          const [x, y, h, p] = onPath(j, j.clock);
          pose(x, y, h, p);
          if (j.clock >= j.prep.dur) {
            j.state = "drying";
            next();
          }
        }
      } else if (leaving) {
        leaving.t += dt;
        const k = Math.min(1, leaving.t / 0.62), e = ease(k);
        const [ax, ay] = away();
        pose(leaving.from[0] + (ax - leaving.from[0]) * e, leaving.from[1] + (ay - leaving.from[1]) * e, Math.min(1, leaving.from[2] + e * 1.1), 0);
        if (k >= 1) {
          leaving = null;
          penShown = false;
          pose(ax, ay, 1, 0);
        }
      }
      let busy = !!leg || !!leaving;
      for (const j of jobs.values()) {
        if (j.state === "writing") {
          if (leg?.phase === "write" && leg.job === j) draw(j, j.clock);
          busy = true;
        } else if (j.state === "drying") {
          j.clock += dt;
          busy = true;
          if (j.clock > j.prep.dur + 3.2) dryNow(j);
          else if (now - j.lastDraw > 48) {
            draw(j, j.clock);
            j.lastDraw = now;
          }
        }
      }
      if (busy) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const kick = () => {
      if (!raf && alive) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    return {
      /** Adds a line to write. `speed`: ems a second; `maxDur`: the most it may take. */
      add(el, canvas, opts = {}) {
        if (jobs.has(el)) return;
        jobs.set(el, { el, canvas, key: "", prep: null, state: "blank", clock: 0, tex: null, speed: opts.speed ?? 6.5, maxDur: opts.maxDur ?? 2.6, em: 40, ms: 0, pending: null, lastDraw: 0 });
      },
      remove(el) {
        const j = jobs.get(el);
        if (!j) return;
        release(j);
        jobs.delete(el);
        queue = queue.filter((q) => q !== j);
      },
      has: (el) => jobs.has(el),
      state: (el) => jobs.get(el)?.state ?? "blank",
      /** Works a line's strokes out ahead of time; resolves when they're ready. */
      warm(el) {
        const j = jobs.get(el);
        return j && j.state === "blank" ? prep(j) : Promise.resolve();
      },
      /** True when the line's strokes are worked out for its current layout. */
      ready(el) {
        const j = jobs.get(el);
        return !!j && ready(j);
      },
      /** Writes these lines in turn with the pen; `done` once the last is written. */
      write(els, done) {
        const todo = els.map((e) => jobs.get(e)).filter((j) => !!j && j.state === "blank");
        if (!todo.length) {
          done?.();
          return;
        }
        for (const j of todo) j.state = "queued";
        queue.push(...todo);
        const prev = onQueueDone;
        onQueueDone = () => {
          prev?.();
          done?.();
        };
        if (!leg) next();
        kick();
      },
      /** The finished, dry ink at once (the builder's static pages, the gallery card, returning). */
      dry(el) {
        const j = jobs.get(el);
        if (j) dryNow(j);
      },
      /** Everything being written finishes now; the pen lifts away. */
      finish() {
        if (!leg && !queue.length) return;
        for (const j of [...leg ? [leg.job] : [], ...queue]) dryNow(j);
        queue = [];
        if (leg) {
          leg = null;
          leaving = { t: 0, from: [penX, penY, penH] };
        }
        const cb = onQueueDone;
        onQueueDone = null;
        cb?.();
        kick();
      },
      writing: () => !!leg || queue.length > 0,
      /** Whether the strokes are worked out off the page's thread (for checking). */
      offThread: () => !!worker,
      /** Hurries the hand (a tap during the opening). */
      hurry(k = 3) {
        rate = k;
      },
      calm() {
        rate = 1;
      },
      /** The line's size changed: lay it out again (a dry line is redrawn dry). */
      relayout(el) {
        const j = jobs.get(el);
        if (!j) return;
        if (j.state !== "dry") return;
        const m = measure(j.el);
        if (m && m.key !== j.key) dryNow(j);
      },
      gl: !!g,
      /** For checking the hand frame by frame (dev only): holds the clock at `t` seconds into the line. */
      seek(t) {
        rate = 0;
        if (leg && leg.phase !== "wait") {
          if (leg.phase === "travel") {
            leg.phase = "write";
            leg.t = 0;
          }
          leg.job.clock = t;
        }
        kick();
      },
      stats: () => [...jobs.values()].map((j) => ({ text: j.el.textContent, state: j.state, dur: j.prep?.dur, em: j.em, ms: Math.round(j.ms), ready: ready(j), n: j.prep ? j.prep.path.length / 5 : 0 })),
      dispose() {
        alive = false;
        cancelAnimationFrame(raf);
        for (const j of jobs.values()) release(j);
        jobs.clear();
        if (g) g.gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
  }
  var import_meta, worker, seq, waiting, VS, FS, hex;
  var init_ink = __esm({
    "../../../rsvp-studio/src/pages/wedding-sites/templates/inkvows/ink.ts"() {
      init_strokes();
      import_meta = {};
      seq = 0;
      waiting = /* @__PURE__ */ new Map();
      VS = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
      FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uG; uniform sampler2D uT; uniform sampler2D uB;
uniform vec4 uWs; uniform vec2 uTx; uniform vec2 uCss;
uniform float uNow; uniform float uDur; uniform float uSeed;
uniform vec3 uInk; uniform vec3 uWet;
float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fibre(vec2 p){
  float a = vn(mat2(0.8, 0.6, -0.6, 0.8) * p * vec2(0.32, 2.4));
  float b = vn(mat2(0.3, -0.95, 0.95, 0.3) * p * vec2(0.28, 2.1) + 11.0);
  float c = vn(p * 0.8 + 5.0);
  return clamp(0.4 * a + 0.4 * b + 0.2 * c, 0.0, 1.0);
}
void main(){
  vec2 w = vUv * uWs.xy + uWs.zw;
  float g = texture2D(uG, vUv).a;
  vec4 t = texture2D(uT, w);
  float q = floor(t.r * 255.0 + 0.5) * 256.0 + floor(t.g * 255.0 + 0.5);
  if (q > 65100.0) { gl_FragColor = vec4(0.0); return; }
  float dr = t.b * 2.55;
  // the front of the ink is round, like the bead under a nib: its edges arrive a moment later
  float age = uNow - q / 65000.0 * uDur - min(dr, 1.4) * 0.03;
  if (age < -0.015) { gl_FragColor = vec4(0.0); return; }
  float shown = smoothstep(-0.015, 0.015, age);
  float ag = max(age, 0.0);
  float wet = exp(-ag / 0.95);
  float bleed = 1.0 - exp(-ag / 0.55);
  vec2 p = vUv * uCss;
  float b = texture2D(uB, w).r;
  float fib = fibre(p + uSeed);
  // the bleed: as it dries the ink wicks a hair past its edge, along the fibres
  float halo = smoothstep(0.32, 0.62, b) * (1.0 - g) * smoothstep(0.5, 0.85, fib + b * 0.2) * bleed * 0.24;
  float gs = clamp(g * (1.0 + 0.22 * bleed), 0.0, 1.0);
  float a = max(gs, halo);
  // the paper's tooth: thinner ink on its ridges, full in the pools
  float tooth = vn(p * 1.4 + 3.0) * 0.6 + vn(p * 3.1 + 9.0) * 0.4;
  float dens = mix(0.84 + 0.16 * smoothstep(0.2, 0.8, tooth), 1.0, smoothstep(0.55, 0.95, b));
  // dry: darker where it dried at the rims
  float rim = smoothstep(0.3, 0.95, g) * (1.0 - smoothstep(0.4, 0.92, b));
  vec3 dry = uInk * (1.0 - 0.28 * rim) * (0.96 + 0.08 * fib);
  // wet: a glossy bead catching the window
  float bx = texture2D(uB, w + vec2(uTx.x, 0.0)).r - texture2D(uB, w - vec2(uTx.x, 0.0)).r;
  float by = texture2D(uB, w + vec2(0.0, uTx.y)).r - texture2D(uB, w - vec2(0.0, uTx.y)).r;
  vec3 n = normalize(vec3(-bx * 1.7, -by * 1.7, 1.0));
  vec3 H = normalize(normalize(vec3(-0.45, -0.6, 0.66)) + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(n, H), 0.0);
  float spec = pow(nh, 40.0) * 0.42 + pow(nh, 8.0) * 0.03;
  vec3 col = mix(dry, uWet + spec * vec3(0.9, 0.93, 1.0) * smoothstep(0.2, 0.7, b), wet * 0.9);
  float alpha = clamp(a * shown * mix(dens, 1.0, wet * 0.7), 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}`;
      hex = (c) => {
        const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
        const n = m ? parseInt(m[1], 16) : 1777968;
        return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
      };
    }
  });

  // src/ink-entry.ts
  var require_ink_entry = __commonJS({
    "src/ink-entry.ts"() {
      init_ink();
      window.createInker = createInker;
    }
  });
  require_ink_entry();
})();
