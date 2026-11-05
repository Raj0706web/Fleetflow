import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  GripVertical,
  Info,
  Map as MapIcon,
  Package,
  Search,
  Truck,
  X,
} from "lucide-react";
import { getDeliveries } from "../api/deliveries";
import { getTrips } from "../api/trips";
import { getVehicles } from "../api/vehicles";

const activeTripStatuses = ["assigned", "in-progress"];
const statusLabel = (value = "") =>
  value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const priorityStyles = {
  Urgent: "border-rose-200 bg-rose-50 text-rose-700",
  High: "border-orange-200 bg-orange-50 text-orange-700",
  Normal: "border-blue-200 bg-blue-50 text-blue-700",
  Low: "border-slate-200 bg-slate-50 text-slate-600",
};

function TruckIllustration({ vehicle, utilization }) {
  const percent = Math.round(utilization);
  const loadWidth = Math.max(0, Math.min(100, percent)) * 0.68;

  return (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden rounded-lg bg-white">
      <div className="absolute inset-x-5 bottom-5 h-px bg-slate-200" />
      <img
        src="/images/load-optimization-truck.png"
        alt={`${vehicle?.type || "Fleet vehicle"} side view`}
        className="relative z-0 h-full w-full object-contain object-center"
      />
      <div className="pointer-events-none absolute left-[29%] top-[11%] z-10 flex h-[52%] items-center justify-center overflow-hidden bg-linear-to-r from-red-500 to-amber-500 transition-[width] duration-300" style={{ width: `${loadWidth}%` }}>
        {percent > 0 && <span className="text-lg font-bold text-white drop-shadow-sm">{percent}%</span>}
        {percent > 0 && <span className="absolute bottom-[20%] left-[8%] h-0.75 rounded-full bg-white/95" style={{ width: "84%" }} />}
      </div>
      {percent === 0 && <span className="pointer-events-none absolute left-[29%] top-[11%] z-10 flex h-[52%] w-[68%] items-center justify-center text-lg font-bold text-slate-500">0%</span>}
    </div>
  );
}

export default function LoadOptimization() {
  const [vehicles, setVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState([]);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [sortMode, setSortMode] = useState("priority");
  const [draggedDeliveryId, setDraggedDeliveryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const [vehicleRecords, deliveryRecords, tripRecords] = await Promise.all([
        getVehicles(),
        getDeliveries(),
        getTrips(),
      ]);
      setVehicles(vehicleRecords);
      setDeliveries(deliveryRecords);
      setTrips(tripRecords);
    } catch (requestError) {
      setError(requestError.message || "Could not load load-planning data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const activeTrips = trips.filter((trip) =>
    activeTripStatuses.includes(trip.status),
  );
  const busyVehicleIds = new Set(
    activeTrips
      .map((trip) => String(trip.vehicle?._id || trip.vehicle))
      .filter(Boolean),
  );
  const availableVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "available" &&
      !busyVehicleIds.has(String(vehicle._id)),
  );
  const plannedDeliveries = deliveries.filter(
    (delivery) => delivery.status === "Planned",
  );
  const weightedDeliveries = plannedDeliveries.filter(
    (delivery) => Number(delivery.weightKg) > 0,
  );
  const vehicle = availableVehicles.find(
    (item) => String(item._id) === String(selectedVehicleId),
  );
  const capacityKg = Number(vehicle?.capacity || 0) * 1000;
  const selectedDeliveries = weightedDeliveries.filter((item) =>
    selectedDeliveryIds.includes(String(item._id)),
  );
  const loadKg = selectedDeliveries.reduce(
    (sum, delivery) => sum + Number(delivery.weightKg || 0),
    0,
  );
  const utilization =
    capacityKg > 0 ? Math.min((loadKg / capacityKg) * 100, 100) : 0;
  const overCapacity = capacityKg > 0 && loadKg > capacityKg;
  const missingWeightCount =
    plannedDeliveries.length - weightedDeliveries.length;

  const displayedVehicles = useMemo(() => {
    const query = vehicleSearch.trim().toLowerCase();
    return vehicles.filter((item) => {
      const busy = busyVehicleIds.has(String(item._id));
      const matchesQuery =
        !query ||
        `${item.registrationNumber} ${item.type}`.toLowerCase().includes(query);
      const matchesFilter =
        vehicleFilter === "All" ||
        (vehicleFilter === "Available"
          ? item.status === "available" && !busy
          : vehicleFilter === "On trip"
            ? busy
            : item.status === "maintenance");
      return matchesQuery && matchesFilter;
    });
  }, [vehicles, vehicleSearch, vehicleFilter, trips]);

  const displayedOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    const priorityRank = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
    return weightedDeliveries
      .filter(
        (item) =>
          !query ||
          `${item.reference} ${item.pickup} ${item.destination} ${item.packageDescription}`
            .toLowerCase()
            .includes(query),
      )
      .sort((a, b) =>
        sortMode === "weight"
          ? Number(b.weightKg) - Number(a.weightKg)
          : sortMode === "route"
            ? `${a.pickup} ${a.destination}`.localeCompare(`${b.pickup} ${b.destination}`)
          : sortMode === "deadline"
            ? new Date(a.deliveryWindowEnd) - new Date(b.deliveryWindowEnd)
            : (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2),
      );
  }, [weightedDeliveries, orderSearch, sortMode]);

  const setVehicle = (nextVehicle) => {
    setSelectedVehicleId(nextVehicle._id);
    setSelectedDeliveryIds([]);
    setNotice("");
  };

  function toggleDelivery(deliveryId) {
    const id = String(deliveryId);
    const alreadySelected = selectedDeliveryIds.includes(id);
    if (!alreadySelected) {
      const delivery = weightedDeliveries.find(
        (item) => String(item._id) === id,
      );
      if (!vehicle) {
        setError("Choose an available vehicle before adding orders.");
        return;
      }
      if (loadKg + Number(delivery?.weightKg || 0) > capacityKg) {
        setError("That order would exceed this vehicle’s payload capacity.");
        return;
      }
    }
    setError("");
    setNotice("");
    setSelectedDeliveryIds((current) =>
      alreadySelected
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function recommendLoad() {
    if (!vehicle) {
      setError("Choose an available vehicle to get a load recommendation.");
      return;
    }
    let remaining = capacityKg;
    const priorityRank = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
    const candidates = [...weightedDeliveries].sort(
      (a, b) =>
        (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2) ||
        new Date(a.deliveryWindowEnd) - new Date(b.deliveryWindowEnd),
    );
    const recommended = [];
    for (const delivery of candidates) {
      const weight = Number(delivery.weightKg || 0);
      if (weight <= remaining) {
        recommended.push(String(delivery._id));
        remaining -= weight;
      }
    }
    setSelectedDeliveryIds(recommended);
    setError("");
    setNotice(
      `${recommended.length} order${recommended.length === 1 ? "" : "s"} recommended by priority and delivery deadline.`,
    );
  }

  const orderForDrop = (event) => {
    event.preventDefault();
    const id = draggedDeliveryId || event.dataTransfer.getData("text/plain");
    if (id) toggleDelivery(id);
    setDraggedDeliveryId("");
  };
  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[1720px] flex-col overflow-hidden" style={{ height: "min(calc(100dvh - 120px), 1000px)" }}>

      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
        >
          <span>{error || notice}</span>
          <button
            aria-label="Dismiss message"
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="grid min-h-0 flex-1 gap-2.5" style={{ gridTemplateColumns: "minmax(250px, 0.82fr) minmax(500px, 1.66fr) minmax(250px, 0.82fr)", minWidth: 1020 }}>
        {/* Fleet rail */}
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Vehicles</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {displayedVehicles.length}
              </span>
            </div>
            <label className="relative mt-3 block">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"
              />
              <input
                value={vehicleSearch}
                onChange={(event) => setVehicleSearch(event.target.value)}
                placeholder="Search by vehicle"
                className="w-full rounded-lg border border-slate-200 py-2 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                style={{ paddingLeft: 36 }}
              />
            </label>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {["All", "Available", "On trip", "Maintenance"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setVehicleFilter(filter)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${vehicleFilter === filter ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex flex-1 flex-col overflow-y-auto p-3" style={{ rowGap: 12 }}>
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Loading fleet…
              </p>
            ) : displayedVehicles.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <Truck className="mx-auto text-slate-300" size={25} />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  No vehicles found
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try another filter or search.
                </p>
              </div>
            ) : (
              displayedVehicles.map((item) => {
                const busy = busyVehicleIds.has(String(item._id));
                const selectable = item.status === "available" && !busy;
                const selected = String(item._id) === String(selectedVehicleId);
                const trip = activeTrips.find(
                  (record) =>
                    String(record.vehicle?._id || record.vehicle) ===
                    String(item._id),
                );
                return (
                  <button
                    key={item._id}
                    type="button"
                    disabled={!selectable}
                    onClick={() => setVehicle(item)}
                    className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-65`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <Truck size={18} />
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${selectable ? "bg-emerald-50 text-emerald-700" : busy ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {busy ? "On trip" : statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-900">
                      {item.registrationNumber}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {item.type} · {item.fuelType}
                    </p>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                      <span>Payload capacity</span>
                      <span className="font-medium text-slate-700">
                        {Number(item.capacity).toLocaleString("en-IN")} t
                      </span>
                    </div>
                    {trip && (
                      <p className="mt-1 truncate text-[10px] text-blue-700">
                        {trip.tripNumber} · {trip.route?.origin || "Route"} →{" "}
                        {trip.route?.destination || ""}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Load planner */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid shrink-0 grid-cols-[minmax(190px,0.42fr)_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 p-3" style={{ height: 200, minHeight: 200, gridTemplateColumns: "minmax(190px,0.42fr) minmax(0,1fr)" }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"><Truck size={18} /></span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900">{vehicle?.type || "Select a vehicle"}</h2>
                  <p className="truncate text-[10px] text-slate-500">{vehicle?.registrationNumber || "Vehicle registration"}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                  <p className="text-[10px] text-slate-500">Current load</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-900">{(loadKg / 1000).toFixed(2)} t</p>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                  <p className="text-[10px] text-slate-500">Max weight</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-900">{vehicle ? `${Number(vehicle.capacity).toLocaleString("en-IN")} t` : "—"}</p>
                </div>
              </div>
            </div>
            <TruckIllustration vehicle={vehicle} utilization={utilization} />
          </div>

          <div
            className={`flex min-h-0 flex-1 flex-col border-t border-slate-100 px-4 py-3 transition ${draggedDeliveryId ? "bg-blue-50/40" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={orderForDrop}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Load management</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">{selectedDeliveries.length} orders · {loadKg.toLocaleString("en-IN")} kg loaded</p>
              </div>
            </div>
            <div className="mb-1 flex justify-between px-0.5 text-[10px] text-slate-400">{["0%", "25%", "50%", "75%", "100%"].map((mark) => <span key={mark}>{mark}</span>)}</div>
            <div className="relative h-7 overflow-hidden rounded-md bg-slate-100">
              <div className={`h-full rounded-md transition-all duration-300 ${overCapacity ? "bg-rose-500" : "bg-linear-to-r from-blue-800 to-sky-400"}`} style={{ width: `${Math.min(utilization, 100)}%` }} />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-700">{(loadKg / 1000).toFixed(2)} t of {vehicle ? Number(vehicle.capacity).toLocaleString("en-IN") : "—"} t · {Math.round(utilization)}%</span>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-blue-100 bg-sky-50 px-2.5 py-2 text-[10px] leading-4 text-slate-600"><Info size={13} className="shrink-0 text-blue-600" /> Drag orders from the right panel into this layout, or click an order to add it. Blocks show payload share; package dimensions are not recorded.</div>
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <div className="mb-2 shrink-0 text-[10px] font-medium text-slate-500">Lower payload band · {vehicle ? `0–${Math.round(capacityKg / 2).toLocaleString("en-IN")} kg` : "select vehicle"}</div>
              <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gridTemplateRows: "repeat(3, minmax(0, 1fr))" }} aria-label="Lower payload utilization band">
                {Array.from({ length: 18 }, (_, index) => {
                  const filled = index < Math.round((Math.min(utilization, 50) / 50) * 18);
                  const backgroundColor = filled
                    ? index % 6 < 3 ? "#60a5fa" : "#2563eb"
                    : "#e5f3ff";
                  return <div key={index} style={{ backgroundColor }} className="min-h-0 rounded-md transition-colors" />;
                })}
              </div>
            </div>
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <div className="mb-2 shrink-0 text-[10px] font-medium text-slate-500">Upper payload band · {vehicle ? `${Math.round(capacityKg / 2).toLocaleString("en-IN")}–${capacityKg.toLocaleString("en-IN")} kg` : "select vehicle"}</div>
              <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gridTemplateRows: "repeat(3, minmax(0, 1fr))" }} aria-label="Upper payload utilization band">
                {Array.from({ length: 18 }, (_, index) => {
                  const upperUtilization = Math.max(0, utilization - 50);
                  const filled = index < Math.round((upperUtilization / 50) * 18);
                  const backgroundColor = filled
                    ? index % 6 < 3 ? "#c084fc" : "#7e22ce"
                    : "#f3e8ff";
                  return <div key={index} style={{ backgroundColor }} className="min-h-0 rounded-md transition-colors" />;
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Order panel */}
        <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <h2 className="shrink-0 text-sm font-semibold text-slate-900">Orders</h2>
              <label className="relative min-w-0 flex-1">
                <Search size={14} className="pointer-events-none absolute z-10 text-slate-400" style={{ left: 11, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Search by Order ID, No."
                  className="w-full rounded-md border border-slate-200 py-2 pr-2 text-[11px] outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  style={{ paddingLeft: 32 }}
                />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-600">Recommendation</span>
              <div className="flex items-center gap-1">
                <button type="button" title="Recommend a load" onClick={recommendLoad} disabled={!vehicle || !weightedDeliveries.length} className={`rounded-md border p-1.5 ${sortMode === "weight" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-transparent text-slate-500 hover:bg-slate-100"}`}><Package size={15} /></button>
                <button type="button" title="Sort by route" onClick={() => setSortMode("route")} className={`rounded-md border p-1.5 ${sortMode === "route" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-transparent text-slate-500 hover:bg-slate-100"}`}><MapIcon size={15} /></button>
                <button type="button" title="Sort by delivery deadline" onClick={() => setSortMode("deadline")} className={`rounded-md border p-1.5 ${sortMode === "deadline" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-transparent text-slate-500 hover:bg-slate-100"}`}><CalendarDays size={15} /></button>
              </div>
            </div>
          </div>
          <div className={`grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto p-2 ${displayedOrders.length === 0 ? "content-stretch" : "content-start"}`}>
            {loading ? (
              <p className="col-span-2 py-10 text-center text-sm text-slate-500">
                Loading orders…
              </p>
            ) : displayedOrders.length === 0 ? (
              <div className="col-span-2 flex min-h-full flex-col items-center justify-center px-3 text-center">
                <Package className="mx-auto text-slate-300" size={25} />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  No eligible orders
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Only planned orders with a package weight can be loaded.
                </p>
              </div>
            ) : (
              displayedOrders.map((delivery) => {
                const selected = selectedDeliveryIds.includes(
                  String(delivery._id),
                );
                const fits =
                  capacityKg > 0 &&
                  (selected ||
                    loadKg + Number(delivery.weightKg) <= capacityKg);
                return (
                  <article
                    key={delivery._id}
                    draggable
                    onDragStart={(event) => {
                      setDraggedDeliveryId(String(delivery._id));
                      event.dataTransfer.setData(
                        "text/plain",
                        String(delivery._id),
                      );
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    onDragEnd={() => setDraggedDeliveryId("")}
                    className={`group relative overflow-hidden rounded-xl border transition ${selected ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"} ${!fits ? "opacity-60" : ""}`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 w-1 ${delivery.priority === "Urgent" || delivery.priority === "High" ? "bg-violet-400" : "bg-sky-200"}`}
                    />
                    <div className="flex min-h-18 items-stretch">
                      <span className={`flex w-7 shrink-0 items-center justify-center ${delivery.priority === "Urgent" || delivery.priority === "High" ? "bg-purple-50 text-purple-400" : "bg-sky-50 text-slate-400"}`}><GripVertical size={14} /></span>
                      <button type="button" disabled={!fits && !selected} onClick={() => toggleDelivery(delivery._id)} className="min-w-0 flex-1 px-2 py-2 text-left disabled:cursor-not-allowed" aria-pressed={selected}>
                        <span className="flex items-center justify-between gap-1"><span className="truncate text-[10px] font-medium text-slate-800">ID: {delivery.reference}</span><span className={`shrink-0 rounded-full border px-1 py-0.5 text-[8px] font-medium ${priorityStyles[delivery.priority] || priorityStyles.Normal}`}>{delivery.priority || "Normal"}</span></span>
                        <span className="mt-1.5 flex items-center gap-1.5 text-[9px] text-slate-600"><Package size={11} className="shrink-0 text-slate-500" /><span className="font-medium">{Number(delivery.weightKg).toLocaleString("en-IN")} kg</span></span>
                        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[9px] text-slate-600"><MapIcon size={11} className="shrink-0 text-slate-500" /><span className="truncate">{delivery.pickup} → {delivery.destination}</span></span>
                      </button>
                      <span className={`mr-2 mt-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-transparent"}`} aria-hidden="true"><Check size={10} /></span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          {missingWeightCount > 0 && (
            <div className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 text-[11px] leading-4 text-amber-800">
              {missingWeightCount} planned{" "}
              {missingWeightCount === 1 ? "order has" : "orders have"} no
              package weight and can’t be optimized yet.
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
