import { useEffect, useRef, useState } from "react";

// "You review it": the review thread in the client dashboard's Messages, played back one
// message at a time each time it comes into view. The studio is on the left (navy, with our
// mark); the couple is on the right (blue). Every message is laid out from the start (just
// invisible), so the card never changes height as it plays.

const CARD = "/services/save-the-date/card-destiny.jpg";

type Msg = {
  from: "studio" | "couple";
  at: number;
  text: string;
  draft?: string;
  typing?: number;
};
const MESSAGES: Msg[] = [
  {
    from: "studio",
    at: 500,
    text: "Hi Sophia! Here’s the first draft of your Save the Date. Let us know what you think!",
    draft: "Draft 1",
  },
  {
    from: "couple",
    at: 2600,
    text: "We love it! Could our names be a little bigger, and the date in gold?",
  },
  {
    from: "studio",
    at: 4900,
    text: "Of course! Here’s version 2 with both changes.",
    draft: "Draft 2",
    typing: 1300,
  },
  { from: "couple", at: 7000, text: "Thank you! That works for us." },
];
const APPROVED = 7900;

function StudioMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-[var(--ink)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img src="/brand/brandmark-white.png" alt="" className="w-[58%]" />
    </span>
  );
}

function CoupleMark() {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f6d7e3] text-[11px] font-bold text-[#a8345a]"
      aria-hidden
    >
      S&R
    </span>
  );
}

export default function ReviewChat() {
  const box = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState(-1);

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
        MESSAGES.flatMap((m) =>
          m.typing ? [m.at - m.typing, m.at] : [m.at],
        ).concat(APPROVED),
      ),
    ];
    // Replays each time it scrolls back into view.
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

  const typingFor = MESSAGES.find(
    (m) => m.typing && t >= m.at - m.typing && t < m.at,
  );

  return (
    <div ref={box} className="std-review mx-auto w-full max-w-[460px]">
      <div className="std-review-head">
        <StudioMark size={40} />
        <div className="min-w-0">
          <p className="std-review-name">The RSVP Studio</p>
          <p className="std-review-sub">Sophia &amp; Ren · Save the Date</p>
        </div>
        <span className="std-review-where">Messages</span>
      </div>

      <div className="std-review-thread" aria-hidden>
        {MESSAGES.map((m, i) => {
          const on = t >= m.at;
          const studio = m.from === "studio";
          return (
            <div key={i} className="relative">
              {/* Typing dots where this reply is about to land. */}
              {m.typing ? (
                <div className={`std-rtyping ${typingFor === m ? "on" : ""}`}>
                  <StudioMark size={36} />
                  <span className="std-typing">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              ) : null}
              <div
                className={`std-rmsg ${studio ? "studio" : "couple"} ${on ? "on" : ""}`}
              >
                {studio ? <StudioMark /> : null}
                <div className="std-rcol">
                  <p className="std-rwho">
                    {studio ? "Nicole · The RSVP Studio" : "Sophia & Ren"}
                  </p>
                  <div className="std-rbubble">{m.text}</div>
                  {m.draft ? (
                    <div className="std-rdraft">
                      <img src={CARD} alt="" />
                      <div>
                        <b>{m.draft}</b>
                        <span>Save the Date · JPEG</span>
                      </div>
                    </div>
                  ) : null}
                </div>
                {studio ? null : <CoupleMark />}
              </div>
            </div>
          );
        })}
        <p className={`std-rapproved ${t >= APPROVED ? "on" : ""}`}>
          <i className="ri-checkbox-circle-fill" /> Design approved
        </p>
      </div>
      <p className="sr-only">
        A review thread: the studio sends the first draft, the couple asks for
        bigger names and a gold date, the studio sends version 2, and the couple
        approves it.
      </p>
    </div>
  );
}
