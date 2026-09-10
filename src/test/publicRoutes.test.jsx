import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import CustomerApp from '../routes/CustomerApp'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'

function renderAsGuest(path) {
  useAuth.mockReturnValue({
    isAuthenticated: false,
    isCustomer: false,
    isStaff: false,
    isLoading: false,
    hasRole: () => false,
  })

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/*" element={<CustomerApp />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Public routes guest access', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the home page for guests', async () => {
    mock.onGet('/public/room-types').reply(200, { success: true, data: [], meta: {} })
    renderAsGuest('/')
    expect(await screen.findByText('GrandVista Hotel')).toBeInTheDocument()
    expect(screen.getAllByText('Browse Rooms').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the rooms page for guests', async () => {
    mock.onGet('/public/room-types').reply(200, { success: true, data: [], meta: {} })
    renderAsGuest('/rooms')
    expect(await screen.findByText('Rooms & Suites')).toBeInTheDocument()
  })

  it('renders the room details page for guests', async () => {
    mock.onGet('/public/room-types/5').reply(200, { success: true, data: { id: 5, name: 'Deluxe Suite', base_price: '189.00', capacity_adults: 2, capacity_children: 1 } })
    mock.onGet('/public/room-types/5/images').reply(200, { success: true, data: [] })
    mock.onGet('/public/rooms').reply(200, { success: true, data: [], meta: {} })
    renderAsGuest('/rooms/5')
    expect(await screen.findByText('Deluxe Suite')).toBeInTheDocument()
  })

  it('renders the availability search page for guests', async () => {
    mock.onGet('/public/rooms').reply(200, { success: true, data: [], meta: {} })
    renderAsGuest('/availability')
    expect(await screen.findByText('Check availability')).toBeInTheDocument()
  })

  it('navigates from home to rooms', async () => {
    mock.onGet('/public/room-types').reply(200, { success: true, data: [], meta: {} })
    renderAsGuest('/')
    const roomsLinks = await screen.findAllByRole('link', { name: 'Rooms' })
    expect(roomsLinks.length).toBeGreaterThan(0)
    expect(roomsLinks[0]).toHaveAttribute('href', '/rooms')
  })
})