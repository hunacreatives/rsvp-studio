export default function AnnouncementBar({ text }: { text?: string }) {
  return (
    <div
      className="w-full text-center text-white text-[13px] tracking-wide py-2.5 px-4"
      style={{ background: "var(--acc-sky)" }}
    >
      {text ?? "Fully Booked until October 2026"}
    </div>
  );
}
