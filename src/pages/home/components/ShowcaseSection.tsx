import { useEffect, useRef, useState } from "react";

const showcaseItems = [
  {
    type: "Wedding",
    desc: "Romantic, timeless, and deeply personal",
    img: "https://readdy.ai/api/search-image?query=luxury%20wedding%20event%20website%20mockup%20on%20laptop%20screen%2C%20elegant%20floral%20design%2C%20soft%20pink%20and%20ivory%20color%20palette%2C%20romantic%20typography%2C%20beautiful%20couple%20photography%2C%20premium%20digital%20invitation%20design%2C%20clean%20minimal%20layout%2C%20champagne%20gold%20accents&width=800&height=500&seq=showcase001&orientation=landscape",
    accent: "#D4A0A0",
  },
  {
    type: "Corporate",
    desc: "Polished, professional, and impactful",
    img: "https://readdy.ai/api/search-image?query=modern%20corporate%20event%20website%20mockup%20on%20screen%2C%20clean%20minimal%20design%2C%20dark%20charcoal%20and%20white%20color%20scheme%2C%20professional%20typography%2C%20business%20conference%20imagery%2C%20premium%20digital%20event%20platform%2C%20sleek%20modern%20layout%2C%20gold%20accent%20details&width=800&height=500&seq=showcase002&orientation=landscape",
    accent: "#A0B4C8",
  },
  {
    type: "Birthday",
    desc: "Vibrant, celebratory, and full of joy",
    img: "https://readdy.ai/api/search-image?query=luxury%20birthday%20celebration%20event%20website%20mockup%2C%20elegant%20party%20design%2C%20champagne%20gold%20and%20black%20color%20palette%2C%20festive%20typography%2C%20celebration%20photography%2C%20premium%20digital%20invitation%20website%2C%20sophisticated%20birthday%20event%20layout%2C%20confetti%20and%20balloons%20imagery&width=800&height=500&seq=showcase003&orientation=landscape",
    accent: "#C4A84A",
  },
  {
    type: "Launch Event",
    desc: "Bold, contemporary, and unforgettable",
    img: "https://readdy.ai/api/search-image?query=product%20launch%20event%20website%20mockup%20on%20screen%2C%20bold%20modern%20design%2C%20dark%20background%20with%20neon%20accents%2C%20contemporary%20typography%2C%20tech%20product%20launch%20imagery%2C%20premium%20digital%20event%20website%2C%20dramatic%20lighting%2C%20sleek%20futuristic%20layout&width=800&height=500&seq=showcase004&orientation=landscape",
    accent: "#8A9A8A",
  },
];

export default function ShowcaseSection() {
  const [visible, setVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="showcase"
      ref={ref}
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1A1A1A 0%, #111111 100%)",
        padding: "140px 0 160px",
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        {/* Header */}
        <div
          className="text-center mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s",
          }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-5"
            style={{
              color: "#C4A84A",
              letterSpacing: "0.18em",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Versatility
          </p>
          <h2
            className="font-serif leading-tight"
            style={{
              fontSize: "clamp(36px, 5vw, 52px)",
              fontWeight: 300,
              color: "#FDFBF7",
              fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
              letterSpacing: "-0.01em",
            }}
          >
            Designed for every occasion
          </h2>
          <p
            className="mt-5 mx-auto"
            style={{
              fontSize: "17px",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Inter', sans-serif",
              maxWidth: "480px",
              lineHeight: 1.7,
            }}
          >
            From intimate gatherings to grand celebrations — we design for every story.
          </p>
        </div>

        {/* Showcase grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {showcaseItems.map((item, i) => (
            <div
              key={item.type}
              className="relative overflow-hidden cursor-pointer"
              style={{
                borderRadius: "16px",
                aspectRatio: "16/10",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(40px)",
                transition: `opacity 0.8s ease ${0.1 + i * 0.1}s, transform 0.8s ease ${0.1 + i * 0.1}s`,
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <img
                src={item.img}
                alt={`${item.type} event website`}
                className="w-full h-full object-cover object-top"
                style={{
                  transform: hoveredIndex === i ? "scale(1.05)" : "scale(1)",
                  transition: "transform 0.6s ease",
                }}
              />

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    hoveredIndex === i
                      ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)"
                      : "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
                  transition: "background 0.4s ease",
                }}
              />

              {/* Bottom text */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div
                  className="inline-block text-xs uppercase tracking-widest px-3 py-1 rounded-full mb-3"
                  style={{
                    background: `rgba(${item.accent === "#C4A84A" ? "196,168,74" : item.accent === "#D4A0A0" ? "212,160,160" : item.accent === "#A0B4C8" ? "160,180,200" : "138,154,138"},0.2)`,
                    color: item.accent,
                    fontFamily: "'Inter', sans-serif",
                    border: `1px solid ${item.accent}40`,
                  }}
                >
                  {item.type}
                </div>
                <h3
                  className="font-serif"
                  style={{
                    fontSize: "clamp(22px, 3vw, 28px)",
                    fontWeight: 400,
                    color: "#FFFFFF",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                  }}
                >
                  {item.type}
                </h3>
                <p
                  className="mt-1"
                  style={{
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {item.desc}
                </p>
              </div>

              {/* Hover CTA */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  opacity: hoveredIndex === i ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
              >
                <button
                  className="whitespace-nowrap cursor-pointer"
                  style={{
                    padding: "12px 28px",
                    background: "transparent",
                    border: `2px solid ${item.accent}`,
                    borderRadius: "24px",
                    color: item.accent,
                    fontSize: "14px",
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.04em",
                    backdropFilter: "blur(8px)",
                    background: "rgba(0,0,0,0.3)" as unknown as string,
                  }}
                >
                  View Example →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Process teaser */}
        <div
          className="flex flex-wrap justify-center gap-8 mt-20"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.6s",
          }}
        >
          {["Inquiry", "Concept", "Design", "Launch"].map((step, i) => (
            <div key={step} className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium"
                  style={{
                    border: "1px solid rgba(212,175,55,0.4)",
                    color: "#C4A84A",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p
                  className="mt-2 text-sm"
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {step}
                </p>
              </div>
              {i < 3 && (
                <div
                  className="w-12 h-px hidden sm:block"
                  style={{ background: "rgba(212,175,55,0.2)" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
