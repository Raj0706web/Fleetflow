import { useEffect, useState } from "react";
import { AlertTriangle, Check, Globe2, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { getSystemSettings, saveSystemSettings } from "../api/systemSettings";

export default function AdminSystemSettings() {
  const [allowClientRegistration, setAllowClientRegistration] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSystemSettings()
      .then((settings) => { if (!cancelled) setAllowClientRegistration(Boolean(settings.allowClientRegistration)); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message || "Could not load system settings."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const settings = await saveSystemSettings({ allowClientRegistration });
      setAllowClientRegistration(Boolean(settings.allowClientRegistration));
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message || "Could not save system settings.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="min-h-full bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-4xl">
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Administration</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">System settings</h1><p className="mt-1 text-sm text-slate-500">Configure access behavior for the FleetFlow workspace.</p></header>
    {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <form onSubmit={handleSave} className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck size={19} /></span><div><h2 className="text-sm font-semibold text-slate-900">Account access</h2><p className="mt-0.5 text-xs text-slate-500">Manage how new client accounts can join the workspace.</p></div></div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Globe2 size={18} className="mt-0.5 text-slate-500" /><div><p className="text-sm font-medium text-slate-800">Client self-registration</p><p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">When enabled, visitors can create Viewer / Client accounts from the registration page. Administrators can still create staff accounts from User Management.</p><p className={`mt-2 text-xs font-medium ${allowClientRegistration ? "text-emerald-700" : "text-amber-700"}`}>{allowClientRegistration ? "Enabled · public client sign-up is available" : "Disabled · only administrators can create accounts"}</p></div></div><button type="button" role="switch" aria-checked={allowClientRegistration} aria-label="Client self-registration" disabled={loading || saving} onClick={() => { setSaved(false); setAllowClientRegistration((value) => !value); }} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-60 ${allowClientRegistration ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${allowClientRegistration ? "translate-x-6" : "translate-x-1"}`} /></button></div>
      </section>
      {!allowClientRegistration && <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><p>Saving this change will prevent new public client registrations. Existing accounts and administrator-created staff accounts are unaffected.</p></div>}
      <div className="flex flex-wrap items-center justify-end gap-3">{saved && <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"><Check size={15} />System settings saved</span>}<button type="submit" disabled={loading || saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Saving…" : "Save system settings"}</button></div>
    </form>
  </div></main>;
}
