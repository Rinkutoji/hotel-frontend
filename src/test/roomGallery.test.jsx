import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RoomGallery from '../components/customer/RoomGallery'

const images = [
  { id: 1, url: '/storage/room-types/1/a.jpg' },
  { id: 2, url: '/storage/room-types/1/b.jpg' },
  { id: 3, url: '/storage/room-types/1/c.jpg' },
]

describe('RoomGallery', () => {
  it('shows the no-photos state when there are no images', () => {
    render(<RoomGallery images={[]} />)
    expect(screen.getByText('No photos available')).toBeInTheDocument()
  })

  it('handles null images gracefully', () => {
    render(<RoomGallery images={null} />)
    expect(screen.getByText('No photos available')).toBeInTheDocument()
  })

  it('renders a single image without a thumbnail strip', () => {
    render(<RoomGallery images={[images[0]]} />)
    const main = screen.getByAltText('Room photo 1')
    expect(main).toHaveAttribute('src', images[0].url)
    expect(screen.queryByLabelText('Show photo 2')).toBeNull()
  })

  it('renders thumbnails and switches the active image', () => {
    render(<RoomGallery images={images} />)
    expect(screen.getByLabelText('Show photo 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Show photo 3')).toBeInTheDocument()

    const secondThumb = screen.getByLabelText('Show photo 2')
    fireEvent.click(secondThumb)

    const main = screen.getByAltText('Room photo 2')
    expect(main).toHaveAttribute('src', images[1].url)
  })

  it('marks the active thumbnail as current', () => {
    render(<RoomGallery images={images} />)
    const first = screen.getByLabelText('Show photo 1')
    expect(first).toHaveAttribute('aria-current', 'true')
  })
})