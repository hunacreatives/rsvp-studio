import { useNavigate } from "react-router-dom";
import InstagramSection from "./InstagramSection";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_CREAM = "#FAF8F5";
const COLOR_SAND = "#DFDACF";

export default function FaqSection() {
  const navigate = useNavigate();

  return (
    <>
      {/* FAQ CTA block */}
      <section className="w-full" style={{ background: COLOR_CREAM, padding: "80px 24px 70px" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            style={{
              fontFamily: FONT_PRIMARY,
              fontSize: "clamp(18px, 2.2vw, 30px)",
              fontWeight: 400,
              color: COLOR_DARK,
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              marginBottom: "48px",
            }}
          >
            Have questions? Explore our FAQs for quick<br />
            answers and helpful information about our services.
          </h2>

          <div className="flex items-center justify-center gap-24">
            <a
              href="/faqs"
              onClick={(e) => { e.preventDefault(); navigate("/faqs"); }}
              className="cursor-pointer whitespace-nowrap transition-opacity duration-200 hover:opacity-60"
              style={{
                fontFamily: FONT_SECONDARY,
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.12em",
                color: COLOR_DARK,
                textDecoration: "underline",
                textUnderlineOffset: "4px",
                textTransform: "uppercase" as const,
              }}
            >
              CHECK OUR FAQS
            </a>
            <a
              href="/enquire"
              onClick={(e) => { e.preventDefault(); navigate("/enquire"); }}
              className="cursor-pointer whitespace-nowrap transition-opacity duration-200 hover:opacity-60"
              style={{
                fontFamily: FONT_SECONDARY,
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.12em",
                color: COLOR_DARK,
                textDecoration: "underline",
                textUnderlineOffset: "4px",
                textTransform: "uppercase" as const,
              }}
            >
              GET IN TOUCH
            </a>
          </div>
        </div>
      </section>

      <InstagramSection />
    </>
  );
}