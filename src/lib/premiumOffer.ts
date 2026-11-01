// The launch offer: Premium websites free to publish until the end of Nov 27 2026 (Manila). The price in
// site_prices is ₱0 until then and a database job puts ₱499 back on Nov 28 (supabase premium-free-month), so the
// words follow the price: "Free until Nov 27" only while it is ₱0 and the offer is on.
export const OFFER_ENDS = Date.parse("2026-11-28T00:00:00+08:00");
export const PREMIUM_AFTER = 499;
export const offerOn = (premiumPrice: number | undefined) => premiumPrice === 0 && Date.now() < OFFER_ENDS;
