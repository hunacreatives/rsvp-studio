import { forwardRef, useId, useImperativeHandle, useRef } from "react";
import type { PenHandle, PenPose } from "./ink";

/**
 * The pen, drawn in code: a gilt pointed nib (its slit, vent hole and shoulders, the tip wet
 * with ink) in a brass ferrule on a long black lacquered holder, held as a right hand holds it,
 * leaning up and to the right. It's drawn pointing up with its tip at the origin, and turned and
 * moved as one piece (transforms only). Its shadow falls away from the window (to the lower
 * right): it meets the nib at the tip while it writes and parts from it as the pen lifts.
 * The tines open a touch on the pressed downstrokes.
 */

// one unit is about a sixth of a millimetre: the nib is 118 long, the holder runs on out of frame
const NIB = "M0 0C2.2 -10 6.5 -34 10.4 -58C10.9 -61 11.6 -62.4 13.4 -63.6C14.6 -64.6 15.1 -67 15.1 -72L15.3 -118L-15.3 -118L-15.1 -72C-15.1 -67 -14.6 -64.6 -13.4 -63.6C-11.6 -62.4 -10.9 -61 -10.4 -58C-6.5 -34 -2.2 -10 0 0Z";
const FERRULE = "M-17 -112L17 -112C18.2 -112 18.6 -113 18.6 -114.5L18.6 -150L-18.6 -150L-18.6 -114.5C-18.6 -113 -18.2 -112 -17 -112Z";
const HOLDER = "M-18.6 -150L18.6 -150L16.2 -420C15.6 -700 14.6 -980 13.8 -1300L-13.8 -1300C-14.6 -980 -15.6 -700 -16.2 -420Z";
const LEN = 1310;

export const Pen = forwardRef<PenHandle>(function Pen(_, ref) {
  const uid = useId().replace(/:/g, "");
  const body = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const gap = useRef<SVGPathElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const scale = useRef(1);
  useImperativeHandle(ref, () => ({
    size: () => scale.current,
    set(p: PenPose) {
      const b = body.current, s = shade.current, r = root.current;
      if (!b || !s || !r) return;
      if (p.scale) scale.current = p.scale;
      const k = scale.current;
      r.style.visibility = p.shown ? "visible" : "hidden";
      const h = Math.max(0, p.height);
      // lifted, it comes toward the camera (a touch bigger) and its shadow slides away
      const lift = 1 + h * 0.035;
      b.style.transform = `translate3d(${(p.x - h * 3 * k).toFixed(2)}px, ${(p.y - h * 5 * k).toFixed(2)}px, 0) rotate(${p.angle.toFixed(2)}deg) scale(${(k * lift).toFixed(4)})`;
      s.style.transform = `translate3d(${(p.x + (2 + h * 26) * k).toFixed(2)}px, ${(p.y + (3 + h * 34) * k).toFixed(2)}px, 0) rotate(${(p.angle + 6.5 + h * 2).toFixed(2)}deg) scale(${k.toFixed(4)})`;
      s.style.opacity = `${(0.9 - h * 0.35).toFixed(3)}`;
      const g = gap.current;
      if (g) {
        const w = (0.15 + p.press * 1.1 * (1 - Math.min(1, h * 4))).toFixed(2);
        g.setAttribute("d", `M0 -44L${w} -0.6L-${w} -0.6Z`);
      }
    },
  }));
  const vb = `-40 ${-LEN} 80 ${LEN + 8}`;
  const svgStyle = { left: -40, top: -LEN, width: 80, height: LEN + 8 } as const;
  return (
    <div ref={root} className="iv-pen" aria-hidden style={{ visibility: "hidden" }}>
      <div ref={shade} className="iv-pen__part iv-pen__shade">
        <svg viewBox={vb} style={svgStyle}>
          <path d={NIB} />
          <path d={FERRULE} />
          <path d={HOLDER} />
        </svg>
      </div>
      <div ref={body} className="iv-pen__part">
        <svg viewBox={vb} style={svgStyle}>
          <defs>
            <linearGradient id={`${uid}g`} x1="-15" x2="15" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3d2b10" />
              <stop offset="0.1" stopColor="#7c5a26" />
              <stop offset="0.27" stopColor="#d9b96e" />
              <stop offset="0.38" stopColor="#fff2c6" />
              <stop offset="0.47" stopColor="#e2c27a" />
              <stop offset="0.62" stopColor="#a47c3a" />
              <stop offset="0.84" stopColor="#6b4c1e" />
              <stop offset="1" stopColor="#35250c" />
            </linearGradient>
            <linearGradient id={`${uid}f`} x1="-18.6" x2="18.6" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3a2a10" />
              <stop offset="0.22" stopColor="#a0793a" />
              <stop offset="0.36" stopColor="#f6e2a8" />
              <stop offset="0.48" stopColor="#c9a25a" />
              <stop offset="0.75" stopColor="#6d4f1f" />
              <stop offset="1" stopColor="#2c1f0a" />
            </linearGradient>
            <linearGradient id={`${uid}h`} x1="-18" x2="18" y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#050403" />
              <stop offset="0.2" stopColor="#1d1916" />
              <stop offset="0.31" stopColor="#5d554e" />
              <stop offset="0.36" stopColor="#a69c92" />
              <stop offset="0.42" stopColor="#3b3531" />
              <stop offset="0.7" stopColor="#141210" />
              <stop offset="1" stopColor="#020202" />
            </linearGradient>
            <linearGradient id={`${uid}i`} x1="0" x2="0" y1="0" y2="-22" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#101522" stopOpacity="0.95" />
              <stop offset="0.55" stopColor="#1a2236" stopOpacity="0.75" />
              <stop offset="1" stopColor="#1a2236" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`${uid}l`} x1="0" x2="0" y1="0" y2="-118" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#000" stopOpacity="0.28" />
              <stop offset="0.45" stopColor="#000" stopOpacity="0" />
              <stop offset="0.9" stopColor="#fff" stopOpacity="0.08" />
            </linearGradient>
            <clipPath id={`${uid}c`}>
              <path d={NIB} />
            </clipPath>
          </defs>
          {/* the holder and its ferrule */}
          <path d={HOLDER} fill={`url(#${uid}h)`} />
          <path d="M-5.6 -170L-4.2 -1290" stroke="#fff" strokeOpacity="0.1" strokeWidth="1.4" fill="none" />
          <path d={FERRULE} fill={`url(#${uid}f)`} />
          {[-118, -122.5, -141, -144].map((y) => (
            <path key={y} d={`M-18.6 ${y}H18.6`} stroke="#3a2a0e" strokeOpacity="0.55" strokeWidth="0.9" />
          ))}
          {Array.from({ length: 14 }, (_, i) => -125 + i * -1.1).map((y) => (
            <path key={y} d={`M-18.6 ${y.toFixed(1)}H18.6`} stroke={y > -131 ? "#fff3cc" : "#3a2a0e"} strokeOpacity="0.22" strokeWidth="0.45" />
          ))}
          {/* the nib */}
          <path d={NIB} fill={`url(#${uid}g)`} />
          <g clipPath={`url(#${uid}c)`}>
            <path d={NIB} fill={`url(#${uid}l)`} />
            {/* the imprint, and the shoulder's bevel */}
            <path d="M-8.5 -82Q0 -88 8.5 -82M-6.5 -77.5Q0 -82.5 6.5 -77.5" stroke="#4a3412" strokeOpacity="0.5" strokeWidth="0.6" fill="none" />
            <path d="M-3 -93h6M-1.6 -96.5h3.2" stroke="#4a3412" strokeOpacity="0.45" strokeWidth="0.55" />
            <path d="M10.4 -58C11 -61.2 11.8 -62.6 13.4 -63.6" stroke="#fff6d8" strokeOpacity="0.55" strokeWidth="0.8" fill="none" />
            <path d="M-10.4 -58C-11 -61.2 -11.8 -62.6 -13.4 -63.6" stroke="#2c1f0a" strokeOpacity="0.6" strokeWidth="0.8" fill="none" />
            {/* wet with ink at the tip */}
            <path d={NIB} fill={`url(#${uid}i)`} />
            <path d="M0 -44L0 -0.5" stroke="#120d06" strokeWidth="0.55" />
            <path ref={gap} d="M0 -44L0.15 -0.6L-0.15 -0.6Z" fill="#0d1018" />
          </g>
          {/* the vent hole */}
          <path d="M0 -42.2C-1.9 -43.4 -3 -45.2 -2.6 -46.9C-2.2 -48.5 -0.6 -48.9 0 -47.6C0.6 -48.9 2.2 -48.5 2.6 -46.9C3 -45.2 1.9 -43.4 0 -42.2Z" fill="#1d150a" />
          <path d="M-2.4 -47.6C-1.8 -48.6 -0.8 -48.6 -0.2 -47.8" stroke="#fff3cf" strokeOpacity="0.5" strokeWidth="0.5" fill="none" />
        </svg>
      </div>
    </div>
  );
});
