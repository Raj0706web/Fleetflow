import { useEffect, useState } from "react";
import {
  CalendarDays,
  Plus,
  Route as RouteIcon,
  Truck,
  UserRound,
} from "lucide-react";
import { getDrivers } from "../api/drivers";
import { getRoutes } from "../api/routes";
import { createTrip, getTrips, updateTripStatus } from "../api/trips";
import { getVehicles } from "../api/vehicles";
import { getDeliveries } from "../api/deliveries";

const statusStyles = {
  assigned: "bg-blue-50 text-blue-700",
  "in-progress": "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function formatStatus(status = "") {
  return status
    .replace("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    routeId: "",
    driverId: "",
    vehicleId: "",
    scheduledStart: "",
    deliveryIds: [],
  });
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [cancellingTripId, setCancellingTripId] = useState("");
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      getTrips(),
      getRoutes(),
      getDrivers(),
      getVehicles(),
      getDeliveries(),
    ]).then(
      ([
        tripRecords,
        routeRecords,
        driverRecords,
        vehicleRecords,
        deliveryRecords,
      ]) => {
        if (!active) return;

        setTrips(tripRecords);
        setRoutes(routeRecords);
        setDrivers(driverRecords);
        setVehicles(vehicleRecords);
        setDeliveries(deliveryRecords);
      },
    ).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const activeTrips = trips.filter((trip) =>
    ["assigned", "in-progress"].includes(trip.status),
  );
  const assignedDriverIds = new Set(
    activeTrips.map((trip) => String(trip.driver?._id)).filter(Boolean),
  );
  const assignedVehicleIds = new Set(
    activeTrips.map((trip) => String(trip.vehicle?._id)).filter(Boolean),
  );

  const availableRoutes = routes.filter(
    (route) => !["completed", "cancelled"].includes(route.status),
  );
  const availableDrivers = drivers.filter(
    (driver) =>
      driver.isActive &&
      driver.availability === "Available" &&
      !assignedDriverIds.has(String(driver._id)),
  );
  const availableVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "available" &&
      !assignedVehicleIds.has(String(vehicle._id)),
  );
  const availableDeliveries = deliveries.filter(
    (delivery) => delivery.status === "Planned" && Number(delivery.weightKg) > 0,
  );
  const plannedWithoutWeight = deliveries.filter(
    (delivery) => delivery.status === "Planned" && !(Number(delivery.weightKg) > 0),
  );
  const selectedLoadKg = deliveries
    .filter((delivery) => assignmentForm.deliveryIds.includes(delivery._id))
    .reduce((total, delivery) => total + Number(delivery.weightKg || 0), 0);
  const selectedVehicle = availableVehicles.find((vehicle) => vehicle._id === assignmentForm.vehicleId);
  const loadExceedsCapacity = selectedVehicle && selectedLoadKg > Number(selectedVehicle.capacity) * 1000;

  async function handleAssignmentSubmit(event) {
    event.preventDefault();
    setAssigning(true);
    setAssignmentError("");

    try {
      const newTrip = await createTrip(assignmentForm);
      setTrips((current) => [newTrip, ...current]);
      setDeliveries((current) =>
        current.filter(
          (delivery) => !assignmentForm.deliveryIds.includes(delivery._id),
        ),
      );
      setAssignmentForm({
        routeId: "",
        driverId: "",
        vehicleId: "",
        scheduledStart: "",
        deliveryIds: [],
      });
      setShowAssignmentForm(false);
    } catch (requestError) {
      setAssignmentError(requestError.message);
    } finally {
      setAssigning(false);
    }
  }

  async function handleCancelTrip(trip) {
    const confirmed = window.confirm(
      `Cancel ${trip.tripNumber}? This trip cannot be reopened.`,
    );
    if (!confirmed) return;

    setCancellingTripId(trip._id);
    setError("");

    try {
      const updatedTrip = await updateTripStatus(
        trip._id,
        "cancelled",
        "Cancelled by fleet manager",
      );
      const restoredDeliveries = new Map(
        (updatedTrip.deliveries || []).map((delivery) => [delivery._id, delivery]),
      );
      setDeliveries((current) =>
        current.map((delivery) =>
          restoredDeliveries.get(delivery._id) || delivery,
        ),
      );
      setTrips((current) =>
        current.map((item) =>
          item._id === updatedTrip._id ? updatedTrip : item,
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCancellingTripId("");
    }
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
          Fleet workspace
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
          Trips & assignments
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Assign routes, available drivers, and vehicles to trips.
        </p>
        <button
          type="button"
          onClick={() => {
            setAssignmentError("");
            setShowAssignmentForm(true);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={16} /> Assign trip
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Routes ready",
            value: availableRoutes.length,
            icon: RouteIcon,
          },
          {
            label: "Drivers available",
            value: availableDrivers.length,
            icon: UserRound,
          },
          {
            label: "Vehicles available",
            value: availableVehicles.length,
            icon: Truck,
          },
        ].map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Icon size={19} />
            </span>
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {value}
            </p>
          </article>
        ))}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Trip assignments</h2>
          <p className="mt-1 text-sm text-slate-500">
            Saved trips with their assigned route, driver, and vehicle.
          </p>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Loading trips…
          </p>
        ) : trips.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <CalendarDays className="mx-auto text-blue-700" size={24} />
            <h3 className="mt-4 font-semibold text-slate-900">
              No trips assigned yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              New assignments will appear here once they’re created.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[830px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Trip</th>
                  <th className="px-5 py-3 font-semibold">Route</th>
                  <th className="px-5 py-3 font-semibold">Driver</th>
                  <th className="px-5 py-3 font-semibold">Vehicle</th>
                  <th className="px-5 py-3 font-semibold">Deliveries</th>
                  <th className="px-5 py-3 text-right font-semibold">Payload</th>
                  <th className="px-5 py-3 font-semibold">Scheduled start</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.map((trip) => (
                  <tr key={trip._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {trip.tripNumber}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">
                        {trip.route?.routeNumber || "Route unavailable"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {trip.route?.origin} → {trip.route?.destination}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {trip.driver?.name || "Driver unavailable"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {trip.vehicle?.registrationNumber ||
                        "Vehicle unavailable"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {trip.deliveries?.length
                        ? trip.deliveries.map((delivery) => delivery.reference).join(", ")
                        : "No deliveries"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-slate-700">
                      {Number(trip.loadWeightKg || 0).toLocaleString("en-IN")} kg
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {new Date(trip.scheduledStart).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[trip.status] || statusStyles.cancelled}`}
                      >
                        {formatStatus(trip.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {["assigned", "in-progress"].includes(trip.status) && (
                        <button
                          type="button"
                          disabled={cancellingTripId === trip._id}
                          onClick={() => handleCancelTrip(trip)}
                          className="rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          {cancellingTripId === trip._id
                            ? "Cancelling…"
                            : "Cancel trip"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAssignmentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-trip-title"
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2
              id="assign-trip-title"
              className="text-xl font-semibold text-slate-900"
            >
              Assign a trip
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose an active route, an available driver, and an available
              vehicle.
            </p>

            <form onSubmit={handleAssignmentSubmit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Route
                <select
                  required
                  value={assignmentForm.routeId}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      routeId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select a route</option>
                  {availableRoutes.map((route) => (
                    <option key={route._id} value={route._id}>
                      {route.routeNumber} · {route.origin} → {route.destination}
                    </option>
                  ))}
                </select>
                {availableRoutes.length === 0 && (
                  <span className="mt-1 block text-xs text-amber-700">
                    No active routes are available.
                  </span>
                )}
              </label>

              <fieldset className="rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-sm font-medium text-slate-700">
                  Deliveries{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </legend>

                {availableDeliveries.length === 0 ? (
                  <p className="py-2 text-xs text-slate-500">
                    No planned deliveries with a package weight are available.
                  </p>
                ) : (
                  <div className="mt-1 max-h-36 space-y-2 overflow-y-auto">
                    {availableDeliveries.map((delivery) => (
                      <label
                        key={delivery._id}
                        className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={assignmentForm.deliveryIds.includes(delivery._id)}
                          onChange={(event) =>
                            setAssignmentForm((current) => ({
                              ...current,
                              deliveryIds: event.target.checked
                                ? [...current.deliveryIds, delivery._id]
                                : current.deliveryIds.filter((id) => id !== delivery._id),
                            }))
                          }
                          className="mt-0.5 accent-blue-600"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-800">
                            {delivery.reference}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {delivery.pickup} → {delivery.destination}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {Number(delivery.weightKg).toLocaleString("en-IN")} kg · {delivery.priority} priority
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {plannedWithoutWeight.length > 0 && <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-amber-700">{plannedWithoutWeight.length} planned {plannedWithoutWeight.length === 1 ? "delivery needs" : "deliveries need"} package weights before assignment.</p>}
              </fieldset>

              <label className="block text-sm font-medium text-slate-700">
                Driver
                <select
                  required
                  value={assignmentForm.driverId}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      driverId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select an available driver</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
                {availableDrivers.length === 0 && (
                  <span className="mt-1 block text-xs text-amber-700">
                    No available drivers. Check driver status and active trips.
                  </span>
                )}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Vehicle
                <select
                  required
                  value={assignmentForm.vehicleId}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      vehicleId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select an available vehicle</option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle._id} value={vehicle._id}>
                      {vehicle.registrationNumber} · {vehicle.type}
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <span className="mt-1 block text-xs text-amber-700">
                    No available vehicles. Check vehicle status and active
                    trips.
                  </span>
                )}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Scheduled start
                <input
                  required
                  type="datetime-local"
                  value={assignmentForm.scheduledStart}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      scheduledStart: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {selectedVehicle && <div className={`rounded-lg border px-3 py-2.5 text-xs ${loadExceedsCapacity ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-100 bg-blue-50 text-blue-800"}`}>
                Selected load: <strong>{selectedLoadKg.toLocaleString("en-IN")} kg</strong> of <strong>{(Number(selectedVehicle.capacity) * 1000).toLocaleString("en-IN")} kg</strong> vehicle payload.
                {loadExceedsCapacity && <span className="mt-1 block">Remove deliveries to fit the vehicle capacity.</span>}
              </div>}

              {assignmentError && (
                <p
                  role="alert"
                  className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {assignmentError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={assigning}
                  onClick={() => setShowAssignmentForm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    assigning ||
                    !availableRoutes.length ||
                    !availableDrivers.length ||
                    !availableVehicles.length ||
                    Boolean(loadExceedsCapacity)
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {assigning ? "Assigning…" : "Create assignment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
