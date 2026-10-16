import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import BuildingForm from '../pages/staff/BuildingForm'

const building = {
  id: 3,
  property_id: 5,
  name: 'East Wing',
  code: 'EAST',
  description: null,
  floor_count: 4,
  status: 'active',
}

function renderForm(initialEntry = '/staff/properties/5/buildings/new') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/staff/properties" element={<div>PROPERTIES_LIST</div>} />
        <Route path="/staff/properties/:id" element={<div>PROPERTY_DETAIL</div>} />
        <Route path="/staff/properties/:id/buildings/new" element={<BuildingForm />} />
        <Route path="/staff/buildings/:id/edit" element={<BuildingForm />} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillCreateForm() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'East Wing' } })
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'EAST' } })
}

describe('Staff building form page', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the create form with a back link', () => {
    renderForm()
    expect(screen.getByText('Add a building')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to property/ })).toHaveAttribute('href', '/staff/properties/5')
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Code')).toBeInTheDocument()
    expect(screen.getByLabelText('Floor count')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create building' })).toBeInTheDocument()
  })

  it('creates a building and navigates back to the property detail', async () => {
    mock.onPost('/staff/properties/5/buildings').reply(201, { success: true, data: { id: 3 } })
    renderForm()
    fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create building' }))
    expect(await screen.findByText('PROPERTY_DETAIL')).toBeInTheDocument()
    const config = mock.history.post[0]
    expect(config.url).toBe('/staff/properties/5/buildings')
    const body = JSON.parse(config.data)
    expect(body.name).toBe('East Wing')
    expect(body.code).toBe('EAST')
    expect(body.status).toBe('active')
  })

  it('shows inline validation errors for an incomplete form', async () => {
    mock.onPost('/staff/properties/5/buildings').reply(201, { success: true, data: { id: 3 } })
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create building' }))
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Code is required.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('validates floor count range', async () => {
    mock.onPost('/staff/properties/5/buildings').reply(201, { success: true, data: { id: 3 } })
    renderForm()
    fillCreateForm()
    fireEvent.change(screen.getByLabelText('Floor count'), { target: { value: '201' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create building' }))
    expect(screen.getByText('Floor count must be a whole number between 1 and 200.')).toBeInTheDocument()
  })

  it('surfaces server 422 field errors', async () => {
    mock.onPost('/staff/properties/5/buildings').reply(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { code: ['The code has already been taken.'] },
    })
    renderForm()
    fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create building' }))
    expect(await screen.findByText('The code has already been taken.')).toBeInTheDocument()
  })

  it('shows a loading state while fetching an existing building', () => {
    mock.onGet('/staff/buildings/3').reply(() => new Promise(() => {}))
    renderForm('/staff/buildings/3/edit')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('prefills the edit form from the fetched building', async () => {
    mock.onGet('/staff/buildings/3').reply(200, { success: true, data: building })
    renderForm('/staff/buildings/3/edit')
    expect(await screen.findByLabelText('Name')).toHaveValue('East Wing')
    expect(screen.getByLabelText('Code')).toHaveValue('EAST')
    expect(screen.getByLabelText('Floor count')).toHaveValue(4)
  })

  it('submits a full PUT payload on edit', async () => {
    mock.onGet('/staff/buildings/3').reply(200, { success: true, data: building })
    mock.onPut('/staff/buildings/3').reply(200, { success: true, data: building })
    renderForm('/staff/buildings/3/edit')
    await screen.findByLabelText('Name')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'West Wing' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('PROPERTY_DETAIL')).toBeInTheDocument()
    const config = mock.history.put[0]
    expect(config.url).toBe('/staff/buildings/3')
    const body = JSON.parse(config.data)
    expect(body.name).toBe('West Wing')
  })
})