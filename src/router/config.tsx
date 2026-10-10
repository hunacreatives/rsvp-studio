import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

// Marketing pages load up front; the dashboard, Studio, builder and invite pages
// load on demand, so a first visit (or a guest opening an invite) downloads less.
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
const RatePage = lazy(() => import("../pages/rate/page"));
const AccountOnboarding = lazy(() => import("../pages/account/onboarding"));
const PortalLayout = lazy(() => import("../pages/account/portal/PortalLayout"));
const PortalHome = lazy(() => import("../pages/account/portal/pages/HomePage"));
const PortalProjects = lazy(() => import("../pages/account/portal/pages/ProjectsPage"));
const PortalProjectDetail = lazy(() => import("../pages/account/portal/pages/ProjectDetailPage"));
const PortalBilling = lazy(() => import("../pages/account/portal/pages/BillingPage"));
const PortalInvoice = lazy(() => import("../pages/account/portal/pages/InvoicePage"));
const PortalAccount = lazy(() => import("../pages/account/portal/pages/AccountPage"));
const PortalMessages = lazy(() => import("../pages/account/portal/pages/MessagesPage"));
const PortalHelp = lazy(() => import("../pages/account/portal/pages/HelpPage"));
const PortalContactSupport = lazy(() => import("../pages/account/portal/pages/ContactSupportPage"));
const PortalGuide = lazy(() => import("../pages/account/portal/pages/GuidePage"));
const StudioLayout = lazy(() => import("../pages/studio/StudioLayout"));
const StudioOverview = lazy(() => import("../pages/studio/pages/OverviewPage"));
const StudioProjects = lazy(() => import("../pages/studio/pages/ProjectsPage"));
const StudioInboxPage = lazy(() => import("../pages/studio/pages/InboxPage"));
const StudioInvoices = lazy(() => import("../pages/studio/pages/InvoicesPage"));
const StudioClients = lazy(() => import("../pages/studio/pages/ClientsPage"));
const StudioTeam = lazy(() => import("../pages/studio/pages/TeamPage"));
const StudioSupport = lazy(() => import("../pages/studio/pages/SupportPage"));
const StudioLeads = lazy(() => import("../pages/studio/pages/LeadsPage"));
const StudioTemplates = lazy(() => import("../pages/studio/templates/TemplatesPage"));
const StudioTemplateNew = lazy(() => import("../pages/studio/templates/TemplateNewPage"));
const StudioTemplateDetail = lazy(() => import("../pages/studio/templates/TemplateDetailPage"));
const StudioTemplateImport = lazy(() => import("../pages/studio/templates/TemplateImportPage"));
const PreviewHarnessPage = lazy(() => import("../pages/wedding-sites/preview/PreviewHarnessPage"));
const PublicEventSitePage = lazy(() => import("../pages/wedding-sites/public/PublicEventSitePage"));
const BuilderShellPage = lazy(() => import("../pages/wedding-sites/builder/BuilderShellPage"));
const TemplateGalleryPage = lazy(() => import("../pages/wedding-sites/builder/TemplateGalleryPage"));
const BuildLandingPage = lazy(() => import("../pages/wedding-sites/builder/BuildLandingPage"));

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
  { path: "/rate", element: <RatePage /> },
  {
    path: "/account",
    element: <PortalLayout />,
    children: [
      { index: true, element: <PortalHome /> },
      { path: "projects", element: <PortalProjects /> },
      { path: "projects/:projectId", element: <PortalProjectDetail /> },
      { path: "billing", element: <PortalBilling /> },
      { path: "billing/:invoiceId", element: <PortalInvoice /> },
      { path: "settings", element: <PortalAccount /> },
      { path: "messages", element: <PortalMessages /> },
      { path: "help", element: <PortalHelp /> },
      { path: "help/contact", element: <PortalContactSupport /> },
      { path: "help/guides/:slug", element: <PortalGuide /> },
    ],
  },
  { path: "/account/onboarding", element: <AccountOnboarding /> },
  {
    path: "/studio",
    element: <StudioLayout />,
    children: [
      { index: true, element: <StudioOverview /> },
      { path: "projects", element: <StudioProjects /> },
      { path: "inbox", element: <StudioInboxPage /> },
      { path: "support", element: <StudioSupport /> },
      { path: "leads", element: <StudioLeads /> },
      { path: "invoices", element: <StudioInvoices /> },
      { path: "clients", element: <StudioClients /> },
      { path: "team", element: <StudioTeam /> },
      { path: "templates", element: <StudioTemplates /> },
      { path: "templates/new", element: <StudioTemplateNew /> },
      { path: "templates/import", element: <StudioTemplateImport /> },
      { path: "templates/:templateId", element: <StudioTemplateDetail /> },
    ],
  },
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
