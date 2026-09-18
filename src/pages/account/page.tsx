import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Sidebar, { type Section } from "./components/Sidebar";
import ProfileSection from "./components/ProfileSection";
import EventsSection, { type Event } from "./components/EventsSection";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export default function AccountDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }

      const [profileRes, ownEvents, memberEvents] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at").eq("id", session.user.id).single(),
        supabase.from("events").select("id, name, event_date, table_name").eq("owner_id", session.user.id),
        supabase
          .from("event_members")
          .select("events(id, name, event_date, table_name)")
          .eq("profile_id", session.user.id),
      ]);

      setProfile(profileRes.data ?? null);

      const combined: Event[] = [
        ...(ownEvents.data ?? []),
        ...((memberEvents.data ?? []).flatMap((r) => (r.events ? [r.events as unknown as Event] : []))),
      ];

      if (combined.length === 0) {
        navigate("/account/onboarding");
        return;
      }

      setEvents(combined);
      setLoading(false);
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: "var(--warm-white)" }}>
        <p style={{ color: "var(--slate)" }}>Loading…</p>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <div className="container-x py-10">
        <div className="flex flex-col md:flex-row gap-6">
          <Sidebar
            fullName={profile.full_name || ""}
            memberSince={memberSince}
            section={section}
            onSection={setSection}
            onSignOut={handleSignOut}
          />

          <div className="flex-1 min-w-0">
            {section === "profile" ? (
              <ProfileSection
                profileId={profile.id}
                fullName={profile.full_name || ""}
                email={profile.email || ""}
                memberSince={memberSince}
                onSaved={(name) => setProfile((p) => (p ? { ...p, full_name: name } : p))}
              />
            ) : (
              <EventsSection events={events} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
