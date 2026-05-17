import { useEffect, useRef, useState } from "react";

export default function RevealSection() {
  const [visible, setVisible] = useState(false);
  const [lineVisible, setLineVisible] = useState(false);
  const [headlineVisible, setHeadlineVisible] = useState(false);
  const [subVisible, setSubVisible] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          setTimeout(() => setLineVisible(true), 200);
          setTimeout(() => setHeadlineVisible(true), 500);
          setTimeout(() => setSubVisible(true), 800);
          setTimeout(() => setLogoVisible(true), 1100);
          setTimeout(() => setCtaVisible(true), 1400);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const scrollToBooking = () => {
    const el = document.getElementById("booking");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="reveal"
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #111111 0%, #0A0A0A 100%)",
      }}
    >
      {/* Background texture */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(212,175,55,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(212,175,55,0.04) 0%, transparent 50%)",
          }}
        />
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
        {/* Animated line */}
        <div
          className="mb-12"
          style={{
            width: lineVisible ? "80px" : "0px",
            height: "1px",
            background: "linear-gradient(to right, transparent, #C4A84A, transparent)",
            transition: "width 0.8s ease",
          }}
        />

        {/* Main reveal headline */}
        <h2
          className="font-serif leading-tight mb-6"
          style={{
            fontSize: "clamp(40px, 7vw, 72px)",
            fontWeight: 300,
            color: "#FDFBF7",
            fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            letterSpacing: "-0.02em",
            opacity: headlineVisible ? 1 : 0,
            transform: headlineVisible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.9s ease, transform 0.9s ease",
          }}
        >
          This isn&apos;t just an invitation.
        </h2>

        {/* Secondary headline */}
        <p
          style={{
            fontSize: "clamp(18px, 3vw, 28px)",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            lineHeight: 1.5,
            maxWidth: "600px",
            opacity: subVisible ? 1 : 0,
            transform: subVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.9s ease, transform 0.9s ease",
          }}
        >
          It&apos;s what your event could look like.
        </p>

        {/* Divider */}
        <div
          className="my-12"
          style={{
            width: "1px",
            height: logoVisible ? "60px" : "0px",
            background: "linear-gradient(to bottom, transparent, rgba(212,175,55,0.4), transparent)",
            transition: "height 0.6s ease",
          }}
        />

        {/* Logo reveal */}
        <div
          style={{
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? "scale(1)" : "scale(0.9)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <img
            src="https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/d93d6eb65f2609b96c00a4e84b115b64.png"
            alt="Huna Events"
            className="h-12 object-contain mx-auto"
            style={{ filter: "brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(5deg) brightness(0.9)" }}
          />
          <p
            className="mt-4 text-sm uppercase tracking-widest"
            style={{
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.12em",
            }}
          >
            Premium event websites, designed for modern hosts
          </p>
        </div>

        {/* CTA */}
        <div
          className="mt-14"
          style={{
            opacity: ctaVisible ? 1 : 0,
            transform: ctaVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <button
            onClick={scrollToBooking}
            className="flex items-center gap-3 cursor-pointer whitespace-nowrap transition-all duration-300 hover:scale-105"
            style={{
              height: "60px",
              padding: "0 48px",
              background: "linear-gradient(135deg, #C4A84A 0%, #D4B85A 100%)",
              borderRadius: "30px",
              color: "#1A1A1A",
              fontSize: "16px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.02em",
              border: "none",
              boxShadow: "0 8px 32px rgba(196,168,74,0.3)",
            }}
          >
            Start Your Event Website
            <span style={{ fontSize: "18px" }}>→</span>
          </button>

          <p
            className="mt-5 text-sm"
            style={{
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            No commitment required — let&apos;s talk about your vision
          </p>
        </div>

        {/* Scroll down */}
        <div
          className="mt-20 flex flex-col items-center gap-3"
          style={{
            opacity: ctaVisible ? 0.5 : 0,
            transition: "opacity 0.8s ease 0.3s",
          }}
        >
          <div
            className="w-px bg-amber-400"
            style={{
              height: "40px",
              animation: "scrollBounce2 2s ease-in-out infinite",
            }}
          />
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: "#C4A84A", letterSpacing: "0.12em", fontFamily: "'Inter', sans-serif" }}
          >
            Continue
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scrollBounce2 {
          0%, 100% { transform: scaleY(1); opacity: 0.5; }
          50% { transform: scaleY(1.3); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
