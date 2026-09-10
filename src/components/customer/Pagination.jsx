import { useMemo } from 'react'

const MAX_VISIBLE_PAGES = 7

function buildPageList(currentPage, lastPage) {
  if (lastPage <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: lastPage }, (_, i) => i + 1)
  }

  const pages = new Set([1, lastPage])
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(lastPage - 1, currentPage + 1)
  for (let page = start; page <= end; page++) pages.add(page)
  return [...pages].sort((a, b) => a - b)
}

export default function Pagination({ currentPage, lastPage, onPageChange }) {
  const pages = useMemo(() => buildPageList(currentPage, lastPage), [currentPage, lastPage])

  if (lastPage <= 1) return null

  const handleChange = (page) => {
    if (page < 1 || page > lastPage || page === currentPage) return
    onPageChange(page)
  }

  const renderItems = []
  pages.forEach((page, index) => {
    const prev = pages[index - 1]
    if (prev !== undefined && page - prev > 1) {
      renderItems.push(
        <span key={`ellipsis-${index}`} className="px-2 py-2 text-sm text-slate-400" aria-hidden="true">
          …
        </span>,
      )
    }
    const style =
      page === currentPage
        ? 'border-brand-600 bg-brand-600 text-white'
        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
    renderItems.push(
      <button
        key={page}
        type="button"
        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium ${style}`}
        aria-current={page === currentPage ? 'page' : undefined}
        onClick={() => handleChange(page)}
      >
        {page}
      </button>,
    )
  })

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        className="btn-outline"
        disabled={currentPage <= 1}
        onClick={() => handleChange(currentPage - 1)}
      >
        Previous
      </button>
      <div className="flex flex-wrap items-center justify-center gap-2">{renderItems}</div>
      <button
        type="button"
        className="btn-outline"
        disabled={currentPage >= lastPage}
        onClick={() => handleChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  )
}