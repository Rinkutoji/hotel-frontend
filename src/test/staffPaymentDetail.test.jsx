import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import PaymentDetail from '../pages/staff/PaymentDetail'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

const baseAuth = {
  user: { name: 'Admin User', role: 'admin', email: 'admin@example.com' },
  hasRole: (roles) => roles.includes('admin'),
}

function renderDetail(initialEntry = '/staff/payments/4') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/staff/payments" element={<div>PAYMENTS_LIST</div>} />
        <Route path="/staff/payments/:id" element={<PaymentDetail />} />
        <Route path="/staff/bookings/:id" element={<div>BOOKING_DETAIL</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function makePayment(overrides = {}) {
  return {
    id: 4,
    booking_id: 7,
    amount: '1500.00',
    method: 'bank_transfer',
    status: 'pending',
    verified_by: null,
    verified_at: null,
    notes: null,
    created_at: '2026-09-14T10:00:00.000000Z',
    updated_at: '2026-09-14T10:00:00.000000Z',
    verifiedBy: null,
    booking: {
      id: 7,
      booking_number: 'BK-ABCD1234',
      status: 'pending_payment',
      check_in_date: '2026-10-01',
      check_out_date: '2026-10-05',
      total_amount: '1500.00',
      customer: { id: 3, name: 'John Doe', email: 'john@example.com' },
    },
    ...overrides,
  }
}

describe('Staff payment detail page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue(baseAuth)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/payments/4').reply(() => new Promise(() => {}))
    renderDetail()
    expect(screen.getByText('Payment details')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows a friendly not-found state for a 404', async () => {
    mock.onGet('/staff/payments/4').reply(404, { success: false, message: 'Payment not found.', errors: null })
    renderDetail()
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to payments' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows an error state with retry for other failures', async () => {
    let attempts = 0
    mock.onGet('/staff/payments/4').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: makePayment() }]
    })
    renderDetail()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('BK-ABCD1234')).toBeInTheDocument()
  })

  it('renders payment summary fields and the status badge', async () => {
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: makePayment() })
    renderDetail()
    expect(await screen.findByText('Payment summary')).toBeInTheDocument()
    expect(screen.getByText('1500.00')).toBeInTheDocument()
    expect(screen.getByText('Bank transfer')).toBeInTheDocument()
    expect(screen.getByText('Payment #4')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders the booking card with link, customer, and dates', async () => {
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: makePayment() })
    renderDetail()
    expect(await screen.findByText('Booking')).toBeInTheDocument()
    expect(screen.getByText('BK-ABCD1234')).toBeInTheDocument()
    const bookingLink = screen.getByText('BK-ABCD1234')
    expect(bookingLink).toHaveAttribute('href', '/staff/bookings/7')
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('2026-10-01')).toBeInTheDocument()
    expect(screen.getByText('2026-10-05')).toBeInTheDocument()
  })

  it('shows awaiting-receipt message and no view-receipt button when pending', async () => {
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: makePayment() })
    renderDetail()
    expect(await screen.findByText('Awaiting receipt upload from the guest.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View receipt' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verify payment' })).not.toBeInTheDocument()
  })

  it('shows view-receipt button, verify, and reject actions for receipt_uploaded', async () => {
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: makePayment({ status: 'receipt_uploaded' }) })
    renderDetail()
    await screen.findByText('Payment summary')
    expect(screen.getByRole('button', { name: 'View receipt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify payment' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject payment' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refund payment' })).not.toBeInTheDocument()
  })

  it('shows verified-by line and view-receipt for verified payments', async () => {
    const verifiedPayment = makePayment({
      status: 'verified',
      verified_by: 5,
      verified_at: '2026-09-15T12:00:00.000000Z',
      verifiedBy: { id: 5, name: 'Admin User' },
    })
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: verifiedPayment })
    renderDetail()
    await screen.findByText('Payment summary')
    expect(screen.getByText(/Verified by Admin User/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View receipt' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verify payment' })).not.toBeInTheDocument()
  })

  it('shows reject reason and no verify button for rejected payments', async () => {
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'rejected', notes: 'Receipt illegible' }),
    })
    renderDetail()
    await screen.findByText('Payment rejected')
    expect(screen.getByText('Receipt illegible')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Verify payment' })).not.toBeInTheDocument()
  })

  it('shows refund reason and cancellation note for refunded payments', async () => {
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'refunded', notes: 'Guest requested' }),
    })
    renderDetail()
    await screen.findByText('Payment refunded')
    expect(screen.getByText('Guest requested')).toBeInTheDocument()
    expect(screen.getByText('The associated booking was cancelled.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refund payment' })).not.toBeInTheDocument()
  })

  it('shows the refund button for admin users when verified', async () => {
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'verified' }),
    })
    renderDetail()
    expect(await screen.findByRole('button', { name: 'Refund payment' })).toBeInTheDocument()
  })

  it('hides the refund button and shows a role hint for receptionists', async () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Receptionist', role: 'receptionist', email: 'rec@example.com' },
      hasRole: (roles) => roles.includes('receptionist'),
    })
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'verified' }),
    })
    renderDetail()
    await screen.findByText('Payment summary')
    expect(screen.queryByRole('button', { name: 'Refund payment' })).not.toBeInTheDocument()
    expect(screen.getByText('Refunds require manager or admin access.')).toBeInTheDocument()
  })

  it('verifies a payment and shows a success banner', async () => {
    let status = 'receipt_uploaded'
    mock.onGet('/staff/payments/4').reply(() => [
      200,
      { success: true, data: makePayment({ status }) },
    ])
    mock.onPost('/staff/payments/4/verify').reply(() => {
      status = 'verified'
      return [200, { success: true, message: 'Payment verified.', data: makePayment({ status }) }]
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Verify payment' }))
    expect(await screen.findByText(/Payment verified\. The booking was confirmed/)).toBeInTheDocument()
    expect(mock.history.post.some((r) => r.url === '/staff/payments/4/verify')).toBe(true)
  })

  it('rejects a payment with a reason and shows a success banner', async () => {
    let status = 'receipt_uploaded'
    mock.onGet('/staff/payments/4').reply(() => [
      200,
      { success: true, data: makePayment({ status }) },
    ])
    mock.onPost('/staff/payments/4/reject').reply(() => {
      status = 'rejected'
      return [200, { success: true, message: 'Payment rejected.', data: makePayment({ status }) }]
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Reject payment' }))
    expect(screen.getByText(/Reject this payment receipt\?/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Reason \(required\)/), { target: { value: 'Receipt illegible' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(await screen.findByText('Payment rejected.')).toBeInTheDocument()
    const config = mock.history.post.find((r) => r.url === '/staff/payments/4/reject')
    expect(JSON.parse(config.data)).toEqual({ reason: 'Receipt illegible' })
  })

  it('disables the reject submit button until a reason is typed', async () => {
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'receipt_uploaded' }),
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Reject payment' }))
    const submit = screen.getByRole('button', { name: 'Confirm rejection' })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Reason \(required\)/), { target: { value: 'Blurry' } })
    expect(submit).toBeEnabled()
  })

  it('dismisses the reject form and clears state', async () => {
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'receipt_uploaded' }),
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Reject payment' }))
    expect(screen.getByText(/Reject this payment receipt\?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep payment' }))
    expect(screen.queryByText(/Reject this payment receipt\?/)).not.toBeInTheDocument()
    expect(mock.history.post.some((r) => r.url === '/staff/payments/4/reject')).toBe(false)
  })

  it('refunds a payment with a reason and shows a success banner', async () => {
    let status = 'verified'
    mock.onGet('/staff/payments/4').reply(() => [
      200,
      { success: true, data: makePayment({ status }) },
    ])
    mock.onPost('/staff/payments/4/refund').reply(() => {
      status = 'refunded'
      return [200, { success: true, message: 'Payment refunded.', data: makePayment({ status }) }]
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Refund payment' }))
    expect(screen.getByText(/Refund this payment\?/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Reason \(required\)/), { target: { value: 'Guest cancelled' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm refund' }))
    expect(await screen.findByText(/Payment refunded\. The booking was cancelled/)).toBeInTheDocument()
    const config = mock.history.post.find((r) => r.url === '/staff/payments/4/refund')
    expect(JSON.parse(config.data)).toEqual({ reason: 'Guest cancelled' })
  })

  it('disables the refund submit button until a reason is typed', async () => {
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'verified' }),
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Refund payment' }))
    const submit = screen.getByRole('button', { name: 'Confirm refund' })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Reason \(required\)/), { target: { value: 'Changed mind' } })
    expect(submit).toBeEnabled()
  })

  it('surfaces the server message on a 409 conflict and refetches', async () => {
    let callCount = 0
    mock.onGet('/staff/payments/4').reply(() => {
      callCount += 1
      return [200, { success: true, data: makePayment({ status: 'receipt_uploaded' }) }]
    })
    mock.onPost('/staff/payments/4/verify').reply(409, {
      success: false,
      message: 'This booking has expired and has been automatically cancelled.',
      errors: null,
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Verify payment' }))
    expect(await screen.findByText('This booking has expired and has been automatically cancelled.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify payment' })).toBeInTheDocument()
  })

  it('surfaces a 422 reason field error on reject', async () => {
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'receipt_uploaded' }),
    })
    mock.onPost('/staff/payments/4/reject').reply(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { reason: ['The reason field is required.'] },
    })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Reject payment' }))
    fireEvent.change(screen.getByLabelText(/Reason \(required\)/), { target: { value: 'Bad' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    expect(await screen.findByText(/reason field is required/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeInTheDocument()
  })

  it('shows no preview control for a pending payment', async () => {
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: makePayment() })
    renderDetail()
    await screen.findByText('Awaiting receipt upload from the guest.')
    expect(screen.queryByRole('button', { name: 'Preview receipt' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View receipt' })).not.toBeInTheDocument()
  })

  it('previews an image receipt inline from the receipt_uploaded state', async () => {
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'receipt_uploaded' }),
    })
    mock.onGet('/staff/payments/4/receipt').reply(200, new Blob(['receipt'], { type: 'image/jpeg' }))
    window.URL.createObjectURL = vi.fn(() => 'blob:preview')
    window.URL.revokeObjectURL = vi.fn()

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Preview receipt' }))
    const img = await screen.findByRole('img', { name: 'Payment receipt for payment #4' })
    expect(img).toHaveAttribute('src', 'blob:preview')
    expect(screen.getByRole('button', { name: 'View receipt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verify payment' })).toBeInTheDocument()
  })

  it('allows previewing the receipt from the rejected state', async () => {
    mock.onGet('/staff/payments/4').reply(200, {
      success: true,
      data: makePayment({ status: 'rejected', notes: 'Receipt illegible' }),
    })
    mock.onGet('/staff/payments/4/receipt').reply(200, new Blob(['receipt'], { type: 'image/png' }))
    window.URL.createObjectURL = vi.fn(() => 'blob:preview')
    window.URL.revokeObjectURL = vi.fn()

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Preview receipt' }))
    expect(
      await screen.findByRole('img', { name: 'Payment receipt for payment #4' }),
    ).toBeInTheDocument()
  })

  it('shows the non-previewable note for a PDF receipt', async () => {
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: makePayment({ status: 'verified' }) })
    mock.onGet('/staff/payments/4/receipt').reply(200, new Blob(['pdf'], { type: 'application/pdf' }))
    window.URL.createObjectURL = vi.fn(() => 'blob:pdf')
    window.URL.revokeObjectURL = vi.fn()

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Preview receipt' }))
    expect(await screen.findByText(/can't be previewed inline/)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('opens the receipt in a new window when view receipt is clicked', async () => {
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: makePayment({ status: 'receipt_uploaded' }) })
    mock.onGet('/staff/payments/4/receipt').reply(200, new Blob(['file-content']))
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'View receipt' }))
    await waitFor(() => {
      expect(mock.history.get.some((r) => r.url === '/staff/payments/4/receipt' && r.responseType === 'blob')).toBe(true)
    })
    expect(screen.getByRole('button', { name: 'View receipt' })).toBeInTheDocument()
  })

  it('shows an error message when receipt download fails', async () => {
    mock.onGet('/staff/payments/4').reply(200, { success: true, data: makePayment({ status: 'receipt_uploaded' }) })
    mock.onGet('/staff/payments/4/receipt').reply(404, { success: false, message: 'Receipt not found.', errors: null })
    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'View receipt' }))
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
  })

  it('links back to the payments list from the 404 page', async () => {
    mock.onGet('/staff/payments/4').reply(404, { success: false, message: 'Payment not found.', errors: null })
    renderDetail()
    const backLink = await screen.findByRole('link', { name: 'Back to payments' })
    expect(backLink).toHaveAttribute('href', '/staff/payments')
  })
})