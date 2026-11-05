import { Bell, Search, Plus, ChevronDown, LogOut, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import QuickActionsPanel from "../dashboard/QuickActionsPanel";
import { useAuth } from "../auth/AuthContext";
import ProfileAvatar from "../auth/ProfileAvatar";
export default function Topbar() {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const { user, logout } = useAuth();
  const canUseQuickActions = user?.role === "Fleet / Operations Manager";
  const searchPlaceholder = user?.role === "Driver"
    ? "Search assigned trips..."
    : user?.role === "Viewer / Client"
      ? "Search your deliveries..."
      : "Search trips, vehicles, deliveries...";

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
    } catch (error) {
      setLogoutError(error.message);
    }
  }

  return (
    <>
      <header className="fixed left-[76px] right-0 top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
          <Search size={18} className="text-slate-400" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            aria-label="Search FleetFlow"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="ml-5 flex items-center gap-3">
          {canUseQuickActions && (
            <button
              type="button"
              title="Quick actions"
              aria-label="Quick actions"
              onClick={() => setQuickActionsOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              <Plus size={21} />
            </button>
          )}

          <button
            type="button"
            title="Notifications"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <Bell size={19} />
          </button>

          <div className="relative border-l border-slate-200 pl-4">
            <button
              type="button"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => setAccountOpen((open) => !open)}
              className="flex max-w-44 items-center gap-2 text-left"
            >
              <ProfileAvatar user={user} size="h-9 w-9" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">{user?.name || "Account"}</span>
                <span className="block truncate text-xs text-slate-500">{user?.role}</span>
              </span>
              <ChevronDown size={15} className="shrink-0 text-slate-400" />
            </button>
            {accountOpen && (
              <div role="menu" className="absolute right-0 top-12 z-40 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setAccountOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserRound size={16} /> My profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LogOut size={16} /> Sign out
                </button>
                {logoutError && <p role="alert" className="px-3 py-2 text-xs text-rose-600">{logoutError}</p>}
              </div>
            )}
          </div>
        </div>
      </header>
      {canUseQuickActions && quickActionsOpen && (
        <QuickActionsPanel onClose={() => setQuickActionsOpen(false)} />
      )}
    </>
  );
}
