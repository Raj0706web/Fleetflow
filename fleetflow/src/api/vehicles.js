import { API_BASE_URL } from "./config";

export async function getVehicles() {
  const response = await fetch(`${API_BASE_URL}/vehicles`, {
    credentials: "include",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Could not fetch vehicles");
  return result;
}

export async function createVehicle(vehicleData) {
  const response = await fetch(`${API_BASE_URL}/vehicles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(vehicleData),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Could not create vehicle");
  }

  return result;
}

export async function updateVehicle(vehicleId, updates) {
  const response = await fetch(
    `${API_BASE_URL}/vehicles/${vehicleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Could not update vehicle");
  }

  return result.vehicle;
}
