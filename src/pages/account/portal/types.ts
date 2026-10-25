// Client-dashboard data shapes. Mirrors supabase/client-dashboard-schema.sql.

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  is_staff: boolean;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  billing_name: string | null;
  billing_email: string | null;
  billing_address: string | null;
  notify_project_updates: boolean;
  notify_billing_updates: boolean;
  /** Follow-up emails: draft reminders, headcount, after the event (supabase/followups.sql). */
  notify_tips?: boolean;
  password_changed_at: string | null;
  /** "I'm a coordinator or planner" (supabase/coordinator-desk.sql): Home is the Coordinator desk. */
  is_coordinator?: boolean;
};

export type ProjectStatus = "in_progress" | "completed";

/** A project is an `events` row (so the site builder + guest list hang off it). */
export type Project = {
  id: string;
  name: string;
  event_date: string | null;
  event_type: string | null;
  table_name: string | null;
  status: string | null; // legacy upcoming/past/archived
  project_status: ProjectStatus;
  services: string[];
  progress: number;
  next_step: string | null;
  next_step_due: string | null;
  /** Whose turn the next step is: the client's ("Your turn") or the studio's ("We're working on"). */
  next_step_owner?: "client" | "studio" | null;
  /** A project the studio runs (vs a DIY website the customer built). */
  managed_by_studio?: boolean;
  cover_image_url: string | null;
  site_url: string | null;
  completed_at: string | null;
  updated_at: string;
  created_at: string;
  owner_id: string | null;
  /** Deleted projects are hidden everywhere except Studio → Projects → Deleted. */
  deleted_at?: string | null;
  role: "Owner" | "Member";
  /** What this person can do on it (coordinator-mode.sql): the couple (owner) and cohosts
   *  edit and pay; a coordinator edits and publishes; a viewer only looks. Staff: "owner". */
  access: EventAccess;
  /** The coordinator who added it for a client (coordinator-desk.sql). They own it until the
   *  client takes it over (handed_over_at), then stay on as its coordinator. */
  client_of?: string | null;
  handed_over_at?: string | null;
  /** An unclaimed client event of mine: who the hand-over invite went to, if one is open. */
  handover_to?: string | null;
  /** A viewer their coordinator invited (crew), not family the couple invited. */
  crew?: boolean;
};
export type EventAccess = "owner" | "cohost" | "coordinator" | "viewer";
/** Pay, upgrade, domains, texts, invite and remove people. */
export const canBill = (p: Pick<Project, "access">) => p.access === "owner" || p.access === "cohost";
/** A client's event: one this person helps with (their coordinator or crew), or one they added
 *  for a client and haven't handed over yet. Under Clients, not Events. */
export const isClientEvent = (p: Pick<Project, "access" | "client_of" | "handed_over_at" | "crew">) =>
  p.access === "coordinator" || (p.access === "viewer" && !!p.crew) || isUnclaimed(p);
/** A client event I still own: I added it for them and they haven't taken it over. */
export const isUnclaimed = (p: Pick<Project, "access" | "client_of" | "handed_over_at">) => p.access === "owner" && !!p.client_of && !p.handed_over_at;
/** Gets the Coordinator desk: said so (Account, or the first-visit choice), or has a client event. */
export const isCoordinator = (profile: Pick<Profile, "is_coordinator">, projects: Pick<Project, "access" | "client_of" | "handed_over_at" | "crew">[]) =>
  !!profile.is_coordinator || projects.some(isClientEvent);
/** Change the website, guests, replies and seating. */
export const canEdit = (p: Pick<Project, "access">) => p.access !== "viewer";

export type Task = {
  id: string;
  event_id: string;
  title: string;
  due_date: string | null;
  done_at: string | null;
  sort: number;
};

export type ActivityKind = "update" | "file" | "invoice" | "payment" | "task" | "rsvp" | "status";

export type Activity = {
  id: string;
  event_id: string;
  kind: ActivityKind;
  title: string;
  detail: string | null;
  created_at: string;
};

export type InvoiceStatus = "open" | "paid" | "void";

export type Invoice = {
  id: string;
  number: string;
  event_id: string;
  description: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: string;
  due_date: string | null;
  paid_at: string | null;
  payment_url: string | null;
  notes: string | null;
  /** How it was paid (gcash · card · bank transfer …) and its reference — supabase/payments.sql. */
  paid_method?: string | null;
  paid_reference?: string | null;
  last_reminded_at?: string | null;
};

export type ThreadKind = "project" | "support" | "general";

export type SupportStatus = "needs_reply" | "waiting" | "resolved";
export type SupportCategory = "website" | "invitations" | "stationery" | "billing" | "account" | "other";

export type Thread = {
  id: string;
  profile_id: string;
  event_id: string | null;
  kind: ThreadKind;
  subject: string;
  last_message_at: string;
  created_at: string;
  /** Support requests only (supabase/support-tickets.sql). */
  ticket_number?: number | null;
  category?: SupportCategory | null;
  status?: SupportStatus | null;
  urgent?: boolean;
  first_response_at?: string | null;
  resolved_at?: string | null;
  last_customer_at?: string | null;
  /** Team member handling the request. */
  assigned_to?: string | null;
  /** Lifecycle (supabase/support-lifecycle.sql). */
  waiting_since?: string | null;
  reminder_sent_at?: string | null;
  auto_closed_at?: string | null;
  /** No reminder or auto-close until after this day (YYYY-MM-DD). */
  hold_until?: string | null;
  rating?: SupportRating | null;
  rating_comment?: string | null;
  rated_at?: string | null;
  /** Private part of the request's email reply address. */
  reply_key?: string | null;
};

export type SupportRating = "great" | "okay" | "not_good";

export type Attachment = { name: string; path: string; size: number; type: string };

export type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachments: Attachment[];
  created_at: string;
  /** Staff-only note on a support request (customers never receive these). */
  internal?: boolean;
  /** Arrived as an email reply (supabase/support-email-replies.sql). */
  via?: "email" | null;
};

/** Thread as shown in an inbox: joined with its latest message + unread flag. */
export type ThreadSummary = Thread & {
  lastMessage: Message | null;
  unread: boolean;
  /** Who the other side is, for the inbox row title. */
  counterpartName: string;
  counterpartAvatar: string | null;
};

export type PersonLite = { id: string; full_name: string | null; avatar_url: string | null; is_staff: boolean; email?: string | null; /** event_members.role, on members */ role?: string };
