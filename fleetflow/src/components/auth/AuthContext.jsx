import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside StartupGate");
  return context;
}

export function getLandingPath(role) {
  if (role === "Administrator") return "/admin";
  if (role === "Driver") return "/driver";
  if (role === "Viewer / Client") return "/client";
  return "/dashboard";
}
