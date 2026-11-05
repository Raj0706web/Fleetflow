
import { NavLink } from 'react-router-dom'
import FleetFlowMark from '../brand/FleetFlowMark'
import { getLandingPath, useAuth } from '../auth/AuthContext'
import { roleNavigation } from './roleNavigation'

export default function Sidebar() {
  const { user } = useAuth()
  const visibleNavigation = roleNavigation[user?.role] ?? []

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[76px] flex-col items-center border-r border-slate-200 bg-white py-5">
      <NavLink
        to={getLandingPath(user?.role)}
        aria-label="FleetFlow home"
        className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white"
      >
        <FleetFlowMark inverse className="h-8 w-8" />
      </NavLink>

      <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" aria-label="Main navigation">
        {visibleNavigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            title={label}
            aria-label={label}
            end
            className={({ isActive }) =>
              `flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon size={21} strokeWidth={1.8} />
          </NavLink>
        ))}
      </nav>

      <div
        title="FleetFlow UI prototype"
        className="mt-4 text-[10px] font-semibold tracking-wide text-slate-400"
      >
        V1.0
      </div>
    </aside>
  )
}
