import { createContext, useContext, type CSSProperties } from "react";

// "Made with love by The RSVP Studio · Make your own" at the foot of EVERY
// site — free, Premium and studio projects alike (Francis, Oct 11 2026).
// Templates draw it in their own footer style; the link carries the site's
// slug so Studio can count the signups it brings. `show` stays as a switch
// in case a future plan ever turns it off.

export type SiteCredit = { show: boolean; slug?: string };

const SiteCreditContext = createContext<SiteCredit>({ show: true });
export const SiteCreditProvider = SiteCreditContext.Provider;
export const useSiteCredit = () => useContext(SiteCreditContext);

export function creditHref(slug?: string) {
  return `https://thersvpstudio.com/build${slug ? `?ref=${encodeURIComponent(slug)}&via=site` : ""}`;
}

/** The credit's words and links; the template supplies the footer around it. */
export function CreditLine({ linkStyle }: { linkStyle?: CSSProperties }) {
  const { slug } = useSiteCredit();
  const href = creditHref(slug);
  return (
    <>
      Made with love by{" "}
      <a href={href} target="_blank" rel="noopener" style={linkStyle}>
        The RSVP Studio
      </a>
      {" · "}
      <a href={href} target="_blank" rel="noopener" style={linkStyle}>
        Make your own
      </a>
    </>
  );
}
