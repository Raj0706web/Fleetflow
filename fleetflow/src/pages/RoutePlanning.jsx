import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { assignVehicleToRoute, createRoute, geocodePlaces, getRoutes, updateRoute } from "../api/routes";
import { getVehicles } from "../api/vehicles";
import {
  FileClock,
  Filter,
  Navigation,
  Plus,
  Search,
  Truck,
} from "lucide-react";

const endpointIcon = (color) => L.divIcon({
  className: "fleetflow-map-marker",
  html: `<span style="display:block;width:18px;height:18px;border:4px solid ${color};border-radius:50%;background:#fff;box-shadow:0 1px 5px #0004"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function PlaceSearch({ label, value, onChange, compact = false }) {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (value) setQuery(value.name || "");
  }, [value?.name]);

  async function handleSearch(event) {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError("Enter at least two characters.");
      setResults([]);
      return;
    }
    setSearching(true);
    setError("");
    try {
      const places = await geocodePlaces(query.trim());
      setResults(places);
      if (!places.length) setError("No places found. Try a more specific city or address.");
    } catch (searchError) {
      setResults([]);
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  }

  return <div className="min-w-0 text-xs font-medium text-slate-700">
    <span>{label}</span>
    <form onSubmit={handleSearch} className="mt-1 flex gap-1.5">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setResults([]);
          setError("");
          if (value) onChange(null);
        }}
        placeholder={compact ? "Search city or address" : "e.g. Kolkata, West Bengal"}
        aria-label={`${label} city or address`}
        className={`min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 text-slate-800 outline-none focus:border-blue-500 ${compact ? "py-1.5 text-[10px]" : "py-2 text-sm"}`}
      />
      <button type="submit" disabled={searching} className={`shrink-0 rounded-md bg-blue-600 font-medium text-white hover:bg-blue-700 disabled:opacity-60 ${compact ? "px-2 text-[10px]" : "px-3 text-xs"}`}>
        {searching ? "Searching…" : "Search"}
      </button>
    </form>
    {value && <p className="mt-1 truncate text-[10px] font-normal text-emerald-700" title={value.name}>Selected: {value.name}</p>}
    {error && <p role="alert" className="mt-1 text-[10px] font-normal text-rose-600">{error}</p>}
    {results.length > 0 && <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
      {results.map((place, index) => <li key={`${place.name}-${index}`}>
        <button type="button" onClick={() => { onChange(place); setResults([]); setError(""); }} className="w-full rounded px-2 py-1.5 text-left text-[10px] font-normal text-slate-700 hover:bg-blue-50">{place.name}</button>
      </li>)}
    </ul>}
  </div>;
}

function RouteMapView({ route, routeStops, onStatus }) {
  const map = useMap();
  const [roadPath, setRoadPath] = useState([]);
  const positions = useMemo(() => routeStops.map((stop) => stop.coordinates)
    .filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng))
    .map((point) => [point.lat, point.lng]), [routeStops]);
  const coordinatesKey = positions.map(([lat, lng]) => `${lat},${lng}`).join(";");

  useEffect(() => {
    if (!positions.length) return undefined;
    map.fitBounds(positions, { padding: [48, 48], maxZoom: 7, animate: true });
    const coordinateList = positions.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const controller = new AbortController();
    onStatus("Finding road route…");
    fetch(`https://router.project-osrm.org/route/v1/driving/${coordinateList}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Road routing is unavailable");
        return response.json();
      })
      .then((data) => {
        const coordinates = data.routes?.[0]?.geometry?.coordinates;
        if (!coordinates?.length) throw new Error("No road path returned");
        setRoadPath(coordinates.map(([lng, lat]) => [lat, lng]));
        onStatus("Road route");
      })
      .catch((error) => {
        if (error.name !== "AbortError") onStatus("Road routing unavailable · showing direct segments");
      });
    return () => controller.abort();
  }, [map, route?._id, coordinatesKey, positions, onStatus]);

  return <>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
    {(roadPath.length ? roadPath : positions).length > 1 && <Polyline positions={roadPath.length ? roadPath : positions} pathOptions={{ color: "#0754c7", weight: 6, opacity: 0.9 }} />}
    {routeStops.map((stop, index) => stop.coordinates && <Marker
      key={`${route?._id}-${stop.type}-${stop.name}`}
      position={[stop.coordinates.lat, stop.coordinates.lng]}
      icon={endpointIcon(index === 0 ? "#0754c7" : index === routeStops.length - 1 ? "#13a66b" : "#7c8da5")}
    ><Popup>{stop.type}: {stop.name}</Popup></Marker>)}
  </>;
}

function VehicleTruckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 24" className="h-6 w-8 shrink-0 text-blue-600" fill="currentColor">
      <path d="M0 4h7v1.5H0zM2 8h5v1.5H2zM0 12h7v1.5H0z" />
      <path d="M7.5 3h12c.83 0 1.5.67 1.5 1.5V7h3.3c.62 0 1.2.3 1.57.8l2.5 3.33c.2.27.31.6.31.94v4.18c0 .97-.78 1.75-1.75 1.75h-1.6a3.25 3.25 0 0 1-6.36 0h-5.27a3.25 3.25 0 0 1-6.36 0h-.25c-.97 0-1.75-.78-1.75-1.75V4.5C5.5 3.67 6.17 3 7 3h.5Zm13.5 6v3.25h6.02l-2.02-2.7a1.38 1.38 0 0 0-1.1-.55H21Zm-11.32 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}

function VehicleCard({ vehicle, selected, onSelect, onChangeRoute }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      className={`cursor-pointer rounded-xl border px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${selected ? "border-blue-500 bg-white ring-1 ring-blue-500" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50"}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5 text-left">
          <VehicleTruckIcon />
          <span className="truncate text-[10px] font-medium text-slate-700">#ShipID0123</span>
        </span>
        <button type="button" onClick={(event) => { event.stopPropagation(); onChangeRoute(); }} className="shrink-0 rounded border border-blue-500 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-50">
          Change Route
        </button>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">{vehicle.registrationNumber || vehicle.plate}</p>
      <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-slate-500">
        <span>{vehicle.type || `${vehicle.from} ⟶ ${vehicle.to}`}</span>
        <span className="whitespace-nowrap">Max Ld. {vehicle.capacity}{typeof vehicle.capacity === "number" ? " Ton" : ""}</span>
      </div>
    </article>
  );
}

function RouteGroup({ route, selected, expanded, onToggle, onVehicleSelect, editingStops, draftStops, onStartEdit, onDraftStopsChange, onSaveStops, onCancelEdit, stopsSaving, stopsError }) {
  return (
    <section className="pb-2.5 last:pb-0">
      <div className="flex items-center gap-2">
        <h3 className="shrink-0 text-[11px] font-medium text-slate-800">{route.routeNumber}</h3>
        <span className="h-px min-w-0 flex-1 bg-slate-400" />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-[11px] text-slate-500">{route.origin} ⟶ {route.destination}</p>
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="text-[10px] text-blue-600 hover:text-blue-800">{expanded ? "View Less" : "View More"}</button>
      </div>
      {expanded && <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Route stops</p>
          {!editingStops && <button type="button" onClick={onStartEdit} className="text-[10px] font-medium text-blue-600 hover:text-blue-800">Edit stops</button>}
        </div>
        {editingStops ? <div className="mt-2 space-y-2">
          {draftStops.map((stop, index) => <div key={`edit-stop-${index}`} className="flex items-start gap-1.5">
            <span className="w-10 shrink-0 pt-2 text-[9px] text-slate-500">Stop {index + 1}</span>
            <div className="min-w-0 flex-1"><PlaceSearch compact label={`Search stop ${index + 1}`} value={stop.name ? stop : null} onChange={(place) => onDraftStopsChange(draftStops.map((item, itemIndex) => itemIndex === index ? (place || { name: "", coordinates: null }) : item))} /></div>
            <button type="button" aria-label={`Remove stop ${index + 1}`} onClick={() => onDraftStopsChange(draftStops.filter((_, itemIndex) => itemIndex !== index))} className="rounded px-1.5 py-1 text-sm text-slate-500 hover:bg-white hover:text-rose-600">×</button>
          </div>)}
          <button type="button" onClick={() => onDraftStopsChange([...draftStops, { name: "", coordinates: null }])} className="text-[10px] font-medium text-blue-600 hover:text-blue-800">+ Add stop</button>
          {stopsError && <p role="alert" className="text-[10px] text-rose-600">{stopsError}</p>}
          <div className="flex justify-end gap-1.5">
            <button type="button" disabled={stopsSaving} onClick={onCancelEdit} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-600">Cancel</button>
            <button type="button" disabled={stopsSaving || draftStops.some((stop) => !stop.name || !stop.coordinates)} onClick={onSaveStops} className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50">{stopsSaving ? "Saving…" : "Save stops"}</button>
          </div>
        </div> : <ol className="mt-1 space-y-1">
          {[route.origin, ...(route.stops ?? []).slice().sort((a, b) => a.order - b.order).map((stop) => stop.name), route.destination].map((stop, index, list) => <li key={`${index}-${stop}`} className="flex items-center gap-2 text-[10px] text-slate-700">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-white text-[8px] text-blue-700">{index === 0 ? "S" : index === list.length - 1 ? "D" : index}</span>{stop}
          </li>)}
        </ol>}
      </div>}
      <div className="mt-2 space-y-1">
        {route.vehicles.map((vehicle) => (
          <button key={vehicle._id} type="button" onClick={() => onVehicleSelect(vehicle._id)} className={`flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left transition-colors ${selected === vehicle._id ? "bg-blue-50/70" : "hover:bg-slate-50"}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500"><Truck size={17} strokeWidth={1.35} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] leading-4 text-slate-800">ID: {vehicle.registrationNumber}</span>
              <span className="mt-0.5 block truncate text-[11px] leading-4 text-slate-500">{route.origin} ⟶ {route.destination}</span>
            </span>
            <span className="shrink-0 pl-1 text-right">
              <span className="block text-[12px] leading-4 text-slate-800">{vehicle.registrationNumber}</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">Estimate Time: {route.estimatedHours || "—"} Hrs</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function RoutePlanning() {
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");
  const [routesData, setRoutesData] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [routeSearch, setRouteSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [mapStatus, setMapStatus] = useState("");
  const [expandedRouteIds, setExpandedRouteIds] = useState([]);
  const [assignmentVehicleId, setAssignmentVehicleId] = useState("");
  const [assignmentRouteId, setAssignmentRouteId] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [editingStopsRouteId, setEditingStopsRouteId] = useState("");
  const [draftStops, setDraftStops] = useState([]);
  const [stopsSaving, setStopsSaving] = useState(false);
  const [stopsError, setStopsError] = useState("");
  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [newRouteSaving, setNewRouteSaving] = useState(false);
  const [newRouteError, setNewRouteError] = useState("");
  const [newRouteForm, setNewRouteForm] = useState({ routeNumber: "", origin: null, destination: null, stops: [], estimatedHours: "", vehicleIds: [] });
  const updateMapStatus = useCallback((status) => setMapStatus(status), []);
  useEffect(() => {
    let cancelled = false;
    getVehicles()
      .then((records) => {
        if (cancelled) return;
        const normalized = records.map((vehicle) => ({ ...vehicle, id: vehicle._id }));
        setVehicles(normalized);
        setSelectedVehicleId((current) => current || normalized[0]?.id || "");
      })
      .catch((error) => {
        if (!cancelled) setVehiclesError(error.message);
      })
      .finally(() => {
        if (!cancelled) setVehiclesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getRoutes()
      .then((records) => {
        if (!cancelled) setRoutesData(records);
      })
      .catch((error) => {
        if (!cancelled) setRoutesError(error.message);
      })
      .finally(() => {
        if (!cancelled) setRoutesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0] ?? null;
  const selectedRoute = routesData.find((route) => route._id === selectedRouteId)
    ?? routesData.find((route) => route.vehicles.some((vehicle) => vehicle._id === selectedVehicleId))
    ?? routesData[0]
    ?? null;
  const routeStops = useMemo(() => selectedRoute
    ? [
        { name: selectedRoute.origin, type: "Departure", coordinates: selectedRoute.originCoordinates },
        ...[...(selectedRoute.stops ?? [])].sort((a, b) => a.order - b.order).map((stop) => ({ ...stop, type: "Stop" })),
        { name: selectedRoute.destination, type: "Arrival", coordinates: selectedRoute.destinationCoordinates },
      ]
    : [], [selectedRoute]);
  const routeLegs = useMemo(() => {
    const legs = routeStops.slice(0, -1).map((from, index) => {
      const to = routeStops[index + 1];
      const a = from.coordinates;
      const b = to.coordinates;
      let distance = 1;
      if (a && b) {
        const radians = (degrees) => (degrees * Math.PI) / 180;
        const dLat = radians(b.lat - a.lat);
        const dLng = radians(b.lng - a.lng);
        const haversine = Math.sin(dLat / 2) ** 2
          + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
        distance = 2 * 6371 * Math.asin(Math.sqrt(haversine));
      }
      return { from: from.name, to: to.name, distance };
    });
    const totalDistance = legs.reduce((sum, leg) => sum + leg.distance, 0) || 1;
    const totalHours = Number(selectedRoute?.estimatedHours) || 0;
    return legs.map((leg) => ({ ...leg, hours: totalHours * leg.distance / totalDistance }));
  }, [routeStops, selectedRoute?.estimatedHours]);
  const visibleVehicles = useMemo(() => vehicles.filter((vehicle) =>
    `${vehicle.registrationNumber} ${vehicle.type} ${vehicle.status}`.toLowerCase().includes(vehicleSearch.toLowerCase())), [vehicles, vehicleSearch]);
  const visibleRoutes = routesData.filter((route) => `${route.routeNumber} ${route.origin} ${route.destination}`.toLowerCase().includes(routeSearch.toLowerCase()));

  return (
    <main className="h-[calc(100vh-120px)] min-h-[560px] max-h-[900px] min-w-0">
      <div
        className="grid h-full min-w-0 gap-4"
        style={{ gridTemplateColumns: "minmax(190px, 0.86fr) minmax(320px, 1.58fr) minmax(220px, 1.1fr)", gridTemplateRows: "minmax(0, 1fr)" }}
      >
        <section className="mt-8 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
          <div className="border-b border-slate-100" style={{ padding: "8px 8px 8px 12px" }}>
            <div className="flex items-center justify-between gap-2">
              <h1 className="shrink-0 text-xs font-semibold text-slate-800">Vehicles</h1>
              <label className="flex min-w-0 flex-1 items-center gap-1 rounded-md border border-slate-200 px-2 py-2 text-slate-400 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
              <Search size={12} className="shrink-0" />
              <input value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Search by Shipment ID, No." aria-label="Search vehicles" className="w-full min-w-0 bg-transparent text-[10px] outline-none placeholder:text-slate-400" />
              </label>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
            {vehiclesLoading && <p className="p-2 text-[10px] text-slate-500">Loading vehicles…</p>}
            {!vehiclesLoading && vehiclesError && <p className="p-2 text-[10px] text-rose-600">{vehiclesError}</p>}
            {!vehiclesLoading && !vehiclesError && visibleVehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} selected={selectedVehicleId === vehicle.id} onSelect={() => setSelectedVehicleId(vehicle.id)} onChangeRoute={() => {
              setSelectedVehicleId(vehicle.id);
              setAssignmentVehicleId(vehicle.id);
              const currentRoute = routesData.find((route) => route.vehicles.some((assigned) => assigned._id === vehicle.id));
              setAssignmentRouteId(currentRoute?._id ?? routesData[0]?._id ?? "");
              setAssignmentError("");
            }} />)}
            {!vehiclesLoading && !vehiclesError && visibleVehicles.length === 0 && <p className="p-2 text-[10px] text-slate-500">{vehicles.length ? "No matching vehicles." : "No vehicles yet. Add a vehicle to see it here."}</p>}
          </div>
        </section>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <div>
              <p className="text-[10px] text-slate-500">Route Planning</p>
              <h2 className="text-sm font-semibold text-slate-800">{selectedVehicle ? `#${selectedVehicle.registrationNumber}` : "No vehicle selected"}</h2>
            </div>
            <button type="button" onClick={() => { setNewRouteOpen(true); setNewRouteError(""); }} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-blue-700"><Plus size={12} /> New Route</button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden bg-[#dfe9d9]">
            {routeStops.length > 0 ? (
              <MapContainer
                key={selectedRoute?._id ?? "no-route"}
                center={[20.5937, 78.9629]}
                zoom={5}
                className="absolute inset-0 h-full w-full"
                scrollWheelZoom
              >
                <RouteMapView route={selectedRoute} routeStops={routeStops} onStatus={updateMapStatus} />
              </MapContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">Select a route with saved locations to view it on the map.</div>}
            {mapStatus && <span className="absolute left-3 top-3 z-[1101] rounded-md bg-white/95 px-2.5 py-1.5 text-xs text-slate-600 shadow">{mapStatus}</span>}
            <div
              className="grid min-h-[120px] items-center gap-3 rounded-lg border border-[#f0f0f0] bg-white px-2 py-2 shadow-lg"
              style={{ position: "absolute", width: "min(700px, calc(100% - 16px))", left: "50%", bottom: 8, top: "auto", transform: "translateX(-50%)", zIndex: 1100, gridTemplateColumns: "minmax(190px, 1fr) 96px minmax(0, 1.2fr)" }}
            >
              <div className="relative min-w-0">
                <span aria-hidden="true" style={{ position: "absolute", left: 10, top: 10, bottom: 10, borderLeft: "2px dashed #d1d5db" }} />
                <div className="space-y-0.5 text-[9px] text-slate-600">
                  {routeStops.map((stop, index) => (
                    <div key={`${stop.type}-${stop.name}`} className="grid min-h-4 items-center leading-3" style={{ gridTemplateColumns: "16px 72px minmax(0, 1fr)", columnGap: 6 }}>
                      <span className="relative z-10 flex h-4 w-4 items-center justify-center bg-white">
                        {index === 0 ? (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-300 bg-white"><span className="h-2 w-2 rounded-full bg-blue-700" /></span>
                        ) : (
                          <span className="h-3 w-3 rounded-full border-2 border-blue-700 bg-white" />
                        )}
                      </span>
                      <span className="text-slate-500">{stop.type === "Stop" ? `Stop 0${index}` : stop.type}</span>
                      <span className="truncate font-medium text-slate-800">{stop.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0">
                <div className="relative h-11 overflow-hidden rounded-md border border-slate-200 bg-[#f4f4ee]">
                  <svg viewBox="0 0 96 44" className="h-full w-full" aria-hidden="true">
                    <path d="M-4 7 24 17 44 13 63 31 100 25M5 47 18 27 42 22 53-4M73 48 66 29 81 14 98 5M-4 34 23 28 39 44M31-4 40 13 61 16 75-4" fill="none" stroke="#d6d7ca" strokeWidth="2" />
                    <path d="M7 40 27 31 42 33 55 23 70 19 86 8" fill="none" stroke="#2563eb" strokeWidth="2.5" />
                    <circle cx="7" cy="40" r="3" fill="#2563eb" />
                    <path d="M84 8a3 3 0 1 1 6 0c0 2-3 5-3 5s-3-3-3-5Z" fill="#2563eb" />
                  </svg>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-500"><Navigation size={10} /> {selectedRoute?.routeNumber ?? "No route"}</div>
              </div>

              <div className="min-w-0 border-l border-slate-200 pl-3">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-medium text-slate-700">Route estimate</span>
                  <span className="shrink-0 font-semibold text-slate-800">{selectedRoute?.estimatedHours ? `${selectedRoute.estimatedHours} Hrs` : "—"}</span>
                </div>
                <div className="mt-2 w-full overflow-x-auto">
                  <div className="min-w-full" style={{ minWidth: `${Math.max(routeStops.length * 48, 180)}px` }}>
                    <div className="grid h-4 text-[8px] text-slate-400" style={{ gridTemplateColumns: `repeat(${Math.max(routeStops.length, 1)}, minmax(0, 1fr))` }}>
                      {routeStops.map((stop) => <span key={`label-${stop.name}`} title={stop.name} className="truncate px-0.5">{stop.name}</span>)}
                    </div>
                    <div
                      className="relative mt-1 grid h-6 w-full rounded-sm text-[9px] font-medium text-slate-800"
                      style={{ gridTemplateColumns: routeLegs.map((leg) => `${leg.distance}fr`).join(" ") || "1fr" }}
                    >
                      {routeLegs.map((leg, index) => <div key={`leg-${leg.from}`} className={`flex min-w-0 items-center justify-center border-r-2 border-rose-500 px-0.5 ${index === routeLegs.length - 1 ? "bg-blue-600 text-white" : index % 2 ? "bg-[#9bc8ff]" : "bg-[#dceeff]"}`} title={`${leg.from} to ${leg.to}: ${leg.hours.toFixed(1)} hours`}>
                        <span className="truncate">{leg.hours.toFixed(1)}h</span>
                      </div>)}
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
        </section>

        <section className="h-fit min-w-0 self-start overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
          <div className="border-b border-slate-100 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-semibold text-slate-800">Routes</h2>
              <label className="flex w-[62%] items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-slate-400 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                <Search size={11} className="shrink-0" />
                <input value={routeSearch} onChange={(event) => setRouteSearch(event.target.value)} placeholder="Search by Route No" aria-label="Search routes" className="w-full min-w-0 bg-transparent text-[9px] outline-none placeholder:text-slate-400" />
              </label>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500">
              <span>{showHistory ? "Route History" : "Routes"}</span>
              <div className="flex gap-2">
                <button type="button" aria-label="Filter routes" className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"><Filter size={15} /></button>
                <button type="button" aria-label="Toggle route history" onClick={() => setShowHistory((value) => !value)} className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"><FileClock size={15} /></button>
              </div>
            </div>
          </div>
          <div className="max-h-[calc(100vh-230px)] space-y-3 overflow-y-auto px-3 py-3">
            {routesLoading && <p className="p-2 text-[11px] text-slate-500">Loading routes…</p>}
            {!routesLoading && routesError && <p className="p-2 text-[11px] text-rose-600">{routesError}</p>}
            {!routesLoading && !routesError && visibleRoutes.map((route) => <RouteGroup
              key={route._id}
              route={route}
              selected={selectedVehicleId}
              expanded={expandedRouteIds.includes(route._id)}
              editingStops={editingStopsRouteId === route._id}
              draftStops={draftStops}
              stopsSaving={stopsSaving}
              stopsError={stopsError}
              onStartEdit={() => {
                setEditingStopsRouteId(route._id);
                setDraftStops((route.stops ?? []).slice().sort((a, b) => a.order - b.order).map((stop) => ({ name: stop.name, coordinates: stop.coordinates })));
                setStopsError("");
              }}
              onDraftStopsChange={setDraftStops}
              onCancelEdit={() => { setEditingStopsRouteId(""); setStopsError(""); }}
              onSaveStops={async () => {
                setStopsSaving(true);
                setStopsError("");
                try {
                  const stops = draftStops.map((stop, index) => ({
                    name: stop.name,
                    order: index + 1,
                    type: "stop",
                    coordinates: stop.coordinates,
                  }));
                  await updateRoute(route._id, { stops });
                  const updatedRoutes = await getRoutes();
                  setRoutesData(updatedRoutes);
                  setSelectedRouteId(route._id);
                  setEditingStopsRouteId("");
                } catch (error) {
                  setStopsError(error.message);
                } finally {
                  setStopsSaving(false);
                }
              }}
              onToggle={() => {
                setSelectedRouteId(route._id);
                setExpandedRouteIds((current) => current.includes(route._id) ? current.filter((id) => id !== route._id) : [...current, route._id]);
              }}
              onVehicleSelect={(id) => { setSelectedRouteId(route._id); setSelectedVehicleId(id); }}
            />)}
            {!routesLoading && !routesError && visibleRoutes.length === 0 && <p className="p-2 text-[11px] text-slate-500">{routesData.length ? "No matching routes." : "No routes yet. Create a route to see it here."}</p>}
          </div>
        </section>
      </div>
      {newRouteOpen && <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/35 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !newRouteSaving) setNewRouteOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="new-route-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><h2 id="new-route-title" className="text-lg font-semibold text-slate-900">Create route</h2><p className="mt-1 text-sm text-slate-500">Add the route path and assign vehicles.</p></div>
            <button type="button" disabled={newRouteSaving} onClick={() => setNewRouteOpen(false)} aria-label="Close create route dialog" className="rounded-md px-2 text-lg text-slate-500 hover:bg-slate-100">×</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-slate-700">Route number<input value={newRouteForm.routeNumber} onChange={(event) => setNewRouteForm((form) => ({ ...form, routeNumber: event.target.value.toUpperCase() }))} placeholder="e.g. ROUTEAA003" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label>
            <label className="text-xs font-medium text-slate-700">Estimated hours<input type="number" min="0.1" step="0.1" value={newRouteForm.estimatedHours} onChange={(event) => setNewRouteForm((form) => ({ ...form, estimatedHours: event.target.value }))} placeholder="e.g. 12" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label>
            {[{ key: "origin", label: "Origin" }, { key: "destination", label: "Destination" }].map(({ key, label }) => <PlaceSearch key={key} label={label} value={newRouteForm[key]} onChange={(place) => setNewRouteForm((form) => ({ ...form, [key]: place }))} />)}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Place search by <a className="text-slate-500 underline" href="https://www.mapbox.com/about/maps/" target="_blank" rel="noreferrer">Mapbox</a>. Searches are limited to India.</p>
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-slate-700">Intermediate stops</h3><button type="button" onClick={() => setNewRouteForm((form) => ({ ...form, stops: [...form.stops, { name: "", coordinates: null }] }))} className="text-xs font-medium text-blue-600">+ Add stop</button></div>
            {newRouteForm.stops.length === 0 && <p className="mt-2 text-xs text-slate-500">No intermediate stops.</p>}
            <div className="mt-2 space-y-2">{newRouteForm.stops.map((stop, index) => <div key={`new-stop-${index}`} className="flex items-start gap-2"><span className="w-12 shrink-0 pt-2 text-xs text-slate-500">Stop {index + 1}</span><div className="min-w-0 flex-1"><PlaceSearch compact label={`Search stop ${index + 1}`} value={stop.name ? stop : null} onChange={(place) => setNewRouteForm((form) => ({ ...form, stops: form.stops.map((item, itemIndex) => itemIndex === index ? (place || { name: "", coordinates: null }) : item) }))} /></div><button type="button" aria-label={`Remove stop ${index + 1}`} onClick={() => setNewRouteForm((form) => ({ ...form, stops: form.stops.filter((_, itemIndex) => itemIndex !== index) }))} className="pt-1 text-slate-500 hover:text-rose-600">×</button></div>)}</div>
          </div>
          <fieldset className="mt-4"><legend className="text-xs font-semibold text-slate-700">Assign vehicles (optional)</legend><div className="mt-2 grid max-h-32 grid-cols-2 gap-2 overflow-y-auto">{vehicles.map((vehicle) => <label key={vehicle._id} className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700"><input type="checkbox" checked={newRouteForm.vehicleIds.includes(vehicle._id)} onChange={(event) => setNewRouteForm((form) => ({ ...form, vehicleIds: event.target.checked ? [...form.vehicleIds, vehicle._id] : form.vehicleIds.filter((id) => id !== vehicle._id) }))} />{vehicle.registrationNumber}</label>)}{vehicles.length === 0 && <p className="col-span-2 text-xs text-slate-500">No vehicles available yet. You can create the route and assign vehicles later.</p>}</div></fieldset>
          {newRouteError && <p role="alert" className="mt-3 text-sm text-rose-600">{newRouteError}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={newRouteSaving} onClick={() => setNewRouteOpen(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">Cancel</button><button type="button" disabled={newRouteSaving || !newRouteForm.routeNumber.trim() || !newRouteForm.estimatedHours || !newRouteForm.origin?.coordinates || !newRouteForm.destination?.coordinates || newRouteForm.origin.name === newRouteForm.destination.name || newRouteForm.stops.some((stop) => !stop.name || !stop.coordinates)} onClick={async () => {
            setNewRouteSaving(true);
            setNewRouteError("");
            try {
              const created = await createRoute({
                routeNumber: newRouteForm.routeNumber.trim(),
                origin: newRouteForm.origin.name,
                originCoordinates: newRouteForm.origin.coordinates,
                destination: newRouteForm.destination.name,
                destinationCoordinates: newRouteForm.destination.coordinates,
                stops: newRouteForm.stops.map(({ name, coordinates }, index) => ({ name, order: index + 1, type: "stop", coordinates })),
                vehicles: newRouteForm.vehicleIds,
                estimatedHours: Number(newRouteForm.estimatedHours),
                status: "planned",
              });
              const updatedRoutes = await getRoutes();
              setRoutesData(updatedRoutes);
              setSelectedRouteId(created._id);
              setSelectedVehicleId(created.vehicles[0]?._id ?? "");
              setExpandedRouteIds((current) => [...current, created._id]);
              setNewRouteForm({ routeNumber: "", origin: null, destination: null, stops: [], estimatedHours: "", vehicleIds: [] });
              setNewRouteOpen(false);
            } catch (error) {
              setNewRouteError(error.message);
            } finally {
              setNewRouteSaving(false);
            }
          }} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{newRouteSaving ? "Creating…" : "Create route"}</button></div>
        </section>
      </div>}
      {assignmentVehicleId && <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/30 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !assignmentSaving) setAssignmentVehicleId(""); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="assign-route-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
          <h2 id="assign-route-title" className="text-base font-semibold text-slate-900">Change vehicle route</h2>
          <p className="mt-1 text-sm text-slate-500">Assign {vehicles.find((vehicle) => vehicle.id === assignmentVehicleId)?.registrationNumber} to a route.</p>
          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="route-assignment">Route</label>
          <select id="route-assignment" value={assignmentRouteId} onChange={(event) => setAssignmentRouteId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="" disabled>Select a route</option>
            {routesData.map((route) => <option key={route._id} value={route._id}>{route.routeNumber} · {route.origin} → {route.destination}</option>)}
          </select>
          {assignmentError && <p role="alert" className="mt-3 text-sm text-rose-600">{assignmentError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={assignmentSaving} onClick={() => setAssignmentVehicleId("")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" disabled={assignmentSaving || !assignmentRouteId} onClick={async () => {
              setAssignmentSaving(true);
              setAssignmentError("");
              try {
                await assignVehicleToRoute(assignmentRouteId, assignmentVehicleId);
                const updatedRoutes = await getRoutes();
                setRoutesData(updatedRoutes);
                setSelectedRouteId(assignmentRouteId);
                setAssignmentVehicleId("");
              } catch (error) {
                setAssignmentError(error.message);
              } finally {
                setAssignmentSaving(false);
              }
            }} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{assignmentSaving ? "Saving…" : "Save route"}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
