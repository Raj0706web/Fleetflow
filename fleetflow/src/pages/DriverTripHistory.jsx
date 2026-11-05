import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Route, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { getMyTripHistory } from "../api/trips";

const statusStyles = {
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function formatStatus(status = "") {
  return status.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function DriverTripHistory() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getMyTripHistory()
      .then((records) => {
        if (active) setTrips(records);
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

  return (
    <main className="mx-auto max-w-[1100px] space-y-6">
      <header>
        <Link to="/driver" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
          <ArrowLeft size={16} /> Back to workspace
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Driver workspace</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Trip history</h1>
        <p className="mt-1.5 text-sm text-slate-500">Completed and cancelled trips assigned to your account.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Past trips</h2>
          <p className="mt-1 text-sm text-slate-500">{trips.length} recorded {trips.length === 1 ? "trip" : "trips"}</p>
        </div>

        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">Loading trip history…</p>
        ) : trips.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Route size={24} className="mx-auto text-blue-700" />
            <h3 className="mt-4 font-semibold text-slate-900">No completed trips yet</h3>
            <p className="mt-1 text-sm text-slate-500">Completed or cancelled trips will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {trips.map((trip) => (
              <article key={trip._id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{trip.tripNumber}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {trip.route?.origin || "Origin"} <span className="text-slate-400">→</span> {trip.route?.destination || "Destination"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{trip.route?.routeNumber || "Route unavailable"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[trip.status] || statusStyles.completed}`}>
                    {formatStatus(trip.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2"><CalendarDays size={15} className="text-slate-400" />Scheduled {new Date(trip.scheduledStart).toLocaleString()}</span>
                  <span className="inline-flex items-center gap-2"><Truck size={15} className="text-slate-400" />{trip.vehicle?.registrationNumber || "Vehicle unavailable"}</span>
                </div>

                {trip.statusHistory?.length > 0 && (
                  <ol className="mt-5 flex flex-wrap gap-2">
                    {trip.statusHistory.map((update, index) => (
                      <li key={`${update.status}-${update.updatedAt}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2">
                        <p className="text-xs font-medium text-slate-800">{formatStatus(update.status)}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{new Date(update.updatedAt).toLocaleString()}</p>
                        {update.note && <p className="mt-1 text-xs text-slate-500">{update.note}</p>}
                      </li>
                    ))}
                  </ol>
                )}

                {trip.deliveryUpdates?.length > 0 && (
                  <div className="mt-5">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery outcomes</h4>
                    <ul className="mt-2 space-y-2">
                      {trip.deliveryUpdates.map((update, index) => (
                        <li key={`${update.delivery?._id || update.delivery}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span className="font-medium text-slate-800">{update.delivery?.reference || "Delivery"}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${update.status === "Delivered" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {update.status}
                          </span>
                          <span className="text-xs text-slate-500">{new Date(update.updatedAt).toLocaleString()}</span>
                          {update.note && <span className="w-full text-xs text-slate-500">{update.note}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
