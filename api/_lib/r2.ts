import { createHash, createHmac } from "node:crypto";

// Cloudflare R2 (S3-compatible) with no SDK: SigV4 query-string signing on Node's
// crypto. Used for the browser's direct uploads (presigned PUT, 5 minutes) and for
// the daily photo cleanup (list + delete, server only).
//
// Env (server only — never VITE_): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET, R2_PUBLIC_BASE_URL (e.g. https://media.example.com — the bucket's custom domain).

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const hmac = (k: string | Buffer, s: string) => createHmac("sha256", k).update(s).digest();

export const r2Ready = () =>
  !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_BASE_URL);

export const r2PublicUrl = (key: string) => `${process.env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}`;

/** A presigned URL. Every header in `headers` must be sent exactly as given (it's signed). */
export function presign(method: "PUT" | "GET" | "DELETE", key: string, headers: Record<string, string> = {}, expires = 300, extraQuery: Record<string, string> = {}) {
  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const h: Record<string, string> = { host, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v.trim()])) };
  const signed = Object.keys(h).sort();
  const path = `/${process.env.R2_BUCKET}${key ? "/" + key.split("/").map(enc).join("/") : ""}`;
  const q: Record<string, string> = {
    ...extraQuery,
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${process.env.R2_ACCESS_KEY_ID}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": signed.join(";"),
  };
  const qs = Object.keys(q)
    .sort()
    .map((k) => `${enc(k)}=${enc(q[k])}`)
    .join("&");
  const canonical = [method, path, qs, signed.map((k) => `${k}:${h[k]}\n`).join(""), signed.join(";"), "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, createHash("sha256").update(canonical).digest("hex")].join("\n");
  let k = hmac(`AWS4${process.env.R2_SECRET_ACCESS_KEY}`, day);
  for (const p of ["auto", "s3", "aws4_request"]) k = hmac(k, p);
  return `https://${host}${path}?${qs}&X-Amz-Signature=${createHmac("sha256", k).update(toSign).digest("hex")}`;
}

/** Every key under a prefix (server only). */
export async function r2List(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  for (let page = 0; page < 50; page++) {
    const url = presign("GET", "", {}, 60, { "list-type": "2", prefix, "max-keys": "1000", ...(token ? { "continuation-token": token } : {}) });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`r2 list ${res.status}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1].replace(/&amp;/g, "&"));
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1] : undefined;
    if (!token) break;
  }
  return keys;
}

/** Delete keys one by one (deletes are free on R2; an event has at most a few hundred). */
export async function r2Delete(keys: string[]) {
  for (const key of keys) {
    const res = await fetch(presign("DELETE", key, {}, 60), { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`r2 delete ${res.status}`);
  }
}
