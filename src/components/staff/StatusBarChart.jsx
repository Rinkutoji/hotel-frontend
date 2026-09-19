export default function StatusBarChart({ title, rows, barClassName = 'bg-brand-600' }) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  const summary = rows.map((row) => `${row.label} ${row.value}`).join(', ')

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <dl className="mt-6 space-y-4" aria-label={summary}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <dt className="w-28 shrink-0 truncate text-sm text-slate-600">{row.label}</dt>
            <dd className="flex flex-1 items-center gap-3">
              <div className="relative h-2.5 flex-1 rounded-full bg-slate-100">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${barClassName}`}
                  style={{ width: `${(row.value / max) * 100}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-700">
                {row.value}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}