import { Suspense, useEffect } from "react";
import { applyPageMeta } from "@/lib/pageMeta";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "./router";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useSmoothScroll } from "@/lib/useSmoothScroll";

/** One page crashing never blanks the whole site; moving to another page clears it. */
function Routes() {
  const { pathname } = useLocation();
  useEffect(() => applyPageMeta(pathname), [pathname]);
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--warm-white)" }} />}>
        <AppRoutes />
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  useSmoothScroll();
  return (
      <BrowserRouter basename={__BASE_PATH__}>
        <ScrollToTop />
        <Routes />
      </BrowserRouter>
  );
}

export default App;
