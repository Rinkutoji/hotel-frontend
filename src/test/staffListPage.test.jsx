import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import StaffList from '../pages/staff/StaffList'

const employee = {
  id: 1,
  name: 'Alice Admin',
  email: 'alice@test.local',
  phone: '010111222',
  role: 'admin',
  status: 'active',
  department_id: null,
  property_id: null,
  property: null,
}

const employeeB = {
  ...employee,
  id: 2,
  name: 'Bob Rec',
  email: 'bob@test.local',
  role: 'receptionist',
  status: 'inactive',
  property_id: 1,
  property: { id: 1, name: 'Main Hotel' },
}

const emptyMeta = { page: 1, per_page: 15, total: 0, last_page: 1 }

describe('Staff management list page', () => {
  let mock

  function lastStaffRequest() {
    return mock.history.get.findLast((request) => request.url === '/staff/employees')
  }

  function renderPage(initialEntry = '/staff/staff') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <StaffList />
      </MemoryRouter>,
    )
  }

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/employees').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Staff Management')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders a list of staff cards with role and status badges', async () => {
    mock.onGet('/staff/employees').reply(200, {
      success: true,
      data: [employee, employeeB],
      meta: { page: 1, per_page: 15, total: 2, last_page: 1 },
    })
    renderPage()
    expect(await screen.findByText('Alice Admin')).toBeInTheDocument()
    expect(screen.getByText('Bob Rec')).toBeInTheDocument()
    expect(screen.getByText('alice@test.local')).toBeInTheDocument()
    expect(screen.getByText('bob@test.local')).toBeInTheDocument()
    // Badge assertions filter out the matching <option> text in the
    // role/status filter selects.
    const badges = (text) => screen.getAllByText(text).filter((el) => el.tagName === 'SPAN')
    expect(badges('admin').length).toBe(1)
    expect(badges('receptionist').length).toBe(1)
    expect(badges('active').length).toBe(1)
    expect(badges('inactive').length).toBe(1)
    expect(screen.getByRole('link', { name: 'New staff member' })).toHaveAttribute('href', '/staff/staff/new')
    const editLinks = screen.getAllByRole('link', { name: 'Edit' })
    expect(editLinks).toHaveLength(2)
    expect(editLinks[0]).toHaveAttribute('href', '/staff/staff/1/edit')
    expect(editLinks[1]).toHaveAttribute('href', '/staff/staff/2/edit')
  })

  it('sends search, role, and status filters from URL params', async () => {
    mock.onGet('/staff/employees').reply(200, {
      success: true,
      data: [employeeB],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    renderPage('/staff/staff?search=bob&role=receptionist&status=inactive')
    await screen.findByText('Bob Rec')
    expect(lastStaffRequest().params).toEqual({
      page: 1,
      search: 'bob',
      role: 'receptionist',
      status: 'inactive',
    })
  })

  it('updates the role filter via the select control', async () => {
    mock.onGet('/staff/employees').reply(200, {
      success: true,
      data: [],
      meta: emptyMeta,
    })
    renderPage()
    await screen.findByText('No staff found')
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'manager' } })
    await waitFor(() => {
      expect(lastStaffRequest().params).toEqual({ page: 1, role: 'manager' })
    })
  })

  it('shows an empty state with a clear action when filters are active', async () => {
    mock.onGet('/staff/employees').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage('/staff/staff?role=manager')
    expect(await screen.findByText('No staff found')).toBeInTheDocument()
    expect(screen.getByText('No staff match your filters.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
    await waitFor(() => {
      expect(lastStaffRequest().params).toEqual({ page: 1 })
    })
  })

  it('shows an empty state without filter actions when there are no filters', async () => {
    mock.onGet('/staff/employees').reply(200, { success: true, data: [], meta: emptyMeta })
    renderPage()
    expect(await screen.findByText('No staff found')).toBeInTheDocument()
    expect(screen.getByText('There are no staff members yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    let attempts = 0
    mock.onGet('/staff/employees').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: [employee], meta: { page: 1, per_page: 15, total: 1, last_page: 1 } }]
    })
    renderPage()
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Alice Admin')).toBeInTheDocument()
  })

  it('deletes a staff member after confirmation and refreshes the list', async () => {
    mock.onGet('/staff/employees').reply(200, {
      success: true,
      data: [employee],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    mock.onDelete('/staff/employees/1').reply(200, { success: true, message: 'Employee deleted.', data: null })
    renderPage()
    await screen.findByText('Alice Admin')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText(/Delete staff member/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('Staff member deleted.')).toBeInTheDocument()
    expect(mock.history.delete.length).toBe(1)
    expect(mock.history.delete[0].url).toBe('/staff/employees/1')
    expect(mock.history.get.filter((request) => request.url === '/staff/employees').length).toBe(2)
  })

  it('shows an error when a delete fails', async () => {
    mock.onGet('/staff/employees').reply(200, {
      success: true,
      data: [employee],
      meta: { page: 1, per_page: 15, total: 1, last_page: 1 },
    })
    mock.onDelete('/staff/employees/1').reply(500, { success: false, message: 'Server error', errors: null })
    renderPage()
    await screen.findByText('Alice Admin')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('Server error')).toBeInTheDocument()
  })

  it('changes the page via pagination', async () => {
    mock.onGet('/staff/employees').reply(200, {
      success: true,
      data: [employee],
      meta: { page: 1, per_page: 15, total: 20, last_page: 2 },
    })
    renderPage()
    await screen.findByText('Alice Admin')
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => {
      expect(lastStaffRequest().params).toEqual({ page: 2 })
    })
  })
})
