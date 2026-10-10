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
  "homemade-caveat": ["Homemade+Apple", "Caveat:wght@400;500;600;700"],
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
