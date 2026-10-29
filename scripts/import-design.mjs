/* global process, console */
// Adds a design made in RSVP Template Studio (a .rsvpdesign file) to the site:
//   node scripts/import-design.mjs ~/Downloads/garden-party.rsvpdesign [--force]
//  - copies its files (templates/<id>/, its sample content, its art in public/event-templates/<id>/)
//  - registers it: registry.ts, palettes.ts, fontPairings.ts, loadFonts.ts, the card script
//  - writes supabase/<id>-template.sql (run on live before pushing, as always)
//  - keeps the designer's SVGs and brief in design-sources/<id>/ (not committed)
// Then: npm run dev, check it, make its gallery card (node scripts/template-cards.mjs <id>).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [file, ...flags] = process.argv.slice(2);
const force = flags.includes("--force");
if (!file || !existsSync(file)) { console.error("Usage: node scripts/import-design.mjs <file.rsvpdesign> [--force]"); process.exit(1); }
const ROOT = resolve(new URL("..", import.meta.url).pathname);
const tmp = mkdtempSync(join(tmpdir(), "rsvpdesign-"));
execFileSync("unzip", ["-q", file, "-d", tmp]);

const meta = JSON.parse(readFileSync(join(tmp, "design.json"), "utf8"));
const id = meta.id;
if (!/^[a-z][a-z0-9-]{1,40}$/.test(id || "")) throw new Error(`Bad design id "${id}"`);
const manifest = JSON.parse(readFileSync(join(tmp, "code/src/pages/wedding-sites/templates", id, "design.json"), "utf8"));
const tplDir = join(ROOT, "src/pages/wedding-sites/templates", id);
if (existsSync(tplDir) && !force) throw new Error(`A design called "${id}" is already in the site. Use --force to replace it.`);

// only the design's own paths, never anything else
const allowed = [`src/pages/wedding-sites/templates/${id}/`, `src/pages/wedding-sites/content/fixtures/${id}-demo.ts`, `public/event-templates/${id}/`];
const walk = (d, r = "") => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name), `${r}${e.name}/`) : [`${r}${e.name}`]));
const files = walk(join(tmp, "code"));
const stray = files.filter((f) => !allowed.some((a) => f === a || f.startsWith(a)));
if (stray.length) throw new Error(`The file has paths outside the design's folders: ${stray.join(", ")}`);
if (force) for (const a of allowed) rmSync(join(ROOT, a), { recursive: true, force: true });
for (const f of files) { mkdirSync(join(ROOT, f, ".."), { recursive: true }); cpSync(join(tmp, "code", f), join(ROOT, f)); }

// registrations, in the site's own style (no-ops if already there)
const edit = (rel, fn) => { const p = join(ROOT, rel); const s = readFileSync(p, "utf8"); const n = fn(s); if (n !== s) writeFileSync(p, n); };
const q = (v) => JSON.stringify(String(v));
const before = (s, start, closer, text) => { const i = s.search(start); const j = s.indexOf(closer, i); if (i < 0 || j < 0) throw new Error(`couldn't find ${start}`); return s.slice(0, j) + text + s.slice(j); };
edit("src/pages/wedding-sites/engine/registry.ts", (s) => {
  if (s.includes(`from "../templates/${id}"`)) return s;
  const imports = [...s.matchAll(/^import .* from "\.\.\/templates\/[^"]+";$/gm)];
  const last = imports[imports.length - 1];
  const at = last.index + last[0].length;
  s = s.slice(0, at) + `\nimport { ${manifest.componentExport} } from "../templates/${id}";` + s.slice(at);
  return before(s, /export const templateRegistry[^=]*= \{/, "\n};", `\n  ${/^[a-z]+$/.test(id) ? id : q(id)}: ${manifest.componentExport},`);
});
edit("src/pages/wedding-sites/presentation/palettes.ts", (s) => (s.includes(`id: ${q(id)}`) ? s : before(s, /export const palettes[^=]*= \[/, "\n];", `\n  {\n    // ${meta.label} (made in RSVP Template Studio).\n    id: ${q(id)},\n    label: ${q(manifest.palette.label)},\n    swatches: [${manifest.palette.swatches.map(q).join(", ")}],\n  },`)));
edit("src/pages/wedding-sites/presentation/fontPairings.ts", (s) => (s.includes(`id: ${q(id)}`) ? s : before(s, /export const fontPairings[^=]*= \[/, "\n];", `\n  {\n    // ${meta.label} (made in RSVP Template Studio).\n    id: ${q(id)},\n    label: ${q(manifest.fonts.label)},\n    displayFont: ${q(manifest.fonts.display)},\n    bodyFont: ${q(manifest.fonts.body)},\n  },`)));
edit("src/pages/wedding-sites/presentation/loadFonts.ts", (s) => (s.includes(`  ${q(id)}: [`) ? s : before(s, /const EXTRA[^=]*= \{/, "\n};", `\n  ${q(id)}: [${manifest.fonts.google.map(q).join(", ")}],`)));
edit("scripts/template-cards.mjs", (s) => (s.includes(`"${id}"`) ? s : s.replace(/(const ALL = \[[^\]]*)\]/, `$1, "${id}"]`)));

// the catalog row: listed last
const sorts = readdirSync(join(ROOT, "supabase")).filter((f) => f.endsWith(".sql")).flatMap((f) => [...readFileSync(join(ROOT, "supabase", f), "utf8").matchAll(/'(?:free|premium)', 'listed', '\{[^}]*\}', (\d+)\)/g)].map((m) => Number(m[1])));
const sort = (sorts.length ? Math.max(...sorts) : 0) + 1;
const types = (manifest.eventTypes || meta.eventTypes || ["other"]).join(",");
writeFileSync(join(ROOT, "supabase", `${id}-template.sql`), `-- RSVP Studio — ${meta.label} (made in RSVP Template Studio, imported ${new Date().toISOString().slice(0, 10)}). ADDITIVE, safe to re-run.
-- Run on LIVE (ubonzkfflxqwcwlbemmy) before pushing.
insert into templates (id, label, kind, tier, status, event_types, sort) values
  (${`'${id}'`}, ${`'${String(meta.label).replace(/'/g, "''")}'`}, 'code', '${manifest.tier}', 'listed', '{${types}}', ${sort})
on conflict (id) do update set label = excluded.label, tier = excluded.tier, status = 'listed', event_types = excluded.event_types, updated_at = now();

-- Check: expect one listed row.
select id, label, tier, status, event_types, sort from templates where id = '${id}';
`);

// the designer's sources, kept out of git
const keep = join(ROOT, "design-sources", id);
mkdirSync(keep, { recursive: true });
cpSync(join(tmp, "source"), keep, { recursive: true });
writeFileSync(join(keep, "brief.json"), JSON.stringify(meta, null, 2));
rmSync(tmp, { recursive: true, force: true });

console.log(`Imported "${meta.label}" (${id}): ${files.length} files, sort ${sort}.`);
console.log(`Next: npx tsc --noEmit -p tsconfig.app.json, check it on npm run dev, node scripts/template-cards.mjs ${id}, then run supabase/${id}-template.sql on live.`);
