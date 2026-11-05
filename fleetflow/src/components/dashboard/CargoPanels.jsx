import Panel from "./Panel";

const unloadingCargo = [
  { id: "SHIPID03", from: "Mumbai", to: "Delhi", status: "Delivered" },
  { id: "SHIPID04", from: "Kolkata", to: "Patna", status: "Delivered" },
  { id: "SHIPID05", from: "Delhi", to: "Jaipur", status: "Cancelled" },
  { id: "SHIPID06", from: "Patna", to: "Ranchi", status: "Delivered" },
  { id: "SHIPID07", from: "Mumbai", to: "Pune", status: "Delivered" },
];

const availableCargo = [
  { id: "SHIPID03", progress: 40, from: "Mumbai", to: "Delhi" },
  { id: "SHIPID04", progress: 80, from: "Kolkata", to: "Patna" },
  { id: "SHIPID05", progress: 20, from: "Delhi", to: "Jaipur" },
  { id: "SHIPID06", progress: 40, from: "Patna", to: "Ranchi" },
  { id: "SHIPID07", progress: 40, from: "Mumbai", to: "Pune" },
];

function StatusBadge({ status }) {
  const styles = {
    Delivered: "border-blue-200 bg-blue-50 text-blue-700",
    Cancelled: "border-red-200 bg-red-50 text-red-600",
    Active: "border-green-200 bg-green-50 text-green-700",
  };
  return <span className={`inline-flex whitespace-nowrap rounded border px-2 py-1 text-xs ${styles[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>{status}</span>;
}

function PanelTitleAction() {
  return <button type="button" className="text-sm font-medium text-blue-600 hover:text-blue-800">View All</button>;
}

function UnloadingCargo() {
  return (
    <Panel title="Unloading Cargo" action={<PanelTitleAction />} className="h-full w-full">
      <div className="flex h-full flex-col divide-y divide-slate-100">
        {unloadingCargo.map((cargo) => (
          <div key={cargo.id} className="grid flex-1 grid-cols-[1fr_1.4fr_auto] items-center gap-2 px-4 py-3 text-xs sm:grid-cols-[1fr_1.6fr_auto_auto]">
            <span className="text-slate-600">{cargo.id}</span>
            <div className="flex min-w-0 items-center gap-2 text-slate-500">
              <span className="truncate">{cargo.from}</span><span className="text-blue-500">╌→</span><span className="truncate text-slate-800">{cargo.to}</span>
            </div>
            <StatusBadge status={cargo.status} />
            <span className="hidden whitespace-nowrap text-slate-500 sm:block">28 Oct 2026</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AvailableCargo() {
  return (
    <Panel title="Available Cargo" action={<PanelTitleAction />} className="h-full w-full">
      <div className="flex h-full flex-col divide-y divide-slate-100">
        {availableCargo.map((cargo) => (
          <div key={cargo.id} className="grid flex-1 grid-cols-[auto_minmax(55px,1fr)_auto] items-center gap-3 px-4 py-4 text-xs sm:grid-cols-[auto_minmax(55px,1fr)_auto]">
            <span className="text-slate-600">{cargo.id}</span>
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${cargo.progress}%` }} /></div>
              <span className="font-semibold text-blue-700">{cargo.progress}%</span>
            </div>
            <div className="hidden items-center gap-1 whitespace-nowrap text-slate-600 lg:flex">{cargo.from}<span className="text-blue-500">⟶</span>{cargo.to}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function CargoPanels() {
  return (
    <div className="col-span-1 grid min-w-0 grid-cols-1 items-stretch gap-4 sm:col-span-2 sm:grid-cols-2">
      <div className="flex min-w-0"><UnloadingCargo /></div>
      <div className="flex min-w-0"><AvailableCargo /></div>
    </div>
  );
}
