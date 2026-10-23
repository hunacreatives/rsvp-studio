import { createElement, type CSSProperties, type ElementType, type ReactNode } from "react";

// Builder-only hooks a design puts on its own markup so the builder can edit the page itself
// (builder/components/PreviewSectionTools.tsx and usePreviewFollow.ts). On the published site
// every one of these renders exactly what it would without them: no attributes, no extras.
//
// - section(key): a section the host can hide or move ("stay" etc. are a design's own keys,
//   mapped to SectionVisibility by `vis`).
// - list(key) + item(id): a repeating list (pageEdit's LISTS keys) and one of its items, which
//   get Remove / Move on hover.
// - <Field>: a piece of text that comes from one field, edited right where it is; shows a
//   faded placeholder in the builder while it's empty.
// - <AddItem>: the faded "+ Add person" at the end of a list.
// - <HiddenSection>: where a switched-off section would be, a slim "Gifts · hidden — Show".

export function siteEdit(editor: boolean | undefined) {
  const on = !!editor;
  return {
    on,
    section: (key: string, vis?: string[]) => (on ? { "data-site-section": key, ...(vis ? { "data-site-vis": vis.join(" ") } : {}) } : {}),
    list: (key: string) => (on ? { "data-site-list": key } : {}),
    item: (id: string) => (on ? { "data-site-item": id } : {}),
  };
}

/**
 * Text from one field. `path` is the field inside its item (e.g. "name", "people.2"), or a
 * path from the content's root outside a list (e.g. "primaryLocation.name", "story#0" for a
 * paragraph of the story).
 */
export function Field({
  as = "span",
  path,
  value,
  placeholder,
  editor,
  multiline,
  fallback,
  className,
  style,
  children,
  ...rest
}: {
  as?: ElementType;
  path: string;
  value: string | undefined;
  placeholder: string;
  editor?: boolean;
  multiline?: boolean;
  /** The design's own wording while the field is empty ("Our story"): shown as-is everywhere,
   *  and the text editing starts from. */
  fallback?: string;
  className?: string;
  style?: CSSProperties;
  /** What to show instead of the plain value (the value still decides empty/placeholder). */
  children?: ReactNode;
  /** Anything else goes on the element (data-reveal, style delays…). */
  [attr: string]: unknown;
}) {
  const own = !!(value ?? "").trim();
  const shown = own ? (children ?? value) : fallback;
  const empty = !own && !fallback;
  if (!editor) return empty ? null : createElement(as, { className, style, ...rest }, shown);
  return createElement(
    as,
    {
      className,
      style,
      ...rest,
      "data-site-field": path,
      "data-site-empty": empty ? "" : undefined,
      "data-site-default": !own && fallback ? fallback : undefined,
      "data-site-multiline": multiline ? "" : undefined,
    },
    empty ? placeholder : shown,
  );
}

/** The faded add item at the end of a list (builder only). `list` may be "entourage:<group id>:people" for names in a group. */
export function AddItem({ list, label, editor, className, style }: { list: string; label: string; editor?: boolean; className?: string; style?: CSSProperties }) {
  if (!editor) return null;
  return (
    <button type="button" data-site-add={list} className={`site-add ${className ?? ""}`} style={style}>
      + {label}
    </button>
  );
}

/** Where a switched-off section sits on the page (builder only). */
export function HiddenSection({ k, vis, label, editor }: { k: string; vis?: string[]; label: string; editor?: boolean }) {
  if (!editor) return null;
  return (
    <div data-site-hidden={k} className="site-hidden">
      <span>
        {label} · hidden
        <button type="button" data-site-show={(vis ?? [k]).join(" ")}>
          Show
        </button>
      </span>
    </div>
  );
}

/** A design's sections in the host's order: `order` (saved) over the design's own order, unknown keys dropped, new ones kept. */
export function inOrder(defaults: string[], order?: string[]): string[] {
  const saved = (order ?? []).filter((k) => defaults.includes(k));
  return [...saved, ...defaults.filter((k) => !saved.includes(k))];
}
