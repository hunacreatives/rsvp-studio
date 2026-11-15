// After `vite build`: the app's HTML shell becomes out/app.html, so there's no out/index.html.
// Vercel serves a real file before any rewrite, so with index.html gone, "/" goes through
// vercel.json to api/invite-page.ts (?op=meta&p=/), which sends the shell with the homepage's
// text, canonical and structured data in it (Nov 15 2026: the homepage was an empty shell to
// search and AI crawlers). Everything else that needs the plain shell uses /app.html:
// vercel.json's catch-all and api/invite-page.ts.
import { existsSync, renameSync } from "node:fs";

const from = new URL("../out/index.html", import.meta.url);
const to = new URL("../out/app.html", import.meta.url);
if (!existsSync(from)) throw new Error("out/index.html not found: run vite build first");
renameSync(from, to);
console.log("app shell: out/index.html → out/app.html");
