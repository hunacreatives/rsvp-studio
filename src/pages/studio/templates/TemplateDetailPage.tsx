import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, FilterTabs, OutlineCard, PillButton, StatusPill } from "@/pages/account/portal/ui";
import PreviewCanvas from "@/pages/wedding-sites/builder/components/PreviewCanvas";
import { reloadTemplateCatalog } from "@/pages/wedding-sites/engine/catalog";
import { defaultSectionVisibility } from "@/pages/wedding-sites/presentation/types";
import SpecTemplate from "@/pages/wedding-sites/spec/runtime/SpecTemplate";
import { parseSpec, type TemplateSpec } from "@/pages/wedding-sites/spec/schema";
import { StudioHeader } from "../StudioLayout";
import { getTemplate, publishVersion, sitesUsing, updateTemplate, type TemplateRow, type VersionRow } from "../templatesApi";
import { FIXTURES, useTemplateChecks } from "./checks";

type Device = "desktop" | "phone";

export default function TemplateDetailPage() {
  const { templateId = "" } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [fixtureId, setFixtureId] = useState(FIXTURES[0].id);
  const [device, setDevice] = useState<Device>("desktop");
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [signedOff, setSignedOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<number | null>(null);

  const load = async () => {
    const { template: t, versions: v } = await getTemplate(templateId);
    setTemplate(t);
    setVersions(v);
    setVersionId((cur) => cur ?? v.find((x) => x.status === "draft")?.id ?? t.current_version_id ?? v[0]?.id ?? null);
  };
  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
    sitesUsing(templateId).then(setUsage).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const version = versions.find((v) => v.id === versionId) ?? null;
  const spec: TemplateSpec | null = useMemo(() => {
    if (!version) return null;
    const parsed = parseSpec(version.spec);
    return "spec" in parsed ? parsed.spec : null;
  }, [version]);
  const { results, blocking } = useTemplateChecks(spec);
  const fixture = FIXTURES.find((f) => f.id === fixtureId) ?? FIXTURES[0];
  const isLive = template?.current_version_id === versionId && version?.status === "published";

  const publish = async () => {
    if (!template || !version || !spec) return;
    setBusy(true);
    setError(null);
    try {
      await publishVersion(template.id, version.id, {
        checkedAt: new Date().toISOString(),
        results: results.map(({ id, status }) => ({ id, status })),
        signedOff,
      });
      await reloadTemplateCatalog();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: TemplateRow["status"]) => {
    if (!template) return;
    await updateTemplate(template.id, { status });
    await reloadTemplateCatalog();
    await load();
  };

  if (!template) {
    return <p className="text-[var(--slate)]">{error ?? "Loading template…"}</p>;
  }

  return (
    <>
      <Link to="/studio/templates" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--slate)] hover:text-[var(--ink)]">
        <i className="ri-arrow-left-line" /> Templates
      </Link>
      <StudioHeader
        title={template.label}
        sub={`${template.tier === "premium" ? "Premium" : "Free"} · ${template.status === "listed" ? "In the gallery" : template.status}${usage !== null ? ` · used by ${usage} site${usage === 1 ? "" : "s"}` : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            {template.status === "listed" ? (
              <PillButton onClick={() => setStatus("hidden")}>Hide from gallery</PillButton>
            ) : template.current_version_id ? (
              <PillButton onClick={() => setStatus("listed")}>Show in gallery</PillButton>
            ) : null}
            <PillButton onClick={() => navigate(`/studio/templates/new?for=${encodeURIComponent(template.id)}`)}>Upload new version</PillButton>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <FilterTabs<Device>
              value={device}
              onChange={setDevice}
              options={[
                { value: "desktop", label: "Desktop" },
                { value: "phone", label: "Phone" },
              ]}
            />
            <select value={fixtureId} onChange={(e) => setFixtureId(e.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[13px]">
              {FIXTURES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            {spec && spec.tokens.palettes.length > 1 ? (
              <select value={paletteId ?? spec.tokens.defaultPaletteId} onChange={(e) => setPaletteId(e.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[13px]">
                {spec.tokens.palettes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="flex h-[78vh] flex-col overflow-hidden rounded-[22px] border border-[var(--line)]">
            {spec ? (
              <PreviewCanvas deviceWidth={device === "phone" ? 390 : 1024}>
                <SpecTemplate
                  spec={spec}
                  content={fixture.content}
                  editorPreview={fixture.editor}
                  settings={{ paletteId: paletteId ?? spec.tokens.defaultPaletteId, fontPairingId: "", sectionVisibility: { ...defaultSectionVisibility } }}
                />
              </PreviewCanvas>
            ) : (
              <p className="p-8 text-[#c2412d]">This version’s template file doesn’t pass validation.</p>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <OutlineCard className="p-5">
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">Version</p>
            <div className="space-y-1.5">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVersionId(v.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] ${v.id === versionId ? "bg-[var(--paper)]" : "hover:bg-[var(--paper)]"}`}
                >
                  <span>
                    v{v.version} <span className="text-[12px] text-[var(--slate)]">· {formatDate(v.published_at ?? v.created_at)}</span>
                  </span>
                  <StatusPill tone={v.id === template.current_version_id ? "lime" : v.status === "draft" ? "lavender" : "grey"}>
                    {v.id === template.current_version_id ? "Live" : v.status}
                  </StatusPill>
                </button>
              ))}
            </div>
          </OutlineCard>

          <OutlineCard className="p-5">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">Checklist</p>
            <ul className="space-y-2.5">
              {results.map((r) => (
                <li key={r.id} className="flex gap-2.5 text-[14px]">
                  <i
                    className={
                      r.status === "pass"
                        ? "ri-checkbox-circle-fill text-[var(--acc-green)]"
                        : r.status === "warn"
                          ? "ri-error-warning-fill text-[#d99a0b]"
                          : r.status === "fail"
                            ? "ri-close-circle-fill text-[#c2412d]"
                            : "ri-loader-4-line animate-spin text-[var(--slate)]"
                    }
                  />
                  <span>
                    <span className="text-[var(--ink)]">{r.label}</span>
                    {r.detail ? <span className="block text-[12px] text-[var(--slate)]">{r.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            <label className="mt-4 flex items-start gap-2.5 text-[14px] text-[var(--ink)]">
              <input type="checkbox" checked={signedOff} onChange={(e) => setSignedOff(e.target.checked)} className="mt-1" />
              I checked it at desktop and phone size, with every sample event, and it matches the design.
            </label>
            <ErrorText>{error}</ErrorText>
            {isLive ? (
              <p className="mt-4 rounded-xl bg-[#ecfbcc] px-3 py-2 text-[13px] text-[#3d5a12]">This version is live in the gallery.</p>
            ) : (
              <PillButton tone="primary" className="mt-4 w-full !py-2.5" disabled={busy || blocking || !signedOff || !spec} onClick={publish}>
                {busy ? "Publishing…" : "Publish to gallery"}
              </PillButton>
            )}
            {!isLive && blocking ? <p className="mt-2 text-[12px] text-[var(--slate)]">Fix the red items to publish.</p> : null}
          </OutlineCard>
        </aside>
      </div>
    </>
  );
}
