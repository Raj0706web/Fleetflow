import { useEffect, useMemo, useState } from "react";
import { Fuel, Plus, ReceiptIndianRupee, Route, X } from "lucide-react";
import { createFuelLog, getFuelLogs } from "../api/fuelLogs";
import { getVehicles } from "../api/vehicles";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const emptyForm = () => ({ vehicleId: "", date: localToday(), quantity: "", cost: "", odometerKm: "", station: "" });

function StatCard({ label, value, detail, icon: Icon }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon size={18} /></span>
    <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
    <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
  </section>;
}

export default function FuelLogs() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let active = true;
    Promise.all([getFuelLogs(), getVehicles()])
      .then(([fuelRecords, vehicleRecords]) => {
        if (!active) return;
        setLogs(fuelRecords);
        setVehicles(vehicleRecords);
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalSpend = useMemo(() => logs.reduce((total, log) => total + Number(log.cost || 0), 0), [logs]);
  const averageCostPerKm = useMemo(() => {
    const measured = logs.filter((log) => Number.isFinite(Number(log.costPerKm)) && log.costPerKm !== null);
    return measured.length ? measured.reduce((total, log) => total + Number(log.costPerKm), 0) / measured.length : null;
  }, [logs]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const created = await createFuelLog(form);
      setLogs((current) => [created, ...current]);
      const updatedVehicles = await getVehicles();
      setVehicles(updatedVehicles);
      setForm(emptyForm());
      setFormOpen(false);
    } catch (submitError) {
      setFormError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedVehicle = vehicles.find((vehicle) => vehicle._id === form.vehicleId);
  return <main className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-blue-700">Fleet operations</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Fuel logs</h1>
        <p className="mt-1 text-sm text-slate-500">Record refuelling, odometer readings, and vehicle fuel spend.</p>
      </div>
      <button type="button" onClick={() => { setForm(emptyForm()); setFormError(""); setFormOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
        <Plus size={17} /> Add fuel log
      </button>
    </header>

    {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <StatCard label="Fuel entries" value={loading ? "…" : logs.length} detail="Saved refuelling records" icon={Fuel} />
      <StatCard label="Recorded spend" value={loading ? "…" : currency.format(totalSpend)} detail="Across the visible fuel log history" icon={ReceiptIndianRupee} />
      <StatCard label="Average cost per km" value={loading ? "…" : averageCostPerKm === null ? "—" : `${currency.format(averageCostPerKm)}/km`} detail="Shown when odometer distance is available" icon={Route} />
    </div>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div><h2 className="text-sm font-semibold text-slate-900">Refuelling history</h2><p className="mt-0.5 text-xs text-slate-500">Sorted by most recent entry.</p></div>
        <span className="text-xs text-slate-400">{logs.length} {logs.length === 1 ? "record" : "records"}</span>
      </div>
      {loading ? <p className="p-6 text-sm text-slate-500">Loading fuel records…</p> : logs.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Fuel size={21} /></span>
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No fuel logs yet</h3>
          <p className="mt-1 text-xs text-slate-500">Add a refuelling record to start tracking vehicle fuel costs.</p>
        </div>
      ) : <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr>
            <th className="px-5 py-3 font-semibold">Date</th><th className="px-5 py-3 font-semibold">Vehicle</th><th className="px-5 py-3 font-semibold">Station</th><th className="px-5 py-3 text-right font-semibold">Quantity</th><th className="px-5 py-3 text-right font-semibold">Cost</th><th className="px-5 py-3 text-right font-semibold">Odometer</th><th className="px-5 py-3 text-right font-semibold">Cost / km</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => <tr key={log._id} className="text-slate-700 hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-5 py-3">{formatDate(log.date)}</td>
              <td className="px-5 py-3"><span className="font-medium text-slate-900">{log.vehicle?.registrationNumber || "Vehicle removed"}</span><span className="mt-0.5 block text-[10px] text-slate-400">{log.vehicle?.type || ""}</span></td>
              <td className="max-w-48 truncate px-5 py-3" title={log.station}>{log.station}</td>
              <td className="whitespace-nowrap px-5 py-3 text-right">{Number(log.quantity).toLocaleString("en-IN", { maximumFractionDigits: 2 })} {log.unit}</td>
              <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-slate-900">{currency.format(log.cost)}</td>
              <td className="whitespace-nowrap px-5 py-3 text-right">{Number(log.odometerKm).toLocaleString("en-IN")} km</td>
              <td className="whitespace-nowrap px-5 py-3 text-right">{log.costPerKm == null ? "—" : `${currency.format(log.costPerKm)}/km`}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </section>

    {formOpen && <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setFormOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="fuel-log-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 id="fuel-log-title" className="text-lg font-semibold text-slate-900">Add fuel log</h2><p className="mt-1 text-xs text-slate-500">Use the odometer reading shown on the vehicle at refuelling.</p></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Close fuel log form" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button></div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-slate-700">Vehicle<select required value={form.vehicleId} onChange={(event) => { const vehicle = vehicles.find((item) => item._id === event.target.value); setForm((current) => ({ ...current, vehicleId: event.target.value, odometerKm: vehicle ? String(vehicle.odometerKm) : "" })); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">Choose vehicle</option>{vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.registrationNumber} · {vehicle.type} · {Number(vehicle.odometerKm).toLocaleString("en-IN")} km</option>)}</select></label>
          {vehicles.length === 0 && <p className="text-xs text-amber-700">Add a vehicle before logging fuel.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-700">Refuelling date<input required type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
            <label className="text-xs font-medium text-slate-700">{selectedVehicle?.fuelType === "Electric" ? "Energy added (kWh)" : "Fuel added (litres)"}<input required min="0.01" step="0.01" type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
            <label className="text-xs font-medium text-slate-700">Total cost (₹)<input required min="0" step="0.01" type="number" value={form.cost} onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
            <label className="text-xs font-medium text-slate-700">Odometer (km)<input required min={selectedVehicle?.odometerKm ?? 0} step="1" type="number" value={form.odometerKm} onChange={(event) => setForm((current) => ({ ...current, odometerKm: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
          </div>
          <label className="block text-xs font-medium text-slate-700">Fuel station<input required maxLength={120} value={form.station} onChange={(event) => setForm((current) => ({ ...current, station: event.target.value }))} placeholder="Station name or location" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
          {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={saving || vehicles.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving…" : "Save fuel log"}</button></div>
        </form>
      </section>
    </div>}
  </main>;
}
