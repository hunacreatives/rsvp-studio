/** Small helper so every "add item" action in the builder gets a stable id
 *  without pulling in a uuid dependency — crypto.randomUUID() is
 *  available in every environment this app runs in (modern browsers, Vercel's
 *  Node runtime). */
export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
