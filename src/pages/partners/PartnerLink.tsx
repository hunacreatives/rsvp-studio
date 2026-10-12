import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { rememberVisit } from "@/lib/signupRef";

// A partner's short link: thersvpstudio.com/p/CODE. Notes the code (their clients
// get the partner discount and the partner earns commission), counts the click,
// then shows the homepage.
export default function PartnerLink() {
  const { code = "" } = useParams<{ code: string }>();
  useEffect(() => {
    rememberVisit(`?partner=${encodeURIComponent(code)}`, document.referrer);
  }, [code]);
  return <Navigate to="/" replace />;
}
