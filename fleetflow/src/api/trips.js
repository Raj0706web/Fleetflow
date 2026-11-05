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
    throw new Error(result.message || "Trip request failed");
  }

  return result;
}

export async function getMyTrips() {
  const result = await request("/trips/my");
  return result.trips;
}

export async function getMyTripHistory() {
  const result = await request("/trips/my/history");
  return result.trips;
}

export async function getTrips() {
  const result = await request("/trips");
  return result.trips;
}

export async function createTrip(tripData) {
  const result = await request("/trips", {
    method: "POST",
    body: JSON.stringify(tripData),
  });

  return result.trip;
}

export async function updateTripStatus(tripId, status, note = "") {
  const result = await request(`/trips/${encodeURIComponent(tripId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });

  return result.trip;
}

export async function updateTripLocation(tripId, coordinates, source = "device") {
  const result = await request(`/trips/${encodeURIComponent(tripId)}/location`, {
    method: "POST",
    body: JSON.stringify({ ...coordinates, source }),
  });
  return result.trip;
}

export async function updateTripDeliveryStatus(
  tripId,
  deliveryId,
  status,
  note = "",
) {
  const result = await request(
    `/trips/${encodeURIComponent(tripId)}/deliveries/${encodeURIComponent(deliveryId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, note }),
    },
  );

  return result.trip;
}
