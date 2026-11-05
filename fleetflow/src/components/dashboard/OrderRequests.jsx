import { Box, FileCheck2, History, MapPin, Search } from "lucide-react";

const requests = [
  {
    id: "ORDERID101",
    customer: "Raj Industries",
    pickup: "41 Sector 15, Delhi",
    destination: "C6, Shah Colony, Mumbai",
    date: "28 Oct 2026, 18:00",
  },
  {
    id: "ORDERID102",
    customer: "Metro Supplies",
    pickup: "Salt Lake, Kolkata",
    destination: "Boring Road, Patna",
    date: "29 Oct 2026, 09:30",
  },
  {
    id: "ORDERID103",
    customer: "Northstar Retail",
    pickup: "Gurugram, Haryana",
    destination: "Jaipur, Rajasthan",
    date: "29 Oct 2026, 14:00",
  },
  {
    id: "ORDERID104",
    customer: "Eastern Logistics",
    pickup: "Howrah, Kolkata",
    destination: "Ranchi, Jharkhand",
    date: "30 Oct 2026, 11:00",
  },
];

function Panel({ title, action, children, className = "" }) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`}
    >
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="flex min-w-0 flex-1 items-center justify-between gap-3 text-base font-semibold text-slate-800">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function OrderRequestCard({ request }) {
  return (
    <article className="overflow-hidden rounded-xl border border-rose-100 bg-rose-50 shadow-sm shadow-rose-100/50">
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-rose-200 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md bg-white p-1.5 text-blue-600 shadow-sm">
            <Box size={19} />
          </span>
          <span className="truncate text-xs font-medium text-slate-800">
            {request.id}
          </span>
        </div>
        <span className="whitespace-nowrap text-[10px] text-slate-600">
          {request.date}
        </span>
      </div>

      <div className="flex items-center gap-3 px-3 py-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex gap-2">
            <MapPin size={14} className="mt-0.5 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Pickup Location</p>
              <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-800">
                {request.pickup}
              </p>
            </div>
          </div>

          <div className="relative flex gap-2">
            <span className="absolute left-[5px] top-[-17px] h-[21px] border-l border-dashed border-blue-300" />
            <MapPin size={14} className="mt-0.5 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Destination</p>
              <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-800">
                {request.destination}
              </p>
            </div>
          </div>
        </div>

        <div className="relative hidden h-[92px] w-[92px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-[#eaf2e8] sm:block">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                "linear-gradient(30deg, transparent 46%, #fff 47%, #fff 50%, transparent 51%), linear-gradient(120deg, transparent 42%, #fff 43%, #fff 46%, transparent 47%), linear-gradient(0deg, transparent 63%, #d8e7d4 64%, #d8e7d4 72%, transparent 73%)",
              backgroundSize: "42px 42px, 54px 54px, 100% 100%",
            }}
          />
          <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-blue-600 shadow ring-1 ring-slate-200">
            <MapPin size={17} />
          </div>
          <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1 text-[7px] text-slate-500">
            Map preview
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-dashed border-rose-200 bg-rose-100/50 px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold text-slate-800">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-emerald-700 bg-white text-[10px] font-bold italic text-violet-500">
            RI
          </span>
          {request.customer}
        </span>
        <button
          type="button"
          className="whitespace-nowrap text-xs font-medium text-blue-600 hover:text-blue-800"
          onClick={() => window.alert(`Selected ${request.id}`)}
        >
          View Details
        </button>
      </div>
    </article>
  );
}

export default function OrderRequests() {
  return (
    <Panel
      title={
        <>
          <span className="shrink-0">Order Requests</span>
          <label className="flex min-w-0 max-w-[220px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-400 shadow-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={15} className="shrink-0" />
            <input
              aria-label="Search order requests"
              placeholder="Search by order id, date..."
              className="min-w-0 w-full bg-transparent text-xs font-normal outline-none placeholder:text-slate-400"
            />
          </label>
        </>
      }
      className="flex w-full flex-col self-start xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="text-sm text-slate-500">Recent Order Requests</span>
        <div className="flex gap-2 text-slate-500">
          <button
            type="button"
            aria-label="Filter order requests"
            className="rounded-md border border-slate-200 bg-slate-50 p-1.5 hover:bg-slate-100"
          >
            <FileCheck2 size={17} />
          </button>
          <button
            type="button"
            aria-label="Order request history"
            className="rounded-md p-1.5 hover:bg-slate-100"
          >
            <History size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto p-3">
        {requests.map((request) => (
          <OrderRequestCard key={request.id} request={request} />
        ))}
      </div>
    </Panel>
  );
}
