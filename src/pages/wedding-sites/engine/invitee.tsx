import { createContext, useContext } from "react";

// A guest who opened their personal link (/invite/<slug>?g=<token>, supabase/guest-links.sql):
// their name and seats prefill the RSVP form, and the reply is tied to them. On Premium sites
// the seats are a limit. `null` = an ordinary visitor.

export type Invitee = { token: string; name: string; seats: number | null; table: string | null; replied: boolean; seatLimit: boolean };

const InviteeContext = createContext<Invitee | null>(null);
export const InviteeProvider = InviteeContext.Provider;
export const useInvitee = () => useContext(InviteeContext);

const key = (slug: string) => `rs-invitee:${slug.toLowerCase()}`;

/** The token from the link, kept for this tab so moving around the site doesn't lose it. */
export function inviteeToken(slug: string | undefined): string {
  if (!slug || typeof window === "undefined") return "";
  const fromUrl = new URLSearchParams(window.location.search).get("g")?.trim() ?? "";
  try {
    if (/^[a-z0-9]{8,40}$/i.test(fromUrl)) sessionStorage.setItem(key(slug), fromUrl);
    return sessionStorage.getItem(key(slug)) ?? "";
  } catch {
    return /^[a-z0-9]{8,40}$/i.test(fromUrl) ? fromUrl : "";
  }
}
