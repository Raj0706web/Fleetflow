import {
  ClipboardList,
  GitFork,
  PackagePlus,
  Route,
  Truck,
  UsersRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  {
    label: "Add cargo",
    description: "Create a delivery record",
    path: "/add-cargo",
    icon: PackagePlus,
  },
  {
    label: "Plan a route",
    description: "Create or update a route",
    path: "/routes",
    icon: GitFork,
  },
  {
    label: "Assign a trip",
    description: "Assign a driver and vehicle",
    path: "/trips",
    icon: Route,
  },
  {
    label: "Add a vehicle",
    description: "Register a fleet vehicle",
    path: "/vehicles",
    icon: Truck,
  },
  {
    label: "Manage drivers",
    description: "Add or update driver records",
    path: "/drivers",
    icon: UsersRound,
  },
  {
    label: "View deliveries",
    description: "Review delivery records",
    path: "/deliveries",
    icon: ClipboardList,
  },
];

export default function QuickActionsPanel({ onClose }) {
  return (
    <div className="fixed inset-x-0 bottom-0 top-[72px] z-40">
      <button
        type="button"
        aria-label="Close quick actions"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <section
        aria-label="Quick actions"
        className="absolute bottom-0 right-0 top-0 w-full max-w-[410px] overflow-y-auto bg-white p-4 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Quick actions
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Jump to a common operations task.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close quick actions"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ label, description, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className="group flex min-h-36 flex-col items-center justify-center rounded-xl border border-slate-200 p-4 text-center transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-white">
                <Icon size={24} strokeWidth={1.8} />
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {label}
              </span>
              <span className="mt-1 text-xs leading-4 text-slate-500">
                {description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
