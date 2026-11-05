import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3, Fuel, LoaderCircle, RefreshCw, Truck, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../api/dashboard";
import { getOperationsPreferences } from "../api/preferences";

const numberFormat = new Intl.NumberFormat("en-IN");
const currencyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const statusStyles = {
  Planned: "bg-slate-100 text-slate-700", Assigned: "bg-blue-50 text-blue-700",
  "Picked Up": "bg-indigo-50 text-indigo-700", "In Transit": "bg-amber-50 text-amber-700",
  Delivered: "bg-emerald-50 text-emerald-700", Failed: "bg-rose-50 text-rose-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

function MetricCard({ label, value, detail, icon: Icon, tone = "blue" }) {
  const tones = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" };
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span></div><p className="mt-3 text-[11px] text-slate-500">{detail}</p></article>;
}

export default function Dashboard() {
  const [range, setRange] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("all");
  const [dashboardAutoRefresh, setDashboardAutoRefresh] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (refresh = false) => {
    if (!range) return;
    setError("");
    refresh ? setRefreshing(true) : setLoading(true);
    try { setData(await getDashboardSummary(range, deliveryStatus)); }
    catch (requestError) { setError(requestError.message || "Could not load dashboard data."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [range, deliveryStatus]);

  useEffect(() => {
    let cancelled = false;
    getOperationsPreferences()
      .then((preferences) => {
        if (cancelled) return;
        setRange(preferences.defaultReportRange || "30");
        setDashboardAutoRefresh(Boolean(preferences.dashboardAutoRefresh));
      })
      .catch(() => { if (!cancelled) setRange("30"); })
      .finally(() => { if (!cancelled) setPreferencesReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!preferencesReady || !range) return undefined;
    let active = true;
    getDashboardSummary(range, deliveryStatus)
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message || "Could not load dashboard data."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deliveryStatus, preferencesReady, range]);

  useEffect(() => {
    if (!preferencesReady || !dashboardAutoRefresh) return undefined;
    const timer = setInterval(() => loadDashboard(true), 60000);
    return () => clearInterval(timer);
  }, [dashboardAutoRefresh, loadDashboard, preferencesReady]);

  const summary = data?.summary;
  const vehicleStatusRows = useMemo(() => {
    const counts = new Map((data?.vehicleStatuses || []).map(({ status, count }) => [status, count]));
    return ["available", "in-service", "maintenance", "inactive"].map((status) => ({ status, count: counts.get(status) || 0 }));
  }, [data?.vehicleStatuses]);
  const maxVehicleCount = Math.max(1, ...vehicleStatusRows.map(({ count }) => count));
  const periodLabel = range === "all" ? "All time" : `Last ${range} days`;

  return <main className="min-h-full bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-[1600px]">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Operations overview</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Fleet dashboard</h1><p className="mt-1 text-sm text-slate-500">A live summary of your vehicles, trips, deliveries, and fuel spend.</p></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="dashboard-range">Dashboard date range</label><select id="dashboard-range" value={range} onChange={(event) => setRange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select><label className="sr-only" htmlFor="delivery-status-filter">Filter recent deliveries by status</label><select id="delivery-status-filter" value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option><option value="Planned">Planned</option><option value="Assigned">Assigned</option><option value="Picked Up">Picked up</option><option value="In Transit">In transit</option><option value="Delivered">Delivered</option><option value="Failed">Failed</option><option value="Cancelled">Cancelled</option></select><button type="button" onClick={() => loadDashboard(true)} disabled={loading || refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />Refresh</button></div></header>
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => loadDashboard()} className="font-semibold underline">Retry</button></div>}
    {loading && !data ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading fleet data…</div> : <>
      <section aria-label="Fleet key performance indicators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total vehicles" value={numberFormat.format(summary?.totalVehicles || 0)} detail={`${numberFormat.format(summary?.availableVehicles || 0)} currently available`} icon={Truck} />
        <MetricCard label="Active trips" value={numberFormat.format(summary?.activeTrips || 0)} detail="Assigned or in progress now" icon={Activity} tone="violet" />
        <MetricCard label="Completed deliveries" value={numberFormat.format(summary?.completedDeliveries || 0)} detail={`${summary?.completionRate || 0}% completion rate · ${periodLabel.toLowerCase()}`} icon={CheckCircle2} tone="green" />
        <MetricCard label="Delayed deliveries" value={numberFormat.format(summary?.delayedDeliveries || 0)} detail="Past delivery window and still open" icon={AlertTriangle} tone="amber" />
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold text-slate-900">Recent deliveries</h2><p className="mt-0.5 text-xs text-slate-500">Latest updated records · {periodLabel}</p></div><Link to="/deliveries" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800">All deliveries <ArrowRight size={14} /></Link></div>
          {(data?.recentDeliveries || []).length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium sm:px-5">Reference</th><th className="px-4 py-3 font-medium">Recipient</th><th className="px-4 py-3 font-medium">Route</th><th className="px-4 py-3 font-medium">Weight</th><th className="px-4 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentDeliveries.map((delivery) => <tr key={delivery._id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800 sm:px-5">{delivery.reference}</td><td className="max-w-40 truncate px-4 py-3 text-slate-600">{delivery.recipientName}</td><td className="max-w-64 truncate px-4 py-3 text-slate-600">{delivery.pickup} <span className="text-slate-400">→</span> {delivery.destination}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{delivery.weightKg ? `${numberFormat.format(delivery.weightKg)} kg` : "—"}</td><td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${statusStyles[delivery.status] || "bg-slate-100 text-slate-600"}`}>{delivery.status}</span></td></tr>)}</tbody></table></div> : <div className="px-5 py-12 text-center"><Warehouse className="mx-auto text-slate-300" size={26} /><p className="mt-2 text-sm font-medium text-slate-700">No delivery records in this period</p><p className="mt-1 text-xs text-slate-500">Create a delivery to see it appear here.</p></div>}
        </article>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Fleet availability</h2><p className="mt-0.5 text-xs text-slate-500">Current vehicle status</p></div><Truck size={17} className="text-blue-700" /></div><div className="mt-4 space-y-3">{vehicleStatusRows.map(({ status, count }) => <div key={status}><div className="mb-1 flex items-center justify-between text-xs"><span className="capitalize text-slate-600">{status.replace("-", " ")}</span><span className="font-medium text-slate-800">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${status === "available" ? "bg-emerald-500" : status === "maintenance" ? "bg-amber-400" : status === "inactive" ? "bg-slate-400" : "bg-blue-500"}`} style={{ width: `${(count / maxVehicleCount) * 100}%` }} /></div></div>)}</div></article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Operational performance</h2><p className="mt-0.5 text-xs text-slate-500">{periodLabel}</p></div><Clock3 size={17} className="text-blue-700" /></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Fuel size={13} />Fuel spend</div><p className="mt-1 text-lg font-semibold text-slate-900">{currencyFormat.format(summary?.fuelSpend || 0)}</p></div><div className="rounded-lg bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Activity size={13} />Utilization</div><p className="mt-1 text-lg font-semibold text-slate-900">{summary?.utilizationRate || 0}%</p></div><div className="col-span-2 rounded-lg bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-[10px] text-slate-500"><Clock3 size={13} />Average completed trip duration</div><p className="mt-1 text-lg font-semibold text-slate-900">{summary?.averageDeliveryHours == null ? "Not enough completed trips" : `${summary.averageDeliveryHours} hrs`}</p></div></div></article>
        </div>
      </section>
    </>}
  </div></main>;
}
