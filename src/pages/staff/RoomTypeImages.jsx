import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { staffRoomImages, staffRoomTypes } from '../../api/roomApi'
import useApi from '../../hooks/useApi'
import LoadingState from '../../components/common/LoadingState'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getFieldErrors } from '../../utils/apiError'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_KB = 5120

function formatSize(size) {
  return `${Math.round(size / 1024)} KB`
}

export default function RoomTypeImages() {
  const { id } = useParams()
  const fileInputRef = useRef(null)

  const fetchRoomType = useCallback(() => staffRoomTypes.show(id), [id])
  const { data: roomType } = useApi(fetchRoomType)

  const fetchImages = useCallback(() => staffRoomTypes.listImages(id), [id])
  const { data, error, isLoading, refetch } = useApi(fetchImages)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [message, setMessage] = useState(null)
  const [running, setRunning] = useState(null)
  const [runningError, setRunningError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const images = useMemo(
    () => Array.from(data ?? []).sort((a, b) => a.sort_order - b.sort_order),
    [data],
  )

  const perform = async (key, request, successMessage) => {
    if (running) return
    setRunning(key)
    setRunningError(null)
    try {
      await request()
      setMessage(successMessage)
      await refetch()
    } catch (err) {
      setRunningError(err)
      if (err?.response?.status === 409 || err?.response?.status === 403) {
        await refetch()
      }
    } finally {
      setRunning(null)
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setMessage(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Please choose a JPG, JPEG, PNG or WebP image.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_SIZE_KB * 1024) {
      setUploadError(`Images must be ${formatSize(MAX_SIZE_KB * 1024)} or smaller.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      await staffRoomTypes.uploadImage(id, file)
      setMessage('Image uploaded.')
      await refetch()
    } catch (err) {
      setUploadError(err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleMove = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const current = images[index]
    const neighbor = images[target]
    const key = `move-${current.id}`
    perform(key, async () => {
      await staffRoomImages.updateSortOrder(current.id, neighbor.sort_order)
      await staffRoomImages.updateSortOrder(neighbor.id, current.sort_order)
    }, 'Image order updated.')
  }

  const handleDelete = (image) =>
    perform(`delete-${image.id}`, () => staffRoomImages.destroy(image.id), 'Image deleted.')

  if (error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-3xl">
        <Link to="/staff/room-types" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to room types
        </Link>
        <div className="mt-4">
          <ErrorState
            error={error}
            fallback={is404 ? 'This room type could not be found.' : "We couldn't load the images. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
      </div>
    )
  }

  if (isLoading || !roomType) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
          <LoadingState label="Loading images…" />
        </div>
      </div>
    )
  }

  const busy = running !== null || uploading

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/staff/room-types" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            ← Back to room types
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-800">{roomType.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Upload, reorder and remove photos.</p>
        </div>
        <Link to={`/staff/room-types/${id}/edit`} className="btn-outline">
          Edit room type
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
            {message}
          </div>
        )}
        {runningError && (
          <ErrorMessage error={runningError} fallback="The action could not be completed. Please try again." />
        )}
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex-1">
          <label htmlFor="image" className="label">
            Upload photo
          </label>
          <input
            id="image"
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="input"
            disabled={busy}
            onChange={handleFileChange}
          />
          <p className="mt-1 text-xs text-slate-400">JPG, JPEG, PNG or WebP. Maximum 5120 KB.</p>
        </div>
      </form>

      {typeof uploadError === 'string' ? (
        <div className="error-banner mt-4">{uploadError}</div>
      ) : uploadError ? (
        <>
          <ErrorMessage error={uploadError} fallback="We could not upload this image." />
          {getFieldErrors(uploadError).image?.map((message) => (
            <p key={message} className="field-error">
              {message}
            </p>
          ))}
        </>
      ) : null}

      <div className="mt-6">
        {images.length === 0 ? (
          <EmptyState
            title="No photos yet"
            message="Upload photos of this room type so guests can see what it looks like."
          />
        ) : (
          <ul className="space-y-3">
            {images.map((image, index) => (
              <li key={image.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <img
                  src={image.url}
                  alt={`${roomType.name} photo ${image.sort_order}`}
                  className="h-20 w-28 rounded-md object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm text-slate-600">Position {image.sort_order}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={busy || index === 0}
                    onClick={() => handleMove(index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={busy || index === images.length - 1}
                    onClick={() => handleMove(index, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="btn-danger-ghost"
                    disabled={busy}
                    onClick={() => setDeleteTarget(image)}
                  >
                    Delete
                  </button>
                </div>

                {deleteTarget?.id === image.id && (
                  <form
                    className="ml-auto w-full rounded-lg border border-red-200 bg-red-50 p-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleDelete(image)
                      setDeleteTarget(null)
                    }}
                  >
                    <p className="text-sm font-medium text-red-800">Delete this photo?</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button type="submit" className="btn-danger" disabled={busy}>
                        Delete photo
                      </button>
                      <button type="button" className="btn-outline" disabled={busy} onClick={() => setDeleteTarget(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}