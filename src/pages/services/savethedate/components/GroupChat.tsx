import { useEffect, useRef, useState } from "react";

// A family group chat where the Save the Date lands, played back like a conversation each
// time the phone comes into view. The card is real client work (Destiny & Austin's); the
// chat is iMessage-style chrome around it.
type Msg =
  | { kind: "photo"; at: number }
  | { kind: "text"; at: number; from: "me" | Person; text: string; typing?: number };
type Person = { name: string; initials: string; color: string };

const LORNA: Person = { name: "Tita Lorna", initials: "TL", color: "#d9809c" };
const JUN: Person = { name: "Kuya Jun", initials: "KJ", color: "#6f8fd1" };
const BEA: Person = { name: "Bea", initials: "B", color: "#e0a24a" };

// at = ms after the phone comes into view; typing = ms of "…" before a reply
const MESSAGES: Msg[] = [
  { kind: "photo", at: 500 },
  { kind: "text", at: 1300, from: "me", text: "Save the date! 💛 Invitation and website to follow." },
  { kind: "text", at: 3000, from: LORNA, text: "Congrats!!! 😭💛", typing: 900 },
  { kind: "text", at: 4700, from: JUN, text: "Naka-block na sa calendar ko 🗓️", typing: 900 },
  { kind: "text", at: 6500, from: BEA, text: "Ang ganda ng design 😍", typing: 1000 },
];
const TAPBACK = 3500; // Tita Lorna hearts the photo

export default function GroupChat() {
  const box = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState(-1); // elapsed ms of the current play; -1 = not started

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(Infinity);
      return;
    }
    let timers: number[] = [];
    const clear = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
    };
    const marks = [
      ...new Set(
        MESSAGES.flatMap((m) => (m.kind === "text" && m.typing ? [m.at - m.typing, m.at] : [m.at])).concat(TAPBACK),
      ),
    ];
    // Replays each time the phone scrolls back into view.
    const io = new IntersectionObserver(
      ([e]) => {
        clear();
        if (!e.isIntersecting) return setT(-1);
        setT(0);
        timers = marks.map((ms) => window.setTimeout(() => setT(ms), ms));
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      clear();
      io.disconnect();
    };
  }, []);

  const typing = MESSAGES.find((m) => m.kind === "text" && m.typing && t >= m.at - m.typing && t < m.at) as
    | Extract<Msg, { kind: "text" }>
    | undefined;
  const typer = typing && typing.from !== "me" ? typing.from : null;

  return (
    <div ref={box} className="std-phone">
      <div className="std-phone-screen" aria-hidden>
        <div className="std-status">
          <span>9:41</span>
          <span>
            <i className="ri-signal-wifi-fill" />
            <i className="ri-battery-2-fill" />
          </span>
        </div>
        <div className="std-chat-head">
          <div className="std-faces">
            {[LORNA, JUN, BEA].map((p) => (
              <span key={p.name} className="std-face" style={{ background: p.color }}>
                {p.initials}
              </span>
            ))}
          </div>
          <p className="std-chat-title">
            Family 💛 <span>›</span>
          </p>
        </div>
        <div className="std-thread">
          {MESSAGES.map((m, i) => {
            if (t < m.at) return null;
            if (m.kind === "photo")
              return (
                <div key={i} className="std-msg me enter">
                  <div className="std-photo">
                    <img src="/services/save-the-date/card-destiny.jpg" alt="" />
                    <span className={`std-tapback ${t >= TAPBACK ? "on" : ""}`}>❤️</span>
                  </div>
                </div>
              );
            if (m.from === "me")
              return (
                <div key={i} className="std-msg me enter">
                  <div className="std-who">
                    <span className="std-bubble">{m.text}</span>
                  </div>
                </div>
              );
            return (
              <div key={i} className="std-msg them enter">
                <span className="std-avatar" style={{ background: m.from.color }}>
                  {m.from.initials}
                </span>
                <div className="std-who">
                  <span className="std-name">{m.from.name}</span>
                  <span className="std-bubble">{m.text}</span>
                </div>
              </div>
            );
          })}
          {typer ? (
            <div className="std-msg them enter">
              <span className="std-avatar" style={{ background: typer.color }}>
                {typer.initials}
              </span>
              <span className="std-typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          ) : null}
        </div>
        <div className="std-compose">
          <i className="ri-add-circle-fill" />
          <span>iMessage</span>
        </div>
      </div>
      <p className="sr-only">
        A family group chat: Destiny shares her wedding Save the Date, and her family replies with
        congratulations.
      </p>
    </div>
  );
}
