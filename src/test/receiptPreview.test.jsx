import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ReceiptPreview from '../components/common/ReceiptPreview'

function blobOf(type) {
  return new Blob(['receipt'], { type })
}

describe('ReceiptPreview', () => {
  beforeEach(() => {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock')
    window.URL.revokeObjectURL = vi.fn()
  })

  it('does not request the receipt until the preview action is triggered', () => {
    const download = vi.fn().mockResolvedValue({ data: blobOf('image/png') })
    render(<ReceiptPreview paymentId={4} download={download} />)
    expect(screen.getByRole('button', { name: 'Preview receipt' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(download).not.toHaveBeenCalled()
  })

  it('shows a loading indicator while fetching the receipt', () => {
    const download = vi.fn().mockReturnValue(new Promise(() => {}))
    render(<ReceiptPreview paymentId={4} download={download} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading receipt…')).toBeInTheDocument()
  })

  it('renders an inline thumbnail for an image receipt', async () => {
    const blob = blobOf('image/png')
    const download = vi.fn().mockResolvedValue({ data: blob })
    render(<ReceiptPreview paymentId={4} download={download} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    expect(
      await screen.findByRole('img', { name: 'Payment receipt for payment #4' }),
    ).toBeInTheDocument()
    expect(download).toHaveBeenCalledTimes(1)
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob)
  })

  it('does not refetch when reopening an already-loaded preview', async () => {
    const download = vi.fn().mockResolvedValue({ data: blobOf('image/png') })
    render(<ReceiptPreview paymentId={4} download={download} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    await screen.findByRole('img', { name: 'Payment receipt for payment #4' })
    fireEvent.click(screen.getByRole('button', { name: 'Hide preview' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    expect(
      await screen.findByRole('img', { name: 'Payment receipt for payment #4' }),
    ).toBeInTheDocument()
    expect(download).toHaveBeenCalledTimes(1)
  })

  it('shows the non-previewable message for a PDF receipt and caches the decision', async () => {
    const download = vi.fn().mockResolvedValue({ data: blobOf('application/pdf') })
    render(<ReceiptPreview paymentId={4} download={download} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    expect(await screen.findByText(/can't be previewed inline/)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide preview' }))
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    expect(await screen.findByText(/can't be previewed inline/)).toBeInTheDocument()
    expect(download).toHaveBeenCalledTimes(1)
  })

  it('treats an unknown or empty blob type as non-previewable', async () => {
    const download = vi.fn().mockResolvedValue({ data: blobOf('') })
    render(<ReceiptPreview paymentId={4} download={download} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    expect(await screen.findByText(/can't be previewed inline/)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('revokes the object URL when the preview is closed', async () => {
    const download = vi.fn().mockResolvedValue({ data: blobOf('image/jpeg') })
    render(<ReceiptPreview paymentId={4} download={download} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    await screen.findByRole('img', { name: 'Payment receipt for payment #4' })
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Hide preview' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('revokes the object URL on unmount', async () => {
    const download = vi.fn().mockResolvedValue({ data: blobOf('image/png') })
    const { unmount } = render(<ReceiptPreview paymentId={4} download={download} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    await screen.findByRole('img', { name: 'Payment receipt for payment #4' })
    unmount()
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('shows an inline error and retries loading', async () => {
    const download = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: blobOf('image/png') })
    render(<ReceiptPreview paymentId={4} download={download} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview receipt' }))
    expect(
      await screen.findByText('We could not load the receipt preview. Please try again.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('img', { name: 'Payment receipt for payment #4' }),
    ).toBeInTheDocument()
    expect(download).toHaveBeenCalledTimes(2)
  })
})