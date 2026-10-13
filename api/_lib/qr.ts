import type { VercelRequest, VercelResponse } from "@vercel/node";
import QRCode from "qrcode";

// /qr/<slug>.png (vercel.json → /api/invite-page?op=qr&slug=…): the QR code for a site's
// guest photo page, as a real image, because email apps block images built into the
// email itself. Used in the hosts' week-before email. It only encodes a public link, so
// it's safe to serve for any well-formed slug.

export async function qrHandler(req: VercelRequest, res: VercelResponse) {
  const slug = String(req.query.slug ?? "").toLowerCase().replace(/\.png$/, "");
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return res.status(404).send("Not found");
  const png = await QRCode.toBuffer(`https://thersvpstudio.com/invite/${slug}/photos`, { width: 480, margin: 2, color: { dark: "#000727", light: "#ffffff" } });
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  return res.status(200).send(png);
}
