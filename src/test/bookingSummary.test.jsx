import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import BookingSummary from '../components/customer/BookingSummary'
import { centsToMoney, moneyToCents, nightsBetween, parseRoomIds } from '../utils/booking'

const checkIn = '2026-09-16'
const checkOut = '2026-09-18'

const standardRoom = { id: 1, roomNumber: '101', floor: 1, price: '89.00', roomTypeName: 'Standard Room' }
const deluxeRoom = { id: 2, roomNumber: '202', floor: 2, price: '189.00', roomTypeName: 'Deluxe Suite' }

describe('booking utilities', () => {
  it('computes nights between two dates', () => {
    expect(nightsBetween('2026-09-16', '2026-09-18')).toBe(2)
    expect(nightsBetween('2026-09-16', '2026-09-16')).toBe(0)
  })

  it('parses room ids from a URL string', () => {
    expect(parseRoomIds('1,2,3')).toEqual([1, 2, 3])
    expect(parseRoomIds(' 1 , 2 ')).toEqual([1, 2])
    expect(parseRoomIds('abc,1.5,0,-1')).toEqual([])
    expect(parseRoomIds('')).toEqual([])
    expect(parseRoomIds(null)).toEqual([])
  })

  it('converts money between decimal strings and cents', () => {
    expect(moneyToCents('89.00')).toBe(8900)
    expect(moneyToCents('189.50')).toBe(18950)
    expect(centsToMoney(8900)).toBe('89.00')
    expect(centsToMoney(55600)).toBe('556.00')
  })
})

describe('BookingSummary', () => {
  it('renders the dates and nights', () => {
    render(<BookingSummary checkInDate={checkIn} checkOutDate={checkOut} items={[]} total={null} />)
    expect(screen.getByText('Booking summary')).toBeInTheDocument()
    expect(screen.getAllByText('2 nights').length).toBeGreaterThanOrEqual(1)
  })

  it('renders each room with its price per night', () => {
    render(
      <BookingSummary
        checkInDate={checkIn}
        checkOutDate={checkOut}
        items={[standardRoom, deluxeRoom]}
        total={null}
      />,
    )
    expect(screen.getByText('Room 101 · Standard Room')).toBeInTheDocument()
    expect(screen.getByText('Room 202 · Deluxe Suite')).toBeInTheDocument()
    expect(screen.getByText('89.00')).toBeInTheDocument()
    expect(screen.getByText('189.00')).toBeInTheDocument()
  })

  it('shows an estimated total from the items when no total is provided', () => {
    render(
      <BookingSummary checkInDate={checkIn} checkOutDate={checkOut} items={[standardRoom, deluxeRoom]} total={null} />,
    )
    expect(screen.getByText('Estimated total')).toBeInTheDocument()
    expect(screen.getByText('556.00')).toBeInTheDocument()
  })

  it('shows the authoritative total when provided', () => {
    render(
      <BookingSummary checkInDate={checkIn} checkOutDate={checkOut} items={[standardRoom]} total="178.00" />,
    )
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('178.00')).toBeInTheDocument()
  })

  it('renders a per-room discount line when present', () => {
    const discounted = {
      ...standardRoom,
      discount: {
        name: 'Extended Stay',
        percent_off: 10,
        discounted_price_per_night: '80.10',
      },
    }
    render(<BookingSummary checkInDate={checkIn} checkOutDate={checkOut} items={[discounted]} total={null} />)
    expect(screen.getByText(/80.10\/night with Extended Stay \(10% off\)/)).toBeInTheDocument()
    expect(screen.getByText('80.10')).toBeInTheDocument()
  })
})