import { useEffect, useRef, useState } from "react";

export default function StorySection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="story"
      ref={ref}
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FAF8F5 0%, #F5F1EA 100%)",
        padding: "120px 0",
      }}
    >
      {/* Decorative large letter */}
      <div
        className="absolute top-0 right-0 select-none pointer-events-none hidden lg:block"
        style={{
          fontSize: "320px",
          fontWeight: 100,
          color: "rgba(212,175,55,0.05)",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          lineHeight: 1,
          top: "-40px",
          right: "-20px",
        }}
      >
        H
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 lg:gap-24 items-start">
          {/* Left content */}
          <div
            className="lg:col-span-3"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(40px)",
              transition: "opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s",
            }}
          >
            <p
              className="text-xs uppercase tracking-widest mb-6"
              style={{
                color: "#C4A84A",
                letterSpacing: "0.18em",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              The Story
            </p>

            <h2
              className="font-serif leading-tight mb-10"
              style={{
                fontSize: "clamp(36px, 5vw, 56px)",
                fontWeight: 300,
                color: "#2A2A2A",
                letterSpacing: "-0.01em",
                fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                maxWidth: "680px",
              }}
            >
              Every great event begins with an invitation that sets the tone
            </h2>

            <div
              className="space-y-6"
              style={{
                maxWidth: "600px",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <p
                className="leading-relaxed"
                style={{ fontSize: "18px", color: "#5A5A5A", lineHeight: 1.8 }}
              >
                <span
                  className="float-left mr-3 font-serif leading-none"
                  style={{
                    fontSize: "72px",
                    color: "#C4A84A",
                    lineHeight: "0.8",
                    marginTop: "8px",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                  }}
                >
                  B
                </span>
                efore the first guest arrives, before the music plays, before the memories are made — there is the invitation. It is the first impression, the first feeling, the first promise of what&apos;s to come.
              </p>

              <p
                className="leading-relaxed"
                style={{ fontSize: "18px", color: "#5A5A5A", lineHeight: 1.8 }}
              >
                At Huna Events, we believe your digital presence should be as carefully crafted as the event itself. We design immersive event websites that don&apos;t just inform — they transport your guests into the experience before they even arrive.
              </p>

              <p
                className="leading-relaxed"
                style={{ fontSize: "18px", color: "#5A5A5A", lineHeight: 1.8 }}
              >
                From intimate weddings to grand corporate launches, we create digital experiences that reflect the soul of your event — elegant, personal, and unforgettable.
              </p>
            </div>

            {/* Stats row */}
            <div
              className="flex flex-wrap gap-12 mt-14"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.9s ease 0.5s, transform 0.9s ease 0.5s",
              }}
            >
              {[
                { num: "200+", label: "Events Designed" },
                { num: "98%", label: "Client Satisfaction" },
                { num: "2–3", label: "Weeks to Launch" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: "42px",
                      fontWeight: 300,
                      color: "#2A2A2A",
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {stat.num}
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "#8A8A8A", fontFamily: "'Inter', sans-serif" }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right image */}
          <div
            className="lg:col-span-2 lg:sticky top-24"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(0)" : "translateX(40px)",
              transition: "opacity 0.9s ease 0.3s, transform 0.9s ease 0.3s",
            }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: "12px",
                aspectRatio: "3/4",
                boxShadow: "0 30px 80px rgba(0,0,0,0.15)",
              }}
            >
              <img
                src="https://readdy.ai/api/search-image?query=elegant%20event%20planner%20working%20on%20luxury%20wedding%20design%20details%2C%20flat%20lay%20of%20invitation%20cards%2C%20flowers%2C%20ribbon%2C%20champagne%20gold%20stationery%2C%20marble%20surface%2C%20soft%20natural%20light%2C%20editorial%20lifestyle%20photography%2C%20warm%20ivory%20and%20gold%20tones%2C%20premium%20aesthetic&width=480&height=640&seq=story001&orientation=portrait"
                alt="Event design process"
                className="w-full h-full object-cover object-top"
              />
              {/* Vignette */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.2) 100%)",
                }}
              />
            </div>

            {/* Floating quote card */}
            <div
              className="absolute -bottom-6 -left-6 hidden lg:block"
              style={{
                background: "rgba(255,255,255,0.95)",
                borderRadius: "12px",
                padding: "24px 28px",
                maxWidth: "260px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                border: "1px solid rgba(212,175,55,0.2)",
              }}
            >
              <p
                className="font-serif italic leading-relaxed"
                style={{
                  fontSize: "15px",
                  color: "#3A3A3A",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                }}
              >
                &ldquo;The website felt more like an experience than a page.&rdquo;
              </p>
              <p
                className="text-xs mt-3"
                style={{ color: "#C4A84A", fontFamily: "'Inter', sans-serif" }}
              >
                — Amara K., Wedding Client
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="flex justify-center mt-24">
        <div
          className="h-px"
          style={{
            width: "60%",
            background:
              "linear-gradient(to right, transparent, rgba(212,175,55,0.4), transparent)",
          }}
        />
      </div>
    </section>
  );
}
