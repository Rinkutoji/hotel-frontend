import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import DiscountList from '../pages/staff/DiscountList'

const discounts = [
  { id: 1, name: 'Week stay', min_nights: 3, percent_off: '15.00' },
  { id: 2, name: 'Fortnight', min_nights: 14, percent_off: '20.00' },
]

const emptyMeta = { page: 1, per_page: 15, total: 0, last_page: 1 }

let mock

function lastListRequest() {
  return mock.history.get.findLast((request) => request.url === '/staff/discounts')
}

function renderPage(initialEntry = '/staff/discounts') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DiscountList />
    </MemoryRouter>,
  )
}

describe('Staff discount list page', () => {
  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/discounts').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Discounts')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a list of discount cards', async () => {
    mock.onGet('/staff/discounts').reply(200, {
      success: true,
      data: discounts,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('Week stay')).toBeInTheDocument()
    expect(screen.getByText('Fortnight')).toBeInTheDocument()
    expect(screen.getByText('From 3 nights')).toBeInTheDocument()
    expect(screen.getByText('15.00%')).toBeInTheDocument()
    expect(screen.getByText('20.00%')).toBeInTheDocument()
  })

  it('calls the API with params derived from the URL search params', async () => {
    mock.onGet('/staff/discounts').reply(200, {
      success: true,
      data: discounts,
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage('/staff/discounts?search=Stay&page=2')
    await screen.findByText('Week stay')
    expect(lastListRequest().params).toEqual({ search: 'Stay', page: 2 })
  })

  it('shows an empty state with filter hints when no discounts match', async () => {
    mock.onGet('/staff/discounts').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage('/staff/discounts?search=zzz')
    expect(await screen.findByText('No discounts found')).toBeInTheDocument()
    expect(screen.getByText('No discounts match your filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument()
  })

  it('shows an empty state without filter actions when there are no filters', async () => {
    mock.onGet('/staff/discounts').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage()
    expect(await screen.findByText('No discounts found')).toBeInTheDocument()
    expect(screen.getByText('There are no discounts yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
  })

  it('renders pagination when there is more than one page', async () => {
    mock.onGet('/staff/discounts').reply(200, {
      success: true,
      data: discounts,
      meta: { page: 1, per_page: 15, total: 24, last_page: 2 },
    })
    renderPage()
    expect(await screen.findByText('Week stay')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('updates the search filter in the URL after debounce', async () => {
    mock.onGet('/staff/discounts').reply(() => [
      200,
      { success: true, data: discounts, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } },
    ])
    renderPage()
    fireEvent.change(await screen.findByPlaceholderText('Search discounts by name'), {
      target: { value: 'Fortnight' },
    })
    await waitFor(
      () => {
        expect(lastListRequest().params).toEqual({ search: 'Fortnight', page: 1 })
      },
      { timeout: 1500, interval: 50 },
    )
  })

  it('clears the search filter from the empty state', async () => {
    mock.onGet('/staff/discounts').reply(() => [
      200,
      { success: true, data: [], meta: emptyMeta },
    ])
    renderPage('/staff/discounts?search=Stay')
    fireEvent.click(await screen.findByRole('button', { name: 'Clear all filters' }))
    await waitFor(() => {
      expect(lastListRequest().params).toEqual({ page: 1 })
    })
  })

  it('shows an error state with a retry button on failure', async () => {
    let attempts = 0
    mock.onGet('/staff/discounts').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: discounts, meta: { page: 1, per_page: 15, total: 2, last_page: 1 } }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Week stay')).toBeInTheDocument()
  })

  it('links to the create form', async () => {
    mock.onGet('/staff/discounts').reply(200, {
      success: true,
      data: [],
      meta: emptyMeta,
    })
    renderPage()
    expect(await screen.findByRole('link', { name: 'New discount' })).toHaveAttribute('href', '/staff/discounts/new')
  })

  it('deletes a discount after confirmation and shows a success banner', async () => {
    mock.onGet('/staff/discounts').reply(() => [
      200,
      { success: true, data: [discounts[0]], meta: { page: 1, per_page: 15, total: 1, last_page: 1 } },
    ])
    mock.onDelete('/staff/discounts/1').reply(200, { success: true, message: 'Discount deleted.', data: null })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(screen.getByText(/Delete discount “Week stay”\?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('Discount deleted.')).toBeInTheDocument()
    expect(mock.history.delete.some((r) => r.url === '/staff/discounts/1')).toBe(true)
  })

  it('surfaces the server message on a 403 delete', async () => {
    mock.onGet('/staff/discounts').reply(() => [
      200,
      { success: true, data: [discounts[0]], meta: { page: 1, per_page: 15, total: 1, last_page: 1 } },
    ])
    mock.onDelete('/staff/discounts/1').reply(403, { success: false, message: 'Forbidden.', errors: null })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('You do not have permission to do this.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })
})