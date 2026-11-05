import { useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, Clock3, LocateFixed, MapPinned, Package, Phone, Route, Truck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/auth/AuthContext";
import { getMyDriverRecord } from "../api/drivers";
import {
  getMyTrips,
  updateTripDeliveryStatus,
  updateTripLocation,
  updateTripStatus,
} from "../api/trips";
import ProfileAvatar from "../components/auth/ProfileAvatar";

function EmptyState({ icon: Icon, title, message, action, to }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <Icon size={25} strokeWidth={1.8} />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{message}</p>
      {action && to && (
        <Link to={to} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          {action}<ArrowRight size={15} />
        </Link>
      )}
    </section>
  );
}

export function DriverHome() {
  const { user } = useAuth();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState("");
  const [updatingTripId, setUpdatingTripId] = useState("");
  const [sharingLocationTripId, setSharingLocationTripId] = useState("");
  const [tripNotice, setTripNotice] = useState("");
  const locationWatchRef = useRef(null);
  const locationRequestRef = useRef(false);
  const lastLocationAttemptRef = useRef(0);

  function clearLocationWatch() {
    if (locationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
    }
    locationWatchRef.current = null;
    setSharingLocationTripId("");
  }

  useEffect(() => () => {
    if (locationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
    }
  }, []);

  useEffect(() => {
    if (!sharingLocationTripId) return;
    const sharedTrip = trips.find((trip) => trip._id === sharingLocationTripId);
    if (!sharedTrip || sharedTrip.status !== "in-progress") clearLocationWatch();
  }, [trips, sharingLocationTripId]);

  useEffect(() => {
    let active = true;
    getMyDriverRecord()
      .then((record) => {
        if (active) setDriver(record);
      })
      .catch((requestError) => {
        if (active) setProfileError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getMyTrips()
      .then((records) => {
        if (active) setTrips(records);
      })
      .catch((requestError) => {
        if (active) setTripsError(requestError.message);
      })
      .finally(() => {
        if (active) setTripsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleTripStatusChange(trip, nextStatus) {
    setUpdatingTripId(trip._id);
    setTripsError("");
    setTripNotice("");

    try {
      const updatedTrip = await updateTripStatus(trip._id, nextStatus);

      if (nextStatus === "completed" || nextStatus === "cancelled") {
        setTrips((current) => current.filter((item) => item._id !== trip._id));
        setDriver((current) =>
          current
            ? { ...current, availability: "Available", assignedVehicle: null }
            : current,
        );
        setTripNotice(`${updatedTrip.tripNumber} completed and moved to trip history.`);
      } else {
        setTrips((current) =>
          current.map((item) => (item._id === updatedTrip._id ? updatedTrip : item)),
        );
        setDriver((current) =>
          current
            ? {
                ...current,
                availability: "On Trip",
                assignedVehicle: updatedTrip.vehicle,
              }
            : current,
        );
        setTripNotice(`${updatedTrip.tripNumber} is now in progress.`);
      }
    } catch (requestError) {
      setTripsError(requestError.message);
    } finally {
      setUpdatingTripId("");
    }
  }

  async function handleDeliveryOutcome(trip, delivery, status) {
    setUpdatingTripId(trip._id);
    setTripsError("");
    setTripNotice("");

    try {
      const updatedTrip = await updateTripDeliveryStatus(
        trip._id,
        delivery._id,
        status,
      );
      setTrips((current) =>
        current.map((item) =>
          item._id === updatedTrip._id ? updatedTrip : item,
        ),
      );
      setTripNotice(`${delivery.reference} marked ${status.toLowerCase()}.`);
    } catch (requestError) {
      setTripsError(requestError.message);
    } finally {
      setUpdatingTripId("");
    }
  }

  function handleShareLocation(trip) {
    if (sharingLocationTripId === trip._id) {
      clearLocationWatch();
      setTripNotice("Live location sharing stopped.");
      return;
    }
    if (!navigator.geolocation?.watchPosition) {
      setTripsError("This browser does not support live device location.");
      return;
    }
    clearLocationWatch();
    setTripsError("");
    setTripNotice("");
    lastLocationAttemptRef.current = 0;
    locationRequestRef.current = false;
    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const now = Date.now();
        if (locationRequestRef.current || now - lastLocationAttemptRef.current < 10000) return;
        locationRequestRef.current = true;
        lastLocationAttemptRef.current = now;
        try {
          const updatedTrip = await updateTripLocation(trip._id, {
            lat: coords.latitude,
            lng: coords.longitude,
          });
          setTrips((current) => current.map((item) => item._id === updatedTrip._id ? updatedTrip : item));
          setTripNotice(`Live location shared for ${trip.tripNumber}.`);
        } catch (requestError) {
          setTripsError(requestError.message);
          clearLocationWatch();
        } finally {
          locationRequestRef.current = false;
        }
      },
      (locationError) => {
        setTripsError(locationError.code === locationError.PERMISSION_DENIED
          ? "Allow location access in your browser to share this trip’s position."
          : "Could not read this device’s location. Try again outdoors or use a GPS enabled device.");
        clearLocationWatch();
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );
    locationWatchRef.current = watchId;
    setSharingLocationTripId(trip._id);
  }

  const firstName = user?.name?.split(" ")[0] || "Driver";
  const availabilityStyle = driver?.availability === "Available"
    ? "bg-emerald-50 text-emerald-700"
    : driver?.availability === "On Trip"
      ? "bg-blue-50 text-blue-700"
      : "bg-amber-50 text-amber-700";

  return (
    <main className="mx-auto max-w-[1500px] space-y-5">
      <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-800 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7">
        <div className="pointer-events-none absolute -right-14 -top-24 -z-10 h-72 w-72 rounded-full border border-white/10 bg-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-36 right-36 -z-10 h-72 w-72 rounded-full border border-white/10" />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <ProfileAvatar user={user} size="h-16 w-16 sm:h-20 sm:w-20" className="border-white/30 ring-4 ring-white/10 shadow-lg" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Driver workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Good day, {firstName}</h1>
              <p className="mt-1 text-sm text-blue-100">Your workday, vehicle readiness, and trip updates.</p>
            </div>
          </div>
          <Link to="/driver/profile" className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            My profile <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {profileError && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your operational driver record is unavailable. Ask your fleet manager to check your driver account.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Readiness</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {loading ? "Checking status…" : driver?.availability || "Record unavailable"}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={19} />
            </span>
          </div>
          {!loading && driver && (
            <span className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${availabilityStyle}`}>
              {driver.availability}
            </span>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-500">Your manager maintains your availability status.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned vehicle</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {loading ? "Loading…" : driver?.assignedVehicle?.registrationNumber || "Not assigned"}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Truck size={19} />
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {driver?.assignedVehicle
              ? `${driver.assignedVehicle.type} · ${driver.assignedVehicle.status}`
              : "Your assigned vehicle will appear here."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Licence expiry</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {loading ? "Loading…" : driver?.licenseExpiryDate ? new Date(`${driver.licenseExpiryDate.slice(0, 10)}T00:00:00`).toLocaleDateString() : "Not available"}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <CalendarDays size={19} />
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Keep your licence details current with your manager.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Assigned trips</h2>
            <p className="mt-1 text-sm text-slate-500">Routes and delivery tasks assigned to you.</p>
          </div>
          <Link to="/driver/history" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800">
            Trip history <ArrowRight size={15} />
          </Link>
        </div>
        {tripNotice && (
          <p role="status" className="mx-5 mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {tripNotice}
          </p>
        )}
        {tripsError && (
          <p role="alert" className="mx-5 mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {tripsError}
          </p>
        )}
        {tripsLoading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading your assignments…</p>
        ) : trips.length === 0 ? (
          <div className="px-5 py-10 text-center sm:py-12">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Route size={22} />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">No active trips</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">
              Trips assigned to your driver account will appear here.
            </p>
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
                    <p className="mt-1 text-sm text-slate-500">
                      {trip.route?.routeNumber} <span className="px-1 text-slate-300">·</span> {trip.vehicle?.registrationNumber || "Vehicle unavailable"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${trip.status === "in-progress" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                    {trip.status === "in-progress" ? "In progress" : "Assigned"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2"><CalendarDays size={15} className="text-slate-400" />{new Date(trip.scheduledStart).toLocaleString()}</span>
                  <span className="inline-flex items-center gap-2"><Truck size={15} className="text-slate-400" />{trip.vehicle?.type || "Vehicle details unavailable"}</span>
                </div>

                {trip.route?.stops?.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{trip.route.origin}</span>
                    {trip.route.stops.map((stop, index) => (
                      <span key={`${stop.name}-${index}`} className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{stop.name}</span>
                    ))}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{trip.route.destination}</span>
                  </div>
                )}

                {trip.deliveries?.length > 0 && (
                  <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-800">Deliveries on this trip</h4>
                      <span className="text-xs text-slate-500">{trip.deliveries.length} {trip.deliveries.length === 1 ? "order" : "orders"}</span>
                    </div>
                    <div className="space-y-2">
                      {trip.deliveries.map((delivery) => (
                        <div key={delivery._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{delivery.reference}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{delivery.pickup} → {delivery.destination}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{delivery.status}</span>
                            {trip.status === "in-progress" && delivery.status === "In Transit" && (
                              <>
                                <button
                                  type="button"
                                  disabled={updatingTripId === trip._id}
                                  onClick={() => handleDeliveryOutcome(trip, delivery, "Delivered")}
                                  className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  Delivered
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingTripId === trip._id}
                                  onClick={() => handleDeliveryOutcome(trip, delivery, "Failed")}
                                  className="rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                                >
                                  Failed
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  {trip.status === "in-progress" && (
                    <div>
                      <button
                        type="button"
                        onClick={() => handleShareLocation(trip)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${sharingLocationTripId === trip._id ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-blue-200 text-blue-700 hover:bg-blue-50"}`}
                      >
                        <LocateFixed size={15} />
                        {sharingLocationTripId === trip._id ? "Stop live sharing" : "Start live sharing"}
                      </button>
                      <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-500">
                        {sharingLocationTripId === trip._id
                          ? "Reports device location changes, at most once every 10 seconds. Stop sharing anytime."
                          : "Shares device location while this trip is in progress; browser permission is required."}
                      </p>
                    </div>
                  )}
                  {trip.status === "assigned" ? (
                    <button
                      type="button"
                      disabled={updatingTripId === trip._id}
                      onClick={() => handleTripStatusChange(trip, "in-progress")}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {updatingTripId === trip._id ? "Updating…" : "Start trip"}
                    </button>
                  ) : (
                    <div className="text-right">
                      {trip.deliveries?.some(
                        (delivery) => !["Delivered", "Failed"].includes(delivery.status),
                      ) && (
                        <p className="mb-2 text-xs text-slate-500">
                          Record an outcome for every delivery before completing the trip.
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={
                          updatingTripId === trip._id ||
                          trip.deliveries?.some(
                            (delivery) => !["Delivered", "Failed"].includes(delivery.status),
                          )
                        }
                        onClick={() => handleTripStatusChange(trip, "completed")}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingTripId === trip._id ? "Updating…" : "Complete trip"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export function ClientHome() {
  const { user } = useAuth();
  return (
    <main className="min-h-full bg-slate-50 p-3 sm:p-5">
      <section className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-white to-blue-50 p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-blue-700">Client portal</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Welcome, {user?.name?.split(" ")[0] || "there"}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">See permitted delivery progress and current status. Your account is read-only.</p>
        <Link to="/client/track" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Track a delivery<MapPinned size={16} />
        </Link>
      </section>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {[
          { title: "Active deliveries", value: "—", icon: Package },
          { title: "Delivered", value: "—", icon: Clock3 },
          { title: "Account", value: "Client", icon: UserRound },
        ].map(({ title, value, icon: Icon }) => (
          <section key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={20} /></span>
            <p className="mt-4 text-sm text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          </section>
        ))}
      </div>
      <EmptyState
        icon={Package}
        title="No deliveries to show"
        message="Deliveries shared with your account will appear here with status and estimated progress."
        action="Track a delivery"
        to="/client/track"
      />
    </main>
  );
}

export function RoleModulePlaceholder({ title, description }) {
  return (
    <main className="min-h-full bg-slate-50 p-3 sm:p-5">
      <header className="mb-6">
        <p className="text-sm font-medium text-blue-700">Role workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </header>
      <EmptyState
        icon={title.toLowerCase().includes("profile") || title.toLowerCase().includes("account") ? UserRound : Package}
        title={`${title} is being prepared`}
        message="This workspace section is planned for the next project milestone. Your role-specific navigation is ready; the data and actions will be connected next."
      />
    </main>
  );
}
