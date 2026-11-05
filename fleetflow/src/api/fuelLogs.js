import { API_BASE_URL } from "./config";

async function parseResponse(response, fallbackMessage) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || fallbackMessage);
  return result;
}

export async function getFuelLogs() {
  const response = await fetch(`${API_BASE_URL}/fuel-logs`, { credentials: "include" });
  return parseResponse(response, "Could not fetch fuel logs");
}

export async function createFuelLog(payload) {
  const response = await fetch(`${API_BASE_URL}/fuel-logs`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, "Could not create fuel log");
}
