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
export default function PreviewCanvas({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(0);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const content = contentRef.current;
    if (!outer || !content) return;
    const available = Math.max(outer.clientWidth - GUTTER * 2, 240);
    const nextScale = Math.min(1, available / DESKTOP_WIDTH);
    setScale(nextScale);
    setScaledHeight(content.scrollHeight * nextScale);
  }, []);

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
      style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", background: "#e3ded4", padding: GUTTER }}
    >
      <div
        style={{
          width: DESKTOP_WIDTH * scale,
          height: scaledHeight,
          margin: "0 auto",
          position: "relative",
          boxShadow: "0 8px 30px rgba(0,7,39,0.18)",
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: DESKTOP_WIDTH,
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
