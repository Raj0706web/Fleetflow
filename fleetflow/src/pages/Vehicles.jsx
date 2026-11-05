import { useEffect, useMemo, useState } from "react";
import { Search, Truck } from "lucide-react";
import { createVehicle, getVehicles, updateVehicle } from "../api/vehicles";
const statusStyles = {
  available: "bg-emerald-50 text-emerald-700",
  "in-service": "bg-blue-50 text-blue-700",
  maintenance: "bg-amber-50 text-amber-700",
  inactive: "bg-slate-100 text-slate-600",
};

function formatStatus(status = "") {
  return status
    .replace("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingVehicleId, setUpdatingVehicleId] = useState("");
  const emptyVehicleForm = {
    registrationNumber: "",
    type: "",
    capacity: "",
    fuelType: "Diesel",
    odometerKm: "0",
  };
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editForm, setEditForm] = useState({
    registrationNumber: "",
    type: "",
    capacity: "",
    fuelType: "Diesel",
    odometerKm: "0",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  useEffect(() => {
    let active = true;

    getVehicles()
      .then((records) => {
        if (active) setVehicles(records);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !query ||
        vehicle.registrationNumber?.toLowerCase().includes(query) ||
        vehicle.type?.toLowerCase().includes(query) ||
        vehicle.fuelType?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, search, statusFilter]);

  const counts = {
    total: vehicles.length,
    available: vehicles.filter((vehicle) => vehicle.status === "available")
      .length,
    service: vehicles.filter((vehicle) => vehicle.status === "in-service")
      .length,
    maintenance: vehicles.filter((vehicle) => vehicle.status === "maintenance")
      .length,
  };

  function openEditVehicle(vehicle) {
    setEditingVehicle(vehicle);
    setEditError("");
    setEditForm({
      registrationNumber: vehicle.registrationNumber || "",
      type: vehicle.type || "",
      capacity: String(vehicle.capacity ?? ""),
      fuelType: vehicle.fuelType || "Diesel",
      odometerKm: String(vehicle.odometerKm ?? 0),
    });
  }

  async function handleUpdateVehicle(event) {
    event.preventDefault();
    if (!editingVehicle) return;

    setEditSaving(true);
    setEditError("");

    try {
      const updatedVehicle = await updateVehicle(editingVehicle._id, {
        ...editForm,
        capacity: Number(editForm.capacity),
        odometerKm: Number(editForm.odometerKm),
      });

      setVehicles((current) =>
        current.map((vehicle) =>
          vehicle._id === updatedVehicle._id ? updatedVehicle : vehicle,
        ),
      );

      setEditingVehicle(null);
    } catch (requestError) {
      setEditError(requestError.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleCreateVehicle(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const createdVehicle = await createVehicle({
        ...vehicleForm,
        capacity: Number(vehicleForm.capacity),
        odometerKm: Number(vehicleForm.odometerKm),
      });

      setVehicles((current) => [createdVehicle, ...current]);
      setVehicleForm(emptyVehicleForm);
      setShowCreateForm(false);
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(vehicle, nextStatus) {
    setUpdatingVehicleId(vehicle._id);
    setError("");

    try {
      const updatedVehicle = await updateVehicle(vehicle._id, {
        status: nextStatus,
      });

      setVehicles((current) =>
        current.map((item) =>
          item._id === updatedVehicle._id ? updatedVehicle : item,
        ),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingVehicleId("");
    }
  }

  return (
    <main className="mx-auto max-w-375 space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
          Fleet workspace
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
          Vehicle management
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Review your fleet, vehicle availability, and service status.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormError("");
            setShowCreateForm(true);
          }}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add vehicle
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total vehicles", counts.total],
          ["Available", counts.available],
          ["In service", counts.service],
          ["Maintenance", counts.maintenance],
        ].map(([label, count]) => (
          <article
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {count}
            </p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Fleet vehicles</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredVehicles.length} of {vehicles.length} vehicles
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search registration, type, fuel"
                className="w-full text-sm outline-none sm:w-64"
                aria-label="Search vehicles"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              aria-label="Filter by vehicle status"
            >
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="in-service">In service</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Loading vehicles…
          </p>
        ) : filteredVehicles.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Truck size={22} />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">
              {vehicles.length ? "No matching vehicles" : "No vehicles yet"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {vehicles.length
                ? "Try changing your search or status filter."
                : "Add a vehicle record to start managing your fleet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Vehicle</th>
                  <th className="px-5 py-3 font-semibold">Capacity</th>
                  <th className="px-5 py-3 font-semibold">Fuel</th>
                  <th className="px-5 py-3 font-semibold">Odometer</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {vehicle.registrationNumber}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {vehicle.type}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {vehicle.capacity} t
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {vehicle.fuelType}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {Number(vehicle.odometerKm || 0).toLocaleString()} km
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusStyles[vehicle.status] || statusStyles.inactive
                        }`}
                      >
                        {formatStatus(vehicle.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openEditVehicle(vehicle)}
                        className="mr-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <select
                        value={vehicle.status}
                        disabled={updatingVehicleId === vehicle._id}
                        onChange={(event) =>
                          handleStatusChange(vehicle, event.target.value)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 disabled:opacity-60"
                        aria-label={`Change status for ${vehicle.registrationNumber}`}
                      >
                        <option value="available">Available</option>
                        <option value="in-service">In service</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-vehicle-title"
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2
              id="add-vehicle-title"
              className="text-xl font-semibold text-slate-900"
            >
              Add a vehicle
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the vehicle details to add it to your fleet.
            </p>

            <form onSubmit={handleCreateVehicle} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Registration number
                  <input
                    required
                    value={vehicleForm.registrationNumber}
                    onChange={(event) =>
                      setVehicleForm((current) => ({
                        ...current,
                        registrationNumber: event.target.value,
                      }))
                    }
                    placeholder="e.g. MH12AB3421"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Vehicle type
                  <input
                    required
                    value={vehicleForm.type}
                    onChange={(event) =>
                      setVehicleForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    placeholder="e.g. Tata 407"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Capacity (tonnes)
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.1"
                    value={vehicleForm.capacity}
                    onChange={(event) =>
                      setVehicleForm((current) => ({
                        ...current,
                        capacity: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Fuel type
                  <select
                    value={vehicleForm.fuelType}
                    onChange={(event) =>
                      setVehicleForm((current) => ({
                        ...current,
                        fuelType: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option>Diesel</option>
                    <option>Petrol</option>
                    <option>CNG</option>
                    <option>Electric</option>
                    <option>Hybrid</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Odometer (km)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={vehicleForm.odometerKm}
                    onChange={(event) =>
                      setVehicleForm((current) => ({
                        ...current,
                        odometerKm: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormError("");
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save vehicle"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-vehicle-title"
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2
              id="edit-vehicle-title"
              className="text-xl font-semibold text-slate-900"
            >
              Edit vehicle
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update {editingVehicle.registrationNumber}&apos;s fleet details.
            </p>

            <form onSubmit={handleUpdateVehicle} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Registration number
                  <input
                    required
                    value={editForm.registrationNumber}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        registrationNumber: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Vehicle type
                  <input
                    required
                    value={editForm.type}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Capacity (tonnes)
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.1"
                    value={editForm.capacity}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        capacity: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Fuel type
                  <select
                    value={editForm.fuelType}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        fuelType: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option>Diesel</option>
                    <option>Petrol</option>
                    <option>CNG</option>
                    <option>Electric</option>
                    <option>Hybrid</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Odometer (km)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.odometerKm}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        odometerKm: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              {editError && (
                <p
                  role="alert"
                  className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {editError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditingVehicle(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {editSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
