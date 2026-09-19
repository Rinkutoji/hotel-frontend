import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import useDashboard from '../../hooks/useDashboard'
import StatCard from '../../components/staff/StatCard'
import StatusBarChart from '../../components/staff/StatusBarChart'
import OccupancyDonut from '../../components/staff/OccupancyDonut'
import DashboardActivityPanel from '../../components/staff/DashboardActivityPanel'
import BookingStatusBadge from '../../components/customer/BookingStatusBadge'
import PaymentStatusBadge from '../../components/customer/PaymentStatusBadge'
import {
  SkeletonStatCard,
  SkeletonChart,
  SkeletonList,
} from '../../components/common/Skeleton'

const BOOKING_LABELS = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  cancelled: 'Cancelled',
  no_show: 'No show',
}

const PAYMENT_LABELS = {
  pending: 'Pending',
  receipt_uploaded: 'Receipt uploaded',
  verified: 'Verified',
  rejected: 'Rejected',
  refunded: 'Refunded',
}

const ROOM_LABELS = {
  available: 'Available',
  reserved: 'Reserved',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
}

const ROOM_COLORS = {
  available: '#10b981',
  reserved: '#3b82f6',
  occupied: '#f59e0b',
  cleaning: '#94a3b8',
  maintenance: '#ef4444',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function WidgetContainer({ loading, error, onRetry, renderSkeleton, children }) {
  if (loading) return renderSkeleton()
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
        <p className="text-sm text-red-700">We couldn't load this section right now.</p>
        <button type="button" className="mt-4 btn-outline" onClick={onRetry}>
          Retry
        </button>
      </div>
    )
  }
  return children
}

export default function StaffDashboard() {
  const { user, hasRole } = useAuth()
  const { groups, refetch, refetchAll } = useDashboard()

  const canManage = hasRole(['admin', 'manager'])
  const role = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : null

  const bookings = groups.bookings.data
  const payments = groups.payments.data
  const occupancy = groups.occupancy.data
  const invoices = groups.invoices.data
  const recentBookings = groups.recentBookings.data
  const recentPayments = groups.recentPayments.data

  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const bookingRows =
    bookings?.chart.map((entry) => ({ label: BOOKING_LABELS[entry.status] ?? entry.status, value: entry.value })) ?? []

  const paymentRows =
    payments?.chart.map((entry) => ({ label: PAYMENT_LABELS[entry.status] ?? entry.status, value: entry.value })) ?? []

  const occupancyData =
    occupancy?.chart.map((entry) => ({
      label: ROOM_LABELS[entry.status] ?? entry.status,
      value: entry.value,
      color: ROOM_COLORS[entry.status] ?? '#94a3b8',
    })) ?? []

  const recentBookingRows = (recentBookings ?? []).slice(0, 5).map((booking) => (
    <li key={booking.id} className="py-3">
      <Link to={`/staff/bookings/${booking.id}`} className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-800">{booking.booking_number}</span>
          <span className="block truncate text-sm text-slate-500">
            {booking.customer?.name ?? 'Guest'} · {formatDate(booking.check_in_date)} → {formatDate(booking.check_out_date)}
          </span>
        </span>
        <span className="shrink-0">
          <BookingStatusBadge status={booking.status} />
        </span>
      </Link>
    </li>
  ))

  const recentPaymentRows = (recentPayments ?? []).slice(0, 5).map((payment) => {
    const customer = payment.booking?.customer?.name ?? 'Guest'
    return (
      <li key={payment.id} className="py-3">
        <Link to={`/staff/payments/${payment.id}`} className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800">
              {payment.booking?.booking_number ?? `Payment #${payment.id}`}
            </span>
            <span className="block truncate text-sm text-slate-500">
              {customer} · {formatDateTime(payment.created_at)}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <PaymentStatusBadge status={payment.status} />
            <span className="text-sm font-semibold text-slate-700">{payment.amount}</span>
          </span>
        </Link>
      </li>
    )
  })

  const recentInvoiceRows = (invoices?.recent ?? []).slice(0, 5).map((invoice) => {
    const customer = invoice.payment?.booking?.customer?.name ?? 'Guest'
    return (
      <li key={invoice.id} className="py-3">
        <Link to={`/staff/invoices/${invoice.id}`} className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800">{invoice.invoice_number}</span>
            <span className="block truncate text-sm text-slate-500">
              {customer} · {formatDateTime(invoice.issued_at)}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {invoice.payment && <PaymentStatusBadge status={invoice.payment.status} />}
            <span className="text-sm font-semibold text-slate-700">{invoice.total_amount}</span>
          </span>
        </Link>
      </li>
    )
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {timeGreeting}, {user?.name ?? 'there'}
            {role ? ` · ${role}` : ''}
          </p>
        </div>
        <button type="button" className="btn-outline" onClick={refetchAll}>
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WidgetContainer
          loading={groups.bookings.loading}
          error={groups.bookings.error}
          onRetry={() => refetch('bookings')}
          renderSkeleton={() => <SkeletonStatCard />}
        >
          <StatCard
            label="Bookings"
            value={bookings?.total ?? '—'}
            caption={`${bookings?.checkedIn ?? 0} checked in now`}
            to="/staff/bookings"
          />
        </WidgetContainer>

        <WidgetContainer
          loading={groups.payments.loading}
          error={groups.payments.error}
          onRetry={() => refetch('payments')}
          renderSkeleton={() => <SkeletonStatCard />}
        >
          <StatCard
            label="Payments to review"
            value={payments?.toReview ?? '—'}
            caption="Pending or receipt uploaded"
            to="/staff/payments?status=receipt_uploaded"
          />
        </WidgetContainer>

        <WidgetContainer
          loading={groups.occupancy.loading}
          error={groups.occupancy.error}
          onRetry={() => refetch('occupancy')}
          renderSkeleton={() => <SkeletonStatCard />}
        >
          <StatCard
            label="Rooms occupied"
            value={occupancy?.occupied ?? '—'}
            caption={`${occupancy?.pct ?? 0}% of rooms occupied`}
            to="/staff/rooms?status=occupied"
          />
        </WidgetContainer>

        <WidgetContainer
          loading={groups.invoices.loading}
          error={groups.invoices.error}
          onRetry={() => refetch('invoices')}
          renderSkeleton={() => <SkeletonStatCard />}
        >
          <StatCard label="Invoices issued" value={invoices?.total ?? '—'} caption="Total issued" to="/staff/invoices" />
        </WidgetContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <WidgetContainer
          loading={groups.bookings.loading}
          error={groups.bookings.error}
          onRetry={() => refetch('bookings')}
          renderSkeleton={() => <SkeletonChart />}
        >
          <StatusBarChart title="Bookings by status" rows={bookingRows} />
        </WidgetContainer>

        <WidgetContainer
          loading={groups.payments.loading}
          error={groups.payments.error}
          onRetry={() => refetch('payments')}
          renderSkeleton={() => <SkeletonChart />}
        >
          <StatusBarChart title="Payments by status" rows={paymentRows} />
        </WidgetContainer>

        <WidgetContainer
          loading={groups.occupancy.loading}
          error={groups.occupancy.error}
          onRetry={() => refetch('occupancy')}
          renderSkeleton={() => <SkeletonChart />}
        >
          <OccupancyDonut title="Room occupancy" data={occupancyData} />
        </WidgetContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <WidgetContainer
          loading={groups.recentBookings.loading}
          error={groups.recentBookings.error}
          onRetry={() => refetch('recentBookings')}
          renderSkeleton={() => <SkeletonList label="Loading recent bookings" />}
        >
          <DashboardActivityPanel
            title="Recent bookings"
            viewAllTo="/staff/bookings"
            viewAllLabel="View all bookings"
            rows={recentBookingRows}
            emptyTitle="No bookings yet"
            emptyMessage="Bookings will appear here as customers make them."
          />
        </WidgetContainer>

        <WidgetContainer
          loading={groups.recentPayments.loading}
          error={groups.recentPayments.error}
          onRetry={() => refetch('recentPayments')}
          renderSkeleton={() => <SkeletonList label="Loading recent payments" rows={3} />}
        >
          <DashboardActivityPanel
            title="Recent payments"
            viewAllTo="/staff/payments"
            viewAllLabel="View all payments"
            rows={recentPaymentRows}
            emptyTitle="No payments yet"
            emptyMessage="Payments will appear here as customers submit them."
          />
        </WidgetContainer>

        <WidgetContainer
          loading={groups.invoices.loading}
          error={groups.invoices.error}
          onRetry={() => refetch('invoices')}
          renderSkeleton={() => <SkeletonList label="Loading recent invoices" rows={3} />}
        >
          <DashboardActivityPanel
            title="Recent invoices"
            viewAllTo="/staff/invoices"
            viewAllLabel="View all invoices"
            rows={recentInvoiceRows}
            emptyTitle="No invoices issued yet"
            emptyMessage="Invoices are issued automatically once a payment is verified."
          />
        </WidgetContainer>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/staff/bookings" className="btn-outline">
            View bookings
          </Link>
          <Link to="/staff/payments?status=receipt_uploaded" className="btn-outline">
            Process payments
          </Link>
          <Link to="/staff/rooms" className="btn-outline">
            Browse rooms
          </Link>
          <Link to="/staff/invoices" className="btn-outline">
            View invoices
          </Link>
          {canManage && (
            <>
              <Link to="/staff/rooms/new" className="btn-outline">
                Create room
              </Link>
              <Link to="/staff/room-types/new" className="btn-outline">
                New room type
              </Link>
              <Link to="/staff/discounts/new" className="btn-outline">
                New discount
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  )
}