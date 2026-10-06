// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { plumber } from '../trades/plumber'
import { roofer } from '../trades/roofer'
import { createSite } from '../site/defaults'
import { businessFieldsFor } from '../site/businessFields'
import type { Site } from '../site/schema'
import { pageContent } from '../site/pageContent'
import { basicsGaps, STEPS, tradeFromSearch } from './steps'
import { BasicsStep } from './basics/BasicsStep'
import { LookStep } from './look/LookStep'
import { TopBar } from './shell/TopBar'
import { SectionContentEditor } from './content/SectionContentEditor'
import { NextButton } from './build/BuildBits'

afterEach(() => {
  cleanup()
  window.innerWidth = 1024
})

const AXE = { rules: { 'color-contrast': { enabled: false } } }
const blank = (): Site => createSite(plumber, 3)
const filled = (): Site => ({ ...blank(), business: { ...blank().business, name: 'Joe Pipes', phone: '0113 496 0000', location: 'Leeds' } })

describe('steps', () => {
  it('runs Basics → Your look → Build → Go live', () => {
    expect(STEPS.map(s => s.label)).toEqual(['Basics', 'Your look', 'Build', 'Go live'])
  })

  it('needs a trade, a business name and a phone number before leaving the basics', () => {
    expect(basicsGaps(null)).toEqual(['trade'])
    expect(basicsGaps(blank())).toEqual(['name', 'phone'])
    expect(basicsGaps(filled())).toEqual([])
  })

  it('takes a known trade from the homepage link, and ignores anything else', () => {
    expect(tradeFromSearch('?trade=roofer')).toBe('roofer')
    expect(tradeFromSearch('?trade=astronaut')).toBeNull()
    expect(tradeFromSearch('')).toBeNull()
  })
})

describe('TopBar', () => {
  it('marks the current step and lets you go back to earlier ones only', async () => {
    const onGoStep = vi.fn()
    const { container } = render(<TopBar step="build" onGoStep={onGoStep} />)
    expect(screen.getByText('Build').closest('li')?.getAttribute('aria-current')).toBe('step')
    fireEvent.click(screen.getByRole('button', { name: /Your look/ }))
    expect(onGoStep).toHaveBeenCalledWith('look')
    expect(screen.queryByRole('button', { name: /Go live/ })).toBeNull()
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
  })
})

describe('BasicsStep', () => {
  const renderBasics = (site: Site | null, handlers: Partial<Parameters<typeof BasicsStep>[0]> = {}) => {
    const props = { trade: site ? plumber : null, site, onPickTrade: vi.fn(), onBusinessChange: vi.fn(), onNext: vi.fn(), ...handlers }
    return { ...render(<BasicsStep {...props} />), props }
  }

  it('desktop: one form with the trades as radio buttons (no dropdown) and no email field', async () => {
    const { container } = renderBasics(null)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(container.querySelector('select')).toBeNull()
    expect(screen.getByLabelText('Business name')).toBeTruthy()
    expect(screen.getByLabelText('Where do you work?')).toBeTruthy()
    expect(screen.getByLabelText('Phone number')).toBeTruthy()
    expect(screen.queryByLabelText(/email/i)).toBeNull()
    expect(screen.queryByLabelText(/years/i)).toBeNull()
    expect(screen.getByText('Your site, so far')).toBeTruthy()
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
  })

  it('keeps what was typed before a trade was picked and hands it over with the trade', () => {
    const { props } = renderBasics(null)
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Joe Pipes' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Roofer' }))
    expect(props.onPickTrade).toHaveBeenCalledWith(roofer, { name: 'Joe Pipes', location: '', phone: '' })
  })

  it('says what’s missing instead of moving on, and focuses it', () => {
    const { props } = renderBasics(blank())
    fireEvent.click(screen.getByRole('button', { name: 'Next: your look' }))
    expect(props.onNext).not.toHaveBeenCalled()
    expect(screen.getByText('Just need your business name and a phone number to carry on.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Business name'))
  })

  it('moves on once the basics are in, and the preview shows them', () => {
    const { props } = renderBasics(filled())
    expect(screen.getByText('Call 0113 496 0000')).toBeTruthy()
    expect(screen.getByText('Plumber · Leeds')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next: your look' }))
    expect(props.onNext).toHaveBeenCalled()
  })

  it('phone: trade first as big rows, then the three fields with a small preview card', async () => {
    window.innerWidth = 390
    const { container, props } = renderBasics(filled())
    expect(screen.getByRole('heading', { name: "What's your trade?" })).toBeTruthy()
    expect(screen.queryByLabelText('Business name')).toBeNull()
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByLabelText('Business name')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Live preview' }).textContent).toContain('Plumber in Leeds · 0113 496 0000')
    fireEvent.click(screen.getByRole('button', { name: 'Next: your look' }))
    expect(props.onNext).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Back to trade' }))
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('phone: asks for a trade before the details', () => {
    window.innerWidth = 390
    renderBasics(null)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Just need your trade to carry on.')).toBeTruthy()
  })
})

describe('LookStep', () => {
  const renderLook = (site: Site = filled()) => {
    const props = {
      site, trade: plumber, content: pageContent(site, plumber),
      onBrandColor: vi.fn(), onTheme: vi.fn(), onShuffle: vi.fn(), onToggleReviews: vi.fn(), onBack: vi.fn(), onNext: vi.fn(),
    }
    return { ...render(<LookStep {...props} />), props }
  }

  it('holds the brand colour, the style and the reviews extra', async () => {
    const { container, props } = renderLook()
    fireEvent.click(screen.getByRole('radio', { name: 'Teal' }))
    expect(props.onBrandColor).toHaveBeenCalledWith('#0F766E')
    fireEvent.click(screen.getByRole('radio', { name: /Workwear/ }))
    expect(props.onTheme).toHaveBeenCalledWith('workwear')
    fireEvent.click(screen.getByRole('button', { name: 'Shuffle this style' }))
    expect(props.onShuffle).toHaveBeenCalled()
    const reviews = screen.getByRole('switch', { name: 'Show customer reviews' })
    expect(reviews.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(reviews)
    expect(props.onToggleReviews).toHaveBeenCalled()
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
  })

  it('offers a custom colour, selected when the colour isn’t a swatch', () => {
    renderLook({ ...filled(), brandColor: '#123456' })
    expect(screen.getByLabelText('Custom')).toBeTruthy()
    expect(screen.getAllByRole('radio').filter(r => (r as HTMLInputElement).checked && /^#/.test((r as HTMLInputElement).value))).toHaveLength(0)
  })

  it('previews the hero in the chosen style, and the reviews when switched on', () => {
    const { container } = renderLook({ ...filled(), extras: ['reviews'] })
    expect(container.querySelector('.sb-generated')).not.toBeNull()
    expect(screen.getByRole('switch', { name: 'Show customer reviews' }).getAttribute('aria-checked')).toBe('true')
    expect(container.querySelector('.sb-testimonials')).not.toBeNull()
  })

  it('goes back to the basics or on to building', () => {
    const { props } = renderLook()
    fireEvent.click(screen.getByRole('button', { name: '← Basics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start building' }))
    expect(props.onBack).toHaveBeenCalled()
    expect(props.onNext).toHaveBeenCalled()
  })
})

describe('years in business and the about blurb', () => {
  it('live with the About section, or the trust bar when a trade has no About section', () => {
    expect(businessFieldsFor(blank(), plumber, 'about')).toEqual(['yearsInBusiness', 'about'])
    expect(businessFieldsFor(blank(), plumber, 'trust_bar')).toEqual([])
    const roof = createSite(roofer, 3)
    expect(businessFieldsFor(roof, roofer, 'trust_bar')).toEqual(['yearsInBusiness'])
    expect(businessFieldsFor(roof, roofer, 'hero')).toEqual([])
  })

  it('are edited in the About section’s content fields', async () => {
    const onBusinessChange = vi.fn()
    const { container } = render(<SectionContentEditor site={filled()} trade={plumber} section="about" onContentChange={vi.fn()} onBusinessChange={onBusinessChange} />)
    fireEvent.change(screen.getByLabelText('Years in business'), { target: { value: '12' } })
    expect(onBusinessChange).toHaveBeenCalledWith({ yearsInBusiness: '12' })
    fireEvent.change(screen.getByLabelText('A few words about you'), { target: { value: 'Father and son.' } })
    expect(onBusinessChange).toHaveBeenCalledWith({ about: 'Father and son.' })
    expect((await axe.run(container, AXE)).violations.map(v => v.id)).toEqual([])
  })
})

describe('the build step’s Next button', () => {
  const sections = plumber.sections
  const layout = { index: 0, count: 6, label: 'Split', loading: false }
  const renderNext = (p: { nextIdx: number; allDone: boolean }) => {
    const onNext = vi.fn()
    const onFinish = vi.fn()
    render(<NextButton sections={sections} layout={layout} onNext={onNext} onFinish={onFinish} {...p} />)
    return { onNext, onFinish }
  }

  it('names the section it goes to', () => {
    const { onNext } = renderNext({ nextIdx: 1, allDone: false })
    fireEvent.click(screen.getByRole('button', { name: 'Next: trust bar' }))
    expect(onNext).toHaveBeenCalled()
  })

  it('goes live only once every section is settled', () => {
    const { onFinish } = renderNext({ nextIdx: 0, allDone: true })
    fireEvent.click(screen.getByRole('button', { name: 'Next: go live' }))
    expect(onFinish).toHaveBeenCalled()
  })

  it('waits while a section is still making its layouts', () => {
    render(<NextButton sections={sections} layout={{ ...layout, loading: true }} onNext={vi.fn()} onFinish={vi.fn()} nextIdx={1} allDone={false} />)
    expect((screen.getByRole('button', { name: 'Next: trust bar' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
