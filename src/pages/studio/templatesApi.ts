import { supabase } from "@/lib/supabase";
import { parseSpec, type TemplateSpec } from "@/pages/wedding-sites/spec/schema";

// Studio → Templates: staff-only reads and writes for uploadable templates.
// RLS allows these only for profiles.is_staff (supabase/templates-schema.sql).

export type TemplateStatus = "draft" | "listed" | "hidden" | "retired";
export interface TemplateRow {
  id: string;
  label: string;
  kind: "code" | "spec";
  tier: "free" | "premium";
  status: TemplateStatus;
  event_types: string[];
  sort: number;
  thumbnail_url: string | null;
  current_version_id: string | null;
  updated_at: string;
}
export interface VersionRow {
  id: string;
  template_id: string;
  version: number;
  status: "draft" | "published" | "archived";
  spec: unknown;
  qa: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
}

const must = <T,>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

export async function listTemplates(): Promise<TemplateRow[]> {
  return must(await supabase.from("templates").select("*").order("sort").order("label")) as TemplateRow[];
}

export async function getTemplate(id: string): Promise<{ template: TemplateRow; versions: VersionRow[] }> {
  const template = must(await supabase.from("templates").select("*").eq("id", id).single()) as TemplateRow;
  const versions = must(
    await supabase.from("template_versions").select("id, template_id, version, status, spec, qa, published_at, created_at").eq("template_id", id).order("version", { ascending: false }),
  ) as VersionRow[];
  return { template, versions };
}

export async function updateTemplate(id: string, patch: Partial<Pick<TemplateRow, "label" | "tier" | "status" | "event_types" | "sort" | "thumbnail_url">>) {
  must(await supabase.from("templates").update(patch).eq("id", id));
}

const slugifyId = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
export const templateIdFrom = slugifyId;

/**
 * Upload a template's art and point the spec's assets at it. A spec asset
 * whose `url` is a bare file name ("card.webp") is matched to the uploaded
 * file of that name; site paths and full URLs are kept as they are.
 */
export async function uploadAssets(templateId: string, version: number, spec: TemplateSpec, files: File[]): Promise<{ spec: TemplateSpec; missing: string[] }> {
  const byName = new Map(files.map((f) => [f.name, f]));
  const assets: TemplateSpec["assets"] = {};
  const missing: string[] = [];
  for (const [key, asset] of Object.entries(spec.assets)) {
    if (/^(https?:)?\/\//.test(asset.url) || asset.url.startsWith("/")) {
      assets[key] = asset;
      continue;
    }
    const file = byName.get(asset.url);
    if (!file) {
      missing.push(asset.url);
      assets[key] = asset;
      continue;
    }
    const path = `${templateId}/v${version}/${file.name.replace(/[^\w.-]+/g, "_")}`;
    must(await supabase.storage.from("template-assets").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "31536000" }));
    assets[key] = { ...asset, url: supabase.storage.from("template-assets").getPublicUrl(path).data.publicUrl };
  }
  return { spec: { ...spec, assets }, missing };
}

/**
 * Create a new template (draft) or a new draft version of an existing one,
 * from a validated spec + its art files.
 */
export async function createDraftVersion(input: {
  templateId: string;
  label: string;
  tier: "free" | "premium";
  eventTypes: string[];
  rawSpec: unknown;
  files: File[];
  /** New template (not a new version): refuse if the ID is taken. */
  isNew?: boolean;
}): Promise<{ versionId: string; missing: string[] }> {
  const parsed = parseSpec(input.rawSpec);
  if (!("spec" in parsed)) throw new Error(`The template file has problems:\n${parsed.errors.join("\n")}`);

  const existing = (await supabase.from("templates").select("id, kind").eq("id", input.templateId).maybeSingle()).data as { id: string; kind: string } | null;
  if (existing && input.isNew) throw new Error(`There's already a template with the ID "${input.templateId}". Pick a different name, or open it and upload a new version.`);
  if (existing && existing.kind !== "spec") throw new Error("Built-in templates can't take uploaded versions.");
  if (!existing) {
    must(
      await supabase.from("templates").insert({
        id: input.templateId,
        label: input.label,
        kind: "spec",
        tier: input.tier,
        status: "draft",
        event_types: input.eventTypes,
      }),
    );
  }
  const last = (await supabase.from("template_versions").select("version").eq("template_id", input.templateId).order("version", { ascending: false }).limit(1)).data;
  const version = ((last?.[0]?.version as number | undefined) ?? 0) + 1;

  const { spec, missing } = await uploadAssets(input.templateId, version, parsed.spec, input.files);
  const row = must(
    await supabase.from("template_versions").insert({ template_id: input.templateId, version, status: "draft", spec }).select("id").single(),
  ) as { id: string };
  return { versionId: row.id, missing };
}

/** Make a version the live one: publish it, point the template at it, list it. */
export async function publishVersion(templateId: string, versionId: string, qa: Record<string, unknown>) {
  const { data: auth } = await supabase.auth.getUser();
  must(
    await supabase
      .from("template_versions")
      .update({ status: "published", published_at: new Date().toISOString(), published_by: auth.user?.id ?? null, qa })
      .eq("id", versionId),
  );
  must(await supabase.from("templates").update({ current_version_id: versionId, status: "listed" }).eq("id", templateId));
}

/** Count live sites still using this template (any version). */
export async function sitesUsing(templateId: string): Promise<number> {
  const { count } = await supabase
    .from("wedding_sites")
    .select("id", { count: "exact", head: true })
    .eq("draft_presentation->>activeTemplateId", templateId);
  return count ?? 0;
}
