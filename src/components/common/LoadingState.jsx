export default function LoadingState({ fullScreen = false, label = 'Loading…' }) {
  const content = (
    <div className="flex items-center justify-center gap-3 text-slate-500" role="status" aria-label={label}>
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  )

  if (!fullScreen) return content

  return <div className="flex min-h-screen items-center justify-center">{content}</div>
}