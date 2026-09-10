export default function ComingSoon({ title }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-600">Feature in progress</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-800">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        This section will be available in a later phase of the frontend rollout.
      </p>
    </div>
  )
}