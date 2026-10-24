// Porcelain Garden's repeating tiles (data URIs), drawn in the colour the page passes in.

/** A tile as a data URI (for repeating bands), drawn in `color`. */
const tile = (w: number, h: number, body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;

/** The cloud-scroll band (卷雲紋): a running scroll of curled clouds, between two fine rules. */
export function cloudBand(color: string): string {
  return tile(
    40,
    20,
    `<g fill="none" stroke="${color}" stroke-linecap="round">` +
      `<path d="M0 2.5H40M0 18H40" stroke-width=".6"/>` +
      // one cloud: a wave rising into a curl that turns back on itself, then running on
      `<path d="M0 14C5 14 7 5 13 5C18 5 19.5 10 16 11C13.6 11.7 12.4 9.2 14.2 8.4" stroke-width="1"/>` +
      `<path d="M13 5C21 4.6 24 9 26 12C28 14.4 31 14.6 34 14.2C37 13.9 38.5 14 40 14" stroke-width=".9"/>` +
      `<path d="M26 12C27 9.5 30 8.5 31.6 10" stroke-width=".7"/>` +
      `</g>`,
  );
}

/** Silk mounting for the handscroll: a small lattice of florets (gold on celadon). */
export function brocade(line: string, ground: string): string {
  return tile(
    18,
    18,
    `<rect width="18" height="18" fill="${ground}"/><path d="M9 0L18 9L9 18L0 9Z" fill="none" stroke="${line}" stroke-width=".6" opacity=".7"/><circle cx="9" cy="9" r="1.4" fill="${line}" opacity=".8"/><circle cx="0" cy="0" r="1" fill="${line}" opacity=".6"/><circle cx="18" cy="0" r="1" fill="${line}" opacity=".6"/><circle cx="0" cy="18" r="1" fill="${line}" opacity=".6"/><circle cx="18" cy="18" r="1" fill="${line}" opacity=".6"/>`,
  );
}
