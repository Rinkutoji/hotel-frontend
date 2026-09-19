import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DiscountCard from '../components/staff/DiscountCard'

function makeDiscount(overrides = {}) {
  return {
    id: 3,
    name: 'Week stay',
    min_nights: 3,
    percent_off: '15.00',
    ...overrides,
  }
}

function renderCard(discount, props = {}) {
  return render(
    <MemoryRouter>
      <DiscountCard discount={discount} busy={false} onDelete={vi.fn()} {...props} />
    </MemoryRouter>,
  )
}

describe('DiscountCard', () => {
  it('renders the name and pluralized nights threshold', () => {
    renderCard(makeDiscount())
    expect(screen.getByText('Week stay')).toBeInTheDocument()
    expect(screen.getByText('From 3 nights')).toBeInTheDocument()
  })

  it('uses the singular form for a one-night tier', () => {
    renderCard(makeDiscount({ min_nights: 1 }))
    expect(screen.getByText('From 1 night')).toBeInTheDocument()
  })

  it('renders percent_off verbatim with a percent label', () => {
    renderCard(makeDiscount())
    expect(screen.getByText('15.00%')).toBeInTheDocument()
  })

  it('links to the edit route', () => {
    renderCard(makeDiscount())
    const link = screen.getByRole('link', { name: 'Edit' })
    expect(link).toHaveAttribute('href', '/staff/discounts/3/edit')
  })

  it('asks for confirmation before calling onDelete', () => {
    const onDelete = vi.fn()
    renderCard(makeDiscount(), { onDelete })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText(/Delete discount “Week stay”\?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(onDelete).toHaveBeenCalledWith(3)
  })

  it('cancels the delete confirmation without calling onDelete', () => {
    const onDelete = vi.fn()
    renderCard(makeDiscount(), { onDelete })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText(/Delete discount/)).not.toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('disables the delete button while an action is running', () => {
    renderCard(makeDiscount(), { busy: true })
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })
})