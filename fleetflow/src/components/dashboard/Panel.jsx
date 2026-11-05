export default function Panel({ title, action, children, className = "" }) {
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
