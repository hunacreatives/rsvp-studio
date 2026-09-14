import InvitePlaceholder from "@/pages/home/components/InvitePlaceholder";

/** iPad + phone pair showing an evite — bleeds off the row edge. */
export function DeviceMockup() {
  return (
    <div className="relative w-full max-w-[560px] aspect-[4/3]">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[74%] aspect-[4/3] rounded-[22px] border-[10px] border-[#1a1a1a] bg-[#1a1a1a] shadow-[0_40px_80px_-30px_rgba(0,7,39,0.4)]">
        <div className="absolute inset-0 rounded-[12px] overflow-hidden">
          <InvitePlaceholder seed={3} label="Carlo & Trixia" rounded={0} className="w-full h-full" />
        </div>
      </div>
      <div className="absolute right-0 bottom-0 w-[34%] aspect-[9/19] rounded-[26px] border-[8px] border-[#111] bg-[#111] shadow-[0_30px_60px_-24px_rgba(0,7,39,0.45)]">
        <div className="absolute left-1/2 top-1.5 -translate-x-1/2 w-10 h-1 rounded-full bg-black/60" />
        <div className="absolute inset-0 rounded-[18px] overflow-hidden">
          <InvitePlaceholder seed={7} rounded={0} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}

/** Layered monogram crests. */
export function MonogramMockup() {
  return (
    <div className="relative w-full max-w-[460px] aspect-square">
      <div className="absolute left-[4%] top-[6%] w-[52%] aspect-square rounded-full grid place-items-center bg-[#8ea3c4] text-white shadow-[0_30px_60px_-28px_rgba(0,7,39,0.4)]">
        <span className="font-display text-5xl">AL</span>
      </div>
      <div className="absolute right-0 top-[10%] w-[52%] aspect-square rounded-full grid place-items-center border-[6px] border-[#a9c8e0] bg-[#cfe2f0] text-[#3a6ea5] shadow-[0_30px_60px_-28px_rgba(0,7,39,0.35)]">
        <span className="font-display text-4xl tracking-wide">TH</span>
      </div>
      <div className="absolute left-[12%] bottom-0 w-[42%] aspect-[3/4] rounded-[14px] grid place-items-center border-2 border-[#b7c9a6] bg-[#eef3e6] text-[#7d9060] shadow-[0_24px_50px_-26px_rgba(0,7,39,0.3)]">
        <span className="font-display text-3xl">CPG</span>
      </div>
    </div>
  );
}

/** Faux RSVP dashboard. */
export function DashboardMockup() {
  const rows = [
    ["Hartley Page", "Reception, Ceremony", "May 7th"],
    ["Harper James", "Reception, Ceremony", "May 7th"],
    ["Cooper Davis", "Ceremony, Reception", "May 6th"],
    ["Nora Rivera", "Ceremony, Reception", "May 5th"],
    ["Hunter Fox", "Ceremony, Reception", "May 5th"],
  ];
  return (
    <div className="w-full max-w-[620px] rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_40px_80px_-32px_rgba(0,7,39,0.28)]">
      <div className="flex gap-3 text-xs">
        <span className="rounded-md bg-[var(--ink)] text-white px-2.5 py-1">
          Guest Management
        </span>
        <span className="rounded-md bg-black/5 px-2.5 py-1 text-[var(--slate)]">
          Invitation Suite
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Guest Counts", "Yes 105 · No 4"],
          ["Event Counts", "Ceremony 104"],
          ["Food Counts", "3 menus"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[var(--paper)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--slate)]">
              {k}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--ink)]">{v}</p>
          </div>
        ))}
      </div>
      <table className="mt-4 w-full text-left text-xs">
        <thead className="text-[var(--slate)]">
          <tr className="border-b border-[var(--line)]">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Events</th>
            <th className="py-2 font-medium text-right">RSVP'd On</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([n, e, d]) => (
            <tr key={n} className="border-b border-[var(--line)]/70">
              <td className="py-2.5 text-[var(--ink)]">{n}</td>
              <td className="py-2.5 text-[var(--slate)]">{e}</td>
              <td className="py-2.5 text-right text-[var(--slate)]">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Fanned digital save-the-date cards. */
export function SaveTheDateMockup() {
  const cards = [
    { src: "/services/save-the-date/card-hudson.jpg", rot: -12, x: "-46%", z: 1 },
    { src: "/services/save-the-date/card-wildone.jpg", rot: 0, x: "-50%", z: 3 },
    { src: "/services/save-the-date/card-destiny.jpg", rot: 12, x: "-54%", z: 1 },
  ];
  return (
    <div className="relative w-full max-w-[460px] aspect-[4/3]">
      {cards.map((c, i) => (
        <img
          key={c.src}
          src={c.src}
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 w-[46%] rounded-[12px] shadow-[0_34px_70px_-30px_rgba(0,7,39,0.4)]"
          style={{
            transform: `translate(${c.x}, -50%) rotate(${c.rot}deg) scale(${
              i === 1 ? 1 : 0.92
            })`,
            zIndex: c.z,
          }}
        />
      ))}
    </div>
  );
}

/** Stationery suite flat-lay trio. */
export function StationeryMockup() {
  const cards = [
    { src: "/services/stationery/suite-essential.jpg", rot: -7, x: "-58%", z: 1 },
    { src: "/services/stationery/suite-signature.jpg", rot: 0, x: "-50%", z: 3 },
    { src: "/services/stationery/suite-heirloom.jpg", rot: 7, x: "-42%", z: 1 },
  ];
  return (
    <div className="relative w-full max-w-[480px] aspect-[4/3]">
      {cards.map((c, i) => (
        <img
          key={c.src}
          src={c.src}
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 w-[62%] rounded-xl shadow-[0_34px_70px_-30px_rgba(0,7,39,0.4)]"
          style={{
            transform: `translate(${c.x}, -50%) rotate(${c.rot}deg) scale(${i === 1 ? 1 : 0.9})`,
            zIndex: c.z,
          }}
        />
      ))}
    </div>
  );
}

/** Blurred placeholder for services still in the works. */
export function ComingSoonMockup() {
  return (
    <div className="relative w-full max-w-[420px] aspect-[3/4] rounded-2xl overflow-hidden">
      <div className="absolute inset-0 blur-2xl scale-110">
        <InvitePlaceholder seed={5} rounded={0} className="w-full h-full" />
      </div>
      <div className="absolute inset-0 bg-white/45" />
    </div>
  );
}
