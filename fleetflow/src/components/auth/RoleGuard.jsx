import { Navigate } from "react-router-dom";
import { useAuth, getLandingPath } from "./AuthContext";

export default function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();
  if (allowedRoles.includes(user?.role)) return children;
  return <Navigate to={getLandingPath(user?.role)} replace />;
}
