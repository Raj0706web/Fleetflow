import { ArrowLeft, PackagePlus, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { createDelivery } from "../api/deliveries";
const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function AddCargo() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const windowRangeInvalid =
    windowStart && windowEnd && new Date(windowEnd) <= new Date(windowStart);

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const endInput = form.elements.deliveryWindowEnd;

    if (new Date(windowEnd) <= new Date(windowStart)) {
      endInput.setCustomValidity("Window end must be after window start.");
      endInput.reportValidity();
      return;
    }

    endInput.setCustomValidity("");
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      const formData = new FormData(form);
      const deliveryData = Object.fromEntries(formData.entries());
      const createdDelivery = await createDelivery(deliveryData);

      setSubmitSuccess(`Delivery ${createdDelivery.reference} was created.`);
      form.reset();
      setPickup("");
      setDestination("");
      setPriority("Normal");
      setWindowStart("");
      setWindowEnd("");
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl">
      <Link
        to="/dashboard"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
                <PackagePlus size={22} />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-slate-800">
                  Add Cargo
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the delivery and recipient details.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div className="space-y-4">
              <section>
                <h2 className="mb-2 text-sm font-semibold text-slate-800">
                  Route details
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Pickup location
                    <input
                      name="pickup"
                      value={pickup}
                      onChange={(event) => setPickup(event.target.value)}
                      required
                      className={fieldClass}
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Destination
                    <input
                      name="destination"
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      required
                      className={fieldClass}
                    />
                  </label>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">
                  Recipient and cargo
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Recipient name
                    <input
                      name="recipientName"
                      required
                      className={fieldClass}
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Recipient phone
                    <input
                      name="recipientPhone"
                      type="tel"
                      required
                      className={fieldClass}
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    Package description
                    <textarea
                      name="packageDescription"
                      required
                      rows={3}
                      className={fieldClass}
                      placeholder="Describe the cargo"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Package weight (kg)
                    <input
                      name="weightKg"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      className={fieldClass}
                      placeholder="e.g. 88.9"
                    />
                  </label>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">
                  Schedule and priority
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Priority
                    <select
                      name="priority"
                      value={priority}
                      onChange={(event) => setPriority(event.target.value)}
                      className={fieldClass}
                    >
                      <option>Low</option>
                      <option>Normal</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Window starts
                    <input
                      name="deliveryWindowStart"
                      type="datetime-local"
                      value={windowStart}
                      max={windowEnd || undefined}
                      onChange={(event) => {
                        setWindowStart(event.target.value);
                        event.currentTarget.form.elements.deliveryWindowEnd.setCustomValidity(
                          "",
                        );
                      }}
                      required
                      className={fieldClass}
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Window ends
                    <input
                      name="deliveryWindowEnd"
                      type="datetime-local"
                      value={windowEnd}
                      min={windowStart || undefined}
                      aria-invalid={Boolean(windowRangeInvalid)}
                      onChange={(event) => {
                        setWindowEnd(event.target.value);
                        event.currentTarget.setCustomValidity("");
                      }}
                      required
                      className={`${fieldClass} ${windowRangeInvalid ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
                    />
                    {windowRangeInvalid && (
                      <span className="mt-1 block text-xs font-normal text-red-600">
                        End time must be later than start time.
                      </span>
                    )}
                  </label>
                </div>
              </section>
            </div>
            {submitError && (
              <p role="alert" className="text-sm text-red-600">
                {submitError}
              </p>
            )}

            {submitSuccess && (
              <p role="status" className="text-sm text-green-700">
                {submitSuccess}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <Link
                to="/dashboard"
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Create Cargo"}
              </button>
            </div>
          </form>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Route preview
            </h2>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                priority === "High" || priority === "Urgent"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {priority}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Your pickup and destination
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin size={17} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Pickup</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {pickup || "Enter a pickup location"}
                </p>
              </div>
            </div>

            <div className="ml-2 h-5 border-l border-dashed border-slate-300" />

            <div className="flex items-start gap-3">
              <MapPin size={17} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Destination</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {destination || "Enter a destination"}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
