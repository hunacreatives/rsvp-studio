import { lazy, Suspense, useEffect } from "react";
import { applyPageMeta } from "@/lib/pageMeta";
import { rememberVisit } from "@/lib/signupRef";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "./router";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trackPage } from "@/lib/analytics";
import CharacterLoader from "@/components/CharacterLoader";
import LaunchGate from "@/components/LaunchGate";
import { isCustomDomain } from "@/pages/wedding-sites/public/customDomain";
// Only customers' own domains need the event-site code at startup: everyone else loads it on demand.
const CustomDomainSite = lazy(() => import("@/pages/wedding-sites/public/CustomDomainSite"));

/** One page crashing never blanks the whole site; moving to another page clears it. */
function Routes() {
  const { pathname } = useLocation();
  useEffect(() => applyPageMeta(pathname), [pathname]);
  // Google Analytics page views on our own pages (src/lib/analytics.ts).
  useEffect(() => {
    const t = setTimeout(() => trackPage(pathname), 300); // after the page's title is set
    return () => clearTimeout(t);
  }, [pathname]);
  // Where this visitor came from (once per visit; guests opening an invite aren't counted).
  useEffect(() => {
    if (!/^\/(invite|internal)\//.test(window.location.pathname.slice(__BASE_PATH__.replace(/\/$/, "").length))) rememberVisit();
  }, []);
  return (
    <LaunchGate pathname={pathname}>
    <ErrorBoundary resetKey={pathname}>
      {/* Guests opening an invite never see our studio cartoons — just a blank page. */}
      <Suspense
        fallback={
          /^\/(invite|internal)\//.test(pathname) ? <div style={{ minHeight: "100dvh", background: "var(--warm-white)" }} /> : <CharacterLoader fullScreen />
        }
      >
        <AppRoutes />
      </Suspense>
    </ErrorBoundary>
    </LaunchGate>
  );
}

function App() {
  // A customer's own web address: only their event site, whatever the path.
  if (isCustomDomain())
    return (
      <BrowserRouter>
        <Suspense fallback={<div style={{ minHeight: "100dvh", background: "var(--warm-white)" }} />}>
          <CustomDomainSite />
        </Suspense>
      </BrowserRouter>
    );
  return (
      <BrowserRouter basename={__BASE_PATH__}>
        <ScrollToTop />
        <Routes />
      </BrowserRouter>
  );
}

export default App;
