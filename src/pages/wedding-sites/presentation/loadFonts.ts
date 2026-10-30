// Only Lora and Inter come with every page (index.html) — they're the site's own
// fonts. Each event-site font pairing fetches its other fonts from Google Fonts the
// first time it's shown, so marketing pages don't download script fonts they never use.

const CORMORANT = "Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500";
const DANCING = "Dancing+Script:wght@500;600;700";
const EXTRA: Record<string, string[]> = {
  "playfair-source-sans": ["Playfair+Display:ital,wght@0,400;0,600;0,700;1,400", "Source+Sans+3:wght@400;600;700"],
  "cormorant-work-sans": [CORMORANT, "Work+Sans:wght@400;500;600;700"],
  "dancing-cormorant": [DANCING, CORMORANT],
  "dancing-inter": [DANCING],
  "homemade-caveat": ["Homemade+Apple", "Caveat:wght@400;500;600;700", "Montserrat:wght@400;500;600"],
  "vibes-montserrat": ["Great+Vibes", "Playfair+Display:ital,wght@0,500;0,600;1,500", "Montserrat:wght@400;500;600"],
  "pinyon-cormorant": ["Pinyon+Script", CORMORANT, "Cinzel:wght@400;500;600"],
  "bodoni-garamond": ["Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700", "EB+Garamond:ital,wght@0,400..600;1,400..600", "Caveat:wght@500;600", "Courier+Prime"],
  "pinyon-garamond": ["Pinyon+Script", "EB+Garamond:ital,wght@0,400..600;1,400..600"],
  "bodoni-newsreader": ["Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700", "Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600"],
  "barlow-condensed": ["Barlow+Condensed:wght@600;700;800", "Barlow:wght@400;500;600;700", "IBM+Plex+Mono:wght@500;600"],
  "wenkai-lora": ["LXGW+WenKai+TC:wght@400;700"],
  "chiron-cormorant": [CORMORANT, "Chiron+Sung+HK:wght@400;600;700"],
  "cactus-cormorant": [CORMORANT, "Cactus+Classical+Serif"],
  "instrument-manrope": ["Instrument+Serif:ital@0;1", "Manrope:wght@400;500;600"],
  "cormorant-manrope": [CORMORANT, "Manrope:wght@400;500;600"],
  "chakra-manrope": ["Chakra+Petch:ital,wght@0,500;0,600;0,700;1,700", "Manrope:wght@400;500;600;700"],
  "pressstart-pixelify": ["Press+Start+2P", "Pixelify+Sans:wght@400;500;600;700"],
  "archivo-inter": ["Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900"],
  "castoro-titling": ["Castoro+Titling", "Castoro:ital@0;1"],
  "pinyon-newsreader": ["Pinyon+Script", "Newsreader:ital,wght@0,400;0,500;1,400"],
  "bricolage-dmsans": ["Bricolage+Grotesque:opsz,wght@12..96,500..800", "DM+Sans:opsz,wght@9..40,400..700"],
  caslon: ["Libre+Caslon+Display", "Libre+Caslon+Text:ital,wght@0,400;0,700;1,400", "Mrs+Saint+Delafield"],
  "fraunces-nunito": ["Fraunces:ital,opsz,wght,SOFT@0,9..144,400..700,0..100;1,9..144,400..700,0..100", "Nunito+Sans:wght@400;600;700;800"],
  "dmserif-jost": ["DM+Serif+Display:ital@0;1", "Jost:wght@400;500;600"],
  "yellowtail-jost": ["Yellowtail", "Jost:wght@400;500;600;700", "Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,800;1,9..144,700;1,9..144,800"],
};
const loaded = new Set<string>();

export function loadPairingFonts(pairingId: string | undefined) {
  const families = pairingId ? EXTRA[pairingId] : undefined;
  if (!families || loaded.has(pairingId!) || typeof document === "undefined") return;
  loaded.add(pairingId!);
  fetchFamilies(families);
}

const css2 = (families: string[], extra = "") => `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}${extra}&display=swap`;
function fetchFamilies(families: string[]) {
  const cjk = families.filter((f) => SUBSET.test(f)), rest = families.filter((f) => !SUBSET.test(f));
  if (rest.length) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = css2(rest);
    document.head.appendChild(link);
  }
  if (cjk.length) subset(cjk);
}

/*
 * The Chinese fonts, by the characters on the page. Google serves CJK families in unicode-range
 * slices of ~50–100 KB, and even a few dozen characters touch dozens of them in every weight
 * (Tinghun Lacquer's sample: ~1.5–2.4 MB). So these are fetched as one small font per weight
 * made of exactly the characters the page shows (Google's `text=`): its text nodes and
 * placeholders, plus every ASCII character. When new characters appear (a host typing in the
 * builder, a section shown) the subset is fetched again with them; until it lands, a new
 * character shows in the next font in the stack (Songti / PMingLiU on the phone). A page with
 * more characters than fit a request gets the whole families, sliced as before.
 */
const SUBSET = /^(Chiron\+Sung\+HK|Noto\+Serif\+(TC|SC)|LXGW\+WenKai\+TC|Cactus\+Classical\+Serif)(:|$)/;
const ASCII = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i));
const subsetFamilies = new Set<string>();
const subsetChars = new Set<string>(ASCII);
let subsetLink: HTMLLinkElement | null = null, subsetHref = "", subsetQueued = 0, subsetWatch: MutationObserver | null = null, subsetWhole = false;
function pageChars() {
  const add = (t: string | null) => { if (t) for (const ch of t) if (ch > " ") subsetChars.add(ch); };
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) add(n.nodeValue);
  for (const el of document.querySelectorAll("[placeholder]")) add(el.getAttribute("placeholder"));
}
function requestSubset() {
  subsetQueued = 0;
  pageChars();
  const families = [...subsetFamilies];
  if (subsetChars.size - ASCII.length > 800) {
    subsetWhole = true;
    subsetWatch?.disconnect();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = css2(families);
    document.head.appendChild(link);
    return;
  }
  const href = css2(families, `&text=${encodeURIComponent([...subsetChars].sort().join(""))}`);
  if (href === subsetHref) return;
  subsetHref = href;
  const link = document.createElement("link"), old = subsetLink;
  link.rel = "stylesheet";
  link.href = href;
  // the last subset stays until this one is in, so nothing drops back to the fallback meanwhile
  link.onload = () => old?.remove();
  document.head.appendChild(link);
  subsetLink = link;
}
function queueSubset() {
  if (!subsetQueued && !subsetWhole) subsetQueued = window.setTimeout(requestSubset, 120);
}
function subset(families: string[]) {
  for (const f of families) subsetFamilies.add(f);
  if (subsetWhole) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = css2(families);
    document.head.appendChild(link);
    return;
  }
  if (!subsetWatch) {
    subsetWatch = new MutationObserver(queueSubset);
    subsetWatch.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder"] });
  }
  queueSubset();
}

/**
 * Fonts a design needs whatever pairing the host picks, e.g. Tinghun's Chinese serif
 * (Noto Serif TC, with SC for simplified characters). The Chinese families come as a subset of
 * the page's own characters (see `subset` above).
 */
export function loadFontFamilies(key: string, families: string[]) {
  if (loaded.has(key) || typeof document === "undefined") return;
  loaded.add(key);
  fetchFamilies(families);
}
export const CHINESE_SERIF = ["Noto+Serif+TC:wght@400;600;700", "Noto+Serif+SC:wght@400;600"];
