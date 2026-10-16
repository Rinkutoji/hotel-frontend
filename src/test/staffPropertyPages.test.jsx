import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import Properties from '../pages/staff/Properties'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

const property = {
  id: 1,
  name: 'Main Hotel',
  code: 'MAIN',
  description: 'The main property',
  address: '1 Main St',
  city: 'Phnom Penh',
  province_state: null,
  country: 'Cambodia',
  postal_code: null,
  latitude: null,
  longitude: null,
  phone: null,
  email: null,
  website: null,
  check_in_time: '14:00:00',
  check_out_time: '12:00:00',
  timezone: null,
  currency: 'USD',
  status: 'active',
  buildings_count: 2,
  rooms_count: 12,
}

const propertyB = { ...property, id: 2, name: 'Hotel B', code: 'B', city: 'Siem Reap', buildings_count: 1, rooms_count: 5 }

const emptyMeta = { page: 1, per_page: 15, total: 0, last_page: 1 }

describe('Staff properties list page', () => {
  let mock

  function lastPropertiesRequest() {
    return mock.history.get.findLast((request) => request.url === '/staff/properties')
  }

  function renderPage(initialEntry = '/staff/properties') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Properties />
      </MemoryRouter>,
    )
  }

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
    mock.onGet('/staff/properties').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a list of property cards', async () => {
    mock.onGet('/staff/properties').reply(200, {
      success: true,
      data: [property, propertyB],
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('Main Hotel')).toBeInTheDocument()
    expect(screen.getByText('Hotel B')).toBeInTheDocument()
    expect(screen.getByText('2 buildings · 12 rooms')).toBeInTheDocument()
    expect(screen.getByText('1 buildings · 5 rooms')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New property' })).toBeInTheDocument()
  })

  it('filters by status via URL params', async () => {
    mock.onGet('/staff/properties').reply(200, {
      success: true,
      data: [property],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    renderPage('/staff/properties?status=inactive')
    await screen.findByText('Main Hotel')
    expect(lastPropertiesRequest().params).toEqual({ page: 1, status: 'inactive' })
  })

  it('filters by code via URL params', async () => {
    mock.onGet('/staff/properties').reply(200, {
      success: true,
      data: [property],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    renderPage('/staff/properties?code=MAIN')
    await screen.findByText('Main Hotel')
    expect(lastPropertiesRequest().params).toEqual({ page: 1, code: 'MAIN' })
  })

  it('shows an empty state when no properties match filters', async () => {
    mock.onGet('/staff/properties').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage('/staff/properties?status=inactive')
    expect(await screen.findByText('No properties found')).toBeInTheDocument()
    expect(screen.getByText('No properties match your filters.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    await waitFor(() => {
      expect(lastPropertiesRequest().params).toEqual({ page: 1 })
    })
  })

  it('shows an empty state without filter actions when there are no filters', async () => {
    mock.onGet('/staff/properties').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage()
    expect(await screen.findByText('No properties found')).toBeInTheDocument()
    expect(screen.getByText('There are no properties yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    let attempts = 0
    mock.onGet('/staff/properties').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: [property], meta: { page: 1, per_page: 15, total: 1, last_page: 1 } }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Main Hotel')).toBeInTheDocument()
  })

  it('hides the New property link for receptionists', async () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Receptionist', role: 'receptionist', email: 'rec@example.com' },
      hasRole: (roles) => roles.includes('receptionist'),
    })
    mock.onGet('/staff/properties').reply(200, {
      success: true,
      data: [property],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    renderPage()
    await screen.findByText('Main Hotel')
    expect(screen.queryByRole('link', { name: 'New property' })).not.toBeInTheDocument()
  })

  it('hides filter controls for receptionists', async () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'Receptionist', role: 'receptionist', email: 'rec@example.com' },
      hasRole: (roles) => roles.includes('receptionist'),
    })
    mock.onGet('/staff/properties').reply(200, {
      success: true,
      data: [property],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    renderPage()
    await screen.findByText('Main Hotel')
    expect(screen.queryByLabelText('Code')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
  })
})