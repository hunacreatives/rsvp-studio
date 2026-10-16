import { useId, useRef } from "react";
import { EnvelopeBack, PAPER_GRAIN, Pocket, WaxSeal, lacePath, useSize } from "../shared/stationery";

// Love Letter's own pieces (the shared paper, envelope, seal and lace ribbon
// live in ../shared/stationery): the open envelope holding a photo in an oval
// mat, a striped name card and a scalloped date card; a leaf sprig ornament;
// and the countdown.

/** A small olive sprig, used between sections. */
export function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg className={`ll-sprig ${className}`} viewBox="0 0 120 28" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <path d="M14 14 H106" strokeOpacity=".35" />
        <path d="M60 22 C60 16 60 11 60 5" />
        <path d="M60 12 C55 11 52 8 52 4 C56 4 59 7 60 12 Z M60 17 C65 16 68 13 68 9 C64 9 61 12 60 17 Z" fill="currentColor" fillOpacity=".35" />
      </g>
    </svg>
  );
}

/** A scalloped card (the red date card): the shared lace edge, without holes, with paper grain. */
function ScallopCard({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const id = useId().replace(/:/g, "");
  const edge = w && h ? lacePath(w, h, Math.max(5, h * 0.09)).edge : "";
  return (
    <div ref={ref} className={`ll-datecard ${className}`}>
      {edge ? (
        <svg className="ll-datecard__sheet" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
          <defs>
            <pattern id={`${id}-g`} width="280" height="280" patternUnits="userSpaceOnUse">
              <image href={PAPER_GRAIN} width="280" height="280" />
            </pattern>
            <radialGradient id={`${id}-l`} cx="30%" cy="25%" r="80%">
              <stop offset="0" stopColor="#fff" stopOpacity=".18" />
              <stop offset="1" stopColor="#000" stopOpacity=".15" />
            </radialGradient>
          </defs>
          <path d={edge} fill="var(--ll-accent)" />
          <path d={edge} fill={`url(#${id}-g)`} style={{ mixBlendMode: "multiply" }} opacity=".7" />
          <path d={edge} fill={`url(#${id}-l)`} />
        </svg>
      ) : null}
      <span className="ll-datecard__text">{text}</span>
    </div>
  );
}

/** The photo in an oval mat (or the monogram, when there's no photo). */
function OvalMat({ photo, mono, focal }: { photo?: string; mono: string; focal?: { x: number; y: number } }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="ll-oval" viewBox="0 0 140 180" aria-hidden>
      <defs>
        <clipPath id={`${id}-c`}>
          <ellipse cx="70" cy="90" rx="50" ry="68" />
        </clipPath>
        <pattern id={`${id}-g`} width="280" height="280" patternUnits="userSpaceOnUse">
          <image href={PAPER_GRAIN} width="280" height="280" />
        </pattern>
        <filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#1d2410" floodOpacity=".45" />
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#1d2410" floodOpacity=".3" />
        </filter>
      </defs>
      <g filter={`url(#${id}-sh)`}>
        <ellipse cx="70" cy="90" rx="68" ry="88" fill="var(--st-paper)" />
        <ellipse cx="70" cy="90" rx="68" ry="88" fill={`url(#${id}-g)`} style={{ mixBlendMode: "multiply" }} opacity=".8" />
      </g>
      <ellipse cx="70" cy="90" rx="60" ry="79" fill="none" stroke="#b9a678" strokeWidth="1" />
      <ellipse cx="70" cy="90" rx="56.5" ry="75" fill="none" stroke="#b9a678" strokeOpacity=".6" strokeWidth=".6" />
      {photo ? (
        <image href={photo} x="20" y="22" width="100" height="136" preserveAspectRatio={`x${focal && focal.x < 0.34 ? "Min" : focal && focal.x > 0.66 ? "Max" : "Mid"}Y${focal && focal.y < 0.34 ? "Min" : focal && focal.y > 0.66 ? "Max" : "Mid"} slice`} clipPath={`url(#${id}-c)`} />
      ) : (
        <>
          <ellipse cx="70" cy="90" rx="50" ry="68" fill="var(--ll-olive)" />
          <text x="70" y={mono.length > 3 ? 97 : 100} textAnchor="middle" fontFamily="var(--ll-script)" fontSize={mono.length > 3 ? 25 : 36} fill="var(--st-paper)">
            {mono}
          </text>
        </>
      )}
      <ellipse cx="70" cy="90" rx="50" ry="68" fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * The open envelope with the invitation pieces tucked inside: the photo in its
 * oval mat (left), the striped name card (back right), the scalloped date card
 * (front), and the pocket with a small ivory seal.
 */
export function EnvelopeStack({ names, date, mono, photo, focal, editorHint }: { names: string[]; date: string | null; mono: string; photo?: string; focal?: { x: number; y: number }; editorHint?: boolean }) {
  return (
    <div className="ll-stack" aria-label={names.join(" & ")}>
      <div className="ll-stack__env ll-stack__env--back">
        <EnvelopeBack />
      </div>
      <div className="ll-stack__namecard">
        <div className="ll-namecard">
          <p className="ll-namecard__kicker">Save the date</p>
          {names.length ? (
            names.map((n, i) => (
              <span key={i}>
                {i ? <span className="ll-namecard__amp">&amp;</span> : null}
                <span className="ll-namecard__name">{n}</span>
              </span>
            ))
          ) : (
            <span className="ll-namecard__name ll-hint">{editorHint ? "Your names" : ""}</span>
          )}
        </div>
      </div>
      <div className="ll-stack__oval">
        <OvalMat photo={photo} mono={mono} focal={focal} />
      </div>
      {date ? (
        <div className="ll-stack__date">
          <ScallopCard text={date} />
        </div>
      ) : null}
      <div className="ll-stack__env ll-stack__env--front">
        <Pocket />
      </div>
      <div className="ll-stack__seal">
        <WaxSeal text={mono} tone="ivory" shape="oval" />
      </div>
    </div>
  );
}

