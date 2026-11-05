import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, CircleAlert, Plus, Wrench, X } from "lucide-react";
import { createMaintenanceRecord, getMaintenanceRecords, updateMaintenanceStatus } from "../api/maintenance";
import { getVehicles } from "../api/vehicles";

const serviceTypes = ["Routine Service", "Repair", "Inspection", "Tyres", "Other"];
const dateInputValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localToday = () => dateInputValue(new Date());
const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const emptyForm = () => ({ vehicleId: "", serviceType: "Routine Service", description: "", scheduledDate: localToday(), odometerKm: "", cost: "", serviceProvider: "", notes: "" });

const badgeStyles = {
  Scheduled: "bg-blue-50 text-blue-700",
  "In Progress": "bg-amber-50 text-amber-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

function Summary({ label, value, hint, icon: Icon }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon size={18} /></span>
    <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
    <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
  </section>;
}

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let active = true;
    Promise.all([getMaintenanceRecords(), getVehicles()])
      .then(([maintenanceRecords, vehicleRecords]) => {
        if (!active) return;
        setRecords(maintenanceRecords);
        setVehicles(vehicleRecords);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const inProgressCount = useMemo(() => records.filter((record) => record.status === "In Progress").length, [records]);
  const scheduledCount = useMemo(() => records.filter((record) => record.status === "Scheduled").length, [records]);
  const completedSpend = useMemo(() => records.filter((record) => record.status === "Completed").reduce((total, record) => total + Number(record.cost || 0), 0), [records]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const created = await createMaintenanceRecord(form);
      setRecords((current) => [created, ...current]);
      setForm(emptyForm());
      setFormOpen(false);
    } catch (submitError) {
      setFormError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(record, status) {
    setActionId(record._id);
    setError("");
    try {
      const updated = await updateMaintenanceStatus(record._id, status);
      setRecords((current) => current.map((item) => item._id === updated._id ? updated : item));
      const vehicleRecords = await getVehicles();
      setVehicles(vehicleRecords);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setActionId("");
    }
  }

  return <main className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-blue-700">Fleet operations</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Maintenance</h1>
        <p className="mt-1 text-sm text-slate-500">Schedule service, keep repair history, and manage vehicle availability.</p>
      </div>
      <button type="button" onClick={() => { setForm(emptyForm()); setFormError(""); setFormOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><Plus size={17} /> Schedule maintenance</button>
    </header>

    {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</div>}
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <Summary label="Scheduled" value={loading ? "…" : scheduledCount} hint="Upcoming service records" icon={CalendarDays} />
      <Summary label="In service" value={loading ? "…" : inProgressCount} hint="Vehicles currently marked in maintenance" icon={Wrench} />
      <Summary label="Completed service spend" value={loading ? "…" : currency.format(completedSpend)} hint="Recorded cost on completed jobs" icon={Check} />
    </div>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900">Service history</h2><p className="mt-0.5 text-xs text-slate-500">Starting a service changes the vehicle status to maintenance. Completing or cancelling it returns the vehicle to available.</p></div><span className="text-xs text-slate-400">{records.length} {records.length === 1 ? "record" : "records"}</span></div>
      {loading ? <p className="p-6 text-sm text-slate-500">Loading maintenance records…</p> : records.length === 0 ? (
        <div className="px-6 py-12 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Wrench size={21} /></span><h3 className="mt-3 text-sm font-semibold text-slate-900">No maintenance history yet</h3><p className="mt-1 text-xs text-slate-500">Schedule a service or inspection to start a vehicle history.</p></div>
      ) : <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Vehicle / service</th><th className="px-5 py-3 font-semibold">Scheduled</th><th className="px-5 py-3 font-semibold">Odometer</th><th className="px-5 py-3 text-right font-semibold">Cost</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => <tr key={record._id} className="align-top text-slate-700 hover:bg-slate-50/70">
              <td className="max-w-sm px-5 py-3"><span className="font-medium text-slate-900">{record.vehicle?.registrationNumber || "Vehicle removed"}</span><span className="ml-2 text-[10px] text-slate-400">{record.serviceType}</span><span className="mt-1 block text-[11px] text-slate-600">{record.description}</span>{record.serviceProvider && <span className="mt-0.5 block text-[10px] text-slate-400">Provider: {record.serviceProvider}</span>}{record.notes && <span className="mt-0.5 block text-[10px] text-slate-400">{record.notes}</span>}{record.completedDate && <span className="mt-0.5 block text-[10px] text-emerald-700">Completed {formatDate(record.completedDate)}</span>}</td>
              <td className="whitespace-nowrap px-5 py-3">{formatDate(record.scheduledDate)}</td>
              <td className="whitespace-nowrap px-5 py-3">{record.odometerKm == null ? "—" : `${Number(record.odometerKm).toLocaleString("en-IN")} km`}</td>
              <td className="whitespace-nowrap px-5 py-3 text-right">{record.cost == null ? "—" : currency.format(record.cost)}</td>
              <td className="px-5 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium ${badgeStyles[record.status] || badgeStyles.Scheduled}`}>{record.status}</span></td>
              <td className="px-5 py-3"><div className="flex justify-end gap-1.5">{record.status === "Scheduled" && <><button type="button" disabled={actionId === record._id || record.vehicle?.status !== "available"} onClick={() => changeStatus(record, "In Progress")} title={record.vehicle?.status !== "available" ? "Vehicle must be available to start service" : "Start service"} className="rounded-md border border-blue-200 px-2 py-1.5 text-[10px] font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40">Start service</button><button type="button" disabled={actionId === record._id} onClick={() => changeStatus(record, "Cancelled")} className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-40">Cancel</button></>}{record.status === "In Progress" && <><button type="button" disabled={actionId === record._id} onClick={() => changeStatus(record, "Completed")} className="rounded-md bg-emerald-600 px-2 py-1.5 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40">Complete</button><button type="button" disabled={actionId === record._id} onClick={() => changeStatus(record, "Cancelled")} className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-40">Cancel</button></>}{actionId === record._id && <span className="self-center text-[10px] text-slate-400">Saving…</span>}</div></td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </section>

    {formOpen && <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="maintenance-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 id="maintenance-title" className="text-lg font-semibold text-slate-900">Schedule maintenance</h2><p className="mt-1 text-xs text-slate-500">Record the vehicle, service plan, and any known cost or odometer details.</p></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Close maintenance form" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button></div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-700">Vehicle<select required value={form.vehicleId} onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">Choose vehicle</option>{vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.registrationNumber} · {vehicle.type} · {vehicle.status}</option>)}</select></label>
            <label className="text-xs font-medium text-slate-700">Service type<select value={form.serviceType} onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">{serviceTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="text-xs font-medium text-slate-700">Scheduled date<input required type="date" value={form.scheduledDate} onChange={(event) => setForm((current) => ({ ...current, scheduledDate: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
            <label className="text-xs font-medium text-slate-700">Odometer at service (km, optional)<input min="0" step="1" type="number" value={form.odometerKm} onChange={(event) => setForm((current) => ({ ...current, odometerKm: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
            <label className="text-xs font-medium text-slate-700">Estimated / actual cost (₹)<input min="0" step="0.01" type="number" value={form.cost} onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
            <label className="text-xs font-medium text-slate-700">Service provider<input maxLength={120} value={form.serviceProvider} onChange={(event) => setForm((current) => ({ ...current, serviceProvider: event.target.value }))} placeholder="Workshop or mechanic" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
          </div>
          <label className="block text-xs font-medium text-slate-700">Work description<input required maxLength={500} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the service, inspection, or repair" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
          <label className="block text-xs font-medium text-slate-700">Notes (optional)<textarea maxLength={1000} rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
          {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}
          {vehicles.length === 0 && <p className="text-xs text-amber-700">Add a vehicle before scheduling maintenance.</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={saving || vehicles.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving…" : "Schedule service"}</button></div>
        </form>
      </section>
    </div>}
  </main>;
}
