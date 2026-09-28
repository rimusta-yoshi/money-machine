// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FitNotice } from './FitNotice'
import { FALLBACK_NOTICE, REPAIR_NOTICE } from './useHeroFitRepair'

afterEach(() => { cleanup(); vi.useRealTimers() })

describe('FitNotice', () => {
  it('keeps a polite live region mounted that holds only the message', () => {
    const { rerender } = render(<FitNotice notice={null} onDismiss={vi.fn()} />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.textContent).toBe('')
    rerender(<FitNotice notice={{ id: 1, text: REPAIR_NOTICE }} onDismiss={vi.fn()} />)
    expect(screen.getByRole('status')).toBe(region)
    expect(region.textContent).toBe(REPAIR_NOTICE)
    expect(region.querySelector('button')).toBeNull()
  })

  it('can be dismissed, and hides itself after a while', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<FitNotice notice={{ id: 1, text: REPAIR_NOTICE }} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(12000) })
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })

  it('stays while the Dismiss button has focus', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<FitNotice notice={{ id: 1, text: REPAIR_NOTICE }} onDismiss={onDismiss} />)
    fireEvent.focus(screen.getByRole('button', { name: 'Dismiss' }))
    act(() => { vi.advanceTimersByTime(30000) })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('restarts its timer when a new repair happens', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const { rerender } = render(<FitNotice notice={{ id: 1, text: REPAIR_NOTICE }} onDismiss={onDismiss} />)
    act(() => { vi.advanceTimersByTime(10000) })
    rerender(<FitNotice notice={{ id: 2, text: REPAIR_NOTICE }} onDismiss={onDismiss} />)
    act(() => { vi.advanceTimersByTime(10000) })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('says something different when only the simplest layout is left', () => {
    expect(FALLBACK_NOTICE).not.toBe(REPAIR_NOTICE)
    expect(FALLBACK_NOTICE).toMatch(/simplest/)
  })
})
