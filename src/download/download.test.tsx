// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { ApiError } from '../api/client'
import type { Api } from '../api/client'
import type { SiteExport } from '../publish/siteZip'
import { downloadTokenFromHash } from '../api/draftKey'
import { screenFrom } from '../builder/account/screens'
import { unzipStored } from '../publish/zip'
import { DownloadScreen } from './DownloadScreen'
import { DownloadSite } from './DownloadSite'

afterEach(cleanup)

const EDIT = `edit.${'a'.repeat(32)}.0.${'s'.repeat(43)}`
const EXPORT: SiteExport = {
  name: 'joes.zip',
  files: [{ path: 'index.html', text: '<img src="photos/a.webp">' }],
  fetch: [{ path: 'photos/a.webp', url: 'https://joes.localblocks.co.uk/photos/a.webp' }],
}
const okFetch = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))

describe('download links', () => {
  it('reads #download=<edit token>, and a bare #download', () => {
    expect(downloadTokenFromHash(`#download=${EDIT}`)).toBe(EDIT)
    expect(downloadTokenFromHash('#download')).toBe('')
    expect(downloadTokenFromHash('#download=nonsense')).toBeNull()
    expect(screenFrom({ search: '', hash: `#download=${EDIT}` })).toEqual({ kind: 'download', token: EDIT })
  })
})

describe('Download your site', () => {
  it('zips the files and the fetched photos, then hands the zip over', async () => {
    const save = vi.fn()
    render(<DownloadSite load={async () => EXPORT} save={save} fetcher={okFetch} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Download your site' })) })
    expect(save).toHaveBeenCalledWith(expect.any(Uint8Array), 'joes.zip')
    const zip = unzipStored(save.mock.calls[0][0])
    expect([...zip.keys()]).toEqual(['index.html', 'photos/a.webp'])
    expect(screen.getByRole('status').textContent).toBe('Downloaded joes.zip.')
  })

  it('says why when the server refuses, and when a photo can’t be fetched', async () => {
    render(<DownloadSite load={async () => { throw new ApiError(429, 'rate_limited', 'You’ve downloaded your site 10 times today.') }} save={vi.fn()} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Download your site' })) })
    expect(screen.getByRole('status').textContent).toMatch(/10 times today/)
    cleanup()
    const save = vi.fn()
    render(<DownloadSite load={async () => EXPORT} save={save} fetcher={vi.fn(async () => new Response('', { status: 404 }))} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Download your site' })) })
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toMatch(/couldn’t be fetched/)
  })

  it('a replaced link says so, and how to get a new one', async () => {
    const exportSite = vi.fn(async () => { throw new ApiError(401, 'unknown_draft', 'We could not find that saved site.') })
    render(<DownloadScreen api={{ exportSite } as unknown as Api} token={EDIT} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Download your site' })) })
    expect(screen.getByRole('status').textContent).toMatch(/replaced by a newer one/)
    expect(screen.getByRole('link', { name: 'Email me a new link' }).getAttribute('href')).toBe('#lost-link')
  })

  it('the page from the email downloads with its key, and without one offers a new link', async () => {
    const exportSite = vi.fn(async () => EXPORT)
    const { container } = render(<DownloadScreen api={{ exportSite } as unknown as Api} token={EDIT} />)
    expect(screen.getByRole('heading', { name: 'Download your site' })).toBeTruthy()
    expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations.map(v => v.id)).toEqual([])
    cleanup()
    render(<DownloadScreen api={{ exportSite } as unknown as Api} token="" />)
    expect(screen.getByRole('link', { name: 'Email me a new link' }).getAttribute('href')).toBe('#lost-link')
    expect(window.location.hash).toBe('#download')
  })
})
