import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '../api/client'
import RoomTypeImages from '../pages/staff/RoomTypeImages'

const roomType = { id: 3, name: 'Suite', description: null, base_price: '250.00', capacity_adults: 3, capacity_children: 2, amenities: [] }

function makeImage(overrides = {}) {
  return {
    id: 1,
    room_type_id: 3,
    sort_order: 1,
    url: '/storage/room-types/3/room.jpg',
    created_at: '2026-09-14T10:00:00.000000Z',
    updated_at: '2026-09-14T10:00:00.000000Z',
    ...overrides,
  }
}

const images = [
  makeImage(),
  makeImage({ id: 2, sort_order: 2, url: '/storage/room-types/3/hall.jpg' }),
]

let mock

function renderPage(initialEntry = '/staff/room-types/3/images') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/staff/room-types" element={<div>ROOM_TYPES_LIST</div>} />
        <Route path="/staff/room-types/:id/images" element={<RoomTypeImages />} />
      </Routes>
    </MemoryRouter>,
  )
}

function makeFile({ type, size = 1024 }) {
  return new File([new ArrayBuffer(size)], `photo${type.replaceAll('/', '.')}`, { type })
}

describe('Staff room type images page', () => {
  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    mock.onGet('/staff/room-types/3').reply(200, { success: true, data: roomType })
  })

  afterEach(() => {
    mock.restore()
  })

  it('shows a loading state while fetching', () => {
    mock.onGet('/staff/room-types/3').reply(() => new Promise(() => {}))
    mock.onGet('/staff/room-types/3/images').reply(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the gallery from server-provided urls', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: images })
    renderPage()
    expect(await screen.findByText('Position 1')).toBeInTheDocument()
    expect(screen.getByText('Position 2')).toBeInTheDocument()
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('src'))).toEqual([
      '/storage/room-types/3/room.jpg',
      '/storage/room-types/3/hall.jpg',
    ])
  })

  it('shows an empty state with an upload prompt when there are no photos', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: [] })
    renderPage()
    expect(await screen.findByText('No photos yet')).toBeInTheDocument()
  })

  it('rejects a non-supported file type before uploading', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: [] })
    renderPage()
    fireEvent.change(await screen.findByLabelText('Upload photo'), {
      target: { files: [makeFile({ type: 'image/gif' })] },
    })
    expect(screen.getByText('Please choose a JPG, JPEG, PNG or WebP image.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('rejects an oversized file before uploading', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: [] })
    renderPage()
    fireEvent.change(await screen.findByLabelText('Upload photo'), {
      target: { files: [makeFile({ type: 'image/jpeg', size: 6 * 1024 * 1024 })] },
    })
    expect(screen.getByText('Images must be 5120 KB or smaller.')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('uploads a valid image and shows a success banner', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: [] })
    mock.onPost('/staff/room-types/3/images').reply(201, {
      success: true,
      message: 'Image uploaded.',
      data: makeImage({ id: 3, url: '/storage/room-types/3/new.jpg' }),
    })
    renderPage()
    fireEvent.change(await screen.findByLabelText('Upload photo'), {
      target: { files: [makeFile({ type: 'image/webp' })] },
    })
    expect(await screen.findByText('Image uploaded.')).toBeInTheDocument()
    const config = mock.history.post.find((r) => r.url === '/staff/room-types/3/images')
    expect(config).toBeTruthy()
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
    expect(config.data).toBeInstanceOf(FormData)
  })

  it('surfaces an upload failure from the server', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: [] })
    mock.onPost('/staff/room-types/3/images').reply(422, {
      success: false,
      message: 'The given data was invalid.',
      errors: { image: ['The image must be a file of type: jpg, jpeg, png, webp.'] },
    })
    renderPage()
    fireEvent.change(await screen.findByLabelText('Upload photo'), {
      target: { files: [makeFile({ type: 'image/jpeg' })] },
    })
    expect(
      await screen.findByText(/The image must be a file of type/),
    ).toBeInTheDocument()
  })

  it('moves an image down and swaps sort orders', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: images })
    mock.onPut('/staff/room-images/1').reply(200, { success: true, data: makeImage({ sort_order: 2 }) })
    mock.onPut('/staff/room-images/2').reply(200, { success: true, data: makeImage({ id: 2, sort_order: 1 }) })
    renderPage()
    const moveDowns = await screen.findAllByRole('button', { name: 'Move down' })
    fireEvent.click(moveDowns[0])
    expect(await screen.findByText('Image order updated.')).toBeInTheDocument()
    const putUrls = mock.history.put.map((r) => r.url)
    expect(putUrls).toContain('/staff/room-images/1')
    expect(putUrls).toContain('/staff/room-images/2')
    const swap = mock.history.put.find((r) => r.url === '/staff/room-images/1')
    expect(JSON.parse(swap.data)).toEqual({ sort_order: 2 })
  })

  it('disables move-up on the first image and move-down on the last', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: images })
    renderPage()
    const moveUps = await screen.findAllByRole('button', { name: 'Move up' })
    const moveDowns = screen.getAllByRole('button', { name: 'Move down' })
    expect(moveUps.length).toBe(2)
    expect(moveDowns.length).toBe(2)
    expect(moveUps[0]).toBeDisabled()
    expect(moveDowns[0]).toBeEnabled()
    expect(moveDowns[1]).toBeDisabled()
  })

  it('deletes an image after confirmation', async () => {
    mock.onGet('/staff/room-types/3/images').reply(200, { success: true, data: images })
    mock.onDelete('/staff/room-images/1').reply(200, { success: true, message: 'Image deleted.', data: null })
    renderPage()
    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete' })
    fireEvent.click(deleteButtons[0])
    expect(screen.getByText('Delete this photo?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete photo' }))
    expect(await screen.findByText('Image deleted.')).toBeInTheDocument()
    expect(mock.history.delete.some((r) => r.url === '/staff/room-images/1')).toBe(true)
  })

  it('shows a friendly not-found state for a missing room type', async () => {
    mock.onGet('/staff/room-types/3').reply(200, { success: true, data: roomType })
    mock.onGet('/staff/room-types/3/images').reply(404, { success: false, message: 'Room type not found.', errors: null })
    renderPage()
    expect(await screen.findByText('The requested resource could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to room types/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows an error state with retry for other load failures', async () => {
    let attempts = 0
    mock.onGet('/staff/room-types/3/images').reply(() => {
      attempts += 1
      if (attempts === 1) return [500, { success: false, message: 'Server error', errors: null }]
      return [200, { success: true, data: images }]
    })
    renderPage('/staff/room-types/3/images')
    expect(await screen.findByText('Server error')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Position 1')).toBeInTheDocument()
  })
})