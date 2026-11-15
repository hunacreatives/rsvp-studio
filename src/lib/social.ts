// The studio's social links. Messenger and Instagram DMs open a chat with the page
// (Facebook retired the on-site chat bubble in 2024, so chats happen in the apps and
// arrive in the page inbox — Meta Business Suite — not in Studio).
// The links live in api/_lib/brand.ts, which the homepage's structured data uses too.
export { FACEBOOK_URL, MESSENGER_URL, INSTAGRAM_URL, INSTAGRAM_DM_URL, TIKTOK_URL } from "../../api/_lib/brand";
// "Book a call": a Google Calendar appointment schedule (VITE_BOOKING_URL in Vercel).
// Unset = the booking buttons don't show.
export const BOOKING_URL: string | null = (import.meta.env.VITE_BOOKING_URL as string | undefined)?.trim() || null;
