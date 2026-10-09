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
  password_changed_at: string | null;
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
  cover_image_url: string | null;
  site_url: string | null;
  completed_at: string | null;
  updated_at: string;
  created_at: string;
  owner_id: string | null;
  role: "Owner" | "Member";
};

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

export type PersonLite = { id: string; full_name: string | null; avatar_url: string | null; is_staff: boolean; email?: string | null };
