import { API_BASE_URL } from "./config";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Driver request failed");
  }

  return result;
}

export async function getDrivers() {
  const result = await request("/drivers");
  return result.drivers;
}

export async function getMyDriverRecord() {
  const result = await request("/drivers/me");
  return result.driver;
}

export async function getAvailableDriverAccounts() {
  const result = await request("/drivers/available-accounts");
  return result.accounts;
}

export async function createDriver(driverData) {
  const result = await request("/drivers", {
    method: "POST",
    body: JSON.stringify(driverData),
  });

  return result.driver;
}

export async function updateDriver(driverId, updates) {
  const result = await request(
    `/drivers/${encodeURIComponent(driverId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );

  return result.driver;
}

export async function deactivateDriver(driverId) {
  const result = await request(
    `/drivers/${encodeURIComponent(driverId)}/deactivate`,
    { method: "PATCH" },
  );

  return result.driver;
}

export async function reactivateDriver(driverId) {
  const result = await request(
    `/drivers/${encodeURIComponent(driverId)}/activate`,
    { method: "PATCH" },
  );

  return result.driver;
}
