import { useEffect, useState } from "react";
import { BadgeCheck, CalendarDays, CarFront, Phone, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { getMyDriverRecord } from "../api/drivers";
import { useAuth } from "../components/auth/AuthContext";
import ProfileAvatar from "../components/auth/ProfileAvatar";

function formatDate(value) {
  if (!value) return "Not provided";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString();
}

function getLicenseStatus(value) {
  if (!value) return { label: "Date missing", style: "bg-slate-100 text-slate-600" };

  const expiry = new Date(`${value.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: "Expired", style: "bg-rose-50 text-rose-700" };
  if (daysLeft <= 30) return { label: "Expires soon", style: "bg-amber-50 text-amber-700" };
  return { label: "Valid", style: "bg-emerald-50 text-emerald-700" };
}

export default function DriverProfile() {
  const { user } = useAuth();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getMyDriverRecord()
      .then((record) => {
        if (active) setDriver(record);
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

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl animate-pulse space-y-5">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="h-44 rounded-2xl bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-200" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl">
        <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <ShieldCheck size={21} />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Driver profile unavailable</h1>
          <p role="alert" className="mt-2 text-sm leading-6 text-slate-600">
            {error}. Ask your fleet manager to check that your driver record is active and linked to this account.
          </p>
          <Link to="/driver" className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Back to workspace
          </Link>
        </section>
      </main>
    );
  }

  const licenseStatus = getLicenseStatus(driver.licenseExpiryDate);
  const availabilityStyle = driver.availability === "Available"
    ? "bg-emerald-50 text-emerald-700"
    : driver.availability === "On Trip"
      ? "bg-blue-50 text-blue-700"
      : "bg-amber-50 text-amber-700";

  return (
    <main className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Driver workspace</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">My driver profile</h1>
        <p className="mt-1.5 text-sm text-slate-500">Your operational information and current readiness.</p>
      </header>

      <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-800 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10 bg-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-36 right-32 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="flex flex-wrap items-center gap-5 sm:gap-6">
          <ProfileAvatar user={user} size="h-24 w-24 sm:h-32 sm:w-32" className="border-white/30 ring-4 ring-white/10 shadow-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-blue-50">Driver account</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">{driver.availability}</span>
            </div>
            <h2 className="mt-3 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{driver.name}</h2>
            <p className="mt-1 truncate text-sm text-blue-100">{user?.email || "FleetFlow driver"}</p>
            <p className="mt-3 text-sm text-blue-100">Your manager maintains your licence and operational details.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Personal & licence details</h2>
            <p className="mt-1 text-sm text-slate-500">Contact and compliance information for your driver record.</p>
          </div>
          <dl className="grid gap-px bg-slate-100 sm:grid-cols-2">
            <div className="bg-white p-5">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Phone size={15} /> Phone</dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">{driver.phone || "Not provided"}</dd>
            </div>
            <div className="bg-white p-5">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><BadgeCheck size={15} /> Licence number</dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">{driver.licenseNumber || "Not provided"}</dd>
            </div>
            <div className="bg-white p-5 sm:col-span-2">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><CalendarDays size={15} /> Licence expiry</dt>
              <dd className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{formatDate(driver.licenseExpiryDate)}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${licenseStatus.style}`}>{licenseStatus.label}</span>
              </dd>
            </div>
          </dl>
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CarFront size={20} /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned vehicle</p>
                <p className="mt-1 font-semibold text-slate-900">{driver.assignedVehicle?.registrationNumber || "Not assigned"}</p>
              </div>
            </div>
            {driver.assignedVehicle && (
              <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">
                {driver.assignedVehicle.type} <span className="px-1 text-slate-300">·</span> {driver.assignedVehicle.status}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/80 p-5">
            <p className="text-sm font-semibold text-slate-900">Profile managed by your fleet team</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">
              Contact your manager to update your phone, licence information, availability, or vehicle assignment.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
