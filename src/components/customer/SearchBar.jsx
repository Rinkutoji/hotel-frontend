import { useEffect, useState } from 'react'

export default function SearchBar({ value, onChange, placeholder = 'Search…', delay = 300 }) {
  const [text, setText] = useState(value ?? '')
  const [prevValue, setPrevValue] = useState(value ?? '')

  if ((value ?? '') !== prevValue) {
    setPrevValue(value ?? '')
    setText(value ?? '')
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(text)
    }, delay)
    return () => clearTimeout(handler)
  }, [text, delay, onChange])

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        type="search"
        className="input pl-10"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}