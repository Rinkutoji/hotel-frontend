import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Pagination from '../components/customer/Pagination'

describe('Pagination', () => {
  it('returns nothing when there is a single page', () => {
    const { container } = render(<Pagination currentPage={1} lastPage={1} onPageChange={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders page buttons and highlights the current page', () => {
    render(<Pagination currentPage={2} lastPage={5} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
  })

  it('calls onPageChange when a page is selected', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={2} lastPage={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('disables Previous on the first page and Next on the last page', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={5} lastPage={5} onPageChange={onPageChange} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('does not call onPageChange for out-of-range pages', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={1} lastPage={1} onPageChange={onPageChange} />)
    expect(onPageChange).not.toHaveBeenCalled()
  })
})