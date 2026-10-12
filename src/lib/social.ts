// The studio's social links. Messenger and Instagram DMs open a chat with the page
// (Facebook retired the on-site chat bubble in 2024, so chats happen in the apps and
// arrive in the page inbox — Meta Business Suite — not in Studio).
export const FACEBOOK_URL = "https://www.facebook.com/p/The-RSVP-Studio-61590604769707/";
export const MESSENGER_URL = "https://m.me/61590604769707";
export const INSTAGRAM_URL = "https://www.instagram.com/rsvpstudioo/";
export const INSTAGRAM_DM_URL = "https://ig.me/m/rsvpstudioo";
// "Book a call": a Google Calendar appointment schedule (VITE_BOOKING_URL in Vercel).
// Unset = the booking buttons don't show.
export const BOOKING_URL: string | null = (import.meta.env.VITE_BOOKING_URL as string | undefined)?.trim() || null;
