// Sets each page's title and description as you move around the app. The words live in
// api/_lib/page-meta.ts, which the server also uses for link previews.
import { metaFor } from "../../api/_lib/page-meta";

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function applyPageMeta(pathname: string) {
  if (pathname.startsWith("/invite/")) return; // set by the server per event
  const { title, description: desc } = metaFor(pathname);
  document.title = title;
  setMeta('meta[name="description"]', "name", "description", desc);
  setMeta('meta[property="og:title"]', "property", "og:title", title);
  setMeta('meta[property="og:description"]', "property", "og:description", desc);
  setMeta('meta[property="og:url"]', "property", "og:url", `https://thersvpstudio.com${pathname}`);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `https://thersvpstudio.com${pathname === "/" ? "/" : pathname.replace(/\/$/, "")}`;
}
