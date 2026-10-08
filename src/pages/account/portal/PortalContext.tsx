import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar, { PROFILE_EVENT } from "@/pages/home/components/Navbar";
import AuthModal from "@/pages/home/components/AuthModal";
import * as api from "./api";
import { demoMessages, demoSnapshot, isDemoMode } from "./demo";
import type { Message, Profile, Thread, ThreadKind } from "./types";

type Ctx = api.PortalSnapshot & {
  demo: boolean;
  refresh: () => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  toggleTask: (taskId: string, done: boolean) => Promise<void>;
  getMessages: (threadId: string) => Promise<Message[]>;
  sendMessage: (threadId: string, body: string, files: File[]) => Promise<Message>;
  startThread: (input: { eventId: string | null; kind: ThreadKind; subject: string; body: string; files: File[]; profileId?: string }) => Promise<Thread>;
  markRead: (threadId: string) => void;
  /** Called with every new message the viewer can see (realtime). */
  onMessage: (cb: (m: Message) => void) => () => void;
};

const PortalCtx = createContext<Ctx | null>(null);

export function usePortal() {
  const ctx = useContext(PortalCtx);
  if (!ctx) throw new Error("usePortal must be used inside <PortalProvider>");
  return ctx;
}

export function PortalProvider({ children, fallback, demoAs = "client" }: { children: ReactNode; fallback: ReactNode; demoAs?: "client" | "staff" }) {
  const navigate = useNavigate();
  const [demo] = useState(isDemoMode);
  const [snap, setSnap] = useState<api.PortalSnapshot | null>(null);
  const [linkProblem, setLinkProblem] = useState<string | null>(null);
  const listeners = useRef(new Set<(m: Message) => void>());
  const demoThreads = useRef<Record<string, Message[]>>({});

  const load = useCallback(async () => {
    if (demo) {
      setSnap((s) => s ?? demoSnapshot(demoAs));
      return;
    }
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      // Supabase sends people back with the error in the URL when an email
      // link has expired or was already used. Explain it rather than
      // dropping them on the homepage with no idea what happened.
      const raw = `${window.location.hash.slice(1)}&${window.location.search.slice(1)}`;
      const info = new URLSearchParams(raw);
      if (info.get("error") || info.get("error_code")) {
        setLinkProblem(info.get("error_code") ?? info.get("error") ?? "link");
        return;
      }
      navigate("/", { replace: true });
      return;
    }
    // First visit after verifying their email → send the welcome email once.
    // Google/Facebook sign-ups never verify by email: welcome them on their
    // first visit (their account is minutes old and has never been welcomed).
    const viaProvider = user.app_metadata?.provider && user.app_metadata.provider !== "email";
    const brandNew = Date.now() - new Date(user.created_at).getTime() < 15 * 60 * 1000;
    if ((user.user_metadata?.welcomed === false && user.email_confirmed_at) || (viaProvider && brandNew && user.user_metadata?.welcomed === undefined)) {
      supabase.auth.updateUser({ data: { welcomed: true } });
      fetch("/api/send-welcome-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      }).catch(() => undefined);
    }
    const next = await api.loadSnapshot(user.id);
    if (next) setSnap(next);
  }, [demo, demoAs, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Live messages: refresh inbox rows and hand the message to any open chat.
  const userId = snap?.profile.id;
  const isStaff = !!snap?.profile.is_staff;
  const peopleRef = useRef<api.PortalSnapshot["people"]>({});
  peopleRef.current = snap?.people ?? {};
  useEffect(() => {
    if (demo || !userId) return;
    const channel = supabase
      .channel(`portal-messages-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const m = payload.new as Message;
        listeners.current.forEach((cb) => cb(m));
        const threads = await api.loadThreadSummaries(userId, isStaff, peopleRef.current);
        setSnap((s) => (s ? { ...s, threads } : s));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [demo, userId, isStaff]);

  const value = useMemo<Ctx | null>(() => {
    if (!snap) return null;
    const me = snap.profile;

    const refreshThreads = async () => {
      if (demo) return;
      const threads = await api.loadThreadSummaries(me.id, me.is_staff, snap.people);
      setSnap((s) => (s ? { ...s, threads } : s));
    };

    return {
      ...snap,
      demo,
      refresh: load,
      saveProfile: async (patch) => {
        const before = snap.profile;
        setSnap((s) => (s ? { ...s, profile: { ...s.profile, ...patch } } : s));
        try {
          if (!demo) await api.updateProfile(me.id, patch);
        } catch (e) {
          setSnap((s) => (s ? { ...s, profile: before } : s));
          throw e;
        }
        if (patch.full_name !== undefined) window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: { name: patch.full_name } }));
      },
      uploadAvatar: async (file) => {
        const url = demo ? URL.createObjectURL(file) : await api.uploadAvatar(me.id, file);
        setSnap((s) => (s ? { ...s, profile: { ...s.profile, avatar_url: url } } : s));
        window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: { avatarUrl: url } }));
      },
      toggleTask: async (taskId, done) => {
        const doneAt = done ? new Date().toISOString() : null;
        setSnap((s) => (s ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, done_at: doneAt } : t)) } : s));
        if (!demo) {
          await api.setTaskDone(taskId, done);
          await load();
        }
      },
      getMessages: async (threadId) => {
        if (demo) return (demoThreads.current[threadId] ??= demoMessages(threadId));
        return api.loadMessages(threadId);
      },
      sendMessage: async (threadId, body, files) => {
        if (demo) {
          const m: Message = {
            id: crypto.randomUUID(), thread_id: threadId, sender_id: me.id, body,
            attachments: files.map((f) => ({ name: f.name, path: "demo", size: f.size, type: f.type })),
            created_at: new Date().toISOString(),
          };
          (demoThreads.current[threadId] ??= demoMessages(threadId)).push(m);
          setSnap((s) => s && { ...s, threads: s.threads.map((t) => (t.id === threadId ? { ...t, lastMessage: m, last_message_at: m.created_at } : t)) });
          return m;
        }
        const m = await api.sendMessage(threadId, me.id, body, files);
        await refreshThreads();
        return m;
      },
      startThread: async ({ eventId, kind, subject, body, files, profileId }) => {
        if (demo) {
          const now = new Date().toISOString();
          const t: Thread = { id: crypto.randomUUID(), profile_id: me.id, event_id: eventId, kind, subject, last_message_at: now, created_at: now };
          demoThreads.current[t.id] = [];
          const m: Message = { id: crypto.randomUUID(), thread_id: t.id, sender_id: me.id, body, attachments: [], created_at: now };
          demoThreads.current[t.id].push(m);
          setSnap((s) => s && { ...s, threads: [{ ...t, lastMessage: m, unread: false, counterpartName: "The RSVP Studio", counterpartAvatar: null }, ...s.threads] });
          return t;
        }
        const t = await api.createThread({ profileId: profileId ?? me.id, eventId, kind, subject });
        await api.sendMessage(t.id, me.id, body, files);
        await refreshThreads();
        return t;
      },
      markRead: (threadId) => {
        setSnap((s) => s && { ...s, threads: s.threads.map((t) => (t.id === threadId ? { ...t, unread: false } : t)) });
        if (!demo) api.markThreadRead(threadId, me.id);
      },
      onMessage: (cb) => {
        listeners.current.add(cb);
        return () => listeners.current.delete(cb);
      },
    };
  }, [snap, demo, load]);

  if (linkProblem) return <LinkProblem code={linkProblem} />;
  if (!value) return <>{fallback}</>;
  return <PortalCtx.Provider value={value}>{children}</PortalCtx.Provider>;
}

/** An email link (confirm / reset) that expired or was already used. */
function LinkProblem({ code }: { code: string }) {
  const [authOpen, setAuthOpen] = useState(false);
  const expired = /expired|otp/i.test(code);
  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />
      <main className="container-x flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <img src="/email/confirm-spot.png" alt="" width={112} height={112} className="h-28 w-28" />
        <h1 className="mt-6 font-display text-[2rem] font-semibold leading-tight text-[var(--ink)] md:text-[2.6rem]">
          {expired ? "That link has expired" : "That link didn\u2019t work"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[16px] text-[var(--slate)]">
          Email links work once and only for a limited time. If you already confirmed your email, just log in. If not, log in
          with your email and password and we&rsquo;ll offer to send a fresh&nbsp;link.
        </p>
        <button onClick={() => setAuthOpen(true)} className="btn btn-primary mt-8">
          Log in
        </button>
      </main>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
