import { API_BASE_URL } from "./config";

export async function geocodePlaces(query) {
  const response = await fetch(`${API_BASE_URL}/routes/geocode?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Could not search places");
  return result.results;
}

export async function getRoutes() {
  const response = await fetch(`${API_BASE_URL}/routes`, { credentials: "include" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Could not fetch routes");
  return result;
}

export async function createRoute(routeData) {
  const response = await fetch(`${API_BASE_URL}/routes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(routeData),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Could not create route");
  return result;
}

export async function assignVehicleToRoute(routeId, vehicleId) {
  const response = await fetch(`${API_BASE_URL}/routes/${routeId}/vehicles`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Could not assign vehicle");
  return result;
}

export async function updateRoute(routeId, updates) {
  const response = await fetch(`${API_BASE_URL}/routes/${routeId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Could not update route");
  return result;
}

