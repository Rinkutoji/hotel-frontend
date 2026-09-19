const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function OccupancyDonut({ title, data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const summary = data
    .map((item) => {
      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
      return `${item.label} ${item.value} (${pct}%)`
    })
    .join(', ')

  const segments = data.reduce((acc, item) => {
    const fraction = total > 0 ? item.value / total : 0
    const previous = acc[acc.length - 1]
    const offset = previous ? previous.offset + previous.dash : 0
    acc.push({ ...item, dash: fraction * CIRCUMFERENCE, offset })
    return acc
  }, [])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
        <svg
          viewBox="0 0 100 100"
          className="h-40 w-40 shrink-0"
          role="img"
          aria-label={`Room occupancy: ${summary}`}
        >
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth="12"
              strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
              strokeDashoffset={-segment.offset}
              transform="rotate(-90 50 50)"
              aria-hidden="true"
            />
          ))}
        </svg>
        <ul className="w-full flex-1 space-y-2">
          {data.map((item) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
            return (
              <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 font-semibold text-slate-700">
                  {item.value}
                  <span className="ml-1 font-normal text-slate-400">{pct}%</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}