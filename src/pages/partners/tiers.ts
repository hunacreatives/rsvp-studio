// The partner tiers (supabase/partner-tiers.sql). Clients always get 10% off; partners
// earn more once they've sent more paying clients. Shown on /partners and the dashboard.
// Colours: Starter in the brand sky, Silver cool grey-blue, Gold warm gold.
export const PARTNER_TIERS = [
  { id: "starter", name: "Starter", rate: 10, at: 0, bg: "#e4f4fb", ink: "#0d5a75", accent: "#3fb6dc" },
  { id: "silver", name: "Silver", rate: 15, at: 5, bg: "#eceff4", ink: "#4a5568", accent: "#9aa5b8" },
  { id: "gold", name: "Gold", rate: 20, at: 15, bg: "#fdf1cf", ink: "#7a5a00", accent: "#e0a800" },
] as const;
