#!/usr/bin/env node
// Saves what the importer measures for each corpus design (elements, text
// lines, pictures, section cuts) as JSON in scripts/fidelity/snapshots/, so
// layout code can be developed and unit-tested without a browser.
//
//   node scripts/fidelity/snapshot.mjs            all cases
//   node scripts/fidelity/snapshot.mjs redblack   one case
//
// Needs the dev server on :3001.
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { openBrowser, sleep } from "./cdp.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const HERE = `${ROOT}scripts/fidelity/`;
const only = process.argv[2];
const APP = process.env.FIDELITY_APP ?? "http://localhost:3001";
const cases = JSON.parse(readFileSync(`${HERE}corpus.json`, "utf8")).cases.filter((c) => !only || c.id === only);
mkdirSync(`${HERE}snapshots`, { recursive: true });

let current = "";
const server = createServer((q, r) => {
  r.setHeader("access-control-allow-origin", "*");
  r.setHeader("content-type", "image/svg+xml");
  r.end(readFileSync(current));
}).listen(9372);

const browser = await openBrowser({ port: 9373 });
await browser.send("Page.navigate", { url: `${APP}/build` });
await sleep(2500);
for (const c of cases) {
  current = c.file.replace(/^~/, homedir());
  if (!existsSync(current)) {
    console.log(`${c.id}: file not found`);
    continue;
  }
  const json = await browser.ev(`(async () => {
    const m = await import("/src/pages/studio/templates/importer/svg.ts");
    const blob = await (await fetch("http://localhost:9372/?" + Date.now())).blob();
    const a = await m.analyseSvg(new File([blob], "d.svg"));
    const r4 = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "number" ? +v.toFixed(5) : v)));
    return JSON.stringify(r4({
      width: a.width, height: a.height, cuts: a.cuts,
      leaves: a.leaves,
      candidates: a.candidates,
      pictures: a.pictures.map(({ src, ...p }) => p),
    }));
  })()`);
  writeFileSync(`${HERE}snapshots/${c.id}.json`, json);
  const d = JSON.parse(json);
  console.log(`${c.id}: ${d.leaves.length} elements, ${d.candidates.length} text lines, ${d.pictures.length} pictures, ${d.cuts.length} cuts → snapshots/${c.id}.json (${Math.round(json.length / 1024)} KB)`);
}
browser.close();
server.close();
