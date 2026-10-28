// The summit marker: a weathered wooden post with the mountain's height, as on Philippine peaks.
// `id` keeps its gradient's id apart from any other marker on the page.
export const markerSvg = (id: string, height: string) => `<svg viewBox="0 0 120 150" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#5a4330"/><stop offset=".5" stop-color="#7a5d42"/><stop offset="1" stop-color="#4a3626"/></linearGradient></defs>
<rect x="54" y="40" width="12" height="110" fill="url(#${id})"/>
<rect x="8" y="14" width="104" height="44" rx="3" fill="url(#${id})"/><rect x="8" y="14" width="104" height="44" rx="3" fill="none" stroke="#3a2a1d" stroke-width="2"/>
<text x="60" y="33" text-anchor="middle" font-family="DM Mono, monospace" font-size="11" fill="#f3e9d8" letter-spacing="1">SUMMIT</text>
<text x="60" y="50" text-anchor="middle" font-family="DM Mono, monospace" font-size="12" fill="#f3e9d8" letter-spacing="0.5">${height} MASL</text></svg>`;
