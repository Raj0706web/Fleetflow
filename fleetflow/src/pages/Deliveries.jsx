import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDeliveries, updateDeliveryWeight } from "../api/deliveries";

const statusStyles = {
  Planned: "bg-slate-100 text-slate-700",
  Assigned: "bg-blue-50 text-blue-700",
  "Picked Up": "bg-amber-50 text-amber-700",
  "In Transit": "bg-indigo-50 text-indigo-700",
  Delivered: "bg-green-50 text-green-700",
  Failed: "bg-red-50 text-red-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString();
}

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weightEditId, setWeightEditId] = useState("");
  const [weightSavingId, setWeightSavingId] = useState("");
  const [weightError, setWeightError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDeliveries() {
      try {
        const data = await getDeliveries();
        if (isMounted) setDeliveries(data);
      } catch (requestError) {
        if (isMounted) setError(requestError.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDeliveries();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleWeightSubmit(event, delivery) {
    event.preventDefault();
    const weightKg = Number(new FormData(event.currentTarget).get("weightKg"));
    setWeightSavingId(delivery._id);
    setWeightError("");
    try {
      const updated = await updateDeliveryWeight(delivery._id, weightKg);
      setDeliveries((current) => current.map((item) => item._id === updated._id ? updated : item));
      setWeightEditId("");
    } catch (requestError) {
      setWeightError(requestError.message);
    } finally {
      setWeightSavingId("");
    }
  }

  return (
    <main className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Deliveries</h1>
          <p className="mt-1 text-sm text-slate-500">
            View and manage delivery orders.
          </p>
        </div>

        <Link
          to="/add-cargo"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add Cargo
        </Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {weightError && <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{weightError}</p>}
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading deliveries...</p>
        ) : error ? (
          <p role="alert" className="p-6 text-sm text-red-600">
            Could not load deliveries: {error}
          </p>
        ) : deliveries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-800">No deliveries yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create a delivery to see it listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 text-right font-medium">Weight</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Delivery window</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {deliveries.map((delivery) => (
                  <tr key={delivery._id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800">
                      {delivery.reference}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>{delivery.pickup}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        to {delivery.destination}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div>{delivery.recipientName}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {delivery.recipientPhone}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {delivery.priority}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-slate-600">
                      {weightEditId === delivery._id ? <form onSubmit={(event) => handleWeightSubmit(event, delivery)} className="flex items-center justify-end gap-1.5">
                        <input aria-label={`Package weight in kilograms for ${delivery.reference}`} name="weightKg" type="number" required min="0.01" step="0.01" defaultValue={delivery.weightKg ?? ""} className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-right text-xs outline-none focus:border-blue-500" />
                        <button type="submit" disabled={weightSavingId === delivery._id} className="rounded-md bg-blue-600 px-2 py-1.5 text-[10px] font-medium text-white disabled:opacity-50">{weightSavingId === delivery._id ? "Saving…" : "Save"}</button>
                        <button type="button" disabled={weightSavingId === delivery._id} onClick={() => setWeightEditId("")} className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px] text-slate-600">Cancel</button>
                      </form> : <span className="inline-flex items-center justify-end gap-2">
                        <span>{delivery.weightKg == null ? <span className="text-amber-700">Needed</span> : `${Number(delivery.weightKg).toLocaleString("en-IN")} kg`}</span>
                        {delivery.status === "Planned" && <button type="button" onClick={() => { setWeightError(""); setWeightEditId(delivery._id); }} className="text-[10px] font-medium text-blue-700 hover:underline">{delivery.weightKg == null ? "Add" : "Edit"}</button>}
                      </span>}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusStyles[delivery.status] ??
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {delivery.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                      <div>{formatDate(delivery.deliveryWindowStart)}</div>
                      <div className="mt-1 text-slate-400">
                        to {formatDate(delivery.deliveryWindowEnd)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
