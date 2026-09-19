import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../components/common/ErrorBoundary'

function Boom() {
  throw new Error('boom')
}

function BrokenHarness({ fallback }) {
  return (
    <ErrorBoundary fallback={fallback}>
      <Boom />
    </ErrorBoundary>
  )
}

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('shows the default fallback when a child throws during render', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<BrokenHarness />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    spy.mockRestore()
  })

  it('calls onReset when the Reload button is clicked', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReset = vi.fn()
    render(
      <ErrorBoundary onReset={onReset}>
        <Boom />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReset).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('supports a custom fallback render prop receiving the reset handler', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReset = vi.fn()
    render(
      <ErrorBoundary onReset={onReset} fallback={(reload) => <button onClick={reload}>Custom retry</button>}>
        <Boom />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Custom retry' }))
    expect(onReset).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('recovers when remounted with a fresh key', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const first = render(
      <ErrorBoundary key="a">
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    first.unmount()

    render(
      <ErrorBoundary key="b">
        <p>Recovered page</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Recovered page')).toBeInTheDocument()
    spy.mockRestore()
  })
})