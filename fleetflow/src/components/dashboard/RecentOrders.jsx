import { FileCheck2 } from "lucide-react";
import Panel from "./Panel";

const orderMetrics = [
  { label: "Active Orders", value: 720 },
  { label: "Pending Requests", value: 120 },
  { label: "Accepted", value: 450 },
];

export default function RecentOrders() {
  return (
    <Panel
      title="Recent Orders"
      action={
        <select
          aria-label="Filter recent orders by month"
          defaultValue="October"
          className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-700 outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option>October</option>
          <option>September</option>
          <option>August</option>
          <option>Last 6 Months</option>
        </select>
      }
      className="h-full min-h-[350px]"
    >
      <div className="grid grid-cols-[minmax(115px,0.8fr)_minmax(0,1.2fr)] gap-3 p-4">
        <div className="space-y-5">
          {orderMetrics.map((metric) => (
            <div key={metric.label} className="flex items-start gap-2">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <FileCheck2 size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{metric.label}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-800">
                  {metric.value.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          <div>
            <p className="text-[11px] text-slate-400">Compared with last month</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">↗ 40%</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center rounded-lg border border-slate-100 p-1">
          <svg viewBox="0 0 240 180" role="img" aria-label="Illustrative recent orders trend chart" className="h-auto w-full">
            {[30, 65, 100, 135].map((y) => <line key={y} x1="32" y1={y} x2="232" y2={y} stroke="#E9EDF3" strokeWidth="1" />)}
            {[0, 50, 100, 150, 200].map((value, index) => (
              <text key={value} x="25" y={139 - index * 27} textAnchor="end" fill="#94A3B8" fontSize="9">{value}</text>
            ))}
            <path d="M32 137 L45 126 L58 126 L72 110 L85 104 L98 91 L112 86 L126 76 L140 71 L154 53 L168 47 L182 42 L196 28 L210 23 L232 15 L232 150 L32 150 Z" fill="#60A5FA" opacity="0.18" />
            <path d="M32 137 L45 126 L58 126 L72 110 L85 104 L98 91 L112 86 L126 76 L140 71 L154 53 L168 47 L182 42 L196 28 L210 23 L232 15" fill="none" stroke="#3287F6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <text x="32" y="166" fill="#94A3B8" fontSize="9">01</text>
            <text x="91" y="166" fill="#94A3B8" fontSize="9">10</text>
            <text x="151" y="166" fill="#94A3B8" fontSize="9">20</text>
            <text x="220" y="166" fill="#94A3B8" fontSize="9">30</text>
          </svg>
        </div>
      </div>
    </Panel>
  );
}
