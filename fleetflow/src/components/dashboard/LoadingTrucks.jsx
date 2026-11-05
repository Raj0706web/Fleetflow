import { useState } from "react";
import Panel from "./Panel";

const truckStatuses = [
  { label: "Active", value: 40, color: "#0B216F" },
  { label: "Ready to Load", value: 12, color: "#0645C0" },
  { label: "Ready to Unload", value: 3, color: "#1677FF" },
  { label: "Loading Delayed", value: 23, color: "#388BFF" },
  { label: "Unloading Delayed", value: 12, color: "#60A5FA" },
  { label: "Cancelled", value: 3, color: "#EF4444" },
];

function polarToCartesian(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function describeArc(startAngle, endAngle) {
  const outerStart = polarToCartesian(120, 120, 100, startAngle);
  const outerEnd = polarToCartesian(120, 120, 100, endAngle);
  const innerEnd = polarToCartesian(120, 120, 72, endAngle);
  const innerStart = polarToCartesian(120, 120, 72, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A 100 100 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A 72 72 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export default function LoadingTrucks() {
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const total = truckStatuses.reduce((sum, status) => sum + status.value, 0);
  const segments = truckStatuses.reduce((acc, status) => {
    const startAngle = acc.length ? acc[acc.length - 1].endAngle : 0;
    const endAngle = startAngle + (status.value / total) * 360;
    return [...acc, { ...status, startAngle, endAngle }];
  }, []);
  const selectedStatus = truckStatuses.find((status) => status.label === hoveredStatus);

  return (
    <Panel
      title="Loading Trucks"
      action={<button type="button" className="text-sm font-medium text-blue-600 hover:text-blue-800">View All</button>}
      className="h-full min-h-[350px]"
    >
      <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-[minmax(145px,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 240 240" className="w-full max-w-[260px]" role="img" aria-label="Truck status distribution" onMouseLeave={() => setHoveredStatus(null)}>
            {segments.map((segment) => {
              const isActive = hoveredStatus === segment.label;
              return <path key={segment.label} d={describeArc(segment.startAngle, segment.endAngle)} fill={segment.color} stroke="white" strokeWidth={isActive ? 3 : 1} opacity={hoveredStatus && !isActive ? 0.4 : 1} className="cursor-pointer transition-all duration-150" onMouseEnter={() => setHoveredStatus(segment.label)} />;
            })}
            <circle cx="120" cy="120" r="68" fill="white" />
            <text x="120" y={selectedStatus ? "114" : "113"} textAnchor="middle" fontSize={selectedStatus ? "15" : "25"} fontWeight="600" fill={selectedStatus?.color ?? "#0F172A"}>{selectedStatus ? selectedStatus.value : total}</text>
            <text x="120" y="137" textAnchor="middle" fontSize={selectedStatus ? "10" : "12"} fill="#64748B">{selectedStatus ? selectedStatus.label : "Total Trucks"}</text>
          </svg>
        </div>

        <div className="grid grid-cols-2 content-center gap-x-3 gap-y-4">
          {truckStatuses.map((status) => {
            const isActive = hoveredStatus === status.label;
            return (
              <button key={status.label} type="button" onMouseEnter={() => setHoveredStatus(status.label)} onMouseLeave={() => setHoveredStatus(null)} onFocus={() => setHoveredStatus(status.label)} onBlur={() => setHoveredStatus(null)} className="min-w-0 border-l-[3px] py-1 pl-2.5 text-left transition-colors" style={{ borderColor: status.color, backgroundColor: isActive ? "#F8FAFC" : "transparent", opacity: hoveredStatus && !isActive ? 0.55 : 1 }}>
                <p className="text-xs leading-4 text-slate-500">{status.label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">{status.value}</p>
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
