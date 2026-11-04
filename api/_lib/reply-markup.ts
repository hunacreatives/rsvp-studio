// The few kinds of formatting a reply can have, shared by the editor in Studio (which shows the email as
// it's written) and the email itself (leadReply in enquiry-mail.ts), so the two can't drift apart.
// A reply is kept as plain text: paragraphs split by a blank line, "- " or "• " for bullets, "1. " for a
// numbered list, **bold**. Pure: no imports, runs in the browser and on the server.

export type ReplyBlock = { kind: "p"; lines: string[] } | { kind: "ul"; items: string[] } | { kind: "ol"; start: number; items: string[] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*(\d{1,3})[.)]\s+(.*)$/;

export function parseReply(text: string): ReplyBlock[] {
  const out: ReplyBlock[] = [];
  let para: string[] = [];
  let list: Extract<ReplyBlock, { kind: "ul" | "ol" }> | null = null;
  let gap = false; // a blank line since the last list item
  const flush = () => {
    if (para.length) out.push({ kind: "p", lines: para });
    para = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      gap = true;
      continue;
    }
    const b = BULLET.exec(line), n = NUMBER.exec(line);
    if (b || n) {
      flush();
      const kind = b ? "ul" : "ol";
      // a list carries on across a blank line, as long as it's the same kind (pasted lists often have them)
      if (!list || list.kind !== kind || (gap && out.at(-1) !== list)) {
        list = kind === "ul" ? { kind, items: [] } : { kind, start: Number(n![1]) || 1, items: [] };
        out.push(list);
      }
      list.items.push((b ? b[1] : n![2]).trim());
      gap = false;
      continue;
    }
    list = null;
    gap = false;
    para.push(line.trim());
  }
  flush();
  return out;
}

/** Escaped text with **bold** turned on. */
export function inlineHtml(text: string, esc: (s: string) => string, bold = (s: string) => `<strong>${s}</strong>`) {
  return esc(text).replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, (_, s) => bold(s));
}

/** The reply as one line of text, for an inbox's preview line. */
export function plainReply(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*(?:[-*•]|\d{1,3}[.)])\s+/gm, "").replace(/\s+/g, " ").trim();
}
