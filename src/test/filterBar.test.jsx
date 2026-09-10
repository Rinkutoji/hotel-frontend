import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterBar from '../components/customer/FilterBar'

describe('FilterBar', () => {
  it('renders filter controls', () => {
    render(<FilterBar filters={{}} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Min price')).toBeInTheDocument()
    expect(screen.getByLabelText('Max price')).toBeInTheDocument()
    expect(screen.getByLabelText('Guests (adults)')).toBeInTheDocument()
    expect(screen.getByLabelText('Children')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument()
    expect(screen.getByLabelText('Direction')).toBeInTheDocument()
  })

  it('calls onChange with a price filter on blur', () => {
    const onChange = vi.fn()
    render(<FilterBar filters={{}} onChange={onChange} />)
    const minPrice = screen.getByLabelText('Min price')
    fireEvent.change(minPrice, { target: { value: '100' } })
    fireEvent.blur(minPrice)
    expect(onChange).toHaveBeenCalledWith({ min_price: 100, page: 1 })
  })

  it('calls onChange with sort and direction for pages', () => {
    const onChange = vi.fn()
    render(<FilterBar filters={{}} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'base_price' } })
    expect(onChange).toHaveBeenCalledWith({ sort: 'base_price', page: 1 })

    const direction = screen.getByLabelText('Direction')
    fireEvent.change(direction, { target: { value: 'desc' } })
    expect(onChange).toHaveBeenCalledWith({ direction: 'desc', page: 1 })
  })

  it('shows a clear button when filters are active', () => {
    render(<FilterBar filters={{ min_price: 100 }} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('does not show clear when no filters are active', () => {
    render(<FilterBar filters={{}} onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })

  it('clear filters resets everything', () => {
    const onChange = vi.fn()
    render(<FilterBar filters={{ min_price: 100, sort: 'name' }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onChange).toHaveBeenCalledWith({
      search: undefined,
      min_price: undefined,
      max_price: undefined,
      min_adults: undefined,
      min_children: undefined,
      sort: undefined,
      direction: undefined,
      page: 1,
    })
  })

  it('accepts custom sort options', () => {
    const sortOptions = [
      { value: 'room_number', label: 'Room number' },
      { value: 'floor', label: 'Floor' },
    ]
    render(<FilterBar filters={{}} onChange={vi.fn()} sortOptions={sortOptions} />)
    fireEvent.click(screen.getByLabelText('Sort by'))
    expect(screen.getByRole('option', { name: 'Room number' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Floor' })).toBeInTheDocument()
  })
})