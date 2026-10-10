export default function AnnouncementBar({ text }: { text?: string }) {
  return (
    <div
      className="w-full text-center text-white text-[13px] tracking-wide py-2.5 px-4"
      style={{ background: "var(--acc-sky)" }}
    >
      {text ?? "Now booking weddings and celebrations for 2027"}
    </div>
  );
}
