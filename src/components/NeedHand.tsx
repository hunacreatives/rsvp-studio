import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ContactRows } from "@/components/ChatLinks";
import { SUPPORT } from "@/pages/account/portal/help-data";
import { trackEvent } from "@/lib/analytics";

// "Need a hand?": the same three ways out wherever people build (the website builder, Mesa,
// the dashboard): have the studio finish it (the enquiry form, already filled in from what
// they're making), chat with us, or a few quick answers for where they are.

export type QuickAnswer = { q: string; a: string };

export interface NeedHandProps {
  open: boolean;
  onClose(): void;
  /** "Have us finish it for you": the enquiry link (inquiryLink(…)) and what it costs. */
  finish?: { to: string; note: string } | null;
  answers: QuickAnswer[];
  /** Where it was opened, for the numbers (builder, mesa, dashboard…). */
  where: string;
}

export default function NeedHand({ open, onClose, finish, answers, where }: NeedHandProps) {
  const [opened, setOpened] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    trackEvent("help_open", { where });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, where]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-[rgba(0,7,39,0.45)] sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="need-hand-h" onClick={onClose} data-lenis-prevent>
      <div
        className="max-h-[min(88vh,88dvh)] w-full overflow-y-auto rounded-t-[26px] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5 text-[var(--ink)] sm:max-w-[460px] sm:rounded-[24px] sm:p-7"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="need-hand-h" className="font-display text-[24px] font-semibold leading-tight">
              Need a hand?
            </h2>
            <p className="mt-1 text-[14px] text-[var(--slate)]">A real person replies {SUPPORT.responseTime.toLowerCase()}, Monday to&nbsp;Friday.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5">
            <i className="ri-close-line text-[22px]" aria-hidden />
          </button>
        </div>

        {finish ? (
          <Link
            to={finish.to}
            onClick={() => trackEvent("help_finish", { where })}
            className="mt-5 flex items-center gap-4 rounded-2xl border border-[var(--line)] p-4 no-underline transition-colors hover:border-[var(--ink)]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--paper)] text-[20px] text-[var(--ink)]">
              <i className="ri-quill-pen-line" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-[var(--ink)]">Have us finish it for you</span>
              <span className="mt-0.5 block text-[13.5px] text-[var(--slate)]">{finish.note}</span>
            </span>
            <i className="ri-arrow-right-line text-[18px] text-[var(--slate)]" aria-hidden />
          </Link>
        ) : null}

        <div className="mt-5">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--slate)]">Chat with us</p>
          <ContactRows email={SUPPORT.email} />
        </div>

        {answers.length ? (
          <div className="mt-6">
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--slate)]">Quick answers</p>
            <ul className="mt-2 divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {answers.map((x, i) => (
                <li key={x.q}>
                  <button onClick={() => setOpened(opened === i ? null : i)} aria-expanded={opened === i} className="flex min-h-[48px] w-full items-center justify-between gap-3 py-2 text-left text-[15px] text-[var(--ink)]">
                    <span>{x.q}</span>
                    <i className={`ri-arrow-down-s-line shrink-0 text-[20px] text-[var(--slate)] transition-transform ${opened === i ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                  {opened === i ? <p className="pb-3 text-[14px] leading-relaxed text-[var(--slate)]">{x.a}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
