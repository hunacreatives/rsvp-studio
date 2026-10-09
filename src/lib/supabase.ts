import { createClient } from "@supabase/supabase-js";

// "Remember login" (sign-in form): ticked → the session is kept in
// localStorage and survives closing the browser; unticked → sessionStorage,
// so closing the browser signs them out. Ticked unless they untick it.
const REMEMBER_KEY = "rsvp-remember-login";

export function setRememberLogin(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
    // storage blocked (private mode): Supabase falls back to memory anyway
  }
}

const remembering = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
};

const authStorage = {
  getItem: (key: string) => {
    try {
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      const [keep, drop] = remembering() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
      keep.setItem(key, value);
      drop.removeItem(key);
    } catch {
      // ignore
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { storage: authStorage },
});
