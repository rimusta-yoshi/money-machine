// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackupLine } from './BackupLine'
import { fetchBackupHealth } from './backupApi'

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Last backup', () => {
  it('asks with the admin key and says the server\'s reason when refused', async () => {
    const seen: (string | null)[] = []
    const ok = vi.fn(async (_u: RequestInfo | URL, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get('X-Admin-Key'))
      return reply({ health: { healthy: true, lastBackupAt: 1, problems: [] } })
    })
    expect(await fetchBackupHealth('https://api.x', 'k', ok as typeof fetch)).toEqual({ healthy: true, lastBackupAt: 1, problems: [] })
    expect(seen).toEqual(['k'])
    const off = (async () => reply({ message: 'Backups are not set up.' }, 503)) as typeof fetch
    await expect(fetchBackupHealth('https://api.x', 'k', off)).rejects.toThrow('Backups are not set up.')
  })

  it('shows the time and a tick when backups work', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ health: { healthy: true, lastBackupAt: Date.UTC(2026, 9, 16, 2, 47), problems: [] } })))
    render(<BackupLine base="https://api.x" adminKey="k" refresh={1} />)
    expect((await screen.findByRole('img', { name: 'working' })).textContent).toBe('✓')
    expect(screen.getByText(/Last backup: 16 Oct 2026/)).toBeTruthy()
  })

  it('shows a cross and the first problem when they don\'t', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({ health: { healthy: false, lastBackupAt: null, problems: ['No database backup has been made yet.'] } })))
    render(<BackupLine base="https://api.x" adminKey="k" refresh={1} />)
    expect((await screen.findByRole('img', { name: 'not working' })).textContent).toBe('✗')
    expect(screen.getByText(/never/).textContent).toContain('No database backup has been made yet.')
  })
})
