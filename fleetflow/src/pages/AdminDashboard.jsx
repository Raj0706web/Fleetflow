import { ArrowRight, BarChart3, Settings, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/auth/AuthContext";

const adminAreas = [
  {
    title: "Users & roles",
    description: "Create team accounts and manage access across FleetFlow.",
    path: "/admin/users",
    icon: Users,
    label: "Manage accounts",
  },
  {
    title: "Fleet overview",
    description: "Review vehicles, drivers, deliveries, and active operations.",
    path: "/admin/fleet",
    icon: ShieldCheck,
    label: "Open fleet overview",
  },
  {
    title: "Reports",
    description: "View fleet-wide performance and operational summaries.",
    path: "/admin/reports",
    icon: BarChart3,
    label: "Open reports",
  },
  {
    title: "System settings",
    description: "Configure workspace preferences and security options.",
    path: "/admin/settings",
    icon: Settings,
    label: "Open settings",
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <main className="min-h-full bg-slate-50 p-3 sm:p-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
        <div aria-hidden="true" className="absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-28 right-28 h-48 w-48 rounded-full bg-blue-400/10" />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-sm font-medium text-blue-200">
            <ShieldCheck size={16} /> Administrator workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome, {user?.name?.split(" ")[0] || "Administrator"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
            Manage access, review fleet-wide information, and configure your FleetFlow workspace.
          </p>
        </div>
      </section>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Administration</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Workspace controls</h2>
        </div>
        <span className="hidden text-sm text-slate-500 sm:block">Choose an area to manage</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adminAreas.map(({ title, description, path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className="group flex min-h-52 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Icon size={21} strokeWidth={1.8} />
            </span>
            <h3 className="mt-5 font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 flex-1 text-sm leading-5 text-slate-500">{description}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
              {label}<ArrowRight size={15} className="transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
