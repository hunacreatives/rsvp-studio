const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_MID = "#4D403A";
const COLOR_CREAM = "#FAF8F5";
const COLOR_SAND = "#DFDACF";

const instagramImages = [
  "https://readdy.ai/api/search-image?query=luxury%20wedding%20event%20website%20design%20on%20screen%2C%20elegant%20editorial%20flat%20lay%20with%20cream%20stationery%20and%20dried%20flowers%20on%20warm%20beige%20background%2C%20soft%20natural%20light%2C%20minimal%20aesthetic%2C%20warm%20neutral%20tones&width=400&height=500&seq=ig-huna-01&orientation=portrait",
  "https://readdy.ai/api/search-image?query=beautiful%20custom%20monogram%20design%20embossed%20on%20cream%20paper%2C%20wax%20seal%20stamp%2C%20elegant%20wedding%20stationery%20flat%20lay%2C%20warm%20ivory%20and%20sand%20tones%2C%20soft%20natural%20light%2C%20minimal%20editorial%20photography&width=400&height=500&seq=ig-huna-02&orientation=portrait",
  "https://readdy.ai/api/search-image?query=digital%20save%20the%20date%20card%20design%20mockup%20displayed%20elegantly%2C%20luxury%20wedding%20announcement%20with%20script%20typography%20on%20warm%20beige%20linen%20background%2C%20editorial%20product%20photography%2C%20soft%20light&width=400&height=500&seq=ig-huna-03&orientation=portrait",
  "https://readdy.ai/api/search-image?query=wedding%20stationery%20suite%20flat%20lay%20with%20menu%20cards%20and%20place%20cards%20on%20textured%20cream%20paper%2C%20hand%20drawn%20botanical%20illustration%2C%20warm%20ivory%20and%20sage%20tones%2C%20soft%20natural%20lighting%2C%20editorial%20photography&width=400&height=500&seq=ig-huna-04&orientation=portrait",
  "https://readdy.ai/api/search-image?query=elegant%20event%20website%20RSVP%20page%20on%20laptop%20screen%2C%20person%20sitting%20on%20cream%20sofa%2C%20warm%20neutral%20interior%2C%20soft%20lifestyle%20photography%2C%20muted%20beige%20and%20ivory%20tones%2C%20minimal%20sophisticated%20composition&width=400&height=500&seq=ig-huna-05&orientation=portrait",
];

export default function InstagramSection() {
  return (
    <>
      <div style={{ borderTop: `1px solid ${COLOR_SAND}` }} />
      <section className="w-full" style={{ background: COLOR_CREAM, padding: "48px 24px 60px" }}>
        <p
          className="text-center mb-8"
          style={{
            fontFamily: FONT_SECONDARY,
            fontSize: "11px",
            letterSpacing: "0.18em",
            color: COLOR_MID,
            textTransform: "uppercase" as const,
            fontWeight: 500,
          }}
        >
          Follow Along on Instagram
        </p>
        <div className="grid grid-cols-5 gap-0 max-w-6xl mx-auto">
          {instagramImages.map((src, i) => (
            <a
              key={i}
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="block overflow-hidden cursor-pointer group"
              style={{ aspectRatio: "4/5" }}
            >
              <img
                src={src}
                alt={`Huna Events Instagram ${i + 1}`}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
            </a>
          ))}
        </div>
      </section>
    </>
  );
}