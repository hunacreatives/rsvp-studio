import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeEventContent } from "../content/normalize";
import { definitionFromSpec } from "../spec/definitionFromSpec";
import { parseSpec } from "../spec/schema";
import {
  listTemplateDefinitions,
  setTemplateCatalog,
  subscribeTemplates,
  templatesVersion,
  type CatalogEntry,
  type TemplateDefinition,
} from "./registry";

// Loads the template catalog from the database once per page load: gallery
// order/tier/visibility for every template, plus the current version of
// each uploaded (spec) template, registered into the shared registry. If
// the tables don't exist yet (SQL not applied) or the request fails, the
// app keeps working on the hand-coded templates alone.

let loading: Promise<void> | null = null;
let ready = false;

type TemplateRow = {
  id: string;
  label: string;
  kind: "code" | "spec";
  tier: "free" | "premium";
  status: CatalogEntry["status"];
  sort: number;
  current_version_id: string | null;
  thumbnail_url: string | null;
};
type VersionRow = { id: string; template_id: string; spec: unknown; demo_content: unknown };

export function loadTemplateCatalog(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const { data: rows, error } = await supabase
        .from("templates")
        .select("id, label, kind, tier, status, sort, current_version_id, thumbnail_url");
      if (error || !rows) throw error ?? new Error("no catalog");
      const templates = rows as TemplateRow[];
      const versionIds = templates.filter((t) => t.kind === "spec" && t.current_version_id).map((t) => t.current_version_id as string);
      const { data: versions } = versionIds.length
        ? await supabase.from("template_versions").select("id, template_id, spec, demo_content").in("id", versionIds)
        : { data: [] as VersionRow[] };

      const specDefs: TemplateDefinition[] = [];
      for (const v of (versions ?? []) as VersionRow[]) {
        const row = templates.find((t) => t.id === v.template_id);
        const parsed = parseSpec(v.spec);
        if (!row || !("spec" in parsed)) {
          console.warn(`Template ${v.template_id}: spec failed validation`, "errors" in parsed ? parsed.errors : "");
          continue;
        }
        specDefs.push(
          definitionFromSpec({
            id: row.id,
            label: row.label,
            tier: row.tier,
            spec: parsed.spec,
            thumbnailUrl: row.thumbnail_url ?? undefined,
            demoContent: v.demo_content ? normalizeEventContent(v.demo_content) : undefined,
          }),
        );
      }

      setTemplateCatalog(
        templates.map((t) => ({
          id: t.id,
          label: t.label,
          kind: t.kind,
          tier: t.tier,
          status: t.status,
          sort: t.sort,
          currentVersionId: t.current_version_id,
          thumbnailUrl: t.thumbnail_url,
        })),
        specDefs,
      );
    } catch (err) {
      console.warn("Template catalog unavailable; using built-in templates only.", err);
      setTemplateCatalog(null, []);
    } finally {
      ready = true;
    }
  })();
  return loading;
}

/** Reload after staff publish or edit a template in Studio. */
export function reloadTemplateCatalog() {
  loading = null;
  ready = false;
  return loadTemplateCatalog();
}

/**
 * Templates for the gallery and a `ready` flag. Re-renders when the
 * catalog (or a registered template) changes.
 */
export function useTemplateCatalog() {
  useEffect(() => {
    loadTemplateCatalog();
  }, []);
  useSyncExternalStore(subscribeTemplates, templatesVersion);
  return { ready, templates: listTemplateDefinitions() };
}
