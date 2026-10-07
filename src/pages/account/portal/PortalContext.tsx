import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { PROFILE_EVENT } from "@/pages/home/components/Navbar";
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
      navigate("/", { replace: true });
      return;
    }
    // First visit after verifying their email → send the welcome email once.
    if (user.user_metadata?.welcomed === false && user.email_confirmed_at) {
      supabase.auth.updateUser({ data: { welcomed: true } });
      fetch("/api/send-welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, fullName: user.user_metadata?.full_name ?? "" }),
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

  if (!value) return <>{fallback}</>;
  return <PortalCtx.Provider value={value}>{children}</PortalCtx.Provider>;
}
