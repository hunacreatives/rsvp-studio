import ErrorBoundary from "@/components/ErrorBoundary";
import { loadPairingFonts } from "../presentation/loadFonts";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { normalizeEventContent } from "../content/normalize";
import { resolveTemplate } from "../engine/render";
import type { PresentationState } from "../presentation/types";
import NotFound from "../../NotFound";
import { getTemplateDefinition, registerTemplate } from "../engine/registry";
import { loadTemplateCatalog } from "../engine/catalog";
import { parseSpec } from "../spec/schema";
import { definitionFromSpec } from "../spec/definitionFromSpec";
import { SiteCreditProvider } from "../engine/siteCredit";

// The live, public event site: /invite/:slug. Reads ONLY the published_*
// columns (never draft_*) — see the RLS note in
// supabase/wedding-sites-schema.sql and Decision 6 in the decision log.

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "ready"; presentation: PresentationState; rawContent: unknown; premium: boolean };

export default function PublicEventSitePage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug) {
        setState({ status: "not-found" });
        return;
      }
      // get_public_site() returns only the published columns for one slug
      // (supabase/site-security-fixes.sql). Until that SQL is applied, fall
      // back to the direct table read so live sites never go dark.
      type Row = { published_content: unknown; published_presentation: unknown; template_spec?: unknown; is_premium?: boolean };
      let data: Row | null = null;
      let error: { code?: string } | null = null;
      const rpc = await supabase.rpc("get_public_site", { p_slug: slug });
      if (rpc.error?.code === "PGRST202") {
        const direct = await supabase
          .from("wedding_sites")
          .select("published_content, published_presentation")
          .eq("slug", slug)
          .not("published_at", "is", null)
          .maybeSingle();
        data = direct.data as Row | null;
        error = direct.error;
      } else {
        data = ((rpc.data as Row[] | null) ?? [])[0] ?? null;
        error = rpc.error;
      }

      if (cancelled) return;
      if (error || !data || !data.published_content) {
        setState({ status: "not-found" });
        return;
      }

      // Uploaded template: render the exact version this site was published
      // with (pinned), not whatever the template looks like today.
      const presentation = (data.published_presentation as PresentationState) ?? { activeTemplateId: "", byTemplate: {} };
      if (data.template_spec && presentation.activeTemplateId) {
        const parsed = parseSpec(data.template_spec);
        if ("spec" in parsed) {
          registerTemplate(
            definitionFromSpec({ id: presentation.activeTemplateId, label: presentation.activeTemplateId, tier: "free", spec: parsed.spec }),
          );
        }
      } else if (presentation.activeTemplateId && !getTemplateDefinition(presentation.activeTemplateId)) {
        await loadTemplateCatalog();
      }
      if (cancelled) return;

      setState({
        status: "ready",
        rawContent: data.published_content,
        // Premium sites don't show the "Made with The RSVP Studio" credit.
        premium: data.is_premium === true,
        presentation: (data.published_presentation as PresentationState) ?? {
          activeTemplateId: "",
          byTemplate: {},
        },
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") {
    return <div style={{ minHeight: "100vh" }} />;
  }
  if (state.status === "not-found") {
    return <NotFound />;
  }

  // The RSVP form posts content.slug; older publishes saved it empty, so
  // the URL is the source of truth.
  const content = { ...normalizeEventContent(state.rawContent), slug: slug ?? "" };
  const resolved = resolveTemplate(state.presentation);
  if (!resolved) {
    return <NotFound />;
  }

  loadPairingFonts(resolved.settings.fontPairingId);
  return (
    <ErrorBoundary
      fallback={() => (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
          <div style={{ maxWidth: 380 }}>
            <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "#000727" }}>This invitation didn’t load properly</p>
            <p style={{ fontSize: 16, color: "#55556a", margin: "10px 0 20px" }}>Please refresh the page. If it still doesn’t work, let the host know.</p>
            <button onClick={() => window.location.reload()} style={{ fontSize: 16, padding: "12px 24px", borderRadius: 999, border: "none", background: "#000727", color: "#fff", cursor: "pointer" }}>
              Refresh
            </button>
          </div>
        </div>
      )}
    >
      <SiteCreditProvider value={{ show: !state.premium, slug }}>
        <resolved.definition.component content={content} settings={resolved.settings} live />
      </SiteCreditProvider>
    </ErrorBoundary>
  );
}
