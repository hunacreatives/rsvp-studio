import { PARTNER_TIERS } from "./tiers";

/** The three partner tiers as cards (/partners): the rate, when it starts, and what it means on a booking. */
export default function TierCards() {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {PARTNER_TIERS.map((t) => (
        <li key={t.id} className="rounded-[22px] px-6 py-6" style={{ background: t.bg, color: t.ink }}>
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} aria-hidden />
            {t.name}
          </p>
          <p className="mt-2 font-display text-[2.6rem] font-semibold leading-none">{t.rate}%</p>
          <p className="mt-3 text-[15px]">{t.at ? `After ${t.at} paying clients` : "From your first client"}</p>
          <p className="mt-1 text-[14px] opacity-80">₱{((20000 * 0.9 * t.rate) / 100).toLocaleString("en-PH")} on a ₱20,000 booking</p>
        </li>
      ))}
    </ol>
  );
}
