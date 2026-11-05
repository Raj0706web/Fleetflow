import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, LoaderCircle, PackageCheck, Search, Truck, Users, Wrench } from "lucide-react";
import { getVehicles } from "../api/vehicles";
import { getDrivers } from "../api/drivers";
import { getDeliveries } from "../api/deliveries";
import { getTrips } from "../api/trips";

const tabs = ["Vehicles", "Drivers", "Deliveries", "Trips"];
const badgeClass = {
  available: "bg-emerald-50 text-emerald-700", "in-service": "bg-blue-50 text-blue-700", maintenance: "bg-amber-50 text-amber-700", inactive: "bg-slate-100 text-slate-600",
  Available: "bg-emerald-50 text-emerald-700", "On Trip": "bg-blue-50 text-blue-700", Unavailable: "bg-slate-100 text-slate-600",
  Planned: "bg-slate-100 text-slate-700", Assigned: "bg-blue-50 text-blue-700", "Picked Up": "bg-indigo-50 text-indigo-700", "In Transit": "bg-amber-50 text-amber-700", Delivered: "bg-emerald-50 text-emerald-700", Failed: "bg-rose-50 text-rose-700", Cancelled: "bg-slate-100 text-slate-500",
  assigned: "bg-blue-50 text-blue-700", "in-progress": "bg-amber-50 text-amber-700", completed: "bg-emerald-50 text-emerald-700", cancelled: "bg-slate-100 text-slate-500",
};

function StateBadge({ value }) {
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium ${badgeClass[value] || "bg-slate-100 text-slate-600"}`}>{String(value || "Unknown").replaceAll("-", " ")}</span>;
}

function SummaryCard({ label, value, icon: Icon, color }) {
  const shades = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", violet: "bg-violet-50 text-violet-700", amber: "bg-amber-50 text-amber-700" };
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${shades[color]}`}><Icon size={17} /></span></div><p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p></article>;
}

function TableHead({ children }) {
  return <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">{children}</th>;
}

export default function AdminFleetOverview() {
  const [records, setRecords] = useState({ vehicles: [], drivers: [], deliveries: [], trips: [] });
  const [tab, setTab] = useState("Vehicles");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getVehicles(), getDrivers(), getDeliveries(), getTrips()])
      .then(([vehicles, drivers, deliveries, trips]) => {
        if (!cancelled) setRecords({ vehicles, drivers, deliveries, trips });
      })
      .catch((requestError) => { if (!cancelled) setError(requestError.message || "Could not load fleet records."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = tab === "Vehicles" ? records.vehicles : tab === "Drivers" ? records.drivers : tab === "Deliveries" ? records.deliveries : records.trips;
    if (!query) return source;
    return source.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }, [records, search, tab]);
  const activeTrips = records.trips.filter((trip) => ["assigned", "in-progress"].includes(trip.status)).length;
  const availableVehicles = records.vehicles.filter((vehicle) => vehicle.status === "available").length;
  const deliveredOrders = records.deliveries.filter((delivery) => delivery.status === "Delivered").length;
  const delayedOrders = records.deliveries.filter((delivery) => delivery.deliveryWindowEnd && new Date(delivery.deliveryWindowEnd) < new Date() && !["Delivered", "Failed", "Cancelled"].includes(delivery.status)).length;

  return <main className="min-h-full bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-[1600px]">
    <header className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-700">Administration</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Fleet overview</h1><p className="mt-1 text-sm text-slate-500">Organization-wide view of vehicles, drivers, deliveries, and trip activity.</p></header>
    {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <section aria-label="Fleet overview metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Vehicles" value={`${availableVehicles} / ${records.vehicles.length} available`} icon={Truck} color="blue" /><SummaryCard label="Active drivers" value={records.drivers.filter((driver) => driver.isActive).length} icon={Users} color="green" /><SummaryCard label="Active trips" value={activeTrips} icon={Activity} color="violet" /><SummaryCard label="Delivered / delayed" value={`${deliveredOrders} / ${delayedOrders}`} icon={delayedOrders ? AlertTriangle : PackageCheck} color={delayedOrders ? "amber" : "green"} /></section>
    <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Fleet record type">{tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${tab === item ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{item}<span className="ml-1.5 text-[10px] opacity-60">{records[item.toLowerCase()].length}</span></button>)}</div><label className="relative block w-full sm:max-w-xs"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${tab.toLowerCase()}…`} className="w-full rounded-lg border border-slate-200 py-2 pr-3 text-xs outline-none focus:border-blue-500" style={{ paddingLeft: 36 }} /></label></header>
      {loading ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" />Loading fleet records…</div> : <div className="overflow-x-auto">
        {tab === "Vehicles" && <table className="w-full min-w-[700px]"><thead className="bg-slate-50"><tr><TableHead>Registration</TableHead><TableHead>Vehicle</TableHead><TableHead>Fuel</TableHead><TableHead>Capacity</TableHead><TableHead>Status</TableHead></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((vehicle) => <tr key={vehicle._id} className="text-xs hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{vehicle.registrationNumber}</td><td className="px-4 py-3 text-slate-600">{vehicle.type}</td><td className="px-4 py-3 text-slate-600">{vehicle.fuelType}</td><td className="px-4 py-3 text-slate-600">{vehicle.capacity} t</td><td className="px-4 py-3"><StateBadge value={vehicle.status} /></td></tr>)}</tbody></table>}
        {tab === "Drivers" && <table className="w-full min-w-[740px]"><thead className="bg-slate-50"><tr><TableHead>Driver</TableHead><TableHead>Phone</TableHead><TableHead>Licence</TableHead><TableHead>Vehicle</TableHead><TableHead>Availability</TableHead><TableHead>Record</TableHead></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((driver) => <tr key={driver._id} className="text-xs hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{driver.name}</td><td className="px-4 py-3 text-slate-600">{driver.phone}</td><td className="px-4 py-3 text-slate-600">{driver.licenseNumber}</td><td className="px-4 py-3 text-slate-600">{driver.assignedVehicle?.registrationNumber || "—"}</td><td className="px-4 py-3"><StateBadge value={driver.availability} /></td><td className="px-4 py-3"><StateBadge value={driver.isActive ? "Active" : "Inactive"} /></td></tr>)}</tbody></table>}
        {tab === "Deliveries" && <table className="w-full min-w-[800px]"><thead className="bg-slate-50"><tr><TableHead>Reference</TableHead><TableHead>Recipient</TableHead><TableHead>Pickup</TableHead><TableHead>Destination</TableHead><TableHead>Weight</TableHead><TableHead>Status</TableHead></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((delivery) => <tr key={delivery._id} className="text-xs hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{delivery.reference}</td><td className="px-4 py-3 text-slate-600">{delivery.recipientName}</td><td className="max-w-48 truncate px-4 py-3 text-slate-600">{delivery.pickup}</td><td className="max-w-48 truncate px-4 py-3 text-slate-600">{delivery.destination}</td><td className="px-4 py-3 text-slate-600">{delivery.weightKg ? `${delivery.weightKg} kg` : "—"}</td><td className="px-4 py-3"><StateBadge value={delivery.status} /></td></tr>)}</tbody></table>}
        {tab === "Trips" && <table className="w-full min-w-[820px]"><thead className="bg-slate-50"><tr><TableHead>Trip</TableHead><TableHead>Route</TableHead><TableHead>Driver</TableHead><TableHead>Vehicle</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((trip) => <tr key={trip._id} className="text-xs hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-800">{trip.tripNumber}</td><td className="px-4 py-3 text-slate-600">{trip.route?.origin || "—"} → {trip.route?.destination || "—"}</td><td className="px-4 py-3 text-slate-600">{trip.driver?.name || "—"}</td><td className="px-4 py-3 text-slate-600">{trip.vehicle?.registrationNumber || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{trip.scheduledStart ? new Date(trip.scheduledStart).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—"}</td><td className="px-4 py-3"><StateBadge value={trip.status} /></td></tr>)}</tbody></table>}
        {!filtered.length && <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center"><Wrench size={25} className="text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-700">No {tab.toLowerCase()} match this search</p><p className="mt-1 text-xs text-slate-500">Try a different search term.</p></div>}
      </div>}
    </section>
    <p className="mt-3 text-[11px] text-slate-500">Read-only administrator overview. Operational changes remain in the manager workspace.</p>
  </div></main>;
}
