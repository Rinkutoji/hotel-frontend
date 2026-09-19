import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')

describe('print stylesheet', () => {
  it('hides shell chrome and buttons in an @media print block', () => {
    expect(css).toMatch(/@media print/)
    expect(css).toMatch(/header,/)
    expect(css).toMatch(/footer,/)
    expect(css).toMatch(/aside/)
    expect(css).toMatch(/button/)
  })
})