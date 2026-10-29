import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTemplateCatalog } from "../engine/catalog";
import { getTemplateDefinition } from "../engine/registry";
import { resolveTemplate } from "../engine/render";
import { SiteCreditProvider } from "../engine/siteCredit";
import { scrollToTopNow } from "@/lib/lenis";
import { normalizeEventContent } from "../content/normalize";
import { isabellaAndMateo } from "../content/fixtures/isabella-and-mateo";

// /build/preview/:templateId — anyone can open a design as a full demo site
// before signing up. Sample content only; the RSVP form doesn't send anything
// (templates only post RSVPs on a published page). "Use this design" goes back to
// /build with the choice, which asks them to sign up and opens the builder with it.
//
// The design is shown in a frame under the bar (?frame=1 is the design alone), so it gets the
// screen that's left: designs are built to fill a screen (100svh), and the bar would otherwise
// cut off their bottom. Inside the frame, scrolling and the designs' one-swipe stops work as on a
// published page.

export default function TemplatePreviewPage() {
  const { templateId = "" } = useParams<{ templateId: string }>();
  const [params] = useSearchParams();
  const framed = params.get("frame") === "1";
  const navigate = useNavigate();
  const { ready } = useTemplateCatalog();
  const definition = getTemplateDefinition(templateId);
  const resolved = definition ? resolveTemplate({ activeTemplateId: templateId, byTemplate: {} }) : undefined;

  useEffect(() => {
    scrollToTopNow();
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
  // the design alone, for the frame
  if (framed)
    return (
      <SiteCreditProvider value={{ show: true }}>
        <Template content={content} settings={resolved.settings} demo />
      </SiteCreditProvider>
    );
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f5f5f2]">
      <div className="relative z-50 flex shrink-0 items-center gap-3 border-b border-black/10 bg-white/95 px-4 py-2.5 backdrop-blur md:px-6">
        <Link to="/build#designs" className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-[14px] text-[var(--slate)] hover:text-[var(--ink)]">
          <i className="ri-arrow-left-line text-[18px]" aria-hidden /> <span className="hidden sm:inline">All designs</span><span className="sr-only sm:hidden">All designs</span>
        </Link>
        <p className="flex min-w-0 flex-1 items-center text-[15px] font-semibold text-[var(--ink)]">
          <span className="truncate">{definition.label}</span>
          <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold ${definition.tier === "premium" ? "bg-[var(--acc-yellow)] text-[var(--ink)]" : "bg-[var(--paper)] text-[var(--slate)]"}`}>
            {definition.tier === "premium" ? "Premium" : "Free"}
          </span>
          <span className="ml-2 hidden truncate text-[13px] font-normal text-[var(--slate)] md:inline">A sample. Your names, photos and details go in its place.</span>
        </p>
        <button onClick={() => navigate(`/build?start=${encodeURIComponent(templateId)}`)} className="btn btn-primary !px-5 !py-2.5 !text-[12px]">
          {/* Narrow phones: shorter, so the design's name and badge keep their room. */}
          <span className="hidden min-[380px]:inline">Use this design</span>
          <span className="min-[380px]:hidden">Use design</span>
        </button>
      </div>
      <iframe key={templateId} title={`${definition.label}, a sample`} src={`/build/preview/${encodeURIComponent(templateId)}?frame=1`} className="block min-h-0 w-full flex-1 border-0 bg-white" allow="fullscreen" />
    </div>
  );
}
