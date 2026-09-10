import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'
import Home from '../pages/customer/Home'

function renderHome(overrides = {}) {
  useAuth.mockReturnValue({
    isAuthenticated: false,
    isCustomer: false,
    isStaff: false,
    ...overrides,
  })

  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<div>ROOMS_PAGE</div>} />
        <Route path="/availability" element={<div>AVAIL_PAGE</div>} />
        <Route path="/profile" element={<div>PROFILE</div>} />
        <Route path="/staff/dashboard" element={<div>STAFF_DASH</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Home page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the hero section with CTAs', async () => {
    mock.onGet('/public/room-types').reply(200, { success: true, data: [], meta: {} })
    renderHome()
    expect(screen.getByText('GrandVista Hotel')).toBeInTheDocument()
    expect(screen.getAllByText('Browse Rooms').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Check Availability').length).toBeGreaterThanOrEqual(1)
  })

  it('shows featured room types', async () => {
    mock.onGet('/public/room-types').reply(200, {
      success: true,
      data: [{ id: 1, name: 'Standard Room', base_price: '89.00', capacity_adults: 2, capacity_children: 1 }],
      meta: { page: 1, per_page: 3, total: 1, last_page: 1 },
    })
    renderHome()
    expect(await screen.findByText('Standard Room')).toBeInTheDocument()
  })

  it('handles the featured rooms loading state gracefully', () => {
    mock.onGet('/public/room-types').reply(() => new Promise(() => {}))
    renderHome()
    expect(screen.getByText('GrandVista Hotel')).toBeInTheDocument()
  })

  it('shows the feature cards', async () => {
    mock.onGet('/public/room-types').reply(200, { success: true, data: [], meta: {} })
    renderHome()
    expect(screen.getAllByText('Browse Rooms').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Check Availability').length).toBeGreaterThanOrEqual(1)
  })

  it('shows the call to action section', async () => {
    mock.onGet('/public/room-types').reply(200, { success: true, data: [], meta: {} })
    renderHome()
    expect(screen.getByText('Looking for the perfect stay?')).toBeInTheDocument()
  })

  it('redirects staff users to the staff dashboard', async () => {
    mock.onGet('/public/room-types').reply(200, { success: true, data: [], meta: {} })
    renderHome({ isAuthenticated: true, isStaff: true, isCustomer: false })
    await waitFor(() => expect(screen.getByText('STAFF_DASH')).toBeInTheDocument())
  })
})