export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} aria-hidden="true" />
  )
}

export function SkeletonStatCard() {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      role="status"
      aria-label="Loading dashboard statistics"
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      role="status"
      aria-label="Loading dashboard chart"
    >
      <Skeleton className="h-4 w-32" />
      <div className="mt-6 space-y-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ rows = 4, label = 'Loading list' }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton