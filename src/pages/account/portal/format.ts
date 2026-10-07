const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatMoney = (amount: number) => peso.format(amount);

/** Date-only columns ("2026-10-12") are parsed as local dates, not UTC midnight. */
function toDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export const formatDate = (value: string | null | undefined, opts?: Intl.DateTimeFormatOptions) =>
  value ? toDate(value).toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" }) : "";

export const formatLongDate = (value: string | null | undefined) =>
  formatDate(value, { month: "long", day: "numeric", year: "numeric" });

export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk} week${wk === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

/** Inbox-style stamp: time today, "Yesterday", else "Oct 8". */
export function inboxStamp(value: string) {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return formatTime(value);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initials(name: string | null | undefined) {
  return (
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function firstName(name: string | null | undefined, fallback = "there") {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || fallback;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  anniversary: "Anniversary",
  other: "Celebration",
};

/** "Wedding Website + Digital Invitations", falling back to the event type. */
export function servicesLabel(services: string[], eventType: string | null) {
  if (services.length) return services.join(" + ");
  return `${EVENT_TYPE_LABEL[eventType ?? ""] ?? "Event"} Website`;
}

/** One of the 10 default avatars (public/account/avatars), stable per person. */
export function defaultAvatar(seed: string | null | undefined) {
  let h = 0;
  for (const ch of seed ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `/account/avatars/avatar-${String((h % 10) + 1).padStart(2, "0")}.svg`;
}
