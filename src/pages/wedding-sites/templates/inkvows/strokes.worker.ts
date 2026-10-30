/// <reference lib="webworker" />
import { analyse, type AnalysisInput } from "./strokes";

// Ink and vows: works out a line's strokes off the page's thread (strokes.ts's analyse), so a
// section arriving never waits on it.
self.onmessage = (e: MessageEvent<{ id: number; input: AnalysisInput }>) => {
  const { id, input } = e.data;
  const out = analyse(input);
  if (!out) { self.postMessage({ id, out: null }); return; }
  self.postMessage({ id, out }, { transfer: [out.time.buffer, out.soft.buffer, out.path.buffer] });
};
