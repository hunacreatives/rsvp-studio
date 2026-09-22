import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/pages/home/components/Navbar";
import Sidebar, { type Section } from "./components/Sidebar";
import ProfileSection from "./components/ProfileSection";
import EventsSection, { type Event } from "./components/EventsSection";
import WebsiteSection from "./components/WebsiteSection";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export default function AccountDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const navState = location.state as { section?: Section; mode?: "edit" | "gallery" } | null;
  const [section, setSection] = useState<Section>(navState?.section ?? "profile");
  const websiteMode = navState?.mode ?? "edit";
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
        supabase
          .from("events")
          .select("id, name, event_date, table_name, event_type, status")
          .eq("owner_id", session.user.id),
        supabase
          .from("event_members")
          .select("events(id, name, event_date, table_name, event_type, status)")
          .eq("profile_id", session.user.id),
      ]);

      setProfile(profileRes.data ?? null);

      const combined: Event[] = [
        ...(ownEvents.data ?? []).map((e) => ({ ...e, role: "Owner" as const })),
        ...((memberEvents.data ?? []).flatMap((r) =>
          r.events ? [{ ...(r.events as unknown as Omit<Event, "role">), role: "Member" as const }] : []
        )),
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
      <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
        <Navbar />
        <div className="grid place-items-center py-24">
          <p style={{ color: "var(--slate)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />
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
            ) : section === "website" ? (
              <WebsiteSection events={events} mode={websiteMode} />
            ) : (
              <EventsSection events={events} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
