import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { staffPayments } from '../../api/paymentApi'
import useApi from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import PaymentStatusBadge from '../../components/customer/PaymentStatusBadge'
import BookingStatusBadge from '../../components/customer/BookingStatusBadge'
import LoadingState from '../../components/common/LoadingState'
import ErrorState from '../../components/common/ErrorState'
import ErrorMessage from '../../components/common/ErrorMessage'
import ReceiptPreview from '../../components/common/ReceiptPreview'
import { getFieldErrors } from '../../utils/apiError'

const METHOD_LABELS = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
}

const ACTION_SUCCESS_MESSAGES = {
  verify: 'Payment verified. The booking was confirmed and an invoice was issued.',
  reject: 'Payment rejected.',
  refund: 'Payment refunded. The booking was cancelled.',
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export default function PaymentDetail() {
  const { id } = useParams()
  const { hasRole } = useAuth()

  const fetchPayment = useMemo(() => () => staffPayments.show(id), [id])
  const { data: payment, error, isLoading, refetch } = useApi(fetchPayment)

  const [runningAction, setRunningAction] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

  useEffect(() => {
    if (!actionMessage) return undefined
    const timer = setTimeout(() => setActionMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [actionMessage])

  const performAction = async (name, request) => {
    if (runningAction) return
    setRunningAction(name)
    setActionError(null)
    setFieldErrors({})
    try {
      await request()
      setActionMessage(ACTION_SUCCESS_MESSAGES[name])
      setRejectOpen(false)
      setRefundOpen(false)
      setReason('')
      await refetch()
    } catch (err) {
      const fields = getFieldErrors(err)
      if (fields && Object.keys(fields).length > 0) setFieldErrors(fields)
      setActionError(err)
      if (err?.response?.status === 409 || err?.response?.status === 403) {
        await refetch()
      }
    } finally {
      setRunningAction(null)
    }
  }

  const handleVerify = () => performAction('verify', () => staffPayments.verify(payment.id))

  const handleReject = (e) => {
    e.preventDefault()
    performAction('reject', () => staffPayments.reject(payment.id, reason.trim()))
  }

  const handleRefund = (e) => {
    e.preventDefault()
    performAction('refund', () => staffPayments.refund(payment.id, reason.trim()))
  }

  const handleDownloadReceipt = async () => {
    if (downloading) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const res = await staffPayments.downloadReceipt(payment.id)
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

  if (error) {
    const is404 = error?.response?.status === 404
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mt-2">
          <ErrorState
            error={error}
            fallback={is404 ? 'This payment could not be found.' : "We couldn't load this payment. Please try again."}
            onRetry={is404 ? undefined : refetch}
          />
        </div>
        <div className="mt-6 text-center">
          <Link to="/staff/payments" className="btn-outline">
            Back to payments
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || !payment) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-800">Payment details</h1>
        <div className="mt-8">
          <LoadingState label="Loading payment…" />
        </div>
      </div>
    )
  }

  const booking = payment.booking ?? null
  const customer = booking?.customer ?? null
  const status = payment.status
  const canViewReceipt = ['receipt_uploaded', 'verified', 'rejected', 'refunded'].includes(status)
  const showVerifyReject = status === 'receipt_uploaded'
  const showRefund = status === 'verified' && hasRole(['admin', 'manager'])
  const methodLabel = METHOD_LABELS[payment.method] ?? payment.method

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mt-2">
        <Link to="/staff/payments" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to payments
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payment #{payment.id}</h1>
          <p className="mt-1 text-sm text-slate-500">Payment details</p>
        </div>
        <PaymentStatusBadge status={status} />
      </div>

      {actionMessage && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-semibold text-green-800">{actionMessage}</p>
        </div>
      )}

      {actionError && (
        <div className="mt-4">
          <ErrorMessage
            error={actionError}
            fallback="This action could not be completed. Please try again."
          />
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
                <Link to={`/staff/bookings/${booking.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                  {booking.booking_number}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Booking status</dt>
              <dd className="mt-0.5">
                <BookingStatusBadge status={booking.status} />
              </dd>
            </div>
            {customer && (
              <>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Guest name</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{customer.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Guest email</dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{customer.email}</dd>
                </div>
              </>
            )}
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
                    download={() => staffPayments.downloadReceipt(payment.id)}
                  />
                  <button
                    type="button"
                    onClick={handleDownloadReceipt}
                    disabled={downloading}
                    className="btn-outline"
                  >
                    {downloading ? 'Opening…' : 'View receipt'}
                  </button>
                </>
              )}
            </div>
          )}

          {status === 'pending' && (
            <p className="text-sm text-slate-600">
              Awaiting receipt upload from the guest.
            </p>
          )}

          {status === 'verified' && payment.verifiedBy && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Verified by {payment.verifiedBy.name} on {formatDateTime(payment.verified_at)}.
            </div>
          )}

          {status === 'rejected' && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Payment rejected</p>
              {payment.notes && <p className="mt-1">{payment.notes}</p>}
            </div>
          )}

          {status === 'refunded' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold">Payment refunded</p>
              {payment.notes && <p className="mt-1">{payment.notes}</p>}
              <p className="mt-1 text-slate-600">The associated booking was cancelled.</p>
            </div>
          )}

          {downloadError && (
            <ErrorMessage
              error={downloadError}
              fallback="We could not open the receipt. Please try again."
            />
          )}
        </div>
      </div>

      <div className="mt-6">
        {showVerifyReject && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={runningAction === 'verify'}
              onClick={handleVerify}
            >
              {runningAction === 'verify' ? 'Verifying…' : 'Verify payment'}
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={runningAction !== null}
              onClick={() => {
                setRejectOpen((value) => !value)
                setRefundOpen(false)
                setReason('')
                setActionError(null)
                setFieldErrors({})
              }}
            >
              Reject payment
            </button>
          </div>
        )}

        {showRefund && (
          <button
            type="button"
            className="btn-danger-ghost"
            disabled={runningAction !== null}
            onClick={() => {
              setRefundOpen((value) => !value)
              setRejectOpen(false)
              setReason('')
              setActionError(null)
              setFieldErrors({})
            }}
          >
            Refund payment
          </button>
        )}

        {status === 'verified' && !hasRole(['admin', 'manager']) && (
          <p className="mt-2 text-sm text-slate-500">Refunds require manager or admin access.</p>
        )}

        {rejectOpen && (
          <form
            onSubmit={handleReject}
            className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-800">
              Reject this payment receipt? The guest can upload a corrected receipt later.
            </p>
            <ErrorMessage
              error={actionError && runningAction === null ? actionError : null}
              fallback="We could not reject this payment. Please try again."
            />
            <div>
              <label htmlFor="reject-reason" className="label">
                Reason (required)
              </label>
              <input
                id="reject-reason"
                type="text"
                className="input"
                maxLength={255}
                placeholder="Why is this receipt being rejected?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {fieldErrors.reason && <p className="field-error">{fieldErrors.reason[0]}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="btn-danger"
                disabled={!reason.trim()}
              >
                {runningAction === 'reject' ? 'Rejecting…' : 'Confirm rejection'}
              </button>
              <button
                type="button"
                className="btn-outline"
                disabled={runningAction !== null}
                onClick={() => { setRejectOpen(false); setReason(''); setActionError(null); setFieldErrors({}) }}
              >
                Keep payment
              </button>
            </div>
          </form>
        )}

        {refundOpen && (
          <form
            onSubmit={handleRefund}
            className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-800">
              Refund this payment? The associated booking will be cancelled and any reserved rooms released.
            </p>
            <ErrorMessage
              error={actionError && runningAction === null ? actionError : null}
              fallback="We could not refund this payment. Please try again."
            />
            <div>
              <label htmlFor="refund-reason" className="label">
                Reason (required)
              </label>
              <input
                id="refund-reason"
                type="text"
                className="input"
                maxLength={255}
                placeholder="Why is this payment being refunded?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {fieldErrors.reason && <p className="field-error">{fieldErrors.reason[0]}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="btn-danger"
                disabled={!reason.trim()}
              >
                {runningAction === 'refund' ? 'Refunding…' : 'Confirm refund'}
              </button>
              <button
                type="button"
                className="btn-outline"
                disabled={runningAction !== null}
                onClick={() => { setRefundOpen(false); setReason(''); setActionError(null); setFieldErrors({}) }}
              >
                Keep payment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}