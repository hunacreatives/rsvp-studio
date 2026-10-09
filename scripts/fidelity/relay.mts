// AI relay for the fidelity harness: the Import page's AI request goes here
// instead of /api/template-ai (no staff login needed in headless Chrome).
// Answers are cached per design + prompt version, so runs are free and
// repeatable. A cache miss only calls Claude with --refresh-ai.
import http from "node:http";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url).pathname;
for (const line of readFileSync(`${ROOT}.env.local`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"(.*)"$/, "$1");
}
const refresh = process.argv.includes("--refresh-ai");
const port = Number(process.argv.find((a) => a.startsWith("--port="))?.slice(7) ?? 9353);
const promptVer = createHash("sha256").update(readFileSync(`${ROOT}api/template-ai.ts`)).digest("hex").slice(0, 8);
const { analyseDesign } = await import(`${ROOT}api/template-ai.ts`);

http
  .createServer(async (q, r) => {
    r.setHeader("access-control-allow-origin", "*");
    r.setHeader("access-control-allow-headers", "*");
    if (q.method === "OPTIONS") return r.end();
    const u = new URL(q.url ?? "/", "http://x");
    const id = u.searchParams.get("case") ?? "unknown";
    const sha = u.searchParams.get("sha") ?? "nosha";
    let raw = "";
    for await (const c of q) raw += c;
    const body = JSON.parse(raw || "{}");
    // What the importer measured; if it changes, the cached answer may not line up.
    const boxesSig = createHash("sha256").update(JSON.stringify(body.boxes ?? [])).digest("hex").slice(0, 8);
    // A two-version design asks twice (desktop, then phone): separate answers.
    const which = /PHONE version/.test(body.hint ?? "") ? ".phone" : "";
    const file = `${ROOT}scripts/fidelity/ai-cache/${id}${which}.${sha}.${promptVer}.json`;
    r.setHeader("content-type", "application/json");
    if (existsSync(file) && !refresh) {
      const cached = JSON.parse(readFileSync(file, "utf8"));
      if (cached.boxesSig !== boxesSig) console.warn(`[relay] ${id}: detection changed since this AI answer was recorded — rerun with --refresh-ai`);
      return r.end(JSON.stringify({ result: cached.result, usage: cached.usage, cached: true, stale: cached.boxesSig !== boxesSig }));
    }
    if (!refresh) {
      r.statusCode = 424;
      return r.end(JSON.stringify({ error: `No saved AI answer for ${id} (prompt ${promptVer}). Run with --refresh-ai to record one.` }));
    }
    const t0 = Date.now();
    console.log(`[relay] ${id}${which}: asking Claude…`);
    let out;
    try {
      out = await analyseDesign(body);
    } catch (e) {
      console.error(`[relay] ${id}: AI call threw`, e);
      r.statusCode = 500;
      return r.end(JSON.stringify({ error: `AI call failed: ${e}` }));
    }
    if ("error" in out) console.error(`[relay] ${id}: AI error ${out.status}`, out.error);
    if ("error" in out) {
      r.statusCode = out.status;
      return r.end(JSON.stringify({ error: out.error }));
    }
    writeFileSync(file, JSON.stringify({ case: id, sha, promptVer, boxesSig, recordedAt: new Date().toISOString(), seconds: (Date.now() - t0) / 1000, usage: out.usage, result: out.result }, null, 1));
    console.log(`[relay] ${id}${which}: recorded AI answer in ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(out.usage));
    r.end(JSON.stringify(out));
  })
  .listen(port, () => console.log(`[relay] listening on ${port} (prompt ${promptVer}${refresh ? ", refresh" : ", cache only"})`));
