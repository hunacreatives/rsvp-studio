import { useEffect, useRef, useState } from "react";

export default function BookingSection() {
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement)?.value || "";
    if (message.length > 500) return;

    setSubmitting(true);
    const data = new FormData(form);
    const params = new URLSearchParams();
    data.forEach((value, key) => params.append(key, value.toString()));

    try {
      await fetch("https://readdy.ai/api/form/d77f33ibj7ht1ofp4ju0", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const infoCards = [
    {
      icon: "ri-time-line",
      title: "Quick Response",
      text: "We'll get back to you within 24 hours",
    },
    {
      icon: "ri-price-tag-3-line",
      title: "Transparent Pricing",
      text: "Custom quotes based on your event needs",
    },
    {
      icon: "ri-calendar-check-line",
      title: "Flexible Timeline",
      text: "From concept to launch in 2–3 weeks",
    },
  ];

  return (
    <section
      id="booking"
      ref={ref}
      className="relative"
      style={{
        background: "linear-gradient(180deg, #F5F1EA 0%, #E8E2D4 100%)",
        padding: "120px 0 140px",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-20">
        {/* Header */}
        <div
          className="text-center mb-16"
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
            Get Started
          </p>
          <h2
            className="font-serif leading-tight"
            style={{
              fontSize: "clamp(36px, 5vw, 52px)",
              fontWeight: 300,
              color: "#2A2A2A",
              fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
              letterSpacing: "-0.01em",
            }}
          >
            Let&apos;s create something beautiful
          </h2>
          <p
            className="mt-5 mx-auto"
            style={{
              fontSize: "18px",
              color: "#7A7A7A",
              fontFamily: "'Inter', sans-serif",
              maxWidth: "520px",
              lineHeight: 1.7,
            }}
          >
            Tell us about your event, and we&apos;ll design an experience your guests will never forget.
          </p>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s",
          }}
        >
          {/* Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div
                className="flex flex-col items-center justify-center text-center py-20"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  borderRadius: "16px",
                  border: "1px solid rgba(212,175,55,0.2)",
                  padding: "60px 40px",
                }}
              >
                <div
                  className="w-16 h-16 flex items-center justify-center rounded-full mb-6"
                  style={{ background: "rgba(212,175,55,0.15)" }}
                >
                  <i className="ri-check-line text-2xl" style={{ color: "#C4A84A" }} />
                </div>
                <h3
                  className="font-serif mb-3"
                  style={{
                    fontSize: "28px",
                    fontWeight: 300,
                    color: "#2A2A2A",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                  }}
                >
                  Inquiry Received
                </h3>
                <p style={{ color: "#7A7A7A", fontFamily: "'Inter', sans-serif", lineHeight: 1.7 }}>
                  Thank you for reaching out. We&apos;ll be in touch within 24 hours to discuss your vision.
                </p>
              </div>
            ) : (
              <form
                data-readdy-form
                id="huna-booking-form"
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      className="block text-sm mb-2"
                      style={{ color: "#5A5A5A", fontFamily: "'Inter', sans-serif" }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      required
                      placeholder="Your name"
                      className="w-full text-sm outline-none transition-all duration-200"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        fontFamily: "'Inter', sans-serif",
                        color: "#2A2A2A",
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid rgba(196,168,74,0.7)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(196,168,74,0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.border = "1px solid rgba(0,0,0,0.1)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm mb-2"
                      style={{ color: "#5A5A5A", fontFamily: "'Inter', sans-serif" }}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="your@email.com"
                      className="w-full text-sm outline-none transition-all duration-200"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        fontFamily: "'Inter', sans-serif",
                        color: "#2A2A2A",
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid rgba(196,168,74,0.7)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(196,168,74,0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.border = "1px solid rgba(0,0,0,0.1)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      className="block text-sm mb-2"
                      style={{ color: "#5A5A5A", fontFamily: "'Inter', sans-serif" }}
                    >
                      Event Type
                    </label>
                    <select
                      name="event_type"
                      required
                      className="w-full text-sm outline-none transition-all duration-200 cursor-pointer"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        fontFamily: "'Inter', sans-serif",
                        color: "#2A2A2A",
                        appearance: "none",
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid rgba(196,168,74,0.7)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(196,168,74,0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.border = "1px solid rgba(0,0,0,0.1)";
                        e.target.style.boxShadow = "none";
                      }}
                    >
                      <option value="">Select event type</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Corporate">Corporate Event</option>
                      <option value="Launch">Product Launch</option>
                      <option value="Private Gathering">Private Gathering</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className="block text-sm mb-2"
                      style={{ color: "#5A5A5A", fontFamily: "'Inter', sans-serif" }}
                    >
                      Event Date
                    </label>
                    <input
                      type="date"
                      name="event_date"
                      className="w-full text-sm outline-none transition-all duration-200"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        fontFamily: "'Inter', sans-serif",
                        color: "#2A2A2A",
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid rgba(196,168,74,0.7)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(196,168,74,0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.border = "1px solid rgba(0,0,0,0.1)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm mb-2"
                    style={{ color: "#5A5A5A", fontFamily: "'Inter', sans-serif" }}
                  >
                    Tell us about your vision
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    maxLength={500}
                    placeholder="Describe your event, style preferences, and any special requirements..."
                    className="w-full text-sm outline-none transition-all duration-200 resize-none"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      fontFamily: "'Inter', sans-serif",
                      color: "#2A2A2A",
                    }}
                    onChange={(e) => setCharCount(e.target.value.length)}
                    onFocus={(e) => {
                      e.target.style.border = "1px solid rgba(196,168,74,0.7)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(196,168,74,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.border = "1px solid rgba(0,0,0,0.1)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <p
                    className="text-xs mt-1 text-right"
                    style={{ color: charCount > 480 ? "#C4A84A" : "#AAAAAA", fontFamily: "'Inter', sans-serif" }}
                  >
                    {charCount}/500
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || charCount > 500}
                  className="w-full flex items-center justify-center gap-3 cursor-pointer whitespace-nowrap transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    height: "60px",
                    background: "linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%)",
                    borderRadius: "30px",
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.02em",
                    border: "none",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  }}
                >
                  {submitting ? "Sending..." : "Send Inquiry"}
                  {!submitting && <span style={{ fontSize: "18px" }}>→</span>}
                </button>
              </form>
            )}
          </div>

          {/* Info cards */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {infoCards.map((card, i) => (
              <div
                key={card.title}
                style={{
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: "12px",
                  padding: "28px 32px",
                  border: "1px solid rgba(212,175,55,0.15)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(20px)",
                  transition: `opacity 0.8s ease ${0.4 + i * 0.1}s, transform 0.8s ease ${0.4 + i * 0.1}s`,
                }}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-full mb-4"
                  style={{ background: "rgba(212,175,55,0.1)" }}
                >
                  <i className={`${card.icon} text-lg`} style={{ color: "#C4A84A" }} />
                </div>
                <h4
                  className="font-semibold mb-2"
                  style={{
                    fontSize: "17px",
                    color: "#2A2A2A",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {card.title}
                </h4>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#7A7A7A",
                    fontFamily: "'Inter', sans-serif",
                    lineHeight: 1.6,
                  }}
                >
                  {card.text}
                </p>
              </div>
            ))}

            {/* Trust badge */}
            <div
              className="text-center pt-4"
              style={{
                opacity: visible ? 1 : 0,
                transition: "opacity 0.8s ease 0.7s",
              }}
            >
              <p
                className="text-sm"
                style={{ color: "#8A8A8A", fontFamily: "'Inter', sans-serif" }}
              >
                Trusted by 200+ hosts worldwide
              </p>
              <div className="flex justify-center gap-3 mt-4">
                {["W", "C", "B", "L", "G"].map((letter) => (
                  <div
                    key={letter}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(0,0,0,0.06)",
                      color: "#8A8A8A",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
