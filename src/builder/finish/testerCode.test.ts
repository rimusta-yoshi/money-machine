// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { BUILT_PRICE_PENCE, money, PRICE } from '../../brand/price'
import { storedTesterCode, takeTesterCodeFromUrl } from './testerCode'

describe('tester links', () => {
  beforeEach(() => sessionStorage.clear())

  it('keep the code for this tab and take it out of the address bar', () => {
    window.history.replaceState(null, '', '/build/?trade=plumber&tester=tester-1234#lost-link')
    takeTesterCodeFromUrl()
    expect(storedTesterCode()).toBe('tester-1234')
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/build/?trade=plumber#lost-link')
    window.history.replaceState(null, '', '/build/')
    takeTesterCodeFromUrl()
    expect(storedTesterCode()).toBe('tester-1234')
  })
})

describe('the price', () => {
  it('comes from the server config the pages are built with', () => {
    expect(BUILT_PRICE_PENCE).toBe(9900)
    expect(PRICE).toBe('£99')
    expect(money(7950)).toBe('£79.50')
  })
})
