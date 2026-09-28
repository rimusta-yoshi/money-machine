// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import { plumber } from '../../trades/plumber'
import { createSite } from '../../site/defaults'
import { defaultAlt } from '../../site/photoAlt'
import type { ImageCodec } from '../../photos/resize'
import type { PhotoStore } from '../../photos/store'
import { GalleryEditor, PhotoEditor } from './PhotoEditor'
import { SectionContentEditor } from './SectionContentEditor'

afterEach(cleanup)

const URL1 = 'data:image/webp;base64,AAAA'
const codec: ImageCodec = {
  decode: async () => ({ width: 3000, height: 2000, source: {} as CanvasImageSource }),
  encode: async (_i, _w, _h, type) => new Blob(['x'], { type }),
}
const store: PhotoStore = { put: vi.fn(async () => URL1) }
const deps = { codec, store }
const jpeg = () => new File(['x'], 'van.jpg', { type: 'image/jpeg' })

const choose = (label: RegExp, file: File) =>
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } })

describe('PhotoEditor', () => {
  it('resizes a chosen photo and saves it with the default description', async () => {
    const onChange = vi.fn()
    render(<PhotoEditor photo={null} defaultAlt="Joe Pipes at work in Leeds" onChange={onChange} {...deps} />)
    choose(/Choose a photo/, jpeg())
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ url: URL1, alt: 'Joe Pipes at work in Leeds' }))
  })

  it('gives a replaced photo a fresh description and moves focus to it', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<PhotoEditor photo={{ url: 'https://example.com/a.jpg', alt: 'Old bathroom' }} defaultAlt="Joe Pipes at work" onChange={onChange} {...deps} />)
    choose(/Replace photo/, jpeg())
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ url: URL1, alt: 'Joe Pipes at work' }))
    rerender(<PhotoEditor photo={{ url: URL1, alt: 'Joe Pipes at work' }} defaultAlt="Joe Pipes at work" onChange={onChange} {...deps} />)
    expect(document.activeElement).toBe(screen.getByLabelText(/Describe this photo/))
  })

  it('saves onto the latest props, not the ones from before processing started', async () => {
    let release: (url: string) => void = () => {}
    const slowStore: PhotoStore = { put: () => new Promise(r => { release = r }) }
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<GalleryEditor photos={[]} max={12} defaultAlt={i => `Job ${i + 1}`} onChange={first} codec={codec} store={slowStore} />)
    choose(/Add a photo/, jpeg())
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Preparing/))
    // Meanwhile another photo was added elsewhere.
    rerender(<GalleryEditor photos={[{ url: URL1, alt: 'Earlier' }]} max={12} defaultAlt={i => `Job ${i + 1}`} onChange={second} codec={codec} store={slowStore} />)
    release(URL1)
    await waitFor(() => expect(second).toHaveBeenCalledWith([{ url: URL1, alt: 'Earlier' }, { url: URL1, alt: 'Job 2' }]))
    expect(first).not.toHaveBeenCalled()
  })

  it('keeps the picker focusable while busy and links it to status messages', async () => {
    let release: (url: string) => void = () => {}
    const slowStore: PhotoStore = { put: () => new Promise(r => { release = r }) }
    render(<PhotoEditor photo={null} defaultAlt="x" onChange={vi.fn()} codec={codec} store={slowStore} />)
    const input = screen.getByLabelText(/Choose a photo/) as HTMLInputElement
    choose(/Choose a photo/, jpeg())
    await waitFor(() => expect(input.getAttribute('aria-disabled')).toBe('true'))
    expect(input.disabled).toBe(false)
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toMatch(/Preparing/)
    release(URL1)
  })

  it('moves focus to the picker after removing the photo', () => {
    render(<PhotoEditor photo={{ url: URL1, alt: 'a' }} defaultAlt="x" onChange={vi.fn()} {...deps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(document.activeElement).toBe(screen.getByLabelText(/Replace photo/))
  })

  it('requires a description: an emptied field shows an error and saves nothing', () => {
    const onChange = vi.fn()
    render(<PhotoEditor photo={{ url: URL1, alt: 'New boiler' }} defaultAlt="x" onChange={onChange} {...deps} />)
    const field = screen.getByLabelText(/Describe this photo/)
    fireEvent.change(field, { target: { value: '   ' } })
    expect(onChange).not.toHaveBeenCalled()
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toMatch(/Add a short description/)
    fireEvent.change(field, { target: { value: 'Boiler in a kitchen' } })
    expect(onChange).toHaveBeenCalledWith({ url: URL1, alt: 'Boiler in a kitchen' })
  })

  it('removes the photo', () => {
    const onChange = vi.fn()
    render(<PhotoEditor photo={{ url: URL1, alt: 'a' }} defaultAlt="x" onChange={onChange} {...deps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('tells the customer when a file isn’t a photo', async () => {
    const onChange = vi.fn()
    render(<PhotoEditor photo={null} defaultAlt="x" onChange={onChange} {...deps} />)
    choose(/Choose a photo/, new File(['%PDF'], 'quote.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/isn’t a photo/))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('has no axe violations, empty or filled', async () => {
    const { container, rerender } = render(<PhotoEditor photo={null} defaultAlt="x" onChange={vi.fn()} {...deps} />)
    expect((await axe.run(container)).violations).toEqual([])
    rerender(<PhotoEditor photo={{ url: URL1, alt: 'a' }} defaultAlt="x" onChange={vi.fn()} {...deps} />)
    expect((await axe.run(container)).violations).toEqual([])
  })
})

describe('GalleryEditor', () => {
  it('adds photos with a numbered default description', async () => {
    const onChange = vi.fn()
    const existing = [{ url: URL1, alt: 'First' }]
    render(<GalleryEditor photos={existing} max={12} defaultAlt={i => `Job ${i + 1}`} onChange={onChange} {...deps} />)
    choose(/Add another photo/, jpeg())
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([...existing, { url: URL1, alt: 'Job 2' }]))
  })

  it('removes one photo and stops offering more at the limit', () => {
    const onChange = vi.fn()
    const photos = [{ url: URL1, alt: 'A' }, { url: URL1, alt: 'B' }]
    render(<GalleryEditor photos={photos} max={2} defaultAlt={() => 'x'} onChange={onChange} {...deps} />)
    expect(screen.queryByLabelText(/Add/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }))
    expect(onChange).toHaveBeenCalledWith([{ url: URL1, alt: 'B' }])
  })
})

describe('photo editing in the builder', () => {
  it('offers a photo picker on the hero instead of a “coming soon” note', () => {
    render(<SectionContentEditor site={createSite(plumber, 1)} trade={plumber} section="hero" onContentChange={vi.fn()} />)
    expect(screen.getByLabelText(/Choose a photo/)).toBeTruthy()
    expect(screen.queryByText(/arrive with publishing/)).toBeNull()
  })
})

describe('defaultAlt', () => {
  const site = { ...createSite(plumber, 1), business: { ...createSite(plumber, 1).business, name: 'Joe Pipes', location: 'Leeds' } }
  it('describes each kind of photo in plain words, never empty', () => {
    expect(defaultAlt('hero', site, plumber)).toBe('Joe Pipes at work in Leeds')
    expect(defaultAlt('about', site, plumber)).toBe('The Joe Pipes team')
    expect(defaultAlt('gallery', site, plumber, 2)).toBe('Recent plumber job 3 in Leeds by Joe Pipes')
    expect(defaultAlt('hero', createSite(plumber, 1), plumber)).toBe('Plumber Co. at work')
  })
})
