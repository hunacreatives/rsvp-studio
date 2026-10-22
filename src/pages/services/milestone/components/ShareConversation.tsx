import { useEffect, useRef, useState } from "react";

// The share screenshot, played back as a conversation. The base image is the
// same picture with the chat area cleared; each message is the ORIGINAL
// screenshot clipped to that message, so the end frame is the picture as-is.
const W = 530;
const H = 1000;
const SRC = "/services/milestone/imessage-share.webp";
const BASE = "/services/milestone/imessage-share-base.webp";

type Msg = { rect: [number, number, number, number]; from: "me" | "them"; at: number };
// rect = [x0, y0, x1, y1] in screenshot pixels; at = ms after the phone comes into view
const MESSAGES: Msg[] = [
  { rect: [170, 178, 462, 314], from: "me", at: 400 }, // "Hi!!! We're planning…"
  { rect: [128, 318, 462, 611], from: "me", at: 1400 }, // forwarded invite card
  { rect: [62, 616, 360, 690], from: "them", at: 3400 }, // "Wait, I love the website!"
  { rect: [192, 694, 462, 759], from: "me", at: 4500 }, // "thank you! …"
  { rect: [192, 760, 466, 850], from: "me", at: 5400 }, // "Made by The RSVP Studio" + ❤️
];
const TYPING = { from: 2300, to: 3400 }; // friend typing before their reply

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function ShareConversation() {
  const box = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState<number>(-1); // elapsed ms of the current play; -1 = not started

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(Infinity);
      return;
    }
    const end = MESSAGES[MESSAGES.length - 1].at;
    let timers: number[] = [];
    const clear = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
    };
    // Replays each time the phone scrolls back into view.
    const io = new IntersectionObserver(
      ([e]) => {
        clear();
        if (!e.isIntersecting) {
          setT(-1);
          return;
        }
        setT(0);
        const marks = [...new Set([...MESSAGES.map((m) => m.at), TYPING.from, TYPING.to, end])];
        timers = marks.map((ms) => window.setTimeout(() => setT(ms), ms));
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      clear();
      io.disconnect();
    };
  }, []);

  const typing = t >= TYPING.from && t < TYPING.to;

  return (
    <div
      ref={box}
      className="relative w-[280px] md:w-[320px] drop-shadow-[0_30px_60px_rgba(0,7,39,0.18)]"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
      <img src={BASE} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full" />

      {MESSAGES.map((m, i) => {
        const [x0, y0, x1, y1] = m.rect;
        const shown = t >= m.at;
        return (
          <img
            key={i}
            src={SRC}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full transition-[opacity,transform] duration-500 ease-out"
            style={{
              clipPath: `inset(${pct(y0, H)} ${pct(W - x1, W)} ${pct(H - y1, H)} ${pct(x0, W)})`,
              opacity: shown ? 1 : 0,
              transform: shown ? "none" : "translateY(14px) scale(0.97)",
              transformOrigin: `${m.from === "me" ? pct(x1, W) : pct(x0, W)} ${pct(y1, H)}`,
            }}
          />
        );
      })}

      {/* typing bubble where the friend's reply lands */}
      <span
        aria-hidden="true"
        className={`absolute flex items-center justify-center gap-[3px] rounded-full bg-[#f2f3f7] transition-opacity duration-300 ${
          typing ? "opacity-100" : "opacity-0"
        }`}
        style={{ left: pct(118, W), top: pct(630, H), width: pct(62, W), height: pct(36, H) }}
      >
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            className="share-typing-dot block h-[5px] w-[5px] rounded-full bg-[#8e8e93]"
            style={{ animationDelay: `${d * 0.15}s` }}
          />
        ))}
      </span>

      {/* the finished picture, for screen readers */}
      <span className="sr-only">
        A message thread: an invitation link to Tercel's 41st birthday website is shared, and the
        friend replies "Wait, I love the website! It's so nice!"
      </span>
    </div>
  );
}
