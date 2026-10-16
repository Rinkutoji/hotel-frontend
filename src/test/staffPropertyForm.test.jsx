import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import PropertyForm from '../pages/staff/PropertyForm'

const property = {
  id: 5,
  name: 'Main Hotel',
  code: 'MAIN',
  description: null,
  address: null,
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
}

function renderForm(initialEntry = '/staff/properties/new') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/staff/properties" element={<div>PROPERTIES_LIST</div>} />
        <Route path="/staff/properties/new" element={<PropertyForm />} />
        <Route path="/staff/properties/:id" element={<div>PROPERTY_DETAIL</div>} />
        <Route path="/staff/properties/:id/edit" element={<PropertyForm />} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillCreateForm() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Hotel B' } })
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'B' } })
}

describe('Staff property form page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the create form with a back link', () => {
    renderForm()
    expect(screen.getByText('Add a property')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to properties/ })).toHaveAttribute('href', '/staff/properties')
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create property' })).toBeInTheDocument()
  })

  it('creates a property and navigates to its detail page', async () => {
    mock.onPost('/staff/properties').reply(201, { success: true, data: { id: 10 } })
    renderForm()
    fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create property' }))
    expect(await screen.findByText('PROPERTY_DETAIL')).toBeInTheDocument()
    const config = mock.history.post[0]
    const body = JSON.parse(config.data)
    expect(body.name).toBe('Hotel B')
    expect(body.code).toBe('B')
    expect(body.status).toBe('active')
    expect(body.latitude).toBeNull()
    expect(body.longitude).toBeNull()
  })

  it('shows inline validation errors for an incomplete form', async () => {
    mock.onPost('/staff/properties').reply(201, { success: true, data: { id: 10 } })
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create property' }))
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Code is required.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('validates latitude bounds', async () => {
    mock.onPost('/staff/properties').reply(201, { success: true, data: { id: 10 } })
    renderForm()
    fillCreateForm()
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create property' }))
    expect(screen.getByText('Latitude must be between -90 and 90.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('validates longitude bounds', async () => {
    mock.onPost('/staff/properties').reply(201, { success: true, data: { id: 10 } })
    renderForm()
    fillCreateForm()
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create property' }))
    expect(screen.getByText('Longitude must be between -180 and 180.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('validates email format', async () => {
    mock.onPost('/staff/properties').reply(201, { success: true, data: { id: 10 } })
    renderForm()
    fillCreateForm()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create property' }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
  })

  it('validates currency length', async () => {
    mock.onPost('/staff/properties').reply(201, { success: true, data: { id: 10 } })
    renderForm()
    fillCreateForm()
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'USDD' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create property' }))
    expect(screen.getByText('Currency must be a 3-letter code.')).toBeInTheDocument()
  })

  it('surfaces server 422 field errors', async () => {
    mock.onPost('/staff/properties').reply(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { code: ['The code has already been taken.'] },
    })
    renderForm()
    fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create property' }))
    expect(await screen.findByText('The code has already been taken.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create property' })).toBeInTheDocument()
  })

  it('shows a loading state while fetching an existing property', () => {
    mock.onGet('/staff/properties/5').reply(() => new Promise(() => {}))
    renderForm('/staff/properties/5/edit')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('prefills the edit form from the fetched property', async () => {
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: property })
    renderForm('/staff/properties/5/edit')
    expect(await screen.findByLabelText('Name')).toHaveValue('Main Hotel')
    expect(screen.getByLabelText('Code')).toHaveValue('MAIN')
    expect(screen.getByLabelText('City')).toHaveValue('Phnom Penh')
  })

  it('submits a full PUT payload on edit', async () => {
    mock.onGet('/staff/properties/5').reply(200, { success: true, data: property })
    mock.onPut('/staff/properties/5').reply(200, { success: true, data: property })
    renderForm('/staff/properties/5/edit')
    await screen.findByLabelText('Name')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Hotel' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('PROPERTY_DETAIL')).toBeInTheDocument()
    const config = mock.history.put[0]
    const body = JSON.parse(config.data)
    expect(body.name).toBe('Updated Hotel')
    expect(body.code).toBe('MAIN')
  })
})