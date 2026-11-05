import { API_BASE_URL } from "./config";

async function readResponse(response, fallbackMessage) {
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

export async function getUsers() {
  const response = await fetch(`${API_BASE_URL}/users`, {
    credentials: "include",
  });

  return readResponse(response, "Could not fetch users");
}

export async function createUser(userData) {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  return readResponse(response, "Could not create user");
}

export async function updateUserRole(userId, role) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });

  return readResponse(response, "Could not update user role");
}

export async function resetUserPassword(userId, password) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  return readResponse(response, "Could not reset user password");
}
