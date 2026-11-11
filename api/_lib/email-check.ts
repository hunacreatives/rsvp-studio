import { promises as dns } from "node:dns";
import { isEmail } from "./email.js";

// Is this an email address we can actually deliver to? Bounces count against our sending account
// (Resend shuts accounts down above a 4% bounce rate), and most of ours came from addresses typed into
// our own forms: placeholders ("juandelacruz@gmail.com", "rh@gmail.com") and typos ("gmial.com").
// Returns a short message to show the person, or null when the address looks deliverable.
// The same typo list is in src/lib/emailCheck.ts, which shows "Did you mean …?" before they send.

const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gamil.com": "gmail.com",
  "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.om": "gmail.com", "gmail.comm": "gmail.com", "gmal.com": "gmail.com", "gmail.ph": "gmail.com",
  "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com", "yahooo.com": "yahoo.com", "yhoo.com": "yahoo.com", "yahoo.com.p": "yahoo.com.ph",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.co": "outlook.com", "outllook.com": "outlook.com", "iclod.com": "icloud.com", "icloud.co": "icloud.com", "icoud.com": "icloud.com",
};
// Names people type when they don't want to give their email.
const PLACEHOLDER = /^(test|testing|asdf|qwerty|sample|example|none|noemail|no-?email|na|n\/a|abc|abcd|aaa+|xxx+|123+|juandelacruz|juan\.?delacruz|mariaclara|myemail|youremail)\d*$/i;
// Minimum username lengths at the big free providers (Gmail 6, Yahoo 4).
const MIN_LOCAL: Record<string, number> = { "gmail.com": 6, "googlemail.com": 6, "yahoo.com": 4, "yahoo.com.ph": 4, "ymail.com": 4 };
const KNOWN = new Set(["gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.ph", "ymail.com", "hotmail.com", "outlook.com", "live.com", "icloud.com", "me.com", "proton.me", "protonmail.com"]);

/** The fixed address for a known typo, else null ("ana@gmial.com" → "ana@gmail.com"). */
export function typoFix(email: string): string | null {
  const [local, domain] = email.trim().toLowerCase().split("@");
  return local && domain && TYPOS[domain] ? `${local}@${TYPOS[domain]}` : null;
}

/** Problems we can tell without the network. */
export function emailProblemOffline(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!isEmail(email)) return "That doesn’t look like an email address.";
  const fix = typoFix(email);
  if (fix) return `Did you mean ${fix}?`;
  const [local, domain] = email.split("@");
  if (PLACEHOLDER.test(local.replace(/\+.*$/, ""))) return "Please use your real email address.";
  const min = MIN_LOCAL[domain];
  if (min && local.replace(/\+.*$/, "").replace(/\./g, "").length < min) return "Please check your email address. That one can’t receive mail.";
  return null;
}

// Domains checked recently (a warm function remembers them for a while).
const mxCache = new Map<string, { ok: boolean; at: number }>();
async function canReceive(domain: string): Promise<boolean> {
  if (KNOWN.has(domain)) return true;
  const hit = mxCache.get(domain);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.ok;
  const ok = await Promise.race([
    dns.resolveMx(domain).then(
      (mx) => mx.some((m) => m.exchange && m.exchange !== "."),
      // No mail server listed, or no such domain: nothing can be delivered. (Not falling back to the domain's
      // own address: .ph answers for every made-up name, so that would let any typo through.)
      // Anything else (a DNS hiccup) lets the address through.
      (e: NodeJS.ErrnoException) => !(e.code === "ENODATA" || e.code === "ENOTFOUND"),
    ),
    // a slow DNS answer never blocks anyone
    new Promise<boolean>((r) => setTimeout(() => r(true), 2500)),
  ]);
  mxCache.set(domain, { ok, at: Date.now() });
  return ok;
}

/** Everything above, plus "can this domain receive email at all?" (a DNS lookup, at most ~2.5 s). */
export async function emailProblem(raw: string): Promise<string | null> {
  const offline = emailProblemOffline(raw);
  if (offline) return offline;
  const domain = raw.trim().toLowerCase().split("@")[1];
  return (await canReceive(domain)) ? null : "That email domain can’t receive mail. Please check the spelling.";
}
