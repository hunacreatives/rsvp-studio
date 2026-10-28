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
  "fraunces-nunito": ["Fraunces:ital,opsz,wght,SOFT@0,9..144,400..700,0..100;1,9..144,400..700,0..100", "Nunito+Sans:wght@400;600;700;800"],
  "dmserif-jost": ["DM+Serif+Display:ital@0;1", "Jost:wght@400;500;600"],
  "yellowtail-jost": ["Yellowtail", "Jost:wght@400;500;600;700", "Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,800;1,9..144,700;1,9..144,800"],
};
const loaded = new Set<string>();

export function loadPairingFonts(pairingId: string | undefined) {
  const families = pairingId ? EXTRA[pairingId] : undefined;
  if (!families || loaded.has(pairingId!) || typeof document === "undefined") return;
  loaded.add(pairingId!);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Fonts a design needs whatever pairing the host picks, e.g. Tinghun's Chinese serif
 * (Noto Serif TC, with SC for simplified characters). Google serves CJK fonts in small
 * unicode-range slices, so a page with a few dozen characters downloads only those.
 */
export function loadFontFamilies(key: string, families: string[]) {
  if (loaded.has(key) || typeof document === "undefined") return;
  loaded.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
  document.head.appendChild(link);
}
export const CHINESE_SERIF = ["Noto+Serif+TC:wght@400;600;700", "Noto+Serif+SC:wght@400;600"];
