import { Link, useNavigate } from "react-router-dom";
import { goTo } from "@/lib/goTo";
import { FACEBOOK_URL, INSTAGRAM_URL, MESSENGER_URL } from "@/lib/social";

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Services",
    links: [
      { label: "Milestone Events Website", to: "/services/milestone" },
      { label: "Monogram Design", to: "/services/monogram" },
      { label: "Digital Save the Date", to: "/services/save-the-date" },
      { label: "Stationery Design", to: "/services/stationery" },
      { label: "RSVP Management", to: "/services/rsvp" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Collections", to: "/collections" },
      { label: "Our work", to: "/portfolio" },
      { label: "FAQ", to: "/faqs" },
      { label: "Blog", to: "/blog" },
    ],
  },
  {
    title: "Studio",
    links: [
      { label: "Start a Project", to: "/enquire#start" },
      { label: "Contact us", to: "/contact" },
      { label: "Build your own website", to: "/build" },
      { label: "Mesa: free seating charts", to: "/tools/seating-chart-maker" },
      { label: "For coordinators", to: "/partners" },
      { label: "Earn with us", to: "/partners?type=creator" },
    ],
  },
];

export default function FooterSection() {
  const navigate = useNavigate();
  return (
    <footer style={{ background: "var(--ink)" }} className="text-white/80">
      <div className="container-x pt-16 pb-8 md:pt-20 md:pb-10">
        <div className="grid gap-12 md:grid-cols-[1.2fr_2fr]">
          <div>
            <img
              src="/brand/logotype-white.png"
              alt="The RSVP Studio"
              className="h-12 w-auto"
            />
            <p className="mt-5 max-w-xs font-display text-[17px] italic leading-snug text-white/90">
              Your celebration is our celebration, too.
            </p>
            <a
              href="mailto:hello@thersvpstudio.com"
              className="mt-3 inline-block py-2 text-[15px] md:text-sm text-white/80 underline underline-offset-4 [overflow-wrap:anywhere] hover:text-white"
            >
              hello@thersvpstudio.com
            </a>
            <div className="mt-3 -ml-2.5 flex gap-1 text-xl md:mt-4">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-11 w-11 place-items-center hover:text-white">
                <i className="ri-instagram-line" />
              </a>
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-11 w-11 place-items-center hover:text-white">
                <i className="ri-facebook-circle-line" />
              </a>
              <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer" aria-label="Message us on Messenger" className="grid h-11 w-11 place-items-center hover:text-white">
                <i className="ri-messenger-line" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-8 md:gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[12px] md:text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60 md:text-white/50">
                  {col.title}
                </p>
                <ul className="mt-2 md:mt-4 md:space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <button
                        onClick={() => goTo(navigate, l.to)}
                        className="block w-full py-2 text-left text-[15px] text-white/75 transition-colors hover:text-white md:inline md:w-auto md:py-0 md:text-sm md:text-white/70"
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 flex flex-col gap-3 text-[13px] md:text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
            <span>© 2026 The RSVP Studio. All rights reserved.</span>
            <span className="flex gap-5 sm:gap-4">
              <Link to="/privacy" className="inline-block py-2.5 underline underline-offset-4 hover:text-white sm:py-0">
                Privacy Policy
              </Link>
              <Link to="/terms" className="inline-block py-2.5 underline underline-offset-4 hover:text-white sm:py-0">
                Terms of Service
              </Link>
            </span>
          </div>
          <p>
            Made with love by{" "}
            <a
              href="https://hunacreatives.com"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 underline underline-offset-4 hover:text-white"
            >
              Huna Creatives
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
