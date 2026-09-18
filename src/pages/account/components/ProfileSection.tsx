import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProfileSection({
  profileId,
  fullName,
  email,
  memberSince,
  onSaved,
}: {
  profileId: string;
  fullName: string;
  email: string;
  memberSince: string;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(fullName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", profileId);
    setSaving(false);
    if (!error) {
      setSaved(true);
      onSaved(name);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid var(--line)" }}>
        <p className="eyebrow mb-4">Account Information</p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[12px] mb-1.5" style={{ color: "var(--slate)" }}>
              Email Address
            </label>
            <p className="text-[15px]" style={{ color: "var(--ink)" }}>
              {email}
            </p>
          </div>
          <div>
            <label className="block text-[12px] mb-1.5" style={{ color: "var(--slate)" }}>
              Member Since
            </label>
            <p className="text-[15px]" style={{ color: "var(--ink)" }}>
              {memberSince}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid var(--line)" }}>
        <p className="eyebrow mb-4">Personal Information</p>
        <label className="block text-[12px] mb-1.5" style={{ color: "var(--slate)" }}>
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-sm rounded-xl px-4 py-3 text-[15px] outline-none"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        />
        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary !py-2.5 !px-6 !text-[12px] disabled:opacity-60">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {saved && (
            <span className="text-[13px]" style={{ color: "var(--acc-green)" }}>
              Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
