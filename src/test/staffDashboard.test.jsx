import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'
import StaffDashboard from '../pages/staff/Dashboard'

const BOOKINGS_BY_STATUS = {
  pending_payment: 1,
  confirmed: 6,
  checked_in: 2,
  checked_out: 3,
  cancelled: 0,
  no_show: 1,
}

const PAYMENTS_BY_STATUS = {
  pending: 3,
  receipt_uploaded: 2,
  verified: 7,
  rejected: 0,
  refunded: 1,
}

const ROOMS_BY_STATUS = {
  available: 8,
  reserved: 3,
  occupied: 4,
  cleaning: 1,
  maintenance: 0,
}

const RECENT_BOOKINGS = [
  {
    id: 1,
    booking_number: 'BK-AVA1111',
    status: 'confirmed',
    check_in_date: '2026-10-01',
    check_out_date: '2026-10-03',
    customer: { id: 9, name: 'Ava Stone', email: 'ava@example.com' },
  },
]

const RECENT_PAYMENTS = [
  {
    id: 5,
    amount: '500.00',
    status: 'verified',
    created_at: '2026-09-14T10:00:00.000000Z',
    booking: {
      id: 3,
      booking_number: 'BK-PAY2222',
      customer: { id: 8, name: 'Bob Reef', email: 'bob@example.com' },
    },
  },
]

const RECENT_INVOICES = [
  {
    id: 9,
    invoice_number: 'INV-PHL3333',
    total_amount: '1200.00',
    issued_at: '2026-09-14T09:00:00.000000Z',
    payment: {
      id: 7,
      status: 'verified',
      booking: {
        id: 4,
        booking_number: 'BK-AAA8888',
        customer: { id: 7, name: 'Ana Guest', email: 'ana@example.com' },
      },
    },
  },
]

function countReply(count) {
  return {
    success: true,
    data: [],
    meta: { page: 1, per_page: 1, total: count, last_page: 1 },
  }
}

function setUpMocks(mock, options = {}) {
  const { recentBookings = RECENT_BOOKINGS, recentPayments = RECENT_PAYMENTS, recentInvoices = RECENT_INVOICES, invoicesHandler } = options

  mock.onGet('/staff/bookings').reply((config) => {
    if (config.params?.status) {
      return [200, countReply(BOOKINGS_BY_STATUS[config.params.status] ?? 0)]
    }
    return [
      200,
      {
        success: true,
        data: recentBookings,
        meta: { page: 1, per_page: 15, total: 13, last_page: 1 },
      },
    ]
  })

  mock.onGet('/staff/payments').reply((config) => {
    if (config.params?.status) {
      return [200, countReply(PAYMENTS_BY_STATUS[config.params.status] ?? 0)]
    }
    return [
      200,
      {
        success: true,
        data: recentPayments,
        meta: { page: 1, per_page: 15, total: 13, last_page: 1 },
      },
    ]
  })

  mock.onGet('/staff/rooms').reply((config) => {
    return [200, countReply(ROOMS_BY_STATUS[config.params?.status] ?? 0)]
  })

  const invoicesResponse = {
    success: true,
    data: recentInvoices,
    meta: { page: 1, per_page: 15, total: 12, last_page: 1 },
  }
  const invoicesReply = typeof invoicesHandler === 'function' ? invoicesHandler : () => [200, invoicesResponse]
  mock.onGet('/staff/invoices').reply(invoicesReply)
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <StaffDashboard />
    </MemoryRouter>,
  )
}

describe('Staff dashboard page', () => {
  let mock
  const mockUseAuth = vi.mocked(useAuth)

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isStaff: true,
      user: { name: 'Ava Stone', role: 'manager', email: 'ava@example.com' },
      hasRole: () => true,
    })
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows loading skeletons while statistics load', () => {
    mock.onGet('/staff/bookings').reply(() => new Promise(() => {}))
    mock.onGet('/staff/payments').reply(() => new Promise(() => {}))
    mock.onGet('/staff/rooms').reply(() => new Promise(() => {}))
    mock.onGet('/staff/invoices').reply(() => new Promise(() => {}))
    renderDashboard()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getAllByRole('status', { name: 'Loading dashboard statistics' })).toHaveLength(4)
    expect(screen.getAllByRole('status', { name: 'Loading dashboard chart' })).toHaveLength(3)
  })

  it('renders greeting, role, and summary stat values', async () => {
    setUpMocks(mock)
    renderDashboard()

    expect(await screen.findByText(/Good (morning|afternoon|evening), Ava Stone/)).toBeInTheDocument()
    expect(screen.getByText(/Manager/)).toBeInTheDocument()

    const bookings = await screen.findByRole('link', { name: /Bookings \d+/ })
    expect(within(bookings).getByText('13')).toBeInTheDocument()

    const payments = await screen.findByRole('link', { name: /Payments to review \d+/ })
    expect(within(payments).getByText('5')).toBeInTheDocument()

    const rooms = await screen.findByRole('link', { name: /Rooms occupied \d+/ })
    expect(within(rooms).getByText('4')).toBeInTheDocument()
    expect(screen.getByText('25% of rooms occupied')).toBeInTheDocument()

    const invoicesStat = await screen.findByRole('link', { name: /Invoices issued \d+/ })
    expect(within(invoicesStat).getByText('12')).toBeInTheDocument()
  })

  it('renders the bookings and payments bar charts', async () => {
    setUpMocks(mock)
    renderDashboard()

    const bookingsChart = await screen.findByText('Bookings by status')
    const bookingsSection = bookingsChart.closest('section')
    expect(within(bookingsSection).getByText('Confirmed')).toBeInTheDocument()
    expect(within(bookingsSection).getByText('6')).toBeInTheDocument()
    expect(within(bookingsSection).getByText('Pending payment')).toBeInTheDocument()

    const paymentsChart = screen.getByText('Payments by status')
    const paymentsSection = paymentsChart.closest('section')
    expect(within(paymentsSection).getByText('Receipt uploaded')).toBeInTheDocument()
    expect(within(paymentsSection).getByText('2')).toBeInTheDocument()
  })

  it('renders the room occupancy donut with a legend and percentages', async () => {
    setUpMocks(mock)
    renderDashboard()

    const donut = await screen.findByText('Room occupancy')
    const section = donut.closest('section')
    expect(section.querySelector('[role="img"]')).toBeInTheDocument()
    expect(within(section).getByText('Occupied')).toBeInTheDocument()
    expect(section.querySelector('[role="img"]').getAttribute('aria-label')).toContain('Occupied 4 (25%)')
    expect(within(section).getByText('25%')).toBeInTheDocument()
  })

  it('renders recent activity panels with links to the details', async () => {
    setUpMocks(mock)
    renderDashboard()

    expect((await screen.findAllByText('BK-AVA1111')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('BK-PAY2222')).toBeInTheDocument()
    expect(screen.getByText('INV-PHL3333')).toBeInTheDocument()
    expect(screen.getByText('500.00')).toBeInTheDocument()
    expect(screen.getByText('1200.00')).toBeInTheDocument()
  })

  it('shows empty states when there is no recent activity', async () => {
    setUpMocks(mock, { recentBookings: [], recentPayments: [], recentInvoices: [] })
    renderDashboard()

    expect(await screen.findByText('No bookings yet')).toBeInTheDocument()
    expect(screen.getByText('No payments yet')).toBeInTheDocument()
    expect(screen.getByText('No invoices issued yet')).toBeInTheDocument()
  })

  it('degrades a single failed group without blanking the dashboard', async () => {
    let attempts = 0
    setUpMocks(mock, {
      invoicesHandler: () => {
        attempts += 1
        if (attempts === 1) return [500, { success: false, message: 'Server error' }]
        return [
          200,
          {
            success: true,
            data: RECENT_INVOICES,
            meta: { page: 1, per_page: 15, total: 12, last_page: 1 },
          },
        ]
      },
    })

    renderDashboard()

    expect((await screen.findAllByText("We couldn't load this section right now.")).length).toBeGreaterThanOrEqual(1)
    expect(within(await screen.findByRole('link', { name: /Bookings \d+/ })).getByText('13')).toBeInTheDocument()

    const retryButtons = screen.getAllByRole('button', { name: 'Retry' })
    expect(retryButtons.length).toBeGreaterThanOrEqual(1)
    retryButtons.forEach((button) => button.click())

    const invoicesStat = await screen.findByRole('link', { name: /Invoices issued \d+/ })
    await waitFor(() => {
      expect(within(invoicesStat).getByText('12')).toBeInTheDocument()
    })
  })

  it('shows role-aware quick actions for admin and manager roles', async () => {
    setUpMocks(mock)
    renderDashboard()

    expect(await screen.findByText('Quick actions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View bookings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Process payments' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create room' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New room type' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New discount' })).toBeInTheDocument()
  })

  it('hides admin-only quick actions from receptionists', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isStaff: true,
      user: { name: 'Receptionist One', role: 'receptionist', email: 'recep@example.com' },
      hasRole: () => false,
    })
    setUpMocks(mock)
    renderDashboard()

    expect(await screen.findByText('Quick actions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View bookings' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create room' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New room type' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New discount' })).not.toBeInTheDocument()
  })
})