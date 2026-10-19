import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import StaffForm from '../pages/staff/StaffForm'

const employee = {
  id: 5,
  name: 'Alice Admin',
  email: 'alice@test.local',
  phone: '010111222',
  role: 'admin',
  status: 'active',
  department_id: null,
  property_id: null,
  property: null,
}

const receptionist = {
  ...employee,
  id: 6,
  name: 'Bob Rec',
  email: 'bob@test.local',
  role: 'receptionist',
  property_id: 1,
  property: { id: 1, name: 'Main Hotel' },
}

const propertiesResponse = {
  success: true,
  data: [
    { id: 1, name: 'Main Hotel' },
    { id: 2, name: 'Hotel B' },
  ],
  meta: { page: 1, per_page: 50, total: 2, last_page: 1 },
}

function renderForm(initialEntry = '/staff/staff/new') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/staff/staff" element={<div>STAFF_LIST</div>} />
        <Route path="/staff/staff/new" element={<StaffForm />} />
        <Route path="/staff/staff/:id/edit" element={<StaffForm />} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillCreateBasics() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Srey Neang' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'srey@hotel.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
}

describe('Staff form page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mock.onGet('/staff/properties').reply(200, propertiesResponse)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the create form with a back link and no status field', () => {
    renderForm()
    expect(screen.getByText('Add a staff member')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to staff/ })).toHaveAttribute('href', '/staff/staff')
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create staff member' })).toBeInTheDocument()
  })

  it('shows inline validation errors for an empty create form', async () => {
    renderForm()
    await screen.findByText('Main Hotel')
    fireEvent.click(screen.getByRole('button', { name: 'Create staff member' }))
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(screen.getByText('Property is required for receptionists.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('validates email format and password length', async () => {
    renderForm()
    await screen.findByText('Main Hotel')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Srey Neang' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create staff member' }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('creates a receptionist with a property and navigates back to the list', async () => {
    mock.onPost('/staff/employees').reply(201, {
      success: true,
      message: 'Employee created.',
      data: { id: 12 },
    })
    renderForm()
    await screen.findByText('Main Hotel')
    fillCreateBasics()
    fireEvent.change(screen.getByLabelText('Assigned property'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create staff member' }))
    expect(await screen.findByText('STAFF_LIST')).toBeInTheDocument()
    const config = mock.history.post[0]
    const body = JSON.parse(config.data)
    expect(body.name).toBe('Srey Neang')
    expect(body.email).toBe('srey@hotel.com')
    expect(body.phone).toBeNull()
    expect(body.role).toBe('receptionist')
    expect(body.password).toBe('password123')
    expect(body.property_id).toBe(2)
    expect(body.status).toBeUndefined()
  })

  it('omits property_id when creating a non-receptionist role', async () => {
    mock.onPost('/staff/employees').reply(201, {
      success: true,
      message: 'Employee created.',
      data: { id: 13 },
    })
    renderForm()
    await screen.findByText('Main Hotel')
    fillCreateBasics()
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'admin' } })
    expect(screen.queryByLabelText('Assigned property')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create staff member' }))
    expect(await screen.findByText('STAFF_LIST')).toBeInTheDocument()
    const body = JSON.parse(mock.history.post[0].data)
    expect(body.role).toBe('admin')
    expect(body.property_id).toBeUndefined()
  })

  it('loads an employee into the edit form with a status field', async () => {
    mock.onGet('/staff/employees/5').reply(200, { success: true, data: employee })
    renderForm('/staff/staff/5/edit')
    expect(await screen.findByDisplayValue('Alice Admin')).toBeInTheDocument()
    expect(screen.getByDisplayValue('alice@test.local')).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toHaveValue('active')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByPlaceholderText('Leave blank to keep the current password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('updates an employee without a password when the field is left blank', async () => {
    mock.onGet('/staff/employees/5').reply(200, { success: true, data: employee })
    mock.onPut('/staff/employees/5').reply(200, { success: true, message: 'Employee updated.', data: employee })
    renderForm('/staff/staff/5/edit')
    await screen.findByDisplayValue('Alice Admin')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('STAFF_LIST')).toBeInTheDocument()
    const body = JSON.parse(mock.history.put[0].data)
    expect(body.name).toBe('Alice Admin')
    expect(body.role).toBe('admin')
    expect(body.status).toBe('active')
    expect(body.password).toBeUndefined()
  })

  it('includes the password in the update payload when provided', async () => {
    mock.onGet('/staff/employees/5').reply(200, { success: true, data: employee })
    mock.onPut('/staff/employees/5').reply(200, { success: true, message: 'Employee updated.', data: employee })
    renderForm('/staff/staff/5/edit')
    await screen.findByDisplayValue('Alice Admin')
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'newpassword1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('STAFF_LIST')).toBeInTheDocument()
    const body = JSON.parse(mock.history.put[0].data)
    expect(body.password).toBe('newpassword1')
  })

  it('shows the deactivation status as a select value when editing', async () => {
    mock.onGet('/staff/employees/5').reply(200, {
      success: true,
      data: { ...employee, status: 'inactive' },
    })
    renderForm('/staff/staff/5/edit')
    await screen.findByDisplayValue('Alice Admin')
    expect(screen.getByLabelText('Status')).toHaveValue('inactive')
  })

  it('prefills the assigned property for a receptionist', async () => {
    mock.onGet('/staff/employees/6').reply(200, { success: true, data: receptionist })
    renderForm('/staff/staff/6/edit')
    await screen.findByDisplayValue('Bob Rec')
    expect(await screen.findByText('Main Hotel')).toBeInTheDocument()
    expect(screen.getByLabelText('Assigned property')).toHaveValue('1')
  })

  it('shows a not-found state for a missing employee', async () => {
    mock.onGet('/staff/employees/999').reply(404, {
      success: false,
      message: 'Not found.',
      errors: null,
    })
    renderForm('/staff/staff/999/edit')
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows server-side field errors on submit', async () => {
    mock.onGet('/staff/employees/5').reply(200, { success: true, data: employee })
    mock.onPut('/staff/employees/5').reply(422, {
      success: false,
      message: 'Validation failed.',
      errors: { email: ['The email has already been taken.'] },
    })
    renderForm('/staff/staff/5/edit')
    await screen.findByDisplayValue('Alice Admin')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'taken@test.local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument()
  })
})
