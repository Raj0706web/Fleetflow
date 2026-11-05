const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const isProduction = import.meta.env.PROD;

// In production, call the API through Vercel's same-origin rewrite. This keeps
// the httpOnly session cookie first-party in browsers that restrict third-party cookies.
export const API_BASE_URL = isProduction
  ? "/api"
  : (configuredApiBase || "http://localhost:5000/api").replace(/\/+$/, "");

const appOrigin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
export const API_ORIGIN = new URL(API_BASE_URL, appOrigin).origin;
