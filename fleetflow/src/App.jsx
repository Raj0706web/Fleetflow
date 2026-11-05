import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import AddCargo from "./pages/AddCargo";
import Deliveries from "./pages/Deliveries";
import Tracking from "./pages/Tracking";
import RoutePlanning from "./pages/RoutePlanning";
import StartupGate from "./components/auth/StartupGate";
import RoleGuard from "./components/auth/RoleGuard";
import AdministratorHome from "./pages/AdministratorHome";
import AdminDashboard from "./pages/AdminDashboard";
import MyProfile from "./pages/MyProfile";
import Drivers from "./pages/Drivers";
import { getLandingPath, useAuth } from "./components/auth/AuthContext";
import DriverProfile from "./pages/DriverProfile";
import Vehicles from "./pages/Vehicles";
import {
  ClientHome,
  DriverHome,
  RoleModulePlaceholder,
} from "./pages/RoleWorkspaces";
import Trips from "./pages/Trips";
import DriverTripHistory from "./pages/DriverTripHistory";
import LoadOptimization from "./pages/LoadOptimization";
import FuelLogs from "./pages/FuelLogs";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import OperationsSettings from "./pages/OperationsSettings";
import AdminFleetOverview from "./pages/AdminFleetOverview";
import AdminSystemSettings from "./pages/AdminSystemSettings";

const managementRoles = ["Administrator", "Fleet / Operations Manager"];
function LandingRedirect() {
  const { user } = useAuth();
  return <Navigate to={getLandingPath(user?.role)} replace />;
}

export default function App() {
  return (
    <StartupGate>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<LandingRedirect />} />
          <Route
            path="/profile"
            element={
              <RoleGuard
                allowedRoles={[
                  "Administrator",
                  "Fleet / Operations Manager",
                  "Driver",
                  "Viewer / Client",
                ]}
              >
                <MyProfile />
              </RoleGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleGuard allowedRoles={["Administrator"]}>
                <AdminDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RoleGuard allowedRoles={["Administrator"]}>
                <AdministratorHome />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/fleet"
            element={
              <RoleGuard allowedRoles={["Administrator"]}>
                <AdminFleetOverview />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RoleGuard allowedRoles={["Administrator"]}>
                <Reports />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RoleGuard allowedRoles={["Administrator"]}>
                <AdminSystemSettings />
              </RoleGuard>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <Dashboard />
              </RoleGuard>
            }
          />
          <Route
            path="/tracking"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <Tracking />
              </RoleGuard>
            }
          />
          <Route
            path="/routes"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <RoutePlanning />
              </RoleGuard>
            }
          />
          <Route
            path="/deliveries"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <Deliveries />
              </RoleGuard>
            }
          />
          <Route
            path="/trips"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <Trips />
              </RoleGuard>
            }
          />
          <Route
            path="/vehicles"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <Vehicles />
              </RoleGuard>
            }
          />
          <Route
            path="/load-optimization"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <LoadOptimization />
              </RoleGuard>
            }
          />
          <Route
            path="/fuel-logs"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <FuelLogs />
              </RoleGuard>
            }
          />
          <Route
            path="/maintenance"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <Maintenance />
              </RoleGuard>
            }
          />
          <Route
            path="/drivers"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <Drivers />
              </RoleGuard>
            }
          />
          <Route
            path="/reports"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <Reports />
              </RoleGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <OperationsSettings />
              </RoleGuard>
            }
          />
          <Route
            path="/add-cargo"
            element={
              <RoleGuard allowedRoles={managementRoles}>
                <AddCargo />
              </RoleGuard>
            }
          />
          <Route
            path="/driver"
            element={
              <RoleGuard allowedRoles={["Driver"]}>
                <DriverHome />
              </RoleGuard>
            }
          />
          <Route
            path="/driver/history"
            element={
              <RoleGuard allowedRoles={["Driver"]}>
                <DriverTripHistory />
              </RoleGuard>
            }
          />
          <Route
            path="/driver/profile"
            element={
              <RoleGuard allowedRoles={["Driver"]}>
                <DriverProfile />
              </RoleGuard>
            }
          />
          <Route
            path="/client"
            element={
              <RoleGuard allowedRoles={["Viewer / Client"]}>
                <ClientHome />
              </RoleGuard>
            }
          />
          <Route
            path="/client/track"
            element={
              <RoleGuard allowedRoles={["Viewer / Client"]}>
                <RoleModulePlaceholder
                  title="Track a delivery"
                  description="View the latest permitted status and estimated progress for your delivery."
                />
              </RoleGuard>
            }
          />
          <Route
            path="/client/account"
            element={
              <RoleGuard allowedRoles={["Viewer / Client"]}>
                <RoleModulePlaceholder
                  title="Client account"
                  description="Review your account details and delivery access."
                />
              </RoleGuard>
            }
          />
          <Route path="*" element={<LandingRedirect />} />
        </Route>
      </Routes>
    </StartupGate>
  );
}
