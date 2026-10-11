import { describe, expect, it, vi } from 'vitest'
import { createTracker } from './track'

const KEY = 'A'.repeat(43)

function fake() {
  const calls: { url: string; init: RequestInit }[] = []
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    return new Response(null, { status: 204 })
  }) as unknown as typeof fetch
  return { calls, fetcher, body: (i: number) => JSON.parse(String(calls[i].init.body)) as Record<string, unknown> }
}

describe('tracker', () => {
  it('sends a step once per page load, with the source, as plain text without a key', () => {
    const f = fake()
    const t = createTracker('https://api.test', { src: 'fb', campaign: 'oct' }, f.fetcher)
    t.step('landed')
    t.step('landed')
    expect(f.calls).toHaveLength(1)
    expect(f.calls[0].url).toBe('https://api.test/v1/events')
    expect(f.calls[0].init).toMatchObject({ method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' } })
    expect(f.body(0)).toEqual({ kind: 'step', step: 'landed', src: 'fb', campaign: 'oct' })
  })

  it('sends the draft key only when it is one, and only these fields', () => {
    const f = fake()
    const t = createTracker('https://api.test', { src: null, campaign: null }, f.fetcher)
    t.step('build_done', { trade: 'plumber', theme: 'workwear', draftKey: KEY })
    t.layout('hero', 'split', { theme: 'workwear', draftKey: 'edit.abc.1.sig' })
    expect(f.calls[0].init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` })
    expect(f.body(0)).toEqual({ kind: 'step', step: 'build_done', trade: 'plumber', theme: 'workwear' })
    expect(f.calls[1].init.headers).toEqual({ 'Content-Type': 'text/plain' })
    expect(Object.keys(f.body(1)).sort()).toEqual(['kind', 'layout', 'section', 'theme'])
  })

  it('does nothing without a server, and never throws when the network fails', () => {
    const f = fake()
    createTracker(null, { src: 'fb', campaign: null }, f.fetcher).step('landed')
    expect(f.calls).toHaveLength(0)
    const failing = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch
    const throwing = (() => { throw new Error('blocked') }) as unknown as typeof fetch
    expect(() => createTracker('https://api.test', { src: null, campaign: null }, failing).step('started')).not.toThrow()
    expect(() => createTracker('https://api.test', { src: null, campaign: null }, throwing).step('started')).not.toThrow()
  })

  it('stays quiet in automated browsers', () => {
    const f = fake()
    vi.stubGlobal('navigator', { webdriver: true })
    try {
      createTracker('https://api.test', { src: null, campaign: null }, f.fetcher).step('landed')
    } finally {
      vi.unstubAllGlobals()
    }
    expect(f.calls).toHaveLength(0)
  })
})
