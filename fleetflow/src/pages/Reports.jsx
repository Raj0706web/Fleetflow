import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3, Fuel, LoaderCircle, RefreshCw, Truck, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../api/dashboard";
import { getOperationsPreferences } from "../api/preferences";
import { useAuth } from "../components/auth/AuthContext";

const deliveryStatuses = ["Planned", "Assigned", "Picked Up", "In Transit", "Delivered", "Failed", "Cancelled"];
const deliveryStatusStyle = {
  Planned: "bg-slate-100 text-slate-700", Assigned: "bg-blue-50 text-blue-700", "Picked Up": "bg-indigo-50 text-indigo-700",
  "In Transit": "bg-amber-50 text-amber-700", Delivered: "bg-emerald-50 text-emerald-700", Failed: "bg-rose-50 text-rose-700", Cancelled: "bg-slate-100 text-slate-500",
};
const numberFormat = new Intl.NumberFormat("en-IN");
const currencyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function ReportMetric({ label, value, detail, icon: Icon, color }) {
  const iconColor = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" };
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconColor[color]}`}><Icon size={19} /></span></div><p className="mt-3 text-[11px] text-slate-500">{detail}</p></article>;
}

export default function Reports() {
  const { user } = useAuth();
  const [range, setRange] = useState("");
  const [status, setStatus] = useState("all");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async (refresh = false) => {
    if (!range) return;
    setError("");
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      setReport(await getDashboardSummary(range, status));
    } catch (requestError) {
      setError(requestError.message || "Could not load reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, status]);

  useEffect(() => {
    let cancelled = false;
    getOperationsPreferences()
      .then((preferences) => { if (!cancelled) setRange(preferences.defaultReportRange || "30"); })
      .catch(() => { if (!cancelled) setRange("30"); })
      .finally(() => { if (!cancelled) setPreferencesReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!preferencesReady || !range) return undefined;
    let active = true;
    getDashboardSummary(range, status)
      .then((result) => { if (active) { setReport(result); setError(""); } })
      .catch((requestError) => { if (active) setError(requestError.message || "Could not load reports."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [preferencesReady, range, status]);

  const summary = report?.summary;
  const deliveryCounts = useMemo(() => {
    const counts = new Map((report?.deliveryStatusCounts || []).map((item) => [item.status, item.count]));
    return deliveryStatuses.map((label) => ({ label, value: counts.get(label) || 0 }));
  }, [report?.deliveryStatusCounts]);
  const highestStatusCount = Math.max(1, ...deliveryCounts.map((item) => item.value));
  const vehicleCounts = useMemo(() => {
    const counts = new Map((report?.vehicleStatuses || []).map((item) => [item.status, item.count]));
    return [
      { label: "Available", value: counts.get("available") || 0, color: "bg-emerald-500" },
      { label: "In service", value: counts.get("in-service") || 0, color: "bg-blue-500" },
      { label: "Maintenance", value: counts.get("maintenance") || 0, color: "bg-amber-400" },
      { label: "Inactive", value: counts.get("inactive") || 0, color: "bg-slate-400" },
    ];
  }, [report?.vehicleStatuses]);
  const highestVehicleCount = Math.max(1, ...vehicleCounts.map((item) => item.value));
  const periodLabel = range === "all" ? "All time" : `Last ${range} days`;
  const heading = user?.role === "Administrator" ? "Administration reports" : "Operations reports";

  return <main className="min-h-full bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-[1600px]">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">FleetFlow insights</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{heading}</h1><p className="mt-1 text-sm text-slate-500">Delivery performance, fleet utilization, and operating costs from your records.</p></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="reports-range">Reporting period</label><select id="reports-range" value={range} onChange={(event) => setRange(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select><label className="sr-only" htmlFor="reports-status">Delivery status filter</label><select id="reports-status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All statuses</option>{deliveryStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select><button type="button" onClick={() => loadReport(true)} disabled={loading || refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />Refresh</button></div></header>
    {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => loadReport()} className="font-semibold underline">Retry</button></div>}
    {loading && !report ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading report data…</div> : <>
      <p className="mb-3 text-xs text-slate-500">Reporting period: <span className="font-medium text-slate-700">{periodLabel}</span>. The status filter applies to the delivery list; the breakdown shows all statuses for context. Fleet totals reflect current vehicle and trip state.</p>
      <section aria-label="Operational report metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><ReportMetric label="Delivery completion" value={`${summary?.completionRate || 0}%`} detail={`${numberFormat.format(summary?.completedDeliveries || 0)} delivered in selected period`} icon={CheckCircle2} color="green" /><ReportMetric label="Delayed deliveries" value={numberFormat.format(summary?.delayedDeliveries || 0)} detail="Past delivery window and still open" icon={AlertTriangle} color="amber" /><ReportMetric label="Average trip duration" value={summary?.averageDeliveryHours == null ? "—" : `${summary.averageDeliveryHours} hrs`} detail="Completed trips in selected period" icon={Clock3} color="violet" /><ReportMetric label="Fleet utilization" value={`${summary?.utilizationRate || 0}%`} detail={`${numberFormat.format(summary?.activeTrips || 0)} active trips currently`} icon={Activity} color="blue" /><ReportMetric label="Fuel spend" value={currencyFormat.format(summary?.fuelSpend || 0)} detail={`Fuel logs · ${periodLabel.toLowerCase()}`} icon={Fuel} color="amber" /></section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Delivery status breakdown</h2><p className="mt-0.5 text-xs text-slate-500">Delivery records created during {periodLabel.toLowerCase()}</p></div><CheckCircle2 size={17} className="text-blue-700" /></div><div className="mt-5 space-y-3">{deliveryCounts.map(({ label, value }) => <div key={label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="text-slate-600">{label}</span><span className="font-medium text-slate-800">{numberFormat.format(value)}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${label === "Delivered" ? "bg-emerald-500" : label === "Failed" ? "bg-rose-400" : label === "Cancelled" ? "bg-slate-400" : label === "In Transit" ? "bg-amber-400" : "bg-blue-500"}`} style={{ width: `${(value / highestStatusCount) * 100}%` }} /></div></div>)}</div></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Fleet utilization</h2><p className="mt-0.5 text-xs text-slate-500">Current status of registered vehicles</p></div><Truck size={17} className="text-blue-700" /></div><div className="mt-5 space-y-4">{vehicleCounts.map(({ label, value, color }) => <div key={label}><div className="mb-1 flex items-center justify-between text-xs"><span className="text-slate-600">{label}</span><span className="font-medium text-slate-800">{numberFormat.format(value)}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${(value / highestVehicleCount) * 100}%` }} /></div></div>)}</div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Total vehicles</p><p className="mt-1 text-lg font-semibold text-slate-900">{numberFormat.format(summary?.totalVehicles || 0)}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Available now</p><p className="mt-1 text-lg font-semibold text-slate-900">{numberFormat.format(summary?.availableVehicles || 0)}</p></div></div></article>
      </section>
      <article className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold text-slate-900">Delivery records</h2><p className="mt-0.5 text-xs text-slate-500">Most recently updated · {periodLabel} · {status === "all" ? "all statuses" : status}</p></div><Link to="/deliveries" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800">Manage deliveries <ArrowRight size={14} /></Link></div>
        {(report?.recentDeliveries || []).length ? <div className="overflow-x-auto"><table className="w-full min-w-180 text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium sm:px-5">Reference</th><th className="px-4 py-3 font-medium">Recipient</th><th className="px-4 py-3 font-medium">Pickup</th><th className="px-4 py-3 font-medium">Destination</th><th className="px-4 py-3 font-medium">Weight</th><th className="px-4 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{report.recentDeliveries.map((delivery) => <tr key={delivery._id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800 sm:px-5">{delivery.reference}</td><td className="max-w-40 truncate px-4 py-3 text-slate-600">{delivery.recipientName}</td><td className="max-w-48 truncate px-4 py-3 text-slate-600">{delivery.pickup}</td><td className="max-w-48 truncate px-4 py-3 text-slate-600">{delivery.destination}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{delivery.weightKg ? `${numberFormat.format(delivery.weightKg)} kg` : "—"}</td><td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${deliveryStatusStyle[delivery.status] || "bg-slate-100 text-slate-600"}`}>{delivery.status}</span></td></tr>)}</tbody></table></div> : <div className="px-5 py-12 text-center"><Warehouse className="mx-auto text-slate-300" size={26} /><p className="mt-2 text-sm font-medium text-slate-700">No deliveries match these filters</p><p className="mt-1 text-xs text-slate-500">Change the date range or status filter to view other records.</p></div>}
      </article>
    </>}
  </div></main>;
}
