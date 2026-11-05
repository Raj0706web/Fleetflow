import { API_BASE_URL } from "./config";

async function requestPreferences(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Operations preferences request failed");
  return result;
}

export async function getOperationsPreferences() {
  const result = await requestPreferences("/users/me/preferences");
  return result.preferences;
}

export async function saveOperationsPreferences(preferences) {
  const result = await requestPreferences("/users/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });
  return result.preferences;
}
