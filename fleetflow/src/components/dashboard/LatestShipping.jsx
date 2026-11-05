import Panel from "./Panel";

const shippingRows = [
  { id: "ORDERID01", status: "Delivered", customer: "Raj Industries", from: "Delhi", weight: "250 KG", to: "Mumbai", date: "28 Oct 2026" },
  { id: "ORDERID02", status: "Cancelled", customer: "Eastern Logistics", from: "Kolkata", weight: "180 KG", to: "Patna", date: "28 Oct 2026" },
  { id: "ORDERID03", status: "Active", customer: "Northstar Retail", from: "Delhi", weight: "320 KG", to: "Jaipur", date: "29 Oct 2026" },
  { id: "ORDERID04", status: "Delivered", customer: "Raj Industries", from: "Patna", weight: "250 KG", to: "Ranchi", date: "29 Oct 2026" },
  { id: "ORDERID05", status: "Delivered", customer: "Metro Supplies", from: "Mumbai", weight: "140 KG", to: "Pune", date: "30 Oct 2026" },
  { id: "ORDERID06", status: "Active", customer: "Eastern Logistics", from: "Kolkata", weight: "210 KG", to: "Delhi", date: "30 Oct 2026" },
];

function StatusBadge({ status }) {
  const styles = {
    Delivered: "border-blue-200 bg-blue-50 text-blue-700",
    Cancelled: "border-red-200 bg-red-50 text-red-600",
    Active: "border-green-200 bg-green-50 text-green-700",
  };
  return <span className={`inline-flex whitespace-nowrap rounded border px-2 py-1 text-xs ${styles[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>{status}</span>;
}

export default function LatestShipping() {
  return (
    <Panel
      title="Latest Shipping"
      action={<button type="button" className="text-sm font-medium text-blue-600 hover:text-blue-800">View All</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium uppercase text-slate-500">
              {["Order ID", "Status", "Customer", "Departure", "Weight", "Arrival", "Arrival Date"].map((heading) => <th key={heading} className="px-3 py-3.5 font-medium first:pl-5">{heading}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shippingRows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-3.5 pl-5 text-slate-700">{row.id}</td>
                <td className="px-3 py-3.5"><StatusBadge status={row.status} /></td>
                <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{row.customer}</td>
                <td className="px-3 py-3.5 text-slate-700">{row.from}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{row.weight}</td>
                <td className="px-3 py-3.5 text-slate-700">{row.to}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-slate-700">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
