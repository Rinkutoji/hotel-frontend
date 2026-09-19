import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import DiscountForm from '../pages/staff/DiscountForm'

const existing = { id: 3, name: 'Week stay', min_nights: 3, percent_off: '15.00' }

function renderForm(initialEntry = '/staff/discounts/new') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/staff/discounts" element={<div>DISCOUNTS_LIST</div>} />
        <Route path="/staff/discounts/new" element={<DiscountForm />} />
        <Route path="/staff/discounts/:id/edit" element={<DiscountForm />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Staff discount form', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('renders the create form with back link and empty fields', async () => {
    renderForm()
    expect(screen.getByText('Add a discount')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to discounts/ })).toHaveAttribute('href', '/staff/discounts')
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Minimum nights')).toHaveValue(null)
    expect(screen.getByLabelText('Percent off')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Create discount' })).toBeInTheDocument()
  })

  it('creates a discount and navigates back to the list', async () => {
    mock.onPost('/staff/discounts').reply(201, { success: true, message: 'Discount created.', data: { id: 4 } })
    renderForm()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Week stay' } })
    fireEvent.change(screen.getByLabelText('Minimum nights'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Percent off'), { target: { value: '15.00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create discount' }))
    expect(await screen.findByText('DISCOUNTS_LIST')).toBeInTheDocument()
    const config = mock.history.post.find((r) => r.url === '/staff/discounts')
    expect(JSON.parse(config.data)).toEqual({ name: 'Week stay', min_nights: 3, percent_off: '15.00' })
  })

  it('prefills the fields when editing an existing tier', async () => {
    mock.onGet('/staff/discounts/3').reply(200, { success: true, data: existing })
    renderForm('/staff/discounts/3/edit')
    expect(await screen.findByText('Edit Week stay')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Week stay')
    expect(screen.getByLabelText('Minimum nights')).toHaveValue(3)
    expect(screen.getByLabelText('Percent off')).toHaveValue('15.00')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('updates a discount with the PUT verb and navigates back', async () => {
    mock.onGet('/staff/discounts/3').reply(200, { success: true, data: existing })
    mock.onPut('/staff/discounts/3').reply(200, { success: true, message: 'Discount updated.', data: { ...existing, min_nights: 4 } })
    renderForm('/staff/discounts/3/edit')
    fireEvent.change(await screen.findByLabelText('Minimum nights'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('DISCOUNTS_LIST')).toBeInTheDocument()
    const config = mock.history.put.find((r) => r.url === '/staff/discounts/3')
    expect(JSON.parse(config.data)).toEqual({ name: 'Week stay', min_nights: 4, percent_off: '15.00' })
  })

  it('shows a loading state while fetching the existing tier', () => {
    mock.onGet('/staff/discounts/3').reply(() => new Promise(() => {}))
    renderForm('/staff/discounts/3/edit')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows a not-found state for a missing tier', async () => {
    mock.onGet('/staff/discounts/3').reply(404, { success: false, message: 'Discount not found.', errors: null })
    renderForm('/staff/discounts/3/edit')
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to discounts/ })).toHaveAttribute('href', '/staff/discounts')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('validates required fields inline without submitting', async () => {
    mock.onPost('/staff/discounts').reply(201, { success: true, data: { id: 4 } })
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create discount' }))
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Minimum nights must be a whole number of at least 1.')).toBeInTheDocument()
    expect(screen.getByText('Percent off is required.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('rejects a zero percent off and a min_nights below 1', async () => {
    mock.onPost('/staff/discounts').reply(201, { success: true, data: { id: 4 } })
    renderForm()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Free' } })
    fireEvent.change(screen.getByLabelText('Minimum nights'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Percent off'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create discount' }))
    expect(await screen.findByText('Minimum nights must be a whole number of at least 1.')).toBeInTheDocument()
    expect(screen.getByText('Percent off must be greater than 0 and at most 100.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('rejects a percent off above 100', async () => {
    mock.onPost('/staff/discounts').reply(201, { success: true, data: { id: 4 } })
    renderForm()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Too much' } })
    fireEvent.change(screen.getByLabelText('Minimum nights'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Percent off'), { target: { value: '100.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create discount' }))
    expect(await screen.findByText('Percent off must be greater than 0 and at most 100.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('surfaces a 422 min_nights uniqueness field error inline', async () => {
    mock.onPost('/staff/discounts').reply(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { min_nights: ['The min nights has already been taken.'] },
    })
    renderForm()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Duplicate' } })
    fireEvent.change(screen.getByLabelText('Minimum nights'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Percent off'), { target: { value: '10.00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create discount' }))
    expect(await screen.findByText('The min nights has already been taken.')).toBeInTheDocument()
  })

  it('disables the submit button while saving', async () => {
    mock.onPost('/staff/discounts').reply(() => new Promise(() => {}))
    renderForm()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Week stay' } })
    fireEvent.change(screen.getByLabelText('Minimum nights'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Percent off'), { target: { value: '15.00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create discount' }))
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })
})