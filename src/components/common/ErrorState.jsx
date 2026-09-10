import { getErrorMessage } from '../../utils/apiError'

export default function ErrorState({ error, fallback = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center"
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.94 5h13.86A1.954 1.954 0 0020 18.5V5.5a1.954 1.954 0 00-1.94-2H5.94A1.954 1.954 0 004 5.5v13A1.954 1.954 0 006 18.5z" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">Something went wrong</h3>
      <p className="mt-2 max-w-sm text-sm text-red-700">{getErrorMessage(error, fallback)}</p>
      {typeof onRetry === 'function' && (
        <button type="button" onClick={onRetry} className="btn-outline mt-6">
          Try again
        </button>
      )}
    </div>
  )
}