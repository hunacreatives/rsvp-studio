import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/pages/home/components/Navbar";
import AnnouncementBanner from "@/pages/home/components/AnnouncementBanner";
import FooterSection from "@/pages/home/components/FooterSection";
import InstagramSection from "@/pages/home/components/InstagramSection";
import { monogramProducts } from "./data";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_WARM = "#A3968D";
const COLOR_SAND = "#DFDACF";
const COLOR_CREAM = "#F5F2ED";

type Variant = "INITIALS ONLY" | "INITIALS & NAMES";

export default function MonogramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bannerVisible, setBannerVisible] = useState(true);

  const product = monogramProducts.find((p) => p.id === id);

  const [activeThumb, setActiveThumb] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<Variant>("INITIALS ONLY");

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: FONT_SECONDARY, color: COLOR_WARM }}>
        Monogram not found.{" "}
        <button onClick={() => navigate("/monogram")} style={{ marginLeft: 8, textDecoration: "underline", cursor: "pointer", background: "none", border: "none", color: COLOR_WARM }}>
          Go back
        </button>
      </div>
    );
  }

  const allImgs = [product.mainImg, ...product.thumbImgs];
  const displayImg = allImgs[activeThumb] ?? product.mainImg;

  const handleEnquire = () => navigate("/enquire");

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      {bannerVisible && <AnnouncementBanner onClose={() => setBannerVisible(false)} />}
      <Navbar forceDark bannerVisible={bannerVisible} />

      <main
        style={{
          background: COLOR_CREAM,
          minHeight: "100vh",
          paddingTop: bannerVisible ? "140px" : "100px",
        }}
      >
        {/* Back link */}
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px clamp(24px, 5vw, 72px) 0" }}>
          <button
            onClick={() => navigate("/monogram")}
            className="cursor-pointer flex items-center gap-2 transition-opacity duration-200 hover:opacity-50"
            style={{
              fontFamily: FONT_SECONDARY,
              fontSize: "11px",
              fontWeight: 400,
              letterSpacing: "0.08em",
              color: COLOR_WARM,
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            <i className="ri-arrow-left-line" style={{ fontSize: "14px" }} />
            BACK TO MONOGRAMS
          </button>
        </div>

        {/* Product layout */}
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "40px clamp(24px, 5vw, 72px) 100px",
          }}
        >
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: "clamp(40px, 6vw, 96px)", alignItems: "start" }}
          >
            {/* ── Left: image + thumbnails ── */}
            <div>
              <div
                className="w-full overflow-hidden"
                style={{ aspectRatio: "4/5", borderRadius: "3px", background: COLOR_SAND, marginBottom: "12px" }}
              >
                <img
                  src={displayImg}
                  alt={`Monogram ${product.number}`}
                  className="w-full h-full object-cover object-top"
                  style={{ display: "block", transition: "opacity 0.3s" }}
                />
              </div>
              {/* Thumbnails */}
              <div className="flex gap-2">
                {allImgs.slice(0, 5).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveThumb(i)}
                    className="cursor-pointer flex-1 overflow-hidden"
                    style={{
                      aspectRatio: "1/1",
                      borderRadius: "2px",
                      border: activeThumb === i
                        ? `1.5px solid ${COLOR_DARK}`
                        : `1.5px solid transparent`,
                      background: COLOR_SAND,
                      padding: 0,
                    }}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full h-full object-cover object-top"
                      style={{ display: "block" }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* ── Right: details ── */}
            <div style={{ paddingTop: "8px" }}>
              <h1
                style={{
                  fontFamily: FONT_PRIMARY,
                  fontSize: "clamp(28px, 3vw, 42px)",
                  fontWeight: 400,
                  color: COLOR_DARK,
                  marginBottom: "8px",
                  lineHeight: 1.1,
                }}
              >
                {product.number}
              </h1>
              <p
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "16px",
                  fontWeight: 300,
                  color: COLOR_WARM,
                  marginBottom: "16px",
                }}
              >
                {product.price}
              </p>
              <p
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "13px",
                  fontWeight: 300,
                  color: COLOR_MID,
                  lineHeight: 1.85,
                  marginBottom: "40px",
                }}
              >
                {product.description}
              </p>

              {/* Variant label */}
              <p
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "12px",
                  fontWeight: 400,
                  color: COLOR_WARM,
                  letterSpacing: "0.06em",
                  marginBottom: "12px",
                }}
              >
                Variant
              </p>
              {/* Variant pills */}
              <div className="flex gap-3 flex-wrap" style={{ marginBottom: "32px" }}>
                {(["INITIALS ONLY", "INITIALS & NAMES"] as Variant[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVariant(v)}
                    className="whitespace-nowrap cursor-pointer transition-all duration-200"
                    style={{
                      fontFamily: FONT_SECONDARY,
                      fontSize: "11px",
                      fontWeight: 400,
                      letterSpacing: "0.08em",
                      color: selectedVariant === v ? COLOR_DARK : COLOR_WARM,
                      background: "transparent",
                      border: `1px solid ${selectedVariant === v ? COLOR_DARK : COLOR_SAND}`,
                      borderRadius: "999px",
                      padding: "8px 20px",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Buy / Cart */}
              <div className="flex gap-3" style={{ marginBottom: "12px" }}>
                <button
                  onClick={handleEnquire}
                  className="whitespace-nowrap cursor-pointer transition-all duration-200 hover:opacity-80 flex-1"
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    color: "#FFFFFF",
                    background: COLOR_DARK,
                    border: "none",
                    borderRadius: "999px",
                    padding: "14px 20px",
                  }}
                >
                  BUY NOW
                </button>
                <button
                  onClick={handleEnquire}
                  className="whitespace-nowrap cursor-pointer transition-all duration-200 hover:opacity-50 flex-1"
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "11px",
                    fontWeight: 400,
                    letterSpacing: "0.1em",
                    color: COLOR_DARK,
                    background: "transparent",
                    border: `1px solid ${COLOR_SAND}`,
                    borderRadius: "999px",
                    padding: "14px 20px",
                  }}
                >
                  ADD TO CART
                </button>
              </div>

              {/* Revision add-on */}
              <button
                onClick={handleEnquire}
                className="whitespace-nowrap cursor-pointer transition-all duration-200 hover:opacity-50 w-full"
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "11px",
                  fontWeight: 400,
                  letterSpacing: "0.1em",
                  color: COLOR_MID,
                  background: "transparent",
                  border: `1px solid ${COLOR_SAND}`,
                  borderRadius: "999px",
                  padding: "14px 20px",
                }}
              >
                REVISION ADD ON
              </button>
            </div>
          </div>

          {/* ── Monogram Variations ── */}
          <div style={{ marginTop: "96px" }}>
            <h2
              className="text-center"
              style={{
                fontFamily: FONT_PRIMARY,
                fontSize: "clamp(24px, 3vw, 38px)",
                fontWeight: 400,
                color: COLOR_DARK,
                marginBottom: "14px",
              }}
            >
              Monogram Variations
            </h2>
            <p
              className="text-center"
              style={{
                fontFamily: FONT_SECONDARY,
                fontSize: "13px",
                fontWeight: 300,
                color: COLOR_WARM,
                lineHeight: 1.75,
                maxWidth: "600px",
                margin: "0 auto 44px",
              }}
            >
              Monogram {product.number} presented in multiple variations, demonstrating its clean,
              adaptable design across different initials.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "clamp(12px, 2vw, 24px)",
              }}
            >
              {product.variationImgs.map((img, i) => (
                <div
                  key={i}
                  className="overflow-hidden w-full"
                  style={{ aspectRatio: "4/5", borderRadius: "3px", background: COLOR_SAND }}
                >
                  <img
                    src={img}
                    alt={`Variation ${i + 1}`}
                    className="w-full h-full object-cover object-top"
                    style={{ display: "block" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <InstagramSection />
      <FooterSection />
    </>
  );
}