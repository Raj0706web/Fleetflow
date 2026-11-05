import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { io } from "socket.io-client";
import "leaflet/dist/leaflet.css";
import { Clock3, LocateFixed, MapPin, Play, RefreshCw, Search, Square, Truck } from "lucide-react";
import { API_ORIGIN } from "../api/config";
import { getTrips, updateTripLocation } from "../api/trips";

const activeStatuses = ["assigned", "in-progress"];
const statusText = (status = "") => status.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const markerIcon = (color) => L.divIcon({
  className: "fleetflow-live-marker",
  html: `<span style="display:block;width:18px;height:18px;border:4px solid ${color};border-radius:50%;background:#fff;box-shadow:0 1px 5px #0004"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const originIcon = markerIcon("#0754c7");
const stopIcon = markerIcon("#8492a6");
const destinationIcon = markerIcon("#13a66b");
const currentIcon = L.divIcon({
  className: "fleetflow-live-vehicle",
  html: '<span style="display:flex;width:30px;height:30px;align-items:center;justify-content:center;border:3px solid #fff;border-radius:50%;background:#0754c7;color:#fff;box-shadow:0 2px 8px #0005"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h11v11H3zM14 11h4l3 3v4h-7z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function FitTripBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [36, 36], maxZoom: 8 });
    else if (positions.length === 1) map.setView(positions[0], 7);
  }, [map, positions]);
  return null;
}

function TripMap({ trip, stops, currentLocation, onRoutePathChange }) {
  const [roadPath, setRoadPath] = useState([]);
  const routePositions = useMemo(
    () => stops.filter((stop) => Number.isFinite(stop.coordinates?.lat) && Number.isFinite(stop.coordinates?.lng))
      .map((stop) => [stop.coordinates.lat, stop.coordinates.lng]),
    [stops],
  );
  const mapPositions = useMemo(() => [
    ...routePositions,
    ...(Number.isFinite(currentLocation?.lat) && Number.isFinite(currentLocation?.lng)
      ? [[currentLocation.lat, currentLocation.lng]]
      : []),
  ], [routePositions, currentLocation?.lat, currentLocation?.lng]);
  const coordinatesKey = routePositions.map(([lat, lng]) => `${lat},${lng}`).join(";");

  useEffect(() => {
    setRoadPath([]);
    onRoutePathChange(routePositions);
    if (routePositions.length < 2) return undefined;
    const controller = new AbortController();
    const coordinateList = routePositions.map(([lat, lng]) => `${lng},${lat}`).join(";");
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordinateList}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Road path unavailable")))
      .then((data) => {
        const coordinates = data.routes?.[0]?.geometry?.coordinates;
        if (coordinates?.length) {
          const path = coordinates.map(([lng, lat]) => [lat, lng]);
          setRoadPath(path);
          onRoutePathChange(path);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setRoadPath([]);
          onRoutePathChange(routePositions);
        }
      });
    return () => controller.abort();
  }, [trip?._id, coordinatesKey, onRoutePathChange]);

  return <>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
    <FitTripBounds positions={mapPositions} />
    {(roadPath.length > 1 ? roadPath : routePositions).length > 1 && <Polyline positions={roadPath.length > 1 ? roadPath : routePositions} pathOptions={{ color: "#0754c7", weight: 5, opacity: 0.9 }} />}
    {stops.map((stop, index) => stop.coordinates && <Marker
      key={`${trip?._id}-${stop.type}-${stop.name}`}
      position={[stop.coordinates.lat, stop.coordinates.lng]}
      icon={index === 0 ? originIcon : index === stops.length - 1 ? destinationIcon : stopIcon}
    ><Popup>{stop.type}: {stop.name}</Popup></Marker>)}
    {currentLocation && <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentIcon} zIndexOffset={1500}><Popup>Vehicle location · reported {timeLabel(currentLocation.recordedAt)}</Popup></Marker>}
  </>;
}

function TripCard({ trip, selected, onClick }) {
  const status = trip.status === "in-progress" ? "In progress" : "Assigned";
  return <button type="button" onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Truck size={18} /></span><span className="truncate text-xs font-semibold text-slate-900">{trip.vehicle?.registrationNumber || "Vehicle pending"}</span></span>
      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${trip.status === "in-progress" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{status}</span>
    </div>
    <p className="mt-2 truncate text-xs font-medium text-slate-800">{trip.tripNumber}</p>
    <p className="mt-1 truncate text-[11px] text-slate-500">{trip.route?.origin || "Origin unavailable"} → {trip.route?.destination || "Destination unavailable"}</p>
    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500"><span>{trip.driver?.name || "No driver"}</span><span>{trip.deliveries?.length || 0} deliveries</span></div>
  </button>;
}

function timeLabel(value) {
  if (!value) return "Time unavailable";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function Tracking() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [routePath, setRoutePath] = useState([]);
  const [simulatingTripId, setSimulatingTripId] = useState("");
  const simulationTimerRef = useRef(null);
  const simulationIndexRef = useRef(0);
  const simulationBusyRef = useRef(false);

  const stopSimulation = useCallback(() => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    simulationTimerRef.current = null;
    simulationIndexRef.current = 0;
    simulationBusyRef.current = false;
    setSimulatingTripId("");
  }, []);

  const handleRoutePathChange = useCallback((path) => {
    setRoutePath(path);
  }, []);

  useEffect(() => {
    setRoutePath([]);
  }, [selectedTripId]);

  const startSimulation = useCallback(async () => {
    const activeTrip = trips.find((trip) => trip._id === selectedTripId);
    if (!activeTrip || activeTrip.status !== "in-progress" || routePath.length < 2) return;
    stopSimulation();
    const tripId = activeTrip._id;
    const sampleCount = Math.min(25, routePath.length);
    const samples = Array.from({ length: sampleCount }, (_, index) => {
      const position = Math.round((index / (sampleCount - 1)) * (routePath.length - 1));
      return routePath[position];
    });
    setError("");
    setSimulatingTripId(tripId);
    const sendNext = async () => {
      if (simulationBusyRef.current) return;
      const index = simulationIndexRef.current;
      if (index >= samples.length) {
        stopSimulation();
        return;
      }
      simulationBusyRef.current = true;
      try {
        const [lat, lng] = samples[index];
        const updatedTrip = await updateTripLocation(tripId, { lat, lng }, "simulator");
        setTrips((current) => current.map((trip) => trip._id === tripId ? updatedTrip : trip));
        simulationIndexRef.current += 1;
        if (simulationIndexRef.current >= samples.length) stopSimulation();
      } catch (requestError) {
        setError(requestError.message || "Could not simulate route location.");
        stopSimulation();
      } finally {
        simulationBusyRef.current = false;
      }
    };
    await sendNext();
    if (simulationIndexRef.current > 0) simulationTimerRef.current = setInterval(sendNext, 2000);
  }, [routePath, selectedTripId, stopSimulation, trips]);

  useEffect(() => () => stopSimulation(), [stopSimulation]);

  async function loadTrips(isRefresh = false) {
    setError("");
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const records = await getTrips();
      const activeTrips = records.filter((trip) => activeStatuses.includes(trip.status));
      setTrips(activeTrips);
      setSelectedTripId((current) => activeTrips.some((trip) => trip._id === current) ? current : activeTrips[0]?._id || "");
    } catch (requestError) {
      setError(requestError.message || "Could not load active trips.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadTrips(); }, []);

  const visibleTrips = useMemo(() => {
    const query = search.trim().toLowerCase();
    return trips.filter((trip) => !query || `${trip.tripNumber} ${trip.vehicle?.registrationNumber || ""} ${trip.driver?.name || ""} ${trip.route?.origin || ""} ${trip.route?.destination || ""}`.toLowerCase().includes(query));
  }, [trips, search]);
  const selectedTrip = visibleTrips.find((trip) => trip._id === selectedTripId) || visibleTrips[0] || null;
  const route = selectedTrip?.route;
  const stops = useMemo(() => route ? [
    { name: route.origin, type: "Departure", coordinates: route.originCoordinates },
    ...[...(route.stops || [])].sort((a, b) => a.order - b.order).map((stop) => ({ ...stop, type: "Stop" })),
    { name: route.destination, type: "Arrival", coordinates: route.destinationCoordinates },
  ] : [], [route]);
  const currentLocation = selectedTrip?.lastLocation || null;
  const statusHistory = [...(selectedTrip?.statusHistory || [])].sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

  useEffect(() => {
    if (!selectedTripId) return undefined;
    const socket = io(API_ORIGIN, { withCredentials: true });
    const joinTrip = () => socket.emit("trip:join", { tripId: selectedTripId }, (result) => {
      if (result && !result.ok) setError(result.message || "Could not subscribe to trip updates.");
    });
    const applyTripUpdate = ({ tripId, trip }) => {
      if (tripId !== selectedTripId || !trip) return;
      if (activeStatuses.includes(trip.status)) {
        setTrips((current) => current.map((item) => item._id === tripId ? trip : item));
        if (trip.status !== "in-progress" && simulatingTripId === tripId) stopSimulation();
      } else {
        if (simulatingTripId === tripId) stopSimulation();
        setTrips((current) => current.filter((item) => item._id !== tripId));
        setSelectedTripId((current) => current === tripId ? "" : current);
      }
    };
    socket.on("connect", joinTrip);
    socket.on("trip:locationUpdated", applyTripUpdate);
    socket.on("trip:statusUpdated", applyTripUpdate);
    return () => {
      socket.emit("trip:leave", { tripId: selectedTripId });
      socket.disconnect();
    };
  }, [selectedTripId, simulatingTripId, stopSimulation]);

  return <main className="h-[calc(100vh-120px)] min-h-[560px] max-h-[900px] min-w-0">
    <div className="grid h-full min-h-0 gap-4" style={{ gridTemplateColumns: "minmax(250px,0.85fr) minmax(360px,1.65fr) minmax(280px,1fr)" }}>
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 p-3">
          <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-medium text-blue-600">Operations</p><h1 className="text-base font-semibold text-slate-900">Live tracking</h1></div><button type="button" onClick={() => loadTrips(true)} disabled={refreshing} aria-label="Refresh trips" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /></button></div>
          <label className="relative mt-3 block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search trips, vehicles, drivers" className="w-full rounded-lg border border-slate-200 py-2 pr-3 text-xs outline-none focus:border-blue-500" style={{ paddingLeft: 36 }} /></label>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500"><span>Active trips</span><span className="rounded-full bg-slate-100 px-2 py-0.5">{trips.length}</span></div>
        </header>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
          {loading && <p className="py-8 text-center text-sm text-slate-500">Loading active trips…</p>}
          {!loading && error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
          {!loading && !error && visibleTrips.map((trip) => <TripCard key={trip._id} trip={trip} selected={trip._id === selectedTrip?._id} onClick={() => { if (trip._id !== selectedTripId) stopSimulation(); setSelectedTripId(trip._id); }} />)}
          {!loading && !error && visibleTrips.length === 0 && <div className="px-3 py-10 text-center"><Truck className="mx-auto text-slate-300" size={25} /><p className="mt-2 text-sm font-medium text-slate-700">No active trips</p><p className="mt-1 text-xs leading-5 text-slate-500">Trips appear here after they are assigned in Trips & Assignments.</p></div>}
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div className="min-w-0"><p className="text-[10px] text-slate-500">Trip route</p><h2 className="truncate text-sm font-semibold text-slate-900">{selectedTrip ? selectedTrip.tripNumber : "Select an active trip"}</h2></div>{selectedTrip && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${selectedTrip.status === "in-progress" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{statusText(selectedTrip.status)}</span>}</header>
        <div className="relative min-h-0 flex-1 bg-slate-100">
          {selectedTrip && (stops.some((stop) => stop.coordinates) || currentLocation) ? <MapContainer key={selectedTrip._id} center={[20.5937,78.9629]} zoom={5} className="absolute inset-0 h-full w-full" scrollWheelZoom><TripMap trip={selectedTrip} stops={stops} currentLocation={currentLocation} onRoutePathChange={handleRoutePathChange} /></MapContainer> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center text-slate-500"><MapPin size={28} className="text-slate-300" /><p className="text-sm font-medium text-slate-700">{selectedTrip ? "Route coordinates unavailable" : "Select an active trip to view its route"}</p><p className="max-w-sm text-xs leading-5">The map uses saved route coordinates and only shows a vehicle marker when a location update exists.</p></div>}
          {selectedTrip && <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900">{route?.origin || "Origin"} <span className="text-blue-600">→</span> {route?.destination || "Destination"}</p><p className="mt-1 text-[10px] text-slate-500">{route?.routeNumber || "Route"} · {stops.length} stops including endpoints</p></div><span className="shrink-0 text-[10px] text-slate-500">{route?.estimatedHours ? `${route.estimatedHours} hrs estimated` : "Estimate unavailable"}</span></div></div>}
        </div>
      </section>

      <aside className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">Trip status</h2><Clock3 size={16} className="text-slate-400" /></div>
          {selectedTrip ? <><div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Current state: <span className="font-semibold text-slate-900">{statusText(selectedTrip.status)}</span></div><ol className="mt-4 space-y-3">{statusHistory.length ? statusHistory.map((update, index) => <li key={`${update.status}-${update.updatedAt}-${index}`} className="flex gap-3"><span className="relative flex w-4 shrink-0 justify-center"><span className={`mt-1 h-2.5 w-2.5 rounded-full ${index === statusHistory.length - 1 ? "bg-blue-600 ring-4 ring-blue-50" : "bg-slate-300"}`} />{index < statusHistory.length - 1 && <span className="absolute top-4 h-full w-px bg-slate-200" />}</span><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-800">{statusText(update.status)}</span><span className="mt-0.5 block text-[10px] text-slate-500">{update.note || `Trip ${statusText(update.status).toLowerCase()}`} · {timeLabel(update.updatedAt)}</span></span></li>) : <li className="text-xs text-slate-500">No status updates recorded yet.</li>}</ol></> : <p className="mt-3 text-xs text-slate-500">Select a trip to review its status history.</p>}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">Vehicle details</h2><Truck size={16} className="text-blue-600" /></div>
          {selectedTrip ? <><div className="mt-3 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Truck size={21} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{selectedTrip.vehicle?.type || "Fleet vehicle"}</p><p className="truncate text-xs text-slate-500">{selectedTrip.vehicle?.registrationNumber || "Registration unavailable"}</p></div></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-500">Driver</p><p className="mt-1 truncate font-medium text-slate-800">{selectedTrip.driver?.name || "Not assigned"}</p></div><div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-500">Load</p><p className="mt-1 font-medium text-slate-800">{Number(selectedTrip.loadWeightKg || 0).toLocaleString("en-IN")} kg</p></div></div><div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] ${currentLocation ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}><LocateFixed size={14} className="shrink-0" />{currentLocation ? `Last reported ${timeLabel(currentLocation.recordedAt)} · ${currentLocation.source}` : "No device location reported for this trip yet."}</div><div className="mt-3 rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-medium text-slate-800">Route simulation</p><p className="mt-0.5 text-[10px] text-slate-500">Demo mode · sends simulated positions along the saved route.</p></div>{simulatingTripId === selectedTrip._id ? <button type="button" onClick={stopSimulation} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[10px] font-medium text-rose-700 hover:bg-rose-50"><Square size={12} />Stop</button> : <button type="button" onClick={startSimulation} disabled={selectedTrip.status !== "in-progress" || routePath.length < 2} title={selectedTrip.status !== "in-progress" ? "Start the trip before simulating" : routePath.length < 2 ? "Route coordinates are unavailable" : "Simulate the vehicle moving along this route"} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-45"><Play size={12} />Simulate route</button>}</div></div></> : <p className="mt-3 text-xs text-slate-500">Vehicle and driver information appears when you select a trip.</p>}
        </section>
        {selectedTrip?.deliveries?.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-sm font-semibold text-slate-900">Deliveries</h2><ul className="mt-2 space-y-2">{selectedTrip.deliveries.map((delivery) => <li key={delivery._id} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-slate-700">{delivery.reference}</span><span className="shrink-0 text-[10px] text-slate-500">{delivery.status}</span></li>)}</ul></section>}
      </aside>
    </div>
  </main>;
}
