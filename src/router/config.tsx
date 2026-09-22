import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Services from "../pages/services/page";
import MilestoneEventsWebsite from "../pages/services/milestone/page";
import MonogramDesignService from "../pages/services/monogram/page";
import DigitalSaveTheDate from "../pages/services/savethedate/page";
import StationeryDesign from "../pages/services/stationery/page";
import RsvpManagement from "../pages/services/rsvp/page";
import Collections from "../pages/collections/page";
import Portfolio from "../pages/portfolio/page";
import PortfolioDetail from "../pages/portfolio/detail";
import Faqs from "../pages/faqs/page";
import Enquire from "../pages/enquire/page";
import PartnerInquiry from "../pages/enquire/partner";
import Blog from "../pages/blog/page";
import Privacy from "../pages/legal/privacy";
import Terms from "../pages/legal/terms";
import AccountDashboard from "../pages/account/page";
import AccountOnboarding from "../pages/account/onboarding";
import PreviewHarnessPage from "../pages/wedding-sites/preview/PreviewHarnessPage";
import PublicEventSitePage from "../pages/wedding-sites/public/PublicEventSitePage";
import BuilderShellPage from "../pages/wedding-sites/builder/BuilderShellPage";
import TemplateGalleryPage from "../pages/wedding-sites/builder/TemplateGalleryPage";
import BuildLandingPage from "../pages/wedding-sites/builder/BuildLandingPage";

const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  { path: "/services", element: <Services /> },
  { path: "/services/milestone", element: <MilestoneEventsWebsite /> },
  { path: "/services/monogram", element: <MonogramDesignService /> },
  { path: "/services/save-the-date", element: <DigitalSaveTheDate /> },
  { path: "/services/stationery", element: <StationeryDesign /> },
  { path: "/services/rsvp", element: <RsvpManagement /> },
  { path: "/collections", element: <Collections /> },
  { path: "/portfolio", element: <Portfolio /> },
  { path: "/portfolio/:slug", element: <PortfolioDetail /> },
  { path: "/faqs", element: <Faqs /> },
  { path: "/blog", element: <Blog /> },
  { path: "/enquire", element: <Enquire /> },
  { path: "/enquire/partner", element: <PartnerInquiry /> },
  { path: "/privacy", element: <Privacy /> },
  { path: "/terms", element: <Terms /> },
  { path: "/account", element: <AccountDashboard /> },
  { path: "/account/onboarding", element: <AccountOnboarding /> },
  { path: "/invite/:slug", element: <PublicEventSitePage /> },
  { path: "/build", element: <BuildLandingPage /> },
  { path: "/account/events/:eventId/site-builder", element: <TemplateGalleryPage /> },
  { path: "/account/events/:eventId/site-builder/edit", element: <BuilderShellPage /> },
  // Dev-only harness for building/QA-ing event-site templates against
  // fixture content — never shipped to production.
  ...(import.meta.env.DEV
    ? [{ path: "/internal/event-site-preview", element: <PreviewHarnessPage /> }]
    : []),
  { path: "*", element: <NotFound /> },
];

export default routes;
