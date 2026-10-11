import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const DESKTOP_WIDTH = 1024;
const GUTTER = 24;

/**
 * Renders the live template inside a fixed 1024px-wide desktop canvas
 * that is scaled down to fit whatever room the editor leaves.
 *
 * Without this, the preview pane's real width (~600px next to the
 * editor) made every template render its own tablet/mobile layout, so
 * the builder never showed what the published desktop page looks like.
 * Scaling is applied here, in the builder only — templates themselves
 * size from their own container (see the Scrapbook template's container
 * queries), so nothing preview-specific leaks into the published page.
 */
/**
 * `deviceWidth="fill"`: lay the template out at the pane's own width, unscaled —
 * the builder's phone layout uses this so the preview IS what a guest on that
 * phone sees. `gutter` is the padding around the page (24px by default).
 */
export default function PreviewCanvas({
  children,
  deviceWidth = DESKTOP_WIDTH,
  gutter = GUTTER,
}: {
  children: ReactNode;
  deviceWidth?: number | "fill";
  gutter?: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(0);
  const [fillWidth, setFillWidth] = useState(() => (typeof window === "undefined" ? 390 : Math.max(window.innerWidth - gutter * 2, 240)));
  const width = deviceWidth === "fill" ? fillWidth : deviceWidth;

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const content = contentRef.current;
    if (!outer || !content) return;
    if (deviceWidth === "fill") {
      // A hidden pane (0 wide) keeps the last real width.
      if (outer.clientWidth > 0) setFillWidth(Math.max(outer.clientWidth - gutter * 2, 240));
      setScale(1);
      setScaledHeight(content.scrollHeight);
      return;
    }
    const available = Math.max(outer.clientWidth - gutter * 2, 240);
    const nextScale = Math.min(1, available / deviceWidth);
    setScale(nextScale);
    setScaledHeight(content.scrollHeight * nextScale);
  }, [deviceWidth, gutter]);

  useEffect(() => {
    measure();
    const outer = outerRef.current;
    const content = contentRef.current;
    if (!outer || !content) return;
    // Observe both: the pane can resize, and the template's own height
    // changes as the couple edits content.
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(content);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={outerRef}
      style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", background: "#e3ded4", padding: gutter }}
    >
      <div
        style={{
          width: width * scale,
          height: scaledHeight,
          margin: "0 auto",
          position: "relative",
          boxShadow: "0 8px 30px rgba(0,7,39,0.18)",
        }}
      >
        <div
          ref={contentRef}
          style={{
            width,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
