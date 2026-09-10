import { useEffect, useMemo, useState } from 'react'

const DEFAULT_SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'base_price', label: 'Price' },
]

function readFilters(filters) {
  return {
    min_price: filters.min_price ?? '',
    max_price: filters.max_price ?? '',
    min_adults: filters.min_adults ?? '',
    min_children: filters.min_children ?? '',
  }
}

export default function FilterBar({ filters, onChange, sortOptions = DEFAULT_SORT_OPTIONS }) {
  const [form, setForm] = useState(() => readFilters(filters))

  useEffect(() => {
    setForm(readFilters(filters))
  }, [filters.min_price, filters.max_price, filters.min_adults, filters.min_children])

  const hasActiveFilters = useMemo(
    () =>
      Object.entries(filters).some(
        ([key, value]) =>
          value !== undefined &&
          value !== null &&
          value !== '' &&
          key !== 'sort' &&
          key !== 'direction' &&
          key !== 'page',
      ),
    [filters],
  )

  const updateForm = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const applyNumeric = (key) => () => {
    const raw = form[key]
    onChange({ [key]: raw === '' ? undefined : Number(raw), page: 1 })
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="min-price" className="label">Min price</label>
          <input
            id="min-price"
            name="min_price"
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={form.min_price}
            placeholder="Any"
            onBlur={applyNumeric('min_price')}
            onChange={updateForm}
          />
        </div>
        <div>
          <label htmlFor="max-price" className="label">Max price</label>
          <input
            id="max-price"
            name="max_price"
            type="number"
            min="0"
            step="0.01"
            className="input"
            value={form.max_price}
            placeholder="Any"
            onBlur={applyNumeric('max_price')}
            onChange={updateForm}
          />
        </div>
        <div>
          <label htmlFor="min-adults" className="label">Guests (adults)</label>
          <input
            id="min-adults"
            name="min_adults"
            type="number"
            min="0"
            className="input"
            value={form.min_adults}
            placeholder="Any"
            onBlur={applyNumeric('min_adults')}
            onChange={updateForm}
          />
        </div>
        <div>
          <label htmlFor="min-children" className="label">Children</label>
          <input
            id="min-children"
            name="min_children"
            type="number"
            min="0"
            className="input"
            value={form.min_children}
            placeholder="Any"
            onBlur={applyNumeric('min_children')}
            onChange={updateForm}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:w-64">
        <div>
          <label htmlFor="sort" className="label">Sort by</label>
          <select
            id="sort"
            className="input"
            value={filters.sort ?? ''}
            onChange={(e) => onChange({ sort: e.target.value || undefined, page: 1 })}
          >
            <option value="">Default</option>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="direction" className="label">Direction</label>
          <select
            id="direction"
            className="input"
            value={filters.direction ?? 'asc'}
            onChange={(e) => onChange({ direction: e.target.value, page: 1 })}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          className="btn-outline sm:w-auto"
          onClick={() =>
            onChange({
              search: undefined,
              min_price: undefined,
              max_price: undefined,
              min_adults: undefined,
              min_children: undefined,
              sort: undefined,
              direction: undefined,
              page: 1,
            })
          }
        >
          Clear filters
        </button>
      )}
    </div>
  )
}