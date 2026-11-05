const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (
  configuredApiBase || "http://localhost:5000/api"
).replace(/\/+$/, "");

export const API_ORIGIN = new URL(API_BASE_URL).origin;
