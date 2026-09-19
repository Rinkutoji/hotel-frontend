import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import PaymentDetail from '../pages/customer/PaymentDetail'

const basePayment = {
  id: 4,
  booking_id: 12,
  amount: '556.00',
  method: 'bank_transfer',
  status: 'pending',
  receipt_path: null,
  verified_by: null,
  verified_at: null,
  notes: null,
  created_at: '2026-09-14T10:00:00.000000Z',
  updated_at: '2026-09-14T10:00:00.000000Z',
  booking: {
    id: 12,
    booking_number: 'BK-ABCD1234',
    status: 'pending_payment',
    check_in_date: '2026-09-16',
    check_out_date: '2026-09-18',
    total_amount: '556.00',
    payment_deadline_at: '2026-12-01T12:00:00.000000Z',
  },
  verifiedBy: null,
}

function renderPage(id = '4') {
  return render(
    <MemoryRouter initialEntries={[`/payments/${id}`]}>
      <Routes>
        <Route path="/payments/:id" element={<PaymentDetail />} />
        <Route path="/bookings/:id" element={<div>BOOKING_DETAIL</div>} />
        <Route path="/bookings" element={<div>MY_BOOKINGS</div>} />
        <Route path="/invoices" element={<div>INVOICES</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PaymentDetail page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
    vi.restoreAllMocks()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/customer/payments/4').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows the payment and booking details', async () => {
    mock.onGet('/customer/payments/4').reply(200, { success: true, data: basePayment })
    renderPage()
    expect(await screen.findByText('Payment #4')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('556.00')).toBeInTheDocument()
    expect(screen.getByText('Bank transfer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'BK-ABCD1234' })).toHaveAttribute('href', '/bookings/12')
  })

  it('shows the receipt upload form for a pending payment', async () => {
    mock.onGet('/customer/payments/4').reply(200, { success: true, data: basePayment })
    renderPage()
    expect(await screen.findByText('Upload payment receipt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload receipt' })).toBeDisabled()
  })

  it('shows the uploaded receipt controls and allows replacing it', async () => {
    mock.onGet('/customer/payments/4').reply(200, {
      success: true,
      data: { ...basePayment, status: 'receipt_uploaded' },
    })
    renderPage()
    expect(await screen.findByText('Receipt uploaded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View receipt' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Upload payment receipt')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Replace receipt' }))
    expect(await screen.findByLabelText('Upload payment receipt')).toBeInTheDocument()
  })

  it('shows the verified state with the verifier and invoice link', async () => {
    mock.onGet('/customer/payments/4').reply(200, {
      success: true,
      data: {
        ...basePayment,
        status: 'verified',
        verified_at: '2026-09-14T11:00:00.000000Z',
        verifiedBy: { id: 2, name: 'Jane Doe' },
      },
    })
    renderPage()
    expect((await screen.findAllByText('Verified')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Verified by Jane Doe/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View my invoices' })).toHaveAttribute('href', '/invoices')
  })

  it('shows the rejection reason and a new upload form when rejected', async () => {
    mock.onGet('/customer/payments/4').reply(200, {
      success: true,
      data: { ...basePayment, status: 'rejected', notes: 'The receipt was unreadable.' },
    })
    renderPage()
    expect(await screen.findByText('Payment rejected')).toBeInTheDocument()
    expect(screen.getByText('The receipt was unreadable.')).toBeInTheDocument()
    expect(screen.getByLabelText('Upload payment receipt')).toBeInTheDocument()
  })

  it('shows the refunded state with notes', async () => {
    mock.onGet('/customer/payments/4').reply(200, {
      success: true,
      data: { ...basePayment, status: 'refunded', notes: 'Refunded to your account.' },
    })
    renderPage()
    expect(await screen.findByText('Payment refunded')).toBeInTheDocument()
    expect(screen.getByText('Refunded to your account.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View receipt' })).toBeInTheDocument()
  })

  it('rejects an unsupported file type before uploading', async () => {
    mock.onGet('/customer/payments/4').reply(200, { success: true, data: basePayment })
    renderPage()
    const file = new File(['notes'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(await screen.findByLabelText('Upload payment receipt'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload receipt' }))

    expect(await screen.findByText(/Unsupported file type/)).toBeInTheDocument()
    expect(mock.history.post.filter((request) => request.url === '/customer/payments/4/receipt')).toHaveLength(0)
  })

  it('rejects a file larger than 4MB before uploading', async () => {
    mock.onGet('/customer/payments/4').reply(200, { success: true, data: basePayment })
    renderPage()
    const bigFile = new File([new ArrayBuffer(4 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    fireEvent.change(await screen.findByLabelText('Upload payment receipt'), { target: { files: [bigFile] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload receipt' }))

    expect(await screen.findByText(/File is too large/)).toBeInTheDocument()
    expect(mock.history.post.filter((request) => request.url === '/customer/payments/4/receipt')).toHaveLength(0)
  })

  it('uploads a valid receipt and refreshes the payment status', async () => {
    let uploaded = false
    mock.onGet('/customer/payments/4').reply(() => [
      200,
      { success: true, data: uploaded ? { ...basePayment, status: 'receipt_uploaded' } : basePayment },
    ])
    mock.onPost('/customer/payments/4/receipt').reply(() => {
      uploaded = true
      return [200, { success: true, data: { ...basePayment, status: 'receipt_uploaded' } }]
    })
    renderPage()
    const file = new File(['receipt'], 'receipt.png', { type: 'image/png' })
    fireEvent.change(await screen.findByLabelText('Upload payment receipt'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload receipt' }))

    expect(await screen.findByText('Receipt uploaded')).toBeInTheDocument()
    const config = mock.history.post.find((request) => request.url === '/customer/payments/4/receipt')
    expect(config.data).toBeInstanceOf(FormData)
    expect(config.data.get('receipt')).toBe(file)
  })

  it('surfaces an upload failure', async () => {
    mock.onGet('/customer/payments/4').reply(200, { success: true, data: basePayment })
    mock.onPost('/customer/payments/4/receipt').reply(409, {
      success: false,
      message: 'This payment is already verified and cannot be changed.',
      errors: null,
    })
    renderPage()
    const file = new File(['receipt'], 'receipt.png', { type: 'image/png' })
    fireEvent.change(await screen.findByLabelText('Upload payment receipt'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload receipt' }))

    expect(
      await screen.findByText('This payment is already verified and cannot be changed.'),
    ).toBeInTheDocument()
  })

  it('shows no receipt preview or view controls for a pending payment', async () => {
    mock.onGet('/customer/payments/4').reply(200, { success: true, data: basePayment })
    renderPage()
    await screen.findByText('Upload payment receipt')
    expect(screen.queryByRole('button', { name: 'Preview receipt' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View receipt' })).not.toBeInTheDocument()
  })

  it('previews an image receipt inline without fetching before the action', async () => {
    mock.onGet('/customer/payments/4').reply(200, {
      success: true,
      data: { ...basePayment, status: 'receipt_uploaded' },
    })
    mock.onGet('/customer/payments/4/receipt').reply(200, new Blob(['receipt'], { type: 'image/png' }))
    window.URL.createObjectURL = vi.fn(() => 'blob:preview')
    window.URL.revokeObjectURL = vi.fn()

    renderPage()
    expect(await screen.findByRole('button', { name: 'Preview receipt' })).toBeInTheDocument()
    expect(mock.history.get.filter((request) => request.url === '/customer/payments/4/receipt')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    const img = await screen.findByRole('img', { name: 'Payment receipt for payment #4' })
    expect(img).toHaveAttribute('src', 'blob:preview')
    expect(mock.history.get.filter((request) => request.url === '/customer/payments/4/receipt')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'View receipt' })).toBeInTheDocument()
  })

  it('shows the non-previewable note for a PDF receipt', async () => {
    mock.onGet('/customer/payments/4').reply(200, {
      success: true,
      data: { ...basePayment, status: 'verified', verifiedBy: { id: 2, name: 'Jane Doe' } },
    })
    mock.onGet('/customer/payments/4/receipt').reply(200, new Blob(['pdf'], { type: 'application/pdf' }))
    window.URL.createObjectURL = vi.fn(() => 'blob:pdf')
    window.URL.revokeObjectURL = vi.fn()

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Preview receipt' }))
    expect(await screen.findByText(/can't be previewed inline/)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('keeps the page usable when the receipt preview fetch fails', async () => {
    mock.onGet('/customer/payments/4').reply(200, {
      success: true,
      data: { ...basePayment, status: 'receipt_uploaded' },
    })
    mock.onGet('/customer/payments/4/receipt').reply(500, { success: false })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Preview receipt' }))
    expect(
      await screen.findByText('We could not load the receipt preview. Please try again.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View receipt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace receipt' })).toBeInTheDocument()
  })

  it('opens the receipt blob in a new tab', async () => {
    mock.onGet('/customer/payments/4').reply(200, {
      success: true,
      data: { ...basePayment, status: 'receipt_uploaded' },
    })
    mock.onGet('/customer/payments/4/receipt').reply(200, new Blob(['receipt']))
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    window.URL.createObjectURL = vi.fn(() => 'blob:mock')
    window.URL.revokeObjectURL = vi.fn()

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'View receipt' }))
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('blob:mock', '_blank', 'noopener'))
  })

  it('shows a friendly not-found state for a 404', async () => {
    mock.onGet('/customer/payments/4').reply(404, { success: false, message: 'Payment not found.', errors: null })
    renderPage()
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to my bookings' })).toBeInTheDocument()
  })

  it('shows an error state with retry on failure', async () => {
    mock.onGet('/customer/payments/4').reply(500, { success: false, message: 'Server error', errors: null })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows the payment deadline while the booking is pending payment', async () => {
    mock.onGet('/customer/payments/4').reply(200, { success: true, data: basePayment })
    renderPage()
    expect(await screen.findByText(/Payment deadline:/)).toBeInTheDocument()
  })
})