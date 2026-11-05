import { useState } from "react";
import { login } from "../api/auth";
import PasswordInput from "../components/auth/PasswordInput";

export default function Login({ onLogin, notice = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login({ email, password });
      onLogin(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Password
        <PasswordInput
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className={inputClass}
        />
      </label>

      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
