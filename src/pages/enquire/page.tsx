import { useState } from "react";
import Navbar from "../home/components/Navbar";
import FooterSection from "../home/components/FooterSection";
import InstagramSection from "../home/components/InstagramSection";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_WARM = "#A3968D";
const COLOR_SAND = "#DFDACF";
const COLOR_CREAM = "#FAF8F5";

const processSteps = [
  {
    num: "01/",
    title: "Enquiry",
    desc: "Once we receive your form, we'll get back to you within two business days and connect with you on Viber to chat through your ideas, plans, and creative direction.",
  },
  {
    num: "02/",
    title: "Proposal and Contract",
    desc: "A tailored proposal detailing the scope, timeline, and investment, followed by a contract to formally secure your booking.",
  },
  {
    num: "03/",
    title: "Onboarding",
    desc: "To keep everything seamless and organised, we'll set up a shared folder with a guided content outline that helps simplify every step from day one.",
  },
  {
    num: "04/",
    title: "Design & Development",
    desc: "From concept to final refinements, each stage is thoughtfully considered, with room for your feedback throughout the process.",
  },
  {
    num: "05/",
    title: "Launch",
    desc: "We'll take care of connecting your domain, reviewing every final detail, and launching your website smoothly, with one month of support after launch.",
  },
];

const milestones = [
  "Baby Shower", "Bachelorette", "Birthday", "Bridal Shower",
  "Engagement", "Wedding", "Brand Activations & Launch Events", "Corporate", "Others",
];

const semiCollections = [
  "Alpine", "Classic Elegance", "Coastal Garden", "Modern Minimal", "Tropical",
];

const bespokeCollections = [
  "The Essential Collection", "The Signature Collection", "The Bespoke Collection",
];

const bespokeServices = [
  "Wedding Website Design", "Monogram", "Digital Save the Date",
  "Bespoke Stationery", "RSVP Management",
];

const timelineOptions = ["3 – 4 weeks", "1 – 2 months", "2 – 3 months", "3+ months", "Not Sure Yet"];

const hearAboutOptions = [
  "Instagram", "Facebook", "Google", "Referral from a friend", "Pinterest", "TikTok", "Others",
];

type DesignType = "" | "bespoke" | "semi-custom";

export default function EnquirePage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [designType, setDesignType] = useState<DesignType>("");
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([]);
  const [selectedBespokeServices, setSelectedBespokeServices] = useState<string[]>([]);
  const [selectedBespokeCollections, setSelectedBespokeCollections] = useState<string[]>([]);
  const [selectedSemiCollections, setSelectedSemiCollections] = useState<string[]>([]);
  const [websiteAddons, setWebsiteAddons] = useState<string[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState("");
  const [weddingPlanner, setWeddingPlanner] = useState("");
  const [hearAbout, setHearAbout] = useState("");

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const vision = (form.elements.namedItem("vision") as HTMLTextAreaElement)?.value || "";
    if (vision.length > 500) return;
    setSubmitting(true);
    const params = new URLSearchParams();
    new FormData(form).forEach((v, k) => params.append(k, v.toString()));
    params.set("design_type", designType);
    params.set("milestone_occasions", selectedMilestones.join(", ") || "None");
    params.set("bespoke_services", selectedBespokeServices.join(", ") || "None");
    params.set("bespoke_collections", selectedBespokeCollections.join(", ") || "None");
    params.set("semi_custom_collections", selectedSemiCollections.join(", ") || "None");
    params.set("website_addons", websiteAddons.join(", ") || "None");
    params.set("timeline", selectedTimeline);
    params.set("wedding_planner", weddingPlanner);
    params.set("how_did_you_hear", hearAbout);
    try {
      await fetch("https://readdy.ai/api/form/d845jq5rvgn6qj6abtog", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
    } finally {
      setSubmitted(true);
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "#FFFFFF",
    border: `1px solid ${COLOR_SAND}`,
    borderRadius: "3px",
    padding: "13px 16px",
    fontFamily: FONT_SECONDARY,
    color: COLOR_DARK,
    fontSize: "13px",
    fontWeight: 300,
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: FONT_SECONDARY,
    fontSize: "10px",
    letterSpacing: "0.12em",
    color: COLOR_MID,
    textTransform: "uppercase",
    fontWeight: 500,
    marginBottom: "8px",
  };

  const sectionTitle = (text: string) => (
    <h3 style={{ fontFamily: FONT_PRIMARY, fontSize: "20px", fontWeight: 400, color: COLOR_DARK, letterSpacing: "-0.01em", marginBottom: "20px", paddingBottom: "12px", borderBottom: `1px solid ${COLOR_SAND}` }}>
      {text}
    </h3>
  );

  const pillBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className="cursor-pointer transition-all duration-150 whitespace-nowrap"
      style={{
        padding: "9px 16px",
        border: active ? `1.5px solid ${COLOR_DARK}` : `1px solid ${COLOR_SAND}`,
        borderRadius: "999px",
        background: active ? COLOR_DARK : "transparent",
        color: active ? "#FFFFFF" : COLOR_MID,
        fontFamily: FONT_SECONDARY,
        fontSize: "12px",
        fontWeight: 300,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&family=Dancing+Script:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <Navbar forceDark />

      {/* Hero */}
      <section className="pt-32 pb-10" style={{ background: COLOR_CREAM }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", letterSpacing: "0.2em", color: COLOR_WARM, fontWeight: 500, textTransform: "uppercase", marginBottom: "14px" }}>
            Huna Events
          </p>
          <h1 style={{ fontFamily: FONT_PRIMARY, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 400, color: COLOR_DARK, lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: "20px" }}>
            Craft Your Exceptional<br />Event Milestone Experience
          </h1>
          <p style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", color: COLOR_WARM, lineHeight: 1.85, fontWeight: 300, marginBottom: "10px" }}>
            If you&apos;re interested in working together, please fill out the form below with as many details as you can about your event plans.
            If there are still a few things you&apos;re deciding on, that&apos;s absolutely fine — we can go through the remaining details together once everything is finalized.
          </p>
          <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", color: COLOR_WARM, lineHeight: 1.8, fontWeight: 300 }}>
            For urgent enquiries, feel free to contact us directly at{" "}
            <a href="mailto:contact@hunacreatives.com" style={{ color: COLOR_MID, textDecoration: "underline", textUnderlineOffset: "3px" }}>
              contact@hunacreatives.com
            </a>
          </p>
        </div>
      </section>

      {/* Form */}
      <section style={{ background: COLOR_CREAM, paddingBottom: "100px" }}>
        <div className="max-w-2xl mx-auto px-6">
          {submitted ? (
            <div className="text-center py-24" style={{ background: "#FFFFFF", borderRadius: "4px", border: `1px solid ${COLOR_SAND}` }}>
              <div className="w-12 h-12 flex items-center justify-center rounded-full mx-auto mb-5" style={{ background: COLOR_SAND }}>
                <i className="ri-check-line text-lg" style={{ color: COLOR_MID }} />
              </div>
              <h2 style={{ fontFamily: FONT_PRIMARY, fontSize: "28px", fontWeight: 400, color: COLOR_DARK }}>Enquiry Received</h2>
              <p style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", color: COLOR_WARM, fontWeight: 300, marginTop: "10px" }}>
                We&apos;ll be in touch within two business days.
              </p>
            </div>
          ) : (
            <form data-readdy-form id="huna-enquiry-form" onSubmit={handleSubmit} className="space-y-12">

              {/* YOUR DETAILS */}
              <div>
                {sectionTitle("Your Details")}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Your Name</label>
                      <input type="text" name="your_name" required placeholder="Your name" style={inputStyle}
                        onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                        onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Fiancé&apos;s / Partner&apos;s Name</label>
                      <input type="text" name="partner_name" placeholder="Partner's name" style={inputStyle}
                        onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                        onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Email Address</label>
                      <input type="email" name="email" required placeholder="your@email.com" style={inputStyle}
                        onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                        onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Instagram Handle</label>
                      <input type="text" name="ig_name" placeholder="@yourhandle" style={inputStyle}
                        onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                        onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>How did you hear about us? <span style={{ color: "red" }}>*</span></label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {hearAboutOptions.map((opt) => pillBtn(opt, hearAbout === opt, () => setHearAbout(opt)))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Is there anything else you&apos;d like us to know?</label>
                    <textarea name="additional_info" rows={3} maxLength={500} placeholder="Any important cultural touches, special considerations, preferred aesthetics, design dislikes, or personal details you'd love incorporated into your event..." className="resize-none" style={inputStyle}
                      onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                      onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                  </div>
                </div>
              </div>

              {/* EVENT DETAILS */}
              <div>
                {sectionTitle("Event Details")}
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Event Date <span style={{ color: "red" }}>*</span></label>
                      <input type="date" name="event_date" required style={inputStyle}
                        onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                        onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Event Location <span style={{ color: "red" }}>*</span></label>
                      <input type="text" name="event_location" required placeholder="City, Country" style={inputStyle}
                        onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                        onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Approximate Number of Guests</label>
                    <input type="number" name="guest_count" placeholder="e.g. 100" style={inputStyle}
                      onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                      onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Are you working with a wedding planner? <span style={{ color: "red" }}>*</span></label>
                    <div className="flex gap-3 mt-1">
                      {["Yes", "No, not yet"].map((opt) => pillBtn(opt, weddingPlanner === opt, () => setWeddingPlanner(opt)))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>What milestone or occasion are we celebrating? <span style={{ color: "red" }}>*</span></label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {milestones.map((m) => pillBtn(m, selectedMilestones.includes(m), () => toggleItem(selectedMilestones, setSelectedMilestones, m)))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Mood Board / Design Peg (optional)</label>
                    <div style={{ border: `1px dashed ${COLOR_SAND}`, borderRadius: "3px", padding: "24px", textAlign: "center" }}>
                      <i className="ri-upload-cloud-line text-2xl" style={{ color: COLOR_WARM }} />
                      <p style={{ fontFamily: FONT_SECONDARY, fontSize: "12px", color: COLOR_WARM, fontWeight: 300, marginTop: "8px" }}>
                        Click to choose a file or drag here
                      </p>
                      <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", color: COLOR_SAND, marginTop: "4px" }}>Size limit: 10 MB</p>
                      <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", color: COLOR_WARM, marginTop: "6px", fontStyle: "italic" }}>
                        Note: File uploads are not collected — please share your mood board via email or link.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SERVICES AND PACKAGES */}
              <div>
                {sectionTitle("Services & Packages")}
                <div className="space-y-8">
                  {/* Bespoke vs Semi-Custom */}
                  <div>
                    <label style={labelStyle}>Are you enquiring about Bespoke Design or Semi-Custom?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      {[
                        { val: "bespoke" as DesignType, title: "Bespoke Design", desc: "A fully custom, made-from-scratch experience tailored to your wedding aesthetic." },
                        { val: "semi-custom" as DesignType, title: "Semi-Custom", desc: "Based on our curated collections." },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setDesignType(opt.val)}
                          className="text-left cursor-pointer transition-all duration-150"
                          style={{ padding: "16px 18px", border: designType === opt.val ? `1.5px solid ${COLOR_DARK}` : `1px solid ${COLOR_SAND}`, borderRadius: "4px", background: designType === opt.val ? "#FFFFFF" : "transparent" }}
                        >
                          <p style={{ fontFamily: FONT_SECONDARY, fontSize: "12px", fontWeight: 600, color: COLOR_DARK, marginBottom: "4px" }}>{opt.title}</p>
                          <p style={{ fontFamily: FONT_SECONDARY, fontSize: "12px", fontWeight: 300, color: COLOR_WARM, lineHeight: 1.6 }}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bespoke options */}
                  {designType === "bespoke" && (
                    <>
                      <div>
                        <label style={labelStyle}>Which bespoke collection are you interested in?</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {bespokeCollections.map((c) => pillBtn(c, selectedBespokeCollections.includes(c), () => toggleItem(selectedBespokeCollections, setSelectedBespokeCollections, c)))}
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Which bespoke services are you interested in? Select all that apply.</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {bespokeServices.map((s) => pillBtn(s, selectedBespokeServices.includes(s), () => toggleItem(selectedBespokeServices, setSelectedBespokeServices, s)))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Semi-custom options */}
                  {designType === "semi-custom" && (
                    <>
                      <div>
                        <label style={labelStyle}>Which collections would you like to explore? You can select multiple.</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {semiCollections.map((c) => pillBtn(c, selectedSemiCollections.includes(c), () => toggleItem(selectedSemiCollections, setSelectedSemiCollections, c)))}
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Would you like to enhance your website with optional add-ons?</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {["Digital Save the Date", "RSVP Management", "No, just the website for now"].map((opt) =>
                            pillBtn(opt, websiteAddons.includes(opt), () => toggleItem(websiteAddons, setWebsiteAddons, opt))
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Vision */}
                  <div>
                    <label style={labelStyle}>What is your vision for the design?</label>
                    <p style={{ fontFamily: FONT_SECONDARY, fontSize: "12px", color: COLOR_WARM, fontWeight: 300, marginBottom: "10px" }}>
                      Please describe any ideas, themes, or inspiration you have for your website and stationery.
                    </p>
                    <textarea name="vision" rows={5} maxLength={500} placeholder="Describe the feeling, aesthetic, colours, or references that inspire you..." className="resize-none" style={inputStyle}
                      onChange={(e) => setCharCount(e.target.value.length)}
                      onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                      onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", color: charCount > 480 ? COLOR_MID : COLOR_SAND, textAlign: "right", marginTop: "4px" }}>{charCount}/500</p>
                  </div>

                  {/* Timeline */}
                  <div>
                    <label style={labelStyle}>Ideal project timeline</label>
                    <p style={{ fontFamily: FONT_SECONDARY, fontSize: "12px", color: COLOR_WARM, fontWeight: 300, marginBottom: "10px" }}>
                      When would you ideally like your website / stationery to be ready?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {timelineOptions.map((t) => pillBtn(t, selectedTimeline === t, () => setSelectedTimeline(t)))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || charCount > 500}
                className="w-full whitespace-nowrap cursor-pointer transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                style={{ height: "54px", background: COLOR_DARK, borderRadius: "999px", color: "#FFFFFF", fontSize: "11px", fontWeight: 600, fontFamily: FONT_SECONDARY, letterSpacing: "0.16em", border: "none" }}
              >
                {submitting ? "SENDING..." : "SUBMIT ENQUIRY"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Process section */}
      <section style={{ background: "#2C2C2C", padding: "90px 24px 100px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: FONT_PRIMARY, fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 400, color: "#FFFFFF", letterSpacing: "-0.01em", marginBottom: "64px", textAlign: "center", lineHeight: 1.2 }}>
            Your Journey Begins Here
          </h2>
          <div>
            {processSteps.map((step, i) => (
              <div key={step.num}>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "1fr 1fr", gap: "40px", padding: "36px 0" }}
                >
                  {/* Left: number + title */}
                  <div>
                    <p style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", fontWeight: 300, color: "#AAAAAA", marginBottom: "6px", letterSpacing: "0.02em" }}>
                      {step.num}
                    </p>
                    <p style={{ fontFamily: FONT_SECONDARY, fontSize: "16px", fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.01em" }}>
                      {step.title}
                    </p>
                  </div>
                  {/* Right: description */}
                  <div>
                    <p style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", fontWeight: 300, color: "#CCCCCC", lineHeight: 1.85, textAlign: "justify" }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
                {i < processSteps.length - 1 && (
                  <div style={{ height: "1px", background: "#444444" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <InstagramSection />
      <FooterSection />
    </>
  );
}