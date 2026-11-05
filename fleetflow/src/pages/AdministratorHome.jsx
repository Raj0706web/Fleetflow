import { useEffect, useState } from "react";
import { getUsers, createUser, updateUserRole, resetUserPassword } from "../api/users";
import PasswordInput from "../components/auth/PasswordInput";

const roles = [
  "Administrator",
  "Fleet / Operations Manager",
  "Driver",
  "Viewer / Client",
];

export default function AdministratorHome() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRoleFor, setSavingRoleFor] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetForm, setResetForm] = useState({ password: "", confirmation: "" });
  const [roleDrafts, setRoleDrafts] = useState({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Fleet / Operations Manager",
  });

  async function loadUsers() {
    setError("");
    try {
      const result = await getUsers();
      setUsers(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createUser(form);
      setForm({ name: "", email: "", password: "", role: "Fleet / Operations Manager" });
      setShowForm(false);
      setNotice("User account created.");
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleSave(account) {
    const role = roleDrafts[account._id] ?? account.role;
    if (role === account.role) return;

    setSavingRoleFor(account._id);
    setError("");
    setNotice("");
    try {
      const result = await updateUserRole(account._id, role);
      setUsers((current) => current.map((item) =>
        item._id === account._id ? { ...item, role: result.user.role } : item,
      ));
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[account._id];
        return next;
      });
      setNotice(`Updated ${account.name}'s role to ${result.user.role}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingRoleFor("");
    }
  }

  function openPasswordReset(account) {
    setError("");
    setNotice("");
    setResetForm({ password: "", confirmation: "" });
    setResetTarget(account);
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    if (resetForm.password !== resetForm.confirmation) {
      setError("The passwords do not match");
      return;
    }

    setResetSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await resetUserPassword(resetTarget._id, resetForm.password);
      setNotice(result.message);
      setResetTarget(null);
      setResetForm({ password: "", confirmation: "" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResetSaving(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-full bg-slate-50 p-3 sm:p-5">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-700">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Users & roles</h1>
          <p className="mt-1 text-sm text-slate-500">Create accounts, assign access, and reset passwords for your team.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((open) => !open); setError(""); setNotice(""); }}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? "Close form" : "Add user"}
        </button>
      </header>

      {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">Name
            <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required autoComplete="name" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Email
            <input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Temporary password
            <PasswordInput className={inputClass} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={12} autoComplete="new-password" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">Role
            <select className={inputClass} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">User accounts</h2>
            <p className="mt-1 text-sm text-slate-500">{loading ? "Loading accounts…" : `${users.length} account${users.length === 1 ? "" : "s"}`}</p>
          </div>
        </div>
        {!loading && users.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No user accounts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Email</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Account</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((account) => (
                  <tr key={account._id}>
                    <td className="px-5 py-3 font-medium text-slate-800">{account.name}</td>
                    <td className="px-5 py-3 text-slate-600">{account.email}</td>
                    <td className="px-5 py-3">
                      <div className="flex min-w-65 items-center gap-2">
                        <select
                          aria-label={`Role for ${account.name}`}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                          value={roleDrafts[account._id] ?? account.role}
                          onChange={(event) => setRoleDrafts((current) => ({ ...current, [account._id]: event.target.value }))}
                        >
                          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                        {(roleDrafts[account._id] ?? account.role) !== account.role && (
                          <button
                            type="button"
                            disabled={savingRoleFor === account._id}
                            onClick={() => handleRoleSave(account)}
                            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {savingRoleFor === account._id ? "Saving…" : "Save"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${account.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{account.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => openPasswordReset(account)}
                        className="whitespace-nowrap rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Reset password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="reset-password-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Account security</p>
            <h2 id="reset-password-title" className="mt-2 text-xl font-semibold text-slate-900">Reset password</h2>
            <p className="mt-1 text-sm text-slate-500">Set a new password for {resetTarget.name} ({resetTarget.email}).</p>

            <form onSubmit={handlePasswordReset} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                New password
                <PasswordInput
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={resetForm.password}
                  onChange={(event) => setResetForm((current) => ({ ...current, password: event.target.value }))}
                  className={`${inputClass} mt-1`}
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">Use at least 12 characters.</span>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Confirm new password
                <PasswordInput
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={resetForm.confirmation}
                  onChange={(event) => setResetForm((current) => ({ ...current, confirmation: event.target.value }))}
                  className={`${inputClass} mt-1`}
                />
              </label>
              {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  disabled={resetSaving}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {resetSaving ? "Saving…" : "Save password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
