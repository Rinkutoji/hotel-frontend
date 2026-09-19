import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SkipLink from '../components/common/SkipLink'

describe('skip link', () => {
  it('renders a link to the main content target', () => {
    render(
      <MemoryRouter>
        <SkipLink />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Skip to main content' })
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('is visually hidden until focused', () => {
    render(
      <MemoryRouter>
        <SkipLink />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Skip to main content' })
    expect(link.className).toContain('sr-only')
    expect(link.className).toContain('focus:not-sr-only')
  })
})
