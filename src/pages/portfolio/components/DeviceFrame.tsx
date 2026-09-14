import { useEffect, useRef, useState } from "react";

type DeviceType = "laptop" | "phone";

const INTRINSIC: Record<DeviceType, { width: number; height: number }> = {
  laptop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
};

// Non-screen chrome height (bezel padding + laptop base tray), subtracted
// from the shared --frame-h so both mockups' screens end up the same height.
const CHROME: Record<DeviceType, number> = { laptop: 12 + 14, phone: 10 };

export default function DeviceFrame({
  type,
  src,
  title,
}: {
  type: DeviceType;
  src: string;
  title: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  const { width, height } = INTRINSIC[type];
  const isLaptop = type === "laptop";
  const bezelPaddingH = isLaptop ? 12 : 10;
  const bezelWidthPx = scale * width + bezelPaddingH;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setScale(entries[0].contentRect.width / width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div className="inline-flex flex-col items-center">
      <div
        className="relative bg-[#161616]"
        style={{
          borderRadius: isLaptop ? "12px 12px 3px 3px" : "26px",
          padding: isLaptop ? "6px 6px 8px" : "5px",
          boxShadow: "0 40px 70px -35px rgba(0,7,39,0.45)",
        }}
      >
        {isLaptop && (
          <span className="absolute left-1/2 top-[3px] h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-[#3a3a3a]" />
        )}

        <div
          ref={wrapRef}
          className="relative overflow-hidden bg-white"
          style={{
            borderRadius: isLaptop ? "3px" : "21px",
            height: `calc(var(--frame-h) - ${CHROME[type]}px)`,
            aspectRatio: `${width} / ${height}`,
          }}
        >
          {scale > 0 && (
            <iframe
              src={src}
              title={title}
              width={width}
              height={height}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                border: 0,
              }}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
        </div>
      </div>

      {isLaptop && bezelWidthPx > 0 && (
        <div
          style={{
            width: bezelWidthPx * 1.16,
            height: 14,
            borderRadius: "0 0 10px 10px",
            background: "linear-gradient(to bottom, #d9d9d9, #b7b7b7)",
          }}
        >
          <div
            className="mx-auto h-1.5 w-16 rounded-b-md bg-[#9a9a9a]"
            style={{ transform: "translateY(-1px)" }}
          />
        </div>
      )}
    </div>
  );
}
