import { useState, useEffect } from "react";

interface InvitationSectionProps {
  onOpen: () => void;
}

export default function InvitationSection({ onOpen }: InvitationSectionProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpen = () => {
    setIsOpening(true);
    setTimeout(() => {
      onOpen();
    }, 1200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-1000 ${
        isOpening ? "opacity-0 scale-110" : "opacity-100 scale-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at 60% 40%, #f0ebe0 0%, #e8e2d4 40%, #d9d2c4 100%)",
      }}
    >
      {/* Ambient background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
              background:
                "radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)",
              top: `${10 + i * 15}%`,
              left: `${5 + i * 16}%`,
              animation: `float ${4 + i}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Invitation Card */}
      <div
        className={`relative flex flex-col items-center justify-between transition-all duration-700 ${
          isOpening ? "scale-105 rotate-1" : "scale-100 rotate-0"
        }`}
        style={{
          width: "min(420px, 88vw)",
          height: "min(580px, 85vh)",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(250,247,240,0.98) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.6)",
          borderRadius: "16px",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.04) inset, 0 20px 60px rgba(0,0,0,0.14), 0 0 60px rgba(212,175,55,0.12)",
          padding: "48px 40px",
        }}
      >
        {/* Corner ornaments */}
        <div
          className="absolute top-5 left-5 opacity-20"
          style={{ width: "20px", height: "20px" }}
        >
          <div
            className="absolute top-0 left-0 w-full border-t border-l"
            style={{ height: "100%", borderColor: "#2A2A2A" }}
          />
        </div>
        <div
          className="absolute bottom-5 right-5 opacity-20"
          style={{ width: "20px", height: "20px" }}
        >
          <div
            className="absolute bottom-0 right-0 w-full border-b border-r"
            style={{ height: "100%", borderColor: "#2A2A2A" }}
          />
        </div>

        {/* Top: Logo */}
        <div className="flex flex-col items-center">
          <img
            src="https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/d93d6eb65f2609b96c00a4e84b115b64.png"
            alt="Huna Events"
            className="h-10 object-contain"
            style={{ filter: "brightness(0.15)" }}
          />
          <div
            className="mt-4 w-12 h-px"
            style={{ background: "rgba(212,175,55,0.5)" }}
          />
        </div>

        {/* Middle: Headline */}
        <div className="flex flex-col items-center text-center flex-1 justify-center px-4">
          <p
            className="text-xs uppercase tracking-widest mb-6"
            style={{ color: "#C4A84A", letterSpacing: "0.18em" }}
          >
            A personal invitation
          </p>
          <h1
            className="font-serif leading-tight"
            style={{
              fontSize: "clamp(40px, 8vw, 56px)",
              fontWeight: 300,
              color: "#1A1A1A",
              letterSpacing: "-0.02em",
              fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            }}
          >
            You&apos;re Invited
          </h1>
          <p
            className="mt-5 leading-relaxed"
            style={{
              fontSize: "clamp(14px, 3vw, 16px)",
              color: "#7A7A7A",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.01em",
            }}
          >
            To something beautifully designed
          </p>
        </div>

        {/* Divider */}
        <div
          className="w-full h-px mb-8"
          style={{ background: "rgba(0,0,0,0.07)" }}
        />

        {/* CTA Button */}
        <button
          onClick={handleOpen}
          className={`relative flex items-center justify-center gap-3 cursor-pointer whitespace-nowrap transition-all duration-300 hover:scale-105 ${
            showPulse ? "animate-pulse-soft" : ""
          }`}
          style={{
            width: "240px",
            height: "56px",
            background: "linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%)",
            borderRadius: "28px",
            color: "#FFFFFF",
            fontSize: "15px",
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.02em",
            border: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          Open Invitation
          <span style={{ fontSize: "18px" }}>→</span>
        </button>
      </div>

      <style>{`
        @keyframes float {
          from { transform: translateY(0px) scale(1); }
          to { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes pulse-soft {
          0%, 100% { box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
          50% { box-shadow: 0 8px 32px rgba(212,175,55,0.4), 0 8px 24px rgba(0,0,0,0.2); }
        }
        .animate-pulse-soft {
          animation: pulse-soft 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
