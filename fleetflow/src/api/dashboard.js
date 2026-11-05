import { API_BASE_URL } from "./config";

export async function getDashboardSummary(range = "30", status = "all") {
  const params = new URLSearchParams({ range, status });
  const response = await fetch(
    `${API_BASE_URL}/dashboard/summary?${params}`,
    { credentials: "include" },
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Could not load dashboard data");
  }
  return result;
}
