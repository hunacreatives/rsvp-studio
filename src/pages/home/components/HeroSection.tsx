import { useEffect, useState } from "react";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";

export default function HeroSection() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", minHeight: "640px" }}
    >
      {/* Background image — full width landscape */}
      <div className="absolute inset-0">
        <img
          src="https://storage.readdy-site.link/project_files/0fb2bc09-a2d3-4ae6-b8fb-a45e896ddb13/c21acfe7-3633-4271-b3d7-5b5066e9bf34_03-Huna-Events-Web-Design.svg?v=89f7348f8729b2001092938bd16d5ecc"
          alt="Thoughtfully designed event experiences"
          className="w-full h-full object-cover object-center"
        />
        {/* Subtle dark overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(20,20,20,0.18) 0%, rgba(20,20,20,0.10) 60%, rgba(20,20,20,0.08) 100%)",
          }}
        />
      </div>

      {/* Content — left-aligned, vertically centered */}
      <div
        className="absolute inset-0 flex flex-col justify-center items-center text-center px-12 md:px-20 lg:px-28"
        style={{
          paddingTop: "96px",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 1s ease 0.3s, transform 1s ease 0.3s",
        }}
      >
        <h1
          className="leading-tight"
          style={{
            fontSize: "clamp(30px, 4.5vw, 58px)",
            fontWeight: 400,
            color: "#FFFFFF",
            fontFamily: FONT_PRIMARY,
            letterSpacing: "-0.01em",
            textShadow: "0 1px 4px rgba(0,0,0,0.12)",
          }}
        >
          Thoughtfully Designed<br />Event Experiences
        </h1>

        <p
          className="mt-5"
          style={{
            fontSize: "clamp(12px, 1.3vw, 15px)",
            color: "rgba(255,255,255,0.82)",
            fontFamily: FONT_SECONDARY,
            lineHeight: 1.7,
            fontWeight: 300,
            letterSpacing: "0.04em",
            maxWidth: "560px",
          }}
        >
          Elevated Digital Experiences for Life&apos;s Most Meaningful Milestones
        </p>
      </div>
    </section>
  );
}