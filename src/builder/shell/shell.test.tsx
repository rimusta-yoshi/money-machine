// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { ApiError } from '../../api/client'
import { createSite } from '../../site/defaults'
import { pageContent } from '../../site/pageContent'
import type { Site } from '../../site/schema'
import { LookStep } from '../look/LookStep'
import { PublishChanges } from './PublishChanges'
import { TopBar } from './TopBar'
import { tradeById } from '../../trades'

const plumber = tradeById.plumber

afterEach(cleanup)

const AXE = { rules: { 'color-contrast': { enabled: false } } }
const site = (): Site => ({ ...createSite(plumber, 3), business: { ...createSite(plumber, 3).business, name: 'Joe Pipes', phone: '0113 496 0000', email: 'joe@example.com' } })

describe('top bar for a site that is live', () => {
  it('opens every step in either direction, and calls the look step “Change look”', () => {
    const onGoStep = vi.fn()
    render(<TopBar step="basics" onGoStep={onGoStep} live />)
    fireEvent.click(screen.getByRole('button', { name: /Go live/ }))
    expect(onGoStep).toHaveBeenCalledWith('finish')
    fireEvent.click(screen.getByRole('button', { name: /Change look/ }))
    expect(onGoStep).toHaveBeenCalledWith('look')
  })

  it('keeps later steps closed for a site that isn’t live yet', () => {
    render(<TopBar step="look" onGoStep={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Go live/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Basics/ })).toBeTruthy()
    expect(screen.getByText('Your look')).toBeTruthy()
  })
})

describe('Publish changes', () => {
  it('checks every section, publishes the checked record, then links to the live site', async () => {
    const checked = site()
    const verify = vi.fn(async () => checked)
    const publish = vi.fn(async () => 'https://joe-pipes.localblocks.co.uk')
    const { container } = render(<PublishChanges verify={verify} publish={publish} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publish changes' })) })
    expect(verify).toHaveBeenCalled()
    expect(publish).toHaveBeenCalledWith(checked)
    expect(screen.getByRole('status').textContent).toContain('Your changes are live')
    expect(screen.getByRole('link', { name: /View your site/ }).getAttribute('href')).toBe('https://joe-pipes.localblocks.co.uk')
    expect((await axe.run(container, AXE)).violations).toEqual([])
  })

  it('says what went wrong, and never publishes a record it couldn’t check', async () => {
    const publish = vi.fn(async () => 'x')
    render(<PublishChanges verify={async () => null} publish={publish} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publish changes' })) })
    expect(publish).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toMatch(/couldn’t publish/)
  })

  it('won’t publish while the business name, phone or email is missing', async () => {
    const verify = vi.fn(async () => site())
    render(<PublishChanges verify={verify} publish={async () => 'x'} missing={() => 'Add your business name and phone number first.'} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publish changes' })) })
    expect(verify).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toBe('Add your business name and phone number first.')
  })

  it('shows the server’s own message', async () => {
    render(<PublishChanges verify={async () => site()} publish={async () => { throw new ApiError(401, 'replaced', 'That edit link has been replaced.') }} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publish changes' })) })
    expect(screen.getByRole('status').textContent).toBe('That edit link has been replaced.')
  })
})

describe('Change look', () => {
  it('reads as changing the current look, which stays selected', () => {
    const s = { ...site(), brandColor: '#0F766E' }
    const props = {
      site: s, trade: plumber, content: pageContent(s, plumber), live: true,
      onBrandColor: vi.fn(), onTheme: vi.fn(), onShuffle: vi.fn(), onToggleReviews: vi.fn(), onBack: vi.fn(), onNext: vi.fn(),
    }
    render(<LookStep {...props} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Change look')
    expect((screen.getByRole('radio', { name: 'Teal' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: /Clean Pro/ }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Back to building' }))
    expect(props.onNext).toHaveBeenCalled()
  })
})
