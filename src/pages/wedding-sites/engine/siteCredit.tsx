import { createContext, useContext, type CSSProperties } from "react";

// "Made with love by The RSVP Studio · Make your own" at the foot of EVERY
// site — free, Premium and studio projects alike (Francis, Oct 11 2026).
// Templates draw it in their own footer style; the link carries the site's
// slug so Studio can count the signups it brings. `show` stays as a switch
// in case a future plan ever turns it off.

/** `photosUrl`: Premium guest photo sharing is on — the footer links to the photo page. */
export type SiteCredit = { show: boolean; slug?: string; photosUrl?: string; tablesUrl?: string };

const SiteCreditContext = createContext<SiteCredit>({ show: true });
export const SiteCreditProvider = SiteCreditContext.Provider;
export const useSiteCredit = () => useContext(SiteCreditContext);

export function creditHref(slug?: string) {
  return `https://thersvpstudio.com/build${slug ? `?ref=${encodeURIComponent(slug)}&via=site` : ""}`;
}

/** The credit's words and links; the template supplies the footer around it. */
export function CreditLine({ linkStyle }: { linkStyle?: CSSProperties }) {
  const { slug, photosUrl, tablesUrl } = useSiteCredit();
  const href = creditHref(slug);
  // A 44px-tall tap area on phones without changing the footer's layout:
  // the padding is cancelled by an equal negative margin.
  const style: CSSProperties = { display: "inline-block", padding: "12px 2px", margin: "-12px 0", ...linkStyle };
  return (
    <>
      {tablesUrl ? (
        <>
          <a href={tablesUrl} style={{ ...style, fontWeight: 600 }}>
            Find your table
          </a>
          {" · "}
        </>
      ) : null}
      {photosUrl ? (
        <>
          <a href={photosUrl} style={{ ...style, fontWeight: 600 }}>
            Share your photos
          </a>
          {" · "}
        </>
      ) : null}
      Made with love by{" "}
      <a href={href} target="_blank" rel="noopener" style={style}>
        The RSVP Studio
      </a>
      {" · "}
      <a href={href} target="_blank" rel="noopener" style={style}>
        Make your own
      </a>
    </>
  );
}
