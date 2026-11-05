import { useEffect, useState } from "react";
import { Activity, Check, Clock3, LoaderCircle, Save, Settings2 } from "lucide-react";
import { getOperationsPreferences, saveOperationsPreferences } from "../api/preferences";

const defaultPreferences = { defaultReportRange: "30", dashboardAutoRefresh: false };

export default function OperationsSettings() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOperationsPreferences()
      .then((data) => { if (!cancelled) setPreferences({ ...defaultPreferences, ...data }); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message || "Could not load preferences."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      setPreferences({ ...defaultPreferences, ...(await saveOperationsPreferences(preferences)) });
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message || "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="min-h-full bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-4xl">
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Workspace preferences</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Operations settings</h1><p className="mt-1 text-sm text-slate-500">Choose how your operations dashboard opens and refreshes. Preferences are saved to your account.</p></header>
    {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <form onSubmit={handleSave} className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Settings2 size={19} /></span><div><h2 className="text-sm font-semibold text-slate-900">Dashboard defaults</h2><p className="mt-0.5 text-xs text-slate-500">These settings apply to your own manager workspace.</p></div></div>
        <div className="divide-y divide-slate-100">
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Clock3 size={17} className="mt-0.5 text-slate-500" /><div><label htmlFor="default-report-range" className="text-sm font-medium text-slate-800">Default reporting period</label><p className="mt-1 max-w-lg text-xs leading-5 text-slate-500">Used when opening the Fleet Dashboard and Reports pages. You can still change the range on either page.</p></div></div><select id="default-report-range" disabled={loading || saving} value={preferences.defaultReportRange} onChange={(event) => { setSaved(false); setPreferences((current) => ({ ...current, defaultReportRange: event.target.value })); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 sm:w-48"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select></div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Activity size={17} className="mt-0.5 text-slate-500" /><div><p className="text-sm font-medium text-slate-800">Auto-refresh dashboard</p><p className="mt-1 max-w-lg text-xs leading-5 text-slate-500">Refresh dashboard figures every 60 seconds while the Dashboard page is open.</p></div></div><button type="button" role="switch" aria-checked={preferences.dashboardAutoRefresh} aria-label="Auto-refresh dashboard" disabled={loading || saving} onClick={() => { setSaved(false); setPreferences((current) => ({ ...current, dashboardAutoRefresh: !current.dashboardAutoRefresh })); }} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-60 ${preferences.dashboardAutoRefresh ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${preferences.dashboardAutoRefresh ? "translate-x-6" : "translate-x-1"}`} /></button></div>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-end gap-3">{saved && <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"><Check size={15} />Preferences saved</span>}<button type="submit" disabled={loading || saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Saving…" : "Save preferences"}</button></div>
    </form>
  </div></main>;
}
