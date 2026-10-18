import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

// A small, safe Markdown renderer for blog posts (no HTML is ever injected):
//   ## / ### headings (h2 / h3: the page's title is the only h1; a lone # counts as ##) · paragraphs · "- " and "1. " lists · "> " quotes
//   ![alt](image-url) on its own line · **bold** · *italic* · [text](link) · ---

const safeUrl = (u: string) => (/^(https?:\/\/|\/|mailto:)/i.test(u.trim()) ? u.trim() : "#");

function inline(text: string, key = 0, newTab = false): ReactNode[] {
  const out: ReactNode[] = [];
  // links, then bold, then italic — first match wins, recursively
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/;
  let rest = text;
  let i = key;
  while (rest) {
    const m = re.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index) out.push(rest.slice(0, m.index));
    if (m[1] !== undefined) {
      const href = safeUrl(m[2]);
      // Our own pages (/blog/…, or a full thersvpstudio.com address) open in the app; others in a new tab.
      const own = /^\/(?!\/)/.test(href) ? href : /^https?:\/\/(www\.)?thersvpstudio\.com(\/|$)/i.test(href) ? href.replace(/^https?:\/\/(www\.)?thersvpstudio\.com/i, "") || "/" : null;
      const cls = "text-[var(--acc-blue)] underline underline-offset-[3px]";
      out.push(
        own && !newTab ? (
          <Link key={`l${i++}`} to={own} className={cls}>
            {inline(m[1], i * 10, newTab)}
          </Link>
        ) : (
          <a key={`l${i++}`} href={href} {...(newTab || /^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cls}>
            {inline(m[1], i * 10, newTab)}
          </a>
        ),
      );
    } else if (m[3] !== undefined) out.push(<strong key={`b${i++}`} className="font-semibold text-[var(--ink)]">{inline(m[3], i * 10, newTab)}</strong>);
    else out.push(<em key={`i${i++}`}>{inline(m[4], i * 10, newTab)}</em>);
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

/** `newTab`: the Studio editor's preview — links open in a new tab so the draft isn't left behind. */
export default function Markdown({ source, newTab = false }: { source: string; newTab?: boolean }) {
  const md = (t: string) => inline(t, 0, newTab);
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flush = () => {
    if (para.length) {
      blocks.push(<p key={blocks.length}>{md(para.join(" "))}</p>);
      para = [];
    }
    if (list) {
      const Tag = list.ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={blocks.length} className={list.ordered ? "list-decimal pl-6" : "list-disc pl-6"}>
          {list.items.map((it, j) => (
            <li key={j} className="mt-1.5 pl-1">{md(it)}</li>
          ))}
        </Tag>,
      );
      list = null;
    }
    if (quote.length) {
      blocks.push(
        <blockquote key={blocks.length} className="border-l-2 border-[var(--ink)] pl-5 font-display text-[1.25em] italic leading-snug text-[var(--ink)]">
          {md(quote.join(" "))}
        </blockquote>,
      );
      quote = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    let m: RegExpExecArray | null;
    if (!t) {
      flush();
    } else if ((m = /^(#{1,3})\s+(.*)$/.exec(t))) {
      flush();
      blocks.push(
        m[1].length === 3 ? (
          <h3 key={blocks.length} className="pt-2 text-[1.1em] font-semibold text-[var(--ink)]">{md(m[2])}</h3>
        ) : (
          <h2 key={blocks.length} className="pt-4 font-display text-[1.45em] font-semibold leading-tight text-[var(--ink)]">{md(m[2])}</h2>
        ),
      );
    } else if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t))) {
      flush();
      blocks.push(
        <figure key={blocks.length} className="my-2">
          <img src={safeUrl(m[2])} alt={m[1]} loading="lazy" decoding="async" className="w-full rounded-[20px]" />
          {m[1] ? <figcaption className="mt-2 text-center text-[0.8em] text-[var(--slate)]">{m[1]}</figcaption> : null}
        </figure>,
      );
    } else if (/^(-{3,}|\*{3,})$/.test(t)) {
      flush();
      blocks.push(<hr key={blocks.length} className="my-2 border-[var(--line)]" />);
    } else if ((m = /^[-*]\s+(.*)$/.exec(t)) || (m = /^\d+[.)]\s+(.*)$/.exec(t))) {
      const ordered = /^\d/.test(t);
      if (para.length || quote.length || (list && list.ordered !== ordered)) flush();
      list ??= { ordered, items: [] };
      list.items.push(m[1]);
    } else if ((m = /^>\s?(.*)$/.exec(t))) {
      if (para.length || list) flush();
      quote.push(m[1]);
    } else {
      if (list || quote.length) flush();
      para.push(t);
    }
  }
  flush();
  return <Fragment>{blocks}</Fragment>;
}
