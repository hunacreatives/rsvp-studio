import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import * as api from "../api";
import { timeAgo } from "../format";
import { Avatar, ErrorText, Field, Input, Modal, OutlineCard, PillButton, PrimaryButton, SectionTitle, Toggle } from "../ui";

export default function AccountPage() {
  const { profile, saveProfile, uploadAvatar, demo } = usePortal();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [params] = useSearchParams();
  // Arriving from a "reset your password" email link → straight to the form.
  const [pwOpen, setPwOpen] = useState(params.get("reset") === "1");
  const [mfaOpen, setMfaOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  const loadFactors = async () => {
    if (demo) return;
    const { data } = await supabase.auth.mfa.listFactors();
    setMfaFactorId(data?.totp?.[0]?.id ?? null);
  };
  useEffect(() => {
    loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    if (!file.type.startsWith("image/")) return setPhotoError("Please choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setPhotoError("Photos must be under 5 MB.");
    try {
      await uploadAvatar(file);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Upload failed — please try again.");
    }
  };

  const passwordNote = profile.password_changed_at ? `Last updated ${timeAgo(profile.password_changed_at)}` : "Set when you created your account";

  return (
    <>
      <PageHeader title="Account" sub="Manage your personal information, login details, and preferences." />

      <section>
        <SectionTitle>Profile</SectionTitle>
        <OutlineCard>
          <div className="flex flex-wrap items-center gap-4 px-6 py-6 md:px-8">
            <Avatar name={profile.full_name || profile.email} url={profile.avatar_url} size={66} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[20px] font-semibold text-[var(--ink)]">{profile.full_name || "Add your name"}</p>
              <p className="truncate text-[13px] text-[var(--slate)]">{profile.email}</p>
            </div>
            <PillButton onClick={() => fileRef.current?.click()}>Edit Photo</PillButton>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </div>
          {photoError ? <p className="-mt-3 px-8 pb-3 text-[13px] text-[#c2412d]">{photoError}</p> : null}
          <div className="grid gap-5 border-t border-[rgba(0,7,39,0.1)] px-6 py-6 sm:grid-cols-2 md:px-8">
            <Info label="Full name" value={profile.full_name} />
            <Info label="Email address" value={profile.email} />
            <Info label="Phone number" value={profile.phone} />
            <Info label="Location" value={profile.location} />
          </div>
          <div className="flex justify-end border-t border-[rgba(0,7,39,0.1)] px-6 py-5 md:px-8">
            <PillButton onClick={() => setEditOpen(true)}>Edit Profile</PillButton>
          </div>
        </OutlineCard>
      </section>

      <section className="mt-12">
        <SectionTitle>Login &amp; Security</SectionTitle>
        <OutlineCard>
          <Row title="Password" sub={passwordNote} action={<PillButton onClick={() => setPwOpen(true)}>Change</PillButton>} />
          <Row
            border
            title="Two-factor authentication"
            sub={mfaFactorId ? "On — you’ll enter a code from your authenticator app when you log in." : "Add an extra layer of security to your account"}
            action={
              mfaFactorId ? (
                <PillButton
                  tone="danger"
                  onClick={async () => {
                    await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
                    loadFactors();
                  }}
                >
                  Turn off
                </PillButton>
              ) : (
                <PillButton onClick={() => setMfaOpen(true)} disabled={demo}>Set Up</PillButton>
              )
            }
          />
        </OutlineCard>
      </section>

      <section className="mt-12">
        <SectionTitle>Notifications</SectionTitle>
        <OutlineCard>
          <Row
            title="Project updates"
            sub="Get notified about designs, approvals, messages, and project milestones."
            action={
              <Toggle
                label="Project updates"
                checked={profile.notify_project_updates}
                onChange={(v) => saveProfile({ notify_project_updates: v })}
              />
            }
          />
          <Row
            border
            title="Billing updates"
            sub="Receive invoice and payment reminders."
            action={
              <Toggle
                label="Billing updates"
                checked={profile.notify_billing_updates}
                onChange={(v) => saveProfile({ notify_billing_updates: v })}
              />
            }
          />
        </OutlineCard>
      </section>

      <section className="mt-12">
        <SectionTitle>Account Management</SectionTitle>
        <div className="px-1 md:px-8">
          <p className="text-[16px] text-[var(--ink)]">Need help with your account?</p>
          <p className="text-[13px] text-[var(--slate)]">Our team is here to help with account or project concerns.</p>
          <PillButton className="mt-4" onClick={() => navigate("/account/help/contact")}>Contact Support</PillButton>
        </div>
      </section>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      {mfaOpen ? (
        <MfaModal
          onClose={() => {
            setMfaOpen(false);
            loadFactors();
          }}
        />
      ) : null}
    </>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--slate)]">{label}</p>
      <p className={`mt-0.5 text-[16px] ${value ? "text-[var(--ink)]" : "text-[var(--slate)]"}`}>{value || "Not added"}</p>
    </div>
  );
}

function Row({ title, sub, action, border }: { title: string; sub: string; action: ReactNode; border?: boolean }) {
  return (
    <div className={`flex items-center gap-4 px-6 py-6 md:px-8 ${border ? "border-t border-[rgba(0,7,39,0.1)]" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] text-[var(--ink)]">{title}</p>
        <p className="text-[13px] text-[var(--slate)]">{sub}</p>
      </div>
      {action}
    </div>
  );
}

function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, saveProfile } = usePortal();
  const [name, setName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setLocation(profile.location ?? "");
    setError(null);
  }, [open, profile]);

  const save = async () => {
    if (!name.trim()) return setError("Please enter your name.");
    setSaving(true);
    try {
      await saveProfile({ full_name: name.trim(), phone: phone.trim() || null, location: location.trim() || null });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <div className="space-y-4">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email address" hint="Your login email. Contact support to change it.">
          <Input value={profile.email ?? ""} disabled className="!bg-[var(--paper)] text-[var(--slate)]" />
        </Field>
        <Field label="Phone number">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" autoComplete="tel" />
        </Field>
        <Field label="Location">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</PrimaryButton>
      </div>
    </Modal>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, saveProfile, demo } = usePortal();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setPw("");
      setConfirm("");
      setError(null);
      setDone(false);
    }
  }, [open]);

  const save = async () => {
    setError(null);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== confirm) return setError("Passwords don’t match.");
    setSaving(true);
    try {
      if (demo) await saveProfile({ password_changed_at: new Date().toISOString() });
      else {
        await api.changePassword(pw, profile.id);
        await saveProfile({ password_changed_at: new Date().toISOString() }).catch(() => undefined);
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t update your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change password">
      {done ? (
        <>
          <p className="text-[15px] text-[var(--ink)]">Your password has been updated.</p>
          <div className="mt-6 flex justify-end">
            <PrimaryButton onClick={onClose}>Done</PrimaryButton>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <Field label="New password" hint="At least 8 characters.">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="mt-6 flex justify-end">
            <PrimaryButton onClick={save} disabled={saving}>{saving ? "Updating…" : "Update password"}</PrimaryButton>
          </div>
        </>
      )}
    </Modal>
  );
}

/** TOTP enrollment: scan QR → enter 6-digit code → verified factor. */
function MfaModal({ onClose }: { onClose: () => void }) {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verified = useRef(false);

  useEffect(() => {
    let created: string | null = null;
    let cancelled = false;
    (async () => {
      // Clear abandoned, never-verified attempts first (Supabase keeps them).
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      if (cancelled) return;
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
      if (error || !data) return setError(error?.message ?? "Couldn’t start setup.");
      if (cancelled) {
        supabase.auth.mfa.unenroll({ factorId: data.id });
        return;
      }
      created = data.id;
      setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
    return () => {
      cancelled = true;
      if (created && !verified.current) supabase.auth.mfa.unenroll({ factorId: created });
    };
  }, []);

  const verify = async () => {
    if (!factor) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    setBusy(false);
    if (error) return setError("That code didn’t work — check your app and try again.");
    verified.current = true;
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Set up two-factor authentication">
      <ol className="list-decimal space-y-2 pl-5 text-[14px] text-[var(--ink)]">
        <li>Open an authenticator app (Google Authenticator, 1Password, Authy…).</li>
        <li>Scan this QR code, or enter the key manually.</li>
        <li>Type the 6-digit code it shows.</li>
      </ol>
      <div className="mt-5 grid place-items-center rounded-2xl bg-[var(--paper)] p-5">
        {factor ? (
          <>
            <img src={factor.qr} alt="Authenticator QR code" className="h-44 w-44 rounded-lg bg-white p-2" />
            <code className="mt-3 break-all text-center text-[12px] text-[var(--slate)]">{factor.secret}</code>
          </>
        ) : (
          <p className="py-16 text-[14px] text-[var(--slate)]">{error ? "" : "Preparing…"}</p>
        )}
      </div>
      <div className="mt-5">
        <Field label="6-digit code">
          <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={verify} disabled={busy || code.length !== 6 || !factor}>{busy ? "Verifying…" : "Turn on"}</PrimaryButton>
      </div>
    </Modal>
  );
}
