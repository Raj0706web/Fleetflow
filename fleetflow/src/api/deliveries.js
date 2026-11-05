import { API_BASE_URL } from "./config";

export async function createDelivery(deliveryData) {
  const response = await fetch(`${API_BASE_URL}/deliveries`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deliveryData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not create delivery");
  }

  return result;
}
export async function getDeliveries() {
  const response = await fetch(`${API_BASE_URL}/deliveries`, {
    credentials: "include",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Could not fetch deliveries");
  }

  return result;
}

export async function updateDeliveryWeight(deliveryId, weightKg) {
  const response = await fetch(`${API_BASE_URL}/deliveries/${encodeURIComponent(deliveryId)}/weight`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weightKg }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Could not update package weight");
  return result;
}
