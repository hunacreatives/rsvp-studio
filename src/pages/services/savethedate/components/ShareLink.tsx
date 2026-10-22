import { useEffect, useRef, useState } from "react";

// "You share it": the Save the Date card in the middle, its link copied, then sent out to
// where guests see it: a family chat, their calendar, an email. Plays each time it comes
// into view. No phone frame: the card and the moments around it are the picture.

const CARD = "/services/save-the-date/card-destiny.jpg";
const STEPS = { copy: 700, copied: 1100, chat: 1900, cal: 2700, mail: 3500 };

export default function ShareLink() {
  const box = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState(-1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setT(Infinity);
    let timers: number[] = [];
    const io = new IntersectionObserver(
      ([e]) => {
        timers.forEach(clearTimeout);
        timers = [];
        if (!e.isIntersecting) return setT(-1);
        setT(0);
        timers = Object.values(STEPS).map((ms) => window.setTimeout(() => setT(ms), ms));
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      timers.forEach(clearTimeout);
      io.disconnect();
    };
  }, []);

  const on = (k: keyof typeof STEPS) => (t >= STEPS[k] ? "on" : "");

  return (
    <div ref={box} className="std-sh" aria-hidden>
      <div className="std-sh-card">
        <img src={CARD} alt="" />
      </div>

      <div className={`std-sh-link ${on("copy")}`}>
        <i className="ri-link" />
        <span>thersvpstudio.com/invite/destiny-and-austin</span>
        <b className={on("copied")}>{t >= STEPS.copied ? "Copied" : "Copy"}</b>
      </div>

      <div className={`std-sh-pop chat ${on("chat")}`}>
        <span className="std-sh-ico" style={{ background: "#0a84ff" }}>
          <i className="ri-chat-3-fill" />
        </span>
        <div>
          <p className="std-sh-k">Family 💛</p>
          <p className="std-sh-v">Tita Lorna: Congrats!!! 😭💛</p>
        </div>
      </div>

      <div className={`std-sh-pop cal ${on("cal")}`}>
        <span className="std-sh-date">
          <small>JUN</small>
          12
        </span>
        <div>
          <p className="std-sh-k">Destiny &amp; Austin</p>
          <p className="std-sh-v">
            <i className="ri-check-line" /> Added to calendar
          </p>
        </div>
      </div>

      <div className={`std-sh-pop mail ${on("mail")}`}>
        <span className="std-sh-ico" style={{ background: "#c2416b" }}>
          <i className="ri-mail-fill" />
        </span>
        <div>
          <p className="std-sh-k">Save the date!</p>
          <p className="std-sh-v">Invitation to follow</p>
        </div>
      </div>
      <p className="sr-only">
        The Save the Date card and its link, shared to a family chat, added to a guest’s calendar, and sent by email.
      </p>
    </div>
  );
}
