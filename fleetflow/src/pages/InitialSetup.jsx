import { useState } from "react";
import { setupAdmin } from "../api/auth";
import PasswordInput from "../components/auth/PasswordInput";

export default function InitialSetup({ onComplete }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    setupKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await setupAdmin(form);
      await onComplete();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Name
        <input
          name="name"
          value={form.name}
          onChange={updateField}
          autoComplete="name"
          required
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={updateField}
          autoComplete="email"
          required
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Password
        <PasswordInput
          name="password"
          value={form.password}
          onChange={updateField}
          autoComplete="new-password"
          minLength={12}
          required
          className={inputClass}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Use at least 12 characters.
        </span>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Setup key
        <PasswordInput
          name="setupKey"
          value={form.setupKey}
          onChange={updateField}
          autoComplete="off"
          required
          className={inputClass}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Creating account…" : "Create Administrator"}
      </button>
    </form>
  );
}
