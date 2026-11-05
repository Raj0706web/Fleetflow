
import { Truck, CheckCircle2, Route, ClockAlert } from 'lucide-react'
import FleetFlowWordmark from '../brand/FleetFlowWordmark'

const icons = {
  'Total Vehicles': Truck,
  'Available Vehicles': CheckCircle2,
  'Active Trips': Route,
  'Delayed Deliveries': ClockAlert,
}

export default function StatCard({ label, value, note }) {
  const Icon = icons[label] ?? Truck

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon size={21} />
        </div>
        <FleetFlowWordmark className="text-xs" />
      </div>

      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </section>
  )
}
