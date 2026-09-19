import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const app = readFileSync(join(process.cwd(), 'src', 'App.jsx'), 'utf8')

describe('app code splitting', () => {
  it('loads route bundles lazily', () => {
    expect(app).toMatch(/lazy\(/)
    expect(app).toMatch(/import\(/)
    expect(app).toMatch(/CustomerApp/)
    expect(app).toMatch(/StaffApp/)
  })

  it('wraps the split routes in Suspense with a loading fallback', () => {
    expect(app).toMatch(/<Suspense/)
    expect(app).toMatch(/LoadingState/)
    expect(app).toMatch(/fullScreen/)
  })
})
