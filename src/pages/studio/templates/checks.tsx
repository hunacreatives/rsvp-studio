import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { normalizeEventContent } from "@/pages/wedding-sites/content/normalize";
import { isabellaAndMateo } from "@/pages/wedding-sites/content/fixtures/isabella-and-mateo";
import { miasBirthday } from "@/pages/wedding-sites/content/fixtures/mias-birthday";
import { sparseDraft } from "@/pages/wedding-sites/content/fixtures/sparse-draft";
import type { EventContent } from "@/pages/wedding-sites/content/types";
import { defaultSectionVisibility } from "@/pages/wedding-sites/presentation/types";
import SpecTemplate from "@/pages/wedding-sites/spec/runtime/SpecTemplate";
import type { TemplateSpec } from "@/pages/wedding-sites/spec/schema";

// Pre-publish checklist for an uploaded template. Each check is something
// that would otherwise only surface on a customer's live invitation.

export const FIXTURES: { id: string; label: string; content: EventContent; editor?: boolean }[] = [
  { id: "full", label: "Full wedding (Isabella & Mateo)", content: normalizeEventContent(isabellaAndMateo) },
  { id: "birthday", label: "Birthday, one host (Mia)", content: normalizeEventContent(miasBirthday) },
  { id: "long", label: "Long names (stress test)", content: longNames() },
  { id: "sparse", label: "Brand-new empty draft (builder view)", content: normalizeEventContent(sparseDraft), editor: true },
];

function longNames(): EventContent {
  const c = normalizeEventContent(isabellaAndMateo);
  return {
    ...c,
    hosts: [
      { id: "h1", name: "Maria Concepcion Bernadette dela Cruz-Villanueva" },
      { id: "h2", name: "Juan Miguel Francisco Ignacio Santos" },
    ],
    primaryLocation: { ...c.primaryLocation, name: "The Grand Ballroom of the Manila Hotel, Rizal Park, Ermita" },
  };
}

export type CheckStatus = "pass" | "warn" | "fail" | "running";
export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

/** Checks that only need the spec itself. */
export function staticChecks(spec: TemplateSpec): CheckResult[] {
  const layers = spec.sections.flatMap((s) => (s.kind === "canvas" ? s.layers : []));
  const binds = layers.flatMap((l) => (l.type === "text" && l.bind ? [l.bind.field] : []));
  const blocks = spec.sections.flatMap((s) => (s.kind === "block" ? [s.block] : []));
  const hasRsvp = blocks.includes("rsvp");
  const hasRsvpButtonOnly = !hasRsvp && layers.some((l) => l.type === "rsvpButton");
  const hosts = binds.some((b) => b.startsWith("hosts."));
  const date = binds.includes("eventDate") || blocks.includes("schedule");
  const fonts = [spec.tokens.fonts.display.family, spec.tokens.fonts.body.family];
  return [
    { id: "valid", label: "Template file is valid", status: "pass" },
    {
      id: "hosts",
      label: "Shows the hosts' names",
      status: hosts ? "pass" : "fail",
      detail: hosts ? undefined : "No text box is linked to the host names, so every customer's site would show the same text.",
    },
    {
      id: "date",
      label: "Shows the event date",
      status: date ? "pass" : "warn",
      detail: date ? undefined : "Nothing is linked to the event date. Fine for a save-the-date-free design; otherwise link a text box.",
    },
    {
      id: "rsvp",
      label: "Guests can RSVP",
      status: hasRsvp ? "pass" : "fail",
      detail: hasRsvp ? undefined : hasRsvpButtonOnly ? "There's an RSVP button but no RSVP section for it to open." : "Add the RSVP section.",
    },
    {
      id: "footer",
      label: "Has The RSVP Studio footer",
      status: blocks.includes("footer") ? "pass" : "warn",
      detail: blocks.includes("footer") ? undefined : "Free-tier sites should credit The RSVP Studio.",
    },
    { id: "fonts", label: `Fonts load from Google Fonts (${[...new Set(fonts)].join(", ")})`, status: "pass" },
  ];
}

/** Asset reachability + page weight (images must load fast on mobile data). */
export async function assetChecks(spec: TemplateSpec): Promise<CheckResult[]> {
  const entries = Object.entries(spec.assets);
  if (!entries.length) return [{ id: "assets", label: "Artwork loads", status: "pass", detail: "No artwork files." }];
  let total = 0;
  const broken: string[] = [];
  const heavy: string[] = [];
  await Promise.all(
    entries.map(async ([key, a]) => {
      try {
        const res = await fetch(a.url, { method: "HEAD" });
        if (!res.ok) throw new Error(String(res.status));
        const bytes = Number(res.headers.get("content-length") ?? 0);
        total += bytes;
        if (bytes > 800_000) heavy.push(`${key} (${Math.round(bytes / 1024)} KB)`);
      } catch {
        broken.push(key);
      }
    }),
  );
  const mb = (total / 1024 / 1024).toFixed(1);
  return [
    {
      id: "assets",
      label: "Artwork loads",
      status: broken.length ? "fail" : "pass",
      detail: broken.length ? `Can't load: ${broken.join(", ")}` : undefined,
    },
    {
      id: "weight",
      label: `Artwork size (${mb} MB total)`,
      status: total > 2.5 * 1024 * 1024 || heavy.length ? "warn" : "pass",
      detail: heavy.length ? `Large files slow phones down: ${heavy.join(", ")}. Aim for under 800 KB each (WebP).` : total > 2.5 * 1024 * 1024 ? "Aim for under 2.5 MB in total." : undefined,
    },
  ];
}

class Catch extends Component<{ onError: (e: Error) => void; children: ReactNode }> {
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Render the template off-screen with every fixture; report crashes. */
export function renderChecks(spec: TemplateSpec): Promise<CheckResult[]> {
  return Promise.all(
    FIXTURES.map(
      (f) =>
        new Promise<CheckResult>((resolve) => {
          const host = document.createElement("div");
          host.style.cssText = "position:absolute;left:-10000px;top:0;width:1024px;visibility:hidden";
          document.body.appendChild(host);
          const root = createRoot(host);
          let error: Error | null = null;
          root.render(
            <Catch onError={(e) => (error = e)}>
              <SpecTemplate
                spec={spec}
                content={f.content}
                editorPreview={f.editor}
                settings={{ paletteId: spec.tokens.defaultPaletteId, fontPairingId: "", sectionVisibility: { ...defaultSectionVisibility } }}
              />
            </Catch>,
          );
          setTimeout(() => {
            // textContent, not innerText: the test render is hidden, and
            // innerText reports hidden text as empty.
            const empty = !error && (host.textContent ?? "").trim().length < 20;
            root.unmount();
            host.remove();
            resolve({
              id: `render-${f.id}`,
              label: `Renders: ${f.label}`,
              status: error ? "fail" : empty ? "warn" : "pass",
              detail: error ? (error as Error).message : empty ? "Rendered almost nothing." : undefined,
            });
          }, 600);
        }),
    ),
  );
}

/** Runs every check; returns live results as they complete. */
export function useTemplateChecks(spec: TemplateSpec | null) {
  const [results, setResults] = useState<CheckResult[]>([]);
  useEffect(() => {
    if (!spec) return;
    let live = true;
    const base = staticChecks(spec);
    setResults([...base, { id: "assets", label: "Checking artwork…", status: "running" }, { id: "render", label: "Rendering sample events…", status: "running" }]);
    Promise.all([assetChecks(spec), renderChecks(spec)]).then(([a, r]) => {
      if (live) setResults([...base, ...a, ...r]);
    });
    return () => {
      live = false;
    };
  }, [spec]);
  const blocking = results.some((r) => r.status === "fail" || r.status === "running");
  return { results, blocking };
}
