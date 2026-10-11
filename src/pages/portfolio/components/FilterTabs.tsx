import { useEffect, useRef } from "react";

/**
 * Category tabs shared by /collections and /portfolio.
 * Phones: one sideways-scrolling row of 44px pills (with an edge fade hinting
 * there's more). sm and up: the original centred, underlined text tabs.
 */
export default function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  // Keep the active pill visible on phones (e.g. arriving via /portfolio#stationery).
  useEffect(() => {
    const row = rowRef.current;
    const active = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    const target = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [value]);

  return (
    <div className="relative -mx-6 sm:mx-0">
      <div
        ref={rowRef}
        role="group"
        aria-label={label}
        className="flex snap-x gap-2 overflow-x-auto scroll-px-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-3 sm:overflow-visible sm:px-0"
      >
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o)}
              className={`min-h-[44px] shrink-0 snap-start whitespace-nowrap rounded-full border px-4 text-[13px] font-medium uppercase tracking-[0.1em] transition-colors sm:min-h-0 sm:rounded-none sm:border-0 sm:border-b sm:px-0 sm:pb-1 sm:text-sm sm:tracking-[0.14em] ${
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white sm:bg-transparent sm:text-[var(--ink)]"
                  : "border-[var(--line)] bg-white text-[var(--slate)] hover:text-[var(--ink)] sm:border-transparent sm:bg-transparent"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--warm-white)] sm:hidden"
      />
    </div>
  );
}
