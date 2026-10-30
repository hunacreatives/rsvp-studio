import { createContext, lazy, Suspense, useContext, type ComponentType, type ReactNode } from "react";
import type { BaseTemplateSettings } from "../presentation/types";
import type { TemplateProps } from "./registry";

/**
 * Each design's code loads on its own, when it's first shown: a guest opening an invitation
 * downloads that one design, not all of them. The registry's definitions (names, settings, sample
 * content, fields) stay in the registry, loaded up front; only the component is fetched.
 *
 * What shows for the moment the design's code is on its way: nothing by default (the builder, the
 * gallery card and the harness), or the page's own loading screen where a guest is waiting (the
 * invitation and the design preview put it in `TemplateFallback`).
 */
export const TemplateFallback = createContext<ReactNode>(null);

type Loader<S extends BaseTemplateSettings> = () => Promise<{ default: ComponentType<TemplateProps<S>> }>;
export type LazyTemplate<S extends BaseTemplateSettings> = ComponentType<TemplateProps<S>> & { preload: () => Promise<unknown> };

const loaders: (() => Promise<unknown>)[] = [];

export function lazyTemplate<S extends BaseTemplateSettings>(load: Loader<S>): LazyTemplate<S> {
  let started: Promise<unknown> | null = null;
  const preload = () => (started ??= load());
  const Design = lazy(() => preload() as ReturnType<Loader<S>>);
  function Template(props: TemplateProps<S>) {
    const fallback = useContext(TemplateFallback);
    return (
      <Suspense fallback={fallback}>
        <Design {...props} />
      </Suspense>
    );
  }
  loaders.push(preload);
  return Object.assign(Template, { preload });
}

/** Start fetching a design's code ahead of showing it (a no-op for designs not loaded lazily). */
export function preloadTemplate(component: unknown) {
  const p = (component as { preload?: () => Promise<unknown> } | undefined)?.preload;
  if (p) void p().catch(() => {});
}

/** Fetch every design's code in the background, one after another (the builder, where any design
 *  may be picked next and switching should be instant). */
export function preloadAllTemplates() {
  let i = 0;
  const next = () => {
    const p = loaders[i++];
    if (!p) return;
    void p().catch(() => {}).then(() => idle(next));
  };
  idle(next);
}
const idle = (cb: () => void) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 2000 }) : window.setTimeout(cb, 200));
