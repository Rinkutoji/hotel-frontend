import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RoomTypeCard from '../components/customer/RoomTypeCard'

const roomType = {
  id: 5,
  name: 'Deluxe Suite',
  description: 'A spacious suite with a living area.',
  base_price: '189.00',
  capacity_adults: 2,
  capacity_children: 2,
  amenities: ['wifi', 'tv', 'air conditioning', 'minibar', 'balcony'],
}

function renderCard(overrides = {}) {
  return render(
    <MemoryRouter>
      <RoomTypeCard roomType={{ ...roomType, ...overrides }} />
    </MemoryRouter>,
  )
}

describe('RoomTypeCard', () => {
  it('renders the room type name, price and capacity', () => {
    renderCard()
    expect(screen.getByText('Deluxe Suite')).toBeInTheDocument()
    expect(screen.getByText('189.00')).toBeInTheDocument()
    expect(screen.getByText('2 adults')).toBeInTheDocument()
    expect(screen.getByText('2 children')).toBeInTheDocument()
  })

  it('renders up to 4 amenities and a count overflow', () => {
    renderCard()
    expect(screen.getByText('wifi')).toBeInTheDocument()
    expect(screen.getByText('tv')).toBeInTheDocument()
    expect(screen.getByText('air conditioning')).toBeInTheDocument()
    expect(screen.getByText('minibar')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('does not render a children count when capacity is zero', () => {
    renderCard({ capacity_children: 0 })
    expect(screen.queryByText(/child/)).toBeNull()
  })

  it('links to the room type detail page', () => {
    render(<MemoryRouter><RoomTypeCard roomType={roomType} /></MemoryRouter>)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/rooms/5')
  })

  it('renders without amenities when none are provided', () => {
    renderCard({ amenities: null })
    expect(screen.queryByText('wifi')).toBeNull()
  })
})