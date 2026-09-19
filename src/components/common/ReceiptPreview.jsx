import { useEffect, useRef, useState } from 'react'

const NON_PREVIEWABLE_MESSAGE =
  "This receipt is a PDF and can't be previewed inline. Use View receipt to open it."

export default function ReceiptPreview({ download, paymentId }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [kind, setKind] = useState(null)
  const [blob, setBlob] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const urlRef = useRef(null)

  useEffect(() => {
    if (open && kind === 'image' && blob && !urlRef.current) {
      urlRef.current = window.URL.createObjectURL(blob)
      setImageUrl(urlRef.current)
    }

    return () => {
      if (urlRef.current) {
        window.URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
        setImageUrl(null)
      }
    }
  }, [open, kind, blob])

  const loadPreview = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const response = await download()
      const nextBlob = response.data
      const isImage =
        nextBlob != null &&
        typeof nextBlob.type === 'string' &&
        nextBlob.type.startsWith('image/')
      setBlob(nextBlob)
      setKind(isImage ? 'image' : 'note')
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (!kind) loadPreview()
  }

  const handleRetry = () => {
    setError(null)
    setKind(null)
    setBlob(null)
    setOpen(true)
    loadPreview()
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleToggle} disabled={loading} className="btn-outline">
        {loading ? 'Loading…' : open ? 'Hide preview' : 'Preview receipt'}
      </button>

      {loading && (
        <p role="status" className="text-sm text-slate-500">
          Loading receipt…
        </p>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-red-600">We could not load the receipt preview. Please try again.</p>
          <button type="button" onClick={handleRetry} className="btn-outline">
            Try again
          </button>
        </div>
      )}

      {open && kind === 'image' && imageUrl && (
        <img
          src={imageUrl}
          alt={`Payment receipt for payment #${paymentId}`}
          className="max-h-60 max-w-full rounded-lg border border-slate-200"
        />
      )}

      {open && kind === 'note' && (
        <p className="text-sm text-slate-500">{NON_PREVIEWABLE_MESSAGE}</p>
      )}
    </div>
  )
}