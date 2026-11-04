import { useEffect, useRef } from "react";
import { parseReply, inlineHtml } from "../../../api/_lib/reply-markup";

// Write a reply inside the email itself: the real branded email (logo, illustration, sign-off, footer,
// rendered by the server with a placeholder where the message goes) with its body made editable.
// What's typed is kept as the reply's plain text (api/_lib/reply-markup.ts), which the email is built from.

const PLACEHOLDER = "@@BODY@@";
export const EMAIL_SHELL_MESSAGE = PLACEHOLDER;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The reply's text as the editor's HTML. */
function toHtml(text: string) {
  const html = parseReply(text)
    .map((b) => {
      if (b.kind === "p") return `<p>${b.lines.map((l) => inlineHtml(l, esc)).join("<br>")}</p>`;
      const items = b.items.map((i) => `<li>${inlineHtml(i, esc)}</li>`).join("");
      return b.kind === "ul" ? `<ul>${items}</ul>` : `<ol start="${b.start}" style="counter-reset:n ${b.start - 1}">${items}</ol>`;
    })
    .join("");
  // a draft that ends on a blank line ("Hi Andrew," then nothing yet) starts the next paragraph
  return html + (/\n\s*\n\s*$/.test(text) || !html ? "<p><br></p>" : "");
}

// The editor lives in an iframe, so its nodes aren't this window's HTMLElements: go by nodeType and tag.
const asEl = (n: Node) => (n.nodeType === 1 ? (n as HTMLElement) : null);

/** What's in the editor, back to the reply's text: a blank line between blocks, list lines marked. */
function toText(root: HTMLElement) {
  const inline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue ?? "").replace(/\u00a0/g, " ");
    const el = asEl(node);
    if (!el) return "";
    if (el.tagName === "BR") return "\n";
    const inner = [...el.childNodes].map(inline).join("");
    const heavy = el.tagName === "B" || el.tagName === "STRONG" || Number(el.style?.fontWeight) >= 600 || el.style?.fontWeight === "bold";
    if (heavy && inner.trim()) {
      const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)!;
      return `${lead}**${core}**${trail}`;
    }
    return inner;
  };
  const blocks: string[] = [];
  let loose = "";
  const flush = () => {
    if (loose.trim()) blocks.push(loose.trim());
    loose = "";
  };
  const walk = (parent: Node) => {
    for (const node of [...parent.childNodes]) {
      const el = asEl(node);
      if (el && (el.tagName === "UL" || el.tagName === "OL")) {
        flush();
        const start = Number(el.getAttribute("start")) || 1;
        const items = [...el.children]
          .map((li) => inline(li).replace(/\s*\n\s*/g, " ").trim())
          .filter(Boolean)
          .map((t, i) => (el.tagName === "UL" ? `- ${t}` : `${start + i}. ${t}`));
        if (items.length) blocks.push(items.join("\n"));
      } else if (el && /^(DIV|P|H\d|BLOCKQUOTE|SECTION)$/.test(el.tagName)) {
        flush();
        if (el.querySelector("ul,ol,div,p")) walk(el);
        else {
          const t = inline(el).replace(/\n+$/, "").trim();
          if (t) blocks.push(t);
        }
      } else loose += inline(node);
    }
    flush();
  };
  walk(root);
  return blocks.join("\n\n");
}

// The email's own body style, and lists drawn the way the email draws them (coral dots and numbers)
const EDITOR_CSS = `
.rs-edit { outline: none; min-height: 140px; cursor: text; }
.rs-edit p, .rs-edit > div { margin: 0 0 18px; color: #4a4b63; font-size: 16px; line-height: 1.7; }
.rs-edit strong, .rs-edit b { color: #000727; font-weight: 700; }
.rs-edit ul, .rs-edit ol { list-style: none; margin: 0; padding: 0 0 8px; }   /* padding, so the last item's margin can't collapse into it */
.rs-edit li { position: relative; margin: 0 0 10px; color: #4a4b63; font-size: 16px; line-height: 1.7; }
.rs-edit ul > li { padding-left: 22px; }
.rs-edit ul > li::before { content: ""; position: absolute; left: 4px; top: 11px; width: 7px; height: 7px; border-radius: 4px; background: #ff7052; }
.rs-edit ol { counter-reset: n; }
.rs-edit ol > li { padding-left: 34px; counter-increment: n; }
.rs-edit ol > li::before { content: counter(n); position: absolute; left: 0; top: 2px; width: 24px; height: 24px; border-radius: 12px; background: #ff7052; color: #fff; font: 700 12px/24px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; text-align: center; }
.rs-edit:empty::before { content: "Write your message…"; color: #a0a0ad; }
`;

export type EmailEditorHandle = { run: (cmd: "bold" | "insertUnorderedList" | "insertOrderedList") => void };

/** The email, editable. `version` changes when the text is replaced from outside (a saved reply). */
export default function EmailEditor({ shell, value, version, onChange, handle }: {
  shell: string;
  value: string;
  version: number;
  onChange: (text: string) => void;
  handle: React.MutableRefObject<EmailEditorHandle | null>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const edit = useRef<HTMLElement | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  const setup = () => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    const style = doc.createElement("style");
    style.textContent = EDITOR_CSS;
    doc.head.appendChild(style);
    const spot = [...doc.querySelectorAll("p")].find((p) => p.textContent?.trim() === PLACEHOLDER);
    if (!spot) return;
    const div = doc.createElement("div");
    div.className = "rs-edit";
    div.contentEditable = "true";
    div.spellcheck = true;
    div.innerHTML = toHtml(latest.current.value);
    spot.replaceWith(div);
    edit.current = div;
    doc.execCommand("defaultParagraphSeparator", false, "p");
    const sync = () => latest.current.onChange(toText(div));
    div.addEventListener("input", sync);
    // pasted text keeps its paragraphs and lists, nothing else (no fonts or colours from elsewhere)
    div.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain") ?? "";
      doc.execCommand("insertHTML", false, /\n|^\s*(?:[-*•]|\d+[.)])\s/.test(text) ? toHtml(text) : esc(text));
      sync();
    });
    // links in the email don't navigate while writing
    doc.addEventListener("click", (e) => (e.target as HTMLElement)?.closest("a") && e.preventDefault());
    handle.current = {
      run: (cmd) => {
        div.focus();
        doc.execCommand(cmd);
        sync();
      },
    };
    // start typing at the end of the greeting
    div.focus();
    const sel = doc.getSelection();
    sel?.selectAllChildren(div);
    sel?.collapseToEnd();
  };

  // a saved reply replaced the text: show it
  useEffect(() => {
    if (version && edit.current) edit.current.innerHTML = toHtml(latest.current.value);
  }, [version]);

  return <iframe ref={frame} title="Your reply, as it will look" srcDoc={shell} onLoad={setup} className="h-[62dvh] w-full rounded-xl border border-[var(--line)] bg-[#f3f3f5]" />;
}
