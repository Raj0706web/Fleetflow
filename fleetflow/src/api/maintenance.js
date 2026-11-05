import { API_BASE_URL } from "./config";

async function parseResponse(response, fallbackMessage) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || fallbackMessage);
  return result;
}

export async function getMaintenanceRecords() {
  const response = await fetch(`${API_BASE_URL}/maintenance`, { credentials: "include" });
  return parseResponse(response, "Could not fetch maintenance records");
}

export async function createMaintenanceRecord(payload) {
  const response = await fetch(`${API_BASE_URL}/maintenance`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, "Could not create maintenance record");
}

export async function updateMaintenanceStatus(recordId, status) {
  const response = await fetch(`${API_BASE_URL}/maintenance/${recordId}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseResponse(response, "Could not update maintenance status");
}
