import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useSmoothScroll } from "@/lib/useSmoothScroll";

/** One page crashing never blanks the whole site; moving to another page clears it. */
function Routes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname}>
      <AppRoutes />
    </ErrorBoundary>
  );
}

function App() {
  useSmoothScroll();
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <ScrollToTop />
        <Routes />
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
