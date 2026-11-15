// Who we are, in one place, for search engines and AI answers (docs: Google "site names" and
// "Organization" structured data). The homepage carries this as JSON-LD (api/invite-page.ts →
// metaPage), and the social links here are the ones the site's footer shows (src/lib/social.ts).
//
// Nov 15 2026: Google's AI Overview for "the rsvp studio" was quoting RSVP.studio, a UK business
// (its domain is literally "rsvp studio"), because our homepage was an empty shell with nothing
// tying the site to our profiles. "the Philippines" next to the name keeps us apart from them.

export const SITE_URL = "https://thersvpstudio.com";
export const BRAND = "The RSVP Studio";

export const FACEBOOK_URL = "https://www.facebook.com/p/The-RSVP-Studio-61590604769707/";
export const MESSENGER_URL = "https://m.me/61590604769707";
export const INSTAGRAM_URL = "https://www.instagram.com/rsvpstudioo/";
export const INSTAGRAM_DM_URL = "https://ig.me/m/rsvpstudioo";
export const TIKTOK_URL = "https://www.tiktok.com/@rsvpstudioo";

/** One sentence on who we are, said the same way everywhere (the footer shows it too). */
export const BRAND_LINE = "The RSVP Studio makes event websites, invitations and stationery for celebrations across the Philippines.";

/** The homepage hero's words (src/pages/home/components/Hero.tsx shows the same). */
export const HOME_H1 = "Event websites, invitations and stationery for every celebration";
export const HOME_SUB = "Weddings, birthdays, christenings and more, with RSVPs built in. Websites from ₱3,000.";

/** Organization + WebSite structured data for the homepage. */
export function brandLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BRAND,
        alternateName: ["RSVP Studio Philippines", "thersvpstudio.com"],
        url: `${SITE_URL}/`,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/monogram-dark.png` },
        email: "hello@thersvpstudio.com",
        description,
        areaServed: { "@type": "Country", name: "Philippines" },
        address: { "@type": "PostalAddress", addressCountry: "PH" },
        sameAs: [FACEBOOK_URL, INSTAGRAM_URL, TIKTOK_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: BRAND,
        alternateName: ["RSVP Studio Philippines"],
        url: `${SITE_URL}/`,
        inLanguage: "en-PH",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}
