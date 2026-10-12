// A password-protected site's password, remembered for this browser tab so guests
// type it once (the site, its RSVP form and its photo page all use it).

const key = (slug: string) => `rs-site-pass:${slug.toLowerCase()}`;

export function getSitePassword(slug: string | undefined): string {
  if (!slug) return "";
  try {
    return sessionStorage.getItem(key(slug)) ?? "";
  } catch {
    return "";
  }
}

export function setSitePassword(slug: string, password: string) {
  try {
    sessionStorage.setItem(key(slug), password);
  } catch {
    /* storage blocked: they'll be asked again next time */
  }
}
