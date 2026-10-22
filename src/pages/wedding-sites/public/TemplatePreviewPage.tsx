import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTemplateCatalog } from "../engine/catalog";
import { getTemplateDefinition } from "../engine/registry";
import { resolveTemplate } from "../engine/render";
import { SiteCreditProvider } from "../engine/siteCredit";
import { normalizeEventContent } from "../content/normalize";
import { isabellaAndMateo } from "../content/fixtures/isabella-and-mateo";

// /build/preview/:templateId — anyone can open a design as a full demo site
// before signing up. Sample content only; the RSVP form doesn't send anything
// (templates only post RSVPs on a published page). "Use this design" goes back to
// /build with the choice, which asks them to sign up and opens the builder with it.

export default function TemplatePreviewPage() {
  const { templateId = "" } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { ready } = useTemplateCatalog();
  const definition = getTemplateDefinition(templateId);
  const resolved = definition ? resolveTemplate({ activeTemplateId: templateId, byTemplate: {} }) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [templateId]);

  if (!definition || !resolved) {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-[var(--warm-white)] px-6 text-center">
        {ready ? (
          <div>
            <p className="font-display text-[1.6rem] font-semibold text-[var(--ink)]">That design isn’t available</p>
            <Link to="/build#designs" className="btn btn-primary mt-6 inline-flex">
              See all designs
            </Link>
          </div>
        ) : (
          <div className="h-2 w-40 animate-pulse rounded-full bg-[var(--paper)]" aria-label="Loading" />
        )}
      </div>
    );
  }

  const content = normalizeEventContent(definition.demoContent ?? isabellaAndMateo);
  const Template = resolved.definition.component;
  return (
    <div className="min-h-[100svh] bg-[#f5f5f2]">
      {/* The bar stays on top while they scroll the demo. */}
      <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-black/10 bg-white/95 px-4 py-2.5 backdrop-blur md:px-6">
        <Link to="/build#designs" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-[14px] text-[var(--slate)] hover:text-[var(--ink)]">
          <i className="ri-arrow-left-line text-[18px]" aria-hidden /> <span className="hidden sm:inline">All designs</span><span className="sr-only sm:hidden">All designs</span>
        </Link>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[var(--ink)]">
          {definition.label}
          <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold ${definition.tier === "premium" ? "bg-[var(--acc-yellow)] text-[var(--ink)]" : "bg-[var(--paper)] text-[var(--slate)]"}`}>
            {definition.tier === "premium" ? "Premium" : "Free"}
          </span>
          <span className="ml-2 hidden text-[13px] font-normal text-[var(--slate)] md:inline">A sample. Your names, photos and details go in its place.</span>
        </p>
        <button onClick={() => navigate(`/build?start=${encodeURIComponent(templateId)}`)} className="btn btn-primary !px-5 !py-2.5 !text-[12px]">
          Use this design
        </button>
      </div>
      <SiteCreditProvider value={{ show: true }}>
        <Template content={content} settings={resolved.settings} demo />
      </SiteCreditProvider>
    </div>
  );
}
