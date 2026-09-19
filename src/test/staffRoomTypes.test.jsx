import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import RoomTypes from '../pages/staff/RoomTypes'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

const roomTypes = [
  { id: 1, name: 'Standard', description: 'Cozy room', base_price: '120.00', capacity_adults: 2, capacity_children: 0, amenities: ['WiFi'] },
  { id: 2, name: 'Suite', description: 'Spacious suite', base_price: '250.00', capacity_adults: 3, capacity_children: 2, amenities: ['WiFi', 'Balcony', 'Mini bar', 'Jacuzzi', 'Safe'] },
]

const emptyMeta = { page: 1, per_page: 15, total: 0, last_page: 1 }

let mock

function lastListRequest() {
  return mock.history.get.findLast((request) => request.url === '/staff/room-types')
}

function renderPage(initialEntry = '/staff/room-types') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <RoomTypes />
    </MemoryRouter>,
  )
}

describe('Staff room types list page', () => {
  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({
      user: { name: 'Admin User', role: 'admin', email: 'admin@example.com' },
      hasRole: (roles) => roles.includes('admin'),
    })
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/room-types').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Room types')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a list of room type cards', async () => {
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: roomTypes,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('Standard')).toBeInTheDocument()
    expect(screen.getByText('Suite')).toBeInTheDocument()
    expect(screen.getByText('120.00')).toBeInTheDocument()
    expect(screen.getByText('250.00')).toBeInTheDocument()
  })

  it('calls the API with params derived from the URL search params', async () => {
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: roomTypes,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage('/staff/room-types?search=Suite&min_price=100&min_adults=2&page=2')
    await screen.findByText('Suite')
    expect(lastListRequest().params).toEqual({
      search: 'Suite',
      min_price: 100,
      min_adults: 2,
      page: 2,
    })
  })

  it('commits the price filter to the URL on blur', async () => {
    mock.onGet('/staff/room-types').reply(() => [
      200,
      { success: true, data: roomTypes, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    fireEvent.change(await screen.findByLabelText('Min price'), { target: { value: '100' } })
    fireEvent.blur(screen.getByLabelText('Min price'))
    await waitFor(() => {
      expect(lastListRequest().params).toEqual({ min_price: 100, page: 1 })
    })
  })

  it('preserves a 0 filter value in the API params (B3)', async () => {
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: roomTypes,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    // The old "x ?? x === 0" guard dropped 0 (falsy) - min_price=0 and
    // min_adults=0 disappeared from the request.
    renderPage('/staff/room-types?min_price=0&min_adults=0')
    await screen.findByText('Standard')
    expect(lastListRequest().params).toEqual({ min_price: 0, min_adults: 0, page: 1 })
  })

  it('omits nullish filters from the API params (B3)', async () => {
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: roomTypes,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage('/staff/room-types?max_price=&min_adults=')
    await screen.findByText('Standard')
    expect(lastListRequest().params).toEqual({ page: 1 })
  })

  it('updates the search filter in the URL after debounce', async () => {
    mock.onGet('/staff/room-types').reply(() => [
      200,
      { success: true, data: roomTypes, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    fireEvent.change(await screen.findByPlaceholderText('Search by room type name…'), {
      target: { value: 'Suite' },
    })
    await waitFor(
      () => {
        expect(lastListRequest().params).toEqual({ search: 'Suite', page: 1 })
      },
      { timeout: 1500, interval: 50 },
    )
  })

  it('shows an empty state that can clear filters', async () => {
    mock.onGet('/staff/room-types').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage('/staff/room-types?search=nope')
    expect(await screen.findByText('No room types configured')).toBeInTheDocument()
    expect(screen.getByText('No room types match your filters.')).toBeInTheDocument()
    const clearButtons = screen.getAllByRole('button', { name: 'Clear filters' })
    fireEvent.click(clearButtons[clearButtons.length - 1])
    await waitFor(() => {
      expect(lastListRequest().params).toEqual({ page: 1 })
    })
  })

  it('renders pagination when there is more than one page', async () => {
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: roomTypes,
      meta: { page: 1, per_page: 15, total: 24, last_page: 2 },
    })
    renderPage()
    expect(await screen.findByText('Standard')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
  })

  it('shows an error state with a retry button on failure', async () => {
    let attempts = 0
    mock.onGet('/staff/room-types').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: roomTypes, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Standard')).toBeInTheDocument()
  })

  it('shows the add button and card action links for admin users', async () => {
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: roomTypes,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    const addButton = await screen.findByRole('link', { name: 'Add room type' })
    expect(addButton).toHaveAttribute('href', '/staff/room-types/new')
    expect(screen.getAllByRole('link', { name: 'Edit' }).length).toBe(2)
    expect(screen.getAllByRole('link', { name: 'Images' }).length).toBe(2)
  })

  it('hides the add button and card action links for receptionists', async () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Receptionist', role: 'receptionist', email: 'rec@example.com' },
      hasRole: (roles) => roles.includes('receptionist'),
    })
    mock.onGet('/staff/room-types').reply(200, {
      success: true,
      data: roomTypes,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    await screen.findByText('Standard')
    expect(screen.queryByRole('link', { name: 'Add room type' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Images' })).not.toBeInTheDocument()
  })
})