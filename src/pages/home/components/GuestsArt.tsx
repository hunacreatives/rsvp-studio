/**
 * "Made for each guest" card art: a stack of envelopes on navy, each
 * addressed to someone. Every 3s the front one slides away and the next
 * guest's comes forward. HTML (not SVG) so the envelopes can change
 * stacking order. Sizes are in cqw of the card. Motion: index.css (hw-guest*).
 */

const GUESTS = ["Tita Baby", "Kuya Jun", "The Santos Family"];

export default function GuestsArt({ className = "" }: { className?: string }) {
  return (
    <div className={`hw-guests relative overflow-hidden bg-[#24275b] [container-type:inline-size] ${className}`} aria-hidden>
      {GUESTS.map((name, i) => (
        <div key={name} className={`hw-guest hw-guest--${i + 1}`}>
          {/* flap */}
          <svg viewBox="0 0 100 64" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <path d="M0 0 L50 30 L100 0" fill="none" stroke="#e7dfcf" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute left-1/2 top-[47%] h-[3.6cqw] w-[3.6cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ef795a]" />
          <div className="absolute inset-x-0 bottom-[14%] text-center">
            <p className="font-sans text-[1.7cqw] font-semibold tracking-[0.3em] text-[#6b6f8a]">TO</p>
            <p className="mt-[0.6cqw] font-display text-[5.2cqw] italic leading-none text-[#24275b]">{name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
