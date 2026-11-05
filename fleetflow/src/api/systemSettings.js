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
  if (!response.ok) throw new Error(result.message || "System settings request failed");
  return result;
}

export async function getSystemSettings() {
  const result = await request("/settings/system");
  return result.settings;
}

export async function getPublicRegistrationStatus() {
  const result = await request("/settings/public");
  return result.allowClientRegistration;
}

export async function saveSystemSettings(settings) {
  const result = await request("/settings/system", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
  return result.settings;
}
