/* global process, URL, Buffer, console, document, scrollX, scrollY -- Node, plus the page code run in Chrome */
// Gallery card stills for the code templates (TemplateDefinition.cardImage).
//
// Each card on /build and the account picker used to render its template live, which made
// a page of ten cards heavy (every template's photos, fonts and animations at once). The
// cards now show a still of each design's first screen, rendered exactly as the live card
// did: the template with its own sample content, the `gallery` flag on, at its
// galleryWidth, cropped to the card's 4:3 frame.
//
// Run it with the dev server up (npm run dev), after changing a template's first screen:
//   npm i --no-save playwright@1.49.1      (once; nothing is added to package.json)
//   node scripts/template-cards.mjs         (all of them)
//   node scripts/template-cards.mjs capiz   (just one)
// Uses your installed Chrome. Writes public/event-templates/cards/<id>.webp (960×720).

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5173";
const ALL = ["editorial-formal", "modern-minimal", "scrapbook", "cinematic", "pickleball", "open-play", "debut", "love-letter", "capiz", "promenade", "calado", "under-glass", "tinghun-rice", "tinghun-lacquer", "tinghun-porcelain", "debut-issue", "riviera", "poolside", "freedive"];
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const OUT = process.env.OUT_DIR ? new URL(`file://${process.env.OUT_DIR.replace(/\/?$/, "/")}`) : new URL("../public/event-templates/cards/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const url = (id, width) => `${BASE}/internal/event-site-preview?template=${id}&fixture=demo&gallery=1${width ? `&width=${width}` : ""}`;
const browser = await chromium.launch({ channel: "chrome" });
for (const id of ids) {
  // Find the template's galleryWidth, then lay it out at exactly that width.
  const probe = await browser.newPage();
  await probe.goto(url(id), { waitUntil: "networkidle" });
  const width = Number(await probe.getAttribute("[data-harness-render]", "data-gallery-width")) || 1100;
  await probe.close();

  const page = await browser.newPage({ viewport: { width, height: Math.round(width * 0.75) + 200 } });
  await page.goto(url(id, width), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500); // entrance animations settle
  const box = await page.evaluate(() => {
    const r = document.querySelector("[data-harness-render]").getBoundingClientRect();
    // Whole pixels, a little inside the top edge: a fraction above it would catch a line of
    // the harness bar above the render (a faint dark line along the top of the card).
    return { x: Math.round(r.left + scrollX), y: Math.ceil(r.top + scrollY) + 2 };
  });
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "webp",
    quality: 82,
    captureBeyondViewport: true,
    clip: { x: box.x, y: box.y, width, height: Math.round(width * 0.75), scale: 960 / width },
  });
  writeFileSync(new URL(`${id}.webp`, OUT), Buffer.from(data, "base64"));
  console.log(`${id}: ${width}px → cards/${id}.webp (${Math.round(Buffer.from(data, "base64").length / 1024)} KB)`);
  await page.close();
}
await browser.close();
