import { Link } from 'react-router-dom'

export default function StatCard({ label, value, caption, to }) {
  const content = (
    <>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
      {caption && <p className="mt-2 truncate text-sm text-slate-500">{caption}</p>}
    </>
  )

  const base = 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'

  if (to) {
    return (
      <Link to={to} className={`${base} block transition-shadow hover:shadow-md`}>
        {content}
      </Link>
    )
  }

  return <div className={base}>{content}</div>
}