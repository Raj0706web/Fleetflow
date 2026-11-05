import { API_BASE_URL } from "./config";

export async function getSetupStatus() {
  const response = await fetch(`${API_BASE_URL}/auth/setup-status`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not check setup status");
  }

  return result;
}

export async function setupAdmin(adminData) {
  const response = await fetch(`${API_BASE_URL}/auth/setup-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not create administrator");
  }

  return result;
}
export async function getCurrentUser() {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include",
  });

  if (response.status === 401) return null;

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not restore your session");
  }

  return result.user;
}

export async function updateMyProfile(profile) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Could not update your profile");
  }

  return result;
}

export async function login(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not log in");
  }

  return result.user;
}

export async function registerClient(accountData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(accountData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not create client account");
  }

  return result;
}

export async function logout() {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not log out");
  }
}
