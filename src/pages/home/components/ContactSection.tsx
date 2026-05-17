import { useEffect, useRef, useState } from "react";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_WARM = "#A3968D";
const COLOR_SAND = "#DFDACF";
const COLOR_CREAM = "#FAF8F5";

export default function ContactSection() {
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
      await fetch("https://readdy.ai/api/form/d7ecfgbfimgqccpma6f0", {
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

  const inputStyle = {
    background: "#FFFFFF",
    border: `1px solid ${COLOR_SAND}`,
    borderRadius: "3px",
    padding: "13px 16px",
    fontFamily: FONT_SECONDARY,
    color: COLOR_DARK,
    fontSize: "14px",
    fontWeight: 300,
    width: "100%",
    outline: "none",
  };

  return (
    <section id="contact" ref={ref} style={{ background: "#FFFFFF", padding: "100px 0 120px" }}>
      <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20">
        <div
          className="text-center mb-14"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)", transition: "opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s" }}
        >
          <h2 style={{ fontSize: "clamp(30px, 4.5vw, 48px)", fontWeight: 400, color: COLOR_DARK, fontFamily: FONT_PRIMARY, letterSpacing: "-0.01em" }}>
            Let&apos;s Create Something Beautiful
          </h2>
          <p className="mt-4 mx-auto" style={{ fontSize: "14px", color: COLOR_WARM, fontFamily: FONT_SECONDARY, maxWidth: "420px", lineHeight: 1.8, fontWeight: 300 }}>
            Tell us about your event and we&apos;ll be in touch within 24 hours.
          </p>
        </div>

        <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)", transition: "opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s" }}>
          {submitted ? (
            <div className="text-center py-20" style={{ background: COLOR_CREAM, borderRadius: "4px", border: `1px solid ${COLOR_SAND}` }}>
              <div className="w-12 h-12 flex items-center justify-center rounded-full mx-auto mb-5" style={{ background: COLOR_SAND }}>
                <i className="ri-check-line text-lg" style={{ color: COLOR_MID }} />
              </div>
              <h3 style={{ fontSize: "26px", fontWeight: 400, color: COLOR_DARK, fontFamily: FONT_PRIMARY }}>Enquiry Received</h3>
              <p className="mt-2" style={{ color: COLOR_WARM, fontFamily: FONT_SECONDARY, fontSize: "14px", fontWeight: 300 }}>We&apos;ll be in touch within 24 hours.</p>
            </div>
          ) : (
            <form data-readdy-form id="huna-inquiry-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2" style={{ fontSize: "11px", color: COLOR_MID, fontFamily: FONT_SECONDARY, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>Full Name</label>
                  <input type="text" name="full_name" required placeholder="Your name"
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                    onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }}
                  />
                </div>
                <div>
                  <label className="block mb-2" style={{ fontSize: "11px", color: COLOR_MID, fontFamily: FONT_SECONDARY, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>Email Address</label>
                  <input type="email" name="email" required placeholder="your@email.com"
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                    onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2" style={{ fontSize: "11px", color: COLOR_MID, fontFamily: FONT_SECONDARY, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>Service</label>
                  <select name="service" required style={{ ...inputStyle, appearance: "none" as const, cursor: "pointer" }}
                    onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                    onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }}
                  >
                    <option value="">Select a service</option>
                    <option value="Semi-Custom Website">Semi-Custom Website</option>
                    <option value="Bespoke Website">Bespoke Premium Website</option>
                    <option value="Monogram">Monogram</option>
                    <option value="Digital Save the Date">Digital Save the Date</option>
                    <option value="Stationery">Illustrations / Stationery</option>
                    <option value="Full Package">Full Package</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2" style={{ fontSize: "11px", color: COLOR_MID, fontFamily: FONT_SECONDARY, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>Event Date</label>
                  <input type="date" name="event_date"
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                    onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-2" style={{ fontSize: "11px", color: COLOR_MID, fontFamily: FONT_SECONDARY, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>Your Vision</label>
                <textarea name="message" rows={4} maxLength={500} placeholder="Describe your event, style, and any special requirements..."
                  className="resize-none"
                  style={inputStyle}
                  onChange={(e) => setCharCount(e.target.value.length)}
                  onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                  onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }}
                />
                <p className="text-xs mt-1 text-right" style={{ color: charCount > 480 ? COLOR_MID : COLOR_SAND, fontFamily: FONT_SECONDARY }}>{charCount}/500</p>
              </div>
              <button type="submit" disabled={submitting || charCount > 500}
                className="w-full whitespace-nowrap cursor-pointer transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                style={{ height: "52px", background: COLOR_DARK, borderRadius: "3px", color: "#FFFFFF", fontSize: "11px", fontWeight: 600, fontFamily: FONT_SECONDARY, letterSpacing: "0.14em", border: "none" }}
              >
                {submitting ? "SENDING..." : "SEND ENQUIRY"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
