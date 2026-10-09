#!/usr/bin/env node
// Fidelity harness: import each test design through the real Import page,
// render the result at the design's width, compare it with the original,
// run phone checks, and write a side-by-side report.
//
//   npm run fidelity                      all cases, saved AI answers (free)
//   npm run fidelity -- --case redblack   one case
//   npm run fidelity -- --refresh-ai      record new AI answers (costs a few cents each)
//   npm run fidelity -- --update-baseline accept today's scores as the baseline
//
// Needs the dev server (npm run dev or npm run dev:staging) on :3001.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { openBrowser, sleep } from "./cdp.mjs";
import { decodePng, scoreCase } from "./score.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const HERE = `${ROOT}scripts/fidelity/`;
const args = process.argv.slice(2);
const only = args.includes("--case") ? args[args.indexOf("--case") + 1] : null;
const refresh = args.includes("--refresh-ai");
const updateBaseline = args.includes("--update-baseline");
const APP = process.env.FIDELITY_APP ?? "http://localhost:3001";
const RELAY_PORT = 9353;

const corpus = JSON.parse(readFileSync(`${HERE}corpus.json`, "utf8")).cases.filter((c) => !only || c.id === only);
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = `${ROOT}fidelity-report/${stamp}/`;
mkdirSync(outDir, { recursive: true });

try {
  await fetch(APP);
} catch {
  console.error(`No dev server at ${APP}. Start it with: npm run dev   (or npm run dev:staging)`);
  process.exit(2);
}

const relay = spawn("npx", ["tsx", `${HERE}relay.mts`, `--port=${RELAY_PORT}`, ...(refresh ? ["--refresh-ai"] : [])], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
relay.stdout.on("data", (d) => process.stdout.write(String(d)));
relay.stderr.on("data", (d) => { const t = String(d); if (!/deprecat/i.test(t)) process.stderr.write(t); });
for (let i = 0; i < 40; i++) {
  await sleep(250);
  try {
    await fetch(`http://localhost:${RELAY_PORT}/`, { method: "OPTIONS" });
    break;
  } catch {}
}

const browser = await openBrowser({ width: 1440, height: 1000 });
const results = [];

// Phone checks, run in the page against the mounted template at 390px.
const PHONE_CHECKS = `(() => {
  const root = document.getElementById("fidelity-root");
  const issues = [];
  const W = root.getBoundingClientRect().width;
  if (root.scrollWidth > W + 1) issues.push({ level: "fail", check: "overflow", detail: "page scrolls sideways (" + root.scrollWidth + "px > " + W + "px)" });
  let small = 0, tiny = 0;
  for (const el of root.querySelectorAll("p, span, h1, h2, h3, h4, a, label, li, button")) {
    if (!el.textContent.trim() || el.children.length && [...el.childNodes].every(n => n.nodeType !== 3)) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) tiny++; else if (fs < 14) small++;
  }
  if (tiny) issues.push({ level: "fail", check: "text size", detail: tiny + " text elements under 12px" });
  if (small) issues.push({ level: "warn", check: "text size", detail: small + " text elements under 14px" });
  let tapBad = 0, tapSmall = 0;
  for (const el of root.querySelectorAll("a, button, input, select, textarea, [role=button]")) {
    const r = el.getBoundingClientRect(); if (!r.width) continue;
    // Hidden spam traps, and links inside a sentence (WCAG 2.5.8 inline exception), don't count.
    if (el.getAttribute("aria-hidden") === "true" || el.tabIndex === -1) continue;
    if (el.tagName === "A" && [...el.parentElement.childNodes].some(n => n !== el && n.nodeType === 3 && n.textContent.trim())) continue;
    if (r.width < 24 || r.height < 24) tapBad++; else if (r.width < 44 || r.height < 44) tapSmall++;
  }
  if (tapBad) issues.push({ level: "fail", check: "tap targets", detail: tapBad + " under 24×24px" });
  if (tapSmall) issues.push({ level: "warn", check: "tap targets", detail: tapSmall + " under 44×44px" });
  let stretched = 0;
  for (const img of root.querySelectorAll("img")) {
    const fit = getComputedStyle(img).objectFit; if (fit === "cover" || fit === "contain" || !img.naturalWidth) continue;
    const r = img.getBoundingClientRect(); if (!r.width) continue;
    if (Math.abs((r.width / r.height) / (img.naturalWidth / img.naturalHeight) - 1) > 0.02) stretched++;
  }
  if (stretched) issues.push({ level: "fail", check: "images", detail: stretched + " images stretched" });
  const tops = [...root.querySelectorAll("[data-spec-root] > section, [data-spec-root] > footer, [data-spec-root] > div")].map(s => s.getBoundingClientRect().top);
  if (tops.some((t, i) => i && t < tops[i - 1] - 4)) issues.push({ level: "fail", check: "section order", detail: "sections overlap or are out of order" });
  if (!root.querySelector('form button[type="submit"]')) issues.push({ level: "warn", check: "rsvp", detail: "no working RSVP form on the page" });
  return JSON.stringify(issues);
})()`;

for (const c of corpus) {
  const file = c.file.replace(/^~/, homedir());
  console.log(`\n▶ ${c.id} — ${c.name}`);
  if (!existsSync(file)) {
    console.log(`  skipped: file not found (${file})`);
    results.push({ id: c.id, name: c.name, error: "file not found" });
    continue;
  }
  const sha = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8);
  const t0 = Date.now();
  try {
    const { send, ev, viewport, screenshot } = browser;
    await viewport(1440, 1000);
    const script = await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `const _f = window.fetch; window.fetch = (u, o) => String(u).includes("/api/template-ai") ? _f("http://localhost:${RELAY_PORT}/?case=${c.id}&sha=${sha}", o) : _f(u, o);`,
    });
    await send("Page.navigate", { url: `${APP}/studio/templates/import?demo` });
    await sleep(3500);
    await ev(`(() => { const i = document.querySelector('input[placeholder="e.g. Garden Arch"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, ${JSON.stringify(`${c.name} (fidelity)`)}); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    const doc = await send("DOM.getDocument", { depth: -1 });
    const inputs = await send("DOM.querySelectorAll", { nodeId: doc.result.root.nodeId, selector: 'input[type="file"]' });
    await send("DOM.setFileInputFiles", { nodeId: inputs.result.nodeIds[0], files: [file] });
    // Two-version designs: the phone SVG goes in the second drop zone.
    if (c.mobileFile) await send("DOM.setFileInputFiles", { nodeId: inputs.result.nodeIds[1], files: [c.mobileFile.replace(/^~/, homedir())] });
    await sleep(300);
    await ev(`[...document.querySelectorAll("button")].find(x => x.textContent.includes("Analyse design")).click()`);
    let ready = false, err = "";
    for (let i = 0; i < 300 && !ready; i++) {
      await sleep(1000);
      ready = await ev(`!!window.__fidelity?.ready`);
      if (!ready) err = (await ev(`[...document.querySelectorAll("p")].map(p => p.textContent).find(t => /fail|error|couldn|isn.t|No saved|not defined|undefined|null/i.test(t)) ?? ""`)) || "";
      if (err && /No saved AI answer|failed|Couldn|not defined|undefined|null|TypeError/i.test(err)) break;
    }
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: script.result.identifier });
    if (!ready) throw new Error(err || "import didn't finish in time");
    await sleep(3500); // let the review screen score itself

    // Every step after the import gets a time limit and a name, so a stall says where.
    const step = (name, p, ms = 90000) => Promise.race([p, sleep(ms).then(() => { throw new Error(`step "${name}" timed out after ${ms / 1000}s`); })]);
    const info = await step("read import info", ev(`JSON.stringify(window.__fidelity.info())`)).then(JSON.parse);
    const W = Math.round(info.designWidth);
    const refPng = Buffer.from((await step("render original", ev(`window.__fidelity.reference(${W})`))).split(",")[1], "base64");
    await viewport(Math.max(W, 1440), 1000);
    await ev(`window.scrollTo(0, 0)`);
    const h = Math.round(await step("render template", ev(`window.__fidelity.mount(${W})`)));
    const renderPng = await step("screenshot template", screenshot({ x: 0, y: 0, width: W, height: Math.min(h, 16000) }));
    const scored = scoreCase({ ref: decodePng(refPng), cand: decodePng(renderPng), sections: info.sections, sources: info.sources, photos: info.photos });

    // The phone version, against the phone design (two-version designs only).
    let phoneScored = null;
    if (info.phone) {
      const PW = Math.round(info.phone.designWidth);
      const pRef = Buffer.from((await step("render phone original", ev(`window.__fidelity.reference(${PW}, "phone")`))).split(",")[1], "base64");
      await viewport(PW, 1000);
      await ev(`window.scrollTo(0, 0)`);
      const pH = Math.round(await step("render phone version", ev(`window.__fidelity.mount(${PW}, { which: "phone" })`)));
      const pPng = await step("screenshot phone version", screenshot({ x: 0, y: 0, width: PW, height: Math.min(pH, 16000) }));
      phoneScored = scoreCase({ ref: decodePng(pRef), cand: decodePng(pPng), sections: info.phone.sections, sources: info.phone.sources, photos: info.phone.photos });
      writeFileSync(`${outDir}${c.id}-phone-ref.png`, pRef);
      writeFileSync(`${outDir}${c.id}-phone-render.png`, pPng);
      writeFileSync(`${outDir}${c.id}-phone-diff.png`, phoneScored.diffPng);
    }

    await viewport(390, 844);
    await ev(`window.scrollTo(0, 0)`);
    const ph = Math.round(await step("render phone", ev(`window.__fidelity.mount(390, { full: true })`)));
    const phone = JSON.parse(await step("phone checks", ev(PHONE_CHECKS)));
    const phonePng = await step("screenshot phone", screenshot({ x: 0, y: 0, width: 390, height: Math.min(ph, 9000) }));
    await ev(`window.__fidelity.unmount()`);

    writeFileSync(`${outDir}${c.id}-ref.png`, refPng);
    writeFileSync(`${outDir}${c.id}-render.png`, renderPng);
    writeFileSync(`${outDir}${c.id}-diff.png`, scored.diffPng);
    writeFileSync(`${outDir}${c.id}-phone.png`, phonePng);
    const r = {
      id: c.id,
      name: c.name,
      kind: c.kind,
      seconds: Math.round((Date.now() - t0) / 1000),
      designWidth: W,
      // Two versions: the page score covers both halves equally.
      page: phoneScored ? Math.round((scored.page + phoneScored.page) / 2) : scored.page,
      ...(phoneScored ? { desktopPage: scored.page, phonePage: phoneScored.page, phoneSections: phoneScored.sections, phoneHeightDrift: phoneScored.heightDrift } : {}),
      heightDrift: scored.heightDrift,
      sections: scored.sections,
      appScore: info.score,
      textLayers: info.textLayers,
      photos: info.photos.length,
      phone,
      notes: info.notes,
    };
    results.push(r);
    if (phoneScored) console.log(`  desktop ${r.desktopPage}/100 · phone version ${r.phonePage}/100`);
    console.log(`  page ${r.page}/100 · ${r.sections.length} sections · ${r.textLayers} text layers · ${r.photos} photo slots · phone: ${phone.filter((p) => p.level === "fail").length} fail, ${phone.filter((p) => p.level === "warn").length} warn · ${r.seconds}s`);
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    results.push({ id: c.id, name: c.name, error: e.message });
  }
}
browser.close();
relay.kill();

// Baseline + history
const basePath = `${HERE}baseline.json`;
const baseline = existsSync(basePath) ? JSON.parse(readFileSync(basePath, "utf8")) : {};
let regressions = 0;
for (const r of results) {
  if (r.error || baseline[r.id] === undefined) continue;
  r.baseline = baseline[r.id];
  if (r.page < baseline[r.id] - 3) (regressions++, console.log(`  ⚠ ${r.id} dropped ${baseline[r.id]} → ${r.page}`));
}
if (updateBaseline) {
  for (const r of results) if (!r.error) baseline[r.id] = r.page;
  writeFileSync(basePath, JSON.stringify(baseline, null, 2) + "\n");
  console.log("Baseline updated.");
}
let git = "";
try {
  git = (await new Promise((res) => { const p = spawn("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT }); let o = ""; p.stdout.on("data", (d) => (o += d)); p.on("close", () => res(o.trim())); }));
} catch {}
for (const r of results) appendFileSync(`${HERE}history.jsonl`, JSON.stringify({ at: stamp, git, id: r.id, page: r.page ?? null, error: r.error ?? null }) + "\n");
writeFileSync(`${outDir}results.json`, JSON.stringify(results, null, 2));
writeFileSync(`${outDir}index.html`, report(results, stamp));
writeFileSync(`${ROOT}fidelity-report/latest.html`, `<meta http-equiv="refresh" content="0; url=${stamp}/index.html">`);
console.log(`\nReport: ${outDir}index.html`);
process.exit(regressions ? 1 : 0);

function report(rows, at) {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const tone = (v) => (v >= 90 ? "#2f7a1f" : v >= 75 ? "#9a6a00" : "#c2412d");
  const cards = rows
    .map((r) =>
      r.error
        ? `<section><h2>${esc(r.name)}</h2><p class="err">${esc(r.error)}</p></section>`
        : `<section>
  <h2>${esc(r.name)} <span class="score" style="color:${tone(r.page)}">${r.page}</span>${r.baseline !== undefined ? `<small> (baseline ${r.baseline})</small>` : ""}</h2>
  <p class="meta">${r.designWidth}px wide · ${r.textLayers} text layers · ${r.photos} photo slots · height drift ${(r.heightDrift * 100).toFixed(1)}% · ${r.seconds}s${r.appScore?.total !== undefined ? ` · review-screen score ${r.appScore.total}%` : ""}</p>
  <table><tr><th>Section</th><th>Score</th><th>Text</th><th>Art</th><th>Photos</th><th>SSIM</th></tr>
  ${r.sections.map((s) => `<tr><td>${esc(s.key ?? s.id)}</td><td style="color:${tone(s.score)}"><b>${s.score}</b></td><td>${s.text ? `${s.text.score} <small>(${s.text.diffPct}% px)</small>` : "—"}</td><td>${s.art ? `${s.art.score} <small>(${s.art.diffPct}%)</small>` : "—"}</td><td>${s.photo ? `${s.photo.score} <small>(${s.photo.diffPct}%)</small>` : "—"}</td><td>${s.ssim ?? "—"}</td></tr>`).join("")}
  </table>
  ${r.phonePage !== undefined ? `<p class="meta">Two versions: desktop <b>${r.desktopPage}</b> · phone version <b>${r.phonePage}</b> (height drift ${(r.phoneHeightDrift * 100).toFixed(1)}%)</p>
  <div class="imgs"><figure><img src="${r.id}-phone-ref.png"><figcaption>Phone design</figcaption></figure><figure><img src="${r.id}-phone-render.png"><figcaption>Our phone version</figcaption></figure><figure><img src="${r.id}-phone-diff.png"><figcaption>Differences</figcaption></figure></div>` : ""}
  <p class="meta">Phone (390px): ${r.phone.length ? r.phone.map((p) => `<span class="${p.level}">${esc(p.check)}: ${esc(p.detail)}</span>`).join(" · ") : '<span class="ok">all checks pass</span>'}</p>
  <div class="imgs">
    <figure><img src="${r.id}-ref.png"><figcaption>Original</figcaption></figure>
    <figure><img src="${r.id}-render.png"><figcaption>Our template</figcaption></figure>
    <figure><img src="${r.id}-diff.png"><figcaption>Differences (pink)</figcaption></figure>
    <figure class="phone"><img src="${r.id}-phone.png"><figcaption>Phone</figcaption></figure>
  </div>
</section>`,
    )
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fidelity report ${at}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#f6f5f1;color:#1d1d24}h1{font-size:22px}section{background:#fff;border:1px solid #e3e0d8;border-radius:16px;padding:20px;margin:0 0 24px}h2{margin:0 0 4px;font-size:18px}.score{font-size:26px;margin-left:8px}.meta{color:#6b6b78;margin:4px 0 10px}table{border-collapse:collapse;margin:8px 0}th,td{padding:4px 12px 4px 0;text-align:left;border-bottom:1px solid #eee}th{color:#6b6b78;font-weight:500}.imgs{display:grid;grid-template-columns:repeat(3,1fr) 0.45fr;gap:12px;align-items:start}figure{margin:0}img{width:100%;border:1px solid #eee;border-radius:6px}figcaption{color:#6b6b78;font-size:12px;margin-top:4px}.fail{color:#c2412d}.warn{color:#9a6a00}.ok{color:#2f7a1f}.err{color:#c2412d}</style>
<h1>Fidelity report <small style="color:#6b6b78;font-weight:400">${at}</small></h1>
${cards}`;
}
