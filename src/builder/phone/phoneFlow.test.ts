import { describe, expect, it } from 'vitest'
import { barLine, PHONE_FLOW_START, phoneFlow, previewHeight } from './phoneFlow'

describe('phone flow', () => {
  it('starts on the bar with the phone preview', () => {
    expect(PHONE_FLOW_START).toEqual({ mode: 'pick', size: 'phone' })
  })

  it('Edit opens the fields', () => {
    expect(phoneFlow(PHONE_FLOW_START, { type: 'edit' }).mode).toBe('edit')
  })

  it('Escape goes back to the bar without moving on', () => {
    const s = phoneFlow(phoneFlow(PHONE_FLOW_START, { type: 'edit' }), { type: 'close' })
    expect(s).toEqual(PHONE_FLOW_START)
  })

  it('moving to another section always lands on its bar, never its fields', () => {
    const s = phoneFlow(phoneFlow(PHONE_FLOW_START, { type: 'edit' }), { type: 'moved' })
    expect(s.mode).toBe('pick')
  })

  it('the Phone / Computer toggle only applies while editing, and resets after', () => {
    expect(phoneFlow(PHONE_FLOW_START, { type: 'size', size: 'computer' })).toBe(PHONE_FLOW_START)
    const big = phoneFlow(phoneFlow(PHONE_FLOW_START, { type: 'edit' }), { type: 'size', size: 'computer' })
    expect(big.size).toBe('computer')
    expect(phoneFlow(big, { type: 'close' }).size).toBe('phone')
  })

  it('says where you are in the layouts', () => {
    expect(barLine('Hero', { label: 'Photo on top', index: 0, count: 6, loading: false })).toBe('Hero · Photo on top · 1 of 6 · swipe to change')
    expect(barLine('Hero', { label: 'Stacked', index: 0, count: 1, loading: false })).toBe('Hero · Stacked · the one layout that fits')
    expect(barLine('Hero', { label: '', index: 0, count: 0, loading: true })).toBe('Hero · making layouts…')
    expect(barLine('Areas', { label: '', index: 0, count: 0, loading: false })).toBe('Areas · no layouts fit this content yet')
  })

  it('keeps the preview between 150 and 380 pixels, about 40% of the screen', () => {
    expect(previewHeight(844)).toBe(354)
    expect(previewHeight(300)).toBe(150)
    expect(previewHeight(2000)).toBe(380)
  })
})
