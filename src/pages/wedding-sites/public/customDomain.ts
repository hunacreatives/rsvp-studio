// Is this a customer's own web address (e.g. gelat30.net) rather than ours? Kept apart from
// CustomDomainSite so the app can check it without loading the event-site code up front.
const OWN_HOSTS = /(^|\.)thersvpstudio\.com$|\.vercel\.app$|^localhost$|^127\.0\.0\.1$/;
export const isCustomDomain = () => typeof window !== "undefined" && !OWN_HOSTS.test(window.location.hostname);
