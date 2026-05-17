import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import Services from "../pages/services/page";
import Collections from "../pages/collections/page";
import Portfolio from "../pages/portfolio/page";
import Monogram from "../pages/monogram/page";
import MonogramDetail from "../pages/monogram/detail";
import Faqs from "../pages/faqs/page";
import Enquire from "../pages/enquire/page";

const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  { path: "/services", element: <Services /> },
  { path: "/collections", element: <Collections /> },
  { path: "/portfolio", element: <Portfolio /> },
  { path: "/monogram", element: <Monogram /> },
  { path: "/monogram/:id", element: <MonogramDetail /> },
  { path: "/faqs", element: <Faqs /> },
  { path: "/enquire", element: <Enquire /> },
  { path: "*", element: <NotFound /> },
];

export default routes;
