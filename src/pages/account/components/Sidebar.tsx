export type Section = "profile" | "events";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Sidebar({
  fullName,
  memberSince,
  section,
  onSection,
  onSignOut,
}: {
  fullName: string;
  memberSince: string;
  section: Section;
  onSection: (s: Section) => void;
  onSignOut: () => void;
}) {
  const items: { key: Section; label: string; icon: string }[] = [
    { key: "profile", label: "Profile", icon: "ri-user-line" },
    { key: "events", label: "My Events", icon: "ri-calendar-check-line" },
  ];

  return (
    <div
      className="w-full md:w-[260px] flex-shrink-0 rounded-2xl p-5"
      style={{ background: "#fff", border: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-3 pb-5 mb-2" style={{ borderBottom: "1px solid var(--line)" }}>
        <div
          className="w-12 h-12 rounded-full grid place-items-center text-[15px] font-semibold flex-shrink-0"
          style={{ background: "var(--acc-blue)", color: "#fff" }}
        >
          {initials(fullName || "?") || "?"}
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-[15px] truncate" style={{ color: "var(--ink)" }}>
            {fullName || "Your account"}
          </p>
          <p className="text-[12px]" style={{ color: "var(--slate)" }}>
            Member since {memberSince}
          </p>
        </div>
      </div>

      <nav className="space-y-1 mt-3">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onSection(item.key)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-colors text-left"
            style={{
              background: section === item.key ? "var(--paper)" : "transparent",
              color: section === item.key ? "var(--ink)" : "var(--slate)",
              fontWeight: section === item.key ? 600 : 500,
            }}
          >
            <i className={`${item.icon} text-lg`} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-colors text-left hover:bg-black/5"
          style={{ color: "var(--acc-coral)" }}
        >
          <i className="ri-logout-box-line text-lg" />
          Log out
        </button>
      </div>
    </div>
  );
}
