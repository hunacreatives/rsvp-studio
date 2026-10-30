// Is this a customer's own web address (e.g. gelat30.net) rather than ours? Kept apart from
// CustomDomainSite so the app can check it without loading the event-site code up front.
// (and a computer on the home network, to try the site on a phone over Wi-Fi)
const OWN_HOSTS = /(^|\.)thersvpstudio\.com$|\.vercel\.app$|^localhost$|^127\.0\.0\.1$|^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./;
export const isCustomDomain = () => typeof window !== "undefined" && !OWN_HOSTS.test(window.location.hostname);
