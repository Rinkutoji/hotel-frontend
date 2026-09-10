import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import Rooms from '../pages/customer/Rooms'

function paginated(data, meta) {
  return [200, { success: true, data, meta }]
}

function renderAt(initialPath = '/rooms') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/:id" element={<div>DETAILS</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Rooms page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    vi.restoreAllMocks()
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders a list of room type cards', async () => {
    mock.onGet('/public/room-types').reply(
      ...paginated(
        [
          { id: 1, name: 'Standard Room', description: 'Comfortable', base_price: '89.00', capacity_adults: 2, capacity_children: 1, amenities: ['wifi'] },
          { id: 2, name: 'Deluxe Suite', description: 'Spacious', base_price: '189.00', capacity_adults: 2, capacity_children: 2, amenities: ['wifi'] },
        ],
        { page: 1, per_page: 12, total: 2, last_page: 1 },
      ),
    )
    renderAt()
    expect(await screen.findByText('Standard Room')).toBeInTheDocument()
    expect(screen.getByText('Deluxe Suite')).toBeInTheDocument()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/public/room-types').reply(() => new Promise(() => {}))
    renderAt()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error state with a retry on API failure', async () => {
    mock.onGet('/public/room-types').reply(500, { message: 'Server error' })
    renderAt()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows an empty state when there are no room types', async () => {
    mock.onGet('/public/room-types').reply(...paginated([], { page: 1, per_page: 12, total: 0, last_page: 1 }))
    renderAt()
    expect(await screen.findByText('No room types found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('sends search params to the API after debounce', async () => {
    mock.onGet('/public/room-types').reply(...paginated([], { page: 1, per_page: 12, total: 0, last_page: 1 }))
    renderAt()
    fireEvent.change(await screen.findByPlaceholderText('Search by room type name…'), {
      target: { value: 'suite' },
    })
    await waitFor(
      () => {
        const config = mock.history.get.findLast((c) => c.url === '/public/room-types')
        expect(config.params.search).toBe('suite')
      },
      { timeout: 1000, interval: 50 },
    )
  })

  it('sends filter params to the API', async () => {
    mock.onGet('/public/room-types').reply(...paginated([], { page: 1, per_page: 12, total: 0, last_page: 1 }))
    renderAt()
    const minPrice = await screen.findByLabelText('Min price')
    fireEvent.change(minPrice, { target: { value: '100' } })
    fireEvent.blur(minPrice)
    await waitFor(() => {
      const config = mock.history.get.findLast((c) => c.url === '/public/room-types')
      expect(config.params.min_price).toBe(100)
    })
  })

  it('renders pagination and navigates to the next page', async () => {
    const meta = { page: 1, per_page: 12, total: 25, last_page: 3 }
    mock
      .onGet('/public/room-types', { params: { page: 1, per_page: 12 } })
      .reply(...paginated([{ id: 1, name: 'A', base_price: '10.00' }], meta))
      .onGet('/public/room-types', { params: { page: 2, per_page: 12 } })
      .reply(...paginated([{ id: 2, name: 'B', base_price: '11.00' }], { ...meta, page: 2 }))

    renderAt()
    await screen.findByText('A')
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(await screen.findByText('B')).toBeInTheDocument()
  })
})