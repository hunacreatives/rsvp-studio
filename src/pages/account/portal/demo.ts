import type { PortalSnapshot } from "./api";
import type { Message } from "./types";

/**
 * Dev-only sample data so the dashboard can be previewed (and
 * screenshot-checked) without a signed-in account or the SQL applied.
 * Turn on with ?demo on any /account URL while running `npm run dev`;
 * it sticks for the browser tab (sessionStorage) until ?demo=off.
 */
const KEY = "rsvp-portal-demo";

export function isDemoMode() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search).get("demo");
  try {
    if (q === "off") sessionStorage.removeItem(KEY);
    else if (q !== null) sessionStorage.setItem(KEY, "1");
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return q !== null && q !== "off";
  }
}

const day = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const dateIn = (days: number) => new Date(Date.now() + days * day).toISOString().slice(0, 10);

const ME = "demo-user";
const NICOLE = "demo-staff-nicole";
const NIKKI = "demo-project-nikki";
const SOPHIA = "demo-project-sophia";
const FRANCIS = "demo-project-francis";

/**
 * `viewer` decides whose eyes the sample data is seen through: the client
 * (Gel) on /account, or a studio team member (Nicole) on /studio — so the
 * console's chat puts the studio's own messages on the right.
 */
export function demoSnapshot(viewer: "client" | "staff" = "client"): PortalSnapshot {
  const snap = clientSnapshot();
  if (viewer === "client") return snap;
  return {
    ...snap,
    profile: {
      ...snap.profile,
      id: NICOLE,
      full_name: "Nicole Reyes",
      email: "nicole@thersvpstudio.com",
      is_staff: true,
      phone: null,
      avatar_url: null,
    },
    threads: snap.threads.map((t) => ({
      ...t,
      counterpartName: "Gel Lim",
      // From the studio's side, unread = the client wrote last.
      unread: t.lastMessage?.sender_id === ME,
    })),
  };
}

function clientSnapshot(): PortalSnapshot {
  return {
    profile: {
      id: ME,
      full_name: "Gel Lim",
      email: "gel@gmail.com",
      created_at: ago(200 * day),
      is_staff: false,
      phone: "+63 917 000 0000",
      location: "Philippines",
      avatar_url: null,
      billing_name: "Gel Lim",
      billing_email: "gel@gmail.com",
      billing_address: null,
      notify_project_updates: true,
      notify_billing_updates: true,
      password_changed_at: ago(92 * day),
    },
    projects: [
      {
        id: NIKKI, name: "Nikki & Alan", event_date: dateIn(120), event_type: "wedding", table_name: null, status: "upcoming",
        project_status: "in_progress", services: ["Wedding Website", "Digital Invitations"], progress: 75,
        next_step: "Guest List Review", next_step_due: dateIn(4), cover_image_url: "/home/hero-phone/carlo-trixia-1.webp",
        site_url: null, completed_at: null, updated_at: ago(2 * day), created_at: ago(60 * day), owner_id: ME, role: "Owner",
      },
      {
        id: SOPHIA, name: "Sophia & Ren", event_date: dateIn(200), event_type: "wedding", table_name: null, status: "upcoming",
        project_status: "in_progress", services: ["Digital Invitations"], progress: 50,
        next_step: "Design Approval", next_step_due: dateIn(7), cover_image_url: "/home/hero-phone/carlo-trixia-2.webp",
        site_url: null, completed_at: null, updated_at: ago(10 * day), created_at: ago(40 * day), owner_id: ME, role: "Owner",
      },
      {
        id: FRANCIS, name: "Francis’ 31st", event_date: dateIn(-18), event_type: "birthday", table_name: null, status: "past",
        project_status: "completed", services: ["Event Website", "RSVP Management"], progress: 100,
        next_step: null, next_step_due: null, cover_image_url: "/portfolio/claudy-at-30.png",
        site_url: "https://claudyat30.com", completed_at: ago(18 * day), updated_at: ago(18 * day), created_at: ago(90 * day), owner_id: ME, role: "Owner",
      },
    ],
    tasks: [
      { id: "t1", event_id: NIKKI, title: "Review guest list", due_date: dateIn(4), done_at: null, sort: 0 },
      { id: "t2", event_id: SOPHIA, title: "Approve final designs", due_date: dateIn(7), done_at: null, sort: 0 },
      { id: "t3", event_id: NIKKI, title: "Confirm event details", due_date: dateIn(10), done_at: null, sort: 1 },
      { id: "t4", event_id: NIKKI, title: "Send photo selection", due_date: dateIn(-6), done_at: ago(7 * day), sort: 2 },
    ],
    activity: [
      { id: "a1", event_id: NIKKI, kind: "file", title: "Design draft uploaded", detail: "Nikki_Alan_Invites_v2.pdf", created_at: ago(2 * day) },
      { id: "a2", event_id: SOPHIA, kind: "payment", title: "Invoice paid", detail: "RSVP-1018", created_at: ago(5 * day) },
      { id: "a3", event_id: FRANCIS, kind: "rsvp", title: "Guest list updated", detail: "12 new RSVPs", created_at: ago(7 * day) },
      { id: "a4", event_id: NIKKI, kind: "task", title: "Task completed", detail: "Send photo selection", created_at: ago(7 * day) },
    ],
    invoices: [
      { id: "i1", number: "RSVP-1027", event_id: NIKKI, description: "Wedding Website + Digital Invitations — balance", amount: 24500, currency: "PHP", status: "open", issued_at: dateIn(-3), due_date: dateIn(4), paid_at: null, payment_url: null, notes: null },
      { id: "i2", number: "RSVP-1018", event_id: SOPHIA, description: "Digital Invitations — 60% deposit", amount: 18500, currency: "PHP", status: "paid", issued_at: dateIn(-25), due_date: dateIn(-15), paid_at: ago(5 * day), payment_url: null, notes: null },
      { id: "i3", number: "RSVP-1012", event_id: NIKKI, description: "Wedding Website + Digital Invitations — 60% deposit", amount: 24500, currency: "PHP", status: "paid", issued_at: dateIn(-58), due_date: dateIn(-50), paid_at: ago(52 * day), payment_url: null, notes: null },
      { id: "i4", number: "RSVP-0994", event_id: FRANCIS, description: "Event Website + RSVP Management", amount: 25000, currency: "PHP", status: "paid", issued_at: dateIn(-45), due_date: dateIn(-39), paid_at: ago(39 * day), payment_url: null, notes: null },
    ],
    threads: [
      thread("th1", NIKKI, "project", "Nikki & Alan Wedding", "Hi Gel, here are the revised invitation designs we discussed.", NICOLE, 2 * 3600_000, true),
      thread("th2", SOPHIA, "project", "Sophia & Ren", "Thank you! That works for us.", ME, day, false),
      thread("th3", null, "general", "Project Kickoff", "Welcome to The RSVP Studio! We’re so glad you’re here.", NICOLE, 4 * day, false),
      thread("th4", FRANCIS, "project", "Francis’ 31st", "Got it, thanks!", ME, 6 * day, false),
    ],
    people: {
      [ME]: { id: ME, full_name: "Gel Lim", avatar_url: null, is_staff: false, email: "gel@gmail.com" },
      [NICOLE]: { id: NICOLE, full_name: "Nicole Reyes", avatar_url: null, is_staff: true },
    },
    sites: {
      [NIKKI]: { slug: "nikki-and-alan", publishedAt: null, templateId: "botanical", heroUrl: null },
    },
  };
}

function thread(
  id: string,
  eventId: string | null,
  kind: "project" | "general",
  subject: string,
  body: string,
  sender: string,
  age: number,
  unread: boolean,
) {
  const at = ago(age);
  const lastMessage: Message = { id: `${id}-last`, thread_id: id, sender_id: sender, body, attachments: [], created_at: at };
  return {
    id, profile_id: ME, event_id: eventId, kind, subject, last_message_at: at, created_at: at,
    lastMessage, unread, counterpartName: "Nicole Reyes", counterpartAvatar: null,
  };
}

export function demoMessages(threadId: string): Message[] {
  const base = (i: number, sender: string, body: string, minsAgo: number, attachments: Message["attachments"] = []): Message => ({
    id: `${threadId}-${i}`, thread_id: threadId, sender_id: sender, body, attachments, created_at: ago(minsAgo * 60_000),
  });
  if (threadId === "th1") {
    return [
      base(1, NICOLE, "Hi Gel! Here are the revised invitation designs we discussed. Let us know what you think!", 180, [
        { name: "Nikki_Alan_Invites_v2.pdf", path: "demo", size: 12.4 * 1024 * 1024, type: "application/pdf" },
      ]),
      base(2, ME, "These look amazing!\nWe just have a few minor comments, will send them over in a bit.", 150),
      base(3, NICOLE, "Perfect! Take your time. If you have any questions in the meantime, feel free to message us here.", 120),
    ];
  }
  return [base(1, NICOLE, "Welcome to The RSVP Studio! We’re so glad you’re here.", 60 * 24 * 4)];
}
