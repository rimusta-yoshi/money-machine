// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import { createSite } from '../../site/defaults'
import { siteSections } from '../../site/sections'
import { suggestHeadlines } from '../../site/headlines'
import type { Site } from '../../site/schema'
import { tradeById } from '../../trades'
import type { SectionNavProps } from '../sectionNav'
import { PhoneBar } from './PhoneBar'
import { PhoneEditor } from './PhoneEditor'
import { FocusPicker } from '../content/FocusPicker'
import { focusFromKey, focusFromTap } from '../content/focus'
import { ResumeLink } from '../save/ResumeLink'
import { ApiError } from '../../api/client'

const plumber = tradeById.plumber
const AXE = { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }

afterEach(cleanup)

const site: Site = (() => {
  const s = createSite(plumber, 12)
  return { ...s, business: { ...s.business, name: 'Hartley & Sons', phone: '01632 960 123', location: 'Harrogate' } }
})()

function nav(over: Partial<SectionNavProps> = {}): SectionNavProps {
  const sections = siteSections(plumber, site)
  return {
    site, trade: plumber, sections, activeIdx: 0,
    layout: { index: 0, count: 6, label: 'Photo on top', loading: false },
    allDone: false, nextIdx: 1,
    onCycleLayout: vi.fn(), onNewOptions: vi.fn(), onNext: vi.fn(), onFinish: vi.fn(),
    onContentChange: vi.fn(), onBusinessChange: vi.fn(), onChangeLook: vi.fn(),
    ...over,
  }
}

describe('the phone bar', () => {
  it('has ‹ Edit hero ›, the layout line and Next, and nothing else to choose', async () => {
    const props = nav()
    const onEdit = vi.fn()
    const { container } = render(<PhoneBar {...props} onEdit={onEdit} />)
    expect(screen.getByRole('button', { name: 'Edit hero' })).toBeTruthy()
    expect(screen.getByText('Hero · Photo on top · 1 of 6 · swipe to change')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next layout' }))
    expect(props.onCycleLayout).toHaveBeenCalledWith(1)
    fireEvent.click(screen.getByRole('button', { name: 'Previous layout' }))
    expect(props.onCycleLayout).toHaveBeenCalledWith(-1)
    fireEvent.click(screen.getByRole('button', { name: 'Edit hero' }))
    expect(onEdit).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Next: trust bar' }))
    expect(props.onNext).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /use this layout/i })).toBeNull()
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
  })

  it('announces the layout to screen readers, and describes the Edit button with it', () => {
    render(<PhoneBar {...nav()} onEdit={vi.fn()} />)
    const line = screen.getByText(/swipe to change/)
    expect(line.getAttribute('aria-live')).toBe('polite')
    expect(screen.getByRole('button', { name: 'Edit hero' }).getAttribute('aria-describedby')).toBe(line.id)
  })

  it('goes on to go live from the last section', () => {
    const props = nav({ allDone: true })
    render(<PhoneBar {...props} onEdit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next: go live' }))
    expect(props.onFinish).toHaveBeenCalled()
  })
})

describe('Edit <section> on a phone', () => {
  const editor = (over: Partial<Parameters<typeof PhoneEditor>[0]> = {}) => {
    const props = { ...nav(), size: 'phone' as const, onSize: vi.fn(), onDone: vi.fn(), onClose: vi.fn(), onFieldFocus: vi.fn(), ...over }
    return { ...render(<PhoneEditor {...props} />), props }
  }

  it('shows just the section’s fields, focuses its heading, and Done moves on', async () => {
    const { container, props } = editor()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Your hero' }))
    expect(screen.getByRole('group', { name: 'Pick a headline' })).toBeTruthy()
    expect(screen.getByLabelText(/Add your photo/)).toBeTruthy()
    expect(screen.getByText('No photo to hand? Carry on. We’ll remind you before you go live.')).toBeTruthy()
    expect(screen.queryByText(/keep sample/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(props.onDone).toHaveBeenCalled()
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
  })

  it('switches the preview between phone and computer', () => {
    const { props } = editor()
    expect(screen.getByRole('button', { name: 'Phone' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Computer' }))
    expect(props.onSize).toHaveBeenCalledWith('computer')
  })

  it('Escape goes back to the bar', () => {
    const { props } = editor()
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Your hero' }), { key: 'Escape' })
    expect(props.onClose).toHaveBeenCalled()
  })

  it('tells the canvas which part of the section the focused field changes', () => {
    const { props } = editor()
    fireEvent.focus(screen.getByLabelText('Or write your own'))
    expect(props.onFieldFocus).toHaveBeenLastCalledWith('[data-heading]')
  })

  it('waits for the layouts to catch up before Done', () => {
    editor({ layout: { index: 0, count: 6, label: 'Split', loading: true } })
    expect((screen.getByRole('button', { name: 'Updating layouts…' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('headline suggestions', () => {
  it('picks one of three, or the customer’s own words', () => {
    const onContentChange = vi.fn()
    render(<PhoneEditor {...nav({ onContentChange })} size="phone" onSize={vi.fn()} onDone={vi.fn()} onClose={vi.fn()} onFieldFocus={vi.fn()} />)
    const [first] = suggestHeadlines(site, plumber)
    const options = screen.getAllByRole('button', { pressed: false }).filter(b => b.className.includes('mm-headline-opt'))
    expect(options).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: first }))
    expect(onContentChange).toHaveBeenLastCalledWith({ headline: first })
    fireEvent.change(screen.getByLabelText('Or write your own'), { target: { value: 'Harrogate’s friendliest plumber' } })
    expect(onContentChange).toHaveBeenLastCalledWith({ headline: 'Harrogate’s friendliest plumber' })
    fireEvent.change(screen.getByLabelText('Or write your own'), { target: { value: '   ' } })
    expect(onContentChange).toHaveBeenLastCalledWith({ headline: null })
  })
})

describe('focal point', () => {
  const photo = { url: 'data:image/webp;base64,AAAA', alt: 'A new boiler' }

  it('works out where a tap landed, and moves with the arrow keys', () => {
    expect(focusFromTap({ left: 10, top: 20, width: 200, height: 100 }, 60, 95)).toEqual({ x: 25, y: 75 })
    expect(focusFromTap({ left: 0, top: 0, width: 0, height: 0 }, 5, 5)).toEqual({ x: 50, y: 50 })
    expect(focusFromKey({ x: 50, y: 50 }, 'ArrowLeft')).toEqual({ x: 45, y: 50 })
    expect(focusFromKey({ x: 0, y: 100 }, 'ArrowDown')).toEqual({ x: 0, y: 100 })
    expect(focusFromKey({ x: 50, y: 50 }, 'Enter')).toBeNull()
  })

  it('stores the tapped point with the photo', async () => {
    const onFocus = vi.fn()
    const { container } = render(<FocusPicker photo={photo} onFocus={onFocus} />)
    const button = screen.getByRole('button', { name: /Important part of the photo: 50% across, 50% down/ })
    const img = button.querySelector('img')!
    img.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.click(button, { clientX: 30, clientY: 80, detail: 1 })
    expect(onFocus).toHaveBeenLastCalledWith({ x: 30, y: 80 })
    fireEvent.keyDown(button, { key: 'ArrowUp' })
    expect(onFocus).toHaveBeenLastCalledWith({ x: 50, y: 45 })
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
  })
})

describe('Email me a link to finish on my computer', () => {
  it('checks the address, sends it with the remind choice, and says what happened', async () => {
    const send = vi.fn(async () => 'We’ve sent a link to joe@example.com.')
    const { container } = render(<ResumeLink send={send} />)
    const toggle = screen.getByRole('button', { name: 'Email me a link to finish on my computer' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: 'Email me the link' }))
    expect(send).not.toHaveBeenCalled()
    expect(screen.getByText(/Check your email address/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Your email'), { target: { value: 'joe@example.com' } })
    fireEvent.click(screen.getByLabelText(/Remind me once/))
    fireEvent.click(screen.getByRole('button', { name: 'Email me the link' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('We’ve sent a link to joe@example.com.'))
    expect(send).toHaveBeenCalledWith('joe@example.com', true)
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
  })

  it('shows the server’s reason when it can’t send', async () => {
    const send = vi.fn(async () => { throw new ApiError(429, 'too_many_links', 'You’ve asked for a few links already. Try again tomorrow.') })
    render(<ResumeLink send={send} initialEmail="joe@example.com" />)
    fireEvent.click(screen.getByRole('button', { name: 'Email me a link to finish on my computer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Email me the link' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Try again tomorrow/))
    expect(send).toHaveBeenCalledWith('joe@example.com', false)
  })
})
