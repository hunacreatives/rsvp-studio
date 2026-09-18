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
  { path: "*", element: <NotFound /> },
];

export default routes;
