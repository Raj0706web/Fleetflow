import { useState } from "react";
import { registerClient } from "../api/auth";
import PasswordInput from "../components/auth/PasswordInput";

export default function Register({ onRegistered }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const result = await registerClient({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      onRegistered(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        Full name
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
        Confirm password
        <PasswordInput
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={updateField}
          autoComplete="new-password"
          minLength={12}
          required
          className={inputClass}
        />
      </label>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Create client account"}
      </button>
    </form>
  );
}
