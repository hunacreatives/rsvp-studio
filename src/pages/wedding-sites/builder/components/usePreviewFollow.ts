import { useEffect, useRef, type RefObject } from "react";
import { openPanelPage } from "../DetailsPanel";

// The preview follows what's being edited: focus or type in a field and the preview scrolls
// to that part of the site and outlines it for a moment. And the other way: click something
// on the page and the editor opens and scrolls to it (usePreviewClickToEdit, below). It finds the spot by the field's own
// text (what's being typed shows up on the page), or, for an empty field, by its section's
// heading (each editor group carries data-edit-section). Works for any design, since it reads
// the rendered page rather than knowing each template's markup.

const SECTION_WORDS: Record<string, RegExp> = {
  story: /story|about us|our note|a note|message|welcome/i,
  hosts: /./,
  dateVenue: /venue|where|ceremony|when|church|location|celebration/i,
  schedule: /schedule|program|the day|the evening|timeline|order of|rounds/i,
  accommodations: /stay|accommodation|hotel|lodging/i,
  travel: /getting there|travel|directions|how to get/i,
  gallery: /photo|gallery|years|months|moments|favourites|favorites/i,
  keyPeople: /special people|family|parents|meet/i,
  registry: /gift|registry/i,
  faqs: /good to know|faq|questions|kitchen/i,
  entourage: /entourage|sponsor|ninong|ninang|godparent|with love from|special guests/i,
  rsvp: /rsvp|reply|kindly|roster|join/i,
  dress: /wear|dress|attire/i,
  livestream: /live|stream/i,
};

const visible = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** The elements in the preview showing this text, in page order. */
function byText(root: HTMLElement, text: string): HTMLElement[] {
  const needle = text.toLowerCase();
  const out: HTMLElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n && out.length < 12; n = walker.nextNode()) {
    if ((n.textContent ?? "").toLowerCase().includes(needle) && n.parentElement && visible(n.parentElement)) out.push(n.parentElement);
  }
  return out;
}

/** A section's heading in the preview, by its usual words. */
function bySection(root: HTMLElement, section: string): HTMLElement | null {
  if (section === "hosts") return root.querySelector("h1");
  if (section === "rsvp") {
    const r = root.querySelector<HTMLElement>("#rsvp");
    if (r && visible(r)) return r;
  }
  if (section === "gallery") {
    const imgs = [...root.querySelectorAll<HTMLElement>("img")].filter(visible);
    if (imgs.length > 3) return imgs[Math.min(3, imgs.length - 1)];
  }
  const words = SECTION_WORDS[section];
  if (!words) return null;
  const heads = [...root.querySelectorAll<HTMLElement>("h2, h3, [class*='title'], [class*='kicker'], [class*='label']")].filter(visible);
  return heads.find((h) => words.test(h.textContent ?? "")) ?? null;
}

/** What to look for from a field: its first line, trimmed (a long story: its opening words). */
function needleOf(el: Element): string {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return "";
  if (el instanceof HTMLInputElement && !/^(text|search|url|email|tel|)$/.test(el.type)) return "";
  const first = el.value.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return first.length >= 3 ? first.slice(0, 40) : "";
}

export function usePreviewFollow(editor: RefObject<HTMLElement | null>, scroller: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>) {
  useEffect(() => {
    // Listens on the document (the editor mounts after the builder's loading screen) and acts
    // only on fields inside the editor.
    let timer = 0;
    let last: HTMLElement | null = null;
    const go = (field: Element) => {
      const sc = scroller.current;
      const root = content.current;
      if (!sc || !root || sc.clientHeight === 0) return; // the preview isn't showing (phone: Edit tab)
      const section = field.closest<HTMLElement>("[data-edit-section]")?.dataset.editSection ?? "";
      const needle = needleOf(field);
      const head = section ? bySection(root, section) : null;
      const hits = needle ? byText(root, needle) : [];
      // The same text can show twice (the venue's name is in the hero too): take the one in the
      // field's own section, the first after its heading, when there is one.
      const inSection = head ? hits.find((h) => h === head || head.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING) : undefined;
      const target = inSection ?? hits[0] ?? head;
      if (!target) return;
      const sr = sc.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      // Already comfortably in view: leave the scroll alone, just outline it.
      const inView = tr.top >= sr.top + 40 && tr.bottom <= sr.bottom - 40;
      if (!inView) {
        const top = sc.scrollTop + (tr.top - sr.top) - sc.clientHeight * 0.28;
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        sc.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
      }
      if (last !== target) {
        last = target;
        target.animate?.(
          [
            { outline: "2px solid rgba(47,97,213,0)", outlineOffset: "6px" },
            { outline: "2px solid rgba(47,97,213,.75)", outlineOffset: "6px", offset: 0.15 },
            { outline: "2px solid rgba(47,97,213,.75)", outlineOffset: "6px", offset: 0.7 },
            { outline: "2px solid rgba(47,97,213,0)", outlineOffset: "6px" },
          ],
          { duration: 1400, easing: "ease-out" },
        );
      }
    };
    const soon = (e: Event) => {
      if (inlineEditing) return; // typing on the page itself: it's already in view
      const field = e.target as Element;
      if (!field.matches?.("input, textarea, select") || !editor.current?.contains(field)) return;
      window.clearTimeout(timer);
      // Let the preview render what was just typed first.
      timer = window.setTimeout(() => go(field), e.type === "focusin" ? 120 : 320);
    };
    document.addEventListener("focusin", soon);
    document.addEventListener("input", soon);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", soon);
      document.removeEventListener("input", soon);
    };
  }, [editor, scroller, content]);
}

const flash = (el: HTMLElement) =>
  el.animate?.(
    [
      { boxShadow: "0 0 0 0 rgba(47,97,213,0)" },
      { boxShadow: "0 0 0 3px rgba(47,97,213,.55)", offset: 0.2 },
      { boxShadow: "0 0 0 3px rgba(47,97,213,.55)", offset: 0.7 },
      { boxShadow: "0 0 0 0 rgba(47,97,213,0)" },
    ],
    { duration: 1400, easing: "ease-out" },
  );

/** Show a field or group in the Details panel: open its page there (and any collapsed part inside it). */
function reveal(el: HTMLElement) {
  const page = el.closest<HTMLElement>("[data-panel-page]")?.dataset.panelPage;
  if (page) openPanelPage(page);
  for (let d = el.closest("details"); d; d = d.parentElement?.closest("details") ?? null) d.open = true;
}

// Most specific first ("Travel & stay" is accommodations before travel; "Will you join us?" is rsvp).
const CLICK_ORDER = ["rsvp", "faqs", "registry", "entourage", "gallery", "accommodations", "travel", "schedule", "dress", "livestream", "keyPeople", "story", "dateVenue"];

/** The editor field holding this text (the venue's name, a FAQ question, the story...). */
function fieldFor(editor: HTMLElement, text: string): HTMLElement | null {
  const t = text.trim().toLowerCase();
  if (t.length < 3) return null;
  let best: HTMLElement | null = null;
  let score = 0;
  for (const f of editor.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")) {
    if (f instanceof HTMLInputElement && !/^(text|search|url|email|tel|)$/.test(f.type)) continue;
    const v = f.value.trim().toLowerCase();
    if (v.length < 3) continue;
    const s = v === t ? 3 : t.length >= 6 && v.includes(t.slice(0, 60)) ? 2 : v.length >= 6 && t.includes(v) ? 1 + v.length / 1000 : 0;
    if (s > score) {
      score = s;
      best = f;
    }
  }
  return best;
}

/** The editor group for the page section around an element, by its heading. */
function groupFor(editor: HTMLElement, root: HTMLElement, el: HTMLElement): HTMLElement | null {
  const sec = el.closest<HTMLElement>("section, header, footer, [class*='sec']");
  if (!sec || !root.contains(sec)) return null;
  // the story is edited with the names
  const has = (key: string) => editor.querySelector<HTMLElement>(`[data-edit-section="${key === "story" ? "hosts" : key}"]`);
  // a date or the countdown (in the hero or anywhere): the date lives with the venue
  const text = el.textContent ?? "";
  if (el.closest("[class*='count']") || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d|\d+\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i.test(text)) {
    const dv = has("dateVenue");
    if (dv) return dv;
  }
  if (sec.querySelector("h1") || sec.tagName === "HEADER") return has("hosts");
  if (sec.querySelector("#rsvp, form") || sec.id === "rsvp") return has("rsvp");
  const heads = [...sec.querySelectorAll<HTMLElement>("h2, h3, [class*='title'], [class*='kicker'], [class*='label']")].slice(0, 3);
  const words = heads.map((h) => h.textContent ?? "").join(" ");
  if (sec.querySelectorAll("img").length > 3 && SECTION_WORDS.gallery.test(words)) return has("gallery");
  for (const key of CLICK_ORDER) if (SECTION_WORDS[key]?.test(words) && has(key)) return has(key);
  return null;
}

/** The field (and, for a story, the paragraph) whose text is exactly this. */
function exactField(editor: HTMLElement, text: string): { field: HTMLInputElement | HTMLTextAreaElement; para: number } | null {
  const t = text.trim();
  if (t.length < 2) return null;
  for (const f of editor.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")) {
    if (f instanceof HTMLInputElement && !/^(text|search|)$/.test(f.type)) continue;
    if (f.disabled || f.readOnly) continue;
    if (f.value.trim() === t) return { field: f, para: -1 };
    if (f instanceof HTMLTextAreaElement) {
      const i = f.value.split(/\n\s*\n/).findIndex((p) => p.trim() === t);
      if (i >= 0) return { field: f, para: i };
    }
  }
  return null;
}

/** Sets a field the way typing would, so its own onChange runs (React listens for "input"). */
function setField(f: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = f instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(f, value);
  f.dispatchEvent(new Event("input", { bubbles: true }));
}

let inlineEditing = false;

/** Where an in-place edit reads from and writes to. */
interface TextSource {
  initial: string;
  write: (v: string) => void;
  revert: () => void;
  multiline: boolean;
  /** When the box closes: the text left in it, and whether it was Esc. */
  onDone?: (value: string, cancelled: boolean) => void;
}

/** An editor panel field (or one paragraph of it) as a TextSource. */
function panelSource(f: HTMLInputElement | HTMLTextAreaElement, para: number): TextSource {
  const original = f.value;
  const paras = original.split(/\n\s*\n/);
  return {
    initial: para >= 0 ? paras[para].trim() : f.value.trim(),
    multiline: f instanceof HTMLTextAreaElement,
    write: (v) => {
      if (para >= 0) {
        const next = [...paras];
        next[para] = v.replace(/\n\s*\n/g, "\n");
        v = next.join("\n\n");
      }
      setField(f, v);
    },
    revert: () => {
      if (f.value !== original) setField(f, original);
    },
  };
}

/**
 * Edit a piece of text right where it is on the page: a box laid over it in the design's own
 * type. Enter (⌘Enter in longer text) or clicking away finishes; Esc puts it back.
 */
function editInPlace(el: HTMLElement, src: TextSource) {
  const cs = getComputedStyle(el);
  const box = document.createElement("textarea");
  box.value = src.initial;
  // an empty field shows the design's placeholder; keep it as the box's hint
  if (el.hasAttribute("data-site-empty")) box.placeholder = (el.textContent ?? "").trim();
  box.setAttribute("aria-label", "Edit this text");
  box.spellcheck = true;
  const place = () => {
    if (!el.isConnected) return done(false);
    const r = el.getBoundingClientRect();
    const k = el.offsetWidth ? r.width / el.offsetWidth : 1; // the preview can be scaled down
    const px = (v: string) => (v.endsWith("px") ? `${parseFloat(v) * k}px` : v);
    Object.assign(box.style, {
      position: "fixed",
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${Math.max(r.width, 120)}px`,
      zIndex: "70",
      margin: "0",
      padding: "0",
      border: "0",
      outline: "2px solid rgba(47,97,213,.85)",
      outlineOffset: "4px",
      borderRadius: "2px",
      background: "transparent",
      resize: "none",
      overflow: "hidden",
      color: cs.color,
      caretColor: cs.color,
      font: "inherit",
      fontFamily: cs.fontFamily,
      fontSize: px(cs.fontSize),
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      lineHeight: cs.lineHeight === "normal" ? "1.2" : px(cs.lineHeight),
      letterSpacing: cs.letterSpacing === "normal" ? "normal" : px(cs.letterSpacing),
      textTransform: cs.textTransform,
      textAlign: cs.textAlign === "start" ? "left" : cs.textAlign,
      whiteSpace: "pre-wrap",
    } as Partial<CSSStyleDeclaration>);
    box.style.height = "0px";
    box.style.height = `${Math.max(box.scrollHeight, r.height)}px`;
  };
  const write = () => {
    src.write(src.multiline ? box.value : box.value.replace(/\s*\n\s*/g, " "));
    requestAnimationFrame(place); // the page re-lays out around the new text
  };
  let finished = false;
  function done(cancel: boolean) {
    if (finished) return;
    finished = true;
    inlineEditing = false;
    if (cancel) src.revert();
    el.style.visibility = prevVis;
    box.remove();
    document.removeEventListener("scroll", place, true);
    window.removeEventListener("resize", place);
    src.onDone?.(cancel ? src.initial : box.value.trim(), cancel);
  }
  const prevVis = el.style.visibility;
  el.style.visibility = "hidden";
  inlineEditing = true;
  box.addEventListener("input", write);
  box.addEventListener("blur", () => done(false));
  box.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      done(true);
    } else if (e.key === "Enter" && (!src.multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      done(false);
    }
  });
  document.addEventListener("scroll", place, true);
  window.addEventListener("resize", place);
  document.body.appendChild(box);
  place();
  box.focus({ preventScroll: true });
  box.setSelectionRange(box.value.length, box.value.length);
}

/** What the page's own markers (templates/shared/siteEdit) need from the builder. */
export interface SiteOps {
  /** An edit is starting: its typing is one undo step. */
  begin: () => void;
  get: (list: string | null, id: string | null, path: string) => string;
  set: (list: string | null, id: string | null, path: string, value: string) => void;
  /** "+ Add …": a list key, or "entourage:<group id>:people". Returns where to type. */
  add: (spec: string) => { list: string; id: string; path?: string } | null;
  remove: (list: string, id: string) => void;
  show: (keys: string[]) => void;
}

/** Edit a marked field (data-site-field) in place. `fresh`: a just-added item, dropped again if left empty. */
function editSiteField(el: HTMLElement, site: SiteOps, fresh = false) {
  const itemEl = el.closest<HTMLElement>("[data-site-item]");
  const list = itemEl?.closest<HTMLElement>("[data-site-list]")?.dataset.siteList ?? null;
  const id = itemEl?.dataset.siteItem ?? null;
  const path = el.dataset.siteField!;
  const saved = site.get(list, id, path);
  // An empty field showing the design's own wording (Field `fallback`) starts from that wording.
  const initial = saved || el.dataset.siteDefault || "";
  site.begin();
  editInPlace(el, {
    initial,
    multiline: el.hasAttribute("data-site-multiline"),
    write: (v) => site.set(list, id, path, v),
    revert: () => site.set(list, id, path, saved),
    onDone: (value) => {
      if (fresh && !value && list && id && !/\.\d+$/.test(path)) site.remove(list, id);
      // a cleared name in a group of names ("people.2") is removed by set("") itself
      else if (fresh && !value && /\.\d+$/.test(path)) site.set(list, id, path, "");
    },
  });
}

/** Clicked on its own text (not the empty space of a section). */
const ownText = (el: HTMLElement) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim());

/**
 * Click the page to edit it. Text that comes straight from a field is edited right there.
 * Other text (a formatted date, a heading the design writes) opens the editor panel at its
 * field or section: `panel` says whether the panel is showing and opens it.
 */
export function usePreviewClickToEdit(editor: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>, panel: { shown: () => boolean; open: () => void }, site: SiteOps) {
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const siteRef = useRef(site);
  siteRef.current = site;
  useEffect(() => {
    let wait = 0;
    const onClick = (e: MouseEvent) => {
      const root = content.current;
      const ed = editor.current;
      const el = e.target as HTMLElement;
      if (e.defaultPrevented || !root || !ed || !root.contains(el)) return;
      // The design's own edit markers (templates/shared/siteEdit) come first.
      const show = el.closest<HTMLElement>("[data-site-show]");
      if (show) {
        e.preventDefault();
        siteRef.current.show((show.dataset.siteShow ?? "").split(" ").filter(Boolean));
        return;
      }
      const add = el.closest<HTMLElement>("[data-site-add]");
      if (add) {
        e.preventDefault();
        const made = siteRef.current.add(add.dataset.siteAdd ?? "");
        if (!made) return;
        // after the page shows the new item: type straight into its first field
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const item = root.querySelector<HTMLElement>(`[data-site-list="${made.list}"] [data-site-item="${made.id}"]`);
            const field = made.path ? item?.querySelector<HTMLElement>(`[data-site-field="${made.path}"]`) : item?.querySelector<HTMLElement>("[data-site-field]");
            if (!field) return;
            field.scrollIntoView({ block: "nearest" });
            editSiteField(field, siteRef.current, true);
          }),
        );
        return;
      }
      const marked = el.closest<HTMLElement>("[data-site-field]");
      if (marked && root.contains(marked)) {
        e.preventDefault(); // not the link it sits in, not the FAQ toggle
        editSiteField(marked, siteRef.current);
        return;
      }
      // the page's own controls keep working (RSVP form, links, FAQ toggles, flipping prints)
      if (el.closest("a, button, input, select, textarea, summary, label, [role='button'], [data-add-photo]")) return;
      const shown = panelRef.current.shown();
      const exact = exactField(ed, el.textContent ?? "");
      if (exact) {
        // Text straight from a field: edit it right here (and, if the panel is open, show that field there too).
        editInPlace(el, panelSource(exact.field, exact.para));
        if (shown) {
          reveal(exact.field);
          requestAnimationFrame(() => requestAnimationFrame(() => exact.field.scrollIntoView({ block: "center", behavior: "smooth" })));
        }
        return;
      }
      if (!ownText(el)) return; // empty space: just a click
      const field = fieldFor(ed, el.textContent ?? "");
      const target = field ?? groupFor(ed, root, el);
      if (!target) return;
      const go = () => {
        reveal(target);
        // after the panel shows that page
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
            if (field) {
              field.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
              field.focus({ preventScroll: true });
              flash(field);
            }
          }),
        );
      };
      window.clearTimeout(wait);
      if (shown) go();
      else {
        panelRef.current.open();
        wait = window.setTimeout(go, 360); // after the panel slides open
      }
    };
    document.addEventListener("click", onClick);
    return () => {
      window.clearTimeout(wait);
      document.removeEventListener("click", onClick);
    };
  }, [editor, content]);
}
