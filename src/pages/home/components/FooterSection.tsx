import { Link, useNavigate } from "react-router-dom";

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
      { label: "Portfolio", to: "/portfolio" },
      { label: "FAQ", to: "/faqs" },
      { label: "Blog", to: "/blog" },
    ],
  },
  {
    title: "Studio",
    links: [
      { label: "Start a Project", to: "/enquire#start" },
      { label: "Become a Partner", to: "/enquire/partner" },
      { label: "Inquire", to: "/enquire" },
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
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              Interactive digital invitations and event websites for life's most
              meaningful milestones.
            </p>
            <a
              href="mailto:hello@thersvpstudio.com"
              className="mt-5 inline-block text-sm text-white/80 underline underline-offset-4 hover:text-white"
            >
              hello@thersvpstudio.com
            </a>
            <div className="mt-6 flex gap-4 text-xl">
              <a href="https://www.instagram.com/rsvpstudioo/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white">
                <i className="ri-instagram-line" />
              </a>
              <a href="https://www.facebook.com/share/19fvSStpSZ/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white">
                <i className="ri-facebook-circle-line" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <button
                        onClick={() => {
                          const [p, h] = l.to.split("#");
                          navigate(p || "/");
                          if (h)
                            setTimeout(
                              () =>
                                document
                                  .getElementById(h)
                                  ?.scrollIntoView({ behavior: "smooth" }),
                              300,
                            );
                        }}
                        className="text-sm text-white/70 hover:text-white transition-colors text-left"
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

        <div className="mt-12 border-t border-white/10 pt-6 flex flex-col gap-3 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
            <span>© 2026 The RSVP Studio. All rights reserved.</span>
            <span className="flex gap-4">
              <Link to="/privacy" className="underline underline-offset-4 hover:text-white">
                Privacy Policy
              </Link>
              <Link to="/terms" className="underline underline-offset-4 hover:text-white">
                Terms of Use
              </Link>
            </span>
          </div>
          <p>
            Made with love by{" "}
            <a
              href="https://hunacreatives.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-white"
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
