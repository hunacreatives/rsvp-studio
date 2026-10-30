/// <reference lib="webworker" />
import { paint, type PaintJob } from "./materials";

// Capiz: draws one material tile off the page's thread (materials.ts), and hands back an image
// file of it (or, where a worker can't make one, the raw pixels).
self.onmessage = async (e: MessageEvent<{ id: number; job: PaintJob }>) => {
  const { id, job } = e.data;
  const buf = new Uint8ClampedArray(job.w * job.h * 4);
  paint(buf, job);
  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const c = new OffscreenCanvas(job.w, job.h);
      const x = c.getContext("2d");
      if (x) {
        x.putImageData(new ImageData(buf, job.w, job.h), 0, 0);
        const blob = await c.convertToBlob({ type: "image/png" });
        self.postMessage({ id, blob });
        return;
      }
    } catch {
      /* fall through: the pixels themselves */
    }
  }
  self.postMessage({ id, buf }, { transfer: [buf.buffer] });
};
