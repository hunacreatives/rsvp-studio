// "Did you mean ana@gmail.com?" before a form is sent. The same rules as api/_lib/email-check.ts (which
// also checks the domain can receive mail); keep the two lists in step. Placeholders and typos are most
// of the email that bounces back to us, and too many bounces put our sending account at risk.

const isEmail = (s: string) => /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(s) && s.length <= 254;

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
