import { useState } from "react";
import { LockKeyhole, Mail, Pencil, ShieldCheck } from "lucide-react";
import { updateMyProfile } from "../api/auth";
import { useAuth } from "../components/auth/AuthContext";
import ProfileAvatar from "../components/auth/ProfileAvatar";
import { getProfileAvatar, profileAvatarsForRole, saveProfileAvatar } from "../components/auth/profileAvatars";

const fieldClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function MyProfile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [selectedAvatar, setSelectedAvatar] = useState(() => getProfileAvatar(user).id);

  function startEditing() {
    setForm({ name: user?.name || "", email: user?.email || "" });
    setError("");
    setNotice("");
    setEditing(true);
  }

  function cancelEditing() {
    setForm({ name: user?.name || "", email: user?.email || "" });
    setError("");
    setEditing(false);
  }

  function handleAvatarSelect(avatarId) {
    const saved = saveProfileAvatar(user, avatarId);
    setSelectedAvatar(avatarId);
    setNotice(saved ? "Profile avatar updated." : "Avatar changed for this session, but browser storage is unavailable.");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await updateMyProfile(form);
      updateUser(result.user);
      setForm({ name: result.user.name, email: result.user.email });
      setNotice(result.message);
      setEditing(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-700">Account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">My profile</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your personal details and view your workspace access.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Pencil size={15} /> Edit profile
          </button>
        )}
      </header>

      {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center border-b border-slate-100 bg-slate-50/70 px-5 py-8 text-center sm:px-6">
          <ProfileAvatar user={user} size="h-40 w-40" className="ring-[6px] ring-white shadow-md" />
          <div className="mt-4 min-w-0 max-w-full">
            <h2 className="truncate text-lg font-semibold text-slate-900">{user?.name || "FleetFlow user"}</h2>
            <p className="mt-1 truncate text-sm text-slate-500">{user?.role}</p>
          </div>
        </div>

        <fieldset className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <legend className="text-sm font-semibold text-slate-800">Choose your avatar</legend>
          <p className="mb-4 mt-1 text-xs text-slate-500">Choose between two clay-style portraits selected for your workspace role.</p>
          <div className="grid max-w-xs grid-cols-2 gap-3">
            {profileAvatarsForRole(user?.role).map((avatar, index) => (
              <button
                key={avatar.id}
                type="button"
                aria-label={`Choose ${user?.role} avatar option ${index + 1}, ${avatar.label}`}
                aria-pressed={selectedAvatar === avatar.id}
                onClick={() => handleAvatarSelect(avatar.id)}
                className={`group flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${selectedAvatar === avatar.id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}
              >
                <img src={avatar.src} alt="" className="h-20 w-20 rounded-full object-cover shadow-sm" />
                <span className="w-full truncate text-center text-[10px] font-medium text-slate-600">{avatar.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Full name
              {editing ? (
                <input
                  className={fieldClass}
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              ) : (
                <span className="mt-1 block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 font-normal text-slate-800">{user?.name || "Not provided"}</span>
              )}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email address
              {editing ? (
                <input
                  className={fieldClass}
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              ) : (
                <span className="mt-1 block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 font-normal text-slate-800">{user?.email || "Not provided"}</span>
              )}
            </label>

            <div className="text-sm font-medium text-slate-700 sm:col-span-2">
              Workspace role
              <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2 font-normal text-slate-800">
                  <ShieldCheck size={16} className="shrink-0 text-blue-600" aria-hidden="true" />
                  <span className="truncate">{user?.role || "Not provided"}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-normal text-slate-500">
                  <LockKeyhole size={13} aria-hidden="true" /> Managed by administrator
                </span>
              </div>
              <p className="mt-1.5 text-xs font-normal text-slate-500">Your role controls which FleetFlow workspaces and actions you can access.</p>
            </div>
          </div>

          {editing && (
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </form>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Mail size={14} aria-hidden="true" /> Your updated email will be used the next time you sign in.
      </p>
    </section>
  );
}
