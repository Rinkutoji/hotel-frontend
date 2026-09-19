import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { customerPayments } from '../../api/paymentApi'
import useApi from '../../hooks/useApi'
import PaymentStatusBadge from '../../components/customer/PaymentStatusBadge'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import ReceiptPreview from '../../components/common/ReceiptPreview'
import { getFieldErrors } from '../../utils/apiError'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_RECEIPT_SIZE = 4 * 1024 * 1024

const METHOD_LABELS = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function isDeadlineExpired(value) {
  return value != null && new Date(value).getTime() <= Date.now()
}

export default function PaymentDetail() {
  const { id } = useParams()
  const location = useLocation()
  const created = Boolean(location.state?.created)

  const fetchPayment = useMemo(() => () => customerPayments.show(id), [id])
  const { data: payment, error, isLoading, refetch } = useApi(fetchPayment)

  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)
  const fileInputRef = useRef(null)

  if (error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">Payment details</h1>
        <div className="mt-8">
          <ErrorState
            error={error}
            fallback={is404 ? 'This payment could not be found.' : "We couldn't load this payment. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
        <div className="mt-6 text-center">
          <Link to="/bookings" className="btn-outline">
            Back to my bookings
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || !payment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-800">Payment details</h1>
        <div className="mt-8">
          <LoadingState label="Loading payment…" />
        </div>
      </div>
    )
  }

  const booking = payment.booking ?? null
  const status = payment.status
  const canViewReceipt = ['receipt_uploaded', 'verified', 'refunded'].includes(status)
  const needsUploadForm = status === 'pending' || status === 'rejected'
  const showUploadForm = needsUploadForm || (status === 'receipt_uploaded' && showUpload)
  const methodLabel = METHOD_LABELS[payment.method] ?? payment.method

  const deadlineExpired = isDeadlineExpired(booking?.payment_deadline_at)
  const showDeadline =
    booking?.status === 'pending_payment' && !['verified', 'refunded'].includes(status)

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] ?? null)
    setFileError(null)
    setUploadError(null)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (uploading) return
    setFieldErrors({})
    setUploadError(null)

    if (!file) {
      setFileError('Please choose a file to upload.')
      return
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Unsupported file type. Please upload a JPG, PNG, or PDF file.')
      return
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      setFileError('File is too large. The maximum allowed size is 4MB.')
      return
    }
    setFileError(null)

    setUploading(true)
    try {
      await customerPayments.uploadReceipt(payment.id, file)
      setFile(null)
      setShowUpload(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await refetch()
    } catch (err) {
      setUploadError(err)
      setFieldErrors(getFieldErrors(err))
    } finally {
      setUploading(false)
    }
  }

  const handleViewReceipt = async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const res = await customerPayments.downloadReceipt(payment.id)
      const blob = res.data
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setDownloadError(err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {booking && (
        <Link to={`/bookings/${booking.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to booking
        </Link>
      )}

      {created && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-semibold text-green-800">Your payment was created</p>
          <p className="mt-1 text-sm text-green-700">
            Please upload your payment receipt so our staff can verify it.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payment #{payment.id}</h1>
          <p className="mt-1 text-sm text-slate-500">Payment details</p>
        </div>
        <PaymentStatusBadge status={status} />
      </div>

      {showDeadline && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            deadlineExpired
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {deadlineExpired
            ? 'The payment deadline on this booking has passed. Your rooms may no longer be held.'
            : `Payment deadline: ${formatDateTime(booking.payment_deadline_at)}`}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm font-semibold text-slate-800">Payment summary</p>
        </div>
        <dl className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{payment.amount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Method</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{methodLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(payment.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Updated</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(payment.updated_at)}</dd>
          </div>
          {status === 'verified' && payment.verified_at && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Verified</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(payment.verified_at)}</dd>
            </div>
          )}
        </dl>
      </div>

      {booking && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <p className="text-sm font-semibold text-slate-800">Booking</p>
          </div>
          <dl className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Booking number</dt>
              <dd className="mt-0.5">
                <Link to={`/bookings/${booking.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                  {booking.booking_number}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Booking status</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{booking.status}</dd>
            </div>
            {booking.check_in_date && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Check-in</dt>
                <dd className="mt-0.5 font-medium text-slate-800">{booking.check_in_date}</dd>
              </div>
            )}
            {booking.check_out_date && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Check-out</dt>
                <dd className="mt-0.5 font-medium text-slate-800">{booking.check_out_date}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm font-semibold text-slate-800">Receipt</p>
        </div>
        <div className="space-y-4 px-5 py-4">
          {status !== 'pending' && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-slate-800">Receipt uploaded</p>
              {canViewReceipt && (
                <>
                  <ReceiptPreview
                    paymentId={payment.id}
                    download={() => customerPayments.downloadReceipt(payment.id)}
                  />
                  <button
                    type="button"
                    onClick={handleViewReceipt}
                    disabled={downloading}
                    className="btn-outline"
                  >
                    {downloading ? 'Opening…' : 'View receipt'}
                  </button>
                </>
              )}
              {status === 'receipt_uploaded' && (
                <button type="button" onClick={() => setShowUpload((value) => !value)} className="btn-outline">
                  {showUpload ? 'Hide' : 'Replace receipt'}
                </button>
              )}
            </div>
          )}

          {status === 'verified' && payment.verifiedBy && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Verified by {payment.verifiedBy.name} on {formatDateTime(payment.verified_at)}.
            </div>
          )}

          {status === 'verified' && (
            <p className="text-sm text-slate-600">
              Your payment has been verified. An invoice has been generated.{' '}
              <Link to="/invoices" className="font-medium text-brand-600 hover:text-brand-700">
                View my invoices
              </Link>
            </p>
          )}

          {status === 'rejected' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Payment rejected</p>
              {payment.notes && <p className="mt-1">{payment.notes}</p>}
              <p className="mt-1 text-red-700">Please upload a new receipt below.</p>
            </div>
          )}

          {status === 'refunded' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold">Payment refunded</p>
              {payment.notes && <p className="mt-1">{payment.notes}</p>}
            </div>
          )}

          {showUploadForm && (
            <form onSubmit={handleUpload} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <label htmlFor="receipt-file" className="label">
                  Upload payment receipt
                </label>
                <input
                  id="receipt-file"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="input"
                  onChange={handleFileChange}
                />
                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG or PDF. Maximum size 4MB. Your receipt is reviewed before your payment is verified.
                </p>
              </div>

              {fileError && <div className="field-error">{fileError}</div>}
              <ErrorMessage
                error={uploadError}
                fallback="We could not upload your receipt. Please try again."
              />
              {Object.entries(fieldErrors).map(([field, messages]) => (
                <div key={field} className="field-error">
                  <span className="font-medium">{field}:</span> {Array.isArray(messages) ? messages.join(' ') : messages}
                </div>
              ))}

              <button type="submit" className="btn-primary" disabled={uploading || !file}>
                {uploading ? 'Uploading…' : 'Upload receipt'}
              </button>
            </form>
          )}

          {downloadError && (
            <ErrorMessage
              error={downloadError}
              fallback="We could not open your receipt. Please try again."
            />
          )}
        </div>
      </div>
    </div>
  )
}