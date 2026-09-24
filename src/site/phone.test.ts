import { describe, expect, it } from 'vitest'
import { telHref } from './phone'

describe('telHref', () => {
  it('strips spaces, brackets and dashes', () => {
    expect(telHref('0113 496 0000')).toBe('tel:01134960000')
    expect(telHref('(604) 555-0123')).toBe('tel:6045550123')
  })

  it('keeps a leading plus for international numbers', () => {
    expect(telHref('+44 7700 900123')).toBe('tel:+447700900123')
  })

  it('returns null when there are no digits', () => {
    expect(telHref('')).toBeNull()
    expect(telHref('call us')).toBeNull()
  })
})
