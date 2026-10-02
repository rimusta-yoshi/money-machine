/** Random ids and secrets, and their hashes. The database only ever stores hashes of secrets. */

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const hex = (bytes: Uint8Array): string => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')

const random = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n))

/** The key a browser holds for its draft (256 bits). Whoever has it can edit the draft. */
export const newDraftKey = (): string => base64url(random(32))
/** A preview link's token (192 bits). Read-only. */
export const newPreviewToken = (): string => base64url(random(24))
/** A draft's storage id. */
export const newRef = (): string => hex(random(16))

export const DRAFT_KEY = /^[A-Za-z0-9_-]{43}$/
export const PREVIEW_TOKEN = /^[A-Za-z0-9_-]{32}$/
export const REF = /^[0-9a-f]{32}$/

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
}

/** Compares secrets without leaking how much matched (both sides hashed to equal length first). */
export async function sameSecret(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256Hex(a), sha256Hex(b)])
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}
