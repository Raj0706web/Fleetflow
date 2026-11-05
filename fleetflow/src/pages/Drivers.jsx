import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Truck,
  UserRound,
} from "lucide-react";
import {
  createDriver,
  deactivateDriver,
  getAvailableDriverAccounts,
  getDrivers,
  reactivateDriver,
  updateDriver,
} from "../api/drivers";
import { useAuth } from "../components/auth/AuthContext";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function getLicenseStatus(expiryValue) {
  const expiry = new Date(expiryValue);
  const today = new Date();

  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0)
    return { label: "Expired", style: "bg-rose-50 text-rose-700" };
  if (daysLeft <= 30)
    return { label: "Expires soon", style: "bg-amber-50 text-amber-700" };
  return { label: "Valid", style: "bg-emerald-50 text-emerald-700" };
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

export default function Drivers() {
  const { user } = useAuth();
  const canManage = user?.role === "Fleet / Operations Manager";

  const [drivers, setDrivers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    userId: "",
    phone: "",
    licenseNumber: "",
    licenseExpiryDate: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingDriver, setEditingDriver] = useState(null);
  const [editForm, setEditForm] = useState({
    phone: "",
    licenseNumber: "",
    licenseExpiryDate: "",
    availability: "Available",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState("");
  const [reactivatingId, setReactivatingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const visibleDrivers = drivers.filter((driver) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      driver.name,
      driver.user?.email,
      driver.phone,
      driver.licenseNumber,
      driver.assignedVehicle?.registrationNumber,
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const summaryCards = [
    {
      label: "Driver records",
      value: drivers.length,
      caption: "All operational records",
      icon: UserRound,
      style: "bg-blue-50 text-blue-700",
    },
    {
      label: "Available",
      value: drivers.filter(
        (driver) => driver.isActive && driver.availability === "Available",
      ).length,
      caption: "Ready for assignment",
      icon: CheckCircle2,
      style: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Licence alerts",
      value: drivers.filter(
        (driver) =>
          driver.isActive &&
          ["Expired", "Expires soon"].includes(
            getLicenseStatus(driver.licenseExpiryDate).label,
          ),
      ).length,
      caption: "Expired or due within 30 days",
      icon: AlertTriangle,
      style: "bg-amber-50 text-amber-700",
    },
    {
      label: "On trip",
      value: drivers.filter(
        (driver) => driver.isActive && driver.availability === "On Trip",
      ).length,
      caption: "Currently assigned",
      icon: Truck,
      style: "bg-violet-50 text-violet-700",
    },
  ];

  async function loadDrivers() {
    setError("");
    try {
      setDrivers(await getDrivers());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (!showForm || !canManage) return;

    let active = true;
    setAccountsLoading(true);
    getAvailableDriverAccounts()
      .then((result) => {
        if (active) setAccounts(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setAccountsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [showForm, canManage]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await createDriver(form);
      setForm({
        userId: "",
        phone: "",
        licenseNumber: "",
        licenseExpiryDate: "",
      });
      setShowForm(false);
      setNotice("Driver record created.");
      await loadDrivers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(driver) {
    setError("");
    setNotice("");
    setEditingDriver(driver);
    setEditForm({
      phone: driver.phone || "",
      licenseNumber: driver.licenseNumber || "",
      licenseExpiryDate: driver.licenseExpiryDate
        ? new Date(driver.licenseExpiryDate).toISOString().slice(0, 10)
        : "",
      availability: driver.availability || "Available",
    });
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setEditSaving(true);
    setError("");
    setNotice("");

    try {
      const updatedDriver = await updateDriver(editingDriver._id, editForm);
      setDrivers((current) =>
        current.map((driver) =>
          driver._id === updatedDriver._id ? updatedDriver : driver,
        ),
      );
      setEditingDriver(null);
      setNotice("Driver record updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeactivate(driver) {
    const confirmed = window.confirm(
      `Deactivate the driver record for ${driver.name}?`,
    );
    if (!confirmed) return;

    setDeactivatingId(driver._id);
    setError("");
    setNotice("");

    try {
      const updatedDriver = await deactivateDriver(driver._id);
      setDrivers((current) =>
        current.map((item) =>
          item._id === updatedDriver._id ? updatedDriver : item,
        ),
      );
      setNotice(`${driver.name}'s driver record was deactivated.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeactivatingId("");
    }
  }

  async function handleReactivate(driver) {
    setReactivatingId(driver._id);
    setError("");
    setNotice("");

    try {
      const updatedDriver = await reactivateDriver(driver._id);
      setDrivers((current) =>
        current.map((item) =>
          item._id === updatedDriver._id ? updatedDriver : item,
        ),
      );
      setNotice(
        `${driver.name}'s record was reactivated. Availability remains Unavailable until updated.`,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReactivatingId("");
    }
  }
  return (
    <main className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Fleet operations
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            Drivers
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage driver availability, account details, and licence compliance.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setError("");
              setNotice("");
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Plus size={17} />
            {showForm ? "Close form" : "Add driver"}
          </button>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, caption, icon: Icon, style }) => (
          <section
            key={label}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {value}
                </p>
              </div>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${style}`}
              >
                <Icon size={19} strokeWidth={1.9} />
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{caption}</p>
          </section>
        ))}
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      {showForm && canManage && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
        >
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Driver account
            <select
              className={inputClass}
              value={form.userId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  userId: event.target.value,
                }))
              }
              required
              disabled={accountsLoading || accounts.length === 0}
            >
              <option value="">
                {accountsLoading
                  ? "Loading accounts…"
                  : accounts.length
                    ? "Choose an active Driver account"
                    : "No unlinked Driver accounts"}
              </option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name} · {account.email}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Phone
            <input
              className={inputClass}
              type="tel"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              required
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Licence number
            <input
              className={inputClass}
              value={form.licenseNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  licenseNumber: event.target.value,
                }))
              }
              required
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Licence expiry date
            <input
              className={inputClass}
              type="date"
              value={form.licenseExpiryDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  licenseExpiryDate: event.target.value,
                }))
              }
              required
            />
          </label>

          {accounts.length === 0 && !accountsLoading && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              An administrator needs to create an active account with the Driver
              role first.
            </p>
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving || accounts.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Create driver record"}
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Driver records</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading drivers…"
                : `${visibleDrivers.length} of ${drivers.length} record${drivers.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <label className="flex h-10 w-full max-w-sm items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 text-slate-400 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search drivers, licence, phone…"
              aria-label="Search driver records"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        {loading ? (
          <p className="p-5 text-sm text-slate-500">Loading driver records…</p>
        ) : drivers.length === 0 ? (
          <div className="p-8 text-center">
            <UserRound className="mx-auto text-slate-400" size={28} />
            <p className="mt-2 text-sm font-medium text-slate-700">
              No driver records yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {canManage
                ? "Add a record for an active Driver account."
                : "Driver records will appear here once they are added."}
            </p>
          </div>
        ) : visibleDrivers.length === 0 ? (
          <div className="p-8 text-center">
            <Search className="mx-auto text-slate-400" size={25} />
            <p className="mt-2 text-sm font-medium text-slate-700">
              No matching drivers
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try another name, email, phone number, or licence number.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-245 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Licence</th>
                  <th className="px-5 py-3 font-medium">Expiry</th>
                  <th className="px-5 py-3 font-medium">Licence status</th>
                  <th className="px-5 py-3 font-medium">Availability</th>
                  <th className="px-5 py-3 font-medium">Record</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleDrivers.map((driver) => {
                  const licenseStatus = getLicenseStatus(
                    driver.licenseExpiryDate,
                  );
                  return (
                    <tr
                      key={driver._id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                            {driver.name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-800">
                              {driver.name}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {driver.user?.email || "No linked account email"}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {driver.phone}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {driver.licenseNumber}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {formatDate(driver.licenseExpiryDate)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${licenseStatus.style}`}
                        >
                          {licenseStatus.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            driver.availability === "Available"
                              ? "bg-emerald-50 text-emerald-700"
                              : driver.availability === "On Trip"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {driver.availability}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            driver.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {driver.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {canManage &&
                          (driver.isActive ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(driver)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Pencil size={13} /> Edit
                              </button>
                              <button
                                type="button"
                                disabled={deactivatingId === driver._id}
                                onClick={() => handleDeactivate(driver)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                              >
                                <Ban size={13} />
                                {deactivatingId === driver._id
                                  ? "Deactivating…"
                                  : "Deactivate"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={reactivatingId === driver._id}
                              onClick={() => handleReactivate(driver)}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                            >
                              <RotateCcw size={13} />
                              {reactivatingId === driver._id
                                ? "Reactivating…"
                                : "Reactivate"}
                            </button>
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-driver-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2
              id="edit-driver-title"
              className="text-xl font-semibold text-slate-900"
            >
              Edit driver record
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update {editingDriver.name}'s operational details.
            </p>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Phone
                <input
                  className={`${inputClass} mt-1`}
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Licence number
                <input
                  className={`${inputClass} mt-1`}
                  required
                  value={editForm.licenseNumber}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      licenseNumber: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Licence expiry date
                <input
                  className={`${inputClass} mt-1`}
                  type="date"
                  required
                  value={editForm.licenseExpiryDate}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      licenseExpiryDate: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Availability
                <select
                  className={`${inputClass} mt-1`}
                  value={editForm.availability}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      availability: event.target.value,
                    }))
                  }
                >
                  <option>Available</option>
                  <option>On Trip</option>
                  <option>Unavailable</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  disabled={editSaving}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
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
