
const activity = [
  { day: 'Mon', value: 42 },
  { day: 'Tue', value: 58 },
  { day: 'Wed', value: 51 },
  { day: 'Thu', value: 73 },
  { day: 'Fri', value: 66 },
  { day: 'Sat', value: 86 },
  { day: 'Sun', value: 78 },
]

export default function ActivityChart() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Fleet Activity</h2>
          <p className="mt-1 text-xs text-slate-500">
            Illustrative trips completed per day
          </p>
        </div>
        <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">
          This week
        </span>
      </div>

      <div className="mt-7 flex h-44 items-end gap-3">
        {activity.map((item) => (
          <div
            key={item.day}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              title={`${item.value} illustrative trips`}
              className="w-full max-w-10 rounded-t-md bg-blue-500 transition-colors hover:bg-blue-700"
              style={{ height: `${item.value}%` }}
            />
            <span className="text-xs text-slate-500">{item.day}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
