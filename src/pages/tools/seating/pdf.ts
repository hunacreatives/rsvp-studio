// Real PDF files, made in the browser (no print dialog, so nothing comes out blank): each
// page is drawn as a picture at print resolution (~200 dpi) and written into a small PDF.
// Pages are designed as SVG in points (1/72 inch), like the paper itself.

export type Paper = "A4" | "Letter" | "A3";
export const PAPER: Record<Paper, [number, number]> = { A4: [595, 842], Letter: [612, 792], A3: [842, 1191] };

export interface Page {
  w: number;
  h: number;
  /** Draw the page (canvas already white, scaled so 1 unit = 1 point). */
  draw(ctx: CanvasRenderingContext2D): Promise<void> | void;
}

/** An SVG string as an image, ready to draw. */
export async function svgImage(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Fit an image inside a box, centred. */
export function drawFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / img.width, h / img.height);
  const dw = img.width * k;
  const dh = img.height * k;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

const enc = new TextEncoder();

export async function savePdf(pages: Page[], fileName: string, dpi = 200) {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === "string" ? enc.encode(b) : b;
    chunks.push(u);
    pos += u.length;
  };
  const obj = (n: number, body: string | (() => void)) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
    if (typeof body === "string") push(body);
    else body();
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  // 1 catalog, 2 page tree, then 3 objects per page: page, contents, image.
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const scale = Math.min(dpi / 72, 4096 / Math.max(p.w, p.h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(p.w * scale);
    canvas.height = Math.round(p.h * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    await p.draw(ctx);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    if (!blob) throw new Error("page");
    const jpg = new Uint8Array(await blob.arrayBuffer());
    const n = 3 + i * 3;
    const content = `q ${p.w} 0 0 ${p.h} 0 0 cm /Im${i} Do Q`;
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /XObject << /Im${i} ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`);
    obj(n + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    obj(n + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
      push(jpg);
      push("\nendstream");
    });
  }

  const count = 3 + pages.length * 3;
  const xref = pos;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) table += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  const file = new Blob(chunks as BlobPart[], { type: "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
