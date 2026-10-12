import { BOOKING_URL, INSTAGRAM_DM_URL, MESSENGER_URL } from "@/lib/social";

/** "Prefer to chat?" — Messenger and Instagram DM buttons (they open the apps), and
 *  "Book a call" when a booking page is set (VITE_BOOKING_URL). */
export default function ChatLinks({ className = "", align = "left" }: { className?: string; align?: "left" | "center" }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${align === "center" ? "justify-center" : ""} ${className}`}>
      {/* The label takes its own line on phones, so both buttons sit side by side. */}
      <span className={`w-full text-[14px] text-[var(--slate)] sm:mr-1 sm:w-auto ${align === "center" ? "text-center" : ""}`}>Prefer to chat?</span>
      <a
        href={MESSENGER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-[14px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
      >
        <i className="ri-messenger-line text-[18px]" style={{ color: "#0866ff" }} aria-hidden /> Messenger
      </a>
      <a
        href={INSTAGRAM_DM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-[14px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
      >
        <i className="ri-instagram-line text-[18px]" style={{ color: "#d62976" }} aria-hidden /> Instagram
      </a>
      {BOOKING_URL ? (
        <a
          href={BOOKING_URL}
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
