import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton, SkeletonStatCard, SkeletonChart, SkeletonList } from '../components/common/Skeleton'

describe('Skeleton components', () => {
  it('renders the base skeleton as a decorative block', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(container.querySelector('.h-4')).toBeInTheDocument()
  })

  it('renders a stat-card skeleton with a status role', () => {
    render(<SkeletonStatCard />)
    expect(screen.getByRole('status', { name: 'Loading dashboard statistics' })).toBeInTheDocument()
  })

  it('renders a chart skeleton with placeholder bars', () => {
    render(<SkeletonChart />)
    const chart = screen.getByRole('status', { name: 'Loading dashboard chart' })
    expect(chart).toBeInTheDocument()
    expect(chart.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(6)
  })

  it('renders a list skeleton with the requested row count', () => {
    render(<SkeletonList rows={3} label="Loading recent bookings" />)
    const list = screen.getByRole('status', { name: 'Loading recent bookings' })
    expect(list.querySelectorAll('.rounded-xl').length).toBe(3)
  })
})