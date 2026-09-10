import { useState } from 'react'

export default function RoomGallery({ images }) {
  const list = Array.isArray(images) ? images : []
  const [activeIndex, setActiveIndex] = useState(0)
  const [prevLength, setPrevLength] = useState(list.length)

  if (prevLength !== list.length) {
    setPrevLength(list.length)
    setActiveIndex(0)
  }

  if (list.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-slate-100">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-3 text-sm text-slate-400">No photos available</p>
        </div>
      </div>
    )
  }

  const activeImage = list[Math.min(activeIndex, list.length - 1)]

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl bg-slate-100">
        <img
          src={activeImage.url}
          alt={`Room photo ${activeIndex + 1}`}
          className="aspect-[16/10] w-full object-cover"
        />
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                index === activeIndex ? 'border-brand-600' : 'border-transparent hover:border-slate-300'
              }`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === activeIndex}
            >
              <img src={image.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}