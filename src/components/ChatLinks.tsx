import { BOOKING_URL, INSTAGRAM_DM_URL, MESSENGER_URL } from "@/lib/social";
import { trackEvent } from "@/lib/analytics";

/** "Prefer to chat?" — Messenger and Instagram DM buttons (they open the apps), and
 *  "Book a call" when a booking page is set (VITE_BOOKING_URL). */
export default function ChatLinks({ className = "", align = "left" }: { className?: string; align?: "left" | "center" }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${align === "center" ? "justify-center" : ""} ${className}`}>
      {/* The label takes its own line on phones, so both buttons sit side by side. */}
      <span className={`w-full text-[14px] text-[var(--slate)] sm:mr-1 sm:w-auto ${align === "center" ? "text-center" : ""}`}>Prefer to chat?</span>
      <a
        href={MESSENGER_URL}
        onClick={() => trackEvent("contact", { channel: "messenger" })}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-[14px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
      >
        <i className="ri-messenger-line text-[18px]" style={{ color: "#0866ff" }} aria-hidden /> Messenger
      </a>
      <a
        href={INSTAGRAM_DM_URL}
        onClick={() => trackEvent("contact", { channel: "instagram" })}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-[14px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
      >
        <i className="ri-instagram-line text-[18px]" style={{ color: "#d62976" }} aria-hidden /> Instagram
      </a>
      {BOOKING_URL ? (
        <a
          href={BOOKING_URL}
          onClick={() => trackEvent("contact", { channel: "booking" })}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-[14px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
        >
          <i className="ri-calendar-line text-[18px] text-[var(--acc-blue)]" aria-hidden /> Book a call
        </a>
      ) : null}
    </div>
  );
}

/** The same ways to reach us as rows (icon, name, what to expect): the Contact page and the
 *  "Need a hand?" sheet, where a wrapping row of pills looked broken. */
export function ContactRows({ email }: { email?: string }) {
  const rows = [
    { href: MESSENGER_URL, channel: "messenger", icon: "ri-messenger-line", color: "#0866ff", name: "Messenger", sub: "Chat in the app" },
    { href: INSTAGRAM_DM_URL, channel: "instagram", icon: "ri-instagram-line", color: "#d62976", name: "Instagram", sub: "Send us a DM" },
    ...(BOOKING_URL ? [{ href: BOOKING_URL, channel: "booking", icon: "ri-calendar-line", color: "var(--acc-blue)", name: "Book a call", sub: "Pick a time that suits you" }] : []),
    ...(email ? [{ href: `mailto:${email}`, channel: "email", icon: "ri-mail-line", color: "var(--ink)", name: email, sub: "Email us" }] : []),
  ];
  return (
    <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      {rows.map((r) => (
        <li key={r.channel}>
          <a
            href={r.href}
            onClick={() => trackEvent("contact", { channel: r.channel })}
            target={r.channel === "email" ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="flex min-h-[56px] items-center gap-3.5 px-4 py-2.5 no-underline transition-colors hover:bg-[var(--paper)]"
          >
            <i className={`${r.icon} text-[20px]`} style={{ color: r.color }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-[var(--ink)]">{r.name}</span>
              <span className="block text-[13px] text-[var(--slate)]">{r.sub}</span>
            </span>
            <i className="ri-arrow-right-up-line text-[16px] text-[var(--slate)]" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
