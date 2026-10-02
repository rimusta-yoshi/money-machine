import { describe, expect, it } from 'vitest'
import { parseConfig, slugFromHost } from './config'
import { ownPhotoName, sniffImage } from './photos'
import { DRAFT_KEY, newDraftKey, newPreviewToken, newRef, PREVIEW_TOKEN, REF, sameSecret, sha256Hex } from './tokens'
import { corsHeaders, readBody } from './http'

const env = { BASE_DOMAIN: 'siteblocks.co.uk', BUILDER_ORIGINS: 'http://localhost:5173, https://app.siteblocks.co.uk' }

describe('config', () => {
  it('reads plain string variables with safe defaults', () => {
    const c = parseConfig(env)
    expect(c).toMatchObject({ baseDomain: 'siteblocks.co.uk', noindex: true, previewDays: 30, adminToken: null })
    expect([...c.builderOrigins]).toEqual(['http://localhost:5173', 'https://app.siteblocks.co.uk'])
    expect(parseConfig({ ...env, NOINDEX: 'false', PREVIEW_DAYS: '7', ADMIN_TOKEN: 'x'.repeat(24) })).toMatchObject({ noindex: false, previewDays: 7, adminToken: 'x'.repeat(24) })
  })

  it('refuses settings that would be unsafe', () => {
    expect(() => parseConfig({ ...env, BASE_DOMAIN: 'https://siteblocks.co.uk' })).toThrow()
    expect(() => parseConfig({ ...env, BUILDER_ORIGINS: 'http://localhost:5173/app' })).toThrow()
    expect(() => parseConfig({ ...env, ADMIN_TOKEN: 'short' })).toThrow()
    expect(() => parseConfig({ ...env, NOINDEX: 'yes' })).toThrow()
  })

  it('finds the slug in a Host header', () => {
    const c = parseConfig(env)
    expect(slugFromHost('joes-plumbing.siteblocks.co.uk', c)).toBe('joes-plumbing')
    expect(slugFromHost('JOES.SITEBLOCKS.CO.UK', c)).toBe('joes')
    expect(slugFromHost('siteblocks.co.uk', c)).toBeNull()
    expect(slugFromHost('a.b.siteblocks.co.uk', c)).toBeNull()
    expect(slugFromHost('joes.siteblocks.co.uk.evil.com', c)).toBeNull()
    expect(slugFromHost('joes.siteblocks.localhost:8790', parseConfig({ BASE_DOMAIN: 'siteblocks.localhost:8790' }))).toBe('joes')
  })
})

describe('tokens', () => {
  it('makes unguessable keys of the expected shapes', () => {
    const keys = new Set(Array.from({ length: 50 }, newDraftKey))
    expect(keys.size).toBe(50)
    for (const k of keys) expect(k).toMatch(DRAFT_KEY)
    expect(newPreviewToken()).toMatch(PREVIEW_TOKEN)
    expect(newRef()).toMatch(REF)
  })

  it('hashes and compares secrets', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await sameSecret('a-long-admin-key', 'a-long-admin-key')).toBe(true)
    expect(await sameSecret('a-long-admin-key', 'a-long-admin-kez')).toBe(false)
  })
})

describe('photos', () => {
  it('knows images by their bytes', () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))?.ext).toBe('jpg')
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.ext).toBe('png')
    expect(sniffImage(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))?.ext).toBe('webp')
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull()
    expect(sniffImage(new TextEncoder().encode('GIF89a......'))).toBeNull()
  })

  it('accepts only this draft’s own uploads', () => {
    const c = parseConfig(env)
    const ref = 'a'.repeat(32)
    const name = `${'b'.repeat(32)}.webp`
    expect(ownPhotoName(`https://preview.siteblocks.co.uk/photos/${ref}/${name}`, c, ref)).toBe(name)
    expect(ownPhotoName(`https://preview.siteblocks.co.uk/photos/${'c'.repeat(32)}/${name}`, c, ref)).toBeNull()
    expect(ownPhotoName(`https://preview.siteblocks.co.uk/photos/${ref}/../x.webp`, c, ref)).toBeNull()
    expect(ownPhotoName(`https://evil.com/photos/${ref}/${name}`, c, ref)).toBeNull()
  })
})

describe('http', () => {
  it('reads bodies up to a limit', async () => {
    const req = (body: string) => new Request('https://x/', { method: 'POST', body })
    expect(new TextDecoder().decode(await readBody(req('hello'), 10))).toBe('hello')
    await expect(readBody(req('x'.repeat(11)), 10)).rejects.toMatchObject({ status: 413 })
  })

  it('allows only listed origins', () => {
    const allowed = new Set(['http://localhost:5173'])
    expect(corsHeaders('http://localhost:5173', allowed)['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
    expect(corsHeaders('https://evil.example', allowed)['Access-Control-Allow-Origin']).toBeUndefined()
    expect(corsHeaders(null, allowed)['Access-Control-Allow-Origin']).toBeUndefined()
  })
})
