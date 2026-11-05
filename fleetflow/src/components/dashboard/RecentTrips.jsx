
import { ArrowUpRight } from 'lucide-react'
import { recentTrips } from '../../data/mockData'

const statusStyles = {
  'In Transit': 'bg-blue-50 text-blue-700 ring-blue-200',
  Assigned: 'bg-slate-100 text-slate-700 ring-slate-200',
  Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Delayed: 'bg-red-50 text-red-700 ring-red-200',
}

export default function RecentTrips() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h2 className="font-semibold text-slate-900">Recent Trips</h2>
          <p className="mt-1 text-xs text-slate-500">
            Latest fleet activity
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          View all <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Trip ID</th>
              <th className="px-5 py-3 font-medium">Route</th>
              <th className="px-5 py-3 font-medium">Driver</th>
              <th className="px-5 py-3 font-medium">Vehicle</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {recentTrips.map((trip) => (
              <tr key={trip.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-medium text-slate-800">
                  {trip.id}
                </td>
                <td className="px-5 py-4 text-slate-600">{trip.route}</td>
                <td className="px-5 py-4 text-slate-600">{trip.driver}</td>
                <td className="px-5 py-4 text-slate-600">{trip.vehicle}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      statusStyles[trip.status] ??
                      'bg-slate-100 text-slate-700 ring-slate-200'
                    }`}
                  >
                    {trip.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
